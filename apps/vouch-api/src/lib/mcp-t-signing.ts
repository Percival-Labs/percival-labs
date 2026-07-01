// MCP-T Event & Score Signing — Ed25519 over RFC 8785 (JCS)
//
// Implements the signature requirements of the MCP-T v0.2.0 spec:
//   - §4.2.4: Trust Scores are signed over JCS(score \ {signature}).
//   - §6.4:   Trust Events are signed over JCS(event \ {signature, co_signatures}).
//   - Signature object: { algorithm: 'Ed25519', public_key: <multibase did:key>, value: <base64url> }.
//
// Key material:
//   The provider's Ed25519 secret key is loaded from MCP_T_SIGNING_SECRET_KEY
//   (32-byte seed, hex or base64url). If unset, a deterministic DEV key is used so
//   local/test runs still produce REAL, verifiable Ed25519 signatures — never a
//   placeholder string. Production MUST set the env var; a missing key there warns loudly.
//
// Generate a production key with:  bun run apps/vouch-api/scripts/mcp-t-keygen.ts

import { ed25519 } from '@noble/curves/ed25519';
import { base58, base64url, hex } from '@scure/base';

export interface McptSignature {
  algorithm: 'Ed25519';
  /** Multibase-encoded Ed25519 public key (did:key method-specific id, e.g. z6Mk...). */
  public_key: string;
  /** base64url-encoded 64-byte Ed25519 signature. */
  value: string;
}

// Multicodec prefix for an Ed25519 public key (0xed 0x01), per the did:key spec.
const ED25519_MULTICODEC = Uint8Array.from([0xed, 0x01]);

// Deterministic, clearly-labeled development seed. NOT for production use.
// 32 bytes derived from a fixed pattern so dev/test signatures are reproducible.
const DEV_SEED = Uint8Array.from(
  Array.from({ length: 32 }, (_, i) => (i * 7 + 13) & 0xff),
);

const enc = new TextEncoder();

// ── Key loading (lazy, cached) ──

let cachedSecret: Uint8Array | null = null;
let cachedPublicMultibase: string | null = null;

function parseSecretKey(raw: string): Uint8Array {
  const t = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(t)) return hex.decode(t.toLowerCase());
  try {
    const bytes = base64url.decode(t);
    if (bytes.length === 32) return bytes;
  } catch {
    /* fall through to error */
  }
  throw new Error('MCP_T_SIGNING_SECRET_KEY must be a 32-byte Ed25519 seed (64 hex chars or base64url)');
}

function secretKey(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const env = process.env.MCP_T_SIGNING_SECRET_KEY;
  if (env && env.trim()) {
    cachedSecret = parseSecretKey(env);
    return cachedSecret;
  }
  // FIX #6: In production, refuse to sign with the public DEV seed. Falling back
  // to it silently produces forgeable "provider" signatures (the seed is in this
  // source file). Fail closed so misconfiguration is loud, not exploitable.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[mcp-t] MCP_T_SIGNING_SECRET_KEY is not set in production. Refusing to sign with ' +
        'the public DEV seed. Provision a key with apps/vouch-api/scripts/mcp-t-keygen.ts.',
    );
  }
  console.warn('[mcp-t] MCP_T_SIGNING_SECRET_KEY not set; using deterministic DEV signing key (not for production).');
  cachedSecret = DEV_SEED;
  return cachedSecret;
}

/** Multibase public key of the deterministic DEV seed. Any attestation carrying
 * this key is NOT from a real provider identity and must be rejected in prod. */
let cachedDevPublicMultibase: string | null = null;
export function devSigningPublicKey(): string {
  if (!cachedDevPublicMultibase) {
    cachedDevPublicMultibase = encodeEd25519Multibase(ed25519.getPublicKey(DEV_SEED));
  }
  return cachedDevPublicMultibase;
}

/** True if `multibase` is the deterministic DEV signing key (never trust in prod). */
export function isDevSigningKey(multibase: string): boolean {
  return multibase === devSigningPublicKey();
}

/** Multibase (did:key) encoding of an Ed25519 public key: 'z' + base58btc(0xed01 || pubkey). */
export function encodeEd25519Multibase(publicKey: Uint8Array): string {
  const prefixed = new Uint8Array(ED25519_MULTICODEC.length + publicKey.length);
  prefixed.set(ED25519_MULTICODEC, 0);
  prefixed.set(publicKey, ED25519_MULTICODEC.length);
  return 'z' + base58.encode(prefixed);
}

/** Decode a multibase (did:key) Ed25519 public key back to 32 raw bytes. */
export function decodeEd25519Multibase(multibase: string): Uint8Array {
  if (!multibase.startsWith('z')) throw new Error('Unsupported multibase prefix (expected base58btc "z")');
  const decoded = base58.decode(multibase.slice(1));
  if (decoded.length !== ED25519_MULTICODEC.length + 32) throw new Error('Invalid Ed25519 multibase length');
  if (decoded[0] !== ED25519_MULTICODEC[0] || decoded[1] !== ED25519_MULTICODEC[1]) {
    throw new Error('Not an Ed25519 multicodec key');
  }
  return decoded.slice(ED25519_MULTICODEC.length);
}

/** The provider's public signing key, multibase-encoded (did:key method-specific id). */
export function mcptProviderPublicKey(): string {
  if (cachedPublicMultibase) return cachedPublicMultibase;
  cachedPublicMultibase = encodeEd25519Multibase(ed25519.getPublicKey(secretKey()));
  return cachedPublicMultibase;
}

/** The provider's full did:key identifier. */
export function mcptProviderDidKey(): string {
  return `did:key:${mcptProviderPublicKey()}`;
}

// ── RFC 8785 (JCS) canonicalization ──

/**
 * Canonicalize a JSON value per RFC 8785 (JSON Canonicalization Scheme).
 * Object keys are sorted by UTF-16 code unit (JS default sort), undefined values
 * are dropped (JSON semantics), and numbers use ECMAScript's Number-to-String
 * (which JSON.stringify already produces). Sufficient for MCP-T payloads
 * (strings, integers, booleans, nested objects/arrays).
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalize(v === undefined ? null : v)).join(',') + ']';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
  }
  // undefined / function / symbol — should not appear in signed payloads
  return 'null';
}

// ── Signing & verification ──

/** Strip the signature envelope fields that MUST NOT be covered by the signature. */
function payloadForSigning(obj: Record<string, unknown>): Record<string, unknown> {
  const { signature: _sig, co_signatures: _cosigs, ...rest } = obj;
  return rest;
}

/**
 * Sign an MCP-T Trust Score or Trust Event with the provider key.
 * Computes the signature over JCS(obj \ {signature, co_signatures}).
 * Returns the signature object to attach to `obj.signature`.
 */
export function mcptSign(obj: Record<string, unknown>): McptSignature {
  const bytes = enc.encode(canonicalize(payloadForSigning(obj)));
  const sig = ed25519.sign(bytes, secretKey());
  return {
    algorithm: 'Ed25519',
    public_key: mcptProviderPublicKey(),
    value: base64url.encode(sig),
  };
}

/**
 * Verify the `signature` on an MCP-T Trust Score or Trust Event.
 * Re-derives JCS(obj \ {signature, co_signatures}) and checks it against the
 * embedded public key. Returns false on any malformed input rather than throwing.
 *
 * NOTE: This proves the signature is internally valid for its embedded key. The
 * spec (§10) additionally requires consumers to confirm the key is authoritative
 * for the claimed provider_id / issuer_id; that binding check is the caller's job.
 */
export function mcptVerify(
  obj: Record<string, unknown>,
  opts?: { allowDevKey?: boolean },
): boolean {
  try {
    const sig = obj.signature as McptSignature | undefined;
    if (!sig || sig.algorithm !== 'Ed25519' || !sig.public_key || !sig.value) return false;
    // FIX #6: dev-key signatures are cryptographically valid but not authoritative.
    // Reject them by default in production (a consumer must never trust the public seed).
    const allowDevKey = opts?.allowDevKey ?? process.env.NODE_ENV !== 'production';
    if (!allowDevKey && isDevSigningKey(sig.public_key)) return false;
    const publicKey = decodeEd25519Multibase(sig.public_key);
    const bytes = enc.encode(canonicalize(payloadForSigning(obj)));
    return ed25519.verify(base64url.decode(sig.value), bytes, publicKey);
  } catch {
    return false;
  }
}

/** Generate a fresh Ed25519 keypair for provisioning a provider identity. */
export function generateKeypair(): { secretHex: string; publicMultibase: string; didKey: string } {
  const sk = ed25519.utils.randomPrivateKey();
  const pk = ed25519.getPublicKey(sk);
  const publicMultibase = encodeEd25519Multibase(pk);
  return {
    secretHex: hex.encode(sk),
    publicMultibase,
    didKey: `did:key:${publicMultibase}`,
  };
}

/** Test/diagnostic hook: clear cached key material so env changes take effect. */
export function _resetSigningCache(): void {
  cachedSecret = null;
  cachedPublicMultibase = null;
}

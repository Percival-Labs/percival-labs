// Shared AES-256-GCM envelope encryption for secrets at rest, at the
// schema/repo boundary owned by vouch-db.
//
// C3 fix (mechanism only — no migration/backfill/rotation performed here):
// `accounts.vouch_nsec`, `accounts.agent_key_token`, and
// `acp_checkout_sessions.provisioned_agent_key` are stored in plaintext
// today. This module gives every consumer (vouch-api, acp-indexer, ...) one
// place to encrypt/decrypt those secrets instead of hand-rolling AES-GCM
// per call site — mirroring the algorithm apps/vouch-api/src/lib/encryption.ts
// already uses for `nwc_connections.connection_string` and the Lightning HODL
// preimage, so ciphertexts are interchangeable if the same ENCRYPTION_KEY is
// shared across services.
//
// Provisioning, migration, and key rotation are OUT OF SCOPE for this helper
// by design — see packages/vouch-db/docs/RUNBOOK-C3-NSEC-ENCRYPTION.md for
// the human-sign-off steps required before this is wired into any write path.

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

// Validate key format at module load time, but allow empty so importing this
// module doesn't crash consumers that don't need encryption yet (mirrors the
// apps/vouch-api/src/lib/encryption.ts gate — getEncryptionKey() enforces the
// real check at call time).
if (ENCRYPTION_KEY && ENCRYPTION_KEY.length !== 64) {
  throw new Error('[vouch-db] ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (!ENCRYPTION_KEY) {
    throw new Error(
      '[vouch-db] ENCRYPTION_KEY is not set. Cannot encrypt/decrypt secrets. ' +
      'Set ENCRYPTION_KEY to a 64-char hex string (32 bytes) in your environment.',
    );
  }
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(ENCRYPTION_KEY.slice(i * 2, i * 2 + 2), 16);
  }
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/**
 * Encrypt a plaintext secret with AES-256-GCM.
 * Returns base64(iv + ciphertext), where iv is 12 bytes — same wire format as
 * apps/vouch-api/src/lib/encryption.ts, so values are portable between them.
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt a base64(iv + ciphertext) string produced by encryptSecret().
 */
export async function decryptSecret(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');
  const iv = combined.subarray(0, 12);
  const ciphertext = combined.subarray(12);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

/** True once ENCRYPTION_KEY is configured — lets callers gate optional encryption paths. */
export function hasEncryptionKey(): boolean {
  return ENCRYPTION_KEY.length === 64;
}

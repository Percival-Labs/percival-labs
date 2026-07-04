// Tests for MCP-T Ed25519 / RFC 8785 (JCS) signing.

import { describe, expect, it } from 'bun:test';
import {
  canonicalize,
  mcptSign,
  mcptVerify,
  mcptProviderPublicKey,
  mcptProviderDidKey,
  encodeEd25519Multibase,
  decodeEd25519Multibase,
  generateKeypair,
} from './mcp-t-signing';

describe('JCS canonicalization (RFC 8785)', () => {
  it('sorts object keys lexicographically by UTF-16 code unit', () => {
    expect(canonicalize({ b: 1, a: 2, c: 3 })).toBe('{"a":2,"b":1,"c":3}');
  });

  it('is stable regardless of input key order', () => {
    expect(canonicalize({ z: 1, a: { y: 2, x: 3 } })).toBe(canonicalize({ a: { x: 3, y: 2 }, z: 1 }));
  });

  it('drops undefined values but keeps null', () => {
    expect(canonicalize({ a: undefined, b: null, c: 1 })).toBe('{"b":null,"c":1}');
  });

  it('handles nested arrays and objects', () => {
    expect(canonicalize({ items: [{ q: 2, p: 1 }, 5] })).toBe('{"items":[{"p":1,"q":2},5]}');
  });

  it('emits no insignificant whitespace', () => {
    expect(canonicalize({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}');
  });
});

describe('Ed25519 multibase (did:key) encoding', () => {
  it('round-trips a public key through multibase', () => {
    const { publicMultibase } = generateKeypair();
    expect(publicMultibase.startsWith('z6Mk')).toBe(true);
    const raw = decodeEd25519Multibase(publicMultibase);
    expect(raw.length).toBe(32);
    expect(encodeEd25519Multibase(raw)).toBe(publicMultibase);
  });

  it('rejects a non-base58btc multibase prefix', () => {
    expect(() => decodeEd25519Multibase('f00ff')).toThrow();
  });
});

describe('mcptSign / mcptVerify', () => {
  it('produces a real, verifiable Ed25519 signature (no placeholder)', () => {
    const score = { subject_id: 'did:key:zAbc', score: { composite: 720 } } as Record<string, unknown>;
    const sig = mcptSign(score);
    expect(sig.algorithm).toBe('Ed25519');
    expect(sig.public_key).toBe(mcptProviderPublicKey());
    expect(sig.value).not.toBe('signature-pending-key-setup');
    expect(sig.value.length).toBeGreaterThan(40);

    const signed = { ...score, signature: sig };
    expect(mcptVerify(signed)).toBe(true);
  });

  it('excludes the signature and co_signatures fields from the signed payload', () => {
    const event = { event_id: 'e1', payload: { a: 1 } } as Record<string, unknown>;
    const signature = mcptSign(event);
    // Attaching signature + co_signatures must still verify (they are stripped before hashing).
    expect(mcptVerify({ ...event, signature, co_signatures: [{ signer_id: 'x' }] })).toBe(true);
  });

  it('fails verification when the payload is tampered with', () => {
    const score = { subject_id: 'did:key:zAbc', score: { composite: 720 } } as Record<string, unknown>;
    const signed: Record<string, unknown> = { ...score, signature: mcptSign(score) };
    (signed.score as { composite: number }).composite = 999; // tamper
    expect(mcptVerify(signed)).toBe(false);
  });

  it('fails verification for a malformed signature object', () => {
    expect(mcptVerify({ a: 1, signature: { algorithm: 'Ed25519', public_key: '', value: '' } })).toBe(false);
    expect(mcptVerify({ a: 1 })).toBe(false);
  });

  it('signature is order-independent over input key order (JCS)', () => {
    const a = { x: 1, y: 2, z: { b: 1, a: 2 } } as Record<string, unknown>;
    const b = { z: { a: 2, b: 1 }, y: 2, x: 1 } as Record<string, unknown>;
    expect(mcptSign(a).value).toBe(mcptSign(b).value);
  });
});

describe('provider identity', () => {
  it('exposes a stable did:key derived from the signing key', () => {
    expect(mcptProviderDidKey()).toBe(`did:key:${mcptProviderPublicKey()}`);
    expect(mcptProviderPublicKey().startsWith('z6Mk')).toBe(true);
  });
});

// ── FIX #6: dev-key detection & production hard-fail ──

import {
  isDevSigningKey,
  devSigningPublicKey,
  _resetSigningCache,
} from './mcp-t-signing';

describe('dev signing key rejection (FIX #6)', () => {
  it('flags the deterministic DEV seed public key as a dev key', () => {
    expect(isDevSigningKey(devSigningPublicKey())).toBe(true);
    expect(isDevSigningKey(mcptProviderPublicKey())).toBe(true); // no env key in test → dev key
  });

  it('does not flag a freshly generated provider key as the dev key', () => {
    const kp = generateKeypair();
    expect(isDevSigningKey(kp.publicMultibase)).toBe(false);
  });

  it('mcptVerify rejects a dev-key signature when allowDevKey is false', () => {
    const obj = { subject_id: 'did:key:zAbc', score: { composite: 700 } } as Record<string, unknown>;
    const signed: Record<string, unknown> = { ...obj, signature: mcptSign(obj) };
    // Valid signature, but signed by the public dev seed → not authoritative.
    expect(mcptVerify(signed, { allowDevKey: true })).toBe(true);
    expect(mcptVerify(signed, { allowDevKey: false })).toBe(false);
  });
});

describe('production signing key requirement (FIX #6)', () => {
  it('throws instead of signing with the dev seed when NODE_ENV=production', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevKey = process.env.MCP_T_SIGNING_SECRET_KEY;
    try {
      _resetSigningCache();
      process.env.NODE_ENV = 'production';
      delete process.env.MCP_T_SIGNING_SECRET_KEY;
      expect(() => mcptSign({ a: 1 })).toThrow(/MCP_T_SIGNING_SECRET_KEY/);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevKey === undefined) delete process.env.MCP_T_SIGNING_SECRET_KEY;
      else process.env.MCP_T_SIGNING_SECRET_KEY = prevKey;
      _resetSigningCache();
    }
  });
});

import { describe, test, expect } from 'bun:test';
import {
  identityFromNsec,
  signEvent,
  computeEventId,
} from '../../../src/adapters/nostr/crypto.js';
import type { UnsignedNostrEvent } from '../../../src/types.js';
import { schnorr } from '@noble/curves/secp256k1';
import { bech32 } from '@scure/base';

// Generate a deterministic test keypair
function makeTestNsec(): string {
  // Known 32-byte secret key (all zeros is not valid for schnorr, use a fixed non-zero key)
  const secretKey = new Uint8Array(32);
  secretKey[31] = 1; // minimal valid private key
  const hex = Array.from(secretKey)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const words = bech32.toWords(secretKey);
  return bech32.encode('nsec', words);
}

describe('identityFromNsec', () => {
  test('produces valid hex pubkey from nsec', () => {
    const nsec = makeTestNsec();
    const identity = identityFromNsec(nsec);

    // Pubkey should be 64-char hex (32 bytes x-only)
    expect(identity.pubkeyHex).toMatch(/^[0-9a-f]{64}$/);
    // Secret key should be 64-char hex
    expect(identity.secretKeyHex).toMatch(/^[0-9a-f]{64}$/);
  });

  test('derives correct pubkey from known secret key', () => {
    const nsec = makeTestNsec();
    const identity = identityFromNsec(nsec);

    // Independently derive the expected pubkey
    const secretKeyBytes = new Uint8Array(32);
    secretKeyBytes[31] = 1;
    const expectedPubkey = Array.from(schnorr.getPublicKey(secretKeyBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(identity.pubkeyHex).toBe(expectedPubkey);
  });

  test('throws on invalid prefix', () => {
    // Encode with npub prefix instead of nsec
    const secretKey = new Uint8Array(32);
    secretKey[31] = 1;
    const words = bech32.toWords(secretKey);
    const npub = bech32.encode('npub', words);

    expect(() => identityFromNsec(npub)).toThrow('Expected nsec prefix');
  });
});

describe('computeEventId', () => {
  const unsignedEvent: UnsignedNostrEvent = {
    pubkey: 'a'.repeat(64),
    created_at: 1700000000,
    kind: 1111,
    tags: [['e', 'abc123', '', 'reply']],
    content: 'Hello, Nostr!',
  };

  test('returns 64-char hex string', async () => {
    const id = await computeEventId(unsignedEvent);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  test('is deterministic (same input = same ID)', async () => {
    const id1 = await computeEventId(unsignedEvent);
    const id2 = await computeEventId(unsignedEvent);
    expect(id1).toBe(id2);
  });

  test('changes when content changes', async () => {
    const id1 = await computeEventId(unsignedEvent);
    const modified = { ...unsignedEvent, content: 'Different content' };
    const id2 = await computeEventId(modified);
    expect(id1).not.toBe(id2);
  });

  test('changes when tags change', async () => {
    const id1 = await computeEventId(unsignedEvent);
    const modified = { ...unsignedEvent, tags: [] };
    const id2 = await computeEventId(modified);
    expect(id1).not.toBe(id2);
  });
});

describe('signEvent', () => {
  test('produces valid event with id and sig', async () => {
    const nsec = makeTestNsec();
    const identity = identityFromNsec(nsec);

    const unsigned: UnsignedNostrEvent = {
      pubkey: identity.pubkeyHex,
      created_at: 1700000000,
      kind: 1111,
      tags: [['client', 'test']],
      content: 'Test post',
    };

    const signed = await signEvent(unsigned, identity.secretKeyHex);

    // Has all required fields
    expect(signed.id).toMatch(/^[0-9a-f]{64}$/);
    expect(signed.sig).toMatch(/^[0-9a-f]{128}$/);
    expect(signed.pubkey).toBe(identity.pubkeyHex);
    expect(signed.content).toBe('Test post');
    expect(signed.kind).toBe(1111);
    expect(signed.created_at).toBe(1700000000);
    expect(signed.tags).toEqual([['client', 'test']]);
  });

  test('signature verifies with schnorr.verify', async () => {
    const nsec = makeTestNsec();
    const identity = identityFromNsec(nsec);

    const unsigned: UnsignedNostrEvent = {
      pubkey: identity.pubkeyHex,
      created_at: 1700000000,
      kind: 1111,
      tags: [],
      content: 'Verify me',
    };

    const signed = await signEvent(unsigned, identity.secretKeyHex);

    // Convert hex strings to bytes for verification
    const sigBytes = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      sigBytes[i] = parseInt(signed.sig.slice(i * 2, i * 2 + 2), 16);
    }
    const idBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      idBytes[i] = parseInt(signed.id.slice(i * 2, i * 2 + 2), 16);
    }
    const pubBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      pubBytes[i] = parseInt(signed.pubkey.slice(i * 2, i * 2 + 2), 16);
    }

    const valid = schnorr.verify(sigBytes, idBytes, pubBytes);
    expect(valid).toBe(true);
  });

  test('event ID matches independently computed ID', async () => {
    const nsec = makeTestNsec();
    const identity = identityFromNsec(nsec);

    const unsigned: UnsignedNostrEvent = {
      pubkey: identity.pubkeyHex,
      created_at: 1700000000,
      kind: 1111,
      tags: [['I', 'https://clawstr.com/c/test']],
      content: 'ID check',
    };

    const signed = await signEvent(unsigned, identity.secretKeyHex);
    const independentId = await computeEventId(unsigned);

    expect(signed.id).toBe(independentId);
  });
});

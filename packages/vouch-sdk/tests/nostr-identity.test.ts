import { describe, expect, test } from 'bun:test';
import {
  generateNostrKeypair,
  identityFromHex,
  signEvent,
  verifyEvent,
  type UnsignedEvent,
} from '../src/nostr-identity';

describe('nostr-identity hex validation (#10 fix)', () => {
  test('identityFromHex throws on odd-length hex instead of silently corrupting the key', () => {
    expect(() => identityFromHex('abc')).toThrow(/Invalid hex string/);
  });

  test('identityFromHex throws on non-hex characters', () => {
    expect(() => identityFromHex('zz'.repeat(32))).toThrow(/Invalid hex string/);
  });

  test('identityFromHex throws on empty string', () => {
    expect(() => identityFromHex('')).toThrow(/Invalid hex string/);
  });

  test('identityFromHex succeeds on valid 64-char hex', () => {
    const kp = generateNostrKeypair();
    const restored = identityFromHex(kp.secretKeyHex);
    expect(restored.pubkeyHex).toBe(kp.pubkeyHex);
  });

  test('signEvent throws on corrupted (odd-length) secret key rather than producing a bad signature', async () => {
    const kp = generateNostrKeypair();
    const unsigned: UnsignedEvent = {
      pubkey: kp.pubkeyHex,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'test',
    };
    await expect(signEvent(unsigned, kp.secretKeyHex.slice(0, -1))).rejects.toThrow(/Invalid hex string/);
  });

  test('verifyEvent throws on non-hex signature instead of coercing to a false-positive verify', async () => {
    const kp = generateNostrKeypair();
    const unsigned: UnsignedEvent = {
      pubkey: kp.pubkeyHex,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'test',
    };
    const signed = await signEvent(unsigned, kp.secretKeyHex);
    const tampered = { ...signed, sig: 'not-hex-at-all!!' };
    await expect(verifyEvent(tampered)).rejects.toThrow(/Invalid hex string/);
  });
});

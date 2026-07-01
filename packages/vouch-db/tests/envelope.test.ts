import { describe, expect, test, afterEach } from 'bun:test';

// C3 fix: unit tests for the AES-256-GCM envelope helper. No database
// needed — this exercises the crypto mechanism only.

const TEST_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes, matches the ENCRYPTION_KEY format

describe('crypto/envelope', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalKey;
    }
  });

  test('encryptSecret/decryptSecret round-trips a plaintext value', async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    // Re-import fresh so the module reads the env var set above (module-level
    // caching would otherwise pin whatever was set at first import).
    const { encryptSecret, decryptSecret } = await import(`../src/crypto/envelope?t=${crypto.randomUUID()}`);

    const plaintext = 'nsec1exampleprivatekeymaterial';
    const encrypted = await encryptSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).not.toContain(plaintext);

    const decrypted = await decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  test('two encryptions of the same plaintext produce different ciphertext (random IV)', async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const { encryptSecret } = await import(`../src/crypto/envelope?t=${crypto.randomUUID()}`);

    const a = await encryptSecret('same-value');
    const b = await encryptSecret('same-value');
    expect(a).not.toBe(b);
  });

  test('decryptSecret fails on tampered ciphertext (GCM auth tag catches it)', async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const { encryptSecret, decryptSecret } = await import(`../src/crypto/envelope?t=${crypto.randomUUID()}`);

    const encrypted = await encryptSecret('secret-value');
    const bytes = Buffer.from(encrypted, 'base64');
    const lastIndex = bytes.length - 1;
    bytes[lastIndex] = (bytes[lastIndex] ?? 0) ^ 0xff; // flip a bit in the ciphertext/tag
    const tampered = bytes.toString('base64');

    await expect(decryptSecret(tampered)).rejects.toThrow();
  });

  test('hasEncryptionKey() reflects whether ENCRYPTION_KEY is configured', async () => {
    delete process.env.ENCRYPTION_KEY;
    const unset = await import(`../src/crypto/envelope?t=${crypto.randomUUID()}`);
    expect(unset.hasEncryptionKey()).toBe(false);

    process.env.ENCRYPTION_KEY = TEST_KEY;
    const set = await import(`../src/crypto/envelope?t=${crypto.randomUUID()}`);
    expect(set.hasEncryptionKey()).toBe(true);
  });
});

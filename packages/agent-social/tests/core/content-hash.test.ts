import { describe, test, expect } from 'bun:test';
import { contentHash, normalizeContent } from '../../src/core/content-hash.js';

describe('normalizeContent', () => {
  test('trims whitespace', () => {
    expect(normalizeContent('  hello  ')).toBe('hello');
  });

  test('collapses multiple spaces', () => {
    expect(normalizeContent('hello    world')).toBe('hello world');
  });

  test('collapses newlines', () => {
    expect(normalizeContent('hello\n\n\nworld')).toBe('hello world');
  });

  test('lowercases', () => {
    expect(normalizeContent('Hello World')).toBe('hello world');
  });

  test('same message with different formatting normalizes identically', () => {
    const a = normalizeContent('Trust is earned,  not given.');
    const b = normalizeContent('  trust is earned, not given.  ');
    const c = normalizeContent('TRUST IS EARNED, NOT GIVEN.');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe('contentHash', () => {
  test('produces consistent hex hash', async () => {
    const hash1 = await contentHash('hello world');
    const hash2 = await contentHash('hello world');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
  });

  test('different content produces different hashes', async () => {
    const hash1 = await contentHash('hello world');
    const hash2 = await contentHash('hello world!');
    expect(hash1).not.toBe(hash2);
  });

  test('normalized content produces same hash despite formatting differences', async () => {
    const hash1 = await contentHash('Trust is earned, not given.');
    const hash2 = await contentHash('  TRUST IS EARNED,  NOT GIVEN.  ');
    expect(hash1).toBe(hash2);
  });

  test('actually different messages produce different hashes', async () => {
    const hash1 = await contentHash('Trust is earned');
    const hash2 = await contentHash('Trust is given');
    expect(hash1).not.toBe(hash2);
  });
});

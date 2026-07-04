import { describe, test, expect } from 'bun:test';
import {
  buildPostTags,
  buildReplyTags,
} from '../../../src/adapters/nostr/event-builder.js';

describe('buildPostTags', () => {
  test('includes I tag with subclaw URL', () => {
    const tags = buildPostTags('bitcoin');
    const iTag = tags.find((t) => t[0] === 'I');
    expect(iTag).toBeDefined();
    expect(iTag![1]).toBe('https://clawstr.com/c/bitcoin');
  });

  test('includes K tag with root kind 30023', () => {
    const tags = buildPostTags('bitcoin');
    const kTag = tags.find((t) => t[0] === 'K');
    expect(kTag).toBeDefined();
    expect(kTag![1]).toBe('30023');
  });

  test('includes k tag with comment kind 1111', () => {
    const tags = buildPostTags('bitcoin');
    const kTag = tags.find((t) => t[0] === 'k');
    expect(kTag).toBeDefined();
    expect(kTag![1]).toBe('1111');
  });

  test('includes L and l label tags', () => {
    const tags = buildPostTags('agents');
    const lTag = tags.find((t) => t[0] === 'L');
    expect(lTag).toBeDefined();
    expect(lTag![1]).toBe('social.clawstr');

    const lValueTag = tags.find((t) => t[0] === 'l');
    expect(lValueTag).toBeDefined();
    expect(lValueTag![1]).toBe('agents');
    expect(lValueTag![2]).toBe('social.clawstr');
  });

  test('includes client tag', () => {
    const tags = buildPostTags('bitcoin');
    const clientTag = tags.find((t) => t[0] === 'client');
    expect(clientTag).toBeDefined();
    expect(clientTag![1]).toBe('agent-social/0.1.0');
  });

  test('uses custom client tag when provided', () => {
    const tags = buildPostTags('bitcoin', 'my-bot/1.0');
    const clientTag = tags.find((t) => t[0] === 'client');
    expect(clientTag![1]).toBe('my-bot/1.0');
  });

  test('passes through full URLs as-is for I tag', () => {
    const tags = buildPostTags('https://example.com/forum/test');
    const iTag = tags.find((t) => t[0] === 'I');
    expect(iTag![1]).toBe('https://example.com/forum/test');
  });

  test('has exactly 6 tags', () => {
    const tags = buildPostTags('bitcoin');
    expect(tags).toHaveLength(6);
  });
});

describe('buildReplyTags', () => {
  const targetEventId = 'abc123def456';
  const targetPubkey = 'deadbeef01234567';

  test('includes e tag with reply marker', () => {
    const tags = buildReplyTags('bitcoin', targetEventId, targetPubkey);
    const eTag = tags.find((t) => t[0] === 'e');
    expect(eTag).toBeDefined();
    expect(eTag![1]).toBe(targetEventId);
    expect(eTag![3]).toBe('reply');
  });

  test('includes p tag with target pubkey', () => {
    const tags = buildReplyTags('bitcoin', targetEventId, targetPubkey);
    const pTag = tags.find((t) => t[0] === 'p');
    expect(pTag).toBeDefined();
    expect(pTag![1]).toBe(targetPubkey);
  });

  test('includes I, K, k, L, l, client tags', () => {
    const tags = buildReplyTags('bitcoin', targetEventId, targetPubkey);

    const tagNames = tags.map((t) => t[0]);
    expect(tagNames).toContain('I');
    expect(tagNames).toContain('K');
    expect(tagNames).toContain('k');
    expect(tagNames).toContain('L');
    expect(tagNames).toContain('l');
    expect(tagNames).toContain('client');
  });

  test('has exactly 8 tags (e, p, I, K, k, L, l, client)', () => {
    const tags = buildReplyTags('bitcoin', targetEventId, targetPubkey);
    expect(tags).toHaveLength(8);
  });

  test('uses custom client tag when provided', () => {
    const tags = buildReplyTags(
      'bitcoin',
      targetEventId,
      targetPubkey,
      'my-bot/2.0',
    );
    const clientTag = tags.find((t) => t[0] === 'client');
    expect(clientTag![1]).toBe('my-bot/2.0');
  });
});

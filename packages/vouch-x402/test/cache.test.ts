import { describe, test, expect } from 'bun:test';
import { ScoreCache } from '../src/cache';
import type { VouchScoreResponse } from '../src/types';

const mockScore: VouchScoreResponse = {
  agentId: '01HWXYZ123456789ABCDEFGHIJ',
  vouchScore: 650,
  scoreBreakdown: {
    verification: 200,
    tenure: 80,
    performance: 180,
    backing: 120,
    community: 70,
  },
  backing: {
    totalStakedSats: 150_000,
    backerCount: 3,
    badge: 'community-backed',
  },
  tier: 'trusted',
  lastUpdated: '2026-02-28T00:00:00Z',
};

describe('ScoreCache', () => {
  test('returns cached value within TTL', () => {
    const cache = new ScoreCache(60_000);
    cache.set('test-key', mockScore);
    expect(cache.get('test-key')).toEqual(mockScore);
  });

  test('returns null for missing key', () => {
    const cache = new ScoreCache(60_000);
    expect(cache.get('nonexistent')).toBeNull();
  });

  test('returns null after TTL expiry', async () => {
    const cache = new ScoreCache(50); // 50ms TTL
    cache.set('test-key', mockScore);
    expect(cache.get('test-key')).toEqual(mockScore);

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(cache.get('test-key')).toBeNull();
  });

  test('clears all entries', () => {
    const cache = new ScoreCache(60_000);
    cache.set('key1', mockScore);
    cache.set('key2', mockScore);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('key1')).toBeNull();
  });

  test('disabled when TTL is 0', () => {
    const cache = new ScoreCache(0);
    cache.set('test-key', mockScore);
    expect(cache.get('test-key')).toBeNull();
    expect(cache.size).toBe(0);
  });

  test('has() returns correct boolean', () => {
    const cache = new ScoreCache(60_000);
    expect(cache.has('missing')).toBe(false);
    cache.set('present', mockScore);
    expect(cache.has('present')).toBe(true);
  });
});

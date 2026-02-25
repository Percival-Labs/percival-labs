// rate-limiter.test.ts — Per-consumer rate limiting tests
// TDD RED phase

import { describe, expect, it } from 'bun:test';
import { checkRateLimit, createRateLimitState } from '../src/rate-limiter';
import type { RateLimitState } from '../src/types';

describe('createRateLimitState', () => {
  it('creates a fresh state with count 0', () => {
    const state = createRateLimitState();
    expect(state.count).toBe(0);
    expect(state.windowStart).toBeGreaterThan(0);
  });
});

describe('checkRateLimit', () => {
  it('allows requests within the limit', () => {
    const now = Date.now();
    const state: RateLimitState = { count: 5, windowStart: now - 10_000 };
    const result = checkRateLimit(state, 60, now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(54); // 60 - 5 - 1 (current request)
    expect(result.newState.count).toBe(6);
  });

  it('denies requests at the limit', () => {
    const now = Date.now();
    const state: RateLimitState = { count: 60, windowStart: now - 10_000 };
    const result = checkRateLimit(state, 60, now);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets window after 60 seconds', () => {
    const now = Date.now();
    const state: RateLimitState = { count: 60, windowStart: now - 61_000 };
    const result = checkRateLimit(state, 60, now);
    expect(result.allowed).toBe(true);
    expect(result.newState.count).toBe(1);
    expect(result.remaining).toBe(59);
  });

  it('handles unlimited tier (Infinity limit)', () => {
    const now = Date.now();
    const state: RateLimitState = { count: 999_999, windowStart: now - 10_000 };
    const result = checkRateLimit(state, Infinity, now);
    expect(result.allowed).toBe(true);
  });

  it('handles first request (null state)', () => {
    const now = Date.now();
    const state: RateLimitState = { count: 0, windowStart: now };
    const result = checkRateLimit(state, 10, now);
    expect(result.allowed).toBe(true);
    expect(result.newState.count).toBe(1);
    expect(result.remaining).toBe(9);
  });
});

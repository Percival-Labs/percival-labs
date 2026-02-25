// scoring.test.ts — Vouch score lookup and tier resolution tests
// TDD RED phase

import { describe, expect, it } from 'bun:test';
import { resolveTier } from '../src/scoring';
import type { TrustTier } from '../src/types';

describe('resolveTier', () => {
  it('returns restricted for score 0 with no stake', () => {
    expect(resolveTier(0, 0)).toBe('restricted');
  });

  it('returns restricted for high score but insufficient stake', () => {
    // Score of 500 but only $50 stake — not enough for standard ($100 min)
    expect(resolveTier(500, 50_000)).toBe('restricted');
  });

  it('returns standard for score 200+ with $100+ stake', () => {
    expect(resolveTier(200, 100_000)).toBe('standard');
  });

  it('returns standard when score qualifies but stake only qualifies standard', () => {
    // Score 600 would qualify for elevated, but stake only qualifies for standard
    expect(resolveTier(600, 100_000)).toBe('standard');
  });

  it('returns elevated for score 500+ with $1K+ stake', () => {
    expect(resolveTier(500, 1_000_000)).toBe('elevated');
  });

  it('returns unlimited for score 700+ with $10K+ stake', () => {
    expect(resolveTier(700, 10_000_000)).toBe('unlimited');
  });

  it('returns elevated when score qualifies for unlimited but stake only qualifies elevated', () => {
    expect(resolveTier(800, 1_000_000)).toBe('elevated');
  });

  it('handles exact boundary scores', () => {
    expect(resolveTier(199, 100_000)).toBe('restricted');
    expect(resolveTier(200, 100_000)).toBe('standard');
    expect(resolveTier(499, 1_000_000)).toBe('standard');
    expect(resolveTier(500, 1_000_000)).toBe('elevated');
    expect(resolveTier(699, 10_000_000)).toBe('elevated');
    expect(resolveTier(700, 10_000_000)).toBe('unlimited');
  });
});

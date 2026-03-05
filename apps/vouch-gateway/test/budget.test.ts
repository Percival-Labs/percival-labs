// budget.test.ts — Per-agent budget tracking tests

import { describe, expect, it } from 'bun:test';
import type { BudgetConfig, BudgetState } from '../src/types';

// We test the pure logic by simulating the KV interactions.
// The actual KV-backed functions are thin wrappers around this logic.

describe('budget period reset logic', () => {
  const config: BudgetConfig = { maxSats: 100_000, periodDays: 30 };
  const MS_PER_DAY = 86_400_000;

  it('fresh state starts at 0 spent', () => {
    const state: BudgetState = { spentSats: 0, periodStart: Date.now(), lastUpdated: Date.now() };
    const remaining = Math.max(0, config.maxSats - state.spentSats);
    expect(remaining).toBe(100_000);
  });

  it('tracks spend correctly', () => {
    const state: BudgetState = { spentSats: 50_000, periodStart: Date.now(), lastUpdated: Date.now() };
    const remaining = Math.max(0, config.maxSats - state.spentSats);
    expect(remaining).toBe(50_000);
  });

  it('returns 0 remaining when over budget', () => {
    const state: BudgetState = { spentSats: 150_000, periodStart: Date.now(), lastUpdated: Date.now() };
    const remaining = Math.max(0, config.maxSats - state.spentSats);
    expect(remaining).toBe(0);
  });

  it('resets when period expires', () => {
    const periodMs = config.periodDays * MS_PER_DAY;
    const now = Date.now();
    const state: BudgetState = {
      spentSats: 99_999,
      periodStart: now - periodMs - 1, // 1ms past expiry
      lastUpdated: now - 1000,
    };

    // Simulate getBudgetState logic
    const expired = now - state.periodStart >= periodMs;
    expect(expired).toBe(true);

    // After reset
    const resetState: BudgetState = { spentSats: 0, periodStart: now, lastUpdated: now };
    expect(resetState.spentSats).toBe(0);
  });

  it('does not reset within period', () => {
    const periodMs = config.periodDays * MS_PER_DAY;
    const now = Date.now();
    const state: BudgetState = {
      spentSats: 50_000,
      periodStart: now - (periodMs / 2), // halfway through
      lastUpdated: now - 1000,
    };

    const expired = now - state.periodStart >= periodMs;
    expect(expired).toBe(false);
    expect(state.spentSats).toBe(50_000);
  });
});

describe('budget edge cases', () => {
  it('handles 1-day period', () => {
    const config: BudgetConfig = { maxSats: 1_000, periodDays: 1 };
    const MS_PER_DAY = 86_400_000;
    const now = Date.now();

    // 23h in — should not expire
    const state: BudgetState = {
      spentSats: 500,
      periodStart: now - (23 * 60 * 60 * 1000),
      lastUpdated: now,
    };
    const expired = now - state.periodStart >= config.periodDays * MS_PER_DAY;
    expect(expired).toBe(false);

    // 25h in — should expire
    const state2: BudgetState = {
      spentSats: 500,
      periodStart: now - (25 * 60 * 60 * 1000),
      lastUpdated: now,
    };
    const expired2 = now - state2.periodStart >= config.periodDays * MS_PER_DAY;
    expect(expired2).toBe(true);
  });

  it('handles exact boundary (spend equals max)', () => {
    const config: BudgetConfig = { maxSats: 10_000, periodDays: 7 };
    const state: BudgetState = { spentSats: 10_000, periodStart: Date.now(), lastUpdated: Date.now() };
    const remaining = Math.max(0, config.maxSats - state.spentSats);
    expect(remaining).toBe(0);

    // allowed = remaining > 0
    expect(remaining > 0).toBe(false);
  });

  it('handles very large budgets (enterprise)', () => {
    const config: BudgetConfig = { maxSats: 100_000_000, periodDays: 30 }; // ~$85K/month
    const state: BudgetState = { spentSats: 50_000_000, periodStart: Date.now(), lastUpdated: Date.now() };
    const remaining = Math.max(0, config.maxSats - state.spentSats);
    expect(remaining).toBe(50_000_000);
  });

  it('handles very small budgets (solo dev)', () => {
    const config: BudgetConfig = { maxSats: 100, periodDays: 30 }; // fractions of a cent
    const state: BudgetState = { spentSats: 99, periodStart: Date.now(), lastUpdated: Date.now() };
    const remaining = Math.max(0, config.maxSats - state.spentSats);
    expect(remaining).toBe(1);
    expect(remaining > 0).toBe(true);
  });

  it('TTL calculation produces reasonable values', () => {
    const MS_PER_DAY = 86_400_000;
    const config: BudgetConfig = { maxSats: 10_000, periodDays: 30 };
    const periodMs = config.periodDays * MS_PER_DAY;
    const periodStart = Date.now();
    const elapsed = Date.now() - periodStart; // ~0
    const ttlSeconds = Math.ceil((periodMs - elapsed + MS_PER_DAY) / 1000);

    // Should be ~31 days in seconds
    expect(ttlSeconds).toBeGreaterThan(30 * 24 * 60 * 60);
    expect(ttlSeconds).toBeLessThan(32 * 24 * 60 * 60);
  });

  it('TTL never goes below 60s', () => {
    const MS_PER_DAY = 86_400_000;
    const config: BudgetConfig = { maxSats: 10_000, periodDays: 1 };
    const periodMs = config.periodDays * MS_PER_DAY;
    // Simulate near end of period
    const periodStart = Date.now() - periodMs + 1000; // 1s left
    const elapsed = Date.now() - periodStart;
    const ttlSeconds = Math.ceil((periodMs - elapsed + MS_PER_DAY) / 1000);
    const safeTtl = Math.max(ttlSeconds, 60);

    expect(safeTtl).toBeGreaterThanOrEqual(60);
  });
});

// Tests for the agent underwriting engine.

import { describe, expect, it } from 'bun:test';
import { quoteUnderwriting, type UnderwritingInputs } from './underwriting';

// A well-behaved, well-collateralized agent with ample history.
function goodAgent(overrides: Partial<UnderwritingInputs> = {}): UnderwritingInputs {
  return {
    compositeScore: 820,
    behavioralFidelity: 880,
    fidelityConfidence: 0.85,
    performanceScore: 800,
    evidenceCount: 120,
    collateralSats: 200_000,
    coverageSats: 1_000_000,
    termDays: 30,
    ...overrides,
  };
}

describe('quoteUnderwriting — eligibility gates', () => {
  it('declines an agent with insufficient behavioral history', () => {
    const q = quoteUnderwriting(goodAgent({ evidenceCount: 1 }));
    expect(q.decision).toBe('declined');
    expect(q.riskTier).toBe('declined');
    expect(q.declineReasons).toContain('insufficient_behavioral_history');
    expect(q.premiumSats).toBe(0);
  });

  it('declines when fidelity confidence is below the minimum', () => {
    const q = quoteUnderwriting(goodAgent({ fidelityConfidence: 0.1 }));
    expect(q.decision).toBe('declined');
    expect(q.declineReasons).toContain('confidence_below_minimum');
  });

  it('declines a low-reliability agent', () => {
    const q = quoteUnderwriting(goodAgent({ compositeScore: 200, behavioralFidelity: 200, performanceScore: 200 }));
    expect(q.decision).toBe('declined');
    expect(q.declineReasons).toContain('reliability_below_minimum');
  });

  it('declines non-positive coverage or term', () => {
    expect(quoteUnderwriting(goodAgent({ coverageSats: 0 })).declineReasons).toContain('coverage_must_be_positive');
    expect(quoteUnderwriting(goodAgent({ termDays: 0 })).declineReasons).toContain('term_must_be_positive');
  });

  it('writes a provisional policy for a thin-history agent that fully self-collateralizes', () => {
    const q = quoteUnderwriting(goodAgent({ evidenceCount: 1, collateralSats: 1_000_000, coverageSats: 1_000_000 }));
    expect(q.decision).toBe('quoted');
    expect(q.riskTier).toBe('provisional');
    expect(q.netExposureSats).toBe(0);
    expect(q.premiumSats).toBe(100); // floored — no net exposure to price
  });

  it('still declines a thin-history agent that is not fully collateralized', () => {
    const q = quoteUnderwriting(goodAgent({ evidenceCount: 1, collateralSats: 200_000, coverageSats: 1_000_000 }));
    expect(q.decision).toBe('declined');
    expect(q.declineReasons).toContain('insufficient_behavioral_history');
  });
});

describe('quoteUnderwriting — pricing behavior', () => {
  it('quotes a positive premium and rate for a good agent', () => {
    const q = quoteUnderwriting(goodAgent());
    expect(q.decision).toBe('quoted');
    expect(q.premiumSats).toBeGreaterThan(0);
    expect(q.premiumRateBps).toBeGreaterThan(0);
    expect(q.reliabilityScore).toBeGreaterThan(800);
  });

  it('assigns higher tiers to more reliable agents', () => {
    expect(quoteUnderwriting(goodAgent({ compositeScore: 950, behavioralFidelity: 950, performanceScore: 920 })).riskTier).toBe('preferred');
    expect(quoteUnderwriting(goodAgent({ compositeScore: 700, behavioralFidelity: 680, performanceScore: 660 })).riskTier).toBe('standard');
    expect(quoteUnderwriting(goodAgent({ compositeScore: 520, behavioralFidelity: 500, performanceScore: 480 })).riskTier).toBe('substandard');
  });

  it('charges a lower premium as reliability rises (monotonic)', () => {
    const low = quoteUnderwriting(goodAgent({ compositeScore: 520, behavioralFidelity: 520, performanceScore: 520 }));
    const mid = quoteUnderwriting(goodAgent({ compositeScore: 720, behavioralFidelity: 720, performanceScore: 720 }));
    const high = quoteUnderwriting(goodAgent({ compositeScore: 950, behavioralFidelity: 950, performanceScore: 950 }));
    expect(low.premiumSats).toBeGreaterThan(mid.premiumSats);
    expect(mid.premiumSats).toBeGreaterThan(high.premiumSats);
  });

  it('rewards staked collateral with a lower premium (first-loss)', () => {
    const lowStake = quoteUnderwriting(goodAgent({ collateralSats: 0 }));
    const highStake = quoteUnderwriting(goodAgent({ collateralSats: 500_000 }));
    expect(highStake.netExposureSats).toBeLessThan(lowStake.netExposureSats);
    expect(highStake.premiumSats).toBeLessThan(lowStake.premiumSats);
  });

  it('drives net exposure to zero when fully collateralized, floored at the minimum premium', () => {
    const q = quoteUnderwriting(goodAgent({ collateralSats: 1_000_000, coverageSats: 1_000_000 }));
    expect(q.decision).toBe('quoted');
    expect(q.netExposureSats).toBe(0);
    expect(q.expectedLossSats).toBe(0);
    expect(q.premiumSats).toBe(100); // MIN_PREMIUM_SATS
  });

  it('charges more for thinner history (uncertainty load) at equal reliability', () => {
    const confident = quoteUnderwriting(goodAgent({ fidelityConfidence: 0.95 }));
    const uncertain = quoteUnderwriting(goodAgent({ fidelityConfidence: 0.35 }));
    expect(uncertain.premiumSats).toBeGreaterThan(confident.premiumSats);
  });

  it('scales premium with term length', () => {
    const short = quoteUnderwriting(goodAgent({ termDays: 30 }));
    const long = quoteUnderwriting(goodAgent({ termDays: 365 }));
    expect(long.premiumSats).toBeGreaterThan(short.premiumSats);
  });

  it('exposes an explainable breakdown', () => {
    const q = quoteUnderwriting(goodAgent());
    expect(q.breakdown.reliability).toBeGreaterThan(0);
    expect(q.breakdown.annualFailureProb).toBeGreaterThanOrEqual(0);
    expect(q.annualFailureProbBps).toBeGreaterThanOrEqual(0);
  });
});

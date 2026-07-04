// Tests for the performance-bond engine (Vouch Line 1 — surety / credit).

import { describe, expect, it } from 'bun:test';
import { quotePerformanceBond, type PerformanceBondInputs } from './performance-bond';

// A brand-new agent: no track record, no stake, neutral-ish scores.
function newAgent(overrides: Partial<PerformanceBondInputs> = {}): PerformanceBondInputs {
  return {
    compositeScore: 300,
    behavioralFidelity: 500,
    performanceScore: 300,
    fidelityConfidence: 0.1,
    trackRecordCount: 0,
    ownStakeSats: 0,
    backingSats: 0,
    requestedBondSats: 50_000,
    existingBondedSats: 0,
    termDays: 30,
    ...overrides,
  };
}

// An established, high-reputation agent with capital.
function establishedAgent(overrides: Partial<PerformanceBondInputs> = {}): PerformanceBondInputs {
  return {
    compositeScore: 850,
    behavioralFidelity: 900,
    performanceScore: 820,
    fidelityConfidence: 0.85,
    trackRecordCount: 30,
    ownStakeSats: 1_000_000,
    backingSats: 0,
    requestedBondSats: 500_000,
    existingBondedSats: 0,
    termDays: 30,
    ...overrides,
  };
}

describe('quotePerformanceBond — cold start', () => {
  it('never declines a brand-new agent — issues the unsecured starter line', () => {
    const q = quotePerformanceBond(newAgent());
    expect(q.decision).toBe('quoted');
    expect(q.tier).toBe('provisional');
    expect(q.onramp).toBe('unsecured_starter');
    expect(q.offeredBondSats).toBeGreaterThan(0);
    // Capped at the tiny starter line, well below the request.
    expect(q.offeredBondSats).toBeLessThan(newAgent().requestedBondSats);
    expect(q.cappedByCapacity).toBe(true);
  });

  it('only hard-declines invalid inputs', () => {
    expect(quotePerformanceBond(newAgent({ requestedBondSats: 0 })).declineReasons).toContain('bond_amount_must_be_positive');
    expect(quotePerformanceBond(newAgent({ termDays: 0 })).declineReasons).toContain('term_must_be_positive');
  });

  it('lets a new agent bond more by posting its own stake (self-secured)', () => {
    const unsecured = quotePerformanceBond(newAgent({ requestedBondSats: 200_000 }));
    const secured = quotePerformanceBond(newAgent({ requestedBondSats: 200_000, ownStakeSats: 200_000 }));
    expect(secured.offeredBondSats).toBeGreaterThan(unsecured.offeredBondSats);
    expect(secured.offeredBondSats).toBe(200_000);
    expect(secured.onramp).toBe('self_secured');
  });

  it('lets a third party back a new agent (backed bond)', () => {
    const q = quotePerformanceBond(newAgent({ requestedBondSats: 200_000, backingSats: 600_000 }));
    expect(q.offeredBondSats).toBe(200_000);
    expect(q.onramp).toBe('third_party_backed');
    expect(q.netCreditExposureSats).toBe(0); // fully covered by backers, no pool risk
  });
});

describe('quotePerformanceBond — capacity', () => {
  it('grows the unsecured line with reputation and track record', () => {
    const thin = quotePerformanceBond(establishedAgent({ trackRecordCount: 0 }));
    const proven = quotePerformanceBond(establishedAgent({ trackRecordCount: 30 }));
    expect(proven.unsecuredLineSats).toBeGreaterThan(thin.unsecuredLineSats);
  });

  it('bonds a proven agent on reputation alone — no collateral required', () => {
    const q = quotePerformanceBond(establishedAgent({ requestedBondSats: 2_000_000, ownStakeSats: 0 }));
    expect(q.requiredCollateralForRequestedSats).toBe(0);
    expect(q.offeredBondSats).toBe(2_000_000);
  });

  it('reduces available capacity by outstanding bonded backlog', () => {
    const fresh = quotePerformanceBond(establishedAgent({ requestedBondSats: 5_000_000 }));
    const loaded = quotePerformanceBond(establishedAgent({ requestedBondSats: 5_000_000, existingBondedSats: 12_000_000 }));
    expect(loaded.availableCapacitySats).toBeLessThan(fresh.availableCapacitySats);
    expect(loaded.offeredBondSats).toBeLessThan(fresh.offeredBondSats);
  });

  it('assigns the provisional tier until a track record exists', () => {
    expect(quotePerformanceBond(establishedAgent({ trackRecordCount: 1 })).tier).toBe('provisional');
    expect(quotePerformanceBond(establishedAgent({ trackRecordCount: 30 })).tier).toBe('preferred');
  });
});

describe('quotePerformanceBond — pricing', () => {
  it('prices a self-secured bond cheaper than an unsecured one (collateral reward)', () => {
    const unsecured = quotePerformanceBond(establishedAgent({ requestedBondSats: 500_000, ownStakeSats: 0 }));
    const secured = quotePerformanceBond(establishedAgent({ requestedBondSats: 500_000, ownStakeSats: 500_000 }));
    expect(secured.netCreditExposureSats).toBe(0);
    expect(unsecured.netCreditExposureSats).toBeGreaterThan(0);
    expect(secured.premiumSats).toBeLessThan(unsecured.premiumSats);
  });

  it('charges a higher fee rate to weaker credit', () => {
    const strong = quotePerformanceBond(establishedAgent({ requestedBondSats: 100_000, ownStakeSats: 100_000 }));
    const weak = quotePerformanceBond(establishedAgent({
      requestedBondSats: 100_000,
      ownStakeSats: 100_000,
      compositeScore: 500,
      behavioralFidelity: 500,
      performanceScore: 500,
    }));
    expect(weak.breakdown.baseRateBps).toBeGreaterThan(strong.breakdown.baseRateBps);
  });

  it('scales the fee with term length', () => {
    const short = quotePerformanceBond(establishedAgent({ termDays: 30 }));
    const long = quotePerformanceBond(establishedAgent({ termDays: 365 }));
    expect(long.premiumSats).toBeGreaterThan(short.premiumSats);
  });
});

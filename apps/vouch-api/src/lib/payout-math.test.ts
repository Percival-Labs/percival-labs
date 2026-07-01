// Tests for the C1 money-in-before-money-out invariant.

import { describe, expect, it } from 'bun:test';
import { cappedDistributableSats } from './payout-math';

describe('cappedDistributableSats (C1: treasury drain guard)', () => {
  it('pays nothing when fees have no settled backing (the drain vector)', () => {
    // Attacker self-reports 1 BTC of "revenue" via POST /fees -> large claimed fee, zero backing.
    const claimedFeeSats = 1_000_000; // unverified, self-reported
    const backedFeeSats = 0; // no collected sats
    expect(cappedDistributableSats(claimedFeeSats, backedFeeSats)).toBe(0);
  });

  it('caps the payout at the collected-and-settled backing', () => {
    // 10k claimed but only 3k actually collected -> only 3k is payable.
    expect(cappedDistributableSats(10_000, 3_000)).toBe(3_000);
  });

  it('pays the full claim when backing covers it', () => {
    expect(cappedDistributableSats(3_000, 10_000)).toBe(3_000);
  });

  it('pays the exact amount when backing equals the claim', () => {
    expect(cappedDistributableSats(5_000, 5_000)).toBe(5_000);
  });

  it('never returns a negative amount', () => {
    expect(cappedDistributableSats(-100, 5_000)).toBe(0);
    expect(cappedDistributableSats(5_000, -100)).toBe(0);
  });

  it('mixed verified + unverified fees only pay the verified (backed) portion', () => {
    // 8k of legit collected fees + 100k of self-reported fees = 108k claimed, but backing = 8k.
    const claimed = 8_000 + 100_000;
    const backed = 8_000;
    expect(cappedDistributableSats(claimed, backed)).toBe(8_000);
  });
});

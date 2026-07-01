// Pure payout math — no DB, no side effects. Load-bearing money invariants live here so
// they can be unit-tested directly.

/**
 * C1 invariant (money-in-before-money-out): the amount of yield that may actually be paid out
 * never exceeds the settled, collected backing for a pool.
 *
 * - `claimedFeeSats`  = sum of undistributed activity fees for the period (may include
 *                       self-reported / unverified fees).
 * - `backedFeeSats`   = sum of settled backing rows for the pool (real collected sats only).
 *
 * Unverified fees contribute 0 backing, so they can never trigger a real payout.
 */
export function cappedDistributableSats(claimedFeeSats: number, backedFeeSats: number): number {
  return Math.max(0, Math.min(claimedFeeSats, backedFeeSats));
}

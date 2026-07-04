// Performance Bond Engine — Vouch Line 1 (surety / credit).
//
// A performance bond is a THREE-party instrument: the agent (principal) promises to
// complete a declared job, the relying party (obligee) is protected if it doesn't, and
// Vouch (surety) stands behind the agent. Unlike insurance, surety is CREDIT, not risk
// transfer: Vouch expects ~zero net loss because every bond is indemnified by the agent's
// staked collateral. On a call, slashing recovers the loss from that stake (subrogation).
//
// This is also the cold-start onramp. A brand-new agent is never declined; it is assigned
// a small bonding capacity backed by some mix of:
//   - its own stake             (self-secured / cash-secured bond)
//   - third-party backers' stake (backed bond — stakers secure it for a yield)
//   - a tiny unsecured line      (reputation-only starter credit Vouch extends at risk)
// Capacity grows as the agent completes signed jobs on the MCP-T ledger.
//
// Vouch's ACTUAL at-risk on any bond is only the unsecured portion (offered − collateral).
// Collateral is first-loss; the unsecured line is the only thing the pool can lose, and it
// is kept small by reputation. Self-collateralizing a bond drives that exposure to zero,
// which is why it is cheaper — the C > D incentive expressed in price.
//
// Pure function (inputs -> quote): fully testable and auditable. Amounts in sats (integers).

export type BondTier = 'preferred' | 'standard' | 'substandard' | 'provisional';

// Which credit enhancement actually secured the offered bond.
export type BondOnramp =
  | 'unsecured_starter'   // reputation-only; nothing posted behind it
  | 'self_secured'        // agent's own stake covers it
  | 'third_party_backed'  // backers' stake covers it
  | 'partially_secured';  // collateral covers part, unsecured line the rest

export interface PerformanceBondInputs {
  /** Vouch composite trust score, 0-1000. */
  compositeScore: number;
  /** MCP-T behavioral fidelity (declared-vs-actual), 0-1000. Neutral baseline 500. */
  behavioralFidelity: number;
  /** Vouch performance dimension, 0-1000. */
  performanceScore: number;
  /** Confidence in the behavioral signal, 0-1 (grows with trace count). */
  fidelityConfidence: number;
  /** Completed signed jobs on the ledger — drives capacity growth. */
  trackRecordCount: number;
  /** Agent's own staked sats — first-loss indemnity collateral. */
  ownStakeSats: number;
  /** Third-party backers' staked sats securing this agent's bonds. */
  backingSats: number;
  /** Bond (job) amount requested, in sats. */
  requestedBondSats: number;
  /** Sats already outstanding in active bonds (backlog) — consumes aggregate capacity. */
  existingBondedSats: number;
  /** Bond term in days. */
  termDays: number;
}

export interface PerformanceBondQuote {
  decision: 'quoted' | 'declined';
  tier: BondTier;
  /** Blended reliability, 0-1000. */
  reliabilityScore: number;

  // ── Bonding capacity ──
  /** Max single bond = collateral + unsecured line. */
  singleJobLimitSats: number;
  /** Max total outstanding across all bonds. */
  aggregateLimitSats: number;
  /** What can be bonded right now given backlog. */
  availableCapacitySats: number;

  // ── This offer ──
  offeredBondSats: number;
  requestedBondSats: number;
  cappedByCapacity: boolean;
  /** Collateral behind the agent (own stake + backing). */
  collateralSats: number;
  /** Reputation-only credit Vouch will extend with nothing behind it. */
  unsecuredLineSats: number;
  /** Collateral the agent must post to secure the full requested bond. */
  requiredCollateralForRequestedSats: number;
  /** Vouch's true at-risk on the offered bond (unsecured portion). */
  netCreditExposureSats: number;
  onramp: BondOnramp;

  // ── Price (a fee, not expected loss) ──
  premiumSats: number;
  premiumRateBps: number;

  declineReasons: string[];
  breakdown: {
    reliability: number;
    baseRateBps: number;
    termFactor: number;
    unsecuredLoadOnExposureBps: number;
  };
}

// ── Parameters (tunable; documented so the model is auditable) ──

// Reliability blend — same weights as the liability engine for a consistent "credit score".
const W_COMPOSITE = 0.45;
const W_FIDELITY = 0.4;
const W_PERFORMANCE = 0.15;

// Unsecured starter line: the reputation-only credit Vouch extends at its own risk.
// Every agent gets at least the floor (the "tiny unsecured cap"); it grows with proven
// reliability and track record up to the max. This is the only sat Vouch can actually lose.
const UNSECURED_FLOOR_SATS = 10_000;
const UNSECURED_MAX_SATS = 5_000_000;
const TRACK_RECORD_FULL_CREDIT = 20; // jobs at which track-record multiplier saturates

// Aggregate: Vouch will carry more unsecured credit across many bonds than on any one,
// because exposure is diversified.
const AGGREGATE_UNSECURED_MULTIPLE = 3;

// An agent is 'provisional' until it has a real track record, regardless of neutral-baseline
// scores (a brand-new agent computes a middling reliability from 500 baselines).
const PROVISIONAL_TRACK_RECORD = 3;

// Tier thresholds on reliability (0-1).
const TIER_PREFERRED = 0.8;
const TIER_STANDARD = 0.65;
const TIER_SUBSTANDARD = 0.45;

// Bond fee schedule (bps of bond amount, annualized) by tier — weaker credit pays more.
const BASE_RATE_BPS: Record<BondTier, number> = {
  preferred: 100,
  standard: 200,
  substandard: 350,
  provisional: 500,
};

// Extra load on the UNSECURED portion of a bond (Vouch's at-risk). Makes a self-secured
// bond cheaper than an unsecured one, rewarding collateralization.
const UNSECURED_LOAD_BPS = 400;

// Minimum fee for any bound bond (admin + capital floor).
const MIN_BOND_PREMIUM_SATS = 100;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function reliabilityTier(reliability: number): BondTier {
  if (reliability >= TIER_PREFERRED) return 'preferred';
  if (reliability >= TIER_STANDARD) return 'standard';
  if (reliability >= TIER_SUBSTANDARD) return 'substandard';
  return 'provisional';
}

/**
 * Size the agent's reputation-only unsecured credit line. Floor for everyone (so a fresh
 * agent is bondable with nothing posted), scaling up with reliability and track record.
 */
function unsecuredLine(reliability: number, trackRecordCount: number): number {
  const trackFactor = clamp(trackRecordCount / TRACK_RECORD_FULL_CREDIT, 0, 1);
  const earned = UNSECURED_MAX_SATS * reliability * trackFactor;
  return Math.round(UNSECURED_FLOOR_SATS + earned);
}

/**
 * Price and size a performance bond from the agent's reputation, track record, and the
 * collateral standing behind it. Pure — no I/O.
 */
export function quotePerformanceBond(input: PerformanceBondInputs): PerformanceBondQuote {
  const reliability = clamp(
    (W_COMPOSITE * input.compositeScore +
      W_FIDELITY * input.behavioralFidelity +
      W_PERFORMANCE * input.performanceScore) /
      1000,
    0,
    1,
  );
  const reliabilityScore = Math.round(reliability * 1000);

  const tier: BondTier =
    input.trackRecordCount < PROVISIONAL_TRACK_RECORD ? 'provisional' : reliabilityTier(reliability);

  const collateralSats = Math.max(0, input.ownStakeSats) + Math.max(0, input.backingSats);
  const unsecuredLineSats = unsecuredLine(reliability, input.trackRecordCount);

  // Capacity: a bond is backed by collateral first, then by the unsecured line.
  const singleJobLimitSats = collateralSats + unsecuredLineSats;
  const aggregateLimitSats = collateralSats + unsecuredLineSats * AGGREGATE_UNSECURED_MULTIPLE;
  const availableCapacitySats = Math.max(0, aggregateLimitSats - Math.max(0, input.existingBondedSats));

  const baseRateBps = BASE_RATE_BPS[tier];
  const termFactor = input.termDays / 365;

  // ── Hard declines (never for lack of history) ──
  const declineReasons: string[] = [];
  if (input.requestedBondSats <= 0) declineReasons.push('bond_amount_must_be_positive');
  if (input.termDays <= 0) declineReasons.push('term_must_be_positive');

  const breakdown = {
    reliability,
    baseRateBps,
    termFactor,
    unsecuredLoadOnExposureBps: UNSECURED_LOAD_BPS,
  };

  if (declineReasons.length > 0) {
    return {
      decision: 'declined',
      tier,
      reliabilityScore,
      singleJobLimitSats,
      aggregateLimitSats,
      availableCapacitySats,
      offeredBondSats: 0,
      requestedBondSats: input.requestedBondSats,
      cappedByCapacity: false,
      collateralSats,
      unsecuredLineSats,
      requiredCollateralForRequestedSats: 0,
      netCreditExposureSats: 0,
      onramp: 'unsecured_starter',
      premiumSats: 0,
      premiumRateBps: 0,
      declineReasons,
      breakdown,
    };
  }

  // Offer is the requested bond capped by what capacity supports right now.
  const maxBondNow = Math.min(singleJobLimitSats, availableCapacitySats);
  const offeredBondSats = Math.max(0, Math.min(input.requestedBondSats, maxBondNow));
  const cappedByCapacity = offeredBondSats < input.requestedBondSats;

  // Collateral needed to fully secure the REQUESTED bond (the unsecured line is free credit).
  const requiredCollateralForRequestedSats = Math.max(0, input.requestedBondSats - unsecuredLineSats);

  // Vouch's at-risk on the OFFERED bond = the part not covered by collateral.
  const netCreditExposureSats = Math.max(0, offeredBondSats - collateralSats);

  // Which instrument secured it.
  let onramp: BondOnramp;
  if (offeredBondSats === 0 || collateralSats === 0) {
    onramp = 'unsecured_starter';
  } else if (collateralSats >= offeredBondSats) {
    onramp = input.backingSats >= input.ownStakeSats ? 'third_party_backed' : 'self_secured';
  } else {
    onramp = 'partially_secured';
  }

  // Price: a base fee on the bond, plus a load on the unsecured (at-risk) portion.
  const baseFee = offeredBondSats * (baseRateBps / 10000) * termFactor;
  const unsecuredLoad = netCreditExposureSats * (UNSECURED_LOAD_BPS / 10000) * termFactor;
  const premiumSats = offeredBondSats > 0 ? Math.max(MIN_BOND_PREMIUM_SATS, Math.round(baseFee + unsecuredLoad)) : 0;
  const premiumRateBps = offeredBondSats > 0 ? Math.round((premiumSats / offeredBondSats) * 10000) : 0;

  return {
    decision: 'quoted',
    tier,
    reliabilityScore,
    singleJobLimitSats,
    aggregateLimitSats,
    availableCapacitySats,
    offeredBondSats,
    requestedBondSats: input.requestedBondSats,
    cappedByCapacity,
    collateralSats,
    unsecuredLineSats,
    requiredCollateralForRequestedSats,
    netCreditExposureSats,
    onramp,
    premiumSats,
    premiumRateBps,
    declineReasons: [],
    breakdown,
  };
}

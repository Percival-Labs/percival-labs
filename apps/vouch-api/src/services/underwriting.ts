// Agent Underwriting Engine — Vouch Line 2 (liability coverage / risk transfer).
//
// This is the actuarial line: it covers HARM an agent causes (scope violations, fidelity
// breaches) and is priced on EXPECTED LOSS, unlike the performance-bond line (see
// performance-bond.ts) which is credit indemnified by stake. Liability is true risk
// transfer — Vouch's pool can actually pay out here — so thin/low-quality risk is priced
// conservatively or, for a brand-new agent, written only when fully self-collateralized.
//
// Turns an agent's signed behavioral-reputation ledger (Vouch trust score + MCP-T
// behavioral fidelity) plus its staked collateral into a risk-priced premium.
// This is the value-capture layer: the protocol produces trust signals; underwriting
// prices the risk of an autonomous agent's operation and charges for the coverage.
//
// Design principles:
//   - Reputation lowers expected loss (better-behaved agents are cheaper to insure).
//   - Staked collateral is FIRST-LOSS capital: it absorbs losses before the pool does,
//     so staking directly lowers the premium. This is the C > D incentive in pricing.
//   - Thin behavioral history (low confidence) carries an uncertainty load — we charge
//     more, or decline, when we can't see enough to price the risk.
//   - The engine is PURE (inputs -> quote) so it is fully testable and auditable.
//
// All monetary amounts are in sats (integers).

// 'provisional' = a bootstrapping agent insured within a probationary / bonded cap.
export type RiskTier = 'preferred' | 'standard' | 'substandard' | 'provisional' | 'declined';

export interface UnderwritingInputs {
  /** Vouch composite trust score, 0-1000. */
  compositeScore: number;
  /** MCP-T behavioral fidelity score (declared-vs-actual), 0-1000. Neutral baseline is 500. */
  behavioralFidelity: number;
  /** Confidence in the fidelity score, 0-1 (grows with trace count). */
  fidelityConfidence: number;
  /** Vouch performance dimension, 0-1000. */
  performanceScore: number;
  /** Behavioral traces + completed contracts backing the score. */
  evidenceCount: number;
  /** Sats staked in the agent's pool — first-loss collateral / bond. */
  collateralSats: number;
  /** Requested coverage cap in sats. */
  coverageSats: number;
  /** Policy term in days. */
  termDays: number;
}

export interface UnderwritingQuote {
  decision: 'quoted' | 'declined';
  riskTier: RiskTier;
  /** Blended reliability, 0-1000 (the actuarial "credit score" of the agent). */
  reliabilityScore: number;
  /** Modeled annual probability of a covered failure, in basis points. */
  annualFailureProbBps: number;
  /** Coverage at risk to the pool after collateral first-loss, in sats. */
  netExposureSats: number;
  /** Modeled expected loss over the term, in sats. */
  expectedLossSats: number;
  /** Quoted premium in sats (0 if declined). */
  premiumSats: number;
  /** Premium as a fraction of offered coverage, in basis points. */
  premiumRateBps: number;
  declineReasons: string[];
  breakdown: {
    reliability: number;
    annualFailureProb: number;
    termFactor: number;
    severity: number;
    uncertaintyMultiplier: number;
    riskMargin: number;
  };
}

// ── Actuarial parameters (tunable; documented so the model is auditable) ──

// Reliability blend: how much each signal contributes to the agent's "credit score".
const W_COMPOSITE = 0.45;
const W_FIDELITY = 0.4;
const W_PERFORMANCE = 0.15;

// Hazard model: annual failure probability = MAX_HAZARD * (1 - reliability)^EXP.
// A zero-reputation agent fails ~50%/yr; a perfect-reputation agent approaches 0.
const MAX_ANNUAL_HAZARD = 0.5;
const HAZARD_EXPONENT = 1.5;

// Average fraction of net exposure actually lost when a covered failure occurs.
const AVG_SEVERITY = 0.6;

// Uncertainty load: at confidence 0 we multiply expected loss by (1 + this); at
// confidence 1 there is no load. Thin-history agents pay for the uncertainty.
const UNCERTAINTY_LOAD = 0.75;

// Expense + cost-of-capital + margin on top of expected loss. This is the spread
// the underwriter captures — the business model.
const RISK_MARGIN = 0.3;

// Minimum premium for any bound policy (admin + capital floor).
const MIN_PREMIUM_SATS = 100;

// Eligibility gates.
const MIN_EVIDENCE_FOR_QUOTE = 3;
const MIN_CONFIDENCE = 0.3;
const MIN_RELIABILITY = 0.45; // below this, decline (substandard floor)

// Tier thresholds on reliability (0-1).
const TIER_PREFERRED = 0.8;
const TIER_STANDARD = 0.65;
const TIER_SUBSTANDARD = 0.45;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function tierFor(reliability: number): RiskTier {
  if (reliability >= TIER_PREFERRED) return 'preferred';
  if (reliability >= TIER_STANDARD) return 'standard';
  if (reliability >= TIER_SUBSTANDARD) return 'substandard';
  return 'declined';
}

/**
 * Price an insurance policy for an agent from its reputation, behavioral fidelity,
 * and staked collateral. Pure function — no I/O.
 */
export function quoteUnderwriting(input: UnderwritingInputs): UnderwritingQuote {
  const reliability = clamp(
    (W_COMPOSITE * input.compositeScore +
      W_FIDELITY * input.behavioralFidelity +
      W_PERFORMANCE * input.performanceScore) /
      1000,
    0,
    1,
  );

  const annualFailureProb = MAX_ANNUAL_HAZARD * Math.pow(1 - reliability, HAZARD_EXPONENT);
  const termFactor = input.termDays / 365;
  const netExposureSats = Math.max(0, input.coverageSats - input.collateralSats);
  const uncertaintyMultiplier = 1 + UNCERTAINTY_LOAD * (1 - clamp(input.fidelityConfidence, 0, 1));

  const expectedLossSats = annualFailureProb * termFactor * netExposureSats * AVG_SEVERITY;

  const breakdown = {
    reliability,
    annualFailureProb,
    termFactor,
    severity: AVG_SEVERITY,
    uncertaintyMultiplier,
    riskMargin: RISK_MARGIN,
  };

  // ── Eligibility ──
  // Hard declines: invalid inputs — never quotable.
  const declineReasons: string[] = [];
  if (input.coverageSats <= 0) declineReasons.push('coverage_must_be_positive');
  if (input.termDays <= 0) declineReasons.push('term_must_be_positive');

  // Soft risk gates: thin or low-quality risk. We can still write it as a capped
  // 'provisional' policy IF the agent fully self-collateralizes (net exposure 0), so the
  // pool can't lose. This is the liability line's cold-start: a new agent posts its own
  // stake to get covered. Uncovered thin risk is still declined — we can't price the
  // unknown without skin in the game.
  const riskGates: string[] = [];
  if (input.evidenceCount < MIN_EVIDENCE_FOR_QUOTE) riskGates.push('insufficient_behavioral_history');
  if (input.fidelityConfidence < MIN_CONFIDENCE) riskGates.push('confidence_below_minimum');
  if (reliability < MIN_RELIABILITY) riskGates.push('reliability_below_minimum');

  const fullySelfSecured = netExposureSats === 0;
  const provisional = declineReasons.length === 0 && riskGates.length > 0 && fullySelfSecured;
  if (riskGates.length > 0 && !provisional) declineReasons.push(...riskGates);

  const reliabilityScore = Math.round(reliability * 1000);
  const annualFailureProbBps = Math.round(annualFailureProb * 10000);

  if (declineReasons.length > 0) {
    return {
      decision: 'declined',
      riskTier: 'declined',
      reliabilityScore,
      annualFailureProbBps,
      netExposureSats,
      expectedLossSats: Math.round(expectedLossSats),
      premiumSats: 0,
      premiumRateBps: 0,
      declineReasons,
      breakdown,
    };
  }

  const rawPremium = expectedLossSats * uncertaintyMultiplier * (1 + RISK_MARGIN);
  const premiumSats = Math.max(MIN_PREMIUM_SATS, Math.round(rawPremium));
  const premiumRateBps = input.coverageSats > 0 ? Math.round((premiumSats / input.coverageSats) * 10000) : 0;

  return {
    decision: 'quoted',
    riskTier: provisional ? 'provisional' : tierFor(reliability),
    reliabilityScore,
    annualFailureProbBps,
    netExposureSats,
    expectedLossSats: Math.round(expectedLossSats),
    premiumSats,
    premiumRateBps,
    declineReasons: [],
    breakdown,
  };
}

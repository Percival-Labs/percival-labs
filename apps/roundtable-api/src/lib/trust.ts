// The Round Table — Trust Score Computation Engine
// Pure computation module — no database dependencies.
// Implements the 5-dimension trust model:
//   Verification (30%), Tenure (20%), Contribution (25%), Community (15%), Chivalry (10%)

// ── Types ──

export type VerificationLevel = 'email' | 'identity' | null;

export interface TrustScoreParams {
  /** User's verification level (null = unverified) */
  verificationLevel: VerificationLevel;
  /** When the account was created */
  accountCreatedAt: Date;
  /** Total number of posts by this subject */
  postsCount: number;
  /** Average score across all comments by this subject */
  avgCommentScore: number;
  /** Total upvotes received across all content */
  upvotes: number;
  /** Total downvotes received across all content */
  downvotes: number;
  /** Total votes received (upvotes + downvotes) */
  totalVotesReceived: number;
  /** Number of upheld chivalry violations */
  upheldViolations: number;
}

export interface TrustDimensionBreakdown {
  verification: number;
  tenure: number;
  contribution: number;
  community: number;
  chivalry: number;
}

export interface TrustScoreResult {
  composite: number;
  dimensions: TrustDimensionBreakdown;
}

// ── Constants ──

/** Verification level to base score mapping (out of 700 max) */
const VERIFICATION_SCORES: Record<string, number> = {
  unverified: 100,
  email: 300,
  identity: 700,
};

/** Penalty per upheld chivalry violation */
const CHIVALRY_PENALTY_PER_VIOLATION = 200;

/** Dimension definitions with weights */
export const TRUST_DIMENSIONS = {
  verification: { weight: 0.30 },
  tenure: { weight: 0.20 },
  contribution: { weight: 0.25 },
  community: { weight: 0.15 },
  chivalry: { weight: 0.10 },
} as const;

// ── Dimension Calculators ──

function computeVerification(level: VerificationLevel): number {
  const key = level ?? 'unverified';
  const baseScore = VERIFICATION_SCORES[key] ?? 100;
  // Normalize from 0-700 range to 0-1000
  return Math.round((baseScore / 700) * 1000);
}

function computeTenure(accountCreatedAt: Date): number {
  const now = Date.now();
  const daysSinceCreation = (now - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round(Math.min(1000, 200 * Math.log(daysSinceCreation + 1)));
}

function computeContribution(postsCount: number, avgCommentScore: number): number {
  const postScore = Math.min(500, postsCount * 10);
  const qualityScore = Math.min(500, avgCommentScore * 100);
  return Math.min(1000, Math.round(postScore + qualityScore));
}

function computeCommunity(upvotes: number, downvotes: number, totalVotesReceived: number): number {
  const totalVotes = upvotes + downvotes;
  const ratioScore = totalVotes > 0
    ? (upvotes / totalVotes) * 500
    : 250; // default neutral when no votes
  const volumeScore = Math.min(500, totalVotesReceived * 5);
  return Math.min(1000, Math.round(ratioScore + volumeScore));
}

function computeChivalry(upheldViolations: number): number {
  return Math.max(0, 1000 - upheldViolations * CHIVALRY_PENALTY_PER_VIOLATION);
}

// ── Main Computation ──

/**
 * Compute the 5-dimension trust score from raw parameters.
 * Pure function — no side effects, no database access.
 */
export function computeTrustScore(params: TrustScoreParams): TrustScoreResult {
  const dimensions: TrustDimensionBreakdown = {
    verification: computeVerification(params.verificationLevel),
    tenure: computeTenure(params.accountCreatedAt),
    contribution: computeContribution(params.postsCount, params.avgCommentScore),
    community: computeCommunity(params.upvotes, params.downvotes, params.totalVotesReceived),
    chivalry: computeChivalry(params.upheldViolations),
  };

  const composite = Math.round(
    dimensions.verification * TRUST_DIMENSIONS.verification.weight
    + dimensions.tenure * TRUST_DIMENSIONS.tenure.weight
    + dimensions.contribution * TRUST_DIMENSIONS.contribution.weight
    + dimensions.community * TRUST_DIMENSIONS.community.weight
    + dimensions.chivalry * TRUST_DIMENSIONS.chivalry.weight,
  );

  return {
    composite: Math.min(1000, Math.max(0, composite)),
    dimensions,
  };
}

/**
 * Compute vote weight in basis points from a trust score.
 * Range: 50bp (min) to 300bp (max, capped).
 * Verified subjects get a +50bp bonus.
 *
 * 100bp = 1x voting power (default).
 */
export function computeVoteWeight(trustScore: number, isVerified: boolean): number {
  // Base: 50 + (trustScore / 1000) * 150 => range 50-200bp
  const base = 50 + (trustScore / 1000) * 150;
  const bonus = isVerified ? 50 : 0;
  const weight = Math.round(base + bonus);
  // Cap at 300bp
  return Math.min(300, weight);
}

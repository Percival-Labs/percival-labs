// The Round Table — Trust Score Service
// Queries the database for trust-relevant data and delegates to the pure computation engine.

import {
  db,
  users,
  agents,
  posts,
  comments,
  votes,
  chivalryViolations,
} from '@percival/roundtable-db';
import { eq, and, sql } from 'drizzle-orm';
import {
  computeTrustScore,
  computeVoteWeight,
  type TrustScoreParams,
  type VerificationLevel,
} from '../lib/trust';

// ── Types ──

export type SubjectType = 'user' | 'agent';

export interface TrustBreakdownResponse {
  subject_id: string;
  subject_type: SubjectType;
  composite: number;
  vote_weight_bp: number;
  is_verified: boolean;
  dimensions: {
    verification: number;
    tenure: number;
    contribution: number;
    community: number;
    chivalry: number;
  };
  computed_at: string;
}

// ── Internal Helpers ──

/** Count posts authored by a subject */
async function getPostsCount(subjectId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(eq(posts.authorId, subjectId));
  const row = result[0];
  return Number(row?.count ?? 0);
}

/** Get average score of all comments by a subject */
async function getAvgCommentScore(subjectId: string): Promise<number> {
  const result = await db
    .select({ avg: sql<number>`coalesce(avg(${comments.score}), 0)` })
    .from(comments)
    .where(eq(comments.authorId, subjectId));
  const row = result[0];
  return Number(row?.avg ?? 0);
}

/** Get vote counts received by a subject across all their posts and comments */
async function getVoteStats(subjectId: string): Promise<{
  upvotes: number;
  downvotes: number;
  totalVotesReceived: number;
}> {
  // Get IDs of all posts and comments authored by this subject
  const authoredPosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.authorId, subjectId));

  const authoredComments = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.authorId, subjectId));

  const targetIds = [
    ...authoredPosts.map((p) => p.id),
    ...authoredComments.map((c) => c.id),
  ];

  if (targetIds.length === 0) {
    return { upvotes: 0, downvotes: 0, totalVotesReceived: 0 };
  }

  // Count upvotes and downvotes on all authored content
  const result = await db
    .select({
      upvotes: sql<number>`coalesce(sum(case when ${votes.value} = 1 then 1 else 0 end), 0)`,
      downvotes: sql<number>`coalesce(sum(case when ${votes.value} = -1 then 1 else 0 end), 0)`,
      total: sql<number>`count(*)`,
    })
    .from(votes)
    .where(sql`${votes.targetId} = ANY(${targetIds})`);

  const row = result[0];
  return {
    upvotes: Number(row?.upvotes ?? 0),
    downvotes: Number(row?.downvotes ?? 0),
    totalVotesReceived: Number(row?.total ?? 0),
  };
}

/** Count upheld chivalry violations for a subject */
async function getUpheldViolations(subjectId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(chivalryViolations)
    .where(
      and(
        eq(chivalryViolations.reportedId, subjectId),
        eq(chivalryViolations.status, 'upheld'),
      ),
    );
  const row = result[0];
  return Number(row?.count ?? 0);
}

// ── Public API ──

/**
 * Calculate trust score for a user.
 * Returns the full breakdown or null if user not found.
 */
export async function calculateUserTrust(userId: string): Promise<TrustBreakdownResponse | null> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) return null;

  const [postsCount, avgCommentScore, voteStats, upheldViolations] = await Promise.all([
    getPostsCount(userId),
    getAvgCommentScore(userId),
    getVoteStats(userId),
    getUpheldViolations(userId),
  ]);

  const params: TrustScoreParams = {
    verificationLevel: (user.verificationLevel as VerificationLevel) ?? null,
    accountCreatedAt: user.createdAt,
    postsCount,
    avgCommentScore,
    upvotes: voteStats.upvotes,
    downvotes: voteStats.downvotes,
    totalVotesReceived: voteStats.totalVotesReceived,
    upheldViolations,
  };

  const result = computeTrustScore(params);
  const isVerified = user.isVerified ?? false;
  const voteWeight = computeVoteWeight(result.composite, isVerified);

  return {
    subject_id: userId,
    subject_type: 'user',
    composite: result.composite,
    vote_weight_bp: voteWeight,
    is_verified: isVerified,
    dimensions: result.dimensions,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Calculate trust score for an agent.
 * Returns the full breakdown or null if agent not found.
 */
export async function calculateAgentTrust(agentId: string): Promise<TrustBreakdownResponse | null> {
  const rows = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  const agent = rows[0];
  if (!agent) return null;

  const [postsCount, avgCommentScore, voteStats, upheldViolations] = await Promise.all([
    getPostsCount(agentId),
    getAvgCommentScore(agentId),
    getVoteStats(agentId),
    getUpheldViolations(agentId),
  ]);

  const params: TrustScoreParams = {
    // Agents use 'verified' boolean mapped to 'identity' level
    verificationLevel: agent.verified ? 'identity' : null,
    accountCreatedAt: agent.createdAt,
    postsCount,
    avgCommentScore,
    upvotes: voteStats.upvotes,
    downvotes: voteStats.downvotes,
    totalVotesReceived: voteStats.totalVotesReceived,
    upheldViolations,
  };

  const result = computeTrustScore(params);
  const isVerified = agent.verified ?? false;
  const voteWeight = computeVoteWeight(result.composite, isVerified);

  return {
    subject_id: agentId,
    subject_type: 'agent',
    composite: result.composite,
    vote_weight_bp: voteWeight,
    is_verified: isVerified,
    dimensions: result.dimensions,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Recalculate and persist trust score for a subject.
 * Returns the updated breakdown or null if subject not found.
 */
export async function refreshTrustScore(
  subjectId: string,
  subjectType: SubjectType,
): Promise<TrustBreakdownResponse | null> {
  const breakdown = subjectType === 'user'
    ? await calculateUserTrust(subjectId)
    : await calculateAgentTrust(subjectId);

  if (!breakdown) return null;

  // Persist the composite score back to the subject's record
  if (subjectType === 'user') {
    await db
      .update(users)
      .set({ trustScore: breakdown.composite })
      .where(eq(users.id, subjectId));
  } else {
    await db
      .update(agents)
      .set({ trustScore: breakdown.composite })
      .where(eq(agents.id, subjectId));
  }

  return breakdown;
}

/**
 * Look up the vote weight for a voter.
 * Tries agents first (most common in the API), then users.
 * Returns default 100bp if subject not found.
 */
export async function getVoterWeight(voterId: string, voterType: 'user' | 'agent'): Promise<number> {
  if (voterType === 'agent') {
    const rows = await db.select().from(agents).where(eq(agents.id, voterId)).limit(1);
    const agent = rows[0];
    if (!agent) return 100; // default weight
    return computeVoteWeight(agent.trustScore ?? 0, agent.verified ?? false);
  }

  const rows = await db.select().from(users).where(eq(users.id, voterId)).limit(1);
  const user = rows[0];
  if (!user) return 100;
  return computeVoteWeight(user.trustScore ?? 0, user.isVerified ?? false);
}

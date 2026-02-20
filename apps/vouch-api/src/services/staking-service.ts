// Vouch — Staking Engine
// Handles pool creation, staking, unstaking, yield distribution, and slashing.

import { eq, and, sql } from 'drizzle-orm';
import {
  db,
  vouchPools,
  stakes,
  yieldDistributions,
  yieldReceipts,
  activityFees,
  slashEvents,
  treasury,
  vouchScoreHistory,
  agents,
  users,
} from '@percival/vouch-db';

// ── Constants ──

const PLATFORM_FEE_BPS = 400; // 4%
const STAKING_FEE_BPS = 100; // 1%
const UNSTAKE_NOTICE_DAYS = 7;
const SLASH_TO_AFFECTED_BPS = 5000; // 50%
const SLASH_TO_TREASURY_BPS = 5000; // 50%

// ── Types ──

export interface StakeResult {
  stakeId: string;
  poolId: string;
  amountCents: number;
  feeCents: number;
  netStakedCents: number;
}

export interface UnstakeResult {
  stakeId: string;
  withdrawableAt: Date;
}

export interface PoolSummary {
  id: string;
  agentId: string;
  agentName: string;
  totalStakedCents: number;
  totalStakers: number;
  totalYieldPaidCents: number;
  activityFeeRateBps: number;
  status: string;
  createdAt: Date;
}

export interface YieldDistributionResult {
  distributionId: string;
  poolId: string;
  totalAmountCents: number;
  platformFeeCents: number;
  distributedAmountCents: number;
  stakerCount: number;
}

// ── Pool Management ──

/** Create a staking pool for an agent. One pool per agent. */
export async function createPool(agentId: string, activityFeeRateBps = 500): Promise<string> {
  const [pool] = await db
    .insert(vouchPools)
    .values({
      agentId,
      activityFeeRateBps: Math.min(1000, Math.max(200, activityFeeRateBps)), // clamp 2-10%
    })
    .returning({ id: vouchPools.id });

  return pool.id;
}

/** Get pool by agent ID */
export async function getPoolByAgent(agentId: string) {
  const [pool] = await db
    .select()
    .from(vouchPools)
    .where(eq(vouchPools.agentId, agentId))
    .limit(1);

  return pool ?? null;
}

/** Get pool with agent info */
export async function getPoolSummary(poolId: string): Promise<PoolSummary | null> {
  const [row] = await db
    .select({
      id: vouchPools.id,
      agentId: vouchPools.agentId,
      agentName: agents.name,
      totalStakedCents: vouchPools.totalStakedCents,
      totalStakers: vouchPools.totalStakers,
      totalYieldPaidCents: vouchPools.totalYieldPaidCents,
      activityFeeRateBps: vouchPools.activityFeeRateBps,
      status: vouchPools.status,
      createdAt: vouchPools.createdAt,
    })
    .from(vouchPools)
    .innerJoin(agents, eq(agents.id, vouchPools.agentId))
    .where(eq(vouchPools.id, poolId))
    .limit(1);

  return row ?? null;
}

/** List all active pools with agent info */
export async function listPools(page = 1, limit = 25) {
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: vouchPools.id,
      agentId: vouchPools.agentId,
      agentName: agents.name,
      totalStakedCents: vouchPools.totalStakedCents,
      totalStakers: vouchPools.totalStakers,
      totalYieldPaidCents: vouchPools.totalYieldPaidCents,
      activityFeeRateBps: vouchPools.activityFeeRateBps,
      status: vouchPools.status,
      createdAt: vouchPools.createdAt,
    })
    .from(vouchPools)
    .innerJoin(agents, eq(agents.id, vouchPools.agentId))
    .where(eq(vouchPools.status, 'active'))
    .orderBy(sql`${vouchPools.totalStakedCents} DESC`)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vouchPools)
    .where(eq(vouchPools.status, 'active'));

  return {
    data: rows,
    meta: { page, limit, total: count, has_more: offset + limit < count },
  };
}

// ── Staking ──

/** Stake funds to back an agent. Creates pool if needed. */
export async function stake(
  poolId: string,
  stakerId: string,
  stakerType: 'user' | 'agent',
  amountCents: number,
  stakerTrustScore: number,
): Promise<StakeResult> {
  const feeCents = Math.round((amountCents * STAKING_FEE_BPS) / 10000);
  const netStakedCents = amountCents - feeCents;

  const [stakeRecord] = await db
    .insert(stakes)
    .values({
      poolId,
      stakerId,
      stakerType,
      amountCents: netStakedCents,
      stakerTrustAtStake: stakerTrustScore,
    })
    .returning({ id: stakes.id });

  // Update pool totals
  await db
    .update(vouchPools)
    .set({
      totalStakedCents: sql`${vouchPools.totalStakedCents} + ${netStakedCents}`,
      totalStakers: sql`${vouchPools.totalStakers} + 1`,
    })
    .where(eq(vouchPools.id, poolId));

  // Record platform fee in treasury
  if (feeCents > 0) {
    await db.insert(treasury).values({
      amountCents: feeCents,
      sourceType: 'platform_fee',
      sourceId: stakeRecord.id,
      description: `Staking fee: ${stakerId} → pool ${poolId}`,
    });
  }

  return {
    stakeId: stakeRecord.id,
    poolId,
    amountCents,
    feeCents,
    netStakedCents,
  };
}

/** Request unstake — begins 7-day notice period */
export async function requestUnstake(stakeId: string, stakerId: string): Promise<UnstakeResult> {
  const [stakeRecord] = await db
    .select()
    .from(stakes)
    .where(and(eq(stakes.id, stakeId), eq(stakes.stakerId, stakerId), eq(stakes.status, 'active')))
    .limit(1);

  if (!stakeRecord) {
    throw new Error('Active stake not found');
  }

  const withdrawableAt = new Date(Date.now() + UNSTAKE_NOTICE_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(stakes)
    .set({
      status: 'unstaking',
      unstakeRequestedAt: new Date(),
    })
    .where(eq(stakes.id, stakeId));

  return { stakeId, withdrawableAt };
}

/** Complete withdrawal after notice period */
export async function withdraw(stakeId: string, stakerId: string): Promise<number> {
  const [stakeRecord] = await db
    .select()
    .from(stakes)
    .where(and(eq(stakes.id, stakeId), eq(stakes.stakerId, stakerId), eq(stakes.status, 'unstaking')))
    .limit(1);

  if (!stakeRecord) {
    throw new Error('Unstaking stake not found');
  }

  if (!stakeRecord.unstakeRequestedAt) {
    throw new Error('No unstake request found');
  }

  const withdrawableAt = new Date(stakeRecord.unstakeRequestedAt.getTime() + UNSTAKE_NOTICE_DAYS * 24 * 60 * 60 * 1000);
  if (new Date() < withdrawableAt) {
    throw new Error(`Cannot withdraw until ${withdrawableAt.toISOString()}`);
  }

  await db
    .update(stakes)
    .set({ status: 'withdrawn', withdrawnAt: new Date() })
    .where(eq(stakes.id, stakeId));

  // Update pool totals
  await db
    .update(vouchPools)
    .set({
      totalStakedCents: sql`${vouchPools.totalStakedCents} - ${stakeRecord.amountCents}`,
      totalStakers: sql`${vouchPools.totalStakers} - 1`,
    })
    .where(eq(vouchPools.id, stakeRecord.poolId));

  return stakeRecord.amountCents;
}

/** Get active stakes for a staker */
export async function getStakerPositions(stakerId: string, stakerType: 'user' | 'agent') {
  return db
    .select({
      stakeId: stakes.id,
      poolId: stakes.poolId,
      agentId: vouchPools.agentId,
      agentName: agents.name,
      amountCents: stakes.amountCents,
      status: stakes.status,
      stakedAt: stakes.stakedAt,
      unstakeRequestedAt: stakes.unstakeRequestedAt,
    })
    .from(stakes)
    .innerJoin(vouchPools, eq(vouchPools.id, stakes.poolId))
    .innerJoin(agents, eq(agents.id, vouchPools.agentId))
    .where(and(eq(stakes.stakerId, stakerId), eq(stakes.stakerType, stakerType)));
}

// ── Activity Fees ──

/** Record an activity fee from an agent's revenue */
export async function recordActivityFee(
  agentId: string,
  actionType: string,
  grossRevenueCents: number,
): Promise<number> {
  const pool = await getPoolByAgent(agentId);
  if (!pool) return 0;

  const feeCents = Math.round((grossRevenueCents * pool.activityFeeRateBps) / 10000);
  if (feeCents <= 0) return 0;

  await db.insert(activityFees).values({
    poolId: pool.id,
    agentId,
    actionType,
    grossRevenueCents,
    feeCents,
  });

  return feeCents;
}

// ── Yield Distribution ──

/** Distribute accumulated activity fees to stakers for a pool */
export async function distributeYield(
  poolId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<YieldDistributionResult | null> {
  // Sum undistributed activity fees for this period
  const [feeSum] = await db
    .select({ total: sql<number>`COALESCE(SUM(${activityFees.feeCents}), 0)::int` })
    .from(activityFees)
    .where(
      and(
        eq(activityFees.poolId, poolId),
        sql`${activityFees.createdAt} >= ${periodStart}`,
        sql`${activityFees.createdAt} < ${periodEnd}`,
      ),
    );

  const totalAmountCents = feeSum.total;
  if (totalAmountCents <= 0) return null;

  const platformFeeCents = Math.round((totalAmountCents * PLATFORM_FEE_BPS) / 10000);
  const distributedAmountCents = totalAmountCents - platformFeeCents;

  // Get active stakes in this pool
  const activeStakes = await db
    .select()
    .from(stakes)
    .where(and(eq(stakes.poolId, poolId), eq(stakes.status, 'active')));

  if (activeStakes.length === 0) return null;

  const totalStaked = activeStakes.reduce((sum, s) => sum + s.amountCents, 0);

  // Create distribution record
  const [dist] = await db
    .insert(yieldDistributions)
    .values({
      poolId,
      totalAmountCents,
      platformFeeCents,
      distributedAmountCents,
      periodStart,
      periodEnd,
      stakerCount: activeStakes.length,
    })
    .returning({ id: yieldDistributions.id });

  // Create per-staker receipts
  for (const s of activeStakes) {
    const proportionBps = Math.round((s.amountCents / totalStaked) * 10000);
    const amount = Math.round((distributedAmountCents * proportionBps) / 10000);

    await db.insert(yieldReceipts).values({
      distributionId: dist.id,
      stakeId: s.id,
      amountCents: amount,
      stakeProportionBps: proportionBps,
    });
  }

  // Update pool yield total
  await db
    .update(vouchPools)
    .set({
      totalYieldPaidCents: sql`${vouchPools.totalYieldPaidCents} + ${distributedAmountCents}`,
    })
    .where(eq(vouchPools.id, poolId));

  // Record platform fee in treasury
  if (platformFeeCents > 0) {
    await db.insert(treasury).values({
      amountCents: platformFeeCents,
      sourceType: 'platform_fee',
      sourceId: dist.id,
      description: `Yield distribution fee: pool ${poolId}`,
    });
  }

  return {
    distributionId: dist.id,
    poolId,
    totalAmountCents,
    platformFeeCents,
    distributedAmountCents,
    stakerCount: activeStakes.length,
  };
}

// ── Slashing ──

/** Slash a pool due to agent misconduct */
export async function slashPool(
  poolId: string,
  reason: string,
  evidenceHash: string,
  slashBps: number,
  violationId?: string,
): Promise<{ totalSlashed: number; affectedStakers: number }> {
  const pool = await getPoolSummary(poolId);
  if (!pool) throw new Error('Pool not found');

  const totalSlashedCents = Math.round((pool.totalStakedCents * slashBps) / 10000);
  const toAffectedCents = Math.round((totalSlashedCents * SLASH_TO_AFFECTED_BPS) / 10000);
  const toTreasuryCents = totalSlashedCents - toAffectedCents;

  // Record slash event
  await db.insert(slashEvents).values({
    poolId,
    reason,
    evidenceHash,
    totalSlashedCents,
    toAffectedCents,
    toTreasuryCents,
    violationId,
  });

  // Reduce each active stake proportionally
  const activeStakes = await db
    .select()
    .from(stakes)
    .where(and(eq(stakes.poolId, poolId), eq(stakes.status, 'active')));

  for (const s of activeStakes) {
    const stakeLoss = Math.round((s.amountCents * slashBps) / 10000);
    await db
      .update(stakes)
      .set({ amountCents: sql`${stakes.amountCents} - ${stakeLoss}` })
      .where(eq(stakes.id, s.id));
  }

  // Update pool totals
  await db
    .update(vouchPools)
    .set({
      totalStakedCents: sql`${vouchPools.totalStakedCents} - ${totalSlashedCents}`,
      totalSlashedCents: sql`${vouchPools.totalSlashedCents} + ${totalSlashedCents}`,
    })
    .where(eq(vouchPools.id, poolId));

  // Record treasury income
  if (toTreasuryCents > 0) {
    await db.insert(treasury).values({
      amountCents: toTreasuryCents,
      sourceType: 'slash',
      sourceId: poolId,
      description: `Slash: ${reason}`,
    });
  }

  return { totalSlashed: totalSlashedCents, affectedStakers: activeStakes.length };
}

// ── Vouch Score (Enhanced Trust Score) ──

/**
 * Compute the backing component for Vouch score.
 * Based on total backing amount + quality of stakers.
 * Returns 0-1000 range.
 */
export async function computeBackingComponent(subjectId: string, subjectType: 'user' | 'agent'): Promise<number> {
  if (subjectType === 'user') return 0; // Users don't have backing pools (yet)

  const pool = await getPoolByAgent(subjectId);
  if (!pool) return 0;

  // Amount component: log scale, caps at $50K backing
  const amountScore = Math.min(500, Math.round(100 * Math.log10(pool.totalStakedCents / 100 + 1)));

  // Staker quality: average trust score of active stakers (weighted by stake)
  const activeStakes = await db
    .select({ amountCents: stakes.amountCents, stakerTrust: stakes.stakerTrustAtStake })
    .from(stakes)
    .where(and(eq(stakes.poolId, pool.id), eq(stakes.status, 'active')));

  let qualityScore = 0;
  if (activeStakes.length > 0) {
    const totalStaked = activeStakes.reduce((sum, s) => sum + s.amountCents, 0);
    const weightedTrust = activeStakes.reduce((sum, s) => sum + s.stakerTrust * (s.amountCents / totalStaked), 0);
    qualityScore = Math.min(500, Math.round(weightedTrust / 2)); // half of avg staker trust, max 500
  }

  return Math.min(1000, amountScore + qualityScore);
}

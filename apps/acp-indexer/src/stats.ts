// Virtuals ACP Indexer — Agent stats recomputation
// Aggregates raw job/memo events into per-agent statistics.

import { db, acpJobs, acpMemos, acpAgentStats } from '@percival/vouch-db';
import { eq, or, sql } from 'drizzle-orm';
import { computeAcpTrustScore } from './scoring';

/**
 * Recompute stats for all agents affected by recent events.
 * Called after each sync batch with the set of wallet addresses
 * that appeared in new events.
 */
export async function recomputeAffectedAgents(addresses: string[]): Promise<void> {
  for (const address of addresses) {
    try {
      await recomputeAgent(address);
    } catch (err) {
      console.error(`[acp-indexer] Failed to recompute stats for ${address}:`, err);
    }
  }
}

async function recomputeAgent(address: string): Promise<void> {
  const addr = address.toLowerCase();

  // Count jobs by role
  const [clientCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(acpJobs)
    .where(eq(acpJobs.clientAddress, addr));

  const [providerCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(acpJobs)
    .where(eq(acpJobs.providerAddress, addr));

  const [evaluatorCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(acpJobs)
    .where(eq(acpJobs.evaluatorAddress, addr));

  // Completed and failed as provider
  const [completedProvider] = await db.select({ count: sql<number>`count(*)::int` })
    .from(acpJobs)
    .where(sql`${acpJobs.providerAddress} = ${addr} AND ${acpJobs.phase} = 'completed'`);

  const [failedProvider] = await db.select({ count: sql<number>`count(*)::int` })
    .from(acpJobs)
    .where(sql`${acpJobs.providerAddress} = ${addr} AND ${acpJobs.phase} IN ('cancelled', 'rejected', 'expired')`);

  // Total earned (from PayableMemoExecuted where this address was the executor)
  const [earned] = await db.select({
    total: sql<string>`coalesce(sum(${acpMemos.amountUsdc}), 0)`,
  })
    .from(acpMemos)
    .where(eq(acpMemos.senderAddress, addr));

  // Total spent (budget of jobs where this address is client)
  const [spent] = await db.select({
    total: sql<string>`coalesce(sum(${acpJobs.budgetUsdc}), 0)`,
  })
    .from(acpJobs)
    .where(sql`${acpJobs.clientAddress} = ${addr} AND ${acpJobs.phase} = 'completed'`);

  // Unique counterparties
  const [uniqueClientsResult] = await db.select({
    count: sql<number>`count(distinct ${acpJobs.clientAddress})::int`,
  })
    .from(acpJobs)
    .where(eq(acpJobs.providerAddress, addr));

  const [uniqueProvidersResult] = await db.select({
    count: sql<number>`count(distinct ${acpJobs.providerAddress})::int`,
  })
    .from(acpJobs)
    .where(eq(acpJobs.clientAddress, addr));

  // First and last seen
  const [firstSeen] = await db.select({
    earliest: sql<Date>`min(${acpJobs.createdAt})`,
  })
    .from(acpJobs)
    .where(or(
      eq(acpJobs.clientAddress, addr),
      eq(acpJobs.providerAddress, addr),
      eq(acpJobs.evaluatorAddress, addr),
    ));

  const [lastActive] = await db.select({
    latest: sql<Date>`max(${acpJobs.createdAt})`,
  })
    .from(acpJobs)
    .where(or(
      eq(acpJobs.clientAddress, addr),
      eq(acpJobs.providerAddress, addr),
      eq(acpJobs.evaluatorAddress, addr),
    ));

  const stats = {
    totalJobsClient: clientCount.count,
    totalJobsProvider: providerCount.count,
    totalJobsEvaluator: evaluatorCount.count,
    completedAsProvider: completedProvider.count,
    failedAsProvider: failedProvider.count,
    totalEarnedUsdc: earned.total,
    totalSpentUsdc: spent.total,
    uniqueClients: uniqueClientsResult.count,
    uniqueProviders: uniqueProvidersResult.count,
    firstSeenAt: firstSeen.earliest ? new Date(firstSeen.earliest) : null,
    lastActiveAt: lastActive.latest ? new Date(lastActive.latest) : null,
  };

  // Compute trust score
  const acpTrustScore = computeAcpTrustScore(stats);

  // Upsert
  await db.insert(acpAgentStats)
    .values({
      address: addr,
      ...stats,
      acpTrustScore,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: acpAgentStats.address,
      set: {
        ...stats,
        acpTrustScore,
        updatedAt: new Date(),
      },
    });
}

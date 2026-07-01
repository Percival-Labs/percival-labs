// Shared payout executor (#8 dedup).
// executeYieldPayouts, executeStakerPayouts, and executeRoyaltyPayments were three copies of
// the same NWC-pay + record-paymentEvent loop. This is the single place that:
//   - sends sats to a recipient wallet via NWC (payYield),
//   - records a settled or pending paymentEvents row,
//   - and can be retried for orphaned pending payouts (nothing retried them before).
//
// All amounts are in sats (integers). Payouts are best-effort: a failure is recorded as a
// pending paymentEvent, never silently dropped.

import { eq, and, sql } from 'drizzle-orm';
import { db, paymentEvents } from '@percival/vouch-db';

export type PayoutPurpose = 'yield' | 'agent_payout';

export interface PayoutItem {
  amountSats: number;
  poolId?: string | null;
  stakeId?: string | null;
  stakerId?: string | null;
  nwcConnectionId?: string | null;
  purpose?: PayoutPurpose;
  metadata?: Record<string, unknown>;
  /** Deterministic hash used when the payout is recorded as pending (no wallet / failure). */
  pendingHash: string;
}

export interface SettleResult {
  paid: number;
  pending: number;
  failed: number;
}

/**
 * Send a batch of payouts. Each item with an NWC connection is paid immediately; items
 * without a connection are recorded as pending for later claim. Failures are recorded as
 * pending so retryOrphanedPayouts can re-attempt them.
 */
export async function settlePayouts(items: PayoutItem[]): Promise<SettleResult> {
  let paid = 0;
  let pending = 0;
  let failed = 0;

  const { payYield } = await import('../services/nwc-service');

  for (const item of items) {
    if (item.amountSats <= 0) continue;
    const purpose = item.purpose ?? 'yield';

    if (item.nwcConnectionId) {
      try {
        const result = await payYield(item.nwcConnectionId, item.amountSats);
        await db.insert(paymentEvents).values({
          paymentHash: result.paymentHash,
          amountSats: item.amountSats,
          purpose,
          status: 'paid',
          poolId: item.poolId ?? null,
          stakeId: item.stakeId ?? null,
          stakerId: item.stakerId ?? null,
          nwcConnectionId: item.nwcConnectionId,
          webhookReceivedAt: new Date(),
          metadata: item.metadata ?? {},
        });
        paid++;
      } catch (err) {
        await db.insert(paymentEvents).values({
          paymentHash: item.pendingHash,
          amountSats: item.amountSats,
          purpose,
          status: 'pending',
          poolId: item.poolId ?? null,
          stakeId: item.stakeId ?? null,
          stakerId: item.stakerId ?? null,
          nwcConnectionId: item.nwcConnectionId,
          metadata: { ...(item.metadata ?? {}), error: err instanceof Error ? err.message : String(err) },
        });
        failed++;
      }
    } else {
      await db.insert(paymentEvents).values({
        paymentHash: item.pendingHash,
        amountSats: item.amountSats,
        purpose,
        status: 'pending',
        poolId: item.poolId ?? null,
        stakeId: item.stakeId ?? null,
        stakerId: item.stakerId ?? null,
        metadata: { ...(item.metadata ?? {}), reason: 'no_nwc_connection' },
      });
      pending++;
    }
  }

  return { paid, pending, failed };
}

/**
 * Retry orphaned pending yield payouts (#8: nothing retried them before).
 * Only rows that HAVE an NWC connection are retried — rows tagged no_nwc_connection are
 * awaiting a user claim and cannot be pushed. Called by a periodic cron.
 */
export async function retryOrphanedPayouts(limit = 100): Promise<SettleResult> {
  const orphans = await db
    .select({
      id: paymentEvents.id,
      amountSats: paymentEvents.amountSats,
      nwcConnectionId: paymentEvents.nwcConnectionId,
      metadata: paymentEvents.metadata,
    })
    .from(paymentEvents)
    .where(
      and(
        eq(paymentEvents.purpose, 'yield'),
        eq(paymentEvents.status, 'pending'),
        sql`${paymentEvents.nwcConnectionId} IS NOT NULL`,
      ),
    )
    .limit(limit);

  if (orphans.length === 0) return { paid: 0, pending: 0, failed: 0 };

  const { payYield } = await import('../services/nwc-service');
  let paid = 0;
  let failed = 0;

  for (const row of orphans) {
    if (!row.nwcConnectionId) continue;
    try {
      const result = await payYield(row.nwcConnectionId, row.amountSats);
      await db
        .update(paymentEvents)
        .set({ status: 'paid', paymentHash: result.paymentHash, webhookReceivedAt: new Date(), updatedAt: new Date() })
        .where(eq(paymentEvents.id, row.id));
      paid++;
    } catch (err) {
      await db
        .update(paymentEvents)
        .set({
          metadata: sql`COALESCE(${paymentEvents.metadata}, '{}'::jsonb) || ${JSON.stringify({ lastRetryError: err instanceof Error ? err.message : String(err) })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(paymentEvents.id, row.id));
      failed++;
    }
  }

  if (paid > 0 || failed > 0) {
    console.log(`[settle-payouts] Retried orphaned payouts: ${paid} paid, ${failed} still failing (of ${orphans.length})`);
  }
  return { paid, pending: 0, failed };
}

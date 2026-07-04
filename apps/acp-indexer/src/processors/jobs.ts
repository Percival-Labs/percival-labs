// Virtuals ACP Indexer — Job event processors
// Handles: JobCreated, JobPhaseUpdated, BudgetSet, JobPaymentTokenSet, X402PaymentReceived

import { db, acpJobs } from '@percival/vouch-db';
import { eq } from 'drizzle-orm';
import { phaseFromUint8, USDC_DECIMALS } from '../config';

interface ParsedJobEvent {
  eventName: string;
  args: Record<string, unknown>;
  blockNumber: bigint;
  transactionHash: string;
}

export async function processJobEvents(events: ParsedJobEvent[]): Promise<string[]> {
  const affectedAddresses = new Set<string>();

  for (const event of events) {
    try {
      switch (event.eventName) {
        case 'JobCreated':
          await handleJobCreated(event, affectedAddresses);
          break;
        case 'JobPhaseUpdated':
          await handleJobPhaseUpdated(event, affectedAddresses);
          break;
        case 'BudgetSet':
          await handleBudgetSet(event);
          break;
        case 'JobPaymentTokenSet':
          await handleJobPaymentTokenSet(event);
          break;
        case 'X402PaymentReceived':
          await handleX402Payment(event);
          break;
      }
    } catch (err) {
      console.error(`[acp-indexer] Error processing ${event.eventName} in tx ${event.transactionHash}:`, err);
    }
  }

  return [...affectedAddresses];
}

async function handleJobCreated(event: ParsedJobEvent, addresses: Set<string>): Promise<void> {
  const { jobId, accountId, client, provider, evaluator } = event.args as {
    jobId: bigint; accountId: bigint; client: string; provider: string; evaluator: string;
  };

  const clientAddr = client.toLowerCase();
  const providerAddr = provider.toLowerCase();
  const evaluatorAddr = evaluator?.toLowerCase() || null;
  const isZeroEvaluator = evaluatorAddr === '0x0000000000000000000000000000000000000000';

  await db.insert(acpJobs).values({
    onChainJobId: Number(jobId),
    accountId: Number(accountId),
    clientAddress: clientAddr,
    providerAddress: providerAddr,
    evaluatorAddress: isZeroEvaluator ? null : evaluatorAddr,
    phase: 'request',
    createdBlock: Number(event.blockNumber),
    createdTx: event.transactionHash,
  }).onConflictDoNothing();

  addresses.add(clientAddr);
  addresses.add(providerAddr);
  if (evaluatorAddr && !isZeroEvaluator) addresses.add(evaluatorAddr);
}

async function handleJobPhaseUpdated(event: ParsedJobEvent, addresses: Set<string>): Promise<void> {
  const { jobId, newPhase } = event.args as { jobId: bigint; oldPhase: number; newPhase: number };
  const phase = phaseFromUint8(Number(newPhase));

  const [job] = await db.select({
    clientAddress: acpJobs.clientAddress,
    providerAddress: acpJobs.providerAddress,
  })
    .from(acpJobs)
    .where(eq(acpJobs.onChainJobId, Number(jobId)))
    .limit(1);

  if (!job) return;

  const updates: Record<string, unknown> = { phase };
  if (phase === 'completed' || phase === 'rejected' || phase === 'expired') {
    updates.completedAt = new Date();
  }

  await db.update(acpJobs)
    .set(updates as any)
    .where(eq(acpJobs.onChainJobId, Number(jobId)));

  addresses.add(job.clientAddress);
  addresses.add(job.providerAddress);
}

async function handleBudgetSet(event: ParsedJobEvent): Promise<void> {
  const { jobId, newBudget } = event.args as { jobId: bigint; newBudget: bigint };
  const usdc = Number(newBudget) / 10 ** USDC_DECIMALS;

  await db.update(acpJobs)
    .set({ budgetUsdc: usdc.toFixed(6) })
    .where(eq(acpJobs.onChainJobId, Number(jobId)));
}

async function handleJobPaymentTokenSet(event: ParsedJobEvent): Promise<void> {
  const { jobId, paymentToken, newBudget } = event.args as {
    jobId: bigint; paymentToken: string; newBudget: bigint;
  };
  const usdc = Number(newBudget) / 10 ** USDC_DECIMALS;

  await db.update(acpJobs)
    .set({ paymentToken: paymentToken.toLowerCase(), budgetUsdc: usdc.toFixed(6) })
    .where(eq(acpJobs.onChainJobId, Number(jobId)));
}

async function handleX402Payment(event: ParsedJobEvent): Promise<void> {
  const { jobId } = event.args as { jobId: bigint };

  await db.update(acpJobs)
    .set({ isX402: true })
    .where(eq(acpJobs.onChainJobId, Number(jobId)));
}

// Virtuals ACP Indexer — Memo event processors
// Handles: NewMemo, MemoSigned, PayableMemoExecuted, PayableFundsRefunded

import { db, acpMemos } from '@percival/vouch-db';
import { eq, and } from 'drizzle-orm';
import { memoTypeFromUint8, USDC_DECIMALS } from '../config';

interface ParsedMemoEvent {
  eventName: string;
  args: Record<string, unknown>;
  blockNumber: bigint;
  transactionHash: string;
}

export async function processMemoEvents(events: ParsedMemoEvent[]): Promise<string[]> {
  const affectedAddresses = new Set<string>();

  for (const event of events) {
    try {
      switch (event.eventName) {
        case 'NewMemo':
          await handleNewMemo(event, affectedAddresses);
          break;
        case 'MemoSigned':
          await handleMemoSigned(event, affectedAddresses);
          break;
        case 'PayableMemoExecuted':
          await handlePayableMemoExecuted(event, affectedAddresses);
          break;
        case 'PayableFundsRefunded':
          await handlePayableFundsRefunded(event, affectedAddresses);
          break;
      }
    } catch (err) {
      console.error(`[acp-indexer] Error processing ${event.eventName} in tx ${event.transactionHash}:`, err);
    }
  }

  return [...affectedAddresses];
}

async function handleNewMemo(event: ParsedMemoEvent, addresses: Set<string>): Promise<void> {
  const { memoId, jobId, sender, memoType } = event.args as {
    memoId: bigint; jobId: bigint; sender: string; memoType: number;
    nextPhase: number; content: string;
  };

  const senderAddr = sender.toLowerCase();

  await db.insert(acpMemos).values({
    onChainMemoId: Number(memoId),
    onChainJobId: Number(jobId),
    senderAddress: senderAddr,
    memoType: memoTypeFromUint8(Number(memoType)) as any,
    blockNumber: Number(event.blockNumber),
    txHash: event.transactionHash,
  }).onConflictDoNothing();

  addresses.add(senderAddr);
}

async function handleMemoSigned(event: ParsedMemoEvent, addresses: Set<string>): Promise<void> {
  const { memoId, approver, approved, reason } = event.args as {
    memoId: bigint; approver: string; approved: boolean; reason: string;
  };

  const approverAddr = approver.toLowerCase();

  // Update the memo with approval status
  await db.update(acpMemos)
    .set({ approved, reason: reason || null })
    .where(eq(acpMemos.onChainMemoId, Number(memoId)));

  addresses.add(approverAddr);
}

async function handlePayableMemoExecuted(event: ParsedMemoEvent, addresses: Set<string>): Promise<void> {
  const { memoId, jobId, executor, amount } = event.args as {
    memoId: bigint; jobId: bigint; executor: string; amount: bigint;
  };

  const executorAddr = executor.toLowerCase();
  const usdc = Number(amount) / 10 ** USDC_DECIMALS;

  // Update memo with payment amount
  await db.update(acpMemos)
    .set({ amountUsdc: usdc.toFixed(6) })
    .where(eq(acpMemos.onChainMemoId, Number(memoId)));

  addresses.add(executorAddr);
}

async function handlePayableFundsRefunded(event: ParsedMemoEvent, addresses: Set<string>): Promise<void> {
  const { jobId, sender } = event.args as {
    memoId: bigint; jobId: bigint; sender: string; token: string; amount: bigint;
  };

  addresses.add(sender.toLowerCase());
}

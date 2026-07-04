// Virtuals ACP Indexer — Block sync engine
// Fetches ACP events from Base L2 and dispatches to processors.

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { db, acpIndexerCursor } from '@percival/vouch-db';
import { eq } from 'drizzle-orm';
import {
  JOB_MANAGER_ADDRESS,
  MEMO_MANAGER_ADDRESS,
  BASE_RPC_URL,
  BLOCKS_PER_BATCH,
  ACP_V2_DEPLOY_BLOCK,
  JOB_MANAGER_EVENTS,
  MEMO_MANAGER_EVENTS,
} from './config';
import { processJobEvents } from './processors/jobs';
import { processMemoEvents } from './processors/memos';
import { recomputeAffectedAgents } from './stats';

const CHAIN_ID = 'eip155:8453';

// ── viem client (cached) ──

let client: ReturnType<typeof createPublicClient> | null = null;

function getClient() {
  if (!client) {
    client = createPublicClient({
      chain: base,
      transport: http(BASE_RPC_URL),
    });
  }
  return client;
}

// ── Cursor management ──

async function getLastSyncedBlock(): Promise<number> {
  const [cursor] = await db.select()
    .from(acpIndexerCursor)
    .where(eq(acpIndexerCursor.chainId, CHAIN_ID))
    .limit(1);

  return cursor?.lastBlock ?? ACP_V2_DEPLOY_BLOCK;
}

async function updateCursor(blockNumber: number): Promise<void> {
  await db.insert(acpIndexerCursor)
    .values({ chainId: CHAIN_ID, lastBlock: blockNumber, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: acpIndexerCursor.chainId,
      set: { lastBlock: blockNumber, updatedAt: new Date() },
    });
}

// ── Main sync function ──

export async function syncBlockRange(cachedHead?: number): Promise<{ eventsProcessed: number; toBlock: number; caughtUp: boolean; latestBlock: number }> {
  const rpcClient = getClient();
  const lastSynced = await getLastSyncedBlock();
  const latestBlock = cachedHead ?? Number(await rpcClient.getBlockNumber());

  if (lastSynced >= latestBlock) {
    return { eventsProcessed: 0, toBlock: latestBlock, caughtUp: true, latestBlock };
  }

  const fromBlock = BigInt(lastSynced + 1);
  const toBlock = BigInt(Math.min(lastSynced + BLOCKS_PER_BATCH, latestBlock));

  // Fetch from JobManager and MemoManager sub-contracts in parallel
  const [jobLogs, memoLogs] = await Promise.all([
    rpcClient.getLogs({
      address: JOB_MANAGER_ADDRESS,
      events: JOB_MANAGER_EVENTS.filter(e => e.type === 'event') as any,
      fromBlock,
      toBlock,
    }),
    rpcClient.getLogs({
      address: MEMO_MANAGER_ADDRESS,
      events: MEMO_MANAGER_EVENTS.filter(e => e.type === 'event') as any,
      fromBlock,
      toBlock,
    }),
  ]);

  const totalLogs = jobLogs.length + memoLogs.length;
  const isCaughtUp = Number(toBlock) >= latestBlock;

  if (totalLogs === 0) {
    await updateCursor(Number(toBlock));
    return { eventsProcessed: 0, toBlock: Number(toBlock), caughtUp: isCaughtUp, latestBlock };
  }

  // Process events — jobs first (memos reference jobs)
  const affectedAddresses = new Set<string>();

  if (jobLogs.length > 0) {
    const addresses = await processJobEvents(jobLogs as any);
    addresses.forEach(a => affectedAddresses.add(a));
  }

  if (memoLogs.length > 0) {
    const addresses = await processMemoEvents(memoLogs as any);
    addresses.forEach(a => affectedAddresses.add(a));
  }

  // Recompute trust scores for affected agents
  if (affectedAddresses.size > 0) {
    await recomputeAffectedAgents([...affectedAddresses]);
  }

  await updateCursor(Number(toBlock));

  console.log(`[acp-indexer] Synced blocks ${fromBlock}-${toBlock}: ${totalLogs} events (${jobLogs.length} jobs, ${memoLogs.length} memos), ${affectedAddresses.size} agents updated`);

  return { eventsProcessed: totalLogs, toBlock: Number(toBlock), caughtUp: isCaughtUp, latestBlock };
}

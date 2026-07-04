// Virtuals ACP Indexer — Entry point
// Polls Base L2 for ACP contract events, processes them into the Vouch database.

import { syncBlockRange } from './sync';
import { SYNC_INTERVAL_MS, BLOCKS_PER_BATCH } from './config';

let isRunning = false;

async function runSyncCycle(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    let totalEvents = 0;
    let batches = 0;
    let headBlock: number | undefined;

    // During backfill: run up to 5000 batches per cycle with no sleep between them.
    // Once caught up: process whatever's new and wait for next interval.
    const MAX_BATCHES_PER_CYCLE = 5000;

    while (batches < MAX_BATCHES_PER_CYCLE) {
      const result = await syncBlockRange(headBlock);
      totalEvents += result.eventsProcessed;
      headBlock = result.latestBlock; // cache head block for rest of cycle
      batches++;

      if (result.caughtUp) break;

      // Log progress every 100 batches during backfill
      if (batches % 100 === 0) {
        const behind = result.latestBlock - result.toBlock;
        console.log(`[acp-indexer] Backfill progress: ${batches} batches, block ${result.toBlock}, ~${behind.toLocaleString()} blocks behind`);
      }
    }

    if (totalEvents > 0) {
      console.log(`[acp-indexer] Cycle complete: ${totalEvents} events across ${batches} batches`);
    } else if (batches > 1) {
      console.log(`[acp-indexer] Backfill cycle: ${batches} batches (no events yet)`);
    }
  } catch (err) {
    console.error('[acp-indexer] Sync cycle error:', err);
  } finally {
    isRunning = false;
  }
}

// ── Bootstrap ──

console.log('[acp-indexer] Starting Virtuals ACP on-chain indexer...');
console.log(`[acp-indexer] Batch size: ${BLOCKS_PER_BATCH} blocks, poll interval: ${SYNC_INTERVAL_MS / 1000}s`);

// Run first sync immediately
runSyncCycle();

// Then on interval
setInterval(runSyncCycle, SYNC_INTERVAL_MS);

/**
 * Stateful scanner — the core fix for "every scan returns full history."
 *
 * Previous behavior: query all events, dump them all, no concept of "new."
 * New behavior: use cursor to only query events since last scan, filter out
 * already-seen IDs, return only genuinely new events.
 */

import type {
  PlatformAdapter,
  PlatformEvent,
  ScanOptions,
  ScanResult,
} from '../types.js';
import type { StateStore } from './state-store.js';
import { now } from './timestamps.js';

export interface ScanConfig {
  adapter: PlatformAdapter;
  stateStore: StateStore;
}

/**
 * Run a stateful scan: query platform for events since last cursor,
 * filter out already-seen events, update state, return only new events.
 */
export async function statefulScan(
  config: ScanConfig,
  opts?: Partial<ScanOptions>,
): Promise<ScanResult> {
  const { adapter, stateStore } = config;
  const platform = adapter.platform;

  // Get cursor from state store (or use provided since)
  const cursor = opts?.since ?? stateStore.getCursor(platform);

  // Query platform with cursor
  const result = await adapter.scan({
    ...opts,
    since: cursor,
  });

  // Filter out already-seen events
  const newEvents: PlatformEvent[] = [];
  for (const event of result.events) {
    if (!stateStore.hasSeen(event.id)) {
      newEvents.push(event);
      stateStore.recordSeen(event.id);
    }
  }

  // Update cursor to latest event timestamp
  if (result.cursor) {
    stateStore.setCursor(platform, result.cursor);
  }

  // Save state
  stateStore.save();

  return {
    events: newEvents,
    cursor: result.cursor,
    meta: {
      total: result.events.length,
      new: newEvents.length,
      scannedAt: now(),
    },
  };
}

/**
 * File-backed engagement state.
 *
 * Single JSON file tracks: cursors, content hashes, seen event IDs,
 * relay health, and engagement log. Replaces scattered engagement-log.json
 * and hardcoded event ID lists.
 *
 * Previous problems this solves:
 * - No "since last check" cursor → cursors per platform
 * - No dedup → seenEventIds set
 * - No relay health tracking → relayHealth with cooldown
 * - Separate engagement-log.json → unified engagementLog
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { now } from './timestamps.js';
import type {
  EngagementState,
  EngagementEntry,
  RelayHealthState,
} from '../types.js';

function createEmptyState(): EngagementState {
  return {
    version: 2,
    cursors: {},
    publishedHashes: [],
    seenEventIds: [],
    relayHealth: {},
    engagementLog: [],
    updatedAt: new Date(0).toISOString(),
  };
}

/** Default cooldown after consecutive failures (30 minutes) */
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;
/** Consecutive failures before cooldown kicks in */
const FAILURE_THRESHOLD = 3;
/** Max age for seen event IDs before pruning (30 days in ms) */
const PRUNE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Max entries before pruning triggers */
const MAX_SEEN_EVENTS = 10_000;
const MAX_PUBLISHED_HASHES = 5_000;

export class StateStore {
  private state: EngagementState;
  private dirty = false;

  constructor(private readonly filePath: string) {
    this.state = this.load();
  }

  // ── Persistence ────────────────────────────────────────────────

  private load(): EngagementState {
    if (!existsSync(this.filePath)) {
      return { ...createEmptyState(), updatedAt: now() };
    }
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as EngagementState;
      // Ensure all fields exist (forward compat)
      return {
        ...createEmptyState(),
        ...parsed,
        version: 2,
      };
    } catch {
      return { ...createEmptyState(), updatedAt: now() };
    }
  }

  save(): void {
    if (!this.dirty) return;
    this.state.updatedAt = now();
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    this.dirty = false;
  }

  /** Force save regardless of dirty flag */
  forceSave(): void {
    this.dirty = true;
    this.save();
  }

  // ── Cursors ────────────────────────────────────────────────────

  getCursor(platform: string): string | undefined {
    return this.state.cursors[platform];
  }

  setCursor(platform: string, cursor: string): void {
    this.state.cursors[platform] = cursor;
    this.dirty = true;
  }

  // ── Content Hash Dedup ─────────────────────────────────────────

  hasPublished(hash: string): boolean {
    return this.state.publishedHashes.includes(hash);
  }

  recordPublish(hash: string): void {
    if (!this.state.publishedHashes.includes(hash)) {
      this.state.publishedHashes.push(hash);
      this.dirty = true;
    }
  }

  // ── Seen Event IDs ─────────────────────────────────────────────

  hasSeen(eventId: string): boolean {
    return this.state.seenEventIds.includes(eventId);
  }

  recordSeen(eventId: string): void {
    if (!this.state.seenEventIds.includes(eventId)) {
      this.state.seenEventIds.push(eventId);
      this.dirty = true;
    }
  }

  /** Mark multiple events as seen */
  recordSeenBatch(eventIds: string[]): void {
    for (const id of eventIds) {
      this.recordSeen(id);
    }
  }

  // ── Engagement Log ─────────────────────────────────────────────

  recordEngagement(entry: EngagementEntry): void {
    this.state.engagementLog.push(entry);
    this.dirty = true;
  }

  getEngagementLog(): readonly EngagementEntry[] {
    return this.state.engagementLog;
  }

  /** Get all event IDs we've published (for cross-referencing replies) */
  getOurEventIds(): string[] {
    return this.state.engagementLog
      .filter((e) => e.ourEventId)
      .map((e) => e.ourEventId!);
  }

  // ── Relay Health ───────────────────────────────────────────────

  recordRelayResult(url: string, success: boolean): void {
    const entry = this.state.relayHealth[url] ?? {
      url,
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
    };

    if (success) {
      entry.successCount++;
      entry.consecutiveFailures = 0;
      entry.lastSuccess = now();
      // Clear cooldown on success
      delete entry.cooldownUntil;
    } else {
      entry.failureCount++;
      entry.consecutiveFailures++;
      entry.lastFailure = now();

      // Apply cooldown after threshold
      if (entry.consecutiveFailures >= FAILURE_THRESHOLD) {
        entry.cooldownUntil = new Date(
          Date.now() + DEFAULT_COOLDOWN_MS,
        ).toISOString();
      }
    }

    this.state.relayHealth[url] = entry;
    this.dirty = true;
  }

  /** Returns relays not currently in cooldown */
  getHealthyRelays(relays: string[]): string[] {
    const currentTime = now();
    return relays.filter((url) => {
      const entry = this.state.relayHealth[url];
      if (!entry?.cooldownUntil) return true;
      // Cooldown expired?
      return entry.cooldownUntil <= currentTime;
    });
  }

  getRelayHealth(): Record<string, RelayHealthState> {
    return { ...this.state.relayHealth };
  }

  // ── Pruning ────────────────────────────────────────────────────

  /**
   * Prune old entries to keep state file manageable.
   * Keeps engagement log intact — only prunes dedup caches.
   */
  prune(): { prunedEvents: number; prunedHashes: number } {
    let prunedEvents = 0;
    let prunedHashes = 0;

    if (this.state.seenEventIds.length > MAX_SEEN_EVENTS) {
      const excess = this.state.seenEventIds.length - MAX_SEEN_EVENTS;
      this.state.seenEventIds = this.state.seenEventIds.slice(excess);
      prunedEvents = excess;
      this.dirty = true;
    }

    if (this.state.publishedHashes.length > MAX_PUBLISHED_HASHES) {
      const excess =
        this.state.publishedHashes.length - MAX_PUBLISHED_HASHES;
      this.state.publishedHashes = this.state.publishedHashes.slice(excess);
      prunedHashes = excess;
      this.dirty = true;
    }

    return { prunedEvents, prunedHashes };
  }

  // ── Migration ──────────────────────────────────────────────────

  /**
   * Import existing engagement-log.json from old Clawstr scripts.
   * Extracts event IDs and populates seenEventIds + engagementLog.
   */
  importLegacyLog(
    legacyLog: {
      entries: Array<{
        ourEventId?: string;
        label?: string;
        action?: string;
        timestamp?: string;
        subclaw?: string;
      }>;
    },
    manualEventIds?: Array<{ id: string; label: string }>,
  ): { imported: number } {
    let imported = 0;

    // Import manual event IDs (the hardcoded list from check-all-replies.ts)
    if (manualEventIds) {
      for (const ev of manualEventIds) {
        this.recordSeen(ev.id);
        imported++;
      }
    }

    // Import engagement log entries
    for (const entry of legacyLog.entries) {
      if (entry.ourEventId) {
        this.recordSeen(entry.ourEventId);
        imported++;
      }

      this.recordEngagement({
        timestamp: entry.timestamp ?? now(),
        platform: 'nostr',
        action: (entry.action as EngagementEntry['action']) ?? 'reply',
        ourEventId: entry.ourEventId,
        contentPreview: entry.label,
        channel: entry.subclaw,
      });
    }

    this.dirty = true;
    return { imported };
  }

  // ── Debug ──────────────────────────────────────────────────────

  getState(): Readonly<EngagementState> {
    return this.state;
  }

  getSummary(): {
    seenEvents: number;
    publishedHashes: number;
    engagementEntries: number;
    trackedRelays: number;
    cursors: Record<string, string>;
  } {
    return {
      seenEvents: this.state.seenEventIds.length,
      publishedHashes: this.state.publishedHashes.length,
      engagementEntries: this.state.engagementLog.length,
      trackedRelays: Object.keys(this.state.relayHealth).length,
      cursors: { ...this.state.cursors },
    };
  }
}

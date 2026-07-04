/**
 * NostrAdapter — PlatformAdapter implementation for Nostr / Clawstr.
 *
 * Wraps RelayPool, crypto, and event-builder into the unified interface
 * consumed by statefulScan() and idempotentPublish().
 */

import type {
  PlatformAdapter,
  PlatformEvent,
  ScanOptions,
  ScanResult,
  PublishOptions,
  PublishResult,
  HealthReport,
  EndpointHealth,
  NostrFilter,
  UnsignedNostrEvent,
} from '../../types.js';
import { fromUnixSeconds, toUnixSeconds, now } from '../../core/timestamps.js';
import { contentHash } from '../../core/content-hash.js';
import { StateStore } from '../../core/state-store.js';
import { RelayPool } from './relay-pool.js';
import { identityFromNsec, signEvent } from './crypto.js';
import { buildPostTags, buildReplyTags } from './event-builder.js';
import type { NostrIdentity } from './crypto.js';

// ── Config ─────────────────────────────────────────────────────────

export interface NostrConfig {
  relays: string[];
  nsec: string;
  /** Client tag value, defaults to 'agent-social/0.1.0' */
  clientTag?: string;
  /** Path to state file. Defaults to './agent-social-state.json' */
  statePath?: string;
}

// ── Kind constant ──────────────────────────────────────────────────

const KIND_COMMENT = 1111;

// ── Adapter ────────────────────────────────────────────────────────

export class NostrAdapter implements PlatformAdapter {
  readonly platform = 'nostr' as const;

  private readonly identity: NostrIdentity;
  private readonly pool: RelayPool;
  private readonly stateStore: StateStore;
  private readonly clientTag: string;
  private readonly relays: string[];

  constructor(config: NostrConfig) {
    this.identity = identityFromNsec(config.nsec);
    this.relays = config.relays;
    this.clientTag = config.clientTag ?? 'agent-social/0.1.0';
    this.stateStore = new StateStore(
      config.statePath ?? './agent-social-state.json',
    );
    this.pool = new RelayPool(config.relays, this.stateStore);
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async connect(): Promise<void> {
    await this.pool.connect();
  }

  async disconnect(): Promise<void> {
    this.stateStore.save();
    await this.pool.disconnect();
  }

  // ── Scan ─────────────────────────────────────────────────────────

  async scan(opts: ScanOptions): Promise<ScanResult> {
    const filter: NostrFilter = {
      kinds: [KIND_COMMENT],
      limit: opts.limit ?? 100,
    };

    // Convert ISO 8601 cursor to Nostr unix seconds filter
    if (opts.since) {
      // +1 to exclude events at the cursor timestamp (already seen)
      filter.since = toUnixSeconds(opts.since) + 1;
    }

    // identifiers = pubkeys to scope the scan
    if (opts.identifiers?.length) {
      filter.authors = opts.identifiers;
    }

    const rawEvents = await this.pool.query(filter);

    // Sort by created_at ascending (oldest first)
    rawEvents.sort((a, b) => a.created_at - b.created_at);

    // Convert to PlatformEvent[]
    const events: PlatformEvent[] = rawEvents.map((ev) => ({
      id: ev.id,
      platform: 'nostr' as const,
      author: ev.pubkey,
      content: ev.content,
      timestamp: fromUnixSeconds(ev.created_at),
      channel: extractChannel(ev.tags),
      replyTo: extractReplyTarget(ev.tags),
      raw: ev,
    }));

    // Cursor = ISO 8601 of latest event timestamp
    let cursor: string;
    if (rawEvents.length > 0) {
      const latestTs = rawEvents[rawEvents.length - 1].created_at;
      cursor = fromUnixSeconds(latestTs);
    } else {
      cursor = opts.since ?? now();
    }

    return {
      events,
      cursor,
      meta: {
        total: events.length,
        new: events.length, // Dedup happens in statefulScan, not here
        scannedAt: now(),
      },
    };
  }

  // ── Publish ──────────────────────────────────────────────────────

  async publish(opts: PublishOptions): Promise<PublishResult> {
    const tags = opts.replyTo && opts.parentAuthor
      ? buildReplyTags(
          opts.channel ?? 'general',
          opts.replyTo,
          opts.parentAuthor,
          this.clientTag,
        )
      : buildPostTags(opts.channel ?? 'general', this.clientTag);

    const unsigned: UnsignedNostrEvent = {
      pubkey: this.identity.pubkeyHex,
      created_at: Math.floor(Date.now() / 1000),
      kind: KIND_COMMENT,
      tags,
      content: opts.content,
    };

    const signed = await signEvent(unsigned, this.identity.secretKeyHex);

    const relayResults = await this.pool.publish(signed);

    const hash = await contentHash(opts.content);

    return {
      id: signed.id,
      contentHash: hash,
      publishedAt: fromUnixSeconds(signed.created_at),
      relayResults,
      verified: relayResults.some((r) => r.ok),
      deduplicated: false,
    };
  }

  // ── Health ───────────────────────────────────────────────────────

  async healthCheck(): Promise<HealthReport> {
    const healthData = this.stateStore.getRelayHealth();
    const healthyRelays = this.stateStore.getHealthyRelays(this.relays);

    const endpoints: EndpointHealth[] = this.relays.map((url) => {
      const entry = healthData[url];
      const isHealthy = healthyRelays.includes(url);
      const total = entry
        ? entry.successCount + entry.failureCount
        : 0;
      const successRate = total > 0
        ? entry!.successCount / total
        : 0;

      let status: EndpointHealth['status'];
      if (entry?.cooldownUntil && !isHealthy) {
        status = 'cooldown';
      } else if (entry && entry.successCount > 0) {
        status = 'up';
      } else {
        status = 'down';
      }

      return {
        url,
        status,
        successRate,
        lastSuccess: entry?.lastSuccess,
        lastFailure: entry?.lastFailure,
        cooldownUntil: entry?.cooldownUntil,
      };
    });

    const upCount = endpoints.filter((e) => e.status === 'up').length;
    let overallStatus: HealthReport['status'];
    if (upCount === this.relays.length) {
      overallStatus = 'healthy';
    } else if (upCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'down';
    }

    return {
      platform: 'nostr',
      status: overallStatus,
      endpoints,
      checkedAt: now(),
    };
  }

  // ── Accessors ────────────────────────────────────────────────────

  get pubkey(): string {
    return this.identity.pubkeyHex;
  }
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Extract the subclaw channel from event tags.
 * Looks for the `l` tag under the `social.clawstr` namespace.
 */
function extractChannel(tags: string[][]): string | undefined {
  for (const tag of tags) {
    if (tag[0] === 'l' && tag[2] === 'social.clawstr') {
      return tag[1];
    }
  }
  return undefined;
}

/**
 * Extract the reply target event ID from tags.
 * Looks for an `e` tag with 'reply' marker.
 */
function extractReplyTarget(tags: string[][]): string | undefined {
  for (const tag of tags) {
    if (tag[0] === 'e' && tag[3] === 'reply') {
      return tag[1];
    }
  }
  // Fallback: any e tag
  for (const tag of tags) {
    if (tag[0] === 'e') {
      return tag[1];
    }
  }
  return undefined;
}

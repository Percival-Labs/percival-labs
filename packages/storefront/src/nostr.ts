// Nostr relay connection and subscription helpers for storefront listings
//
// Uses nostr-tools SimplePool for multi-relay management.
// SimplePool handles deduplication, reconnections, and EOSE aggregation.

import { SimplePool, type Filter } from 'nostr-tools';
import type { Nip99Event } from './nip99.js';
import { NIP99_KIND } from './nip99.js';

// ── Subscription Handle ──

export interface RelaySubscription {
  unsub: () => void;
}

// ── Subscribe to Storefront Listings ──

export async function subscribeToStorefront(
  relayUrls: string[],
  creatorPubkey: string,
  onEvent: (event: Nip99Event) => void,
  onEose?: () => void,
): Promise<RelaySubscription> {
  const pool = new SimplePool();

  const filter: Filter = {
    kinds: [NIP99_KIND],
    authors: [creatorPubkey],
  };

  const sub = pool.subscribeMany(relayUrls, filter, {
    onevent(event) {
      onEvent(event as unknown as Nip99Event);
    },
    oneose() {
      onEose?.();
    },
  });

  return {
    unsub: () => {
      sub.close();
      pool.close(relayUrls);
    },
  };
}

// ── Fetch Listings (one-shot query) ──

export async function fetchStorefrontListings(
  relayUrls: string[],
  creatorPubkey: string,
  opts?: { limit?: number; since?: number; until?: number },
): Promise<Nip99Event[]> {
  const pool = new SimplePool();

  const filter: Filter = {
    kinds: [NIP99_KIND],
    authors: [creatorPubkey],
    ...(opts?.limit !== undefined && { limit: opts.limit }),
    ...(opts?.since !== undefined && { since: opts.since }),
    ...(opts?.until !== undefined && { until: opts.until }),
  };

  try {
    const events = await pool.querySync(relayUrls, filter);
    return events as unknown as Nip99Event[];
  } finally {
    pool.close(relayUrls);
  }
}

// ── Fetch Single Listing by d-tag ──

export async function fetchListingBySlug(
  relayUrls: string[],
  creatorPubkey: string,
  slug: string,
): Promise<Nip99Event | undefined> {
  const pool = new SimplePool();

  const filter: Filter = {
    kinds: [NIP99_KIND],
    authors: [creatorPubkey],
    // NIP-01 addressable event filter: #d tag
    '#d': [slug],
    limit: 1,
  };

  try {
    const events = await pool.querySync(relayUrls, filter);
    return events[0] as unknown as Nip99Event | undefined;
  } finally {
    pool.close(relayUrls);
  }
}

// ── Publish to Relays ──

export async function publishToRelays(
  relayUrls: string[],
  signedEvent: Nip99Event & { id: string; sig: string },
): Promise<void> {
  const pool = new SimplePool();

  try {
    const publishPromises = pool.publish(relayUrls, signedEvent as Parameters<typeof pool.publish>[1]);

    const results = await Promise.allSettled(publishPromises);

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length === relayUrls.length) {
      throw new Error(
        `Failed to publish to all ${relayUrls.length} relays. First error: ${
          (failures[0] as PromiseRejectedResult).reason
        }`,
      );
    }
  } finally {
    pool.close(relayUrls);
  }
}

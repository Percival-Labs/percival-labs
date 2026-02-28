#!/usr/bin/env bun
/**
 * Nostr Relay Query — Check events by pubkey or search term
 *
 * Usage:
 *   bun run scripts/nostr-query.ts <npub-or-hex>           # all events from pubkey
 *   bun run scripts/nostr-query.ts <npub-or-hex> --profile  # just profile
 *   bun run scripts/nostr-query.ts <npub-or-hex> --notes    # just text notes
 *   bun run scripts/nostr-query.ts <npub-or-hex> --count    # count only
 */

import { npubToHex } from '../packages/vouch-sdk/src/nostr-identity.js';

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

const TIMEOUT_MS = 8_000;

// ── Parse Args ──

const input = process.argv[2];
if (!input) {
  console.error('Usage: bun run scripts/nostr-query.ts <npub-or-hex> [--profile|--notes|--count]');
  process.exit(1);
}

const flags = new Set(process.argv.slice(3));
const profileOnly = flags.has('--profile');
const notesOnly = flags.has('--notes');
const countOnly = flags.has('--count');

// Convert npub to hex if needed
let pubkeyHex: string;
if (input.startsWith('npub1')) {
  try {
    pubkeyHex = npubToHex(input);
  } catch (err) {
    console.error(`Invalid npub: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
} else if (/^[0-9a-f]{64}$/.test(input)) {
  pubkeyHex = input;
} else {
  console.error('Input must be an npub (npub1...) or 64-char hex pubkey');
  process.exit(1);
}

console.log(`Querying pubkey: ${pubkeyHex.slice(0, 16)}...`);
console.log(`Relays: ${RELAYS.join(', ')}\n`);

// ── Build filter ──

interface NostrFilter {
  authors: string[];
  kinds?: number[];
  limit: number;
}

const filter: NostrFilter = {
  authors: [pubkeyHex],
  limit: 50,
};

if (profileOnly) {
  filter.kinds = [0]; // metadata
} else if (notesOnly) {
  filter.kinds = [1]; // text notes
}

// ── Query relays ──

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

const allEvents = new Map<string, NostrEvent>();

async function queryRelay(relayUrl: string): Promise<NostrEvent[]> {
  return new Promise((resolve) => {
    const events: NostrEvent[] = [];
    const subId = `q-${Date.now().toString(36)}`;

    const timeout = setTimeout(() => {
      ws.close();
      resolve(events);
    }, TIMEOUT_MS);

    const ws = new WebSocket(relayUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify(['REQ', subId, filter]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data));
        if (data[0] === 'EVENT' && data[1] === subId) {
          events.push(data[2] as NostrEvent);
        } else if (data[0] === 'EOSE') {
          clearTimeout(timeout);
          ws.close();
          resolve(events);
        }
      } catch { /* skip */ }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      resolve(events);
    };
  });
}

// Query all relays in parallel
const results = await Promise.all(RELAYS.map(async (relay) => {
  try {
    const events = await queryRelay(relay);
    return { relay, events, ok: true };
  } catch {
    return { relay, events: [] as NostrEvent[], ok: false };
  }
}));

// Deduplicate by event ID
for (const result of results) {
  console.log(`  ${result.ok ? '✓' : '✗'} ${result.relay}: ${result.events.length} events`);
  for (const event of result.events) {
    allEvents.set(event.id, event);
  }
}

const events = Array.from(allEvents.values()).sort((a, b) => b.created_at - a.created_at);

console.log(`\n  Total unique events: ${events.length}\n`);

if (countOnly || events.length === 0) {
  process.exit(events.length === 0 ? 1 : 0);
}

// ── Display events ──

const KIND_NAMES: Record<number, string> = {
  0: 'PROFILE',
  1: 'NOTE',
  3: 'CONTACTS',
  5: 'DELETE',
  7: 'REACTION',
  27235: 'NIP-98 AUTH',
  30382: 'NIP-85 TRUST',
};

for (const event of events) {
  const kindName = KIND_NAMES[event.kind] || `kind:${event.kind}`;
  const time = new Date(event.created_at * 1000).toISOString();
  const id = event.id.slice(0, 12);

  console.log(`── ${kindName} ── ${time} ── ${id}...`);

  if (event.kind === 0) {
    // Profile metadata
    try {
      const profile = JSON.parse(event.content);
      console.log(`  Name: ${profile.name || '(none)'}`);
      console.log(`  About: ${profile.about || '(none)'}`);
      if (profile.nip05) console.log(`  NIP-05: ${profile.nip05}`);
      if (profile.picture) console.log(`  Picture: ${profile.picture}`);
      if (profile.bot !== undefined) console.log(`  Bot: ${profile.bot}`);
    } catch {
      console.log(`  (invalid JSON profile)`);
    }
  } else if (event.kind === 1) {
    // Text note — show content with line limit
    const lines = event.content.split('\n');
    const preview = lines.slice(0, 8).join('\n');
    console.log(preview);
    if (lines.length > 8) console.log(`  ... (${lines.length - 8} more lines)`);

    // Show subclaw tag if present
    const rTag = event.tags.find(t => t[0] === 'r' && t[1]?.includes('clawstr'));
    if (rTag) console.log(`  Subclaw: ${rTag[1]}`);
  } else {
    // Other kinds — show first 200 chars
    const preview = event.content.slice(0, 200);
    if (preview) console.log(`  ${preview}${event.content.length > 200 ? '...' : ''}`);
  }

  console.log('');
}

/**
 * Shared Clawstr / Nostr utilities
 *
 * Centralizes relay config, event signing, publishing, and querying
 * so individual scripts stay lean.
 */

import {
  identityFromNsec,
  signEvent,
  type UnsignedEvent,
  type NostrEvent,
} from '../../packages/vouch-sdk/src/nostr-identity.js';

// ── Config ──────────────────────────────────────────────────────────

export const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.ditto.pub',
  'wss://relay.primal.net',
];

export const OUR_PUBKEY_HEX =
  '3f5f2d0f443e910d57abb5e10953b51da9f65996e757741462b397b728bf7480';

export const VOUCH_PROFILE = {
  name: 'Percival Labs Vouch',
  about:
    'The trust layer for the agent internet. Nostr-native identity, Lightning staking, verifiable reputation. Know Your Agent — without the centralization. Built by Percival Labs. https://percival-labs.ai',
  picture: 'https://percival-labs.ai/vouch-avatar.png',
  website: 'https://percival-labs.ai',
  nip05: 'vouch@percival-labs.ai',
  bot: true,
};

export const CLIENT_TAG = 'vouch-clawstr/0.1.0';

// ── Types ───────────────────────────────────────────────────────────

export interface NostrEventData {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

export interface RelayResult {
  relay: string;
  ok: boolean;
  msg?: string;
}

// ── Identity ────────────────────────────────────────────────────────

export function getIdentity() {
  const nsec = process.env.VOUCH_NSEC;
  if (!nsec) {
    console.error('Set VOUCH_NSEC environment variable');
    process.exit(1);
  }
  return identityFromNsec(nsec);
}

// ── Event Building ──────────────────────────────────────────────────

/** Standard tags for a top-level Clawstr post */
export function subclawTags(subclaw: string): string[][] {
  const url = `https://clawstr.com/c/${subclaw}`;
  return [
    ['I', url],
    ['K', 'web'],
    ['i', url],
    ['k', 'web'],
    ['L', 'agent'],
    ['l', 'ai', 'agent'],
    ['client', CLIENT_TAG],
  ];
}

/** Tags for a reply to a specific event in a subclaw */
export function replyTags(
  subclaw: string,
  targetEventId: string,
  targetPubkey: string,
): string[][] {
  const url = `https://clawstr.com/c/${subclaw}`;
  return [
    ['I', url],
    ['K', 'web'],
    ['e', targetEventId, '', 'reply'],
    ['p', targetPubkey],
    ['k', '1111'],
    ['L', 'agent'],
    ['l', 'ai', 'agent'],
    ['client', CLIENT_TAG],
  ];
}

// ── Publishing ──────────────────────────────────────────────────────

export async function publishEvent(unsigned: UnsignedEvent): Promise<{
  event: NostrEvent;
  results: RelayResult[];
}> {
  const identity = getIdentity();
  const signed = await signEvent(unsigned, identity.secretKeyHex);
  const results = await publishToRelays(signed);
  return { event: signed, results };
}

export async function publishPost(
  subclaw: string,
  content: string,
): Promise<{ event: NostrEvent; results: RelayResult[] }> {
  const identity = getIdentity();
  return publishEvent({
    pubkey: identity.pubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    kind: 1111,
    tags: subclawTags(subclaw),
    content,
  });
}

export async function publishReply(
  subclaw: string,
  targetEventId: string,
  targetPubkey: string,
  content: string,
): Promise<{ event: NostrEvent; results: RelayResult[] }> {
  const identity = getIdentity();
  return publishEvent({
    pubkey: identity.pubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    kind: 1111,
    tags: replyTags(subclaw, targetEventId, targetPubkey),
    content,
  });
}

export async function publishProfile(): Promise<RelayResult[]> {
  const identity = getIdentity();
  const { results } = await publishEvent({
    pubkey: identity.pubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    kind: 0,
    tags: [],
    content: JSON.stringify(VOUCH_PROFILE),
  });
  return results;
}

/** Follow a list of pubkeys (kind 3 contact list) */
export async function publishFollowList(
  pubkeys: string[],
): Promise<RelayResult[]> {
  const identity = getIdentity();
  const tags = pubkeys.map((pk) => ['p', pk]);
  const { results } = await publishEvent({
    pubkey: identity.pubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    kind: 3,
    tags,
    content: '',
  });
  return results;
}

// ── Querying ────────────────────────────────────────────────────────

export async function queryRelays(
  filter: Record<string, unknown>,
  relays: string[] = RELAYS,
): Promise<NostrEventData[]> {
  const allEvents = new Map<string, NostrEventData>();
  const results = await Promise.allSettled(
    relays.map((relay) => queryRelay(relay, filter)),
  );
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const event of result.value) {
        allEvents.set(event.id, event);
      }
    }
  }
  return Array.from(allEvents.values());
}

export async function queryRelay(
  relayUrl: string,
  filter: Record<string, unknown>,
): Promise<NostrEventData[]> {
  return new Promise((resolve) => {
    const events: NostrEventData[] = [];
    const subId = 'q' + Math.random().toString(36).slice(2, 8);
    const timeout = setTimeout(() => {
      ws.close();
      resolve(events);
    }, 10000);

    const ws = new WebSocket(relayUrl);
    ws.onopen = () => ws.send(JSON.stringify(['REQ', subId, filter]));
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data));
        if (data[0] === 'EVENT' && data[1] === subId)
          events.push(data[2] as NostrEventData);
        else if (data[0] === 'EOSE') {
          clearTimeout(timeout);
          ws.close();
          resolve(events);
        }
      } catch {
        /* skip */
      }
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      resolve(events);
    };
  });
}

// ── Relay Publishing Internals ──────────────────────────────────────

async function publishToRelays(event: NostrEvent): Promise<RelayResult[]> {
  return Promise.all(RELAYS.map((relay) => publishToRelay(relay, event)));
}

async function publishToRelay(
  relayUrl: string,
  event: NostrEvent,
): Promise<RelayResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ relay: relayUrl, ok: false, msg: 'timeout' });
    }, 8000);

    const ws = new WebSocket(relayUrl);
    ws.onopen = () => ws.send(JSON.stringify(['EVENT', event]));
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data));
        if (data[0] === 'OK') {
          clearTimeout(timeout);
          ws.close();
          resolve({ relay: relayUrl, ok: data[2] === true, msg: data[3] });
        }
      } catch {
        /* skip */
      }
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      resolve({ relay: relayUrl, ok: false, msg: 'error' });
    };
  });
}

// ── Utilities ───────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isOurs(event: NostrEventData): boolean {
  return event.pubkey === OUR_PUBKEY_HEX;
}

export function getSubclaw(event: NostrEventData): string {
  const tag = event.tags?.find((t) => t[0] === 'I');
  return tag?.[1]?.split('/c/')?.[1] || '?';
}

export function formatAge(createdAt: number): string {
  const diff = Math.floor(Date.now() / 1000) - createdAt;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Log a relay publish result */
export function logPublish(
  label: string,
  results: RelayResult[],
  eventId: string,
): void {
  const ok = results.filter((r) => r.ok).length;
  console.log(`  → ${ok}/${results.length} relays (${eventId.slice(0, 12)}...)`);
  for (const r of results) {
    if (!r.ok) console.log(`    ✗ ${r.relay}: ${r.msg}`);
  }
}

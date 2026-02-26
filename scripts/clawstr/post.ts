#!/usr/bin/env bun
/**
 * Clawstr Posting Script
 *
 * Signs Nostr events with the Vouch service keypair and publishes
 * to relays that Clawstr indexes. No agent runtime, no local execution —
 * just cryptographic signing and HTTP POST.
 *
 * Usage:
 *   VOUCH_NSEC=nsec1... bun run scripts/clawstr/post.ts "Your post content"
 *   VOUCH_NSEC=nsec1... bun run scripts/clawstr/post.ts --reply <event-id> "Reply content"
 *   VOUCH_NSEC=nsec1... bun run scripts/clawstr/post.ts --subclaw programming "Post to subclaw"
 */

import {
  identityFromNsec,
  generateNostrKeypair,
  signEvent,
  type UnsignedEvent,
  type NostrEvent,
} from '../../packages/vouch-sdk/src/nostr-identity.js';

// ── Config ──

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

const VOUCH_PROFILE = {
  name: 'Vouch',
  about: 'Trust verification for AI agents. Check scores before delegating. Build reputation through outcomes. Nostr-native, Lightning-ready. https://percival-labs.ai',
  picture: 'https://percival-labs.ai/vouch-avatar.png',
  nip05: 'vouch@percival-labs.ai',
  bot: true,
};

// ── Parse Args ──

const args = process.argv.slice(2);
let replyTo: string | null = null;
let subclaw: string | null = null;
const contentParts: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--reply' && args[i + 1]) {
    replyTo = args[++i];
  } else if (args[i] === '--subclaw' && args[i + 1]) {
    subclaw = args[++i];
  } else if (args[i] === '--profile') {
    // Special mode: publish profile metadata
    await publishProfile();
    process.exit(0);
  } else {
    contentParts.push(args[i]);
  }
}

const content = contentParts.join(' ');
if (!content) {
  console.error('Usage: bun run scripts/clawstr/post.ts [--reply <id>] [--subclaw <name>] "content"');
  console.error('       bun run scripts/clawstr/post.ts --profile');
  process.exit(1);
}

// ── Identity ──

const nsec = process.env.VOUCH_NSEC;
if (!nsec) {
  console.error('Set VOUCH_NSEC environment variable');
  process.exit(1);
}

const identity = identityFromNsec(nsec);
console.log(`Posting as: ${identity.npub}`);

// ── Build Event ──

const tags: string[][] = [
  ['L', 'agent'],                    // NIP-32: mark as AI agent content
  ['l', 'vouch', 'agent'],           // Label: vouch agent
  ['client', 'vouch-clawstr/0.1.0'], // Client identifier
];

if (replyTo) {
  tags.push(['e', replyTo, '', 'reply']); // NIP-10: reply threading
}

if (subclaw) {
  tags.push(['r', `https://clawstr.com/c/${subclaw}`]); // NIP-73: community tag
}

const unsigned: UnsignedEvent = {
  pubkey: identity.pubkeyHex,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,        // Kind 1 = text note (standard Nostr)
  tags,
  content,
};

const signed = await signEvent(unsigned, identity.secretKeyHex);

// ── Publish to Relays ──

const results = await publishToRelays(signed);
const succeeded = results.filter(r => r.ok).length;

console.log(`Published to ${succeeded}/${RELAYS.length} relays`);
console.log(`Event ID: ${signed.id}`);
if (succeeded === 0) {
  console.error('Failed to publish to any relay');
  process.exit(1);
}

// ── Functions ──

async function publishToRelays(event: NostrEvent): Promise<Array<{ relay: string; ok: boolean; msg?: string }>> {
  return Promise.all(RELAYS.map(relay => publishToRelay(relay, event)));
}

async function publishToRelay(
  relayUrl: string,
  event: NostrEvent,
): Promise<{ relay: string; ok: boolean; msg?: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ relay: relayUrl, ok: false, msg: 'timeout' });
    }, 5000);

    const ws = new WebSocket(relayUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify(['EVENT', event]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data));
        // Relay responds: ["OK", <event-id>, <accepted>, <message>]
        if (data[0] === 'OK') {
          clearTimeout(timeout);
          ws.close();
          resolve({ relay: relayUrl, ok: data[2] === true, msg: data[3] });
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      resolve({ relay: relayUrl, ok: false, msg: 'connection error' });
    };
  });
}

async function publishProfile(): Promise<void> {
  const nsec = process.env.VOUCH_NSEC;
  if (!nsec) {
    console.error('Set VOUCH_NSEC environment variable');
    process.exit(1);
  }

  const id = identityFromNsec(nsec);
  console.log(`Publishing profile for: ${id.npub}`);

  const profileEvent: UnsignedEvent = {
    pubkey: id.pubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    kind: 0, // Kind 0 = metadata
    tags: [],
    content: JSON.stringify(VOUCH_PROFILE),
  };

  const signed = await signEvent(profileEvent, id.secretKeyHex);
  const results = await publishToRelays(signed);
  const succeeded = results.filter(r => r.ok).length;
  console.log(`Profile published to ${succeeded}/${RELAYS.length} relays`);
}

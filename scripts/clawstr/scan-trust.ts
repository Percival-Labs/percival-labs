#!/usr/bin/env bun
/**
 * Scan Clawstr for trust discussions, Vouch mentions, and replies to our posts
 */

const RELAYS = ['wss://relay.ditto.pub', 'wss://relay.damus.io', 'wss://nos.lol'];
const OUR_PUBKEY = '3f5f2d0f443e910d';

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

const allEvents = new Map<string, NostrEvent>();

for (const relay of RELAYS) {
  const events = await queryRelay(relay, { kinds: [1, 1111], limit: 500 });
  for (const e of events) allEvents.set(e.id, e);
}

const events = Array.from(allEvents.values());
console.log(`Total unique events: ${events.length}\n`);

const isOurs = (e: NostrEvent) => e.pubkey.startsWith(OUR_PUBKEY);

// 1. Trust-related posts from other agents
const trustWords = ['trust', 'reputation', 'verification', 'attestation', 'staking', 'vouch', 'escrow', 'accountability', 'identity', 'credential'];
const trustPosts = events
  .filter(e => !isOurs(e))
  .filter(e => {
    const c = e.content.toLowerCase();
    return trustWords.filter(w => c.includes(w)).length >= 2;
  })
  .sort((a, b) => b.created_at - a.created_at);

console.log('=== TRUST-RELATED POSTS (newest first) ===');
for (const e of trustPosts.slice(0, 15)) {
  const subclaw = e.tags?.find(t => t[0] === 'I')?.[1]?.split('/c/')?.[1] || '?';
  const date = new Date(e.created_at * 1000).toLocaleString();
  console.log('');
  console.log(`${e.pubkey.slice(0, 16)} | c/${subclaw} | ${date}`);
  console.log(`ID: ${e.id}`);
  console.log(e.content.slice(0, 250).replace(/\n/g, ' '));
}

// 2. Posts mentioning Vouch
console.log('\n\n=== POSTS MENTIONING VOUCH ===');
const vouchMentions = events
  .filter(e => !isOurs(e))
  .filter(e => e.content.toLowerCase().includes('vouch'))
  .sort((a, b) => b.created_at - a.created_at);

for (const e of vouchMentions.slice(0, 10)) {
  const subclaw = e.tags?.find(t => t[0] === 'I')?.[1]?.split('/c/')?.[1] || '?';
  console.log('');
  console.log(`${e.pubkey.slice(0, 16)} | c/${subclaw}`);
  console.log(`ID: ${e.id}`);
  console.log(e.content.slice(0, 300).replace(/\n/g, ' '));
}

// 3. Replies to our posts
console.log('\n\n=== REPLIES TO OUR POSTS ===');
const ourPostIds = events.filter(e => isOurs(e)).map(e => e.id);
const repliesToUs = events
  .filter(e => !isOurs(e))
  .filter(e => e.tags?.some(t => t[0] === 'e' && ourPostIds.includes(t[1])))
  .sort((a, b) => b.created_at - a.created_at);

if (repliesToUs.length === 0) {
  console.log('No replies found yet.');
} else {
  for (const e of repliesToUs) {
    const subclaw = e.tags?.find(t => t[0] === 'I')?.[1]?.split('/c/')?.[1] || '?';
    const replyTo = e.tags?.find(t => t[0] === 'e')?.[1]?.slice(0, 16);
    console.log('');
    console.log(`${e.pubkey.slice(0, 16)} | c/${subclaw} | reply to ${replyTo}`);
    console.log(`ID: ${e.id}`);
    console.log(e.content.slice(0, 300).replace(/\n/g, ' '));
  }
}

// ── Relay helper ──

async function queryRelay(relayUrl: string, filter: Record<string, unknown>): Promise<NostrEvent[]> {
  return new Promise((resolve) => {
    const events: NostrEvent[] = [];
    const subId = 'q' + Math.random().toString(36).slice(2, 8);
    const timeout = setTimeout(() => { ws.close(); resolve(events); }, 10000);
    const ws = new WebSocket(relayUrl);
    ws.onopen = () => ws.send(JSON.stringify(['REQ', subId, filter]));
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data));
        if (data[0] === 'EVENT' && data[1] === subId) events.push(data[2] as NostrEvent);
        else if (data[0] === 'EOSE') { clearTimeout(timeout); ws.close(); resolve(events); }
      } catch { /* skip */ }
    };
    ws.onerror = () => { clearTimeout(timeout); resolve(events); };
  });
}

#!/usr/bin/env bun
/**
 * Nostr Post Monitor
 *
 * Fetches our posts and engagement (reactions, replies, reposts, zaps)
 * from relays. No signing needed — read-only.
 *
 * Usage:
 *   bun run scripts/clawstr/monitor.ts
 *   bun run scripts/clawstr/monitor.ts --watch    # poll every 60s
 */

// ── Config ──

const OUR_PUBKEY_HEX = '3f5f2d0f443e910d57abb5e10953b51da9f65996e757741462b397b728bf7480';

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.ditto.pub',
  'wss://relay.primal.net',
];

const WATCH_MODE = process.argv.includes('--watch');
const POLL_INTERVAL = 60_000; // 60s

// ── Types ──

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface PostEngagement {
  post: NostrEvent;
  reactions: NostrEvent[];
  replies: NostrEvent[];
  reposts: NostrEvent[];
  zaps: NostrEvent[];
}

// ── Main ──

async function monitor() {
  console.log('Fetching posts from relays...\n');

  // 1. Get our posts (kind 1 legacy + kind 1111 Clawstr)
  const posts = await queryRelays({
    kinds: [1, 1111],
    authors: [OUR_PUBKEY_HEX],
    limit: 50,
  });

  if (posts.length === 0) {
    console.log('No posts found for this pubkey.');
    console.log(`Pubkey: ${OUR_PUBKEY_HEX}`);
    return;
  }

  // Sort by date, newest first
  posts.sort((a, b) => b.created_at - a.created_at);

  console.log(`Found ${posts.length} posts\n`);

  // 2. Get engagement for each post
  const postIds = posts.map(p => p.id);

  // Reactions (kind 7), replies (kind 1 with 'e' tag), reposts (kind 6), zaps (kind 9735)
  const [reactions, replies, reposts, zaps] = await Promise.all([
    queryRelays({ kinds: [7], '#e': postIds, limit: 500 }),
    queryRelays({ kinds: [1], '#e': postIds, limit: 500 }),
    queryRelays({ kinds: [6], '#e': postIds, limit: 500 }),
    queryRelays({ kinds: [9735], '#e': postIds, limit: 500 }),
  ]);

  // Filter out our own posts from replies
  const externalReplies = replies.filter(r => r.pubkey !== OUR_PUBKEY_HEX);

  // 3. Map engagement to posts
  const engagement: PostEngagement[] = posts.map(post => ({
    post,
    reactions: reactions.filter(r => r.tags.some(t => t[0] === 'e' && t[1] === post.id)),
    replies: externalReplies.filter(r => r.tags.some(t => t[0] === 'e' && t[1] === post.id)),
    reposts: reposts.filter(r => r.tags.some(t => t[0] === 'e' && t[1] === post.id)),
    zaps: zaps.filter(r => r.tags.some(t => t[0] === 'e' && t[1] === post.id)),
  }));

  // 4. Display
  console.log('═'.repeat(80));
  console.log('  NOSTR POST MONITOR — Percival Labs Vouch');
  console.log('  ' + new Date().toLocaleString());
  console.log('═'.repeat(80));

  // Summary
  const totalReactions = reactions.length;
  const totalReplies = externalReplies.length;
  const totalReposts = reposts.length;
  const totalZaps = zaps.length;

  console.log(`\n  TOTALS: ${totalReactions} reactions | ${totalReplies} replies | ${totalReposts} reposts | ${totalZaps} zaps\n`);
  console.log('─'.repeat(80));

  for (const e of engagement) {
    const date = new Date(e.post.created_at * 1000);
    const preview = e.post.content.slice(0, 120).replace(/\n/g, ' ');
    const subclaw = e.post.tags.find(t => t[0] === 'r' && t[1]?.includes('clawstr.com/c/'));
    const subclawName = subclaw ? subclaw[1].split('/c/')[1] : '';

    console.log(`\n  ${date.toLocaleDateString()} ${date.toLocaleTimeString()}${subclawName ? ` [c/${subclawName}]` : ''}`);
    console.log(`  ${preview}...`);
    console.log(`  ID: ${e.post.id.slice(0, 16)}...`);
    console.log(`  ❤️  ${e.reactions.length}  💬 ${e.replies.length}  🔁 ${e.reposts.length}  ⚡ ${e.zaps.length}`);

    // Show replies
    if (e.replies.length > 0) {
      console.log('  ┌─ Replies:');
      for (const reply of e.replies) {
        const replyPreview = reply.content.slice(0, 100).replace(/\n/g, ' ');
        console.log(`  │  ${reply.pubkey.slice(0, 12)}...: ${replyPreview}`);
      }
      console.log('  └─');
    }

    // Show reaction types
    if (e.reactions.length > 0) {
      const reactionTypes: Record<string, number> = {};
      for (const r of e.reactions) {
        const type = r.content || '+';
        reactionTypes[type] = (reactionTypes[type] || 0) + 1;
      }
      const breakdown = Object.entries(reactionTypes).map(([t, c]) => `${t}×${c}`).join(' ');
      console.log(`  Reactions: ${breakdown}`);
    }
  }

  console.log('\n' + '═'.repeat(80));

  // Also check our profile (kind 0)
  const profiles = await queryRelays({
    kinds: [0],
    authors: [OUR_PUBKEY_HEX],
    limit: 1,
  });

  if (profiles.length > 0) {
    try {
      const profile = JSON.parse(profiles[0].content);
      console.log(`\n  Profile: ${profile.name}`);
      console.log(`  NIP-05: ${profile.nip05 || 'not set'}`);
      console.log(`  About: ${(profile.about || '').slice(0, 80)}...`);
    } catch { /* skip */ }
  } else {
    console.log('\n  ⚠ No profile found on relays');
  }

  // Check follower count (kind 3 contact lists that include us)
  const followers = await queryRelays({
    kinds: [3],
    '#p': [OUR_PUBKEY_HEX],
    limit: 500,
  });

  // Deduplicate by pubkey (keep latest)
  const uniqueFollowers = new Map<string, NostrEvent>();
  for (const f of followers) {
    const existing = uniqueFollowers.get(f.pubkey);
    if (!existing || f.created_at > existing.created_at) {
      uniqueFollowers.set(f.pubkey, f);
    }
  }
  // Only count those who still have us in their tags
  let activeFollowers = 0;
  for (const f of uniqueFollowers.values()) {
    if (f.tags.some(t => t[0] === 'p' && t[1] === OUR_PUBKEY_HEX)) {
      activeFollowers++;
    }
  }

  console.log(`  Followers: ${activeFollowers}`);
  console.log('');
}

// ── Relay Query ──

async function queryRelays(filter: Record<string, unknown>): Promise<NostrEvent[]> {
  const allEvents = new Map<string, NostrEvent>();

  const results = await Promise.allSettled(
    RELAYS.map(relay => queryRelay(relay, filter))
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

async function queryRelay(relayUrl: string, filter: Record<string, unknown>): Promise<NostrEvent[]> {
  return new Promise((resolve) => {
    const events: NostrEvent[] = [];
    const subId = Math.random().toString(36).slice(2, 10);

    const timeout = setTimeout(() => {
      ws.close();
      resolve(events);
    }, 8000);

    const ws = new WebSocket(relayUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify(['REQ', subId, filter]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data));
        if (data[0] === 'EVENT' && data[1] === subId) {
          events.push(data[2] as NostrEvent);
        } else if (data[0] === 'EOSE' && data[1] === subId) {
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

// ── Run ──

await monitor();

if (WATCH_MODE) {
  console.log(`\nWatching... (polling every ${POLL_INTERVAL / 1000}s, Ctrl+C to stop)\n`);
  setInterval(async () => {
    console.clear();
    await monitor();
  }, POLL_INTERVAL);
}

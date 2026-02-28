#!/usr/bin/env bun
/**
 * Clawstr Thread Discovery
 *
 * Scans all 5 relays for recent kind 1111 events, filters out our own
 * and known spam, then groups by subclaw and surfaces interesting
 * conversations — especially those relevant to Vouch's domain.
 */

import {
  queryRelays,
  OUR_PUBKEY_HEX,
  isOurs,
  formatAge,
  getSubclaw,
  type NostrEventData,
} from './lib.js';

// ── Config ──────────────────────────────────────────────────────────

const WINDOW_HOURS = 2;
const WINDOW_SECONDS = WINDOW_HOURS * 3600;
const LIMIT = 500;

const SPAM_PUBKEYS = new Set([
  OUR_PUBKEY_HEX, // filter out our own
  'e3a06e4e6677daec389226270df84d15e34243188a2e9661e057d317408c6782', // Forgemaster
]);

/** Keywords that signal Vouch-relevant conversation */
const INTEREST_KEYWORDS = [
  'trust',
  'reputation',
  'security',
  'verification',
  'staking',
  'lightning',
  'bitcoin',
  'identity',
  'autonomous',
  'governance',
  'accountability',
  'escrow',
  'protocol',
  'attestation',
  'credential',
  'agent economy',
  'mcp',
  'api key',
  'api keys',
];

/** Direct references to Vouch / Percival Labs */
const VOUCH_KEYWORDS = ['vouch', 'percival', '3f5f2d0f'];

// ── Helpers ─────────────────────────────────────────────────────────

function matchesKeywords(content: string, keywords: string[]): string[] {
  const lower = content.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

function snippet(content: string, maxLen = 200): string {
  const clean = content.replace(/\n+/g, ' ').trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
}

function getThreadRoot(event: NostrEventData): string | null {
  // Look for root tag first, then any 'e' tag
  const rootTag = event.tags?.find(
    (t) => t[0] === 'e' && (t[3] === 'root' || t[3] === 'reply'),
  );
  return rootTag?.[1] || null;
}

// ── Main ────────────────────────────────────────────────────────────

const cutoff = Math.floor(Date.now() / 1000) - WINDOW_SECONDS;

console.log('========================================');
console.log('  CLAWSTR THREAD DISCOVERY');
console.log(`  Window: last ${WINDOW_HOURS} hours`);
console.log(`  Cutoff: ${new Date(cutoff * 1000).toLocaleString()}`);
console.log('========================================\n');

console.log('Querying 5 relays for kind 1111 events...');
const rawEvents = await queryRelays({
  kinds: [1111],
  since: cutoff,
  limit: LIMIT,
});

console.log(`Raw events from relays: ${rawEvents.length}`);

// Filter out spam and our own posts
const events = rawEvents.filter((e) => !SPAM_PUBKEYS.has(e.pubkey));
console.log(`After filtering spam/self: ${events.length}`);

// Also keep our events separately to check for replies
const ourEvents = rawEvents.filter((e) => isOurs(e));
const ourIds = new Set(ourEvents.map((e) => e.id));

// ── Group by subclaw ────────────────────────────────────────────────

interface SubclawData {
  events: NostrEventData[];
  posters: Map<string, number>;
  threads: Map<string, NostrEventData[]>; // root event id -> replies
  interesting: { event: NostrEventData; keywords: string[] }[];
  vouchMentions: NostrEventData[];
  repliesToUs: NostrEventData[];
}

const subclaws = new Map<string, SubclawData>();

for (const event of events) {
  const sc = getSubclaw(event);
  if (!subclaws.has(sc)) {
    subclaws.set(sc, {
      events: [],
      posters: new Map(),
      threads: new Map(),
      interesting: [],
      vouchMentions: [],
      repliesToUs: [],
    });
  }
  const data = subclaws.get(sc)!;
  data.events.push(event);

  // Track posters
  const pk = event.pubkey;
  data.posters.set(pk, (data.posters.get(pk) || 0) + 1);

  // Track threads
  const root = getThreadRoot(event);
  if (root) {
    if (!data.threads.has(root)) data.threads.set(root, []);
    data.threads.get(root)!.push(event);
  }

  // Check for interesting keywords
  const matched = matchesKeywords(event.content, INTEREST_KEYWORDS);
  if (matched.length > 0) {
    data.interesting.push({ event, keywords: matched });
  }

  // Check for Vouch/Percival mentions
  const vouchMatched = matchesKeywords(event.content, VOUCH_KEYWORDS);
  if (vouchMatched.length > 0) {
    data.vouchMentions.push(event);
  }

  // Check for replies to our posts
  const isReply = event.tags?.some(
    (t) => t[0] === 'e' && ourIds.has(t[1]),
  );
  const mentionsUs = event.tags?.some(
    (t) => t[0] === 'p' && t[1] === OUR_PUBKEY_HEX,
  );
  if (isReply || mentionsUs) {
    data.repliesToUs.push(event);
  }
}

// ── Sort subclaws by activity ───────────────────────────────────────

const sortedSubclaws = Array.from(subclaws.entries()).sort(
  (a, b) => b[1].events.length - a[1].events.length,
);

// ── Summary ─────────────────────────────────────────────────────────

console.log('\n========================================');
console.log('  SUBCLAW OVERVIEW');
console.log('========================================\n');

console.log(
  'Subclaw'.padEnd(30) +
    'Posts'.padEnd(8) +
    'Threads'.padEnd(10) +
    'Posters'.padEnd(10) +
    'Interesting'.padEnd(13) +
    'Vouch Refs',
);
console.log('-'.repeat(81));

for (const [name, data] of sortedSubclaws) {
  console.log(
    `c/${name}`.padEnd(30) +
      String(data.events.length).padEnd(8) +
      String(data.threads.size).padEnd(10) +
      String(data.posters.size).padEnd(10) +
      String(data.interesting.length).padEnd(13) +
      String(data.vouchMentions.length),
  );
}

console.log(
  `\nTotal: ${events.length} posts across ${subclaws.size} subclaws`,
);

// ── Per-Subclaw Detail ──────────────────────────────────────────────

for (const [name, data] of sortedSubclaws) {
  if (data.events.length === 0) continue;

  console.log('\n\n========================================');
  console.log(`  c/${name}`);
  console.log(`  ${data.events.length} posts | ${data.threads.size} threads | ${data.posters.size} unique posters`);
  console.log('========================================');

  // Top posters
  const topPosters = Array.from(data.posters.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  console.log('\n  TOP POSTERS:');
  for (const [pk, count] of topPosters) {
    console.log(`    ${pk.slice(0, 16)}...  ${count} posts`);
  }

  // Replies to us
  if (data.repliesToUs.length > 0) {
    console.log(
      `\n  REPLIES TO US (${data.repliesToUs.length}):`,
    );
    for (const e of data.repliesToUs.slice(0, 5)) {
      console.log(`    [${formatAge(e.created_at)}] ${e.pubkey.slice(0, 12)}...`);
      console.log(`    ${snippet(e.content, 250)}`);
      console.log(`    Event ID: ${e.id}`);
      console.log('');
    }
  }

  // Vouch/Percival mentions
  if (data.vouchMentions.length > 0) {
    console.log(
      `\n  VOUCH/PERCIVAL MENTIONS (${data.vouchMentions.length}):`,
    );
    for (const e of data.vouchMentions.slice(0, 5)) {
      console.log(`    [${formatAge(e.created_at)}] ${e.pubkey.slice(0, 12)}...`);
      console.log(`    ${snippet(e.content, 300)}`);
      console.log(`    Event ID: ${e.id}`);
      console.log('');
    }
  }

  // Interesting posts (keyword matches)
  if (data.interesting.length > 0) {
    // Sort by number of keyword matches (most relevant first)
    const sorted = data.interesting.sort(
      (a, b) => b.keywords.length - a.keywords.length,
    );
    console.log(
      `\n  INTERESTING POSTS (${sorted.length} total, showing top 10):`,
    );
    for (const { event, keywords } of sorted.slice(0, 10)) {
      console.log(
        `    [${formatAge(event.created_at)}] ${event.pubkey.slice(0, 12)}... | keywords: ${keywords.join(', ')}`,
      );
      console.log(`    ${snippet(event.content, 250)}`);
      console.log(`    Event ID: ${event.id}`);
      console.log('');
    }
  }

  // Recent activity sample (if nothing interesting, show latest)
  if (
    data.interesting.length === 0 &&
    data.vouchMentions.length === 0 &&
    data.repliesToUs.length === 0
  ) {
    const recent = data.events
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 3);
    console.log('\n  RECENT ACTIVITY (no keyword matches):');
    for (const e of recent) {
      console.log(`    [${formatAge(e.created_at)}] ${e.pubkey.slice(0, 12)}...`);
      console.log(`    ${snippet(e.content, 150)}`);
      console.log('');
    }
  }
}

// ── Global: All Vouch/Percival references ───────────────────────────

const allVouchMentions = sortedSubclaws.flatMap(([, d]) => d.vouchMentions);
const allRepliesToUs = sortedSubclaws.flatMap(([, d]) => d.repliesToUs);

console.log('\n\n========================================');
console.log('  GLOBAL: VOUCH / PERCIVAL REFERENCES');
console.log('========================================');

if (allVouchMentions.length === 0 && allRepliesToUs.length === 0) {
  console.log('\n  No direct references to Vouch, Percival, or our pubkey in this window.');
} else {
  console.log(`\n  ${allVouchMentions.length} mentions | ${allRepliesToUs.length} replies to us`);
  for (const e of [...allVouchMentions, ...allRepliesToUs]) {
    const sc = getSubclaw(e);
    console.log(`\n  [c/${sc}] [${formatAge(e.created_at)}] ${e.pubkey.slice(0, 12)}...`);
    console.log(`  ${snippet(e.content, 350)}`);
    console.log(`  Event ID: ${e.id}`);
  }
}

// ── Engagement Opportunities ────────────────────────────────────────

console.log('\n\n========================================');
console.log('  ENGAGEMENT OPPORTUNITIES');
console.log('========================================\n');

// Find posts with 2+ keyword matches that we haven't replied to
const opportunities: {
  subclaw: string;
  event: NostrEventData;
  keywords: string[];
  score: number;
}[] = [];

for (const [name, data] of sortedSubclaws) {
  for (const { event, keywords } of data.interesting) {
    // Score: more keywords = higher, recency bonus
    const ageMinutes = (Math.floor(Date.now() / 1000) - event.created_at) / 60;
    const recencyBonus = ageMinutes < 30 ? 3 : ageMinutes < 60 ? 2 : 1;
    const score = keywords.length * 2 + recencyBonus;

    opportunities.push({ subclaw: name, event, keywords, score });
  }
}

opportunities.sort((a, b) => b.score - a.score);

if (opportunities.length === 0) {
  console.log('  No high-signal engagement opportunities found in this window.');
} else {
  console.log(`  Top ${Math.min(10, opportunities.length)} engagement opportunities:\n`);
  for (const opp of opportunities.slice(0, 10)) {
    const { subclaw, event, keywords, score } = opp;
    console.log(`  Score: ${score} | c/${subclaw} | ${formatAge(event.created_at)}`);
    console.log(`  Keywords: ${keywords.join(', ')}`);
    console.log(`  Author: ${event.pubkey.slice(0, 16)}...`);
    console.log(`  ${snippet(event.content, 250)}`);
    console.log(`  Event ID: ${event.id}`);
    console.log('');
  }
}

console.log('========================================');
console.log('  SCAN COMPLETE');
console.log(`  ${new Date().toLocaleString()}`);
console.log('========================================');

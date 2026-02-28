#!/usr/bin/env bun
/**
 * Deep Engagement Monitor — Percival Labs / Vouch
 *
 * Comprehensive Nostr monitoring:
 *  1. All our posts across 5 relays (kinds 1, 1111, limit 200)
 *  2. Replies to each post (events with "e" tag referencing our post ID)
 *  3. Reactions (kind 7) to our posts
 *  4. Activity from key agents (Centauri, Lloyd, Gendolf/isnad)
 *  5. Conversation thread tracking & new agent discovery
 *
 * Usage:
 *   VOUCH_NSEC=nsec1... bun scripts/clawstr/monitor-deep.ts
 */

import {
  queryRelays,
  OUR_PUBKEY_HEX,
  isOurs,
  formatAge,
  getSubclaw,
  type NostrEventData,
} from './lib.js';

// ── Key Agents ─────────────────────────────────────────────────────

const KEY_AGENTS: Record<string, string> = {
  '90d8d48925ea3fbb2e3310775268d1581f4d01d7a3348ca8ca415d632bd2a1d1': 'Centauri',
  'f3fc799b51561875bd199319f5aebe9993866c9efc15e889e40ca762cb97a32d': 'Lloyd',
  'b6be35d0c531fecef81bd6be150c0a2cbd60f78ed51c52a320a52c55efc846cb': 'Gendolf/isnad',
};

const KEY_AGENT_PUBKEYS = Object.keys(KEY_AGENTS);

// IDs we sent in Round 3 replies (from engage-round3.ts and post-construction-analogy.ts)
// We track these to see if anyone responded to them
const OUR_ROUND3_REPLY_TARGETS = [
  'f117b7303ea059a607b7d50426f9a12811ca6a012b3c037cf383781adac94150', // Centauri HODL
  'e5b38e91e52e7006883bdf160823ce62a81c5a1d1be47c507346885c691d751c', // Centauri plumbing
  '8038f4ade901fffd75affe3ee1498d391f1b998633f2e059b774e75c08f0447a', // Lloyd PoW
];

// ── Helpers ─────────────────────────────────────────────────────────

function agentName(pubkey: string): string {
  return KEY_AGENTS[pubkey] || `${pubkey.slice(0, 12)}...`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function shortContent(content: string, maxLen = 150): string {
  const oneLine = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen) + '...' : oneLine;
}

function getReferencedEventIds(event: NostrEventData): string[] {
  return (event.tags || [])
    .filter((t) => t[0] === 'e')
    .map((t) => t[1]);
}

function getReferencedPubkeys(event: NostrEventData): string[] {
  return (event.tags || [])
    .filter((t) => t[0] === 'p')
    .map((t) => t[1]);
}

function hr(char = '-', len = 80): string {
  return char.repeat(len);
}

// ── Data Collection ─────────────────────────────────────────────────

console.log('DEEP ENGAGEMENT MONITOR — Percival Labs / Vouch');
console.log(`${hr('=')}\n`);
console.log('Querying 5 relays...\n');

// 1. Fetch our posts
console.log('  [1/5] Fetching our posts (kinds 1 + 1111, limit 200)...');
const ourPosts = await queryRelays({
  kinds: [1, 1111],
  authors: [OUR_PUBKEY_HEX],
  limit: 200,
});
ourPosts.sort((a, b) => b.created_at - a.created_at);
console.log(`         Found ${ourPosts.length} posts.`);

const ourPostIds = ourPosts.map((p) => p.id);

// 2. Fetch replies to our posts
//    Replies are kind 1 or 1111 events with an 'e' tag referencing one of our post IDs
console.log('  [2/5] Fetching replies to our posts...');
const [repliesK1, repliesK1111] = await Promise.all([
  queryRelays({ kinds: [1], '#e': ourPostIds, limit: 500 }),
  queryRelays({ kinds: [1111], '#e': ourPostIds, limit: 500 }),
]);
// Deduplicate by ID
const allRepliesMap = new Map<string, NostrEventData>();
for (const r of [...repliesK1, ...repliesK1111]) {
  allRepliesMap.set(r.id, r);
}
const allReplies = Array.from(allRepliesMap.values()).filter((r) => !isOurs(r));
allReplies.sort((a, b) => b.created_at - a.created_at);
console.log(`         Found ${allReplies.length} external replies.`);

// Also get replies from us (to track conversation threads)
const ourReplies = Array.from(allRepliesMap.values()).filter((r) => isOurs(r));

// 3. Fetch reactions to our posts
console.log('  [3/5] Fetching reactions (kind 7) to our posts...');
const reactions = await queryRelays({ kinds: [7], '#e': ourPostIds, limit: 500 });
const externalReactions = reactions.filter((r) => !isOurs(r));
console.log(`         Found ${externalReactions.length} reactions.`);

// 4. Key agent activity (last 48h)
console.log('  [4/5] Fetching key agent activity (last 48h)...');
const since48h = Math.floor(Date.now() / 1000) - 48 * 3600;
const keyAgentPosts = await queryRelays({
  kinds: [1, 1111],
  authors: KEY_AGENT_PUBKEYS,
  limit: 200,
  since: since48h,
});
keyAgentPosts.sort((a, b) => b.created_at - a.created_at);
console.log(`         Found ${keyAgentPosts.length} posts from key agents.`);

// 5. Check if key agents replied to OUR replies (follow-up conversation)
console.log('  [5/5] Checking for follow-up responses to our Round 3 replies...');
// Get our Round 3 reply event IDs by finding events we authored that reference the target IDs
const ourRound3Events = ourPosts.filter((p) => {
  const refs = getReferencedEventIds(p);
  return refs.some((r) => OUR_ROUND3_REPLY_TARGETS.includes(r));
});
const ourRound3Ids = ourRound3Events.map((p) => p.id);

// Also search for our own posts that ARE replies (in case they weren't in ourPosts query)
const additionalOurReplies = await queryRelays({
  kinds: [1, 1111],
  authors: [OUR_PUBKEY_HEX],
  '#e': OUR_ROUND3_REPLY_TARGETS,
  limit: 50,
});
for (const r of additionalOurReplies) {
  if (!ourRound3Ids.includes(r.id)) {
    ourRound3Ids.push(r.id);
    ourRound3Events.push(r);
  }
}

let round3FollowUps: NostrEventData[] = [];
if (ourRound3Ids.length > 0) {
  const [fu1, fu1111] = await Promise.all([
    queryRelays({ kinds: [1], '#e': ourRound3Ids, limit: 200 }),
    queryRelays({ kinds: [1111], '#e': ourRound3Ids, limit: 200 }),
  ]);
  const fuMap = new Map<string, NostrEventData>();
  for (const e of [...fu1, ...fu1111]) {
    if (!isOurs(e)) fuMap.set(e.id, e);
  }
  round3FollowUps = Array.from(fuMap.values());
  round3FollowUps.sort((a, b) => b.created_at - a.created_at);
}
console.log(`         Found ${round3FollowUps.length} follow-ups to our Round 3 replies.`);

// Also check for replies to construction analogy posts
const constructionPosts = ourPosts.filter((p) => {
  const c = p.content.toLowerCase();
  return c.includes('construction') && (c.includes('draw schedule') || c.includes('general contractor'));
});
const constructionPostIds = constructionPosts.map((p) => p.id);
let constructionReplies: NostrEventData[] = [];
if (constructionPostIds.length > 0) {
  const [cr1, cr1111] = await Promise.all([
    queryRelays({ kinds: [1], '#e': constructionPostIds, limit: 200 }),
    queryRelays({ kinds: [1111], '#e': constructionPostIds, limit: 200 }),
  ]);
  const crMap = new Map<string, NostrEventData>();
  for (const e of [...cr1, ...cr1111]) {
    if (!isOurs(e)) crMap.set(e.id, e);
  }
  constructionReplies = Array.from(crMap.values());
  constructionReplies.sort((a, b) => b.created_at - a.created_at);
}
console.log(`         Found ${constructionReplies.length} replies to construction analogy posts.`);

console.log('\n' + hr('='));

// ── REPORT ──────────────────────────────────────────────────────────

// ── Section 1: Summary Dashboard ──

console.log('\n  ENGAGEMENT SUMMARY');
console.log(hr('-'));

const totalPosts = ourPosts.length;
const ourTopLevel = ourPosts.filter((p) => {
  const refs = getReferencedEventIds(p);
  return refs.length === 0;
});
const ourReplyCount = ourPosts.filter((p) => {
  const refs = getReferencedEventIds(p);
  return refs.length > 0;
});

console.log(`  Total posts:            ${totalPosts} (${ourTopLevel.length} top-level, ${ourReplyCount.length} replies)`);
console.log(`  External replies:       ${allReplies.length}`);
console.log(`  External reactions:     ${externalReactions.length}`);
console.log(`  Round 3 follow-ups:     ${round3FollowUps.length}`);
console.log(`  Construction replies:   ${constructionReplies.length}`);
console.log(`  Key agent posts (48h):  ${keyAgentPosts.length}`);

// Unique external pubkeys
const externalPubkeys = new Set<string>();
for (const r of allReplies) externalPubkeys.add(r.pubkey);
for (const r of externalReactions) externalPubkeys.add(r.pubkey);
console.log(`  Unique external agents: ${externalPubkeys.size}`);

// ── Section 2: Per-Post Engagement Breakdown ──

console.log('\n\n  POST-BY-POST ENGAGEMENT');
console.log(hr('='));

for (const post of ourPosts) {
  const postReplies = allReplies.filter((r) =>
    getReferencedEventIds(r).includes(post.id),
  );
  const postReactions = externalReactions.filter((r) =>
    getReferencedEventIds(r).includes(post.id),
  );
  const isReply = getReferencedEventIds(post).length > 0;
  const subclaw = getSubclaw(post);

  // Only show posts that got engagement, OR are recent (last 6h)
  const sixHoursAgo = Math.floor(Date.now() / 1000) - 6 * 3600;
  if (postReplies.length === 0 && postReactions.length === 0 && post.created_at < sixHoursAgo) {
    continue;
  }

  console.log(`\n  ${formatTimestamp(post.created_at)} | ${formatAge(post.created_at)} | c/${subclaw}${isReply ? ' [REPLY]' : ' [POST]'}`);
  console.log(`  ${shortContent(post.content, 120)}`);
  console.log(`  ID: ${post.id.slice(0, 16)}...`);
  console.log(`  Replies: ${postReplies.length} | Reactions: ${postReactions.length}`);

  if (postReplies.length > 0) {
    for (const reply of postReplies) {
      const isKeyAgent = KEY_AGENTS[reply.pubkey];
      const label = isKeyAgent ? `** ${isKeyAgent} **` : agentName(reply.pubkey);
      console.log(`    -> ${label} (${formatAge(reply.created_at)}):`);
      console.log(`       ${shortContent(reply.content, 200)}`);
      console.log(`       ID: ${reply.id.slice(0, 16)}...`);
    }
  }

  if (postReactions.length > 0) {
    const reactionBreakdown: Record<string, string[]> = {};
    for (const r of postReactions) {
      const type = r.content || '+';
      if (!reactionBreakdown[type]) reactionBreakdown[type] = [];
      reactionBreakdown[type].push(agentName(r.pubkey));
    }
    const parts = Object.entries(reactionBreakdown).map(
      ([type, who]) => `${type} (${who.join(', ')})`,
    );
    console.log(`    Reactions: ${parts.join(' | ')}`);
  }

  console.log(`  ${hr('.', 76)}`);
}

// ── Section 3: Conversation Thread Status ──

console.log('\n\n  CONVERSATION THREAD STATUS');
console.log(hr('='));

// Build conversation threads: group by the initial post being replied to
interface ConversationThread {
  rootPostId: string;
  rootPostContent: string;
  rootPostPubkey: string;
  subclaw: string;
  participants: Set<string>;
  events: NostrEventData[];
  lastActivity: number;
  weReplied: boolean;
  theyRepliedBack: boolean;
}

const threads = new Map<string, ConversationThread>();

// Process our replies to others' posts (from engagement-log.json context)
const engagedTargetIds = new Set<string>();

for (const post of ourPosts) {
  const refs = getReferencedEventIds(post);
  if (refs.length === 0) continue; // top-level post

  for (const refId of refs) {
    engagedTargetIds.add(refId);
    if (!threads.has(refId)) {
      threads.set(refId, {
        rootPostId: refId,
        rootPostContent: '(original post not fetched)',
        rootPostPubkey: '',
        subclaw: getSubclaw(post),
        participants: new Set(),
        events: [],
        lastActivity: post.created_at,
        weReplied: true,
        theyRepliedBack: false,
      });
    }
    const thread = threads.get(refId)!;
    thread.events.push(post);
    thread.participants.add(OUR_PUBKEY_HEX);
    if (post.created_at > thread.lastActivity) thread.lastActivity = post.created_at;
  }
}

// Add external replies that reference our posts
for (const reply of allReplies) {
  const refs = getReferencedEventIds(reply);
  for (const refId of refs) {
    if (ourPostIds.includes(refId)) {
      // This is a direct reply to one of our posts
      if (!threads.has(refId)) {
        const ourPost = ourPosts.find((p) => p.id === refId);
        threads.set(refId, {
          rootPostId: refId,
          rootPostContent: ourPost ? shortContent(ourPost.content, 100) : '(our post)',
          rootPostPubkey: OUR_PUBKEY_HEX,
          subclaw: ourPost ? getSubclaw(ourPost) : '?',
          participants: new Set([OUR_PUBKEY_HEX]),
          events: ourPost ? [ourPost] : [],
          lastActivity: reply.created_at,
          weReplied: false,
          theyRepliedBack: true,
        });
      }
      const thread = threads.get(refId)!;
      thread.events.push(reply);
      thread.participants.add(reply.pubkey);
      thread.theyRepliedBack = true;
      if (reply.created_at > thread.lastActivity) thread.lastActivity = reply.created_at;
    }
  }
}

// Add Round 3 follow-ups
for (const fu of round3FollowUps) {
  const refs = getReferencedEventIds(fu);
  for (const refId of refs) {
    if (ourRound3Ids.includes(refId) || ourPostIds.includes(refId)) {
      const rootId = refId;
      if (!threads.has(rootId)) {
        threads.set(rootId, {
          rootPostId: rootId,
          rootPostContent: '(our Round 3 reply)',
          rootPostPubkey: OUR_PUBKEY_HEX,
          subclaw: getSubclaw(fu),
          participants: new Set([OUR_PUBKEY_HEX]),
          events: [],
          lastActivity: fu.created_at,
          weReplied: true,
          theyRepliedBack: true,
        });
      }
      const thread = threads.get(rootId)!;
      thread.events.push(fu);
      thread.participants.add(fu.pubkey);
      thread.theyRepliedBack = true;
      if (fu.created_at > thread.lastActivity) thread.lastActivity = fu.created_at;
    }
  }
}

// Sort threads by last activity
const sortedThreads = Array.from(threads.values()).sort(
  (a, b) => b.lastActivity - a.lastActivity,
);

for (const thread of sortedThreads) {
  const participantNames = Array.from(thread.participants)
    .filter((p) => p !== OUR_PUBKEY_HEX)
    .map((p) => agentName(p));

  const status = thread.theyRepliedBack
    ? 'ACTIVE CONVERSATION'
    : thread.weReplied
      ? 'AWAITING REPLY'
      : 'RECEIVED REPLY';

  console.log(`\n  [${status}] c/${thread.subclaw} | Last: ${formatAge(thread.lastActivity)}`);
  console.log(`  Root: ${thread.rootPostId.slice(0, 16)}...`);
  console.log(`  Participants: ${participantNames.length > 0 ? participantNames.join(', ') : 'us only'}`);
  console.log(`  Events in thread: ${thread.events.length}`);

  // Show key agent involvement
  for (const pubkey of thread.participants) {
    if (KEY_AGENTS[pubkey]) {
      const agentEvents = thread.events.filter((e) => e.pubkey === pubkey);
      if (agentEvents.length > 0) {
        const latest = agentEvents.sort((a, b) => b.created_at - a.created_at)[0];
        console.log(`    ${KEY_AGENTS[pubkey]}: ${agentEvents.length} message(s), latest ${formatAge(latest.created_at)}`);
        console.log(`      "${shortContent(latest.content, 150)}"`);
      }
    }
  }
}

// ── Section 4: Key Agent Activity ──

console.log('\n\n  KEY AGENT ACTIVITY (Last 48h)');
console.log(hr('='));

for (const [pubkey, name] of Object.entries(KEY_AGENTS)) {
  const posts = keyAgentPosts.filter((p) => p.pubkey === pubkey);
  console.log(`\n  ${name} (${pubkey.slice(0, 12)}...)`);
  console.log(`  Posts in last 48h: ${posts.length}`);

  if (posts.length === 0) {
    console.log('  (No recent activity)');
    continue;
  }

  // Check which of their posts reference our events
  const mentionsUs = posts.filter((p) => {
    const refs = getReferencedEventIds(p);
    const pRefs = getReferencedPubkeys(p);
    return (
      refs.some((r) => ourPostIds.includes(r)) ||
      pRefs.includes(OUR_PUBKEY_HEX) ||
      p.content.toLowerCase().includes('vouch') ||
      p.content.toLowerCase().includes('percival')
    );
  });

  if (mentionsUs.length > 0) {
    console.log(`  ** ${mentionsUs.length} post(s) reference us or Vouch! **`);
  }

  for (const post of posts.slice(0, 5)) {
    const isReply = getReferencedEventIds(post).length > 0;
    const subclaw = getSubclaw(post);
    const refsUs =
      getReferencedEventIds(post).some((r) => ourPostIds.includes(r)) ||
      getReferencedPubkeys(post).includes(OUR_PUBKEY_HEX);

    console.log(`\n    ${formatTimestamp(post.created_at)} | ${formatAge(post.created_at)} | c/${subclaw}${isReply ? ' [reply]' : ''}${refsUs ? ' ** REFS US **' : ''}`);
    console.log(`    ${shortContent(post.content, 200)}`);
    console.log(`    ID: ${post.id.slice(0, 16)}...`);
  }

  if (posts.length > 5) {
    console.log(`\n    ... and ${posts.length - 5} more posts`);
  }
}

// ── Section 5: Round 3 Follow-Up Check ──

console.log('\n\n  ROUND 3 FOLLOW-UP CHECK');
console.log(hr('='));

const round3Targets = [
  {
    agent: 'Centauri',
    pubkey: '90d8d48925ea3fbb2e3310775268d1581f4d01d7a3348ca8ca415d632bd2a1d1',
    targetId: 'f117b7303ea059a607b7d50426f9a12811ca6a012b3c037cf383781adac94150',
    topic: 'HODL invoice chaining + trust-informed timeouts',
  },
  {
    agent: 'Centauri',
    pubkey: '90d8d48925ea3fbb2e3310775268d1581f4d01d7a3348ca8ca415d632bd2a1d1',
    targetId: 'e5b38e91e52e7006883bdf160823ce62a81c5a1d1be47c507346885c691d751c',
    topic: 'Protocols > platforms',
  },
  {
    agent: 'Lloyd',
    pubkey: 'f3fc799b51561875bd199319f5aebe9993866c9efc15e889e40ca762cb97a32d',
    targetId: '8038f4ade901fffd75affe3ee1498d391f1b998633f2e059b774e75c08f0447a',
    topic: 'Proof of Work > Proof of Post',
  },
];

for (const target of round3Targets) {
  // Find our reply to this target
  const ourReply = [...ourPosts, ...additionalOurReplies].find((p) =>
    getReferencedEventIds(p).includes(target.targetId),
  );

  console.log(`\n  ${target.agent} — ${target.topic}`);
  console.log(`  Target: ${target.targetId.slice(0, 16)}...`);

  if (ourReply) {
    console.log(`  Our reply: ${ourReply.id.slice(0, 16)}... (${formatAge(ourReply.created_at)})`);

    // Check if they replied to OUR reply
    const followUps = round3FollowUps.filter((fu) =>
      getReferencedEventIds(fu).includes(ourReply.id) && fu.pubkey === target.pubkey,
    );

    // Also check all replies from this agent that reference our reply
    const agentFollowUps = keyAgentPosts.filter(
      (p) => p.pubkey === target.pubkey && getReferencedEventIds(p).includes(ourReply.id),
    );

    const combined = new Map<string, NostrEventData>();
    for (const f of [...followUps, ...agentFollowUps]) combined.set(f.id, f);
    const allFollowUps = Array.from(combined.values());

    if (allFollowUps.length > 0) {
      console.log(`  ** THEY RESPONDED! ${allFollowUps.length} follow-up(s) **`);
      for (const fu of allFollowUps) {
        console.log(`    ${formatTimestamp(fu.created_at)} | ${formatAge(fu.created_at)}`);
        console.log(`    "${shortContent(fu.content, 250)}"`);
        console.log(`    ID: ${fu.id}`);
      }
    } else {
      console.log(`  Status: No follow-up response yet.`);
    }
  } else {
    console.log(`  Our reply: NOT FOUND (may not have been posted)`);
  }
}

// Check construction analogy responses
console.log(`\n  Construction Analogy Posts`);
if (constructionPosts.length === 0) {
  console.log('  (No construction analogy posts found)');
} else {
  for (const cp of constructionPosts) {
    const subclaw = getSubclaw(cp);
    console.log(`\n  c/${subclaw} | ${formatAge(cp.created_at)} | ID: ${cp.id.slice(0, 16)}...`);
    console.log(`  "${shortContent(cp.content, 120)}"`);

    const cpReplies = constructionReplies.filter((r) =>
      getReferencedEventIds(r).includes(cp.id),
    );
    const cpReactions = externalReactions.filter((r) =>
      getReferencedEventIds(r).includes(cp.id),
    );

    console.log(`  Replies: ${cpReplies.length} | Reactions: ${cpReactions.length}`);
    for (const r of cpReplies) {
      const label = KEY_AGENTS[r.pubkey] ? `** ${KEY_AGENTS[r.pubkey]} **` : agentName(r.pubkey);
      console.log(`    -> ${label}: "${shortContent(r.content, 200)}"`);
    }
  }
}

// ── Section 6: New Agent Discovery ──

console.log('\n\n  NEW AGENT DISCOVERY');
console.log(hr('='));

const knownPubkeys = new Set([
  OUR_PUBKEY_HEX,
  ...KEY_AGENT_PUBKEYS,
  // Agents from engagement-log.json
  '304c37f5d924645044258423f4c374bf32a73448b597713eb28699f7833aea55',
  'e3a06e4e6677daec389226270df84d15e34243188a2e9661e057d317408c6782',
  'ff08f353c61091863de4c963c696bad3493d529ae9db1897f325d799e514bf9c',
  'c5684701cf97c5697ee38d30cba6e25bcebaecd2382bdd1a0ced44272d3fe5a6',
]);

const newAgents = new Map<string, { replies: NostrEventData[]; reactions: NostrEventData[] }>();

for (const r of allReplies) {
  if (!knownPubkeys.has(r.pubkey)) {
    if (!newAgents.has(r.pubkey)) newAgents.set(r.pubkey, { replies: [], reactions: [] });
    newAgents.get(r.pubkey)!.replies.push(r);
  }
}
for (const r of externalReactions) {
  if (!knownPubkeys.has(r.pubkey)) {
    if (!newAgents.has(r.pubkey)) newAgents.set(r.pubkey, { replies: [], reactions: [] });
    newAgents.get(r.pubkey)!.reactions.push(r);
  }
}

if (newAgents.size === 0) {
  console.log('  No new agents engaging with us (beyond known contacts).');
} else {
  console.log(`  ${newAgents.size} new agent(s) found!\n`);

  // Try to fetch profiles for new agents
  const newPubkeys = Array.from(newAgents.keys());
  let profiles: NostrEventData[] = [];
  try {
    profiles = await queryRelays({ kinds: [0], authors: newPubkeys, limit: 50 });
  } catch {
    // Profiles are best-effort
  }
  const profileMap = new Map<string, Record<string, unknown>>();
  for (const p of profiles) {
    try {
      const existing = profileMap.get(p.pubkey);
      if (!existing || p.created_at > (profiles.find((pp) => pp.pubkey === p.pubkey && JSON.stringify(existing) === pp.content)?.created_at || 0)) {
        profileMap.set(p.pubkey, JSON.parse(p.content));
      }
    } catch {
      /* skip */
    }
  }

  for (const [pubkey, activity] of newAgents) {
    const profile = profileMap.get(pubkey);
    const name = profile
      ? `${(profile as Record<string, string>).name || (profile as Record<string, string>).display_name || pubkey.slice(0, 12) + '...'}`
      : `${pubkey.slice(0, 12)}...`;
    const about = profile
      ? shortContent(String((profile as Record<string, string>).about || ''), 100)
      : '';

    console.log(`  ${name} (${pubkey.slice(0, 16)}...)`);
    if (about) console.log(`    Bio: ${about}`);
    console.log(`    Replies: ${activity.replies.length} | Reactions: ${activity.reactions.length}`);

    for (const r of activity.replies.slice(0, 3)) {
      console.log(`    -> ${formatAge(r.created_at)} | c/${getSubclaw(r)}: "${shortContent(r.content, 150)}"`);
    }
    console.log('');
  }
}

// ── Section 7: Action Items ──

console.log('\n  ACTION ITEMS');
console.log(hr('='));

const actions: string[] = [];

// Check for unanswered replies
const unansweredReplies = allReplies.filter((reply) => {
  // Check if we replied to this reply
  const replyId = reply.id;
  return !ourPosts.some((p) => getReferencedEventIds(p).includes(replyId));
});
if (unansweredReplies.length > 0) {
  actions.push(
    `${unansweredReplies.length} unanswered reply(ies) — consider responding:`,
  );
  for (const r of unansweredReplies.slice(0, 5)) {
    const label = KEY_AGENTS[r.pubkey] ? KEY_AGENTS[r.pubkey] : agentName(r.pubkey);
    actions.push(`    - ${label} in c/${getSubclaw(r)}: "${shortContent(r.content, 80)}" (${formatAge(r.created_at)})`);
  }
}

// Check for unreacted reactions from key agents
for (const [pubkey, name] of Object.entries(KEY_AGENTS)) {
  const agentReactions = externalReactions.filter((r) => r.pubkey === pubkey);
  if (agentReactions.length > 0) {
    actions.push(`${name} reacted to ${agentReactions.length} of our posts`);
  }
}

// Check for new agents worth following up with
if (newAgents.size > 0) {
  actions.push(`${newAgents.size} new agent(s) engaging — consider following/engaging back`);
}

// Check for stale conversations
const staleThreshold = Math.floor(Date.now() / 1000) - 4 * 3600; // 4 hours
const staleConversations = sortedThreads.filter(
  (t) => t.theyRepliedBack && t.lastActivity < staleThreshold,
);
if (staleConversations.length > 0) {
  actions.push(`${staleConversations.length} active conversation(s) with no activity in 4+ hours`);
}

if (actions.length === 0) {
  console.log('\n  All caught up! No urgent actions.\n');
} else {
  for (const action of actions) {
    console.log(`\n  -> ${action}`);
  }
  console.log('');
}

// ── Footer ──

console.log(hr('='));
console.log(`  Report generated: ${new Date().toLocaleString()}`);
console.log(`  Pubkey: ${OUR_PUBKEY_HEX}`);
console.log(`  Relays queried: 5`);
console.log(hr('='));

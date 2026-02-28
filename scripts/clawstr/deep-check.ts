#!/usr/bin/env bun
/** Deep check for real agent replies (filters out Forgemaster) */

import { queryRelays, OUR_PUBKEY_HEX, formatAge, getSubclaw } from './lib.js';

const CENTAURI = '90d8d48925ea3fbb2e3310775268d1581f4d01d7a3348ca8ca415d632bd2a1d1';
const LLOYD = 'f3fc799b51561875bd199319f5aebe9993866c9efc15e889e40ca762cb97a32d';
const GENDOLF = 'b6be35d0c531fecef81bd6be150c0a2cbd60f78ed51c52a320a52c55efc846cb';
const FORGEMASTER = 'e3a06e4e6677daec389226270df84d15e34243188a2e9661e057d317408c6782';

const ourPosts = await queryRelays({ kinds: [1, 1111], authors: [OUR_PUBKEY_HEX], limit: 100 });
const ourIds = new Set(ourPosts.map(p => p.id));

const cutoff = Math.floor(Date.now() / 1000) - 3600;
const allRecent = await queryRelays({ kinds: [1, 1111], limit: 500, since: cutoff });

const realReplies = allRecent
  .filter(e => e.pubkey !== OUR_PUBKEY_HEX && e.pubkey !== FORGEMASTER)
  .filter(e => e.tags?.some(t => t[0] === 'e' && ourIds.has(t[1])))
  .sort((a, b) => b.created_at - a.created_at);

console.log(`=== REAL REPLIES (last hour, no Forgemaster) — ${realReplies.length} ===`);
if (realReplies.length === 0) {
  console.log('None yet. Real agents tend to respond on 30-60 min cycles.\n');
} else {
  for (const r of realReplies) {
    let name = r.pubkey.slice(0, 12);
    if (r.pubkey === CENTAURI) name = 'Centauri';
    if (r.pubkey === LLOYD) name = 'Lloyd';
    if (r.pubkey === GENDOLF) name = 'Gendolf';
    console.log(`[${name}] ${formatAge(r.created_at)} | c/${getSubclaw(r)}`);
    console.log(r.content.slice(0, 300).replace(/\n/g, ' '));
    console.log(`ID: ${r.id}\n`);
  }
}

// Construction analogy check
const constructionPosts = ourPosts.filter(p =>
  p.content.includes('GENERAL CONTRACTOR') || p.content.includes('Draw schedule')
);
console.log(`=== CONSTRUCTION ANALOGY (${constructionPosts.length} posts) ===`);
for (const cp of constructionPosts) {
  const replies = allRecent.filter(e =>
    e.pubkey !== OUR_PUBKEY_HEX &&
    e.tags?.some(t => t[0] === 'e' && t[1] === cp.id)
  );
  const sub = getSubclaw(cp);
  console.log(`c/${sub}: ${replies.length} replies (${cp.id.slice(0, 12)}...)`);
  for (const r of replies) {
    console.log(`  ${r.pubkey.slice(0, 12)}: ${r.content.slice(0, 200).replace(/\n/g, ' ')}`);
  }
}

// Reactions check
const reactions = await queryRelays({ kinds: [7], limit: 200, since: cutoff });
const ourReactions = reactions.filter(r =>
  r.tags?.some(t => t[0] === 'e' && ourIds.has(t[1]))
);
console.log(`\n=== REACTIONS (last hour) — ${ourReactions.length} ===`);
for (const r of ourReactions) {
  const targetId = r.tags?.find(t => t[0] === 'e')?.[1]?.slice(0, 12);
  console.log(`  ${r.pubkey.slice(0, 12)} reacted ${r.content} to ${targetId}...`);
}

#!/usr/bin/env bun
/** Quick scan for new replies and mentions in the last 30 min */

import { queryRelays, OUR_PUBKEY_HEX, isOurs, formatAge, getSubclaw } from './lib.js';

const WINDOW_SECONDS = 1800; // 30 min
const cutoff = Math.floor(Date.now() / 1000) - WINDOW_SECONDS;

// Get our posts (all time, so we can match replies)
const ourPosts = await queryRelays({ kinds: [1, 1111], authors: [OUR_PUBKEY_HEX], limit: 100 });
const ourIds = new Set(ourPosts.map(p => p.id));

// Get all recent events
const allEvents = await queryRelays({ kinds: [1, 1111], limit: 500, since: cutoff });
const recent = allEvents.filter(e => e.created_at >= cutoff);

// Replies to us
const replies = recent
  .filter(e => !isOurs(e))
  .filter(e => e.tags?.some(t => t[0] === 'e' && ourIds.has(t[1])))
  .sort((a, b) => b.created_at - a.created_at);

// Mentions
const mentions = recent
  .filter(e => !isOurs(e))
  .filter(e => {
    const c = e.content.toLowerCase();
    return c.includes('3f5f2d0f') || c.includes('vouch') || c.includes('percival');
  })
  .filter(m => !replies.some(r => r.id === m.id))
  .sort((a, b) => b.created_at - a.created_at);

console.log(`=== REPLIES TO US (last ${WINDOW_SECONDS / 60} min) — ${replies.length} ===`);
for (const r of replies) {
  console.log(`${r.pubkey.slice(0, 16)} | c/${getSubclaw(r)} | ${formatAge(r.created_at)}`);
  console.log(r.content.slice(0, 300).replace(/\n/g, ' '));
  console.log(`ID: ${r.id}\n`);
}

console.log(`=== NEW MENTIONS — ${mentions.length} ===`);
for (const m of mentions) {
  console.log(`${m.pubkey.slice(0, 16)} | c/${getSubclaw(m)} | ${formatAge(m.created_at)}`);
  console.log(m.content.slice(0, 300).replace(/\n/g, ' '));
  console.log(`ID: ${m.id}\n`);
}

if (replies.length === 0 && mentions.length === 0) {
  console.log('Quiet. Check back in a few minutes.');
}

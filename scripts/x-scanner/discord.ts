/**
 * X Scanner -- Discord Integration
 *
 * Posts engagement opportunities to the #signals channel.
 * Only posts 'reply' and 'quote_tweet' classifications.
 */

import { DISCORD } from './config.js';
import { log } from './logger.js';
import type { Tweet } from './search.js';
import type { Classification } from './drafter.js';

// -- Types ----------------------------------------------------------------

export interface Opportunity {
  tweet: Tweet;
  classification: Classification;
  draftResponse: string;
  reasoning: string;
}

// -- Discord API ----------------------------------------------------------

async function sendDiscordMessage(content: string): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    log('warn', 'discord', 'DISCORD_BOT_TOKEN not set, skipping post');
    return false;
  }

  try {
    const res = await fetch(
      `${DISCORD.apiBase}/channels/${DISCORD.channelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, flags: 1 << 2 }), // SUPPRESS_EMBEDS — prevents duplicate tweet preview
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log('error', 'discord', `Discord API failed (${res.status})`, {
        body: body.slice(0, 200),
      });
      return false;
    }

    log('info', 'discord', 'Posted opportunity to #signals');
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', 'discord', 'Failed to post to Discord', { error: message });
    return false;
  }
}

// -- Format ---------------------------------------------------------------

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

function formatOpportunity(opp: Opportunity): string {
  const typeEmoji = opp.classification === 'reply' ? '💬' : '🔁';
  const typeLabel = opp.classification === 'reply' ? 'Reply' : 'Quote Tweet';

  // Don't truncate the original tweet — show the full thing
  const tweetLines = opp.tweet.text.split('\n').map((l) => `> ${l}`).join('\n');

  const lines: string[] = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `${typeEmoji} **@${opp.tweet.authorUsername}** — ${typeLabel}`,
    ``,
    `**THEIR POST:**`,
    tweetLines,
    ``,
    `${opp.tweet.url}`,
  ];

  if (opp.draftResponse) {
    lines.push(
      ``,
      `**YOUR DRAFT:**`,
      `\`\`\``,
      opp.draftResponse,
      `\`\`\``,
    );
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Discord 2000 char limit — split into multiple messages if needed
  // but first try to fit in one
  const msg = lines.join('\n');
  if (msg.length > 1950) {
    // Trim the draft if needed, never the original post
    const draftMax = 1950 - (msg.length - (opp.draftResponse?.length || 0));
    if (opp.draftResponse && draftMax > 50) {
      const trimmedLines = [...lines];
      const draftIdx = trimmedLines.indexOf(opp.draftResponse);
      if (draftIdx >= 0) {
        trimmedLines[draftIdx] = opp.draftResponse.slice(0, draftMax) + '...';
      }
      return trimmedLines.join('\n');
    }
  }

  return msg;
}

// -- Public API -----------------------------------------------------------

/**
 * Post an engagement opportunity to Discord #signals.
 * Only posts for 'reply' and 'quote_tweet'. Logs and skips others.
 */
/** Small delay between posts to avoid Discord 429 rate limits */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastPostTime = 0;
const MIN_POST_INTERVAL_MS = 1_000; // 1 second between posts

export async function postOpportunity(opp: Opportunity): Promise<boolean> {
  if (opp.classification === 'skip') {
    log('debug', 'discord', `Skipping tweet by @${opp.tweet.authorUsername} (classified: skip)`);
    return true;
  }

  if (opp.classification === 'like_only') {
    log('info', 'discord', `Like-only: @${opp.tweet.authorUsername} — ${opp.tweet.url}`);
    return true;
  }

  // Rate limit protection
  const elapsed = Date.now() - lastPostTime;
  if (elapsed < MIN_POST_INTERVAL_MS) {
    await sleep(MIN_POST_INTERVAL_MS - elapsed);
  }

  const content = formatOpportunity(opp);
  const result = await sendDiscordMessage(content);
  lastPostTime = Date.now();
  return result;
}

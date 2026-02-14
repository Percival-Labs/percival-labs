// Percival Labs -- Core Discord Event Handlers
// Listens for messages in #drop, processes article links through the
// intelligence pipeline, and routes results to the appropriate channels.

import { Client, Events, Message, TextChannel, EmbedBuilder } from 'discord.js';
import type { Database } from 'bun:sqlite';
import type { ChannelMap, LensResult, ProcessedArticle } from './types';
import { SCORE_EMOJI } from './types';
import { fetchArticle } from './pipeline/fetch';
import { processArticle } from './pipeline/process';
import { scoreArticle } from './pipeline/score';
import { storeArticle, getArticleByUrl } from './pipeline/store';

const URL_REGEX = /https?:\/\/[^\s<>]+/g;
const PL_CYAN = 0x22d3ee;
const MAX_EMBED_DESC = 4096;

// Module-scoped client reference, set when setupHandlers is called.
// Safe because handlers only fire after setup completes.
let _client: Client;

/**
 * Register all Discord event handlers.
 * Call this once after channels are resolved.
 */
export function setupHandlers(client: Client, channels: ChannelMap, db: Database): void {
  _client = client;

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (message.channelId !== channels.drop) return;

    const urls = message.content.match(URL_REGEX);
    if (!urls || urls.length === 0) return;

    const uniqueUrls = [...new Set(urls)];
    for (const url of uniqueUrls) {
      await processUrl(url, message, channels, db);
    }
  });
}

// ---------------------------------------------------------------------------
// Pipeline orchestration
// ---------------------------------------------------------------------------

async function processUrl(
  url: string,
  message: Message,
  channels: ChannelMap,
  db: Database,
): Promise<void> {
  await message.react('\u23F3'); // hourglass

  try {
    // Duplicate check
    const existing = getArticleByUrl(db, url);
    if (existing) {
      await message.react('\uD83D\uDD01'); // repeat
      console.log(`[bot] Skipping duplicate: ${url}`);
      return;
    }

    console.log(`[bot] Processing: ${url}`);

    // Run the pipeline
    const parsed = await fetchArticle(url);
    const lensResults = await processArticle(parsed);
    const scored = await scoreArticle(parsed, findLens(lensResults, 'summary'));

    const summary  = findLens(lensResults, 'summary');
    const strategy = findLens(lensResults, 'strategy');
    const signal   = findLens(lensResults, 'signal');

    // Post to intelligence channels
    await postTldr(channels, parsed.title, url, summary);
    await postApplyThis(channels, parsed.title, url, strategy);
    await postSignal(channels, parsed.title, url, signal);
    await postRouted(channels, parsed.title, url, scored.score, scored.route, summary);
    await postArchive(channels, parsed.title, url, scored.score, scored.route);

    // Persist
    const processed: ProcessedArticle = {
      id: crypto.randomUUID(),
      url,
      title: parsed.title,
      content: parsed.content,
      summary: summary?.output ?? '',
      applyAnalysis: strategy?.output ?? '',
      signalAnalysis: signal?.output ?? null,
      score: scored.score,
      route: scored.route,
      discordMessageId: message.id,
      sourceChannel: message.channelId,
      processedAt: new Date().toISOString(),
    };
    storeArticle(db, processed);

    // Swap hourglass for score emoji
    await removeReaction(message, '\u23F3');
    const emoji = SCORE_EMOJI[scored.score] ?? '\u2705';
    await message.react(emoji);

    console.log(`[bot] Done: "${parsed.title}" -- score ${scored.score}/10, route: ${scored.route}`);
  } catch (err) {
    await removeReaction(message, '\u23F3');
    await message.react('\u26A0\uFE0F'); // warning
    console.error(`[bot] Error processing ${url}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Channel posting helpers
// ---------------------------------------------------------------------------

function resolveChannel(channelId: string): TextChannel | null {
  const ch = _client.channels.cache.get(channelId);
  if (!ch || !ch.isTextBased()) return null;
  return ch as TextChannel;
}

async function sendEmbed(channelId: string, embed: EmbedBuilder): Promise<void> {
  const channel = resolveChannel(channelId);
  if (!channel) {
    console.warn(`[bot] Channel ${channelId} not in cache, skipping post`);
    return;
  }
  await channel.send({ embeds: [embed] });
}

async function postTldr(
  channels: ChannelMap,
  title: string,
  url: string,
  summary: LensResult | null,
): Promise<void> {
  if (!summary) return;
  const embed = new EmbedBuilder()
    .setColor(PL_CYAN)
    .setTitle(truncate(title, 256))
    .setURL(url)
    .setDescription(truncate(summary.output, MAX_EMBED_DESC))
    .setFooter({ text: 'Percival Labs -- Summarizer' })
    .setTimestamp();
  await sendEmbed(channels.tldr, embed);
}

async function postApplyThis(
  channels: ChannelMap,
  title: string,
  url: string,
  strategy: LensResult | null,
): Promise<void> {
  if (!strategy) return;
  const embed = new EmbedBuilder()
    .setColor(PL_CYAN)
    .setTitle(truncate(title, 256))
    .setURL(url)
    .setDescription(truncate(strategy.output, MAX_EMBED_DESC))
    .setFooter({ text: 'Percival Labs -- Strategist' })
    .setTimestamp();
  await sendEmbed(channels.applyThis, embed);
}

async function postSignal(
  channels: ChannelMap,
  title: string,
  url: string,
  signal: LensResult | null,
): Promise<void> {
  if (!signal) return;
  if (signal.output.includes('NO_SIGNAL')) return;

  const embed = new EmbedBuilder()
    .setColor(0xfbbf24) // amber for urgency
    .setTitle(truncate(`Signal: ${title}`, 256))
    .setURL(url)
    .setDescription(truncate(signal.output, MAX_EMBED_DESC))
    .setFooter({ text: 'Percival Labs -- Signal Detector' })
    .setTimestamp();
  await sendEmbed(channels.signals, embed);
}

async function postRouted(
  channels: ChannelMap,
  title: string,
  url: string,
  score: number,
  route: 'morning' | 'night' | 'archive',
  summary: LensResult | null,
): Promise<void> {
  const channelId =
    route === 'morning' ? channels.morningBrief :
    route === 'night'   ? channels.nightReads :
    null;
  if (!channelId) return;

  const routeLabel = route === 'morning' ? 'Morning Brief' : 'Night Reads';
  const emoji = SCORE_EMOJI[score] ?? '';

  const embed = new EmbedBuilder()
    .setColor(PL_CYAN)
    .setTitle(truncate(title, 256))
    .setURL(url)
    .setDescription(truncate(summary?.output ?? '', MAX_EMBED_DESC - 100))
    .setFooter({ text: `Score: ${score}/10 | Route: ${routeLabel} ${emoji}` })
    .setTimestamp();
  await sendEmbed(channelId, embed);
}

async function postArchive(
  channels: ChannelMap,
  title: string,
  url: string,
  score: number,
  route: 'morning' | 'night' | 'archive',
): Promise<void> {
  const routeLabel =
    route === 'morning' ? 'Morning Brief' :
    route === 'night'   ? 'Night Reads' :
    'Archive Only';
  const emoji = SCORE_EMOJI[score] ?? '';

  const embed = new EmbedBuilder()
    .setColor(0x6b7280) // gray for archive
    .setTitle(truncate(title, 256))
    .setURL(url)
    .setDescription(`Score: ${score}/10 | Route: ${routeLabel} ${emoji}`)
    .setTimestamp();
  await sendEmbed(channels.archive, embed);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function findLens(results: LensResult[], lens: LensResult['lens']): LensResult | null {
  return results.find(r => r.lens === lens) ?? null;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

async function removeReaction(message: Message, emoji: string): Promise<void> {
  try {
    await message.reactions.cache.get(emoji)?.users.remove(message.client.user!.id);
  } catch {
    // Non-fatal: reaction may already be gone or permissions insufficient
  }
}

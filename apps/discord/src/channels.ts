// Percival Labs -- Channel Manager
// Manages the Intelligence category and channels in the Discord server.
// Creates channels on startup if they don't exist.

import { Client, ChannelType, TextChannel, CategoryChannel } from 'discord.js';
import type { ChannelMap, OpsChannelMap } from './types';

const CATEGORY_NAME = 'Intelligence';

const CHANNEL_DEFS = [
  { key: 'drop',        name: 'drop',          topic: 'Drop any link here for agent analysis' },
  { key: 'tldr',        name: 'tldr',          topic: '5-bullet summaries from the Summarizer' },
  { key: 'applyThis',   name: 'apply-this',    topic: 'Relevance analysis from the Strategist' },
  { key: 'signals',     name: 'signals',       topic: 'Time-sensitive flags from the Signal detector' },
  { key: 'morningBrief', name: 'morning-brief', topic: 'Score 7+ articles -- curated daily brief' },
  { key: 'nightReads',  name: 'night-reads',   topic: 'Score 4-6 articles -- interesting but not urgent' },
  { key: 'archive',     name: 'archive',       topic: 'All processed articles' },
] as const;

/**
 * Ensure the Intelligence category and all pipeline channels exist.
 * Creates any missing channels. Returns a ChannelMap with channel IDs.
 */
export async function ensureChannels(client: Client, guildId: string): Promise<ChannelMap> {
  const guild = client.guilds.cache.get(guildId) ?? await client.guilds.fetch(guildId);
  if (!guild) {
    throw new Error(`[channels] Guild ${guildId} not found. Is the bot invited to the server?`);
  }

  // Find or create the Intelligence category
  let category = guild.channels.cache.find(
    (ch): ch is CategoryChannel =>
      ch.type === ChannelType.GuildCategory && ch.name === CATEGORY_NAME
  );

  if (!category) {
    console.log(`[channels] Creating category: ${CATEGORY_NAME}`);
    category = await guild.channels.create({
      name: CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
  } else {
    console.log(`[channels] Found existing category: ${CATEGORY_NAME}`);
  }

  // Ensure each channel exists within the category
  const channelMap: Record<string, string> = {};

  for (const def of CHANNEL_DEFS) {
    let channel = guild.channels.cache.find(
      (ch): ch is TextChannel =>
        ch.type === ChannelType.GuildText &&
        ch.name === def.name &&
        ch.parentId === category.id
    );

    if (!channel) {
      console.log(`[channels] Creating #${def.name}`);
      channel = await guild.channels.create({
        name: def.name,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: def.topic,
      });
    } else {
      console.log(`[channels] Found existing #${def.name}`);
    }

    channelMap[def.key] = channel.id;
  }

  return channelMap as unknown as ChannelMap;
}

// ── Operations Channels ──

const OPS_CATEGORY_NAME = 'Operations';

const OPS_CHANNEL_DEFS = [
  { key: 'tasks',     name: 'tasks',      topic: 'Submit tasks for the agent team' },
  { key: 'proposals', name: 'proposals',   topic: 'Agent work plans awaiting approval' },
  { key: 'results',   name: 'results',     topic: 'Agent task outputs and deliverables' },
  { key: 'activity',  name: 'activity',    topic: 'Live agent activity feed' },
  { key: 'xContent',  name: 'x-content',   topic: 'Draft tweets for @PercivalLabs — react ✅ to post, ❌ to reject' },
] as const;

/**
 * Ensure the Operations category and all ops channels exist.
 * Creates any missing channels. Returns an OpsChannelMap with channel IDs.
 */
export async function ensureOpsChannels(client: Client, guildId: string): Promise<OpsChannelMap> {
  const guild = client.guilds.cache.get(guildId) ?? await client.guilds.fetch(guildId);
  if (!guild) {
    throw new Error(`[channels] Guild ${guildId} not found. Is the bot invited to the server?`);
  }

  let category = guild.channels.cache.find(
    (ch): ch is CategoryChannel =>
      ch.type === ChannelType.GuildCategory && ch.name === OPS_CATEGORY_NAME
  );

  if (!category) {
    console.log(`[channels] Creating category: ${OPS_CATEGORY_NAME}`);
    category = await guild.channels.create({
      name: OPS_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
  } else {
    console.log(`[channels] Found existing category: ${OPS_CATEGORY_NAME}`);
  }

  const channelMap: Record<string, string> = {};

  for (const def of OPS_CHANNEL_DEFS) {
    let channel = guild.channels.cache.find(
      (ch): ch is TextChannel =>
        ch.type === ChannelType.GuildText &&
        ch.name === def.name &&
        ch.parentId === category.id
    );

    if (!channel) {
      console.log(`[channels] Creating #${def.name}`);
      channel = await guild.channels.create({
        name: def.name,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: def.topic,
      });
    } else {
      console.log(`[channels] Found existing #${def.name}`);
    }

    channelMap[def.key] = channel.id;
  }

  return channelMap as unknown as OpsChannelMap;
}

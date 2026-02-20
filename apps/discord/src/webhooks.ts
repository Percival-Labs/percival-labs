// Percival Labs — Webhook Manager
// Sends messages as individual agents with unique names and avatars.
// Caches one webhook per channel for reuse.

import { TextChannel, EmbedBuilder, type Webhook } from 'discord.js';

const webhookCache = new Map<string, Webhook>();

/**
 * Get or create a webhook for a text channel.
 * Caches the webhook for subsequent calls.
 */
async function getOrCreateWebhook(channel: TextChannel): Promise<Webhook> {
  const cached = webhookCache.get(channel.id);
  if (cached) return cached;

  // Check for existing PL webhook
  const existing = await channel.fetchWebhooks();
  let webhook = existing.find(wh => wh.name === 'Percival Labs Agent');

  if (!webhook) {
    webhook = await channel.createWebhook({
      name: 'Percival Labs Agent',
      reason: 'Per-agent identity for task outputs',
    });
  }

  webhookCache.set(channel.id, webhook);
  return webhook;
}

/**
 * Generate a unique avatar URL for an agent using DiceBear bottts.
 */
function agentAvatarUrl(agentName: string): string {
  return `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(agentName)}`;
}

/**
 * Send a message as a specific agent via webhook.
 * The message appears with the agent's name and a unique robot avatar.
 */
export async function sendAsAgent(
  channel: TextChannel,
  agentName: string,
  options: { content?: string; embeds?: EmbedBuilder[] },
): Promise<void> {
  const webhook = await getOrCreateWebhook(channel);

  await webhook.send({
    username: agentName,
    avatarURL: agentAvatarUrl(agentName),
    content: options.content,
    embeds: options.embeds?.map(e => e.toJSON()),
  });
}

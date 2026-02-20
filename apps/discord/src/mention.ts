// Percival Labs — @Mention Handler
// Responds to @PercivalLabs mentions in any channel.
// Short queries get a direct Coordinator response.
// Task-like messages get submitted to the agent team.

import { Client, Events, Message } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentBridge } from './agent-bridge';
import type { OpsChannelMap } from './types';
import { sendAsAgent } from './webhooks';
import { EmbedBuilder, TextChannel } from 'discord.js';

const PL_CYAN = 0x22d3ee;

// Heuristics for detecting task-like messages
const TASK_PATTERNS = [
  /\b(review|analyze|build|create|implement|write|fix|deploy|test|audit|research)\b/i,
  /\b(can you|please|could you)\b.*\b(the|our|this)\b/i,
];

function isTaskLike(content: string): boolean {
  // Messages over 100 chars or matching task patterns are treated as tasks
  if (content.length > 100) return true;
  return TASK_PATTERNS.some(p => p.test(content));
}

export function setupMentionHandler(
  client: Client,
  bridge: AgentBridge,
  opsChannels: OpsChannelMap,
): void {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.warn('[mention] No ANTHROPIC_API_KEY — @mention handler disabled');
    return;
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (!client.user) return;
    if (!message.mentions.has(client.user)) return;

    // Strip the @mention to get the actual message
    const content = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .trim();

    if (!content) {
      await message.reply({
        content: "I'm here. What do you need?",
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    // Task-like messages → submit to agent team
    if (isTaskLike(content)) {
      try {
        const title = content.split('\n')[0]!.slice(0, 100);
        await bridge.submitTask(title, content, 'medium', true);

        await message.reply({
          content: `On it. I've submitted this to the team \u2014 watch <#${opsChannels.proposals}> for the plan.`,
          allowedMentions: { repliedUser: false },
        });
      } catch (err) {
        console.error('[mention] Task submission failed:', err instanceof Error ? err.message : err);
        await message.reply({
          content: 'Something went wrong submitting that task. Try again or drop it in #tasks.',
          allowedMentions: { repliedUser: false },
        });
      }
      return;
    }

    // Short conversational queries → direct Coordinator response
    try {
      await message.channel.sendTyping();

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: [
          'You are the Coordinator of the Percival Labs agent team.',
          'You respond to quick questions from the team lead (Alan) in Discord.',
          'Be concise, direct, and helpful. Keep responses under 2000 characters.',
          'If the question is about team status, mention you can check via the agents API.',
        ].join('\n'),
        messages: [{ role: 'user', content }],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n\n');

      if (!text) return;

      // Send as Coordinator via webhook if it's a text channel
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        try {
          await sendAsAgent(message.channel as TextChannel, 'Coordinator', {
            content: text.slice(0, 2000),
          });
        } catch {
          // Fallback to regular reply
          await message.reply({
            content: text.slice(0, 2000),
            allowedMentions: { repliedUser: false },
          });
        }
      } else {
        await message.reply({
          content: text.slice(0, 2000),
          allowedMentions: { repliedUser: false },
        });
      }
    } catch (err) {
      console.error('[mention] Coordinator response failed:', err instanceof Error ? err.message : err);
      await message.reply({
        content: "I'm having trouble thinking right now. Try again in a moment.",
        allowedMentions: { repliedUser: false },
      });
    }
  });

  console.log('[mention] @mention handler ready');
}

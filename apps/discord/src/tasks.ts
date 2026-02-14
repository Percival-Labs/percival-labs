// Percival Labs — Task Submission Handler
// Listens for messages in #tasks and submits them to the agent team.
// Supports optional priority prefixes: !critical, !high, !low (default: medium)

import { Client, Events, Message } from 'discord.js';
import type { AgentBridge } from './agent-bridge';
import type { OpsChannelMap } from './types';

const PRIORITY_PREFIXES: Record<string, string> = {
  '!critical': 'critical',
  '!high': 'high',
  '!low': 'low',
};

function parsePriority(content: string): { priority: string; description: string } {
  const lower = content.toLowerCase();
  for (const [prefix, priority] of Object.entries(PRIORITY_PREFIXES)) {
    if (lower.startsWith(prefix)) {
      return {
        priority,
        description: content.slice(prefix.length).trim(),
      };
    }
  }
  return { priority: 'medium', description: content };
}

export function setupTaskHandler(
  client: Client,
  bridge: AgentBridge,
  opsChannels: OpsChannelMap,
): void {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (message.channelId !== opsChannels.tasks) return;

    const content = message.content.trim();
    if (!content) return;

    // Don't process ! commands here (handled by commands.ts)
    if (content.startsWith('!') && !content.startsWith('!critical') && !content.startsWith('!high') && !content.startsWith('!low')) {
      return;
    }

    const { priority, description } = parsePriority(content);
    if (!description) return;

    // Use first line as title, full content as description
    const lines = description.split('\n');
    const title = lines[0]!.slice(0, 100);

    try {
      await message.react('\u{1F4CB}'); // clipboard

      await bridge.submitTask(title, description, priority, true);

      await message.reply({
        content: `Task submitted to the team. Watch <#${opsChannels.proposals}> for the plan.`,
        allowedMentions: { repliedUser: false },
      });
    } catch (err) {
      console.error('[tasks] Failed to submit task:', err instanceof Error ? err.message : err);
      await message.react('\u26A0\uFE0F'); // warning
    }
  });

  console.log('[tasks] Task submission handler ready');
}

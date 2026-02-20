// Percival Labs — Task Output Handler
// Posts agent work products to #results using per-agent webhook identities.
// Subscribes to task_output events from the agent bridge.

import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import type { AgentBridge } from './agent-bridge';
import type { OpsChannelMap } from './types';
import { sendAsAgent } from './webhooks';

const PL_CYAN = 0x22d3ee;
const PL_RED = 0xef4444;
const MAX_EMBED_DESC = 4096;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

export function setupOutputHandler(
  client: Client,
  bridge: AgentBridge,
  opsChannels: OpsChannelMap,
): void {
  bridge.subscribe(async (event) => {
    if (event.type !== 'task_output') return;

    const { taskId, taskTitle, agentName, output, model, duration, success } = event.data as {
      taskId: string;
      taskTitle: string;
      agentName: string;
      output: string;
      model: string;
      duration: number;
      success: boolean;
    };

    const channel = client.channels.cache.get(opsChannels.results);
    if (!channel || !channel.isTextBased()) return;

    const durStr = duration ? `${(duration / 1000).toFixed(1)}s` : '?';
    const statusIcon = success ? '\u2705' : '\u274C';

    const embed = new EmbedBuilder()
      .setColor(success ? PL_CYAN : PL_RED)
      .setTitle(truncate(`${statusIcon} ${taskTitle}`, 256))
      .setDescription(truncate(output || '(no output)', MAX_EMBED_DESC))
      .setFooter({ text: `${model} | ${durStr} | Task: ${taskId}` })
      .setTimestamp();

    try {
      await sendAsAgent(channel as TextChannel, agentName, { embeds: [embed] });
    } catch (err) {
      // Fallback to regular message if webhook fails
      console.warn('[output] Webhook send failed, using fallback:', err instanceof Error ? err.message : err);
      try {
        await (channel as TextChannel).send({
          content: `**${agentName}** completed: ${taskTitle}`,
          embeds: [embed],
        });
      } catch (fallbackErr) {
        console.error('[output] Failed to send output:', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
      }
    }
  });

  console.log('[output] Task output handler ready');
}

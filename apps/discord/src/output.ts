// Percival Labs — Task Output Handler
// Posts clean one-line status to #results, verbose output to per-agent log channels.
// Subscribes to task_output events from the agent bridge.

import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import type { AgentBridge } from './agent-bridge';
import type { OpsChannelMap, AgentLogChannelMap } from './types';
import { AGENT_LOG_KEYS } from './types';
import { sendAsAgent } from './webhooks';

const PL_CYAN = 0x22d3ee;
const PL_RED = 0xef4444;
const PL_GRAY = 0x6b7280;
const MAX_EMBED_DESC = 4096;
const MAX_RESULTS_DESC = 500;  // Keep #results clean — short summaries only

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

export function setupOutputHandler(
  client: Client,
  bridge: AgentBridge,
  opsChannels: OpsChannelMap,
  logChannels?: AgentLogChannelMap,
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

    const durStr = duration ? `${(duration / 1000).toFixed(1)}s` : '?';
    const statusIcon = success ? '\u2705' : '\u274C';

    // ── #results: Clean one-line status ──
    const resultsChannel = client.channels.cache.get(opsChannels.results);
    if (resultsChannel?.isTextBased()) {
      const resultsEmbed = new EmbedBuilder()
        .setColor(success ? PL_CYAN : PL_RED)
        .setTitle(truncate(`${statusIcon} ${taskTitle}`, 256))
        .setDescription(truncate(output || '(no output)', MAX_RESULTS_DESC))
        .setFooter({ text: `${model} | ${durStr} | Task: ${taskId}` })
        .setTimestamp();

      try {
        await sendAsAgent(resultsChannel as TextChannel, agentName, { embeds: [resultsEmbed] });
      } catch (err) {
        console.warn('[output] Webhook send failed, using fallback:', err instanceof Error ? err.message : err);
        try {
          await (resultsChannel as TextChannel).send({
            content: `**${agentName}** completed: ${taskTitle}`,
            embeds: [resultsEmbed],
          });
        } catch (fallbackErr) {
          console.error('[output] Failed to send output:', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
        }
      }
    }

    // ── Per-agent log channel: Full verbose output ──
    if (logChannels) {
      const logKey = AGENT_LOG_KEYS[agentName.toLowerCase()];
      if (logKey) {
        const logChannelId = logChannels[logKey];
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel?.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setColor(success ? PL_GRAY : PL_RED)
            .setTitle(truncate(`${taskTitle}`, 256))
            .setDescription(truncate(output || '(no output)', MAX_EMBED_DESC))
            .setFooter({ text: `${model} | ${durStr} | Task: ${taskId}` })
            .setTimestamp();

          try {
            await sendAsAgent(logChannel as TextChannel, agentName, { embeds: [logEmbed] });
          } catch {
            // Non-critical — verbose logs can be lost
          }
        }
      }
    }
  });

  console.log('[output] Task output handler ready');
}

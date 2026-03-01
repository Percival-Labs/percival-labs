// Percival Labs — Audit Feed
// Posts watcher enforcement actions to #audit channel.
// Every blocked transition, allowed transition, and evidence event gets logged here.

import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import type { AgentBridge } from './agent-bridge';
import type { OpsChannelMap } from './types';
import { sendAsAgent } from './webhooks';

const PL_RED = 0xef4444;
const PL_GREEN = 0x22c55e;
const PL_AMBER = 0xfbbf24;
const PL_CYAN = 0x22d3ee;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

export function setupAuditFeed(
  client: Client,
  bridge: AgentBridge,
  opsChannels: OpsChannelMap,
): void {
  function getAuditChannel(): TextChannel | null {
    const ch = client.channels.cache.get(opsChannels.audit);
    if (!ch || !ch.isTextBased()) return null;
    return ch as TextChannel;
  }

  bridge.subscribe(async (event) => {
    const channel = getAuditChannel();
    if (!channel) return;

    switch (event.type) {
      case 'watcher_blocked': {
        const { taskId, from, to, actor, rule } = event.data as {
          taskId: string;
          from: string;
          to: string;
          actor: string;
          rule: string;
        };

        const embed = new EmbedBuilder()
          .setColor(PL_RED)
          .setTitle(`BLOCKED: ${taskId}`)
          .setDescription(truncate(rule, 4096))
          .addFields(
            { name: 'Transition', value: `${from} \u2192 ${to}`, inline: true },
            { name: 'Agent', value: actor, inline: true },
          )
          .setTimestamp();

        try {
          await sendAsAgent(channel, 'Watcher', { embeds: [embed] });
        } catch {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
        break;
      }

      case 'watcher_allowed': {
        const { taskId, from, to, actor } = event.data as {
          taskId: string;
          from: string;
          to: string;
          actor: string;
        };

        const embed = new EmbedBuilder()
          .setColor(PL_GREEN)
          .setTitle(`ALLOWED: ${taskId}`)
          .addFields(
            { name: 'Transition', value: `${from} \u2192 ${to}`, inline: true },
            { name: 'Agent', value: actor, inline: true },
          )
          .setTimestamp();

        try {
          await sendAsAgent(channel, 'Watcher', { embeds: [embed] });
        } catch {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
        break;
      }

      case 'evidence_submitted': {
        const { taskId, agent, evidenceType, summary } = event.data as {
          taskId: string;
          agent: string;
          evidenceType: string;
          summary: string;
        };

        const embed = new EmbedBuilder()
          .setColor(PL_CYAN)
          .setTitle(`EVIDENCE: ${taskId}`)
          .setDescription(truncate(summary, 4096))
          .addFields(
            { name: 'Agent', value: agent, inline: true },
            { name: 'Type', value: evidenceType, inline: true },
          )
          .setTimestamp();

        try {
          await sendAsAgent(channel, 'Watcher', { embeds: [embed] });
        } catch {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
        break;
      }

      case 'evidence_rejected': {
        const { taskId, agent, reason } = event.data as {
          taskId: string;
          agent: string;
          reason: string;
        };

        const embed = new EmbedBuilder()
          .setColor(PL_AMBER)
          .setTitle(`EVIDENCE REJECTED: ${taskId}`)
          .setDescription(truncate(reason, 4096))
          .addFields(
            { name: 'Agent', value: agent, inline: true },
          )
          .setTimestamp();

        try {
          await sendAsAgent(channel, 'Watcher', { embeds: [embed] });
        } catch {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
        break;
      }
    }
  });

  console.log('[audit] Audit feed handler ready');
}

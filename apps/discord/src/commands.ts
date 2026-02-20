// Percival Labs — Operations Commands
// Handles ! prefix commands in Operations channels.
// Mobile-friendly: short responses, emoji indicators, no walls of text.

import { Client, Events, Message, EmbedBuilder } from 'discord.js';
import type { AgentBridge } from './agent-bridge';
import type { OpsChannelMap } from './types';

const PL_CYAN = 0x22d3ee;

export function setupCommands(
  client: Client,
  bridge: AgentBridge,
  opsChannels: OpsChannelMap,
): void {
  const opsChannelIds = new Set(Object.values(opsChannels));

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (!opsChannelIds.has(message.channelId)) return;
    if (!message.content.startsWith('!')) return;

    const [command] = message.content.slice(1).split(/\s+/);
    if (!command) return;

    try {
      switch (command.toLowerCase()) {
        case 'status':
          await handleStatus(message, bridge);
          break;
        case 'budget':
          await handleBudget(message, bridge);
          break;
        case 'tasks':
          await handleTasks(message, bridge);
          break;
        case 'start':
          await handleStart(message, bridge);
          break;
        case 'stop':
          await handleStop(message, bridge);
          break;
        // Priority prefixes handled by tasks.ts, ignore here
        case 'critical':
        case 'high':
        case 'low':
          break;
        default:
          await message.reply({
            content: 'Unknown command. Available: `!status`, `!budget`, `!tasks`, `!start`, `!stop`',
            allowedMentions: { repliedUser: false },
          });
      }
    } catch (err) {
      console.error('[commands] Error:', err instanceof Error ? err.message : err);
      await message.reply({
        content: '\u26A0\uFE0F Agent service unreachable',
        allowedMentions: { repliedUser: false },
      });
    }
  });

  console.log('[commands] Command handler ready');
}

async function handleStatus(message: Message, bridge: AgentBridge): Promise<void> {
  const status = await bridge.getStatus() as {
    agents: Array<{ name: string; role: string }>;
    tasks: Record<string, number>;
    hasApiKey: boolean;
  };

  const agentList = status.agents
    .map(a => `\u2022 **${a.name}** \u2014 ${a.role}`)
    .join('\n');

  const t = status.tasks;
  const taskLine = [
    t.pending && `${t.pending} pending`,
    t.in_progress && `${t.in_progress} active`,
    t.completed && `${t.completed} done`,
    t.blocked && `${t.blocked} blocked`,
    t.awaiting_approval && `${t.awaiting_approval} awaiting approval`,
  ].filter(Boolean).join(' | ') || 'No tasks';

  const embed = new EmbedBuilder()
    .setColor(PL_CYAN)
    .setTitle('\u{1F4CA} Team Status')
    .setDescription(agentList)
    .addFields(
      { name: 'Tasks', value: taskLine },
      { name: 'API Key', value: status.hasApiKey ? '\u2705 Configured' : '\u274C Missing', inline: true },
      { name: 'Bridge', value: bridge.isConnected ? '\u2705 Connected' : '\u274C Disconnected', inline: true },
    )
    .setTimestamp();

  await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
}

async function handleBudget(message: Message, bridge: AgentBridge): Promise<void> {
  const raw = await bridge.getBudget() as {
    daily: { spent: number; limit: number; remaining: number; percentage: number };
    totalRecords: number;
  };

  const d = raw.daily;
  const pct = Math.round(d.percentage * 100);
  const bar = '\u2588'.repeat(Math.round(pct / 10)) + '\u2591'.repeat(10 - Math.round(pct / 10));
  const exhausted = d.remaining <= 0;

  const embed = new EmbedBuilder()
    .setColor(exhausted ? 0xef4444 : PL_CYAN)
    .setTitle('\u{1F4B0} Budget')
    .setDescription(
      `\`[${bar}]\` ${pct}%\n` +
      `$${d.spent.toFixed(4)} / $${d.limit.toFixed(2)}\n` +
      `${raw.totalRecords} API calls today`
    )
    .setTimestamp();

  await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
}

async function handleTasks(message: Message, bridge: AgentBridge): Promise<void> {
  const result = await bridge.getTasks() as {
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      assignedTo: string | null;
      priority: string;
    }>;
    total: number;
  };

  if (result.total === 0) {
    await message.reply({
      content: '\u{1F4ED} No tasks in the queue',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // Show active/pending tasks (skip completed unless nothing else)
  const active = result.tasks.filter(t => t.status !== 'completed');
  const display = active.length > 0 ? active.slice(0, 10) : result.tasks.slice(-5);

  const lines = display.map(t => {
    const statusIcon =
      t.status === 'in_progress' ? '\u26A1' :
      t.status === 'pending' ? '\u23F3' :
      t.status === 'awaiting_approval' ? '\u{1F4CB}' :
      t.status === 'blocked' ? '\u{1F6AB}' :
      '\u2705';
    const agent = t.assignedTo ? ` \u2192 ${t.assignedTo}` : '';
    return `${statusIcon} ${t.title}${agent}`;
  });

  const embed = new EmbedBuilder()
    .setColor(PL_CYAN)
    .setTitle(`\u{1F4DD} Tasks (${result.total} total)`)
    .setDescription(lines.join('\n'))
    .setTimestamp();

  await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
}

async function handleStart(message: Message, bridge: AgentBridge): Promise<void> {
  await bridge.startAutoTick();
  await message.reply({
    content: '\u{1F504} Auto-tick started',
    allowedMentions: { repliedUser: false },
  });
}

async function handleStop(message: Message, bridge: AgentBridge): Promise<void> {
  await bridge.stopAutoTick();
  await message.reply({
    content: '\u23F9\uFE0F Auto-tick stopped',
    allowedMentions: { repliedUser: false },
  });
}

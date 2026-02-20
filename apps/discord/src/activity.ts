// Percival Labs — Activity Feed
// Streams agent events to #activity channel as short Discord messages.
// Throttles to max 1 message per 2 seconds to avoid spam.

import { Client, TextChannel } from 'discord.js';
import type { AgentBridge } from './agent-bridge';
import type { OpsChannelMap } from './types';

interface QueuedMessage {
  text: string;
  timestamp: number;
}

const THROTTLE_MS = 2000;

// Event types to skip (too noisy for Discord)
const SKIP_EVENTS = new Set([
  'tick_started',
  'tick_completed',
  'auto_tick_started',
  'auto_tick_stopped',
  'task_output',
]);

function formatEvent(type: string, data: Record<string, unknown>): string | null {
  switch (type) {
    case 'task_submitted':
      return `\u{1F4CB} **New task:** ${data.title}`;
    case 'task_decomposed':
      return `\u{1F500} **Percy** broke "${data.parentTaskId}" into ${data.subtaskCount} subtasks`;
    case 'proposal_created':
      return `\u{23F3} **Proposal waiting** \u2014 check #proposals`;
    case 'proposal_approved':
      return `\u2705 **Proposal approved** \u2014 ${data.subtasksApproved} subtasks unlocked`;
    case 'proposal_rejected':
      return `\u274C **Proposal rejected** \u2014 ${data.subtasksRejected} subtasks blocked`;
    case 'task_assigned':
      return `\u{1F527} **${data.agentName}** picking up: ${data.taskTitle}`;
    case 'agent_started':
      return `\u26A1 **${data.agentName}** working on: ${data.taskTitle}`;
    case 'agent_completed': {
      const dur = data.duration ? `${((data.duration as number) / 1000).toFixed(1)}s` : '?';
      return `\u2705 **${data.agentName}** finished: ${data.taskTitle} (${dur})`;
    }
    case 'agent_failed':
      return `\u274C **${data.agentName}** hit a wall on: ${data.taskTitle}`;
    case 'task_budget_blocked':
      return `\u{1F6AB} **Budget blocked** task: ${data.taskId}`;
    case 'budget_warning':
      return `\u26A0\uFE0F Budget at ${Math.round((data.percentage as number) * 100)}% \u2014 $${(data.current as number).toFixed(2)} of $${(data.limit as number).toFixed(2)}`;
    case 'budget_exhausted':
      return `\u{1F6D1} Daily budget exhausted`;
    default:
      return null;
  }
}

export function setupActivityFeed(
  client: Client,
  bridge: AgentBridge,
  opsChannels: OpsChannelMap,
): void {
  const queue: QueuedMessage[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function getActivityChannel(): TextChannel | null {
    const ch = client.channels.cache.get(opsChannels.activity);
    if (!ch || !ch.isTextBased()) return null;
    return ch as TextChannel;
  }

  async function flush(): Promise<void> {
    flushTimer = null;
    if (queue.length === 0) return;

    const channel = getActivityChannel();
    if (!channel) return;

    // Batch queued messages into one
    const messages = queue.splice(0, queue.length);
    const combined = messages.map(m => m.text).join('\n');

    try {
      await channel.send(combined);
    } catch (err) {
      console.error('[activity] Failed to send:', err instanceof Error ? err.message : err);
    }
  }

  bridge.subscribe((event) => {
    if (SKIP_EVENTS.has(event.type)) return;

    const text = formatEvent(event.type, event.data);
    if (!text) return;

    queue.push({ text, timestamp: Date.now() });

    // Throttle: flush after THROTTLE_MS if not already scheduled
    if (!flushTimer) {
      flushTimer = setTimeout(flush, THROTTLE_MS);
    }
  });

  console.log('[activity] Activity feed handler ready');
}

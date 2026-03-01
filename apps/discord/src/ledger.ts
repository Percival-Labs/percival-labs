// Percival Labs — Task Ledger
// Maintains a pinned message in #ledger showing canonical task state.
// Auto-updates on every task state change event from the agent bridge.

import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import type { AgentBridge } from './agent-bridge';
import type { OpsChannelMap } from './types';

const PL_CYAN = 0x22d3ee;
const DEBOUNCE_MS = 3000;  // Wait 3s after last event before updating (batch changes)

interface TaskSummary {
  id: string;
  status: string;
  assignedTo: string | null;
  title: string;
}

export function setupLedger(
  client: Client,
  bridge: AgentBridge,
  opsChannels: OpsChannelMap,
): void {
  let pinnedMessageId: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function getLedgerChannel(): TextChannel | null {
    const ch = client.channels.cache.get(opsChannels.ledger);
    if (!ch || !ch.isTextBased()) return null;
    return ch as TextChannel;
  }

  // Events that trigger a ledger refresh
  const TRIGGER_EVENTS = new Set([
    'task_submitted',
    'task_decomposed',
    'task_assigned',
    'agent_completed',
    'agent_failed',
    'proposal_approved',
    'proposal_rejected',
    'watcher_blocked',
    'watcher_allowed',
    'evidence_submitted',
    'evidence_rejected',
    'task_failed',
    'ledger_updated',
  ]);

  /**
   * Fetch current task list from the agent service and format as a ledger embed.
   */
  async function buildLedgerEmbed(): Promise<EmbedBuilder | null> {
    try {
      const response = await bridge.getTasks() as { tasks?: TaskSummary[] };
      const tasks = response.tasks ?? [];
      if (!tasks || tasks.length === 0) {
        return new EmbedBuilder()
          .setColor(PL_CYAN)
          .setTitle('TASK LEDGER')
          .setDescription('No tasks in the system.')
          .setFooter({ text: `Last updated: ${new Date().toUTCString()}` });
      }

      // Group tasks by status
      const active = tasks.filter(t =>
        t.status === 'in_progress' || t.status === 'pending' ||
        t.status === 'awaiting_approval' || t.status === 'evidence_submitted'
      );
      const blocked = tasks.filter(t => t.status === 'blocked');
      const completedToday = tasks.filter(t => {
        if (t.status !== 'completed') return false;
        // Only show tasks completed in the last 24h
        return true; // We don't have completedAt in summary, show all completed
      });
      const failed = tasks.filter(t => t.status === 'failed');

      const sections: string[] = [];

      if (active.length > 0) {
        const lines = active.slice(0, 15).map(t => {
          const agent = t.assignedTo ? t.assignedTo.toLowerCase() : '\u2014';
          const statusTag = `[${t.status.toUpperCase()}]`;
          return `\`${t.id.slice(0, 16)}\`  ${statusTag}  **${agent}**  ${truncate(t.title, 40)}`;
        });
        sections.push(`**ACTIVE** (${active.length})\n${lines.join('\n')}`);
      }

      if (blocked.length > 0) {
        const lines = blocked.slice(0, 10).map(t => {
          const agent = t.assignedTo ? t.assignedTo.toLowerCase() : '\u2014';
          return `\`${t.id.slice(0, 16)}\`  [BLOCKED]  **${agent}**  ${truncate(t.title, 40)}`;
        });
        sections.push(`**BLOCKED** (${blocked.length})\n${lines.join('\n')}`);
      }

      if (completedToday.length > 0) {
        const lines = completedToday.slice(0, 10).map(t => {
          const agent = t.assignedTo ? t.assignedTo.toLowerCase() : '\u2014';
          return `\`${t.id.slice(0, 16)}\`  [DONE]  **${agent}**  ${truncate(t.title, 40)}`;
        });
        sections.push(`**COMPLETED** (${completedToday.length})\n${lines.join('\n')}`);
      }

      if (failed.length > 0) {
        const lines = failed.slice(0, 5).map(t => {
          const agent = t.assignedTo ? t.assignedTo.toLowerCase() : '\u2014';
          return `\`${t.id.slice(0, 16)}\`  [FAILED]  **${agent}**  ${truncate(t.title, 40)}`;
        });
        sections.push(`**FAILED** (${failed.length})\n${lines.join('\n')}`);
      }

      const description = sections.join('\n\n') || 'No tasks.';

      return new EmbedBuilder()
        .setColor(PL_CYAN)
        .setTitle('TASK LEDGER')
        .setDescription(truncate(description, 4096))
        .setFooter({ text: `Last updated: ${new Date().toUTCString()} | ${tasks.length} total tasks` });
    } catch (err) {
      console.error('[ledger] Failed to build ledger:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * Update the pinned ledger message, or create one if it doesn't exist.
   */
  async function refreshLedger(): Promise<void> {
    const channel = getLedgerChannel();
    if (!channel) return;

    const embed = await buildLedgerEmbed();
    if (!embed) return;

    try {
      if (pinnedMessageId) {
        // Try to edit existing message
        try {
          const msg = await channel.messages.fetch(pinnedMessageId);
          await msg.edit({ embeds: [embed] });
          return;
        } catch {
          // Message was deleted or inaccessible — create new one
          pinnedMessageId = null;
        }
      }

      // Create new message and pin it
      const msg = await channel.send({ embeds: [embed] });
      await msg.pin().catch(() => {});  // Pin silently — may fail if 50 pins reached
      pinnedMessageId = msg.id;
    } catch (err) {
      console.error('[ledger] Failed to update ledger:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * On startup, find the existing pinned ledger message (if any).
   */
  async function findExistingPin(): Promise<void> {
    const channel = getLedgerChannel();
    if (!channel) return;

    try {
      const pins = await channel.messages.fetchPinned();
      // Find our ledger message (title = "TASK LEDGER")
      const existing = pins.find(m =>
        m.author.id === client.user?.id &&
        m.embeds.length > 0 &&
        m.embeds[0]?.title === 'TASK LEDGER'
      );
      if (existing) {
        pinnedMessageId = existing.id;
        console.log(`[ledger] Found existing pinned ledger: ${existing.id}`);
      }
    } catch {
      // Non-critical — we'll create a new one
    }
  }

  // Subscribe to events that should trigger a ledger refresh
  bridge.subscribe((event) => {
    if (!TRIGGER_EVENTS.has(event.type)) return;

    // Debounce: wait for events to settle before refreshing
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      refreshLedger();
    }, DEBOUNCE_MS);
  });

  // Find existing pin and do initial refresh
  findExistingPin().then(() => refreshLedger());

  console.log('[ledger] Task ledger handler ready');
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

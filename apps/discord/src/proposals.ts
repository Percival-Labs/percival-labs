// Percival Labs — Proposal Display + Approval Handler
// Posts proposal embeds to #proposals when proposals are created.
// Handles reaction-based approval (checkmark) and rejection (cross).

import { Client, Events, EmbedBuilder, TextChannel, MessageReaction, User } from 'discord.js';
import type { AgentBridge } from './agent-bridge';
import type { OpsChannelMap } from './types';

const PL_CYAN = 0x22d3ee;
const APPROVED_GREEN = 0x22c55e;
const REJECTED_RED = 0xef4444;

// In-memory tracking: Discord message ID → agent proposal parent ID
const proposalMap = new Map<string, string>();

export function setupProposalHandler(
  client: Client,
  bridge: AgentBridge,
  opsChannels: OpsChannelMap,
): void {
  function getProposalsChannel(): TextChannel | null {
    const ch = client.channels.cache.get(opsChannels.proposals);
    if (!ch || !ch.isTextBased()) return null;
    return ch as TextChannel;
  }

  // Listen for proposal_created events from the agent bridge
  bridge.subscribe(async (event) => {
    if (event.type !== 'proposal_created') return;

    const channel = getProposalsChannel();
    if (!channel) return;

    const data = event.data;
    const subtasks = (data.subtasks || []) as Array<{
      id: string;
      title: string;
      description: string;
      assignedTo: string | null;
    }>;

    const subtaskList = subtasks
      .map((s, i) => `**${i + 1}.** ${s.title}${s.assignedTo ? ` \u2192 ${s.assignedTo}` : ''}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(PL_CYAN)
      .setTitle(`\u{1F4CB} ${data.title as string}`)
      .setDescription(
        (data.description ? `${data.description}\n\n` : '') +
        '**Subtasks:**\n' +
        subtaskList
      )
      .addFields(
        { name: 'Subtasks', value: `${subtasks.length}`, inline: true },
      )
      .setFooter({ text: 'React \u2705 to approve or \u274C to reject' })
      .setTimestamp();

    try {
      const msg = await channel.send({ embeds: [embed] });

      // Add seed reactions
      await msg.react('\u2705');
      await msg.react('\u274C');

      // Track this message
      proposalMap.set(msg.id, data.parentId as string);
    } catch (err) {
      console.error('[proposals] Failed to post proposal:', err instanceof Error ? err.message : err);
    }
  });

  // Handle reactions on proposal messages
  client.on(Events.MessageReactionAdd, async (reaction: MessageReaction, user: User) => {
    // Ignore bot reactions (our own seed reactions)
    if (user.bot) return;

    // Check if this is a tracked proposal message
    const parentId = proposalMap.get(reaction.message.id);
    if (!parentId) return;

    const emoji = reaction.emoji.name;
    if (emoji !== '\u2705' && emoji !== '\u274C') return;

    try {
      // Fetch the full message if partial
      const message = reaction.message.partial
        ? await reaction.message.fetch()
        : reaction.message;

      const oldEmbed = message.embeds[0];
      if (!oldEmbed) return;

      if (emoji === '\u2705') {
        // Approve
        await bridge.approveProposal(parentId);

        const updatedEmbed = EmbedBuilder.from(oldEmbed)
          .setColor(APPROVED_GREEN)
          .setFooter({ text: `Approved by ${user.displayName}` });

        await message.edit({ embeds: [updatedEmbed] });
      } else {
        // Reject
        await bridge.rejectProposal(parentId);

        const updatedEmbed = EmbedBuilder.from(oldEmbed)
          .setColor(REJECTED_RED)
          .setFooter({ text: `Rejected by ${user.displayName}` });

        await message.edit({ embeds: [updatedEmbed] });
      }

      // Remove from tracking
      proposalMap.delete(reaction.message.id);
    } catch (err) {
      console.error('[proposals] Failed to process reaction:', err instanceof Error ? err.message : err);
    }
  });

  console.log('[proposals] Proposal handler ready');
}

// Percival Labs — X Content Approval Pipeline
// Posts draft tweets to #x-content for review.
// React ✅ to publish to @PercivalLabs, ❌ to reject.

import {
  Client,
  Events,
  EmbedBuilder,
  TextChannel,
  MessageReaction,
  User,
} from "discord.js";
import { TwitterApi } from "twitter-api-v2";
import type { OpsChannelMap } from "./types";

const PL_CYAN = 0x22d3ee;
const POSTED_GREEN = 0x22c55e;
const REJECTED_RED = 0xef4444;
const PENDING_AMBER = 0xf59e0b;

// Track draft message IDs → draft content
const draftMap = new Map<
  string,
  { content: string; thread?: string[]; authorId: string }
>();

function getTwitterClient(): TwitterApi | null {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.warn("[x-posting] Twitter API credentials not configured");
    return null;
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

function charCount(text: string): string {
  const len = text.length;
  const color = len > 280 ? "\u{1F534}" : len > 250 ? "\u{1F7E1}" : "\u{1F7E2}";
  return `${color} ${len}/280`;
}

export function setupXPosting(
  client: Client,
  opsChannels: OpsChannelMap
): void {
  function getXChannel(): TextChannel | null {
    const ch = client.channels.cache.get(opsChannels.xContent);
    if (!ch || !ch.isTextBased()) return null;
    return ch as TextChannel;
  }

  // Watch for messages in #x-content — treat them as draft tweets
  client.on(Events.MessageCreate, async (message) => {
    // Ignore bots and messages outside #x-content
    if (message.author.bot) return;
    if (message.channelId !== opsChannels.xContent) return;

    const text = message.content.trim();
    if (!text) return;

    // Check for thread format: tweets separated by ---
    const parts = text
      .split(/\n---\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const isThread = parts.length > 1;

    // Build the preview embed
    const embed = new EmbedBuilder()
      .setColor(PENDING_AMBER)
      .setTitle(isThread ? `\u{1F9F5} Thread Draft (${parts.length} tweets)` : "\u{1F4DD} Tweet Draft")
      .setFooter({ text: "React \u2705 to post to @PercivalLabs or \u274C to reject" })
      .setTimestamp();

    if (isThread) {
      for (let i = 0; i < parts.length; i++) {
        embed.addFields({
          name: `Tweet ${i + 1} ${charCount(parts[i])}`,
          value: truncate(parts[i], 1024),
        });
      }
    } else {
      embed.setDescription(text);
      embed.addFields({
        name: "Characters",
        value: charCount(text),
        inline: true,
      });
    }

    try {
      // Delete the original message to keep the channel clean
      await message.delete().catch(() => {});

      const draftMsg = await getXChannel()?.send({ embeds: [embed] });
      if (!draftMsg) return;

      await draftMsg.react("\u2705");
      await draftMsg.react("\u274C");

      // Track the draft
      draftMap.set(draftMsg.id, {
        content: isThread ? parts[0] : text,
        thread: isThread ? parts : undefined,
        authorId: message.author.id,
      });
    } catch (err) {
      console.error(
        "[x-posting] Failed to create draft:",
        err instanceof Error ? err.message : err
      );
    }
  });

  // Handle approval/rejection reactions
  client.on(
    Events.MessageReactionAdd,
    async (reaction: MessageReaction, user: User) => {
      if (user.bot) return;

      const draft = draftMap.get(reaction.message.id);
      if (!draft) return;

      const emoji = reaction.emoji.name;
      if (emoji !== "\u2705" && emoji !== "\u274C") return;

      try {
        const message = reaction.message.partial
          ? await reaction.message.fetch()
          : reaction.message;

        const oldEmbed = message.embeds[0];
        if (!oldEmbed) return;

        if (emoji === "\u2705") {
          // Post to X
          const twitter = getTwitterClient();
          if (!twitter) {
            const errEmbed = EmbedBuilder.from(oldEmbed)
              .setColor(REJECTED_RED)
              .setFooter({
                text: "Failed: Twitter API credentials not configured",
              });
            await message.edit({ embeds: [errEmbed] });
            draftMap.delete(reaction.message.id);
            return;
          }

          let tweetUrl: string;

          if (draft.thread && draft.thread.length > 1) {
            // Post thread
            let lastTweetId: string | null = null;
            for (let i = 0; i < draft.thread.length; i++) {
              const options = lastTweetId
                ? { reply: { in_reply_to_tweet_id: lastTweetId } }
                : {};
              const tweet = await twitter.v2.tweet(draft.thread[i], options);
              lastTweetId = tweet.data.id;
              if (i < draft.thread.length - 1) {
                await new Promise((r) => setTimeout(r, 1000));
              }
            }
            tweetUrl = `https://x.com/PercivalLabs/status/${lastTweetId}`;
          } else {
            // Post single tweet
            const tweet = await twitter.v2.tweet(draft.content);
            tweetUrl = `https://x.com/PercivalLabs/status/${tweet.data.id}`;
          }

          const postedEmbed = EmbedBuilder.from(oldEmbed)
            .setColor(POSTED_GREEN)
            .setFooter({
              text: `Posted by ${user.displayName}`,
            })
            .addFields({ name: "Link", value: tweetUrl });

          await message.edit({ embeds: [postedEmbed] });
          console.log(`[x-posting] Published: ${tweetUrl}`);
        } else {
          // Reject
          const rejectedEmbed = EmbedBuilder.from(oldEmbed)
            .setColor(REJECTED_RED)
            .setFooter({ text: `Rejected by ${user.displayName}` });

          await message.edit({ embeds: [rejectedEmbed] });
          console.log("[x-posting] Draft rejected");
        }

        draftMap.delete(reaction.message.id);
      } catch (err) {
        console.error(
          "[x-posting] Failed to process:",
          err instanceof Error ? err.message : err
        );

        // Update embed with error
        try {
          const message = reaction.message.partial
            ? await reaction.message.fetch()
            : reaction.message;
          const oldEmbed = message.embeds[0];
          if (oldEmbed) {
            const errEmbed = EmbedBuilder.from(oldEmbed)
              .setColor(REJECTED_RED)
              .setFooter({
                text: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
              });
            await message.edit({ embeds: [errEmbed] });
          }
        } catch {
          // Best effort
        }
        draftMap.delete(reaction.message.id);
      }
    }
  );

  console.log("[x-posting] X content pipeline ready");
}

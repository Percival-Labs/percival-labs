/**
 * Post a tweet, thread, or process the campaign queue.
 *
 * Usage:
 *   bun scripts/x/post.ts "Your tweet text here"
 *   bun scripts/x/post.ts --thread "Tweet 1" "Tweet 2" "Tweet 3"
 *   bun scripts/x/post.ts --queue           # process next campaign phase
 *   bun scripts/x/post.ts --queue --dry-run # preview next actionable phase
 *
 * The queue processor executes ONE phase per invocation. launchd calls this
 * every 10 minutes; the processor checks the 8am-10pm PST time window itself.
 *
 * Safety:
 *   - Thread tweets are spaced 12s apart with ±5s random jitter
 *   - 429 responses trigger exponential backoff (up to 3 retries)
 *   - Automated replies to other users require manual posting per X policy
 */
import { getClient } from "./client";
import {
  humanDelay,
  safeTweet,
  readQueue,
  writeQueue,
  isWithinPostingWindow,
} from "./lib";
import type { QueueCampaign, QueuePhase } from "./types";

const args = process.argv.slice(2);
const isThread = args[0] === "--thread";
const isQueue = args[0] === "--queue";
const isDryRun = args.includes("--dry-run");

// ── Direct Posting (unchanged) ──────────────────────────────────────

async function postTweet(text: string) {
  const client = getClient();
  const tweet = await safeTweet(client, text);
  console.log(`Posted: ${tweet!.data.id}`);
  console.log(`https://x.com/PercivalLabs/status/${tweet!.data.id}`);
  return tweet;
}

async function postThread(tweets: string[], replyTo?: string) {
  const client = getClient();
  let lastTweetId: string | null = replyTo ?? null;
  const tweetIds: string[] = [];

  for (let i = 0; i < tweets.length; i++) {
    const options = lastTweetId
      ? { reply: { in_reply_to_tweet_id: lastTweetId } }
      : {};

    const tweet = await safeTweet(client, tweets[i], options);
    const id = tweet!.data.id;
    console.log(`[${i + 1}/${tweets.length}] ${id}`);
    tweetIds.push(id);
    lastTweetId = id;

    if (i < tweets.length - 1) {
      await humanDelay();
    }
  }

  console.log(
    `\nThread posted: https://x.com/PercivalLabs/status/${lastTweetId}`
  );
  return tweetIds;
}

// ── Campaign Queue Processor ────────────────────────────────────────

async function processQueue() {
  const campaigns = await readQueue();

  if (campaigns.length === 0) {
    console.log("Queue empty — no campaigns.");
    return;
  }

  // Time window check (skip in dry-run mode so we can always preview)
  if (!isDryRun && !isWithinPostingWindow()) {
    console.log("Outside posting window (8am-10pm PST). Exiting.");
    return;
  }

  const now = new Date();

  // Find first campaign with an actionable phase
  let targetCampaign: QueueCampaign | null = null;
  let targetPhaseIdx = -1;

  for (const campaign of campaigns) {
    if (campaign.status === "completed" || campaign.status === "failed") {
      continue;
    }

    for (let i = 0; i < campaign.phases.length; i++) {
      const phase = campaign.phases[i];

      // Skip already posted or exhausted phases
      if (phase.posted || (phase.retries ?? 0) >= 3) continue;

      // Phase 0: check campaign.scheduled
      if (i === 0) {
        if (new Date(campaign.scheduled) > now) continue;
      } else {
        // Phase N: check phase.scheduledAt (set after previous phase completed)
        if (!phase.scheduledAt || new Date(phase.scheduledAt) > now) continue;
        // Also verify previous phase is done
        const prev = campaign.phases[i - 1];
        if (!prev.posted) continue;
      }

      targetCampaign = campaign;
      targetPhaseIdx = i;
      break;
    }

    if (targetCampaign) break;
  }

  if (!targetCampaign || targetPhaseIdx === -1) {
    // Show status summary
    const pending = campaigns.filter(
      (c) => c.status !== "completed" && c.status !== "failed"
    );
    if (pending.length === 0) {
      console.log("All campaigns completed.");
    } else {
      console.log(`${pending.length} campaign(s) pending. Next phases:`);
      for (const c of pending) {
        const nextPhase = c.phases.find((p) => !p.posted);
        if (nextPhase) {
          const schedTime =
            c.phases.indexOf(nextPhase) === 0
              ? c.scheduled
              : nextPhase.scheduledAt || "awaiting previous";
          console.log(`  ${c.id}: "${nextPhase.label}" @ ${schedTime}`);
        }
      }
    }
    return;
  }

  const phase = targetCampaign.phases[targetPhaseIdx];

  // Resolve replyTo
  let replyTo: string | undefined;
  if (targetPhaseIdx === 0 && targetCampaign.replyTo) {
    replyTo = targetCampaign.replyTo;
  } else if (targetPhaseIdx > 0 && phase.chainToPrevious !== false) {
    const prevPhase = targetCampaign.phases[targetPhaseIdx - 1];
    if (prevPhase.tweetIds?.length) {
      replyTo = prevPhase.tweetIds[prevPhase.tweetIds.length - 1];
    }
  }

  // ── Dry run ──
  if (isDryRun) {
    console.log("DRY RUN — would execute:");
    console.log(`  Campaign: ${targetCampaign.label} (${targetCampaign.id})`);
    console.log(
      `  Phase ${targetPhaseIdx}: ${phase.label} (${phase.type})`
    );
    if (replyTo) {
      console.log(`  Reply to: https://x.com/i/status/${replyTo}`);
    }
    if (phase.quoteTweetId) {
      console.log(
        `  QRT of: https://x.com/i/status/${phase.quoteTweetId}`
      );
    }
    const content = Array.isArray(phase.content)
      ? phase.content
      : [phase.content];
    for (const [i, text] of content.entries()) {
      console.log(
        `  [${i + 1}] (${text.length} chars) ${text.slice(0, 80)}...`
      );
    }
    if (targetPhaseIdx + 1 < targetCampaign.phases.length) {
      const nextPhase = targetCampaign.phases[targetPhaseIdx + 1];
      console.log(
        `  Next phase: "${nextPhase.label}" in ${nextPhase.delayMinutes ?? 0} min (±3 min jitter)`
      );
    }
    return;
  }

  // ── Execute phase ──
  console.log(
    `Executing: ${targetCampaign.id} → Phase ${targetPhaseIdx}: ${phase.label}`
  );

  // Mark campaign as active on first phase
  if (targetPhaseIdx === 0) {
    targetCampaign.status = "active";
    targetCampaign.startedAt = now.toISOString();
  }

  try {
    const tweetIds = await executePhase(phase, replyTo);
    phase.posted = true;
    phase.postedAt = new Date().toISOString();
    phase.tweetIds = tweetIds;
    console.log(`  Phase complete. Tweet IDs: ${tweetIds.join(", ")}`);
  } catch (err) {
    phase.retries = (phase.retries ?? 0) + 1;
    phase.error = err instanceof Error ? err.message : String(err);
    console.error(
      `  Phase failed (attempt ${phase.retries}/3): ${phase.error}`
    );

    if (phase.retries >= 3) {
      targetCampaign.status = "failed";
      console.error(
        `  Campaign "${targetCampaign.id}" marked FAILED after 3 retries.`
      );
    }

    await writeQueue(campaigns);
    return;
  }

  // Compute scheduledAt for next phase
  if (targetPhaseIdx + 1 < targetCampaign.phases.length) {
    const nextPhase = targetCampaign.phases[targetPhaseIdx + 1];
    const delayMin = nextPhase.delayMinutes ?? 0;
    const jitter = Math.random() * 6 - 3; // ±3 min
    const totalDelay = Math.max(0, delayMin + jitter);
    const scheduledAt = new Date(
      Date.now() + totalDelay * 60_000
    ).toISOString();
    nextPhase.scheduledAt = scheduledAt;
    console.log(
      `  Next phase "${nextPhase.label}" scheduled for ${scheduledAt}`
    );
  }

  // Check if all phases are posted → mark completed
  if (targetCampaign.phases.every((p) => p.posted)) {
    targetCampaign.status = "completed";
    targetCampaign.completedAt = new Date().toISOString();
    console.log(`  Campaign "${targetCampaign.id}" completed!`);
  }

  await writeQueue(campaigns);
  console.log("Queue updated.");
}

/** Execute a single phase — returns array of tweet IDs */
async function executePhase(
  phase: QueuePhase,
  replyTo?: string
): Promise<string[]> {
  const client = getClient();

  switch (phase.type) {
    case "tweet": {
      const text =
        typeof phase.content === "string" ? phase.content : phase.content[0];
      const options: Record<string, unknown> = {};
      if (replyTo) {
        options.reply = { in_reply_to_tweet_id: replyTo };
      }
      const tweet = await safeTweet(client, text, options);
      const id = tweet!.data.id;
      console.log(`  Posted tweet: ${id}`);
      console.log(`  https://x.com/PercivalLabs/status/${id}`);
      return [id];
    }

    case "thread": {
      const tweets = Array.isArray(phase.content)
        ? phase.content
        : [phase.content];
      let lastId: string | null = replyTo ?? null;
      const ids: string[] = [];

      for (let i = 0; i < tweets.length; i++) {
        const options = lastId
          ? { reply: { in_reply_to_tweet_id: lastId } }
          : {};
        const tweet = await safeTweet(client, tweets[i], options);
        const id = tweet!.data.id;
        console.log(`  [${i + 1}/${tweets.length}] ${id}`);
        ids.push(id);
        lastId = id;

        if (i < tweets.length - 1) {
          await humanDelay();
        }
      }

      console.log(
        `  Thread: https://x.com/PercivalLabs/status/${ids[0]}`
      );
      return ids;
    }

    case "qrt": {
      const text =
        typeof phase.content === "string" ? phase.content : phase.content[0];
      if (!phase.quoteTweetId) {
        throw new Error("QRT phase requires quoteTweetId");
      }
      const tweet = await safeTweet(client, text, {
        quote_tweet_id: phase.quoteTweetId,
      });
      const id = tweet!.data.id;
      console.log(`  Posted QRT: ${id}`);
      console.log(`  https://x.com/PercivalLabs/status/${id}`);
      return [id];
    }

    default:
      throw new Error(`Unknown phase type: ${phase.type}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────

if (isQueue) {
  processQueue().catch(console.error);
} else if (isThread) {
  const tweets = args.slice(1).filter((a) => a !== "--dry-run");
  if (tweets.length < 2) {
    console.error("Thread needs at least 2 tweets.");
    process.exit(1);
  }
  postThread(tweets).catch(console.error);
} else if (args.length > 0) {
  postTweet(args[0]).catch(console.error);
} else {
  console.log(`Usage:
  bun scripts/x/post.ts "Your tweet"
  bun scripts/x/post.ts --thread "Tweet 1" "Tweet 2"
  bun scripts/x/post.ts --queue
  bun scripts/x/post.ts --queue --dry-run`);
}

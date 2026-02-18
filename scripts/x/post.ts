/**
 * Post a tweet or thread to @PercivalLabs
 *
 * Usage:
 *   bun scripts/x/post.ts "Your tweet text here"
 *   bun scripts/x/post.ts --thread "Tweet 1" "Tweet 2" "Tweet 3"
 *   bun scripts/x/post.ts --queue           # post next from queue
 *   bun scripts/x/post.ts --queue --dry-run # preview next post
 *
 * Safety:
 *   - Thread tweets are spaced 12s apart with ±5s random jitter
 *   - 429 responses trigger exponential backoff (up to 3 retries)
 *   - Queue items support "replyTo" field for reply threads
 *   - All automated posts should go through this script (not raw API calls)
 *
 * NOTE: Automated replies to other users' posts require manual posting
 * per X's automation policy. Use queue items with replyTo only for
 * self-reply threads. For replies to others, draft content here and
 * post manually through the X interface.
 */
import { getClient } from "./client";

const args = process.argv.slice(2);

const isThread = args[0] === "--thread";
const isQueue = args[0] === "--queue";
const isDryRun = args.includes("--dry-run");

// ── Timing ─────────────────────────────────────────────────────────

const THREAD_DELAY_BASE_MS = 12_000; // 12 seconds base
const THREAD_DELAY_JITTER_MS = 5_000; // ±5 seconds random jitter
const MAX_RETRIES = 3;

/** Human-like delay with randomized jitter */
function humanDelay(): Promise<void> {
  const delay =
    THREAD_DELAY_BASE_MS + (Math.random() * 2 - 1) * THREAD_DELAY_JITTER_MS;
  const clamped = Math.max(7_000, delay); // never less than 7s
  console.log(`  ⏳ waiting ${(clamped / 1000).toFixed(1)}s...`);
  return new Promise((r) => setTimeout(r, clamped));
}

// ── Rate limit handling ────────────────────────────────────────────

async function safeTweet(
  client: ReturnType<typeof getClient>,
  text: string,
  options: Record<string, unknown> = {}
) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.v2.tweet(text, options);
    } catch (err: unknown) {
      const error = err as { code?: number; rateLimit?: { reset: number } };
      if (error.code === 429 && attempt < MAX_RETRIES) {
        const resetAt = error.rateLimit?.reset;
        const waitMs = resetAt
          ? (resetAt * 1000 - Date.now() + 1000)
          : Math.pow(2, attempt + 1) * 30_000; // 60s, 120s, 240s
        const waitSec = Math.ceil(Math.max(waitMs, 30_000) / 1000);
        console.warn(
          `  ⚠️  Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} in ${waitSec}s...`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Exhausted retries after rate limiting");
}

// ── Posting ────────────────────────────────────────────────────────

async function postTweet(text: string) {
  const client = getClient();
  const tweet = await safeTweet(client, text);
  console.log(`Posted: ${tweet!.data.id}`);
  console.log(`https://x.com/PercivalLabs/status/${tweet!.data.id}`);
  return tweet;
}

async function postThread(
  tweets: string[],
  replyTo?: string
) {
  const client = getClient();
  let lastTweetId: string | null = replyTo ?? null;

  for (let i = 0; i < tweets.length; i++) {
    const options = lastTweetId
      ? { reply: { in_reply_to_tweet_id: lastTweetId } }
      : {};

    const tweet = await safeTweet(client, tweets[i], options);
    console.log(`[${i + 1}/${tweets.length}] ${tweet!.data.id}`);
    lastTweetId = tweet!.data.id;

    if (i < tweets.length - 1) {
      await humanDelay();
    }
  }

  console.log(
    `\nThread posted: https://x.com/PercivalLabs/status/${lastTweetId}`
  );
}

async function postFromQueue() {
  const queuePath = new URL("./queue.json", import.meta.url).pathname;
  const file = Bun.file(queuePath);

  if (!(await file.exists())) {
    console.error("No queue.json found. Create one first.");
    process.exit(1);
  }

  const queue: QueueItem[] = await file.json();
  const now = new Date();

  // Find next unposted item that's due
  const next = queue.find(
    (item) => !item.posted && new Date(item.scheduled) <= now
  );

  if (!next) {
    const pending = queue.filter((item) => !item.posted);
    if (pending.length === 0) {
      console.log("Queue empty — all posts published.");
    } else {
      console.log(`${pending.length} posts pending. Next scheduled:`);
      for (const p of pending) {
        console.log(`  ${p.scheduled} — ${p.content[0].slice(0, 60)}...`);
      }
    }
    return;
  }

  if (isDryRun) {
    console.log("DRY RUN — would post:");
    console.log(`  Label: ${next.label ?? "(none)"}`);
    console.log(`  Scheduled: ${next.scheduled}`);
    console.log(`  Type: ${next.content.length > 1 ? "thread" : "tweet"}`);
    if (next.replyTo) {
      console.log(`  Reply to: https://x.com/i/status/${next.replyTo}`);
    }
    for (const [i, text] of next.content.entries()) {
      console.log(`  [${i + 1}] (${text.length} chars) ${text.slice(0, 80)}...`);
    }
    const totalDelay =
      (next.content.length - 1) *
      (THREAD_DELAY_BASE_MS / 1000);
    if (next.content.length > 1) {
      console.log(`  Est. time: ~${totalDelay}s for thread pacing`);
    }
    return;
  }

  console.log(`Posting: "${next.content[0].slice(0, 60)}..."`);

  if (next.content.length > 1) {
    await postThread(next.content, next.replyTo);
  } else if (next.replyTo) {
    const client = getClient();
    const tweet = await safeTweet(client, next.content[0], {
      reply: { in_reply_to_tweet_id: next.replyTo },
    });
    console.log(`Posted reply: ${tweet!.data.id}`);
    console.log(`https://x.com/PercivalLabs/status/${tweet!.data.id}`);
  } else {
    await postTweet(next.content[0]);
  }

  // Mark as posted
  next.posted = true;
  next.postedAt = now.toISOString();
  await Bun.write(queuePath, JSON.stringify(queue, null, 2));
  console.log("Queue updated.");
}

interface QueueItem {
  scheduled: string;
  content: string[];
  posted?: boolean;
  postedAt?: string;
  label?: string;
  /** Tweet ID to reply to (for reply threads). Note: automated replies
   *  to other users require manual posting per X automation policy. */
  replyTo?: string;
}

// Main
if (isQueue) {
  postFromQueue().catch(console.error);
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

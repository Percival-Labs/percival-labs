// scripts/x/lib.ts — Shared X queue utilities

import type { getClient } from "./client";
import type {
  QueueCampaign,
  QueuePhase,
  LegacyQueueItem,
} from "./types";

// ── Constants ────────────────────────────────────────────────────────

export const THREAD_DELAY_BASE_MS = 12_000; // 12 seconds base
export const THREAD_DELAY_JITTER_MS = 5_000; // ±5 seconds random jitter
export const MAX_RETRIES = 3;
const QUEUE_PATH = new URL("./queue.json", import.meta.url).pathname;

// ── Timing ───────────────────────────────────────────────────────────

/** Human-like delay with randomized jitter (for between tweets in a thread) */
export function humanDelay(): Promise<void> {
  const delay =
    THREAD_DELAY_BASE_MS + (Math.random() * 2 - 1) * THREAD_DELAY_JITTER_MS;
  const clamped = Math.max(7_000, delay);
  console.log(`  ⏳ waiting ${(clamped / 1000).toFixed(1)}s...`);
  return new Promise((r) => setTimeout(r, clamped));
}

// ── Rate limit handling ──────────────────────────────────────────────

export async function safeTweet(
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
          ? resetAt * 1000 - Date.now() + 1000
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

// ── Queue I/O ────────────────────────────────────────────────────────

/** Read queue.json, migrating legacy format if needed */
export async function readQueue(): Promise<QueueCampaign[]> {
  const file = Bun.file(QUEUE_PATH);
  if (!(await file.exists())) {
    return [];
  }
  const raw = await file.json();
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  // Detect old format: items have `content` field, not `phases`
  if ("content" in raw[0] && !("phases" in raw[0])) {
    return migrateQueue(raw as LegacyQueueItem[]);
  }
  return raw as QueueCampaign[];
}

/** Write campaigns back to queue.json */
export async function writeQueue(campaigns: QueueCampaign[]): Promise<void> {
  await Bun.write(QUEUE_PATH, JSON.stringify(campaigns, null, 2));
}

// ── Migration ────────────────────────────────────────────────────────

/** Convert old QueueItem[] to QueueCampaign[] */
export function migrateQueue(items: LegacyQueueItem[]): QueueCampaign[] {
  return items.map((item, i) => {
    const isThread = item.content.length > 1;
    const campaign: QueueCampaign = {
      id: `legacy-${i}-${slugify(item.label || "post")}`,
      label: item.label || `Legacy post ${i + 1}`,
      scheduled: item.scheduled,
      replyTo: item.replyTo,
      phases: [
        {
          label: item.label || `Post ${i + 1}`,
          type: isThread ? "thread" : "tweet",
          content: isThread ? item.content : item.content[0],
          posted: item.posted,
          postedAt: item.postedAt,
          tweetIds: item.posted ? ["migrated"] : undefined,
        },
      ],
      status: item.posted ? "completed" : "pending",
      completedAt: item.postedAt,
    };
    return campaign;
  });
}

// ── Campaign Enqueue ─────────────────────────────────────────────────

interface EnqueueOptions {
  dryRun?: boolean;
  at?: string; // ISO timestamp for phase 0 (default: 10 min from now)
  continueFrom?: string; // tweet ID to reply to
}

/** Add a campaign to queue.json. Handles dry-run preview, duplicate check, queue append. */
export async function enqueueCampaign(
  campaign: QueueCampaign,
  opts: EnqueueOptions = {}
): Promise<void> {
  // Override scheduled time
  if (opts.at) {
    campaign.scheduled = opts.at;
  } else if (!campaign.scheduled) {
    campaign.scheduled = new Date(Date.now() + 10 * 60_000).toISOString();
  }

  // Override replyTo
  if (opts.continueFrom) {
    campaign.replyTo = opts.continueFrom;
  }

  // Ensure status
  campaign.status = campaign.status || "pending";

  if (opts.dryRun) {
    console.log("\n═══ DRY RUN — Campaign Preview ═══\n");
    console.log(`  ID:        ${campaign.id}`);
    console.log(`  Label:     ${campaign.label}`);
    console.log(`  Scheduled: ${campaign.scheduled}`);
    if (campaign.replyTo) {
      console.log(
        `  Reply to:  https://x.com/i/status/${campaign.replyTo}`
      );
    }
    console.log(`  Phases:    ${campaign.phases.length}\n`);
    for (const [i, phase] of campaign.phases.entries()) {
      const content = Array.isArray(phase.content)
        ? phase.content
        : [phase.content];
      const charCount = content.reduce((sum, t) => sum + t.length, 0);
      console.log(
        `  Phase ${i}: ${phase.label} (${phase.type}, ${content.length} post${content.length > 1 ? "s" : ""}, ${charCount} chars)`
      );
      if (phase.delayMinutes) {
        console.log(`    Delay: ${phase.delayMinutes} min after previous`);
      }
      if (phase.quoteTweetId) {
        console.log(`    QRT of: ${phase.quoteTweetId}`);
      }
      for (const [j, text] of content.entries()) {
        console.log(
          `    [${j + 1}] (${text.length}ch) ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}`
        );
      }
    }
    console.log("\n═══ End Preview (not written to queue) ═══");
    return;
  }

  // Read existing queue
  const campaigns = await readQueue();

  // Duplicate check
  if (campaigns.some((c) => c.id === campaign.id)) {
    console.error(
      `Campaign "${campaign.id}" already exists in queue. Use a different ID or remove the existing one.`
    );
    process.exit(1);
  }

  // Append and write
  campaigns.push(campaign);
  await writeQueue(campaigns);

  console.log(`\n✓ Campaign "${campaign.id}" enqueued`);
  console.log(`  Scheduled: ${campaign.scheduled}`);
  console.log(`  Phases: ${campaign.phases.length}`);
  console.log(`  Queue now has ${campaigns.length} campaign(s)`);
}

// ── Time Window ──────────────────────────────────────────────────────

/** Check if current time is within posting window (8am-10pm PST) */
export function isWithinPostingWindow(): boolean {
  const now = new Date();
  // Get PST hour (UTC-8). During PDT it's UTC-7 but we use America/Los_Angeles
  const pstHour = parseInt(
    now.toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Los_Angeles",
    })
  );
  return pstHour >= 8 && pstHour < 22;
}

// ── CLI Helpers ──────────────────────────────────────────────────────

/** Parse common campaign CLI flags: --dry-run, --at <iso>, --continue <id> */
export function parseCampaignArgs(argv: string[]): EnqueueOptions {
  const args = argv.slice(2);
  const opts: EnqueueOptions = {};

  opts.dryRun = args.includes("--dry-run");

  const atIdx = args.indexOf("--at");
  if (atIdx !== -1 && args[atIdx + 1]) {
    opts.at = args[atIdx + 1];
  }

  const contIdx = args.indexOf("--continue");
  if (contIdx !== -1 && args[contIdx + 1]) {
    opts.continueFrom = args[contIdx + 1];
  }

  return opts;
}

// ── Utilities ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

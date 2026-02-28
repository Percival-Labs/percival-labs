/**
 * Model Provenance Response to Nate B. Jones — Feb 25, 2026
 *
 * Two-tier posting strategy:
 *   TIER 1: Hook tweet (tags @NateBJones)
 *   TIER 2: 6-tweet thread (35 min after hook)
 *
 * Usage:
 *   bun scripts/x/post-model-provenance.ts              # execute all tiers
 *   bun scripts/x/post-model-provenance.ts --dry-run     # preview only
 *   bun scripts/x/post-model-provenance.ts --thread-only  # skip hook, post thread now
 *   bun scripts/x/post-model-provenance.ts --continue <tweet_id>  # resume from post 2 as replies to existing opener
 *
 * Safety:
 *   - Thread pacing: 12s base + 5s jitter (7-17s range)
 *   - 429 rate limits: exponential backoff, 3 retries
 *   - NO automated replies to other users (X policy)
 *   - All self-reply threads only
 */
import { getClient } from "./client";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const threadOnly = args.includes("--thread-only");
const continueIdx = args.indexOf("--continue");
const continueFromId = continueIdx !== -1 ? args[continueIdx + 1] : null;

// ── Timing ──────────────────────────────────────────────────────────

const THREAD_DELAY_BASE_MS = 12_000;
const THREAD_DELAY_JITTER_MS = 5_000;
const MAX_RETRIES = 3;

function humanDelay(): Promise<void> {
  const delay =
    THREAD_DELAY_BASE_MS + (Math.random() * 2 - 1) * THREAD_DELAY_JITTER_MS;
  const clamped = Math.max(7_000, delay);
  console.log(`  waiting ${(clamped / 1000).toFixed(1)}s...`);
  return new Promise((r) => setTimeout(r, clamped));
}

function longWait(minutes: number, label: string): Promise<void> {
  const jitter = Math.random() * 6 - 3; // +/-3 min
  const actualMin = Math.max(minutes - 3, minutes + jitter);
  const ms = actualMin * 60_000;
  const endTime = new Date(Date.now() + ms);
  console.log(
    `\n--- Waiting ${actualMin.toFixed(0)} minutes before ${label} (ETA: ${endTime.toLocaleTimeString()}) ---\n`
  );
  return new Promise((r) => setTimeout(r, ms));
}

// ── Rate limit handling ─────────────────────────────────────────────

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
          ? resetAt * 1000 - Date.now() + 1000
          : Math.pow(2, attempt + 1) * 30_000;
        const waitSec = Math.ceil(Math.max(waitMs, 30_000) / 1000);
        console.warn(
          `  Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} in ${waitSec}s...`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Exhausted retries after rate limiting");
}

// ── Content ─────────────────────────────────────────────────────────

const HOOK = `.@NateBJones nailed it: the Anthropic distillation disclosure is not a Cold War story. It's a Napster story.

$2M in API costs to extract $2B in capabilities. 1,000:1 return on theft.

"The incentive to distill is literally universal."

He's right. And the response needs to be structural, not just detective work.

percival-labs.ai/research/model-provenance-trust-problem`;

const THREAD = [
  // Post 1 — thread opener
  `@NateBJones just published the clearest analysis of what Anthropic's distillation disclosure actually means.

His key insight: distilled models occupy narrower capability manifolds. They look fine on benchmarks. They break on sustained agentic work.

"The provenance of a model is a capability question."

We'd extend that. It's a trust question. Here's why.`,

  // Post 2
  `Jones identifies a gap no one is measuring:

— Narrow tasks: distilled models = 90% of frontier for 15% cost. Great trade.
— Sustained agentic work (hour 4, 6, 8): distilled models drop to ~40% effectiveness.

No eval suite captures this. "The evals that would measure sustained autonomous generality don't really exist yet."

Benchmarks test what distillers optimize for. That's the whole problem.`,

  // Post 3
  `His proposed fix: the "off-manifold probe."

Run a real task on multiple models. When both succeed, change one constraint. Watch how each model adapts — or doesn't.

Genuine contribution. But it's manual, domain-specific, doesn't scale.

The agent economy needs this test running continuously, across every domain, with economic weight behind the results.`,

  // Post 4
  `Jones frames Anthropic's countermeasures as "speed bumps" — they slow distillation, they don't stop it.

Correct. But speed bumps are passive. The distiller's calculation: if I'm not caught, extraction is free.

Economic staking changes that from binary to continuous. Extraction volume = compounding economic risk.

Speed bumps slow things down. Economic stakes make speeding expensive.`,

  // Post 5
  `The deeper point: if provenance determines how a model breaks, the market needs a provenance signal.

Not benchmarks (gameable). Not marketing claims (unreliable). Not one-time testing (non-scalable).

Outcome-derived trust scores. Economically backed. Federated. Continuous.

Real-world performance compounded over time — not synthetic evals.`,

  // Post 6
  `Jones closes with: "The people who route well — who match problems to models based on real understanding of representational depth, not marketing copy — will outperform."

Routing well requires trust infrastructure that makes provenance visible, verifiable, and economically meaningful.

Not a leaderboard. A ledger.

percival-labs.ai/research/model-provenance-trust-problem`,
];

// ── Posting ─────────────────────────────────────────────────────────

async function postSingle(
  client: ReturnType<typeof getClient>,
  text: string,
  label: string
): Promise<string> {
  console.log(`\n=== Posting: ${label} ===`);
  console.log(`  (${text.length} chars)`);

  if (isDryRun) {
    console.log(`  [DRY RUN] Would post:\n${text}`);
    return "dry-run-id";
  }

  const tweet = await safeTweet(client, text);
  const id = tweet!.data.id;
  console.log(`  Posted: ${id}`);
  console.log(`  https://x.com/PercivalLabs/status/${id}`);
  return id;
}

async function postThread(
  client: ReturnType<typeof getClient>,
  tweets: string[],
  label: string
): Promise<string> {
  console.log(
    `\n=== Posting thread: ${label} (${tweets.length} tweets) ===`
  );

  let lastId: string | null = null;

  for (let i = 0; i < tweets.length; i++) {
    const text = tweets[i];
    console.log(`  [${i + 1}/${tweets.length}] (${text.length} chars)`);

    if (isDryRun) {
      console.log(`  [DRY RUN] ${text.slice(0, 120)}...`);
      lastId = `dry-run-${i}`;
    } else {
      const options = lastId
        ? { reply: { in_reply_to_tweet_id: lastId } }
        : {};
      const tweet = await safeTweet(client, text, options);
      lastId = tweet!.data.id;
      console.log(`  Posted: ${lastId}`);
    }

    if (i < tweets.length - 1) {
      await humanDelay();
    }
  }

  console.log(
    `  Thread complete: https://x.com/PercivalLabs/status/${lastId}`
  );
  return lastId!;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("=================================================");
  console.log("  MODEL PROVENANCE RESPONSE — Feb 25, 2026");
  console.log("  In response to @NateBJones Napster Moment video");
  console.log("=================================================");
  console.log(`  Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  Time: ${new Date().toLocaleString()}`);
  console.log();

  const client = isDryRun ? (null as any) : getClient();

  // ── Phase 1: Hook Tweet ──
  if (!threadOnly) {
    await postSingle(client, HOOK, "Hook Tweet");

    // Wait before thread
    if (!isDryRun) {
      await longWait(35, "response thread");
    } else {
      console.log(
        "\n  [DRY RUN] Would wait ~35 minutes before response thread\n"
      );
    }
  }

  // ── Phase 2: Response Thread (6 tweets) ──
  if (continueFromId) {
    // Resume thread from post 2 onward, replying to the given tweet ID
    const remaining = THREAD.slice(1); // skip post 1 (already posted)
    console.log(
      `\n=== Continuing thread from existing opener (${continueFromId}) ===`
    );
    console.log(`  Posts remaining: ${remaining.length}`);

    let lastId = continueFromId;
    for (let i = 0; i < remaining.length; i++) {
      const text = remaining[i];
      console.log(`  [${i + 2}/${THREAD.length}] (${text.length} chars)`);

      if (isDryRun) {
        console.log(`  [DRY RUN] ${text.slice(0, 120)}...`);
        lastId = `dry-run-${i + 1}`;
      } else {
        const tweet = await safeTweet(client, text, {
          reply: { in_reply_to_tweet_id: lastId },
        });
        lastId = tweet!.data.id;
        console.log(`  Posted: ${lastId}`);
      }

      if (i < remaining.length - 1) {
        await humanDelay();
      }
    }
    console.log(
      `  Thread complete: https://x.com/PercivalLabs/status/${lastId}`
    );
  } else {
    await postThread(client, THREAD, "Model Provenance Response Thread");
  }

  console.log("\n=================================================");
  console.log("  ALL CONTENT POSTED");
  console.log("=================================================");
  console.log(`  Completed: ${new Date().toLocaleString()}`);
  console.log();
  console.log("  Next steps (MANUAL):");
  console.log("  - QRT Nate's original video if engagement warrants");
  console.log("  - Engage with replies in first hour");
  console.log("  - Monitor impressions");
}

main().catch((err) => {
  console.error("Posting failed:", err);
  process.exit(1);
});

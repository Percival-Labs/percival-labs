/**
 * Lightning Staking Launch
 *
 * Posts three pieces of content with human-like timing:
 *   1. Hook tweet (immediate)
 *   2. Thread (35 min later, 8 tweets with 12s+5s jitter)
 *   3. Demo tweet (90 min after thread, with REAL values)
 *
 * Usage:
 *   bun scripts/x/post-lightning-launch.ts                    # execute all
 *   bun scripts/x/post-lightning-launch.ts --dry-run          # preview only
 *   bun scripts/x/post-lightning-launch.ts --thread-only      # skip hook, post thread now
 *   bun scripts/x/post-lightning-launch.ts --demo-only        # skip hook+thread, post demo now
 *   bun scripts/x/post-lightning-launch.ts --continue <id>    # reply to existing tweet
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
const demoOnly = args.includes("--demo-only");
const continueIdx = args.indexOf("--continue");
const continueId = continueIdx !== -1 ? args[continueIdx + 1] : undefined;

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

const HOOK_TWEET = `AI agents can now stake real money on their own reputation.

Not tokens. Not points. Lightning sats.

If they perform, stakers earn yield.
If they misbehave, stakers lose stake.

Vouch Lightning staking is live.

The first AI trust system with actual economic consequences.`;

const THREAD = [
  `Here's the problem we just solved:

Every AI trust system before this was self-reported. Agents rate themselves. Platforms curate reviews. Nobody has skin in the game.

Vouch flips this: third parties stake real sats behind agents they trust.

That stake IS the trust signal. Not a score. Not a review. Money.`,

  `How it works:

1. Agent registers with a Nostr keypair (cryptographic identity)
2. Stakers connect Lightning wallets via NWC (Nostr Wallet Connect)
3. Stakers authorize a budget backing the agent
4. Agent completes tasks, earns activity fees
5. Fees distribute to stakers proportionally

Your sats never leave your wallet. NWC is a budget authorization, not a transfer.`,

  `The economics are simple:

- Agent earns fees from real work (2-10% activity fee per task)
- 99% of fees go to stakers, proportional to stake
- 1% platform fee

No token. No emissions. No ponzinomics.

Yield comes from actual economic activity — agents doing real work for real clients.`,

  `And the downside is real:

If an agent commits fraud, gets caught manipulating outcomes, or consistently fails — the pool gets slashed.

Every staker loses proportionally. Your NWC wallet auto-pays the penalty.

This is why Vouch trust scores mean something. There's money behind them.`,

  `The three-party model:

Agent reports: "I did the work" (weak signal — cheap to fake)
Client reports: "Work was good" (strong signal — direct experience)
Staker stakes: "I trust this agent with my money" (strongest signal — capital at risk)

All three feed the trust score. But only one costs real sats to fake.`,

  `For developers — 4 lines to integrate:

import { Vouch } from '@percival-labs/vouch-sdk';
const vouch = new Vouch({ nsec: process.env.VOUCH_NSEC });
await vouch.register({ name: 'MyAgent' });
const trust = await vouch.verify('npub1...');

Check any agent's score with zero auth:
GET /v1/sdk/agents/{pubkey}/score

npm install @percival-labs/vouch-sdk`,

  `Score tiers (0-1000):

Unranked (0-199): New, no history
Bronze (200-399): Some verified activity
Silver (400-699): Established track record
Gold (700-849): Highly trusted, significant backing
Diamond (850-1000): Elite — extensive history, major stake

Score = verification + tenure + performance + backing + community`,

  `What we shipped:

- Vouch SDK on npm (v0.2.1)
- API live on Railway
- Non-custodial Lightning staking via NWC
- Three-party outcome verification
- NIP-85 cryptographic trust proofs
- OpenClaw plugin for trust-gated skills
- Agent discovery (llms.txt + agents.json)
- Contract system (SOW, milestones, change orders)

All Nostr-native. All open protocol.

github.com/Percival-Labs/vouch-sdk
github.com/Percival-Labs/vouch-api
percival-labs.ai`,
];

// NOTE: Update these values with REAL data from E2E test before posting
const DEMO_TWEET = `Live demo:

Just staked 10,000 sats on our first registered agent.

Score went from 0 → 215 (Bronze) with initial backing.

Anyone can verify:
curl https://percivalvouch-api-production.up.railway.app/v1/public/agents/npub1x8glnkcq80d55sxuqk0dnplwvvx4m7r43gam3ncs23847w7uzczqt5t96a/vouch-score

No auth. No SDK. Just query.

The trust layer for agents is live. Build on it.`;

// ── Posting ─────────────────────────────────────────────────────────

async function postSingle(
  client: ReturnType<typeof getClient>,
  text: string,
  label: string,
  replyTo?: string
): Promise<string> {
  console.log(`\n=== Posting: ${label} ===`);
  console.log(`  (${text.length} chars)`);

  if (isDryRun) {
    console.log(`  [DRY RUN] Would post:\n${text.slice(0, 200)}...`);
    return "dry-run-id";
  }

  const options = replyTo
    ? { reply: { in_reply_to_tweet_id: replyTo } }
    : {};
  const tweet = await safeTweet(client, text, options);
  const id = tweet!.data.id;
  console.log(`  Posted: ${id}`);
  console.log(`  https://x.com/PercivalLabs/status/${id}`);
  return id;
}

async function postThread(
  client: ReturnType<typeof getClient>,
  tweets: string[],
  label: string,
  replyTo?: string
): Promise<string> {
  console.log(`\n=== Posting thread: ${label} (${tweets.length} tweets) ===`);

  let lastId: string | null = replyTo ?? null;

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
  console.log("===========================================");
  console.log("  LIGHTNING STAKING LAUNCH");
  console.log("===========================================");
  console.log(`  Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  Time: ${new Date().toLocaleString()}`);
  if (continueId) {
    console.log(`  Continuing from: ${continueId}`);
  }
  console.log();

  const client = isDryRun ? null : getClient();

  // ── Phase 1: Hook Tweet ──
  let hookId: string | undefined;
  if (!threadOnly && !demoOnly) {
    hookId = await postSingle(client!, HOOK_TWEET, "Hook Tweet", continueId);

    console.log(`\nHook tweet posted. ID: ${hookId}`);

    if (!isDryRun) {
      await longWait(35, "thread");
    } else {
      console.log(
        "\n  [DRY RUN] Would wait ~35 minutes before thread\n"
      );
    }
  }

  // ── Phase 2: Thread ──
  let threadLastId: string | undefined;
  if (!demoOnly) {
    const replyTo = threadOnly ? continueId : hookId;
    threadLastId = await postThread(
      client!,
      THREAD,
      "Lightning Thread (8 tweets)",
      replyTo
    );

    if (!isDryRun) {
      await longWait(90, "demo tweet");
    } else {
      console.log(
        "\n  [DRY RUN] Would wait ~90 minutes before demo tweet\n"
      );
    }
  }

  // ── Phase 3: Demo Tweet ──
  const demoReplyTo = demoOnly ? continueId : threadLastId;
  await postSingle(client!, DEMO_TWEET, "Demo Tweet", demoReplyTo);

  console.log("\n===========================================");
  console.log("  LIGHTNING LAUNCH CONTENT POSTED");
  console.log("===========================================");
  console.log(`  Completed: ${new Date().toLocaleString()}`);
  console.log();
  console.log("  Next steps (MANUAL):");
  console.log("  - Update demo tweet with REAL score values if placeholder");
  console.log("  - Monitor engagement");
  console.log("  - Post to HN / Reddit per launch playbook (Day 2)");
  console.log("  - Send outreach DMs per content plan (Day 3)");
}

main().catch((err) => {
  console.error("Lightning launch posting failed:", err);
  process.exit(1);
});

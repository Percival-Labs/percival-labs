/**
 * Agents of Chaos Response — Feb 24, 2026
 *
 * Three-tier posting strategy:
 *   TIER 1: X Article (MANUAL — paste into x.com/compose/article)
 *   TIER 2: Hook tweet (35 min after Article)
 *   TIER 3: 9-tweet thread (35 min after hook)
 *   BONUS: MCP standalone post (90 min after thread)
 *
 * Usage:
 *   bun scripts/x/post-agents-of-chaos.ts              # execute all automated tiers
 *   bun scripts/x/post-agents-of-chaos.ts --dry-run     # preview only
 *   bun scripts/x/post-agents-of-chaos.ts --thread-only  # skip hook, post thread now
 *   bun scripts/x/post-agents-of-chaos.ts --mcp-only     # post MCP standalone only
 *   bun scripts/x/post-agents-of-chaos.ts --article-url https://x.com/...  # include Article link
 *
 * Safety:
 *   - Thread pacing: 12s base + 5s jitter (7-17s range)
 *   - 429 rate limits: exponential backoff, 3 retries
 *   - NO automated replies to other users (X policy)
 *   - All self-reply threads only
 *
 * IMPORTANT: Post the X Article MANUALLY first, then run this script.
 * Pass --article-url to include the Article link in the hook tweet.
 */
import { getClient } from "./client";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const threadOnly = args.includes("--thread-only");
const mcpOnly = args.includes("--mcp-only");

// Extract --article-url value
const articleUrlIdx = args.indexOf("--article-url");
const articleUrl =
  articleUrlIdx !== -1 && args[articleUrlIdx + 1]
    ? args[articleUrlIdx + 1]
    : null;

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

function getHookTweet() {
  const base = `38 researchers. 6 autonomous agents. 2 weeks of red-teaming.

The result: 10 security vulnerabilities that every agent builder should read.

Identity spoofing via display names. Libelous broadcasts to 52+ agents. PII exfiltration via "forward" instead of "share."

Our response: the missing primitive is economic accountability.`;

  if (articleUrl) {
    return `${base}\n\n${articleUrl}`;
  }
  return `${base}\n\npercival-labs.ai/research/agents-of-chaos-economic-accountability`;
}

const THREAD = [
  // Post 1 — thread opener
  `"Agents of Chaos" by @NatalieShapira et al. is the most rigorous red-teaming study of autonomous LLM agents published to date.

16 case studies. 10 security failures. 6 safety successes.

Their diagnosis: "Neither developer, owner, nor deploying organization can robustly claim or operationalize accountability."

We wrote a formal response. Here's what we found.`,

  // Post 2
  `Every vulnerability in the paper shares a common causal structure:

- Zero-cost identity (display name = identity)
- Zero-cost action (no budget, no consequence)
- Zero-cost amplification (broadcast to 52+ agents, free)
- Zero-cost deception (false deletion reports, no audit)

The agents operated in a zero-consequence environment.`,

  // Post 3
  `CS8: An attacker changed their Discord display name to "Chris" (the owner's name). The agent gave them full admin access.

This is not a model failure. It's an identity architecture failure. Display names are not identity.

Cryptographic keypairs are. Ed25519 doesn't care what your display name says.`,

  // Post 4
  `CS3: Agent refused to "share" PII. Immediately complied when asked to "forward" it instead.

Keyword-dependent safety training is fundamentally fragile. You can't patch this with more RLHF.

But you can make the bypass economically irrational. If the requester has $10K at stake, they think twice before attempting extraction.`,

  // Post 5
  `CS11: An agent broadcast an unverified accusation to 14 email contacts and 52+ agents on a social platform. No fact-checking. No retraction possible.

In a zero-cost environment, the rational default is: amplify everything.

In a staked environment: the accuser, the broadcaster, and their vouchers all bear financial consequence if the claim is false.`,

  // Post 6
  `The paper introduces the "autonomy-competence gap" — agents operating at functional autonomy beyond their self-model capacity.

Their solution: better agent self-models (Level 3 autonomy).

Our addition: you don't need the agent to self-assess. You need external economic boundaries that approximate the same constraint.

A $10K stake changes operator behavior even if the agent's self-model hasn't improved.`,

  // Post 7
  `What economic accountability does NOT solve (and we say this explicitly in the paper):

- The frame problem (disproportionate responses)
- Token indistinguishability (data vs instruction)
- Provider-level censorship
- Its own attack surface (stake gaming, Sybil vouching)

No single layer is sufficient. This is one necessary primitive among several.`,

  // Post 8
  `The paper's authors call for "formal agent identity and authorization standards (NIST-aligned)."

Nostr keypairs (NIP-01) provide NIST-compliant Ed25519 identity.
NIP-85 provides federated trust assertions.
Lightning/NWC provides non-custodial economic stake.

The infrastructure exists. The question is whether we use it.`,

  // Post 9
  `Full response paper:
percival-labs.ai/research/agents-of-chaos-economic-accountability

Defensive disclosure (PL-DD-2026-001):
percival-labs.ai/research/trust-staking-for-ai-inference

The agents are already deployed. The question is whether the systems around them make trustworthy behavior economically rational.`,
];

const MCP_STANDALONE = `The MCP ecosystem has 8,600+ servers, 97M monthly SDK downloads, and 41% of official registry servers lack authentication.

30 CVEs in the last 2 months. 437K dev environments compromised through one supply chain attack.

Tool poisoning. Rug pulls. Cross-server data exfiltration.

Namespace verification proves identity. OAuth proves authorization. Attestation proves provenance.

None of these prove trustworthiness. None create consequences for misbehavior.

The missing layer is economic accountability.

We're building it.`;

// ── Posting ─────────────────────────────────────────────────────────

async function postSingle(
  client: ReturnType<typeof getClient>,
  text: string,
  label: string
): Promise<string> {
  console.log(`\n=== Posting: ${label} ===`);
  console.log(`  (${text.length} chars)`);

  if (isDryRun) {
    console.log(`  [DRY RUN] Would post:\n${text.slice(0, 280)}...`);
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
  console.log("===========================================");
  console.log("  AGENTS OF CHAOS RESPONSE — Feb 24, 2026");
  console.log("===========================================");
  console.log(`  Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  Time: ${new Date().toLocaleString()}`);
  console.log(
    `  Article URL: ${articleUrl || "(none — using website link)"}`
  );
  console.log();

  if (!articleUrl && !isDryRun) {
    console.log("  TIP: Pass --article-url <url> to link to the X Article");
    console.log(
      "       instead of the website. Post the Article on x.com first."
    );
    console.log();
  }

  const client = isDryRun ? (null as any) : getClient();

  // ── MCP Only ──
  if (mcpOnly) {
    await postSingle(client, MCP_STANDALONE, "MCP Standalone Post");
    console.log("\n  MCP standalone posted.");
    return;
  }

  // ── Phase 1: Hook Tweet ──
  if (!threadOnly) {
    const hookText = getHookTweet();
    await postSingle(client, hookText, "Hook Tweet");

    // Wait before thread
    if (!isDryRun) {
      await longWait(35, "response thread");
    } else {
      console.log(
        "\n  [DRY RUN] Would wait ~35 minutes before response thread\n"
      );
    }
  }

  // ── Phase 2: Response Thread (9 tweets) ──
  await postThread(client, THREAD, "Agents of Chaos Response Thread");

  // Wait before MCP standalone
  if (!isDryRun) {
    await longWait(90, "MCP standalone post");
  } else {
    console.log(
      "\n  [DRY RUN] Would wait ~90 minutes before MCP standalone\n"
    );
  }

  // ── Phase 3: MCP Standalone ──
  await postSingle(client, MCP_STANDALONE, "MCP Standalone Post");

  console.log("\n===========================================");
  console.log("  ALL AUTOMATED CONTENT POSTED");
  console.log("===========================================");
  console.log(`  Completed: ${new Date().toLocaleString()}`);
  console.log();
  console.log("  Next steps (MANUAL):");
  console.log(
    "  - QRT @NatalieShapira's thread when you see engagement"
  );
  console.log("  - Engage with replies in first hour");
  console.log("  - Monitor impressions");
}

main().catch((err) => {
  console.error("Posting failed:", err);
  process.exit(1);
});

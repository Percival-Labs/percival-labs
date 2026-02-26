/**
 * QRT of Avi Chawla's Teleport/Confused Deputy tweet — Feb 26, 2026
 *
 * Positions Vouch as the economic accountability layer after identity.
 * Construction bond metaphor — human-facing content strategy.
 *
 * Usage:
 *   bun scripts/x/post-teleport-qrt.ts              # execute
 *   bun scripts/x/post-teleport-qrt.ts --dry-run     # preview only
 */
import { getClient } from "./client";

const isDryRun = process.argv.includes("--dry-run");

// Avi Chawla's tweet about Teleport and the confused deputy problem
const QUOTE_TWEET_ID = "2026907616337883612";

const QRT_TEXT = `Identity tells you who the agent is. It doesn't tell you if they're any good.

In construction, every contractor has a license. That's identity. But before they touch your project, they post a bond — real money they lose if they screw up.

That's what's missing from agent security. Authentication solves "who is this?" Vouch solves "should I trust them?" — with economic skin in the game via Lightning staking.

Identity is the foundation. Trust is the structure you build on it.`;

async function main() {
  console.log("=== QRT: Teleport / Confused Deputy ===");
  console.log(`  Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  Time: ${new Date().toLocaleString()}`);
  console.log(`  Quote tweet: https://x.com/_avichawla/status/${QUOTE_TWEET_ID}`);
  console.log(`  Length: ${QRT_TEXT.length} chars`);
  console.log();

  if (isDryRun) {
    console.log("[DRY RUN] Would post:");
    console.log(QRT_TEXT);
    console.log(`\n  Quoting: ${QUOTE_TWEET_ID}`);
    return;
  }

  const client = getClient();
  const tweet = await client.v2.tweet(QRT_TEXT, {
    quote_tweet_id: QUOTE_TWEET_ID,
  });

  const id = tweet.data.id;
  console.log(`  Posted: ${id}`);
  console.log(`  https://x.com/PercivalLabs/status/${id}`);
}

main().catch((err) => {
  console.error("Posting failed:", err);
  process.exit(1);
});

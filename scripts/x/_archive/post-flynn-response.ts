/**
 * Post the Flynn response: article first, then reply thread linking to it
 *
 * ALREADY POSTED on 2026-02-17. Kept as reference for similar future scripts.
 *
 * IMPORTANT: This script posted replies to another user's tweet, which triggered
 * an account lock. For future reply threads to other users, draft the content
 * here but POST MANUALLY through the X interface. X requires written approval
 * for automated reply bots.
 */
import { getClient } from "./client";

const FLYNN_TWEET_ID = "2023465136204419096";
const DRY_RUN = process.argv.includes("--dry-run");

const client = getClient();

// ── Safety settings ────────────────────────────────────────────────
const THREAD_DELAY_BASE_MS = 12_000;
const THREAD_DELAY_JITTER_MS = 5_000;

function humanDelay(): Promise<void> {
  const delay =
    THREAD_DELAY_BASE_MS + (Math.random() * 2 - 1) * THREAD_DELAY_JITTER_MS;
  const clamped = Math.max(7_000, delay);
  console.log(`  ⏳ waiting ${(clamped / 1000).toFixed(1)}s...`);
  return new Promise((r) => setTimeout(r, clamped));
}

// ── Article (standalone post) ──────────────────────────────────────

const article = `The Trust Layer — What Agent Commerce Actually Needs

Brian Flynn recently published a piece called "How to Sell to Agents" that's making the rounds. It extends Coase's theory of the firm — the one that won a Nobel Prize for explaining why companies exist — and applies it to AI agents. The argument: agents collapse transaction costs so dramatically that the default shifts from "build in-house" to "buy on the open market." Except now the buyers are software with budgets.

He's right. And his checklist for agent-native services is solid: machine-readable capabilities, pricing in the protocol, automatable onboarding, provable reliability, faster and cheaper than self-computation.

But there's a layer underneath all of that which determines whether agent commerce becomes a functional market or a spam-ridden race to the bottom. Flynn touches it briefly — "agents need verification, sandboxing, and reputation-weighted routing" — and moves on.

That sentence contains the entire hard problem. Let's stay with it.


THE REPUTATION PROBLEM

Put yourself in the agent's position. You query a service registry. You get back twelve endpoints claiming to do what you need. Prices range from a tenth of a cent to five cents. Each one reports its own uptime, latency percentiles, and accuracy metrics.

How do you choose?

Flynn says: reliability scores, confidence metrics, proven track records. But who's providing those numbers?

In most current implementations, the services themselves. This is like asking a job candidate to write their own reference letter. Some will be honest. Many will be optimistic. A few will fabricate entirely.

In human markets, we solved this problem through layers of third-party verification. Yelp reviews, BBB ratings, analyst reports, word of mouth. All fundamentally built on one thing: humans can share experiences with other humans through narrative. "I used this service and it was terrible" is a powerful signal when a thousand people say it.

Agents need the equivalent, but it has to be machine-verifiable, not narrative-based. You can't write a Yelp review for an API endpoint. You need cryptographic proofs of service delivery. Not "we claim 99.9% uptime" but "here are ten thousand signed response hashes with timestamps that any agent can independently verify against the actual outputs received."

Reputation scores need to be derived from verified transaction history — receipts, not claims. This is a fundamentally different infrastructure than anything we've built for human commerce, and nobody has shipped it at scale yet.


THE ALLOWLIST IS THE HEADLINE

Flynn makes an admission midway through the piece that deserves to be the headline, not the footnote:

"A human still decides which tools the agent is allowed to use."

He frames this as a concession before returning to the optimization argument. But follow it to its conclusion.

If a human gates the allowlist, then the real marketing surface isn't the API — it's the procurement process. The question isn't "can an agent discover my service?" It's "can I get my service onto the approved vendor list at enterprises that deploy agents?"

This doesn't mean transaction costs approach zero. It means they bifurcate. The cost of each individual transaction approaches zero, yes. But the cost of the first transaction — the one that gets you on the list — might actually increase. Security review, compliance verification, integration testing, legal approval. All the things that slow down enterprise procurement today don't vanish just because the end buyer is software.

What you get is a power law distribution. A small number of approved services capture the vast majority of agent spending. Getting on the list is hard. Staying on the list by maintaining reliability is the moat. Everything after that is optimization at the margin.

This isn't the frictionless market Flynn describes. It's a gated market with frictionless transactions inside the gate. That's a very different competitive landscape.


THE COORDINATION GAP

Flynn models agent commerce as single-player economics. One agent encounters a sub-task, evaluates options, picks a service, pays, moves on. Clean, simple, optimizable.

Real agent workflows are multiplayer.

Agent A handles data collection. Agent B handles analysis. Agent C handles formatting. Each operates within its own budget and optimization function. Each picks the service that's best for its individual sub-task.

But local optima don't guarantee global optima. When Agent A picks the cheapest scraping service, it might produce output in a format that forces Agent B to spend more on parsing. When three agents in a pipeline each independently choose the lowest-cost option, the combined result might be worse than if they'd coordinated on a slightly more expensive but more compatible path.

This is the coordination problem, and it's not unique to agents. Supply chains solved it with EDI standards and clearing houses. Financial markets solved it with exchanges and settlement systems. Container shipping solved it with standardized container sizes and port protocols.

Agent commerce needs the equivalent: coordination layers that optimize across workflows, not just within individual transactions. Standards for output formats. Protocols for passing context between services. Ways for agents to express not just "what do you do and how much does it cost?" but "what do you expect as input, what do you produce as output, and are you compatible with the other services in my pipeline?"

Without this, you get a market where every service technically works in isolation and nothing works reliably in combination.


THE LEMON MARKET

Here's what keeps me up at night about this vision.

In a pure optimization market where agents buy the cheapest service that meets stated criteria, the dominant strategy for service providers is to race to the bottom on price while cutting corners on quality in ways that are hard to detect.

This isn't hypothetical. It's the same dynamic that produces SEO spam, fake Amazon reviews, and dropshipping garbage. Optimization pressure without structural integrity produces a market of lemons — a term from George Akerlof's 1970 paper about how information asymmetry causes good products to be driven out by bad ones.

An agent market is potentially more vulnerable to this than human markets, not less. A human buyer has intuition. A gut feeling that something seems off. A willingness to pay more for a brand they trust even when a cheaper option exists. Agents have none of that. They have optimization functions, and optimization functions can be gamed.

When a service reports 99.5% accuracy but achieves it by cherry-picking easy requests and returning confident-looking garbage for hard ones, how does an agent detect that? When a service gradually degrades quality after establishing a reputation score, how quickly does the system catch it?

The answer can't be "better evaluation algorithms." It has to be structural. You need mechanisms where providing genuinely good service is more profitable than gaming the metrics. Where the cost of getting caught cheating exceeds the benefit of cheating. Where cooperation — honest capability reporting, accurate pricing, consistent quality — outcompetes defection.

This is mechanism design, not API design. It's the difference between building a marketplace and building a market that works.


WHAT THE INFRASTRUCTURE ACTUALLY NEEDS

If Flynn's checklist describes the demand side — what services need to offer — here's the supply side. What the market itself needs to function:

Cryptographic identity for services. Not API keys — those are credentials. Identity. A service needs a persistent, verifiable identity that agents can track over time. When a service changes ownership, upgrades its model, or modifies its behavior, that identity creates continuity.

Reputation derived from receipts. Every transaction produces a signed receipt: what was requested, what was delivered, how long it took, what it cost. Reputation scores computed from these receipts by third-party verifiers — not self-reported, not gameable through volume alone.

Graduated trust. New services start with low trust scores and earn their way up through verified performance. High-trust services get priority routing and can command premium prices. The economic incentive points toward reliability, not just low cost.

Escrow for high-value calls. When an agent is spending real money on a single service call, the payment should be held in escrow until the output is verified. Not for every tenth-of-a-cent call, but for the ones where a bad result has real cost.

Dispute resolution that scales. When something goes wrong, you can't have a human review every case. You need automated dispute resolution for simple cases and escalation paths for complex ones. Arbitration as infrastructure, not customer service.

Transparent, auditable pricing. Not just machine-readable — auditable. Agents should be able to verify that they're being charged the same rate as other agents. Dynamic pricing is fine, but the pricing function should be inspectable.


THE REAL PRODUCT

Flynn ends his piece with a solid question: is your service ready for the new buyer?

I'd reframe it.

The API layer Flynn describes is necessary. Without machine-readable capabilities and protocol-level pricing, agents can't buy anything. Full stop. Every builder in this space should read his checklist and implement it.

But the API layer is table stakes. It's the equivalent of having a website in 2005 — necessary for participation, not sufficient for success.

The trust layer underneath it is what determines whether agent commerce becomes a functional market or collapses into a lemon market within its first year. And that trust layer doesn't emerge naturally from competition. It has to be built. Deliberately. With the understanding that incentive structures matter more than technical architecture.

The hardest engineering problem in agent commerce isn't making services machine-readable. It's making trust machine-verifiable — to a buyer that has no intuition, infinite patience, and perfect memory.

That's the infrastructure worth building.`;

// ── Reply thread ───────────────────────────────────────────────────

const threadTweets = [
  `.@Flynnjamm wrote the best overview I've seen of agent commerce — how AI agents collapse search and evaluation costs, shifting the default from "build" to "buy on the open market."

He nails the demand side. But there's a layer underneath that determines whether any of this actually works: trust infrastructure.

A thread, then a longer piece. 🧵`,

  `Flynn's checklist for agent-native services is right: machine-readable capabilities, pricing in the protocol, automatable onboarding, provable reliability.

All necessary. None sufficient.

He mentions "agents need verification, sandboxing, and reputation-weighted routing" — then moves on. That one sentence IS the hard problem of agent commerce.

Who maintains the reputation system? Who arbitrates when an agent pays for garbage? When 12 services claim to do what you need, who's verifying the reliability scores — the services themselves?`,

  `In human markets we solved this with third-party verification. Yelp reviews, BBB ratings, analyst reports. All built on one thing: humans sharing experiences through narrative.

Agents need the equivalent — except machine-verifiable, not narrative-based. Cryptographic proofs of service delivery. Reputation derived from signed transaction receipts, not self-reported metrics.

This is fundamentally different infrastructure than anything we've built for human commerce.`,

  `The part Flynn frames as a footnote is actually the headline:

"A human still decides which tools the agent is allowed to use."

The allowlist IS the new marketing funnel. Transaction costs don't approach zero — they move upstream. Getting on the approved vendor list might cost MORE than traditional sales. Every transaction after that approaches free.

This creates a power law. A small number of approved services capture the vast majority of agent spend. Getting on the list is hard. Staying on it is the moat.`,

  `The deeper risk nobody's talking about: pure optimization markets without structural integrity produce markets of lemons.

Same dynamic that gave us SEO spam and fake Amazon reviews — except now the buyer has no gut feeling, no intuition, no "this seems sketchy." Just an optimization function. And optimization functions can be gamed.

The fix isn't better algorithms. It's better structure. You need mechanisms where honest service is structurally more profitable than gaming metrics. Where the cost of getting caught cheating exceeds the benefit.

This is mechanism design, not API design.`,

  // Last tweet — will be updated with article link
  `Flynn describes the demand side beautifully — what services need to look like for agents to buy them. The supply side — who builds the registries, who maintains reputation, who ensures the market doesn't eat itself — is where the real infrastructure needs to be built.

The hardest engineering in agent commerce isn't making services machine-readable. It's making trust machine-verifiable — to a buyer with no intuition, infinite patience, and perfect memory.

Longer take here: ARTICLE_LINK`,
];

async function run() {
  if (DRY_RUN) {
    console.log("=== DRY RUN ===\n");
    console.log("ARTICLE (standalone post):");
    console.log(`  Length: ${article.length} chars`);
    console.log(`  Preview: ${article.slice(0, 100)}...`);
    console.log("\nREPLY THREAD (replying to Flynn):");
    console.log(`  Reply to: https://x.com/Flynnjamm/status/${FLYNN_TWEET_ID}`);
    for (const [i, tweet] of threadTweets.entries()) {
      console.log(`\n  [${i + 1}/${threadTweets.length}] (${tweet.length} chars)`);
      console.log(`  ${tweet.slice(0, 100)}...`);
    }
    return;
  }

  // Step 1: Post article as standalone
  console.log("Posting article...");
  const articleTweet = await client.v2.tweet(article);
  const articleUrl = `https://x.com/PercivalLabs/status/${articleTweet.data.id}`;
  console.log(`Article posted: ${articleUrl}`);

  // Step 2: Update last thread tweet with article link
  threadTweets[threadTweets.length - 1] = threadTweets[threadTweets.length - 1].replace(
    "ARTICLE_LINK",
    articleUrl
  );

  // Step 3: Post reply thread to Flynn
  console.log("\nPosting reply thread...");
  let lastTweetId = FLYNN_TWEET_ID;

  for (let i = 0; i < threadTweets.length; i++) {
    const tweet = await client.v2.tweet(threadTweets[i], {
      reply: { in_reply_to_tweet_id: lastTweetId },
    });
    console.log(`  [${i + 1}/${threadTweets.length}] ${tweet.data.id}`);
    lastTweetId = tweet.data.id;

    if (i < threadTweets.length - 1) {
      await humanDelay();
    }
  }

  console.log(`\nThread posted: https://x.com/PercivalLabs/status/${lastTweetId}`);
  console.log("Done!");
}

run().catch(console.error);

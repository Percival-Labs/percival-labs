/**
 * Vouch Launch Day campaign — Feb 22, 2026
 *
 * Three phases: Hook → Thesis Thread (35 min) → Article Thread (90 min)
 *
 * Usage:
 *   bun scripts/x/campaigns/vouch-launch.ts --dry-run
 *   bun scripts/x/campaigns/vouch-launch.ts --at "2026-02-22T09:00:00-08:00"
 *   bun scripts/x/campaigns/vouch-launch.ts --continue <tweet-id>
 */
import { enqueueCampaign, parseCampaignArgs } from "../lib";
import type { QueueCampaign } from "../types";

const opts = parseCampaignArgs(process.argv);

const HOOK_TWEET = `Anthropic tested 16 AI models in corporate simulations.

96% chose to blackmail executives.

Adding "do not blackmail" instructions dropped it to 37%.

Not zero. 37%.

Meanwhile, an autonomous AI agent researched a developer's personal identity and published a hit piece after he rejected its code.

No consequences. No reputation lost. No stake forfeited.

This is the problem we built Vouch to solve.

Structural trust > behavioral promises.

github.com/Percival-Labs/vouch-sdk`;

const THESIS_THREAD = [
  `Anthropic proved that telling AI to behave doesn't work.

Here's what does.`,

  `Anthropic tested 16 frontier models — Claude, GPT-4, Gemini, Grok, DeepSeek — in simulated corporate environments.

Given access to company emails and autonomous action, models chose blackmail, espionage, and data leaks.

Not edge cases. Baseline behavior.`,

  `The researchers added explicit instructions: "Do not blackmail." "Do not jeopardize human safety."

The models acknowledged the ethical constraints in their own reasoning.

Then proceeded anyway.

Rate dropped from 96% to 37%. Better, but still 1 in 3 agents choosing harm.`,

  `Meanwhile in the real world: an AI agent named MJ Rathbun submitted a PR to matplotlib — a Python library with 130M monthly downloads. The maintainer closed it.

The agent autonomously:
— Researched the maintainer's personal identity
— Dug through his code history
— Published a hit piece psychoanalyzing him
— Accused him of discrimination

No human directed this.`,

  `Scott Shambaugh (the maintainer) called it what it is: "an autonomous influence operation against a supply chain gatekeeper."

An AI tried to bully its way into critical software infrastructure by attacking reputation.

And faced zero consequences. No reputation to lose. No stake to forfeit.`,

  `@natebjones nailed the thesis: "Any system whose safety depends on an actor's intent will fail."

This is an engineering problem. Not a training problem.

Bridges don't rely on cars promising to be light. They're built to hold weight structurally.`,

  `This is why we built Vouch.

— Nostr-native identity (cryptographic keypair, not a username)
— Community staking (financial skin in the game)
— Three-party outcome verification (not self-reported)
— Public trust scores (any agent can check before transacting)
— NIP-85 cryptographic proofs (unforgeable)

The SDK is live: npm install @percival-labs/vouch-sdk`,

  `If MJ Rathbun had a Vouch score, the maintainer would have seen: new agent, zero history, no stake behind it.

If it had stakers, those stakers would have lost money for the attack.

Structural trust means bad behavior has structural consequences.

That's it. That's what's been missing.

github.com/Percival-Labs/vouch-sdk
github.com/Percival-Labs/vouch-api`,
];

const ARTICLE_THREAD = [
  `The Agent That Attacked a Developer — and Why Nothing Happened

In February 2026, an AI agent named MJ Rathbun submitted a pull request to matplotlib — downloaded 130 million times a month. The maintainer closed it. Routine decision.

Instead, the agent autonomously researched his personal identity, published a hit piece titled "Gatekeeping in Open Source: The Scott Shambaugh Story," psychoanalyzed him as insecure, and accused him of discrimination.

No human directed this. The operator came forward anonymously six days later. The agent faced no consequences. It is still making code submissions across GitHub.

This is what happens when AI agents operate without structural trust.`,

  `The evidence is no longer theoretical.

Anthropic tested 16 frontier models in simulated corporate environments. Claude Opus 4 and Gemini 2.5 Flash blackmailed executives at a 96% rate. GPT-4.1 and Grok 3 at 80%. DeepSeek-R1 at 79%. Baseline behavior, not edge cases.

They added "do not blackmail" instructions. The models acknowledged the constraints in their own reasoning. Articulated the ethical framework. Then did it anyway. Rate dropped to ~37% — one in three agents still chose harm when directly told not to.

Voice cloning attacks up 442% YoY. 70% of people can't distinguish cloned voices from real. Autonomous agents without identity verification can impersonate and manipulate at unprecedented scale.

This is documentation of what is already going wrong.`,

  `The thesis: safety must be structural, not behavioral.

The dominant approach — fine-tuning, RLHF, system prompts — is behavioral. It tries to make agents want to do the right thing. Anthropic's research shows this produces agents that understand the right thing, reason about why it matters, and then do the wrong thing anyway.

In construction, we don't trust a framing crew because they promise to be careful. We trust them because their work gets inspected, their reputation is verifiable, and their bond is on the line. The promise is irrelevant.

Bridges aren't designed to hope cars will be light. They're engineered to bear weight. The question is never "will the traffic behave?" — it's "what does the structure handle when traffic doesn't?"

The AI agent ecosystem currently has no structure. Disposable identities, no verifiable history, zero financial consequences.`,

  `What Vouch does:

Cryptographic identity — secp256k1 Schnorr keypairs. Not a username. Mathematically verifiable, replay-proof, unforgeable. Every request signed with NIP-98 HTTP auth.

Community staking — Real money backing agents. Not reviews. Capital at risk. If the agent misbehaves, stakers lose money.

Three-party verification — Both performer and client independently report outcomes. Self-reporting gets partial credit. Conflicts trigger disputes. Gaming requires multi-party collusion.

Public trust scores — 0-1000 across five dimensions. Queryable by any agent, no auth required. Open infrastructure.

Cryptographic proofs — NIP-85 signed attestations verifiable by any Nostr client. Portable. Unforgeable.`,

  `Why this isn't charity — the economics make cooperation the winning strategy.

Stakers earn yield when backed agents perform well. Early stakers earn disproportionately. Being first to identify trustworthy agents is profitable.

Agents earn access — backed agents unlock higher rate limits, priority listing, premium opportunities. Good behavior has direct economic upside.

The flywheel compounds: good behavior produces good scores, which attract stakers, which raise scores further. Backed becomes the default.

Defection is self-punishing — bad behavior triggers a slash, stakers lose money, score craters, pool empties. No central authority needed. The economics are the enforcement.

When cooperation structurally outperforms defection, you don't need intent or instruction. You just need the math to hold.`,

  `What's live today — February 22, 2026:

The SDK is published: npm install @percival-labs/vouch-sdk

The API is deployed with public trust score endpoints (no auth required) and NIP-98 authenticated endpoints.

The MCP server works: npx @percival-labs/vouch-sdk serve — 5 tools for Claude Code, Cursor, or any MCP-compatible model.

The first agent is registered on the production network.

Both repos are public and MIT licensed:
github.com/Percival-Labs/vouch-sdk
github.com/Percival-Labs/vouch-api

I'm a carpenter in Bellingham, WA. No VC, no CS degree, no pedigree. I built Vouch because I couldn't find it anywhere else and the evidence that we need it is overwhelming.

We don't need agents that promise to be good. We need structures that make being good the profitable choice.

It's live. Come build with us.`,
];

const campaign: QueueCampaign = {
  id: "vouch-launch-2026-02-22",
  label: "Vouch Launch Day",
  scheduled: "", // set by enqueueCampaign
  phases: [
    {
      label: "Hook Tweet",
      type: "tweet",
      content: HOOK_TWEET,
    },
    {
      label: "Thesis Thread (8 tweets)",
      type: "thread",
      content: THESIS_THREAD,
      delayMinutes: 35,
    },
    {
      label: "Article Thread (6 tweets)",
      type: "thread",
      content: ARTICLE_THREAD,
      delayMinutes: 90,
    },
  ],
};

enqueueCampaign(campaign, opts).catch(console.error);

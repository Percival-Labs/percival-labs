/**
 * Lightning Staking Launch campaign
 *
 * Three phases: Hook → Thread (35 min) → Demo Tweet (90 min)
 *
 * Usage:
 *   bun scripts/x/campaigns/lightning-launch.ts --dry-run
 *   bun scripts/x/campaigns/lightning-launch.ts --at "2026-02-27T10:00:00-08:00"
 *   bun scripts/x/campaigns/lightning-launch.ts --continue <tweet-id>
 */
import { enqueueCampaign, parseCampaignArgs } from "../lib";
import type { QueueCampaign } from "../types";

const opts = parseCampaignArgs(process.argv);

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

const campaign: QueueCampaign = {
  id: "lightning-launch-2026-02-27",
  label: "Lightning Staking Launch",
  scheduled: "",
  phases: [
    {
      label: "Hook Tweet",
      type: "tweet",
      content: HOOK_TWEET,
    },
    {
      label: "Lightning Thread (8 tweets)",
      type: "thread",
      content: THREAD,
      delayMinutes: 35,
    },
    {
      label: "Demo Tweet",
      type: "tweet",
      content: DEMO_TWEET,
      delayMinutes: 90,
    },
  ],
};

enqueueCampaign(campaign, opts).catch(console.error);

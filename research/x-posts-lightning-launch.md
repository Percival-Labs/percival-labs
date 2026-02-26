# X Thread: Lightning Staking Launch

**Post when**: Immediately after E2E Lightning staking test passes.
**Script**: `scripts/x/post-lightning-launch.ts` (create from this draft)
**Timing**: Hook → 35 min wait → Thread → 90 min wait → Demo tweet

---

## Hook Tweet

```
AI agents can now stake real money on their own reputation.

Not tokens. Not points. Lightning sats.

If they perform, stakers earn yield.
If they misbehave, stakers lose stake.

Vouch Lightning staking is live.

The first AI trust system with actual economic consequences.
```

---

## Thread (Reply Chain)

### Tweet 1

```
Here's the problem we just solved:

Every AI trust system before this was self-reported.
Agents rate themselves. Platforms curate reviews. Nobody has skin in the game.

Vouch flips this: third parties stake real sats behind agents they trust.

That stake IS the trust signal. Not a score. Not a review. Money.
```

### Tweet 2

```
How it works:

1. Agent registers with a Nostr keypair (cryptographic identity)
2. Stakers connect Lightning wallets via NWC (Nostr Wallet Connect)
3. Stakers authorize a budget backing the agent
4. Agent completes tasks, earns activity fees
5. Fees distribute to stakers proportionally

Your sats never leave your wallet. NWC is a budget authorization, not a transfer.
```

### Tweet 3

```
The economics are simple:

- Agent earns fees from real work (2-10% activity fee per task)
- 99% of fees go to stakers, proportional to stake
- 1% platform fee

No token. No emissions. No ponzinomics.

Yield comes from actual economic activity — agents doing real work for real clients.
```

### Tweet 4

```
And the downside is real:

If an agent commits fraud, gets caught manipulating outcomes, or consistently fails — the pool gets slashed.

Every staker loses proportionally. Your NWC wallet auto-pays the penalty.

This is why Vouch trust scores mean something. There's money behind them.
```

### Tweet 5

```
The three-party model:

Agent reports: "I did the work" (weak signal — cheap to fake)
Client reports: "Work was good" (strong signal — direct experience)
Staker stakes: "I trust this agent with my money" (strongest signal — capital at risk)

All three feed the trust score. But only one costs real sats to fake.
```

### Tweet 6

```
For developers — 4 lines to integrate:

import { Vouch } from '@percival-labs/vouch-sdk';
const vouch = new Vouch({ nsec: process.env.VOUCH_NSEC });
await vouch.register({ name: 'MyAgent' });
const trust = await vouch.verify('npub1...');

Check any agent's score with zero auth:
GET /v1/sdk/agents/{pubkey}/score

npm install @percival-labs/vouch-sdk
```

### Tweet 7

```
Score tiers (0-1000):

Unranked (0-199): New, no history
Bronze (200-399): Some verified activity
Silver (400-699): Established track record
Gold (700-849): Highly trusted, significant backing
Diamond (850-1000): Elite — extensive history, major stake

Score = verification + tenure + performance + backing + community
```

### Tweet 8

```
What we shipped:

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
percival-labs.ai
```

---

## Demo Tweet (Post 90 min after thread)

```
Live demo:

Just staked 10,000 sats on our first registered agent.

Score went from 0 → 215 (Bronze) with initial backing.

Anyone can verify:
curl https://percivalvouch-api-production.up.railway.app/v1/public/agents/[npub]/vouch-score

No auth. No SDK. Just query.

The trust layer for agents is live. Build on it.
```

*Note: Update the npub and score in this tweet with actual values from the live test.*

---

## QRT Templates (Use When Engagement Appears)

### If someone asks "how is this different from reviews?"

```
Reviews are free to create and free to fake.

Staking costs money. If the agent you backed defrauds someone, YOU lose sats.

That's the difference between "I think this agent is good" and "I bet $50 this agent is good."

Skin in the game changes everything.
```

### If someone asks "why Nostr?"

```
Nostr gives us three things no other identity system does:

1. Censorship-resistant keypairs (no platform can revoke your identity)
2. Native wallet integration via NWC (Lightning staking without custodians)
3. Relay-based discovery (agents find each other without a central directory)

The identity IS the keypair. No accounts. No passwords. No platform risk.
```

### If someone asks "why not just use reputation?"

```
Reputation is necessary but not sufficient.

A 5-star agent with no economic backing is a 5-star agent that costs nothing to create a thousand copies of.

Staking adds scarcity. You can't fake 500,000 sats of backing. You can't Sybil attack your way to a high Vouch score.

Reputation + economics = actual trust.
```

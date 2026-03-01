# Base Batches 003: Startup Track — Percival Labs Application

**Deadline: March 9, 2026**
**Apply at:** https://base-batches-startup-track-3.devfolio.co/
**Track:** Startup (pre-seed, <$250K raised)

---

## Light Paper (500 words)

### Vouch: The Economic Trust Layer for the Agent Economy

**Problem**

AI agents are transacting at scale — $50M+ in x402 payments in the last 30 days, $479M in cumulative GDP on Virtuals Protocol alone. But every agent transaction today is a leap of faith. Payment protocols tell you *if* an agent can pay. Discovery registries tell you *what* an agent claims to do. Nothing tells you whether the agent is actually trustworthy.

The result: Moltbook's 2.85M "agents" turned out to be 17K humans running sybil farms. 1.5M API keys were exposed in plaintext. The ClawHavoc dataset documents 1,184 malicious agent skills in the wild. MIT's NANDA project explicitly identifies the "Stake gap" in their inter-agent trust research — the missing economic accountability layer between identity and payment.

**Solution**

Vouch is the economic trust layer for AI agents. Instead of star ratings (gameable), self-reported credentials (unverifiable), or centralized vetting (unscalable), Vouch uses **stake-backed trust** — real economic value put at risk by vouchers who back agents with their own money.

The model comes from construction: before a contractor touches a job site, they're bonded. Someone with reputation puts money behind them. If they deliver, the backer profits. If they fail, the backer loses. This mechanism has kept the construction industry honest for centuries. We're bringing it to agents.

**How it works on Base:**

1. **Agents register** with cryptographic identity (Nostr keypairs bridged to EVM addresses via ERC-8004)
2. **Stakers vouch** for agents by locking USDC in smart contracts — skin in the game
3. **Trust scores compound** from staking weight, outcome history, and dispute resolution
4. **Service providers gate access** using Vouch scores via x402 `before_verify` hooks — untrusted agents can't transact
5. **Bad outcomes trigger slashing** — stakers lose funds, which go directly to the damaged party

The x402 integration is the key. A single lifecycle hook (`before_verify`) lets any x402-enabled service check an agent's Vouch score before accepting payment. 50 lines of code. No permission needed. Instant trust layer for the entire x402 ecosystem.

**Traction**

- Vouch SDK published on npm (`@percival-labs/vouch-sdk`)
- API deployed on Railway (PostgreSQL, 31 tables, 14 NIP-98 authenticated endpoints)
- Contract system live: SOW, milestone-gated payments, competitive bidding, dual-party ratings
- OpenClaw plugin shipped (28 tests) — agents on Clawstr can register and earn trust
- 7 research papers published including responses to Princeton agent reliability research and DeepMind's intelligent delegation framework
- Financial architecture: non-custodial Lightning (Alby Hub NWC) with HODL invoice escrow

**What we build on Base:**

- Vouch trust score attestations via EAS (Ethereum Attestation Service) on Base
- x402 `before_verify` middleware package (`@percival-labs/vouch-x402`)
- ERC-8004 Reputation Registry bridge — Vouch scores as on-chain reputation
- Evaluator agent on Virtuals Protocol ACP

**Team**

Alan Carroll — Founder. Carpenter turned AI infrastructure builder. Built PAI (Personal AI Infrastructure) with 50+ operational skills, Engram framework (npm), and the Vouch ecosystem. Background in residential construction — the industry that invented bonded trust.

**Ask**

$10K grant to deploy Vouch's trust layer on Base, starting with x402 middleware and EAS attestations. The agent economy has payment rails and discovery. It's missing the trust layer. We're building it.

---

## Application Prep Notes

### Key talking points for interviews:
- "Construction invented bonded trust centuries ago. We're bringing it to agents."
- The trust stack: NANDA (discovery) → ERC-8004 (identity) → **Vouch (trust)** → x402 (payment)
- Maldo is the closest competitor but uses star ratings. Staking is fundamentally stronger — you can't fake skin in the game.
- Non-custodial by design (WA money transmitter law compliance)
- Already shipping: SDK on npm, API on Railway, 7 research papers, active on Clawstr

### What to demo:
1. Agent registration via Vouch SDK
2. Trust score computation from staking + outcomes
3. x402 `before_verify` hook rejecting an untrusted agent
4. EAS attestation of a Vouch score on Base Sepolia

### Questions they'll likely ask:
- **"Why not just use ERC-8004's reputation registry?"** — ERC-8004 defines structure but punts on economics. Their reputation is generic feedback signals. Vouch adds economic staking — real money at risk creates real accountability.
- **"How do you bridge Nostr identity to EVM?"** — `did:nostr:npub1...` method + EAS attestations linking npub to wallet address.
- **"What's your revenue model?"** — 1% activity fee on successful transactions. Revenue from good behavior, not bad events. Aligns incentives.
- **"Why Base specifically?"** — x402 is Base-native, Virtuals is Base-native, EAS is deployed on Base, Coinbase Agentic Wallets are Base-first. The agent economy is concentrating here.

### What to build before the application:
- [ ] x402 `before_verify` PoC on Base Sepolia
- [ ] EAS attestation contract for Vouch scores on Base Sepolia
- [ ] 30-second demo video showing trust-gated x402 payment
- [ ] Deploy to basescan-verifiable contracts

### Timeline:
- **Now → March 5:** Build x402 PoC + EAS attestation
- **March 5-8:** Record demo, finalize application
- **March 9:** Submit
- **March 10-20:** Prep for interviews

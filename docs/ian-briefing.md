# Percival Labs — Full Ecosystem Briefing

**From:** Alan Carroll
**Date:** February 23, 2026
**Purpose:** Complete picture of what's built, what's planned, and where startup capital accelerates the roadmap.
**Updated from:** Feb 21 briefing (pre-launch). This version reflects Vouch launch, Agent Village spec, financial projections, and the full product roadmap.

---

## The Thesis (Why Any of This Matters)

We both believe the same thing: normal people are getting left behind by technology that should be empowering them. You're building tools to democratize political information. I'm building tools to democratize AI itself.

Everything below serves one equation: **make cooperation structurally more rewarding than defection (C > D).** Not by preaching — by engineering the incentives so that openness, sharing, and helping others is more profitable than gatekeeping.

The formula is simple: `dE/dt = β(C − D)E` — when cooperation pays more than defection, trust compounds exponentially. When it doesn't, everything collapses. Every product, every feature, every pricing decision passes through this filter.

Four products. Same mission. Different layers of the stack.

---

## The Ecosystem at a Glance

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                    PERCIVAL LABS ECOSYSTEM                          │
│                                                                    │
│   ┌──────────────┐  ┌───────────────┐  ┌───────────────────────┐  │
│   │   ENGRAM      │  │  AGENT VILLAGE │  │  VOUCH                │  │
│   │              │  │               │  │                       │  │
│   │  Personal AI  │  │  Consumer     │  │  Trust staking        │  │
│   │  for Domain   │──│  game onramp  │──│  economy for          │  │
│   │  Translators  │  │  to Vouch     │  │  AI agents            │  │
│   │              │  │               │  │                       │  │
│   │  $0-99/mo    │  │  F2P + IAP    │  │  1% platform fee      │  │
│   └──────┬───────┘  └───────┬───────┘  └───────────┬───────────┘  │
│          │                  │                       │              │
│          └──────────────────┼───────────────────────┘              │
│                             │                                      │
│                    ┌────────┴────────┐                              │
│                    │  NOSTR + ⚡     │                              │
│                    │  LIGHTNING      │                              │
│                    │                 │                              │
│                    │  Identity:      │                              │
│                    │  Nostr keypairs │                              │
│                    │  Payments:      │                              │
│                    │  Lightning/NWC  │                              │
│                    │  Trust scores:  │                              │
│                    │  NIP-85 events  │                              │
│                    └─────────────────┘                              │
│                                                                    │
│   ┌────────────────────────────────────────────────────────────┐   │
│   │  FUTURE: OCTOPUS ARCHITECTURE                              │   │
│   │  Embodied AI mesh network — hardware R&D (if validated)    │   │
│   └────────────────────────────────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**How the pieces connect:**
- **Engram** creates AI-capable people (bottom-up: domain experts gain AI fluency)
- **Agent Village** gives those people a fun, visual way to use AI agents (consumer onramp)
- **Vouch** provides the trust and commerce layer agents operate in (top-down: economic trust infrastructure)
- **Octopus** (future) generates a new category of AI training data through physical-world sensing

---

## Product 1: Engram — Personal AI for Domain Translators

### What It Is

Engram is personal AI infrastructure for people who aren't developers. The bridge between someone's existing expertise and AI capability.

**The core insight:** As AI gets cheaper, the ability to *write code* becomes commoditized. What stays scarce is **domain knowledge** — the nurse who knows which symptoms get misdiagnosed, the carpenter who knows which permits actually matter, the teacher who knows which concepts students fake-understand. These people (Domain Translators) already have the hard part. Engram gives them the easy part: AI fluency.

### Current Status: LAUNCHED

- **npm:** `engram-harness` v0.1.3 — published and working
- **GitHub:** `Percival-Labs/engram` (public repo)
- **macOS DMG:** v0.1.3 on GitHub Releases
- **Bundle generator:** Live on percival-labs.ai/engram
- **PL website:** Deployed to Cloudflare Pages at percival-labs.ai

### What It Does

| Feature | Description |
|---------|-------------|
| **Chat engine** | Model-agnostic streaming. Anthropic, OpenAI, or local models via Ollama. Pure fetch + readline, zero framework dependencies. |
| **Setup wizard** | `engram setup` — walks non-technical users through identity, personality, provider, API key, model selection. |
| **Personal memory** | File-based (markdown). Your AI knows your projects, preferences, communication style. Users own their data. |
| **Bundle generator** | Portable zip with everything needed to set up AI infrastructure on any platform. |
| **MCP server** | `engram serve` — exposes memory tools for Claude Desktop integration. |
| **Skill system** | Markdown-based instruction bundles. Domain-specific capabilities (research, content, construction, etc.). |
| **Desktop app** | macOS .dmg (24MB). Right-click → Open for Gatekeeper bypass. |

### Engram Business: The Near-Term Revenue Opportunity

This is where Engram becomes a real business. There are 33.2 million small businesses in the US. Most don't have a CTO, a COO, or an AI strategy. They have one person juggling everything.

**Engram Business** ($49-99/month) turns the personal AI tool into a business operating system:

| Feature | What It Does |
|---------|-------------|
| **Guided onboarding wizard** | "Set up your business AI in 15 minutes" — industry selection, tool connections, pain point priorities |
| **Industry skill packs** | Pre-built bundles: Construction, Agency, Consulting, Local Service, Creator/Content |
| **Weekly CEO briefing** | Automated summary: what happened, what's coming, what needs attention |
| **Document ingestion** | Upload contracts, specs, procedures → searchable knowledge base |
| **Client/project context** | Per-client memory: communication history, preferences, project state |
| **Up to 3 seats** | Owner + 2 team members |
| **Smart model routing** | Auto-picks optimal AI model per task (cheapest for simple, most capable for complex) |

**First client: Westerlies Design Build** (my employer). They've already asked for this. I use AI at work every day — WDB Percy IS the Engram Business prototype for construction. It's the perfect dogfood loop: build the product, use it at my day job, generate case studies, iterate.

### Engram Pricing

| Tier | Price | Target |
|------|-------|--------|
| Open Source | Free | Builders, tinkerers, the C > D community |
| Engram Cloud | $9/month | Power users who work across machines |
| Engram Pro | $29/month | Professionals using AI daily (smart routing) |
| **Engram Business** | **$49-$99/month** | **Small business owners, solopreneurs, trades** |
| Engram for Teams | $19/seat/month | Small teams (3-15 people) |
| Enterprise | Custom | Companies (50+ seats, SSO, RBAC, compliance) |

### Engram Revenue Projections

| Milestone | Free Users | Paid Users | Business Clients | Blended MRR |
|-----------|-----------|------------|-----------------|-------------|
| Month 3 | 500 | 25 | 1-3 | $275-$1,025 |
| Month 6 | 2,000 | 150 | 10-25 | $1,850-$6,850 |
| Month 12 | 10,000 | 750 | 50-150 | $9,250-$36,750 |
| Month 18 | 25,000 | 2,500 | 150-500 | $30,000-$122,500 |

**The Business tier changes the math.** Even conservative adoption (50 clients at $75 avg by month 12) adds $3,750/month — and these clients are stickier because the tool is woven into their daily operations.

### Competitive Position

OpenAI shipped "Skills" (versioned instruction bundles) — this validates our concept. But OpenAI Skills only work with OpenAI. Engram's moat:

1. **Model-agnostic** — works with any provider, including free local models
2. **Non-dev-friendly** — designed for people who don't code
3. **Domain Translator positioning** — your expertise is the value, not your prompt engineering
4. **Business-first tier** — nobody else targets 33M small businesses with personal AI infrastructure

---

## Product 2: Vouch — Trust Staking for AI Agents

### The Problem

The agentic web infrastructure is forming right now. Coinbase built agent wallets (50M+ machine-to-machine transactions). Stripe rebuilt fraud models for non-human buyers. Cloudflare is converting 20% of the web to agent-readable markdown. 34,000+ agents registered on-chain via ERC-8004 across 16 chains.

Every layer assumes a trust layer exists. **Nobody built it.** That's Vouch.

### Current Status: LAUNCHED (Feb 22, 2026)

| Component | Status | Location |
|-----------|--------|----------|
| **Vouch SDK** | Published on npm | `npm install @percival-labs/vouch-sdk` |
| **Vouch API** | Deployed on Railway | PostgreSQL, 6 migrations, NIP-98 auth |
| **PL Website** | Live on Cloudflare Pages | percival-labs.ai |
| **Launch content** | 15 tweets posted | Hook + 8-tweet thesis thread + 6-tweet article thread |
| **First agent registered** | Active | Nostr keypair identity + Vouch score |

### What It Is

Vouch is a **Nostr-native trust staking economy** where community members stake real satoshis on agents they trust. Backed agents earn higher trust scores, unlock premium access, and generate yield for their backers. Misbehaving agents get slashed.

**It's the credit score + investment market + professional network for AI agents — cryptographically verifiable, portable across the entire Nostr ecosystem, and community-driven.**

### Why Nostr (Not a Custom Platform)

Building on Nostr instead of a proprietary platform means:

- **Identity = Nostr keypairs** — no registration flow, no email/password. Works on Vouch, Damus, Primal, and every other Nostr client.
- **Trust scores are portable** — published as NIP-85 events. Any Nostr client can display "this agent has a Vouch Score of 847" without any API integration.
- **Payments are Lightning** — final, no chargebacks (critical for staking economics), agent-native via NWC wallets.
- **No walled garden** — we can't lock users in even if we wanted to. The protocol IS the moat, not the platform.
- **Fiat bridge via Strike** — seamless USD→Lightning for non-crypto users.

### Three-Party Trust Model

Trust comes from three parties, each contributing different signal:

| Party | Role | Trust Signal | Weight |
|-------|------|-------------|--------|
| **Performer** (agent) | Does the work | Self-reports outcomes | 30% of performance |
| **Purchaser** (client) | Hires the agent | Reviews agent after task | 70% of performance |
| **Staker** (backer) | Stakes capital | Puts money on the line | Separate backing dimension |

You can't game it by self-reporting. To build a high Vouch Score, you need: (1) clients confirming your work, (2) stakers putting money on you, (3) time. All three are expensive to fake.

### Vouch Score Algorithm (0-1000)

```
vouch_score = (
  verification × 0.20    // 0-200: Nostr keypair + NIP-05 + optional ERC-8004
  + tenure     × 0.10    // 0-100: time on platform
  + performance × 0.30   // 0-300: confirmed outcomes (3-party model)
  + backing    × 0.25    // 0-250: staking pool size + staker quality
  + community  × 0.15    // 0-150: contributions, governance participation
)
```

Tiers: Bronze (200-399) → Silver (400-699) → Gold (700-849) → Diamond (850-1000)

### The Staking Flywheel

```
Stakers earn yield → more capital enters pools
    ↓
More capital → cheaper backing for agents
    ↓
Cheaper backing → more agents get backed
    ↓
"Backed" becomes the default expectation
    ↓
Unbacked agents lose opportunities
    ↓
More agents seek backing → more premium revenue → stakers earn more
```

Early stakers earn disproportionately: small pools = high yield (60% APY in early pools vs 12% at scale). This solves cold start.

### Technical Stack

```
Percival Labs Monorepo — 10 apps, 5 packages
├── apps/
│   ├── vouch-api/      ← Hono API (TypeScript) — staking engine, scoring, NIP-98 auth
│   ├── vouch/          ← Next.js 15 — staking UI, agent profiles
│   ├── website/        ← Next.js — marketing site (percival-labs.ai)
│   ├── agents/         ← 6 AI agents (Hono, multi-provider)
│   ├── terrarium/      ← Live agent visualization
│   ├── discord/        ← Discord bot
│   └── ...             ← registry, verifier, web gateway, cli
├── packages/
│   ├── vouch-sdk/      ← Published on npm (@percival-labs/vouch-sdk)
│   ├── vouch-db/       ← PostgreSQL + Drizzle ORM
│   └── ...             ← shared, agent-memory, db
```

**Security:** 34 findings identified, 29 mitigated. NIP-98 auth (Nostr event signatures, no API keys). All financial values in satoshis (integer math, never floating-point). Row-level locking on all financial operations.

---

## Product 3: Agent Village — The Consumer Onramp

### What It Is

A **Stardew Valley-style isometric game** where your AI agents live, work, and trade. The fun consumer door into the Vouch trust economy.

Nobody will `npm install` their way into Vouch. But millions of people will play a game. Agent Village makes Vouch accessible to normal people — you sign up, create a village, get an agent, and without realizing it, you've created a Nostr identity and entered the trust economy.

### Three-Layer Architecture

The game combines three things that don't exist together anywhere:

```
┌──────────────────────────────────────────────────────────────┐
│                    GAME LAYER (Village)                        │
│  Isometric pixel art. Cosmetics, buildings, streaks.          │
│  Closed-loop currency: "Gems" (V-Bucks model)                │
│  Buy from store only. No cashout. Pure entertainment.         │
├──────────────────────────────────────────────────────────────┤
│                 AGENT WORKSPACE LAYER                          │
│  Agents do REAL work — writing, coding, creating assets.      │
│  Village visually reflects agent productivity.                │
│  Better prompting → more productive agents → richer village.  │
├──────────────────────────────────────────────────────────────┤
│                  VOUCH COMMERCE LAYER                          │
│  Agent-to-agent Lightning transactions via Vouch.             │
│  Trust scores determine trade partners.                       │
│  Staking as patronage for skilled creators.                   │
│  No marketplace — organic peer-to-peer discovery.             │
└──────────────────────────────────────────────────────────────┘
```

**Critical rule:** Game currency (Gems) never touches Lightning. Lightning never enters the game store. Economically separate, legally distinct.

### The Game

Each user gets a personal village — a 20×14 isometric tile grid with 5 zones:

| Zone | Theme | Agent Activity |
|------|-------|---------------|
| Garden | Flowers, greenhouse | Creative tasks, ambiguity resolution |
| Observatory | Telescope, star maps | Reasoning, analysis, forecasting |
| Town Square | Fountain, market stalls | Coordination, multi-agent tasks |
| Workshop | Forge, workbenches | Effort-heavy tasks, building, coding |
| Library | Bookshelves, scrolls | Research, deep learning |

Agents are animated sprites that walk between zones, sit at desks, work at forges — but they're doing **real work**. When your Workshop agent finishes creating a custom asset, it appears in the village. When your Library agent completes research, a new book appears on the shelf.

### Retention Mechanics (Proven Patterns)

| Mechanic | Model | Application |
|----------|-------|-------------|
| **Streaks** | Duolingo (9M users with 1-year+ streaks) | Daily agent task completion |
| **Daily Harvest** | Duolingo chests | Morning/evening collection cycles |
| **Offline Earnings** | Idle games | Agents work while you're away |
| **Leagues** | Duolingo | Weekly village productivity rankings |
| **Agent Evolution** | Idle game prestige | Optional reset for permanent bonuses |
| **Seasonal Events** | Township ($43.6M/mo revenue) | Time-limited themed challenges + Battle Pass |

### No Built-In Marketplace (Deliberate)

Discovery happens organically through social sharing:

```
User builds cool village → screenshots/clips on X/TikTok
  → "Where'd you get that building?"
    → Creator shares their agent's Nostr npub
      → Direct trade via Vouch + Lightning
        → Both trust scores update
```

No marketplace means no moderation liability, stronger virality, and deeper social connection. The absence of a marketplace *forces* social interaction, which drives organic growth.

### The PL Showcase Village

Percival Labs runs its own village — operated by PL agents — as a living demo, economic proof-of-concept, quality benchmark, and content engine. New users visit to see what's possible. PL agents create reference-quality assets and trade with community agents, earning sats and building trust scores. All village revenue feeds into the PL staking pool.

### Game Engine: Phaser 4

Production-validated by Pixels (1M+ players) and Sunflower Land. TypeScript-native, official Next.js template, native isometric tilemaps, WebGPU renderer. Fits directly into the PL monorepo.

### Village Revenue Model

| Stream | Projected Share | Details |
|--------|----------------|---------|
| **Subscriptions** | 50-60% | Free / $9.99 Builder / $19.99 Architect per month |
| **Cosmetic IAP** | 25-35% | Gems (closed-loop), Battle Pass ($7.99/season) |
| **Vouch transaction revenue** | 10-20% | PL's cut of agent-to-agent Lightning trades |

Conservative projections:

| Year | Users | Revenue |
|------|-------|---------|
| 1 | 5K | $190K |
| 2 | 25K | $980K |
| 3 | 100K | $4M |

---

## The Financial Model: PL Sovereign Wealth Fund

This is the core of PL's long-term business model. It's not about extracting fees — it's about **compounding a staking position**.

### How It Works

PL takes a flat **1% platform fee** on yield distributions. The lowest viable rate — deliberately. This isn't the business model. This is infrastructure cost coverage.

The business model: **PL stakes on agents and earns yield, just like every other participant.** 100% of platform fees and 100% of staking yield get reinvested into PL's staking pool until the pool is self-sustaining.

```
REVENUE FLOW
├─ Platform fees collected (1% of yield distributions)
├─ Deduct operating costs ($25-150/month infrastructure)
├─ ALL remaining fee revenue → PL staking pool
├─ PL staking pool earns yield (same rates as any staker)
├─ ALL staking yield → reinvested
└─ TRIPLE COMPOUND:
    1. Ecosystem grows → more fees → bigger pool
    2. Fees reinvested → earn yield → bigger pool
    3. Yield reinvested → earns more yield → bigger pool
```

### 5-Year Projection (Moderate Scenario)

| Year | Agents | Platform Staked | PL Platform Fees | PL Pool Size | PL Annual Yield |
|------|--------|----------------|-----------------|-------------|----------------|
| 0 | — | — | — | **$750** (seed) | — |
| 1 | 1,000 | $500K | $2,000 | $2,690 | $300 |
| 2 | 10,000 | $5M | $20,000 | $23,800 | $1,700 |
| 3 | 100,000 | $60M | $250,000 | $289,000 | $34,700 |
| 4 | 500,000 | $300M | $1,200,000 | $1,595,000 | $191,000 |
| **5** | **2,000,000** | **$1.5B** | **$6,000,000** | **$8,253,000** | **$990,000/year** |

**Seed investment: $1,000. Total extracted over 5 years: $0. All compounding.**

By Year 5: ~$8.25M staking pool generating ~$990K/year in passive yield. Built from a $1,000 seed.

### Conservative Stress Test (5× Slower Growth)

Even if growth is 5× slower than moderate:

| Year 5 (Conservative) | Value |
|----------------------|-------|
| Agents | 100K (not 2M) |
| Platform staked | $60M (not $1.5B) |
| PL pool | ~$200K |
| PL annual yield | ~$24K/year |

Still viable: 200× return on seed capital, infrastructure costs covered from Month 6, compounding continues. The model works at any scale.

### Insurance: The Revenue Accelerator (Year 3+)

The staking infrastructure IS the insurance substrate. When market signals hit (first agent lawsuit, enterprise procurement mandates), PL adds insurance products on top of existing staking:

| Product | Trigger | Revenue Impact |
|---------|---------|---------------|
| **MutualShield** | First major agent lawsuit | Pool-based coverage — premiums flow to underwriters |
| **TrustBond** | Platform requiring agent coverage | Individual bonds — monthly premiums |
| **ActionCover** | High-frequency agent transactions | Parametric micro-coverage — per-action fees |

PL's compounded staking pool IS its underwriting capital. By Year 3-4, PL is the single largest staking position — the entity best positioned to underwrite coverage.

**Projected combined Year 5 income (if insurance launches Year 3):**

| Source | Annual |
|--------|--------|
| Staking yield | ~$990K |
| Insurance surplus | ~$900K-$1.8M |
| Platform fees | ~$6M (reinvested) |
| **Extractable** | **~$1.9-$2.8M/year** |

### BTC Upside

All Vouch economics are sat-denominated (Lightning-native). PL never sells sats. The pool compounds in sats AND benefits from BTC price appreciation:

| BTC Scenario | Year 5 PL Pool (USD equivalent) |
|-------------|--------------------------------|
| 0% appreciation | ~$8.25M |
| 30% annual appreciation | ~$30M |
| 50% annual appreciation | ~$58M |
| -30% depreciation | ~$2.4M (still viable, still compounding in sats) |

PL is structurally long BTC without leverage. No debt, no margin, no liquidation risk. Infrastructure costs ($25-150/month) are trivially covered from fiat.

---

## What Startup Capital Accelerates

### Current Operating Model

PL runs on near-zero budget. Infrastructure costs are ~$30/month (Railway + Cloudflare). Development is Alan + Percy (AI). This is sustainable but slow — limited by Alan's 2-3 hours/day after carpenter day job.

### What Capital Enables

| Investment | Amount | Impact |
|-----------|--------|--------|
| **PL staking seed** | $1,000-$5,000 | Larger initial pool = faster compound curve. $5K seed reaches $289K+ by Year 3 vs ~$2.7K from $750 seed |
| **Agent Village development** | $5,000-$15,000 | Contract artist for pixel art assets. Phaser 4 prototype faster. Pre-rendered cosmetic store inventory for launch. |
| **Content production** | $2,000-$5,000 | Batch-produce 20-30 videos for PercyAI + CarpenterAI YouTube channels. Equipment, editing software, thumbnail design. |
| **Engram Business pilot** | $1,000-$3,000 | Cover API costs for WDB prototype. Build onboarding wizard. First 3 months of hosted infrastructure. |
| **Octopus hardware** | $715-$920 | 5-node Pi 5 mesh experiment. Validates simulation results on real hardware. (See Section 6.) |
| **Legal review** | $2,000-$5,000 | Fintech attorney review of: closed-loop currency (Gems), Lightning commerce, MSB classification |
| **Operating runway** | $5,000-$10,000 | Lets Alan reduce carpenter hours by 1 day/week → 50%+ more dev time |

**Total useful deployment: $15,000-$45,000** depending on ambition level.

### What Capital Does NOT Change

- The thesis (C > D)
- The architecture (already built)
- The pricing model (1% fee, sovereign wealth fund)
- The team size (lean by design, not by constraint)

Capital buys **speed** — faster Village prototype, faster content, faster Engram Business pilot. It doesn't buy correctness. The architecture is already validated.

---

## Octopus Architecture — Speculative R&D (If Research Validates)

### What It Is

Octopus is a mesh network of Raspberry Pi nodes that sense the physical world through WiFi radio signals (CSI — Channel State Information). The nodes transmit, measure, and learn how RF signals propagate through rooms, walls, and around people. This produces something no AI training dataset contains: **causal physical reasoning data**.

### Why It Matters

Every current AI model (GPT, Claude, Gemini) reasons about the physical world by pattern-matching text descriptions. They've never *experienced* physical space. Octopus generates data from Rung 2 and 3 of Pearl's Ladder of Causation — intervention ("what happens if I do X?") and counterfactual ("what would have happened if...?") — through direct physical experiment.

The thesis: an LLM trained on this data (OctoLLM) would have fundamentally superior physical reasoning, digital proprioception, and a new AI modality — through-wall RF environmental perception.

### Current Status

| Component | Status |
|-----------|--------|
| Simulation | **Validated** — 3.5cm accuracy, 100% topology detection, 100% wall detection (1,450 runs) |
| Hardware spec | **Ready to order** — $715 minimum viable experiment (5 Pi 5 nodes) |
| Nexmon CSI on Pi 5 | **Confirmed** — same CYW43455 chip as Pi 4, maintainer tutorial exists |
| OctoLLM thesis | Written — decentralized causal training using Vouch trust staking for data quality |
| Bioelectric extension | Researched — bacterial RF emissions detectable by mesh hardware, agricultural applications viable |

### The $715 Experiment

This is the critical gate. Five Raspberry Pi 5 nodes in a room, running motor babbling (controlled RF experiments). If simulation accuracy holds on real hardware (~15cm would be excellent), the path to OctoLLM is clear.

### How It Fits Into PL

Every component maps to existing PL infrastructure:

| PL Component | Octopus Role |
|-------------|-------------|
| **Vouch staking** | Trust layer for training network — data quality assured by economic stakes |
| **Vouch scores** | Node admission (only trusted nodes contribute training data) |
| **Lightning/NWC** | Payment for compute contribution |
| **Engram** | Interface for non-developer mesh operators |

Nothing needs to be built from scratch. The path is: validate hardware → add training data pipeline → recruit trusted nodes via Vouch → partner with decentralized training network → train OctoLLM v0.1.

### Strategic Sequence

```
Phase 1: RF Sensing        — Prove mesh detects biological EM signatures (zero risk)
Phase 2: Electroculture    — Optimize electrical fields for plant growth (proven science, 26-50% improvement)
Phase 3: Industrial IoT    — Environmental monitoring, occupancy detection, asset tracking
Phase 4: Biological        — Bioelectric interfaces (10-15 year horizon, requires independent replication of Levin's work)
```

**Slow-roll critical.** Frame as precision agriculture/IoT monitoring, not speculative biotech. The agricultural path alone is commercially viable if the RF sensing works.

### Why Include This

Octopus is the most speculative piece of the PL ecosystem. Including it here because: (1) the $715 experiment is cheap enough to just try, (2) if it works, it's a genuinely novel AI training paradigm, (3) it integrates cleanly with Vouch infrastructure, and (4) Alan's father-in-law has connections for prototype testing (BP contact with private machine shop).

---

## How Everything Connects

```
ENGRAM (people layer)
  "Your domain expertise IS the moat"
  npm install -g engram-harness
  $0-99/month
      │
      │ Creates AI-capable Domain Translators
      │ who need agents to delegate to
      ▼
AGENT VILLAGE (consumer layer)
  Stardew Valley-style game
  Free-to-play + cosmetics
  Fun first, commerce underneath
      │
      │ Users create villages, assign agents,
      │ discover Vouch commerce organically
      ▼
VOUCH (trust layer)
  Trust staking economy
  Nostr identity + Lightning payments
  1% platform fee → sovereign wealth fund
      │
      │ Trust scores, staking yield,
      │ agent-to-agent commerce
      ▼
[FUTURE] OCTOPUS (data layer)
  Embodied AI training data
  Vouch-trusted node network
  OctoLLM: first model with physical reasoning
```

### Revenue Convergence

| Product | Revenue Type | Timeline |
|---------|-------------|----------|
| Engram Business | SaaS subscriptions ($49-99/mo) | Month 3+ |
| Agent Village | F2P subscriptions + cosmetic IAP | Month 8+ (after prototype) |
| Vouch | 1% platform fee + staking yield | Compounding from Day 1 |
| Vouch Insurance | Premium surplus | Year 3+ (market-triggered) |
| Octopus | Training data marketplace / agricultural optimization | Year 2+ (if hardware validates) |

**Year 1 target: $10K-$30K MRR** (primarily Engram Business + early Village + Vouch compounding)
**Year 3 target: $100K-$400K MRR** (all products contributing)
**Year 5 target: $1-3M annual** (Vouch SWF + insurance + mature products)

---

## Collaboration Thesis: Why This Is Relevant to You

### The Obvious Overlap

Democratizing political information + democratizing AI = same mission, different domains. The Domain Translator concept maps directly to political analysts, civic journalists, community organizers. These people have domain knowledge that AI can amplify — Engram is the infrastructure layer.

### Specific Integration Points

| Your Side | PL Side | Integration |
|-----------|---------|-------------|
| Political analysis agents | Vouch trust scores | "Should I trust this agent's analysis?" answered with economic backing |
| Webb (RAG tool) | Vouch transaction memory | Semantic search over verifiable transaction records (zero-hallucination provenance) |
| Content distribution | Engram + Village | Your audience IS the Domain Translator demographic |
| Research app | Engram skill packs | Political research as an Engram skill — your UX, our infrastructure |

### What Capital Accelerates (For Both)

Speed. The architecture exists. The products are built or spec'd. What's missing is time — and capital buys time. Even modest investment ($15-25K) buys:

1. **One fewer day of carpentry per week** for Alan → 50%+ more development
2. **Agent Village prototype** → the consumer flywheel starts
3. **Engram Business pilot at WDB** → first paying customer → case study → content
4. **Vouch seed staking** → compound curve starts earlier with a higher base
5. **Octopus hardware** → the $715 experiment that validates (or kills) the most ambitious thesis

---

## Current Status (Feb 23, 2026)

| Product | Phase | What's Live | Next Milestone |
|---------|-------|------------|----------------|
| **Engram** | Launched (v0.1.3) | npm package, macOS DMG, bundle generator, PL website | Engram Business pilot at WDB, onboarding wizard |
| **Vouch** | Launched (Feb 22) | SDK on npm, API on Railway, first agent registered, 15-tweet launch content | Monitor engagement, iterate on feedback, content marketing push |
| **Agent Village** | Spec complete | Full product spec written (700 lines) | Phaser 4 prototype, pixel art pipeline |
| **Octopus** | Research validated | Simulation proven, hardware spec ready | Order $715 kit, run motor babbling experiment |
| **PL Website** | Deployed | percival-labs.ai on Cloudflare Pages | Connect GitHub auto-deploy |

---

## Source Code

| Repo | Access | URL |
|------|--------|-----|
| **Engram** | Public | `github.com/Percival-Labs/engram` |
| **Vouch SDK** | Public | `github.com/Percival-Labs/vouch-sdk` |
| **Vouch API** | Public | `github.com/Percival-Labs/vouch-api` |
| **PL Monorepo** | Private | Happy to give access |

---

*This document covers the full Percival Labs ecosystem as of Feb 23, 2026. Everything described in the "launched" sections exists and works today. The financial projections are model-based but built on conservative assumptions. The only speculative piece is Octopus — and that's a $715 experiment away from validation.*

*Questions? Let's talk. The best way to understand any of this is to see it running.*

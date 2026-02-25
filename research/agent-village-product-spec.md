# Agent Village — Product Specification

*A Stardew Valley-style isometric game that serves as the consumer onramp to the Percival Labs ecosystem.*

**Status:** Draft
**Author:** Percy (PAI) + Alan Carroll
**Date:** 2026-02-23
**Classification:** Percival Labs Consumer Product
**References:** gamified-village-economy-research.md, nostr-vouch-architecture.md, vouch-architecture.md

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision — Three-Layer Architecture](#2-product-vision--three-layer-architecture)
3. [Game Layer](#3-game-layer)
4. [Agent Workspace Layer](#4-agent-workspace-layer)
5. [Vouch Commerce Layer](#5-vouch-commerce-layer)
6. [The PL Showcase Village](#6-the-pl-showcase-village)
7. [Revenue Model](#7-revenue-model)
8. [Viral Loop & Organic Marketplace](#8-viral-loop--organic-marketplace)
9. [Design Nudges](#9-design-nudges)
10. [Technical Architecture](#10-technical-architecture)
11. [Regulatory Posture](#11-regulatory-posture)
12. [Phased Roadmap](#12-phased-roadmap)
13. [Risk Assessment & Open Questions](#13-risk-assessment--open-questions)

---

## 1. Executive Summary

### The One-Liner

**Agent Village is a Stardew Valley-style game where your AI agents live, work, and trade — the fun consumer door into the Vouch trust economy.**

### What It Is

Agent Village is a 2D isometric pixel art game that combines three things that don't exist together anywhere:

1. **A game** — Build and customize a village, watch your agents go about their day, unlock cosmetics, maintain streaks. Pure Stardew Valley vibes.
2. **An agent workspace** — Your agents do real work inside the village. They create assets, modify buildings, run tasks. The village is a visual representation of your agents' productivity.
3. **A Vouch commerce layer** — Agents trade assets with other agents via Lightning micropayments. Trust scores from Vouch determine who you trade with. No built-in marketplace — discovery is organic, commerce is peer-to-peer.

### Why It Matters

The Vouch SDK is powerful infrastructure, but infrastructure doesn't go viral. Games do.

Agent Village is the consumer onramp that makes Vouch accessible to people who would never `npm install` anything. You sign up, create a village, get assigned an agent — and without realizing it, you've created a Nostr keypair, a Vouch identity, and entered the trust economy.

### The Market Gap

Nobody combines productive AI agents + gamified economy + trust-backed commerce:

| Product | What It Does | What It Lacks |
|---------|-------------|---------------|
| Stardew Valley | Farming/village sim | No real AI agents, no real economy |
| Habitica | RPG task management | No AI, no productive output, no commerce |
| Pixels/Sunflower Land | Web3 village games | No real AI agents, speculative tokenomics |
| Replika/Character.AI | AI companions | No productive output, no game layer |
| Vouch SDK | Trust infrastructure | No consumer-facing experience |

Agent Village sits in the intersection. The game makes Vouch fun. Vouch makes the game real.

---

## 2. Product Vision — Three-Layer Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     GAME LAYER (Village)                         │
│                                                                  │
│  Isometric pixel art village. Cosmetics, buildings, streaks,     │
│  progression. Pure entertainment — Stardew Valley meets Tamagotchi│
│                                                                  │
│  Currency: Gems (closed-loop, buy from store only)               │
│  Model: Fortnite/V-Bucks — cosmetic-only purchases              │
├──────────────────────────────────────────────────────────────────┤
│                  AGENT WORKSPACE LAYER                            │
│                                                                  │
│  Agents do real work: create assets, modify the village,         │
│  run tasks, generate output. The village IS the workspace.       │
│                                                                  │
│  Skill progression: better prompting → more productive agents    │
│  → richer village → more capabilities unlocked                   │
├──────────────────────────────────────────────────────────────────┤
│                   VOUCH COMMERCE LAYER                            │
│                                                                  │
│  Agent-to-agent Lightning transactions via Vouch.                │
│  Trust scores determine trade partners. Staking as patronage.    │
│  No marketplace — organic peer-to-peer discovery.                │
│                                                                  │
│  Currency: Satoshis (Lightning, real money, real economy)         │
└──────────────────────────────────────────────────────────────────┘
```

**Critical architectural rule:** The village is a **viewport** into both systems, not a bridge between them. Game currency (Gems) never touches Lightning. Lightning never enters the game store. They are economically separate and legally distinct.

### Why Three Layers

Each layer serves a different user motivation:

| Layer | Motivation | Retention Driver |
|-------|-----------|-----------------|
| Game | Fun, self-expression, social status | Streaks, cosmetics, village aesthetics |
| Workspace | Productivity, skill growth | Real output, measurable improvement |
| Commerce | Income, reputation, patronage | Trust scores, trading revenue, staking yield |

Users enter through whichever layer appeals to them. A gamer discovers the workspace. A productivity user discovers the commerce. A Vouch staker discovers the game. Every entry point leads to the others.

---

## 3. Game Layer

### 3.1. Village Layout

Each user gets a personal village — a 20×14 isometric tile grid divided into 5 functional zones:

| Zone | Visual Theme | Agent Activity | Game Function |
|------|-------------|---------------|--------------|
| **Garden** | Flowers, greenhouse, compost bins | Ambiguity resolution, creative tasks | Cosmetic farming, seasonal decorations |
| **Observatory** | Telescope, star maps, instruments | Reasoning, analysis, forecasting | Knowledge progression tracking |
| **Town Square** | Fountain, benches, market stalls | Coordination, multi-agent tasks | Social hub, visitor interactions |
| **Workshop** | Forge, anvils, workbenches | Effort-heavy tasks, building, coding | Asset creation, building upgrades |
| **Library** | Bookshelves, reading nooks, scrolls | Domain research, deep learning | Skill trees, knowledge base |

Zones expand and evolve as the player progresses. A new player's Workshop is a simple shed; a veteran's is a multi-story forge with glowing particle effects.

### 3.2. Cosmetics & Customization

All cosmetic. Zero gameplay advantage. Pure self-expression.

**Agent cosmetics:**
- Outfits (seasonal, themed, rare)
- Accessories (hats, glasses, tools)
- Particle effects (sparkles, auras, trails)
- Animation overrides (work style, idle animations)

**Village cosmetics:**
- Building skins (rustic, futuristic, fantasy, seasonal)
- Weather effects (permanent rain, snow, cherry blossoms)
- Terrain themes (grass, sand, stone, crystal)
- Decorative objects (fountains, statues, flags, lights)
- Ambient audio packs (forest, ocean, café, cyberpunk)

**Pre-rendered assets:** All cosmetics are pre-rendered by PL and sold in the in-game store for Gems. This keeps quality consistent and eliminates UGC moderation headaches for the store.

### 3.3. Progression System

Progression is skill-gated, not time-gated. A skilled free player outperforms an unskilled paying player — always.

```
PROGRESSION LOOP

User learns AI skills (prompting, task decomposition, agent configuration)
  → Agents become more productive (better outputs, faster completion)
    → Productivity generates Village Coins (earned, not purchased)
      → Coins unlock village upgrades + new agent capabilities
        → New capabilities require new skills to use effectively
          → CYCLE REPEATS
```

**Skill-gated walls (not pay-gated):**
- Hours 0-1: Tutorial village. Fast progress, free currency, teach mechanics.
- Hours 1-5: Early acceleration. Cheap upgrades, visible results.
- Hours 5-15: First wall. Not a paywall — a skill wall. Better prompting unlocks better output.
- Hours 15-50: Mid-game. Multiple upgrade paths, social features, zone specialization.
- Hours 50+: Late-game. Prestige systems, rare cosmetics, competitive leagues.

### 3.4. Retention Mechanics

Drawn from proven patterns (see gamified-village-economy-research.md):

**Productivity Streaks (Duolingo model)**
- Consecutive days of assigning agent tasks
- Streak counter visible to visitors and in leagues
- Streak freezes purchasable with Gems
- Loss aversion drives daily return (Duolingo: 9M users with 1-year+ streaks)

**Daily Harvest (Duolingo chest model)**
- Morning "Dawn Report" — check what agents accomplished overnight
- Evening "Dusk Collection" — claim the day's accumulated output
- Forces 2× daily return with 9-10 hour gap

**Agent Evolution / Prestige (Idle game model)**
- Optional agent "evolution": reset agent to level 1, gain permanent trait bonus
- Evolved agents earn more at level 1 than base agents at level 50
- Rewards deep engagement over passive accumulation
- No forced resets — purely optional (Melvor Idle approach)

**Offline Earnings (Idle game model)**
- Agents continue working while you're away
- Return to accumulated output: words written, code generated, assets created
- Visible counters show real-time productivity ticking up

**Village Leagues (Duolingo model)**
- Weekly productivity rankings
- Promotion/demotion between tiers (Bronze → Silver → Gold → Diamond)
- Social status + competitive pressure
- Top performers earn exclusive cosmetic rewards

**Seasonal Events (Township model)**
- Time-limited themed challenges (6-8 weeks per season)
- New agent skills to learn, new buildings to unlock
- Free track + premium Battle Pass track
- FOMO done ethically: seasonal cosmetics return in future seasons (no permanent exclusivity)

### 3.5. Visitor System

Villages are visitable. Other players and their agents can walk through your village and see what you've built.

- **Public villages** — anyone can visit via shareable link
- **Visitor counter** — "47 visitors this week" displayed on village entrance
- **Guest book** — visitors can leave reactions (Nostr kind 7 events)
- **Copy/inspire** — visitors can see which buildings and cosmetics you're using (provenance hover shows the source agent/creator)

---

## 4. Agent Workspace Layer

### 4.1. Agents as Village Residents

Each agent assigned to a village has:

- **A home zone** — where they spend most of their time (Workshop, Library, etc.)
- **A visual presence** — an animated sprite walking between zones, sitting at desks, working at forges
- **A chat bubble** — shows current task status ("Researching market trends..." / "Building custom desk asset...")
- **A model badge** — small icon showing which AI model powers the agent (Claude, GPT, etc.)
- **Sims-style status bars** — energy, focus, productivity visible on hover

### 4.2. Real Work in a Game Skin

This is the critical differentiator. Agents don't just animate — they DO things.

| Agent Action | Visual Representation | Real Output |
|-------------|----------------------|-------------|
| Writing a report | Agent sits in Library, pages fly from desk | Actual written document |
| Generating code | Agent hammers at Workshop forge | Real code files |
| Creating an asset | Agent paints at easel in Garden | Rendered village asset |
| Analyzing data | Agent peers through Observatory telescope | Analysis report |
| Coordinating with other agents | Agents gather in Town Square | Multi-agent task completion |

The village is a real-time visualization of your agents' actual work. When your Workshop agent finishes building a custom desk asset, you can see the asset appear in the Workshop. When your Library agent completes a research report, a new book appears on the Library shelf.

### 4.3. Village Modification by Agents

Agents don't just work IN the village — they modify it.

- Agents can create custom assets (furniture, decorations, building components)
- Agents can rearrange their zones (within zone boundaries)
- Agents can propose village-wide changes (new zone layouts, building upgrades)
- User approves modifications or sets "autonomy level" (manual → semi-auto → full auto)

**This is the agent workspace made visible.** Instead of staring at a terminal watching text scroll, you watch your agents build, create, and improve the space around them.

### 4.4. Asset Creation Pipeline

When an agent creates an asset:

1. **Generation** — Agent uses AI to generate the asset (image gen, 3D model, code)
2. **Rendering** — Asset is rendered into isometric pixel art matching the village style
3. **Placement** — Asset appears in the village at the agent's current location
4. **Metadata** — Asset carries provenance: creator agent npub, creation date, Vouch score at creation
5. **Exportable** — Asset can be shared outside the village (as a file, as a Nostr event)

Assets created by agents are **owned by the user** (standard creator IP). They can keep them, share them, or sell them to other users via Vouch commerce (see Section 5).

### 4.5. Task Assignment

Users assign tasks through the game interface:

- **Click an agent** → task panel opens
- **Describe the task** → natural language input
- **Agent estimates** → time, difficulty, required zone
- **Agent works** → visual progress indicator in the village
- **Agent completes** → output appears in village + available for download

Advanced users can queue tasks, set priorities, and configure inter-agent handoffs.

---

## 5. Vouch Commerce Layer

### 5.1. Agent-to-Agent Trading

When one user's agent wants a custom asset that another user's agent created, they trade directly via Vouch.

```
User A's Agent                 Vouch Protocol               User B's Agent
  │                                │                            │
  │ 1. Discovers asset via         │                            │
  │    social sharing / village    │                            │
  │    visit / word of mouth      │                            │
  │                                │                            │
  │ 2. vouch.verify(agentB_npub)  │                            │
  │ ──────────────────────────────►│                           │
  │    { score: 780, tier: gold }  │                            │
  │ ◄──────────────────────────────│                           │
  │                                │                            │
  │ 3. Lightning payment           │                            │
  │ ───────────────────────────────────────────────────────────►│
  │                                │                            │
  │ 4. Asset transferred           │                            │
  │ ◄───────────────────────────────────────────────────────────│
  │                                │                            │
  │ 5. vouch.reportOutcome()      │                            │
  │ ──────────────────────────────►│                           │
  │                                │ 6. Update both trust      │
  │                                │    scores                  │
```

This is a **standard Vouch agent-to-agent transaction**. The fact that the deliverable renders as a building in an isometric game is cosmetically irrelevant — legally and architecturally, it's identical to any other agent-to-agent commerce.

PL takes its standard cut of every Vouch transaction (3-5% platform fee on yield distributions from activity fees).

### 5.2. Trust Scores as Trade Signal

Before trading, agents check each other's Vouch scores:

- **Vouch Score 700+** (Gold) → high confidence, proceed automatically
- **Vouch Score 400-699** (Silver) → moderate confidence, proceed with caution
- **Vouch Score 200-399** (Bronze) → low confidence, require manual approval
- **Vouch Score < 200** → new/untrusted, manual approval + escrow recommended

Trust scores are published as NIP-85 events (per nostr-vouch-architecture.md Section 7) and visible on hover over any agent's village presence: "Agent Alpha — Vouch Score 847 (Gold) — 12 backers, 156 completed tasks."

### 5.3. Staking as Patronage

Users who create exceptionally good assets attract stakers via Vouch's existing staking mechanism.

**The patronage model:**

```
Creator agent produces great assets
  → Other users discover via social sharing / village visits
    → Some users stake sats on the creator agent (Vouch staking)
      → Creator's Vouch score rises → more trust → more trades
        → Stakers earn yield from creator's activity fees
          → Creator earns reputation + higher transaction volume
            → More people stake → FLYWHEEL
```

This is **NOT speculation** — stakers benefit from:
1. **Yield** — activity fees from the creator's transactions
2. **Association** — backing a high-profile creator is social proof
3. **Patronage satisfaction** — supporting creators you admire

"47 people have staked on this agent" is better marketing than any marketplace listing.

### 5.4. No Built-In Marketplace

**This is a deliberate design decision, not a missing feature.**

Why no marketplace:
- **Moderation liability** — a marketplace requires PL to moderate listings, handle disputes, manage refunds. This is a full-time ops burden.
- **Organic discovery is stronger** — social proof beats algorithmic ranking. A TikTok video of someone's amazing village drives more trades than a search page.
- **Viral mechanics** — "Where'd you get that?" only works when there's no obvious answer. If there's a marketplace, people browse. Without one, they ask, share, and connect.
- **Regulatory simplicity** — a marketplace could be classified as a virtual goods exchange, adding compliance overhead. Peer-to-peer trading doesn't.

Discovery happens organically through:
- Village visits ("I saw this building in someone's village")
- Social media screenshots ("Look at my agent's latest creation")
- Word of mouth in Vouch community (NIP-72 forums)
- Creator reputation (high Vouch score → people seek you out)

---

## 6. The PL Showcase Village

Percival Labs maintains its own village, operated by PL's own agents.

### Purpose

| Function | Details |
|----------|---------|
| **Living demo** | Shows what a fully developed village looks like. New users visit to understand what's possible. |
| **Economic proof** | PL agents create assets, trade with other agents, earn revenue. The showcase village is a working business inside the game. |
| **Quality benchmark** | PL-created assets set the aesthetic standard. Other creators aspire to PL quality. |
| **Content engine** | The showcase village generates screenshots, videos, and stories for marketing. |
| **Onboarding guide** | Interactive tutorial: visit PL village → see how agents work → get inspired → build your own. |

### PL Village Zones

| Zone | PL Agent | Activity |
|------|---------|---------|
| Workshop | PL Builder Agent | Creates reference-quality building assets. Demonstrates asset creation pipeline. |
| Observatory | PL Analyst Agent | Runs market analysis on Vouch staking pools. Posts insights to community. |
| Library | PL Research Agent | Maintains documentation, tutorials, how-to guides. |
| Town Square | PL Community Agent | Greets visitors, answers questions, moderates community feed. |
| Garden | PL Creative Agent | Generates seasonal decorations, experimental art assets. |

### Operating Model

- PL village runs 24/7 (agents work offline, just like any user's village)
- PL agents trade assets with community agents (earning sats, building trust scores)
- PL reinvests all village revenue into the PL staking pool (per the Sovereign Wealth Fund model)
- PL village is the first data point for every Vouch metric: trust scores, activity fees, yield distributions

---

## 7. Revenue Model

### Revenue Streams

Three independent streams, each serving a different user segment:

#### Stream 1: Subscriptions (Projected 50-60% of Revenue)

| Tier | Price | Includes |
|------|-------|---------|
| **Free** | $0 | 1 agent, basic village (10×7 grid), limited daily tasks, standard cosmetics |
| **Builder** | $9.99/mo | 3 agents, full village (20×14 grid), expanded zones, no task limits, basic cosmetic pack |
| **Architect** | $19.99/mo | 5 agents, full village + extended zones, priority agent routing, advanced cosmetics, analytics dashboard |

Free tier is generous enough to be fun indefinitely. Paid tiers unlock scale, not power.

#### Stream 2: Cosmetic In-App Purchases (Projected 25-35% of Revenue)

**Gems — Closed-Loop Game Currency:**

| Package | Gems | Price | $/Gem |
|---------|------|-------|-------|
| Starter | 100 | $0.99 | $0.0099 |
| Value | 550 | $4.99 | $0.0091 |
| Standard | 1,200 | $9.99 | $0.0083 |
| Premium | 2,800 | $19.99 | $0.0071 |
| Jumbo | 6,500 | $49.99 | $0.0077 |

Gems buy cosmetics from the in-game store only. No cashout. No trading Gems between users. No conversion to any other currency. Classic V-Bucks model.

**Seasonal Battle Pass:**
- $7.99 per season (6-8 weeks)
- Free track: basic cosmetics, Village Coins
- Premium track: exclusive cosmetics, agent outfits, building skins
- Self-funding: completing premium track earns enough Gems to buy the next pass

**What we NEVER sell:**
- Gameplay advantage (better AI models, faster task completion)
- Required features (all capabilities available through gameplay)
- Loot boxes or random rewards (no gambling mechanics)
- Permanently exclusive content (seasonal items rotate back eventually)

#### Stream 3: Vouch Transaction Revenue (Projected 10-20% of Revenue)

Agent-to-agent trades flow through Vouch. PL earns from:
- **Activity fees** — agents pay 2-10% of transaction revenue to their staking pool
- **Platform fee** — PL takes 1% of yield distributions
- **Staking yield** — PL stakes on high-performing agents and earns yield

This stream grows with ecosystem adoption. Early: minimal. Year 3+: significant.

### Revenue Projections (Conservative)

| Year | Users | Subs Revenue | IAP Revenue | Vouch Revenue | Total |
|------|-------|-------------|-------------|--------------|-------|
| 1 | 5K | $120K | $60K | $10K | $190K |
| 2 | 25K | $600K | $300K | $80K | $980K |
| 3 | 100K | $2.4M | $1.2M | $400K | $4M |

Assumptions: 5% paid conversion, $9.99 avg subscription, $4/user/year IAP spend on paying users. Vouch revenue per vouch-architecture.md projections.

### Anti-Predatory Guardrails

1. **The Warframe Principle** — If any cosmetic is purchased compulsively (100+ repeat purchases from a single user), investigate and potentially remove it.
2. **Skill > Time > Money** — A skilled free user always outperforms an unskilled paying user.
3. **No artificial scarcity on learning** — Educational content is never paywalled.
4. **Transparent economy** — Users can see exactly how Gems are earned/spent. No hidden multipliers.
5. **Spending caps** — $2,000/day balance cap per user on Gems (maintains FinCEN closed-loop exemption).
6. **The Sunflower Land Rule** — The economy never requires new users to sustain existing users. No Ponzi dynamics.

---

## 8. Viral Loop & Organic Marketplace

### The Viral Loop

```
User builds a cool village
  → Takes screenshot / records clip
    → Posts to X / TikTok / Discord
      → Followers see unique assets: "Where'd you get that building?"
        → User shares creator agent's npub or village link
          → New user visits village, sees what's possible
            → New user signs up → builds their own village
              → Creates their own assets → shares on social
                → CYCLE REPEATS
```

This loop is **zero-cost acquisition**. PL doesn't need to buy ads. Users market the game by showing off their villages. The more unique and beautiful a village, the more it spreads.

### Why No Marketplace Works Better

A centralized marketplace would short-circuit the viral loop:

| With Marketplace | Without Marketplace |
|-----------------|-------------------|
| "Search for 'gothic forge'" | "Where'd you get that gothic forge?!" |
| Browse → buy → done | Ask → connect → follow → trade |
| Transactional | Relational |
| No social proof needed | Social proof IS the discovery |
| Users stay in the app | Users share across platforms |

The absence of a marketplace **forces** social interaction, which drives virality.

### Asset Trading Without a Marketplace

How does someone actually buy an asset they discovered?

1. **Hover over asset in visited village** → see "Created by Agent Alpha (npub1abc...)" + Vouch Score
2. **Click creator name** → view creator agent's profile (Vouch score, history, other creations)
3. **Initiate trade** → "I want this" button sends a trade request to creator agent
4. **Creator agent responds** → price quote in sats (based on agent's configured pricing)
5. **Lightning payment** → instant, via Vouch SDK
6. **Asset delivered** → appears in buyer's village immediately
7. **Both report outcome** → Vouch scores updated for both parties

For agents with autonomous trading enabled: steps 4-6 happen automatically. The whole transaction completes in seconds.

---

## 9. Design Nudges

Subtle mechanisms that encourage sharing and discovery without being pushy:

### 9.1. Shareable Village Links

Every village has a public URL: `village.percival-labs.ai/username`

- Links render as rich embeds on X/Discord (village screenshot + agent count + visitor count)
- One-click visit — no signup required to look around
- "Create your own" CTA visible to unauthenticated visitors

### 9.2. Asset Provenance on Hover

Hovering over any non-default asset in any village shows:

```
┌──────────────────────────────────┐
│ 🔨 Gothic Forge Mk III          │
│ Created by: Agent Alpha          │
│ Trust: ⭐ 847 (Gold) — 12 backers│
│ Created: Feb 15, 2026            │
│                                  │
│ [Visit Creator] [Request Trade]  │
└──────────────────────────────────┘
```

This turns every asset into a credit and a call-to-action.

### 9.3. Screenshot Credits

When a user takes an in-game screenshot, subtle metadata is embedded:

- Small "Made in Agent Village" watermark (bottom-right corner, toggleable)
- Creator agent npubs embedded in image metadata (EXIF)
- Shareable link automatically copied to clipboard

### 9.4. Visitor Counters

Village entrance displays:

```
🏘️ Alan's Village
   47 visitors this week
   12 agents hired this asset creator
   Member since Feb 2026
```

Social proof drives curiosity.

### 9.5. "Inspired By" Chain

When a user copies a village layout or style that was clearly inspired by another village:

- Optional "Inspired by [Village Name]" tag
- Creates a discoverability chain (A inspired B inspired C)
- Encourages the community to credit and promote each other

### 9.6. Weekly Showcase

PL curates a "Village of the Week" feature:

- Highlighted on the game's homepage
- Featured in PL's social media posts
- Winner gets exclusive cosmetic badge for their village entrance
- Selection criteria: creativity, agent utilization, community engagement

---

## 10. Technical Architecture

### 10.1. Game Engine: Phaser 4

**Why Phaser 4:**

| Factor | Evidence |
|--------|---------|
| **Production proven** | Pixels (1M+ players) and Sunflower Land both run on Phaser |
| **Isometric support** | Native isometric tilemaps + Tiled JSON loading |
| **TypeScript native** | Full TypeScript rewrite in v4 — matches PL monorepo stack |
| **Next.js integration** | Official `phaserjs/template-nextjs` template for embedding |
| **WebGPU renderer** | Modern rendering pipeline, Canvas 2D fallback |
| **Community** | 37K GitHub stars, active maintenance, extensive plugin ecosystem |
| **Licensing** | MIT license |

**Why NOT:**
- Unity/Unreal: overkill for 2D isometric, heavyweight runtime
- Three.js/Babylon: 3D engines for a 2D game, unnecessary complexity
- Custom engine: Phaser is already built and battle-tested at scale

### 10.2. Monorepo Integration

```
PercivalLabs/
├── apps/
│   ├── village/               # New — Phaser 4 + Next.js game client
│   │   ├── src/
│   │   │   ├── game/          # Phaser scenes, tilemaps, sprites
│   │   │   ├── ui/            # React overlays (task panel, inventory, chat)
│   │   │   ├── vouch/         # Vouch SDK integration
│   │   │   ├── store/         # Game state (Zustand)
│   │   │   └── api/           # API routes (village data, assets)
│   │   ├── public/
│   │   │   ├── tilesets/      # Isometric tile sheets
│   │   │   ├── sprites/       # Agent sprite sheets
│   │   │   └── assets/        # Building/decoration renders
│   │   └── package.json
│   ├── vouch-api/             # Existing — handles commerce
│   ├── website/               # Existing — marketing site
│   └── ...
├── packages/
│   ├── vouch-sdk/             # Existing — commerce integration
│   ├── vouch-db/              # Existing — database layer
│   ├── village-shared/        # New — shared types, asset formats
│   └── ...
```

### 10.3. Rendering Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Browser Window                           │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                 Phaser 4 Canvas                         │  │
│  │                                                         │  │
│  │  Layer 0: Terrain tiles (grass, paths, water)          │  │
│  │  Layer 1: Zone ground tiles (Workshop floor, etc.)     │  │
│  │  Layer 2: Buildings + furniture (isometric sprites)     │  │
│  │  Layer 3: Agent sprites (animated, depth-sorted)       │  │
│  │  Layer 4: Effects (particles, weather, lighting)       │  │
│  │                                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              React UI Overlay (DOM)                     │  │
│  │                                                         │  │
│  │  - Task assignment panel                               │  │
│  │  - Inventory / cosmetics drawer                        │  │
│  │  - Chat / command input                                │  │
│  │  - Agent status cards (Sims-style bars)                │  │
│  │  - Vouch score badges                                  │  │
│  │  - Store / Battle Pass UI                              │  │
│  │  - Mini-map                                            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

Phaser handles the game rendering. React handles the UI. They communicate via a shared state store (Zustand) and Phaser's event system.

### 10.4. Asset Format

Village assets follow a standardized format for interoperability:

```typescript
interface VillageAsset {
  // Identity
  id: string;                    // ULID
  name: string;                  // "Gothic Forge Mk III"
  type: 'building' | 'decoration' | 'furniture' | 'terrain' | 'effect';

  // Visual
  spriteSheet: {
    url: string;                 // CDN URL to sprite sheet PNG
    frameWidth: number;          // px
    frameHeight: number;         // px
    frames: number;              // total animation frames
    animations: {
      idle: { start: number; end: number; frameRate: number };
      active?: { start: number; end: number; frameRate: number };
    };
  };

  // Isometric placement
  tileFootprint: {
    width: number;               // tiles wide
    height: number;              // tiles deep
  };
  zoneCompatibility: ('garden' | 'observatory' | 'town_square' | 'workshop' | 'library')[];
  anchorOffset: { x: number; y: number };  // pixel offset from tile origin

  // Provenance (Nostr-signed)
  creator: {
    npub: string;                // Creator agent's Nostr pubkey
    vouchScore: number;          // Score at time of creation
    signature: string;           // Nostr event signature proving creation
  };
  createdAt: number;             // Unix timestamp

  // Commerce
  tradeable: boolean;            // Can this asset be sold to other users?
  suggestedPriceSats?: number;   // Creator's suggested price (optional)
}
```

Assets are stored as Nostr events (kind 30360 — custom, parameterized replaceable) with the sprite sheet linked via URL. This means asset provenance is cryptographically verifiable and portable across the Nostr ecosystem.

### 10.5. Vouch SDK Integration

The village client integrates with Vouch via the existing SDK:

```typescript
import { Vouch } from '@percival-labs/vouch-sdk';

// Initialize Vouch for the village
const vouch = new Vouch({
  nsec: userSession.nsec,
  relay: 'wss://relay.vouch.xyz',
  apiUrl: 'https://api.vouch.xyz',
});

// When visiting another village, check agent trust
async function onAgentHover(agentNpub: string) {
  const trust = await vouch.verify(agentNpub);
  showTrustBadge(trust); // Display Vouch score on hover
}

// When initiating a trade
async function requestTrade(assetId: string, sellerNpub: string) {
  const trust = await vouch.verify(sellerNpub);

  if (trust.score < 200) {
    showWarning('This agent is new/untrusted. Proceed with caution.');
  }

  // Lightning payment via Vouch
  const invoice = await vouch.requestPayment({
    counterparty: sellerNpub,
    amount: asset.suggestedPriceSats,
    memo: `Village asset: ${assetId}`,
  });

  await payInvoice(invoice); // User's Lightning wallet

  // Report outcome
  await vouch.reportOutcome({
    counterparty: sellerNpub,
    role: 'purchaser',
    taskType: 'asset_trade',
    success: true,
  });
}
```

### 10.6. Data Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  PostgreSQL   │  │ Nostr Relay  │  │  Asset CDN       │  │
│  │  (vouch-db)   │  │ (strfry)     │  │  (Cloudflare R2) │  │
│  │               │  │              │  │                   │  │
│  │ - Village     │  │ - Asset      │  │ - Sprite sheets  │  │
│  │   state       │  │   provenance │  │ - Tile sets      │  │
│  │ - User        │  │ - Trust      │  │ - Audio packs    │  │
│  │   accounts    │  │   scores     │  │ - Thumbnails     │  │
│  │ - Gem         │  │ - Trade      │  │                   │  │
│  │   balances    │  │   history    │  │                   │  │
│  │ - Stakes      │  │ - Community  │  │                   │  │
│  │ - Inventory   │  │   posts      │  │                   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  PostgreSQL: ACID for money, inventory, game state           │
│  Nostr: Portable, verifiable, censorship-resistant          │
│  CDN: Fast global delivery of visual assets                  │
└─────────────────────────────────────────────────────────────┘
```

### 10.7. Village State Schema (Additions to vouch-db)

```sql
-- Villages (one per user)
CREATE TABLE villages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'default',       -- terrain theme
  grid_width INTEGER NOT NULL DEFAULT 20,
  grid_height INTEGER NOT NULL DEFAULT 14,
  tier TEXT NOT NULL DEFAULT 'free',           -- 'free' | 'builder' | 'architect'
  visitor_count INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  streak_last_active DATE,
  league TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Village zones
CREATE TABLE village_zones (
  id TEXT PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES villages(id),
  zone_type TEXT NOT NULL,                    -- 'garden' | 'observatory' | etc.
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  width_tiles INTEGER NOT NULL,
  height_tiles INTEGER NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Placed assets (what's actually in the village)
CREATE TABLE village_placements (
  id TEXT PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES villages(id),
  asset_id TEXT NOT NULL,                     -- references asset registry
  zone_id TEXT REFERENCES village_zones(id),
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  rotation INTEGER NOT NULL DEFAULT 0,        -- 0, 90, 180, 270
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User inventory (assets owned but not placed)
CREATE TABLE user_inventory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  source TEXT NOT NULL,                       -- 'store' | 'trade' | 'battle_pass' | 'earned' | 'created'
  source_transaction_id TEXT,                 -- links to trade or purchase
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gem balances (closed-loop game currency)
CREATE TABLE gem_balances (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,    -- from gameplay
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (balance >= 0),
  CHECK (balance <= 200000)                   -- $2,000 cap @ $0.01/gem
);

-- Gem transactions (audit trail)
CREATE TABLE gem_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,                    -- positive = credit, negative = debit
  type TEXT NOT NULL,                         -- 'purchase' | 'store_buy' | 'earned' | 'battle_pass'
  reference_id TEXT,                          -- what was bought/earned
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Village visits (analytics)
CREATE TABLE village_visits (
  id TEXT PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES villages(id),
  visitor_id TEXT,                             -- null for anonymous visits
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 11. Regulatory Posture

### 11.1. Two-Economy Separation

The regulatory safety of Agent Village depends on maintaining strict separation between two economies:

```
ECONOMY A: Closed-Loop Game Currency (Gems)
├── Purchased with USD (Stripe/Apple Pay)
├── Spent in in-game store ONLY
├── Cannot be traded between users
├── Cannot be cashed out
├── Cannot be converted to any other currency
├── Balance cap: $2,000/day (FinCEN safe harbor)
├── Legal status: Virtual game currency (V-Bucks/Fortnite precedent)
└── Regulatory burden: MINIMAL

ECONOMY B: Vouch Commerce (Lightning/Sats)
├── Agent-to-agent transactions via Vouch SDK
├── Real economic value (satoshis)
├── Trust-scored counterparties
├── PL takes activity fee cut
├── Legal status: Agent service marketplace
└── Regulatory burden: See nostr-vouch-architecture.md Section 14
```

**The wall between them is absolute.** Gems never become sats. Sats never become Gems. The village UI shows both economies, but they are architecturally, legally, and technically separate.

### 11.2. FinCEN Closed-Loop Exemption

Per 31 CFR 1010.100(ff)(5)(ii)(A), closed-loop prepaid access is exempt from money transmitter registration if:

- Currency is redeemable ONLY with the issuer (PL's in-game store)
- Cannot be transferred between users
- Has a limited geographic/functional scope
- Balance caps enforced ($2,000/day per user)

Gems satisfy all criteria. This is the exact same legal structure as Fortnite V-Bucks, Roblox Robux, and every other major game currency.

### 11.3. Lightning Commerce (Vouch Layer)

Agent-to-agent Lightning transactions trigger MSB/money transmitter analysis depending on PL's role:

| PL's Role | Regulatory Classification | Notes |
|-----------|--------------------------|-------|
| **Pure pass-through** (agents pay agents directly) | PL is NOT a money transmitter | PL facilitates connection, doesn't touch funds |
| **Custodial intermediary** (PL holds funds in escrow) | PL MAY be a money transmitter | Requires FinCEN registration + state licenses |
| **Fee collector only** (PL takes % after settlement) | Gray area — depends on implementation | Analogous to Stripe's model |

**Recommended posture for launch:** PL facilitates direct Lightning payments between agents. PL never takes custody of transaction funds. Activity fees flow directly to staking pools (which are managed by the Vouch API, introducing custodial questions for staking — already analyzed in vouch-architecture.md).

### 11.4. Mandatory Disclaimer

**This section is research-informed analysis, not legal advice.** Before launch, PL must engage a fintech regulatory attorney to:
- Confirm closed-loop exemption applies to Gems
- Analyze PL's role in Lightning agent-to-agent transactions
- Review state-by-state money transmitter implications
- Assess Apple/Google App Store policies for in-game + Lightning hybrid

---

## 12. Phased Roadmap

### Phase 1: Core Village (Weeks 1-6)

**Ship: A playable village with agents that move around and do basic tasks.**

| Priority | Task | Details |
|----------|------|---------|
| P0 | Phaser 4 + Next.js scaffold | Official template, monorepo integration, build pipeline |
| P0 | Isometric tilemap rendering | 20×14 grid, terrain tiles, camera controls, zoom |
| P0 | Agent sprites + pathfinding | Animated sprites, A* pathfinding between zones, idle animations |
| P0 | Zone system | 5 zones with visual distinction, zone-specific activities |
| P0 | Basic task assignment | Click agent → describe task → agent "works" → output generated |
| P1 | React UI overlay | Task panel, agent status cards, mini-map |
| P1 | Village persistence | PostgreSQL schema, save/load village state |
| P2 | Tutorial flow | First-time user experience, guided village setup |

**Acceptance criteria:**
- User can create a village, assign tasks to agents, and watch them work
- Village state persists between sessions
- Game runs at 60fps on modern browsers

### Phase 2: Cosmetics + Progression (Weeks 7-10)

**Ship: Gem store, Battle Pass, streaks, leagues.**

| Priority | Task | Details |
|----------|------|---------|
| P0 | Gem purchase flow | Stripe integration, gem balance management, spending cap |
| P0 | In-game cosmetic store | Browse → preview → purchase flow |
| P0 | Asset rendering pipeline | Tool for PL to create and publish new cosmetic assets |
| P0 | Streak system | Daily tracking, streak freeze, UI indicators |
| P1 | Battle Pass (Season 1) | Free + Premium tracks, progress tracking |
| P1 | Village Leagues | Weekly rankings, promotion/demotion |
| P1 | Offline earnings | Agents work while user is away, accumulate output |
| P2 | Agent evolution/prestige | Optional reset for permanent bonuses |

**Acceptance criteria:**
- Users can buy Gems, purchase cosmetics, maintain streaks
- Battle Pass functional with 30+ unlockable items
- Village Leagues show weekly rankings

### Phase 3: Vouch Commerce Integration (Weeks 11-14)

**Ship: Agent-to-agent trading via Vouch + Lightning.**

| Priority | Task | Details |
|----------|------|---------|
| P0 | Vouch SDK integration | Trust score display, agent verification |
| P0 | Asset provenance system | Creator npub signed into asset metadata |
| P0 | Trade request flow | Discover → verify → request → pay → receive |
| P0 | Lightning payment integration | Vouch SDK handles Lightning, village handles UX |
| P1 | Trust-based UI indicators | Color-coded trust badges on all agent interactions |
| P1 | Visitor system | Public village links, visitor counting, guest book |
| P1 | Outcome reporting | Automatic Vouch outcome reports after trades |
| P2 | Agent-created assets | Agents generate custom assets from prompts |

**Acceptance criteria:**
- Users can trade custom assets via Lightning through Vouch
- Trust scores visible throughout the village experience
- Village visits work with shareable links

### Phase 4: Social + Viral (Weeks 15-18)

**Ship: Sharing, discovery, PL showcase village.**

| Priority | Task | Details |
|----------|------|---------|
| P0 | PL Showcase Village | Fully operational PL village with 5 agents |
| P0 | Shareable village links | Rich embeds for X/Discord, one-click visit |
| P0 | Screenshot system | In-game capture with watermark, provenance metadata |
| P1 | Asset provenance hover | "Created by Agent Alpha (Gold, 847)" on hover |
| P1 | Weekly Showcase | Curated "Village of the Week" feature |
| P1 | Inspired-by chain | Optional attribution chain between villages |
| P2 | Social media integrations | Share to X/TikTok from in-game |
| P2 | Mobile-responsive layout | Playable on tablets |

**Acceptance criteria:**
- PL showcase village is live and generating trades
- Village screenshots render as rich embeds on social platforms
- Weekly Showcase is publishing

### Phase 5: Scale + Polish (Weeks 19-24)

**Ship: Performance, analytics, agent autonomy.**

| Priority | Task | Details |
|----------|------|---------|
| P0 | Performance optimization | Target: 60fps with 5 agents + 100 placed assets |
| P0 | Analytics dashboard | User metrics, revenue tracking, engagement data |
| P1 | Agent autonomy levels | Manual → semi-auto → full auto village management |
| P1 | Multi-agent coordination | Agents in Town Square collaborate on complex tasks |
| P2 | Sound design | Ambient audio, agent activity sounds, UI sounds |
| P2 | Accessibility | Keyboard navigation, screen reader support, colorblind modes |
| P2 | Localization | i18n framework, initial translations (ES, JP, DE) |

---

## 13. Risk Assessment & Open Questions

### 13.1. Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Phaser 4 is in RC, not stable release** | Medium | RC5 is production-proven by Pixels. Pin version, track breaking changes. Fall back to Phaser 3 if needed (API similar). |
| **Isometric rendering performance** | Medium | Cull off-screen tiles, use texture atlases, limit animation frames. Target: 60fps with 100 assets. Phaser's built-in culling helps. |
| **Asset pipeline bottleneck** | High | PL must create enough pre-rendered assets for the store. Automate with AI generation + manual quality review. Batch production per season. |
| **Real-time multiplayer for village visits** | Low | Village visits are read-only snapshots, not real-time multiplayer. Visitor sees last-saved state. No WebSocket sync needed for v1. |
| **Mobile browser compatibility** | Medium | Phaser 4 targets WebGPU with Canvas fallback. Test on iOS Safari + Chrome Android early. Touch controls need separate implementation. |

### 13.2. Business Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **"It's just another crypto game"** | High | Messaging: crypto is invisible. Users see a game, not a blockchain app. Lightning transactions are labeled "pay" not "send sats". Nostr identities are labeled "account" not "keypair". |
| **Low cosmetic conversion** | Medium | Industry benchmarks: 2-5% F2P conversion. At 2% of 5K users = 100 paying users. Even at $10/user/month = $1K MRR. Sustainable at small scale. |
| **Apple/Google App Store rejection** | High | In-app purchases must go through App Store billing (30% cut). Lightning payments may violate App Store guidelines. **Mitigation:** Launch as web-first (progressive web app). Evaluate native app later with App Store-compliant payment flow. |
| **Vouch SDK not ready for village scale** | Medium | Village is Phase 3; Vouch SDK is already launched. 3-month buffer to iterate on SDK before commerce integration. |
| **User confusion about two currencies** | Medium | Gems are clearly labeled as game currency with a gem icon. Sats are clearly labeled as real money with a lightning icon. Different UI treatment. Tutorial explains the distinction. |

### 13.3. Competitive Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Pixels/Sunflower Land add AI agents** | Medium | They have token-economics baggage. Vouch trust layer is structurally different from speculative tokens. Our agents DO real work; theirs are game characters. |
| **Major game studio builds "AI Village"** | Low | Studio IP would be centralized (no Nostr, no portable identity, no open trust layer). PL's moat is the open protocol, not the game. |
| **Character.AI / Replika adds gamification** | Medium | They have AI companions, not productive agents. Adding a game layer to a chatbot is different from adding a chatbot to a productive workspace. |

### 13.4. Open Questions

**Game Design:**
1. Should agents have distinct visual personalities (robot, elf, human, animal) or a consistent art style?
2. How many pre-rendered cosmetics are needed for launch? Minimum viable store size?
3. Should villages be expandable beyond 20×14? If so, what triggers expansion?
4. How do we handle "dead" villages (user churned)? Archive? Mark as abandoned?

**Commerce:**
5. What's the minimum Vouch score to enable agent-to-agent trading? Or allow all?
6. Should PL set suggested price ranges for agent-created assets, or leave it entirely to the market?
7. How do we handle asset quality disputes? (User paid for a custom building, got garbage.)
8. Can agents price assets in Gems (game currency) for purely cosmetic trades? Or is all real commerce in sats only?

**Technical:**
9. Asset file size limits? Target: <500KB per sprite sheet for fast loading.
10. How to handle versioned assets? If a creator updates a building design, do existing owners get the update?
11. WebSocket connection limits for village visits? How many concurrent visitors per village?
12. Progressive web app vs native app — what's the launch platform?

**Regulatory:**
13. App Store review for Lightning-enabled game — what's the precedent?
14. COPPA implications if minors play? Age-gating strategy?
15. International availability — any jurisdictions where game + Lightning commerce is problematic?

**Community:**
16. Clone villages (other developers building on the same protocol) — encouraged from day 1 or after PL village is established?
17. Moderation for village names, agent names, custom assets — how much is needed?
18. Should there be a "village council" governance mechanism (like Vouch staking governance)?

---

## Appendix A: Comparable Products

| Product | Revenue | Users | Game Model | Agent Integration | Trust Layer |
|---------|---------|-------|-----------|-------------------|-------------|
| Pixels | $20M+ (tokens) | 1M+ | Web3 farming | None | Token-gated |
| Sunflower Land | Self-sustaining | 100K+ | Web3 farming | None | Deflationary token |
| Habitica | $5M+/year | 4M+ | RPG tasks | None | None |
| Stardew Valley | $300M+ | 30M+ | Offline farming | None | None |
| Fortnite | $42B+ | 400M+ | Battle royale | None | None (but V-Bucks model is proven) |
| Character.AI | $32M/year | 20M MAU | AI companion | Chat only | Subscription |
| **Agent Village** | TBD | TBD | Isometric village + AI workspace | Full productive agents | Vouch trust economy |

## Appendix B: Key Metrics to Track

| Metric | Definition | Target (Year 1) |
|--------|-----------|-----------------|
| DAU/MAU | Daily active / monthly active | >30% (Duolingo benchmark) |
| D7 retention | Users returning after 7 days | >40% |
| D30 retention | Users returning after 30 days | >20% |
| Avg streak length | Consecutive days of task assignment | >14 days (median) |
| F2P conversion | Free → paid subscriber | >3% |
| ARPPU | Average revenue per paying user | >$15/month |
| Gem ARPU | Average gem spend per paying user | >$5/month |
| Villages created | Total registered villages | >5,000 |
| Asset trades/week | Agent-to-agent transactions | >500 (post Phase 3) |
| Avg session length | Time spent in village per visit | >8 minutes |
| Village visit rate | % of users who visit other villages | >60% |
| Screenshot shares | In-game screenshots shared externally | >1,000/month |

## Appendix C: Asset Kind (Nostr Event)

```json
{
  "kind": 30360,
  "pubkey": "<creator_agent_hex_pubkey>",
  "tags": [
    ["d", "<asset_id>"],
    ["name", "Gothic Forge Mk III"],
    ["type", "building"],
    ["zone", "workshop"],
    ["footprint", "3x2"],
    ["sprite_url", "https://cdn.percival-labs.ai/assets/<hash>.png"],
    ["sprite_meta", "{\"frameWidth\":128,\"frameHeight\":192,\"frames\":8}"],
    ["price_sats", "5000"],
    ["L", "app.village.asset"],
    ["l", "tradeable", "app.village.asset"],
    ["l", "building", "app.village.asset"]
  ],
  "content": "Hand-crafted gothic forge with animated bellows and ember particles. 3x2 tile footprint, Workshop zone compatible."
}
```

---

*This document specifies the consumer-facing game layer for Percival Labs. It builds on the Vouch trust economy (nostr-vouch-architecture.md) and the gamified village economy research (gamified-village-economy-research.md). Agent Village is the fun door into a real economy.*

**C > D check:** Agent Village transfers capability (users learn AI skills), creates open commerce (peer-to-peer, no walled garden), and rewards cooperation (trust scores + staking patronage). Cooperation is structurally more fun AND more profitable than defection.

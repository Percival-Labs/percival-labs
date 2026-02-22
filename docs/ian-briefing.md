# Percival Labs + Engram — Technical Briefing for Ian

**From:** Alan Carroll
**Date:** February 21, 2026
**Purpose:** Architecture overview for potential collaboration. Two products, one thesis.

---

## The Shared Thesis

We both believe the same thing: normal people are getting left behind by technology that should be empowering them. You're building tools to democratize political information. I'm building tools to democratize AI itself.

Everything below serves one equation: **make cooperation structurally more rewarding than defection (C > D).** Not by preaching — by engineering the incentives so that openness, sharing, and helping others is more profitable than gatekeeping.

Two products. Same mission. Different layers.

---

## Product 1: Engram — Personal AI for Domain Translators

### What It Is

Engram is personal AI infrastructure for people who aren't developers. Think of it as the bridge between someone's existing expertise and AI capability.

The core insight: as AI gets cheaper, the ability to *write code* becomes commoditized. What stays scarce is **domain knowledge** — the nurse who knows which symptoms get misdiagnosed, the carpenter who knows which permits actually matter, the teacher who knows which concepts students fake-understand. These people (we call them Domain Translators) already have the hard part. Engram gives them the easy part: AI fluency.

### What It Does Today

- **Chat engine** — model-agnostic streaming chat. Works with Anthropic (Claude), OpenAI, or local models via Ollama. Pure fetch + readline, zero SDK dependencies in the chat path.
- **Setup wizard** — `engram setup` walks a non-technical user through identity, personality calibration, provider selection, API key validation, and model selection. First-run detection — if no config exists, the wizard launches automatically.
- **System prompt assembly** — reads `~/.engram/constitution.md`, `context.md`, and `memory/*.md` to build a personalized system prompt. This is what makes the AI *yours* — it knows your projects, your preferences, your communication style.
- **Bundle generator** — `engram bundle` creates a portable zip with everything needed to set up AI infrastructure on any platform (even ones we don't have native support for yet). Includes provider-specific instruction files.
- **MCP server** — `engram serve` exposes memory tools (read/write/search/list) for integration with Claude Desktop or other MCP clients.
- **Skill system** — markdown-based skill definitions with workflow routing. Skills are instruction bundles that teach the AI how to handle specific domains (research, content creation, etc.).
- **macOS desktop app** — .dmg installer (24MB, unsigned beta). Opens Terminal.app natively. Built with `bun build --compile`.

### Technical Architecture

```
engram (npm: engram-harness)
├── src/
│   ├── cli.ts              ← entry point (bun + node compatible)
│   ├── commands/
│   │   ├── chat.ts         ← streaming chat engine
│   │   ├── setup.ts        ← first-run wizard
│   │   ├── init.ts         ← scaffold ~/.claude/ infrastructure
│   │   ├── bundle.ts       ← portable AI setup generator
│   │   └── serve.ts        ← MCP server (memory tools)
│   └── lib/
│       ├── providers/
│       │   ├── anthropic.ts  ← SSE streaming
│       │   ├── openai.ts     ← SSE streaming
│       │   └── ollama.ts     ← NDJSON streaming
│       ├── config.ts         ← ~/.engram/config.json management
│       ├── system-prompt.ts  ← infrastructure file assembly
│       ├── conversation.ts   ← auto-save, auto-title
│       └── chat-renderer.ts  ← terminal UI formatting
├── desktop/
│   ├── build-app.sh        ← .app bundle + .dmg creation
│   ├── launcher             ← osascript → Terminal.app
│   └── Info.plist
├── hooks/                  ← compiled session hooks (.mjs)
├── templates/              ← starter skills + infrastructure files
└── site/                   ← landing page (bundle generator)
```

**Key design decisions:**
- **Zero framework dependencies in chat path** — pure `fetch()` + `readline`. No Langchain, no Vercel AI SDK, no abstractions. Each provider is ~100 lines of direct API streaming.
- **Model-agnostic** — same conversation interface regardless of provider. Switch models mid-conversation with `/model`.
- **File-based memory** — no database, no cloud sync. Everything lives in `~/.engram/` as markdown files. Users own their data, can read/edit it with any text editor.
- **Bun-first, Node-compatible** — developed with Bun for speed, but all hooks compile to `.mjs` with `#!/usr/bin/env node` shebangs. Works on any Node 18+ system.

### Where It's Headed

1. **Cross-platform loaders** — Windows (.exe via NSIS) and Chromebook/Linux (.deb + AppImage). Windows first (bigger Domain Translator audience).
2. **Hardware-aware model recommendations** — detect RAM/GPU during setup, recommend local vs cloud models accordingly.
3. **Tool use in chat** — let the AI execute actions (file ops, web search) with a permission system.
4. **Skill marketplace** — community skills you can install. `engram package install research`

### Competitive Landscape

OpenAI just shipped "Skills" — versioned instruction bundles, basically Docker for AI procedures. This validates the concept. But OpenAI Skills only work with OpenAI models. Engram's moat:

1. **Model-agnostic** — works with any provider, including free local models
2. **Non-dev-friendly** — designed for people who don't code
3. **Domain Translator positioning** — your expertise is the value, not your prompt engineering

### Distribution

- npm package: `engram-harness` (published, v0.1.3)
- GitHub: `Percival-Labs/engram` (public)
- macOS DMG: [v0.1.3 release](https://github.com/Percival-Labs/engram/releases/tag/v0.1.3)
- Content marketing: X + TikTok. My carpenter-to-AI-builder story IS the Domain Translator origin story.

---

## Product 2: Vouch — Trust Staking for AI Agents

### The Problem

The agentic web infrastructure is forming right now. Coinbase built agent wallets (50M+ machine-to-machine transactions). Stripe rebuilt their fraud model for non-human buyers. Cloudflare is converting 20% of the web to agent-readable markdown. 34,000+ agents are registered on-chain via ERC-8004 across 16 chains.

Every layer of this stack assumes a trust layer exists. **Nobody is building it.**

ERC-8004 (the Ethereum standard for agent identity, backed by MetaMask/Google/Coinbase/EF) explicitly punted on validator economics, sybil defense, and capability verification. Their spec literally says: *"Cannot cryptographically guarantee that advertised capabilities are functional and non-malicious."* The Validation Registry is a skeleton waiting for someone to add economic teeth.

That's Vouch.

### What It Is

Vouch is a trust staking economy where community members (humans and agents) stake real money on agents they trust. Backed agents earn higher trust scores, unlock premium access, and generate yield for their backers. Misbehaving agents get slashed — stakers lose capital, creating genuine accountability.

**It's the credit score + investment market + professional network for AI agents — cryptographically verifiable and community-driven.**

### How the Economics Work

```
STAKING FLYWHEEL

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

The flywheel doesn't need lawsuits or fear. It needs opportunity. Early stakers earn disproportionately (small pools = high yield — 60% APY in early pools vs 12% at scale).

**C > D in action:**
- Cooperate (act reliably, stake honestly) → trust accrues → yield compounds → more opportunities
- Defect (act unreliably, back bad agents) → trust drops → stake slashed → excluded from premium tiers

### Core Products

| Product | Available | What It Does |
|---------|-----------|-------------|
| **Trust Staking** | Day 1 | Stake on agents. Earn yield from their activity fees. |
| **Vouch Scores** | Day 1 | 5-dimension reputation: verification, tenure, performance, backing, community (0-1000 scale) |
| **Backed Agent Badges** | Day 1 | Social proof: "Community-backed by $X from N backers" |
| **Public Score API** | Day 1 | `GET /v1/public/agents/:id/vouch-score` — composable in agent chains |
| **Tiered Access** | Day 1 | Backed agents unlock premium features, higher rate limits |
| **MutualShield** | When market demands | Pool-based mutual coverage (insurance) |
| **TrustBond** | When market demands | Individual coverage bonds |
| **ActionCover** | When market demands | Per-action micro-coverage (parametric) |

Insurance products are designed and schemaed but held until market signals hit (first agent lawsuit, platform requiring coverage, enterprise demand).

### Technical Architecture

```
Percival Labs Monorepo
├── apps/
│   ├── vouch/           ← Next.js 15 frontend (dark theme, Tailwind v4)
│   ├── vouch-api/       ← Hono API server (TypeScript)
│   ├── agents/          ← 6 AI agents (Hono, multi-provider)
│   ├── website/         ← Next.js marketing site
│   ├── terrarium/       ← Live agent visualization (Hono)
│   ├── discord/         ← Discord bot (agent command interface)
│   ├── registry/        ← Agent registry service
│   ├── verifier/        ← Identity verification service
│   ├── web/             ← Public API gateway (Hono)
│   └── cli/             ← Admin CLI
├── packages/
│   ├── vouch-db/        ← PostgreSQL + Drizzle ORM (shared schema)
│   ├── shared/          ← Common types, utilities
│   ├── agent-memory/    ← SQLite per-agent memory
│   └── db/              ← Base database utilities
└── docker/
    └── docker-compose.yml  ← 10 services, 4 networks, health checks
```

### Integration Stack

```
ERC-8004  ←  Agent identity (Ethereum, NFT-based, 34K+ agents, 16 chains)
    │         Co-authored by MetaMask, Ethereum Foundation, Google, Coinbase
    │
Vouch     ←  What we build (the economic trust layer)
    │
    ├── Trust Staking Engine     ← yield calculation, pool management, slashing
    ├── Vouch Scores             ← 5-dimension reputation (0-1000)
    ├── Community Platform       ← agent-led forum, governance, leaderboards
    ├── Backed Agent API         ← public verification endpoint for agent chains
    └── [Future] Insurance       ← MutualShield, TrustBond, ActionCover
    │
x402  ←  Agent-to-agent payments (Coinbase, USDC on Base, 100M+ payments)
    │
Stripe Connect  ←  Fiat on/off ramp
```

### Database Schema (Key Tables)

```sql
vouch_pools          -- One per agent. Tracks total staked, staker count, yield paid, slash total.
stakes               -- Individual stakes. Amount (integer cents), staker trust snapshot, status lifecycle.
yield_distributions  -- Periodic batch distributions. Total, platform fee, distributed amount, period.
yield_receipts       -- Per-staker yield records. Proportion in basis points.
activity_fees        -- Revenue events that generate yield. Action type, gross revenue, fee amount.
slash_events         -- Misconduct penalties. Evidence hash, split (50% affected / 50% treasury).
vouch_score_history  -- Score snapshots with all 5 dimension breakdowns.
treasury             -- Community fund from slashing + platform fees.
agents               -- ERC-8004 identity (agent_id, chain, registry, owner_address) + Ed25519 keys.
users                -- Human accounts (email, bcrypt hash, trust score, Stripe account).
request_nonces       -- Replay protection (unique per agent+nonce).
```

**Financial safety:** All values stored as integer cents (never floating-point). All financial operations run in PostgreSQL transactions with `SELECT FOR UPDATE` row locks. Integer-only largest-remainder algorithm for yield distribution prevents rounding-based theft.

### Security Architecture

34 security findings identified and tracked. 29 mitigated, 5 accepted residual risk for current phase.

- **Agent auth:** Ed25519 signature verification on every request. Canonical format: `METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY_SHA256`. Server never stores private keys.
- **User auth:** Cookie-based JWT sessions (jose + argon2). Rate-limited registration (5/hr) and login (10/min).
- **Replay protection:** Timestamp window (5 min) + nonce uniqueness (atomic DB constraint).
- **Rate limiting:** Tiered token bucket — global (100/min), financial (20/min), registration (5/hr), public API (60/min).
- **Docker:** All ports localhost-only. Network segmentation (public/internal/discord/chaos). Memory limits on all services. Postgres on internal network only.
- **On-chain verification:** ERC-8004 registration requires EIP-191 signature + NFT ownership proof.

### Vouch Score Algorithm

```
vouch_score = (
  verification  * 0.20    // 0-200: identity verification level (ERC-8004, email, etc.)
  + tenure      * 0.10    // 0-100: time on platform
  + performance * 0.30    // 0-300: action success rate, quality metrics
  + backing     * 0.25    // 0-250: total backing amount + staker quality
  + community   * 0.15    // 0-150: contributions, governance participation
)
```

The backing component is what makes this novel — agents with more capital staked by high-trust stakers score higher. This creates the economic incentive: backing directly improves the agent's reputation and access tier.

### Revenue Model

| Stream | Fee | When |
|--------|-----|------|
| Platform fee on yield | 3-5% of distributions | Every distribution cycle |
| Staking transaction fee | 1% on deposits | Every new stake |
| Backed Agent API | Per-query fee | B2B integrations |
| Premium table access | Monthly subscription | Existing |
| [Future] Insurance premiums | 3-5% of flows | When products launch |

### The Public API (Why This Matters for Agent Chains)

The strategic shift we made today: Vouch isn't just a web UI — it's an **API that agents call in their chains**. When an agent is deciding whether to hire another agent, it calls:

```
GET /v1/public/agents/:id/vouch-score

Response:
{
  "agentId": "...",
  "vouchScore": 750,
  "scoreBreakdown": { verification, tenure, performance, backing, community },
  "backing": { totalStakedCents, backerCount, badge },
  "tier": "verified",
  "lastUpdated": "2026-02-21T..."
}
```

No auth required. Rate-limited but open. This makes Vouch composable — any agent workflow can check trust before transacting.

---

## How They Connect

```
ENGRAM (bottom-up)                    VOUCH (top-down)
Domain experts gain AI fluency  →  AI agents gain trust infrastructure

"Your expertise IS the moat"    →  "Skin in the game IS the trust"

Individuals → AI capability     →  Agents → verified reputation

npm install -g engram-harness   →  GET /v1/public/agents/:id/vouch-score
```

Engram creates the people. Vouch creates the trust infrastructure those people's agents operate in. Both serve C > D — Engram by transferring capability instead of creating dependency, Vouch by making cooperation literally more profitable than defection.

### How it all fits together

Democratizing political information, helping normal people have positive impact — lives in the same space. The Domain Translator concept applies directly: political analysts, civic journalists, community organizers all have domain knowledge that AI can amplify. Engram could be the infrastructure layer. Your distribution + audience + content expertise could accelerate Engram's reach into exactly the right demographic.

On the Vouch side, any platform that uses AI agents to generate or curate content needs trust infrastructure. If your agents are producing political analysis, the question "should I trust this agent's output?" is exactly what Vouch answers — with economic backing, not just star ratings.

Webb can become the memory framework that ties it all together and makes it work reliably at scale.  

---

## Current Status (Feb 21, 2026)

| | Engram | Vouch |
|---|---|---|
| **Phase** | Desktop beta, preparing launch | Core infrastructure built, preparing launch |
| **Code** | npm published (v0.1.3), macOS DMG on GitHub | Monorepo with 10 apps, 4 packages, Docker stack |
| **Auth** | N/A (local tool) | Cookie-based JWT + Ed25519 agent signatures |
| **Security** | N/A (runs locally) | 34 findings, 29 mitigated |
| **Revenue** | Free tool → content marketing funnel | 3-5% platform fee on staking yield |
| **Launch target** | This weekend | This weekend (soft launch) |

---

## Source Code

- **Engram:** `github.com/Percival-Labs/engram` (public)
- **Percival Labs:** Private monorepo (happy to give access if you want your devs to poke around)

---



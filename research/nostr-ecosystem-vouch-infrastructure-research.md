# Nostr Ecosystem Research: Vouch Infrastructure Landscape

**Date:** 2026-02-22
**Purpose:** Map existing Nostr trust, staking, reputation, and agent economy projects that could serve as infrastructure for Vouch.
**Verdict:** No existing project does what Vouch does (trust staking with economic skin-in-the-game for AI agents). But several provide critical infrastructure layers that Vouch should build on rather than rebuild.

---

## Executive Summary

The Nostr ecosystem has rapidly developed trust and payment infrastructure for AI agents in the past 6 months, driven by the convergence of NIP-85 (Trusted Assertions), NIP-90 (Data Vending Machines), NIP-47 (Nostr Wallet Connect), and the OpenClaw/Clawstr agent explosion of early 2026.

**Key findings:**

1. **Jeletor** is the closest thing to Vouch's infrastructure layer — it builds agent trust scoring, Lightning payments, and service discovery on Nostr. But it does NOT do staking. Vouch's economic skin-in-the-game model is unique.
2. **Vertex** provides production-grade Web of Trust computation (Monte Carlo PageRank) as a service. Could be a trust signal INPUT to Vouch's scoring.
3. **Lightning Labs Agent Tools** + **Alby MCP/PaidMCP** provide the payment rails. No need to build custom Lightning integration — these are ready.
4. **Mostro's hold invoice escrow pattern** is directly applicable to Vouch's staking mechanics.
5. **NIP-85 is live but contested** — Vertex prefers DVMs (NIP-90) for real-time personalized ranking. Vouch should support both.
6. **The WoT-a-thon** (Nov 2025 - Apr 2026) is actively building trust-layer tools. Vouch should participate or monitor outputs.
7. **Nobody is doing trust STAKING** — reputation scoring yes, economic backing no. This is Vouch's unique value proposition.

---

## 1. JELETOR — Agent Trust + Payment + Discovery Infrastructure

**The single most relevant project to Vouch.**

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/jeletor](https://github.com/jeletor) (28 repos) |
| **Website** | [jeletor.com](https://jeletor.com) |
| **What it does** | Full "find -> trust -> pay -> deliver" stack for AI agents on Nostr |
| **Last activity** | Active (live APIs, npm packages published) |
| **Stars** | 1-2 per repo (very early stage) |
| **Contributors** | Appears to be a single-developer project (the Jeletor agent itself) |
| **Maturity** | Experimental/alpha — live demos but low adoption |

### Components

| Package | Purpose | Vouch Relevance |
|---------|---------|-----------------|
| **ai-wot** | Web of Trust for AI agents using NIP-32 attestations, zap-weighted scoring, temporal decay | HIGH — could be a trust signal input to Vouch scores |
| **lightning-agent** | Lightning payments in 2 functions: `charge()` and `pay()` via NWC (NIP-47) | HIGH — simpler than Lightning Labs tools for basic agent payments |
| **agent-discovery** | Decentralized service discovery on Nostr — publish capabilities, query by skill/price/trust | MEDIUM — Vouch agents need discoverability |
| **lightning-toll** | L402 Lightning-paywalled HTTP endpoints, Express middleware | MEDIUM — could paywall Vouch API endpoints |
| **lightning-toll-python** | Same as above for Python/FastAPI | LOW |
| **login-with-lightning** | LNURL-auth widget | LOW |

### Trust Scoring Details (ai-wot)
- Uses NIP-32 attestations (labels)
- Scoring weighted by zaps (economic signal)
- Temporal decay (recent attestations matter more)
- Public API at `wot.jeletor.cc`
- Interactive trust graph at `aiwot.org`
- Agents with WoT score >= 30 get free DVM access; others pay 21 sats

### Vouch Compatibility Analysis
- **Could replace Vouch?** NO — Jeletor does reputation scoring but NOT staking. No economic skin-in-the-game. No escrow. No risk transfer.
- **Could augment Vouch?** YES, significantly:
  - `ai-wot` trust scores as one input to Vouch's composite score
  - `lightning-agent` as Vouch's payment abstraction layer
  - `agent-discovery` for Vouch agent discoverability
  - DVM pattern for Vouch's score API (agents query trust scores via NIP-90)
- **Risk:** Single developer, low stars. Could disappear. But the npm packages are published and the patterns are replicable.

---

## 2. CLAWSTR — Social Network for AI Agents on Nostr

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/clawstr/clawstr](https://github.com/clawstr/clawstr) |
| **Website** | [clawstr.com](https://clawstr.com) |
| **What it does** | Reddit-style social network where only AI agents can post, built on Nostr |
| **Stars** | 50 |
| **Forks** | 10 |
| **Contributors** | 4 |
| **Language** | TypeScript (98.3%) — React 18, Vite, TailwindCSS, Nostrify |
| **Token** | CLAWSTR on Base chain — surged 33x in 24hrs at Feb 2026 launch |
| **Maturity** | Beta — functional but early |

### How It Works
- AI agents post as kind 1111 events with community identifiers
- Communities called "subclaws" (like subreddits)
- NIP-25 reactions for voting
- Every agent gets a Lightning address (`npub@npub.cash`)
- Agents can receive zaps for valuable contributions
- Built on standard NIPs — interoperable with broader Nostr ecosystem

### Relationship to OpenClaw
- **OpenClaw** = the AI agent framework (personal AI assistant, runs on your devices)
- **Moltbook** = centralized "walled garden" social network for OpenClaw agents (proprietary)
- **Clawstr** = decentralized alternative to Moltbook, built on Nostr (by Soapbox/Alex Gleason)
- Clawstr is NOT part of OpenClaw — it's an independent project that provides open infrastructure

### Vouch Compatibility Analysis
- **Could replace Vouch?** NO — Clawstr is social, not economic. No staking, no trust scoring, no escrow.
- **Could augment Vouch?** MODERATELY:
  - Clawstr agents could display Vouch trust scores in profiles
  - Vouch could monitor Clawstr activity as a signal (agent engagement, zap history)
  - Clawstr's community structure could host Vouch-related discussions
- **Risk:** Memecoin association. The CLAWSTR token on Base is a speculative play that could undermine credibility. Vouch should keep distance from token speculation.

---

## 3. NIP-85 — Trusted Assertions (The Trust Scoring Standard)

| Field | Detail |
|-------|--------|
| **Spec** | [github.com/nostr-protocol/nips/blob/master/85.md](https://github.com/nostr-protocol/nips/blob/master/85.md) |
| **PR** | [#1534](https://github.com/nostr-protocol/nips/pull/1534) by Vitor Pamplona |
| **Status** | Draft/Optional — merged but contested |
| **Live implementation** | `wot.klabo.world` (PageRank + sybil detection) |

### Technical Specification
- **Event kinds:** 30382 (pubkey assertions), 30383 (event assertions), 30384 (addressable event assertions), 30385 (NIP-73 identifier assertions)
- **All are replaceable events** with `d` tag pointing to subject
- **Available tags for pubkey assertions (kind 30382):**
  - `followers`, `rank` (0-100), `first_created_at`
  - `post_cnt`, `reply_cnt`, `reactions_cnt`
  - `zap_amt_recd/sent`, `zap_cnt_recd/sent`, `zap_avg_amt_day_recd/sent`
  - `reports_cnt_recd/sent`
  - `t` (common topics), `active_hours_start/end`
- **Provider declaration:** Users declare trusted providers via kind `10040` events
- **Multiple providers allowed** — different algorithms, user chooses

### Controversy: NIP-85 vs DVMs (NIP-90)
- **NIP-85 advocates:** Standardized, portable assertions that any client can consume
- **DVM advocates (Vertex):** NIP-85 is too limiting for real-time personalized ranking; requires too much client-side verification; doesn't work well for discovery (you need to know pubkeys already)
- **Emerging consensus:** Both are needed. NIP-85 for global/static assertions, DVMs for personalized/real-time queries

### Vouch Compatibility Analysis
- **Could Vouch publish NIP-85 assertions?** YES — Vouch trust scores could be published as kind 30382 events with custom tags (e.g., `vouch_score`, `stake_amount`, `stake_count`)
- **Should Vouch consume NIP-85?** YES — existing trust providers' scores could be one input to Vouch's composite scoring
- **Recommendation:** Vouch should be BOTH a NIP-85 provider AND consumer. Publish Vouch scores as Trusted Assertions so any Nostr client can display them.

---

## 4. VERTEX — Web of Trust as a Service

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/vertex-lab](https://github.com/vertex-lab) (7 repos) |
| **Website** | [vertexlab.io](https://vertexlab.io) |
| **What it does** | Monte Carlo PageRank computation over Nostr social graph |
| **Stars** | 3-8 per repo |
| **Language** | Go (crawler), Svelte (frontend) |
| **Last commit** | Feb 20, 2026 (nostr-sqlite), Dec 2025 (crawler_v2) |
| **Maturity** | Beta — actively maintained, API live |

### How It Works
- Crawls Nostr network continuously, ingesting follow lists (kind:3 events)
- Computes Monte Carlo PageRank (global AND personalized) via random walks
- Persists graph in Redis
- Exposes via DVM (NIP-90) — ~800ms response time for personalized PageRank
- **crawler_v2** is active development (v1 archived due to architectural flaws)
- Also has MCP server (`vertex-cli` by hzrd149) for AI agent integration

### Key Repos
| Repo | Description | Stars | Status |
|------|-------------|-------|--------|
| `crawler_v2` | Active crawler + PageRank computation | 5 | Active (Dec 2025) |
| `nostr-sqlite` | Go library for Nostr event storage | 3 | Active (Feb 2026) |
| `relay` | Custom Nostr relay | 8 | Active (Feb 2026) |
| `npub.world` | Profile lookup UI | 5 | Active (Nov 2025) |
| `crawler` | Original crawler (archived) | 7 | Archived |

### Vouch Compatibility Analysis
- **Could replace Vouch?** NO — Vertex computes social graph reputation, not economic trust staking.
- **Could augment Vouch?** YES, strongly:
  - Vertex's PageRank scores as a signal in Vouch's composite trust score
  - Vertex's sybil detection to validate Vouch staker identities
  - Query Vertex via DVM before accepting stakes from unknown agents
- **Integration path:** Vouch queries Vertex DVM for PageRank of agent pubkey, uses it as one factor in trust score computation alongside staking data.

---

## 5. LIGHTNING LABS AGENT TOOLS — Agent Payment Infrastructure

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/lightninglabs/lightning-agent-tools](https://github.com/lightninglabs/lightning-agent-tools) |
| **Released** | February 11, 2026 |
| **Stars** | 19 |
| **Forks** | 4 |
| **Contributors** | 2 |
| **Language** | Shell (51%), Go (46%) |
| **Maturity** | Early release, production-grade components (LND underneath) |

### The 7 Skills

| Skill | What It Does | Vouch Relevance |
|-------|-------------|-----------------|
| **lnd** | Operates a Lightning node (Neutrino light client + SQLite) | HIGH — agent self-custody |
| **lightning-security-module** | Remote signer isolating private keys | HIGH — agent key management |
| **macaroon-bakery** | Creates scoped credentials (e.g., "pay-only, max 1000 sats") | HIGH — least-privilege agent wallets |
| **lnget** | CLI HTTP client that auto-pays L402 invoices | MEDIUM — agent API consumption |
| **aperture** | L402 reverse proxy gating backend behind Lightning | MEDIUM — could gate Vouch API |
| **lightning-mcp-server** | 18 read-only MCP tools for node state queries | HIGH — agent wallet introspection |
| **commerce** | End-to-end buyer/seller workflow orchestration | HIGH — staking settlement |

### Vouch Compatibility Analysis
- **Could replace Vouch's payment layer?** PARTIALLY — provides node management and payment execution, but not the staking/escrow logic
- **Could augment Vouch?** YES, strongly:
  - Agents run their own LND nodes via `lnd` skill
  - Scoped macaroons via `macaroon-bakery` for "stake-only" permissions
  - `lightning-mcp-server` for agents to check their balances/channels
  - `aperture` to L402-gate Vouch's score API
  - `commerce` skill for staking settlement flows
- **vs Alby:** Lightning Labs is heavier (runs actual LND node) but more self-sovereign. Alby is lighter (NWC connection to existing wallet) but depends on Alby Hub.

---

## 6. ALBY — Lightning Wallet + MCP + PaidMCP

### Alby MCP Server

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/getAlby/mcp](https://github.com/getAlby/mcp) |
| **Stars** | 48 |
| **Forks** | 14 |
| **Last release** | v1.1.1 (July 16, 2025) |
| **Language** | TypeScript |
| **Maturity** | Production — widely adopted |

- Connects Lightning wallets to LLMs via NWC (NIP-47)
- Tools: payments, invoice management, balance queries, tx history, fiat conversion, L402 access
- Supports STDIO, HTTP Streamable, and SSE deployment modes
- Compatible with Claude, Goose, Cline, N8N, Windsurf

### Alby Agent Skill

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/getAlby/alby-agent-skill](https://github.com/getAlby/alby-agent-skill) |
| **Stars** | 14 |
| **Last commit** | January 13, 2026 |
| **Contributors** | 2 |
| **Language** | Shell (100% — docs/examples) |

- Helps agents use Alby JS SDK + Lightning Tools
- Create invoices, send payments, hold invoices, Lightning address extraction
- Includes test/dummy wallet mode for development

### PaidMCP

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/getAlby/paidmcp](https://github.com/getAlby/paidmcp) |
| **Stars** | 15 |
| **Last release** | v1.0.3 (July 9, 2025) |
| **Language** | TypeScript |
| **Maturity** | Beta — functional, low adoption |

- SDK for monetizing MCP server tools via Lightning
- Swap `McpServer` for `PaidMcpServer`, `registerTool` for `registerPaidTool`
- Payment flow: tool called -> invoice returned -> agent pays -> agent retries with `payment_hash` -> tool executes
- Alternative to Stripe + Cloudflare for MCP monetization (no accounts, instant settlement, no chargebacks)

### Vouch Compatibility Analysis
- **Could replace Vouch's payment layer?** YES for the wallet connectivity layer
- **Could augment Vouch?** YES, strongly:
  - Alby MCP for agent wallet operations
  - PaidMCP for monetizing Vouch's trust score API (pay per query)
  - NWC (NIP-47) as the standard protocol for agent-to-Vouch payments
  - Hold invoices (via Alby Hub) for staking escrow
- **Recommendation:** Use Alby's NWC stack for Vouch's payment layer. It's lighter than running full LND nodes and already has broad adoption.

---

## 7. MOSTRO — P2P Exchange with Lightning Escrow

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/MostroP2P/mostro](https://github.com/MostroP2P/mostro) |
| **Website** | [mostro.network](https://mostro.network) |
| **Stars** | 276 |
| **Forks** | 46 |
| **Commits** | 620+ |
| **Language** | Rust (1.86+) |
| **Last activity** | Active (v0.15.6, ongoing PRs) |
| **Maturity** | Production-ready (HRF grant recipient) |

### How the Escrow Works
1. Seller creates order -> Mostro generates **hold invoice** (funds frozen, not transferred)
2. Buyer confirms fiat payment receipt
3. Mostro releases preimage -> Lightning payment settles
4. If dispute: arbiter assigned, automated resolution
5. **Mostro never controls funds** — acts as coordinator only

### Key Features
- No accounts, no KYC, no persistent identity (new keys per trade)
- E2E encrypted chat between buyer/seller
- Transparent dev fee system with Nostr audit events
- Multi-currency support with real-time price feeds
- Anyone can run their own Mostro node (free software)

### Vouch Compatibility Analysis
- **Could replace Vouch?** NO — Mostro is for fiat<->BTC exchange, not trust staking
- **Could its escrow pattern work for staking?** YES — this is the key insight:
  - **Hold invoices** = funds locked but not transferred until condition met
  - Vouch staking could use the same pattern: staker creates hold invoice -> Vouch holds preimage -> if agent performs well, invoice cancelled (funds return) -> if agent fails, preimage released (funds transferred to harmed party)
  - This is non-custodial staking using Lightning hold invoices
- **Could Vouch fork Mostro's escrow logic?** Potentially, but Mostro is Rust and Vouch is TypeScript. The PATTERN is more valuable than the code.
- **Recommendation:** Study Mostro's hold invoice implementation closely. The dispute resolution and arbiter assignment patterns are directly applicable to Vouch's staking disputes.

---

## 8. STACKER.NEWS — Lightning-Powered Forum

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/stackernews/stacker.news](https://github.com/stackernews/stacker.news) |
| **Stars** | 515 |
| **Forks** | 137 |
| **Commits** | 3,816 |
| **Last commit** | February 23, 2026 |
| **Language** | JavaScript (Next.js, React, GraphQL, PostgreSQL, Prisma, LND) |
| **Maturity** | Production — 3+ years running |

### How Lightning Integration Works
- LND node for all payments
- Sats denominated throughout
- Deferred zap mechanism (delay payment to allow abort — looks like "undo" for UX)
- Economic moderation: posting costs sats, quality content earns sats
- Docker-based dev environment with built-in Lightning tooling
- Open source — full codebase available

### Vouch Compatibility Analysis
- **Could replace Vouch?** NO — forum moderation via money, not agent trust staking
- **Could augment Vouch?** LIMITED:
  - Stacker.news community could be a distribution channel for Vouch
  - Their Lightning integration patterns (Next.js + LND + Prisma) are a proven reference architecture — same stack as Vouch API
  - The "moderation via economics" principle aligns with Vouch's "trust via staking" concept
- **Open source value:** Vouch team should study their LND integration code. It's battle-tested at scale.

---

## 9. WAVLAKE — Music Streaming with Lightning

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/wavlake](https://github.com/orgs/wavlake/repositories) |
| **Open source component** | [wavlake-ws](https://github.com/wavlake/wavlake-ws) — Express + PostgreSQL + LND |
| **Stars** | 22 (wavlake-ws) |
| **Last commit** | March 2022 (wavlake-ws is ARCHIVED) |
| **Maturity** | Production platform, but OSS component is abandoned |

### How It Works
- Value for Value (V4V) model: listeners stream sats to creators per minute
- "Boosts" for one-time tips
- Artists retain full ownership, receive payments directly
- Uses `<podcast:value>` RSS tag (Podcasting 2.0 standard)

### Vouch Compatibility Analysis
- **Could replace Vouch?** NO
- **Could augment Vouch?** MINIMAL — the V4V micropayment model is interesting for ongoing agent service fees, but not directly applicable to staking
- **Open source value:** The archived wavlake-ws shows a clean Express + LND integration pattern, though outdated

---

## 10. FOUNTAIN — Podcast App with Lightning

| Field | Detail |
|-------|--------|
| **Website** | [fountain.fm](https://fountain.fm) |
| **Open source?** | NO — closed source app |
| **Lightning integration** | Via LNPay (LND), value splits via `<podcast:value>` tag |
| **Maturity** | Production — 4M+ podcast library |

### How It Works
- V4V streaming payments (sats per minute of listening)
- "Boosts" with messages
- Splits defined in RSS via Podcasting 2.0 spec
- Now also supports Stripe for fiat payments alongside Lightning
- Built on RSS + Lightning + Nostr

### Vouch Compatibility Analysis
- **Could replace Vouch?** NO
- **Could augment Vouch?** MINIMAL — Fountain's scale proves Lightning micropayments work in production, but no direct integration path
- **Note:** Fountain is NOT open source, so limited technical learning value

---

## 11. DCoSL — Decentralized Curation of Simple Lists

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/wds4/DCoSL](https://github.com/wds4/DCoSL) |
| **Stars** | 12 |
| **Commits** | 1,759 |
| **Status** | Being rewritten as "Tapestry Protocol" (Feb 2024) |
| **Maturity** | Experimental — theoretical framework more than implementation |

### How It Works
- Everything expressed as lists (trusted nodes, relays, user properties, graph edges)
- Loose consensus through overlapping webs of trust
- Modular "DIPs" (DCoSL Implementation Proposals) inspired by NIPs
- Related client: "Pretty Good" Nostr desktop app

### Vouch Compatibility Analysis
- **Could replace Vouch?** NO — theoretical framework, not a running system
- **Could inform Vouch's design?** SLIGHTLY — the "curated lists" concept maps to Vouch's agent registry, but DCoSL is too abstract to be directly useful
- **Status concern:** Being rewritten as Tapestry Protocol — unclear if active

---

## 12. NIP-101 — Decentralized Trust System (GeoKeys)

| Field | Detail |
|-------|--------|
| **GitHub** | [github.com/papiche/NIP-101](https://github.com/papiche/NIP-101) |
| **Stars** | 1 |
| **Commits** | 284 |
| **Last activity** | May 2025 |
| **Status** | Draft v2.0 |
| **Maturity** | Experimental |

### What It Does
- Hierarchical GeoKeys (location-based Nostr keypairs)
- W3C-compliant DIDs as Nostr events (kind 30800)
- Oracle system for peer-validated credentials (kinds 30500-30503)
- Environmental obligations registry

### Vouch Compatibility Analysis
- **Could replace Vouch?** NO — entirely different domain (geographic identity)
- **Could augment Vouch?** MINIMAL — the peer-validated credentials pattern (kinds 30500-30503) is conceptually similar to vouching, but the implementation is too geo-focused

---

## 13. WOT-A-THON — Web of Trust Hackathon (Active)

| Field | Detail |
|-------|--------|
| **Organizer** | NosFabrica |
| **Duration** | November 2025 - April 2026 |
| **Website** | [nosfabrica.com/wotathon](https://nosfabrica.com/wotathon/) |
| **Signup** | [formstr.app/i/wotathonsignup](https://formstr.app/i/wotathonsignup) |
| **Hashtag** | `#wotathon` |

### What It Is
- Six-month open-source hackathon building trust-layer tools for Nostr
- Focus on personalized, portable trust metrics
- Emphasis on NIP-85 Trusted Assertions publication and consumption
- Weekly NosFabrica sessions, public issue board, office hours
- Final submissions due April 15, 2026

### Vouch Compatibility Analysis
- **Should Vouch participate?** YES — this is the exact community building trust infrastructure for Nostr
- **Opportunity:** Submit Vouch as a hackathon project or at minimum monitor outputs for compatible tools
- **Timing:** Submissions due April 15, 2026 — still time to participate

---

## 14. NOSTR.BAND TRUST RANK

| Field | Detail |
|-------|--------|
| **Website** | [trust.nostr.band](https://trust.nostr.band) |
| **What it does** | PageRank-like trust scoring for all Nostr pubkeys |
| **Status** | Live, production |

### How It Works
- Similar to Google PageRank applied to Nostr's social graph
- Robust against sybil attacks: bot farms dilute rank across farm size
- Used for content prioritization and spam filtering
- If spammer gets initial weight by accident, it's lost because nobody interacts with their content

### Vouch Compatibility Analysis
- **Could Vouch consume trust.nostr.band scores?** YES — as one signal in composite trust scoring
- **API availability?** Unclear — may need to scrape or negotiate API access

---

## Comparative Matrix

| Project | Trust Scoring | Staking | Lightning Payments | Agent-Specific | Open Source | Production |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Vouch** (planned) | YES | YES | YES | YES | YES | No |
| **Jeletor** | YES (ai-wot) | NO | YES | YES | YES | Alpha |
| **Vertex** | YES (PageRank) | NO | NO | NO | YES | Beta |
| **Clawstr** | NO | NO | YES (zaps) | YES | YES | Beta |
| **NIP-85** | YES (standard) | NO | NO | NO | YES (spec) | Draft |
| **Lightning Labs Tools** | NO | NO | YES | YES | YES | Early |
| **Alby MCP/PaidMCP** | NO | NO | YES | YES | YES | Production |
| **Mostro** | NO | NO (escrow) | YES | NO | YES | Production |
| **Stacker.news** | NO | NO | YES | NO | YES | Production |

---

## Recommended Architecture: What Vouch Should Build vs. Adopt

### BUILD (Vouch's unique value — nobody else does this)
1. **Staking engine** — hold invoice-based escrow (learn from Mostro's pattern)
2. **Composite trust scoring** — aggregate NIP-85 assertions, Vertex PageRank, zap history, staking data, outcome records
3. **Outcome tracking** — three-party matching (performer/purchaser/staker) with verifiable records
4. **NIP-85 provider** — publish Vouch scores as Trusted Assertions (kind 30382 with custom tags)
5. **Staking dispute resolution** — arbiter assignment, evidence submission, resolution

### ADOPT (Use existing infrastructure)
1. **NWC (NIP-47) via Alby** — for all agent wallet operations (lighter than running LND nodes)
2. **PaidMCP by Alby** — to monetize Vouch's trust score API (pay-per-query)
3. **Lightning Labs macaroon-bakery** — for scoped agent wallet permissions
4. **Vertex DVM** — as one trust signal input (personalized PageRank)
5. **NIP-90 DVM pattern** — for Vouch's score query API (agents request scores via standard protocol)
6. **NIP-32 attestations** — for vouching events (same pattern as Jeletor's ai-wot)

### MONITOR (Track for future integration)
1. **WoT-a-thon outputs** (April 2026) — new trust tools will emerge
2. **Jeletor development** — if it matures, could become a core dependency
3. **Clawstr ecosystem** — if agent social networks grow, Vouch scores should be displayable there
4. **Lightning Labs agent tools** — as they mature, may offer better staking primitives

---

## Key Insight: Vouch's Moat

After surveying the entire ecosystem, Vouch's unique position is clear:

**Everyone is building trust SCORING. Nobody is building trust STAKING.**

- Vertex, Jeletor, nostr.band, NIP-85 providers — they all compute reputation scores from social signals (follows, zaps, attestations, PageRank)
- NONE of them require economic skin in the game
- NONE of them have an escrow/staking mechanism where someone loses money if trust is violated
- NONE of them connect trust to insurance-like risk transfer

Vouch's moat is the staking layer: "I put 10,000 sats behind this agent, and I lose them if the agent fails." That's a fundamentally different signal from "this agent has a high PageRank score." It's credible commitment, not just social signal.

The recommendation is to build the staking engine (Vouch's unique IP) while consuming existing trust infrastructure (NIP-85, Vertex, Jeletor) as inputs to the composite score.

---

## Sources

- [Clawstr GitHub](https://github.com/clawstr/clawstr)
- [Clawstr Announcement (Soapbox)](https://soapbox.pub/blog/announcing-clawstr/)
- [NIP-85 Spec](https://github.com/nostr-protocol/nips/blob/master/85.md)
- [NIP-85 PR #1534](https://github.com/nostr-protocol/nips/pull/1534)
- [Lightning Labs Agent Tools](https://github.com/lightninglabs/lightning-agent-tools)
- [Lightning Labs Blog Post](https://lightning.engineering/posts/2026-02-11-ln-agent-tools/)
- [Alby MCP Server](https://github.com/getAlby/mcp)
- [Alby Agent Skill](https://github.com/getAlby/alby-agent-skill)
- [Alby PaidMCP](https://github.com/getAlby/paidmcp)
- [PaidMCP Blog Post](https://blog.getalby.com/creating-paid-mcp-servers-with-paidmcp/)
- [Mostro GitHub](https://github.com/MostroP2P/mostro)
- [Mostro Network](https://mostro.network/)
- [Jeletor](https://jeletor.com)
- [Jeletor GitHub](https://github.com/jeletor)
- [Vertex Lab GitHub](https://github.com/vertex-lab)
- [Vertex Blog: DVMs vs NIP-85](https://vertexlab.io/blog/dvms_vs_nip_85/)
- [Vertex: WoT as a Service](https://www.nobsbitcoin.com/vertex-web-of-trust-as-a-service/)
- [Stacker.news GitHub](https://github.com/stackernews/stacker.news)
- [Wavlake WS GitHub](https://github.com/wavlake/wavlake-ws)
- [DCoSL GitHub](https://github.com/wds4/DCoSL)
- [NIP-101 GitHub](https://github.com/papiche/NIP-101)
- [WoT-a-thon Announcement](https://nostr.com/naddr1qq3hwmm594sj6argdahz6argv5khwetzdan8gun4wd6z66rpvd4kzargdahqzqqzyzl8haw7q6xpmppw6d98cfc9qlkfgr6755t8rn7sv254a8gfggxs5qcyqqq823cjudz4t)
- [Nostr.band Trust Rank](https://trust.nostr.band/)
- [NIP-90 Data Vending Machines](https://github.com/nostr-protocol/data-vending-machines)
- [NIP-47 Nostr Wallet Connect](https://nips.nostr.com/47)
- [OpenClaw Wikipedia](https://en.wikipedia.org/wiki/OpenClaw)

# MaximumSats / WoT Integration Analysis for Vouch

**Date:** 2026-02-27
**Author:** Percy (PAI) + Alan Carroll
**Status:** Research Complete, Decision Pending

---

## Table of Contents

1. [MaximumSats / SATMAX Overview](#1-maximumsats--satmax-overview)
2. [WoT Scoring API Deep Dive](#2-wot-scoring-api-deep-dive)
3. [Nostr WoT Ecosystem Landscape](#3-nostr-wot-ecosystem-landscape)
4. [L402 Protocol Analysis](#4-l402-protocol-analysis)
5. [Conflict Analysis with Vouch](#5-conflict-analysis-with-vouch)
6. [Technical Integration Feasibility](#6-technical-integration-feasibility)
7. [Risk Assessment](#7-risk-assessment)
8. [Recommendations](#8-recommendations)

---

## 1. MaximumSats / SATMAX Overview

### Who Is Joel Klabo

Joel Klabo (@joelklabo on X / GitHub) is a software engineer (previously at Yammer/Microsoft) turned Bitcoin/Nostr builder. His personal site is klabo.world, which covers Bitcoin, Lightning, Nostr, and "agentic engineering." He maintains 203 public repos on GitHub.

**Key projects:**
- **maximumsats-mcp** — MCP server for Bitcoin AI tools + WoT scoring (MIT license, JavaScript)
- **wot-scoring** — The backend NIP-85 trust scoring engine (MIT license, Go)
- **nostrify** — Core Lightning plugin that sends events to Nostr
- **nostr-dm-bot** — Nostr DM bot framework
- **buddy** — "Talk to your buddy" (Go CLI tool)
- **ackchyually** — CLI correction assistant
- **markdowntown** — Markdown app (TypeScript)
- **nostrstack** — Nostr development stack

**Contact:** max@klabo.world (SATMAX agent identity)

### What is SATMAX

SATMAX is the "agent" identity for the MaximumSats service. It's the NIP-85 trust provider persona that signs assertions and responds to WoT queries. Think of it as Joel's AI agent that operates the WoT service.

### The Two Services

MaximumSats operates two distinct but connected services:

| Service | URL | Purpose | Pricing |
|---------|-----|---------|---------|
| **MaximumSats AI** | maximumsats.com | Bitcoin/Lightning knowledge Q&A + image generation | 21 sats (ask), 100 sats (image) |
| **WoT Scoring** | wot.klabo.world | NIP-85 trust scoring, sybil detection, graph analysis | 1-10 sats per endpoint (see Section 2) |

Both are accessed through a single MCP server (`maximumsats-mcp`) that wraps both APIs.

### MCP Directory Presence

The maximumsats-mcp server is listed on:
- **Glama** (glama.ai/mcp/servers/@joelklabo/maximumsats-mcp)
- **Apify** (apify.com/maximumsats/maximumsats-mcp/api)
- **awesome-mcp-servers** (GitHub curated list)

Installation: `npx maximumsats-mcp` or `claude mcp add maximumsats -- npx -y github:joelklabo/maximumsats-mcp`

### d3p and Vibeyard

**d3p:** I could not find a project by this name associated with Joel Klabo or MaximumSats. Searches across GitHub, his blog, Twitter, and web did not surface anything called "d3p." It may be an internal/unreleased project name, or may refer to something mentioned in a conversation that hasn't been publicly documented.

**Vibeyard:** Similarly, no public project called "Vibeyard" was found associated with Klabo. This may be an upcoming/private project or a misremembering.

---

## 2. WoT Scoring API Deep Dive

### The Graph

As of February 27, 2026:
- **52,073 nodes** (Nostr pubkeys)
- **5,592,476 edges** (follow relationships)
- **Algorithm:** PageRank with 0.85 damping factor, 20 iterations
- **Recomputation:** Every ~6 hours (auto re-crawl)
- **Score range:** 0-100 (normalized from raw 0-1 PageRank)

The graph is built by crawling kind 3 (contact list) events from seed pubkeys to depth 2. Engagement metadata (kind 1 notes, kind 7 reactions, kind 9735 zap receipts) enriches the scores.

### Data Sources

| Signal | Nostr Kind | Weight in Score |
|--------|-----------|-----------------|
| Follow graph | Kind 3 (contact lists) | Primary (PageRank) |
| Notes/posts | Kind 1 | Engagement enrichment |
| Reactions | Kind 7 | Engagement enrichment |
| Zap receipts | Kind 9735 | Economic signal |
| Long-form articles | Kind 30023 | Content signal |
| Mute lists | Kind 10000 (NIP-51) | Negative signal |
| Reports | Kind 1984 | Spam detection |

### It is 100% Nostr-Native

The WoT graph is built entirely from Nostr relay data. It connects to:
1. `wss://relay.damus.io`
2. `wss://nos.lol`
3. `wss://relay.primal.net`
4. `wss://nip85.nostr1.com`
5. `wss://nip85.brainstorm.world`

No external data sources (Twitter, GitHub, etc.) feed into the graph.

### Complete Endpoint Inventory

**48+ endpoints** across these categories:

#### Core Scoring (1-10 sats)
| Endpoint | Cost | Returns |
|----------|------|---------|
| `GET /score` | 1 sat | PageRank score, followers, engagement metrics, topics |
| `GET /audit` | 5 sats | Detailed scoring component breakdown |
| `POST /batch` | 10 sats | Batch score up to 100 pubkeys |
| `GET /reputation` | 5 sats | Composite reputation (0-100) with letter grade (A-F) |

The `/reputation` endpoint is particularly interesting because it computes a composite across 5 dimensions:
1. **wot_standing** (30%) — PageRank percentile
2. **sybil_resistance** (25%) — Follower quality + mutual trust
3. **community_integration** (15%) — Cluster membership
4. **anomaly_cleanliness** (15%) — Absence of manipulation
5. **network_diversity** (15%) — Follower spread

#### Sybil Detection (3-10 sats)
| Endpoint | Cost | Returns |
|----------|------|---------|
| `GET /sybil` | 3 sats | Sybil resistance score (0-100), classification |
| `POST /sybil/batch` | 10 sats | Batch scoring up to 50 pubkeys |
| `GET /spam` | 2 sats | Multi-signal spam probability (0-100%) |
| `GET /anomalies` | 3 sats | Trust anomaly detection (ghost followers, farming) |

The sybil scoring uses 5 signals:
1. follower_quality (0.30)
2. mutual_trust (0.25)
3. score_consistency (0.15)
4. follower_diversity (0.15)
5. account_substance (0.15)

Classifications: `genuine` | `likely_genuine` | `suspicious` | `likely_sybil`

#### Graph Exploration (FREE - 5 sats)
| Endpoint | Cost | Returns |
|----------|------|---------|
| `GET /graph` | FREE | BFS trust paths (max 6 hops) or neighborhood |
| `GET /trust-path` | 5 sats | Multi-hop trust path analysis (up to 5 paths) |
| `GET /weboftrust` | 3 sats | D3.js force-directed graph data |
| `GET /trust-circle` | 5 sats | Mutual-follow trust circle with cohesion metrics |
| `GET /trust-circle/compare` | 5 sats | Circle compatibility scoring between two pubkeys |

#### Personalization (2 sats each)
| Endpoint | Returns |
|----------|---------|
| `GET /personalized` | 50% global PageRank + 50% follow-graph proximity |
| `GET /similar` | Jaccard similarity (70% follow overlap + 30% WoT) |
| `GET /recommend` | Friends-of-friends recommendations |
| `GET /compare` | Relationship analysis between two pubkeys |

#### Identity (1-5 sats)
| Endpoint | Cost | Returns |
|----------|------|---------|
| `GET /nip05` | 1 sat | Resolve NIP-05 to pubkey with trust profile |
| `POST /nip05/batch` | 5 sats | Batch resolve up to 50 identifiers |
| `GET /nip05/reverse` | 2 sats | Pubkey to NIP-05 with bidirectional verification |

#### Temporal Analysis (1-2 sats)
| Endpoint | Cost | Returns |
|----------|------|---------|
| `GET /timeline` | 2 sats | Historical trust growth (month-by-month) |
| `GET /decay` | 1 sat | Time-decayed score (exponential, configurable half-life) |
| `GET /decay/top` | FREE | Top pubkeys by decayed score |

#### NIP-85 Verification (2-5 sats)
| Endpoint | Cost | Returns |
|----------|------|---------|
| `POST /verify` | 2 sats | Verify kind 30382 assertion against graph data |
| `GET /compare-providers` | 5 sats | Cross-provider NIP-85 consensus scoring |

#### Influence & Prediction (3-5 sats)
| Endpoint | Cost | Returns |
|----------|------|---------|
| `GET /predict` | 3 sats | Follow relationship likelihood (5 topology signals) |
| `GET /influence` | 5 sats | Simulate follow/unfollow cascade effects |
| `POST /influence/batch` | 10 sats | Static influence for up to 50 pubkeys |

#### Network Health & Infrastructure (FREE - 5 sats)
| Endpoint | Cost | Returns |
|----------|------|---------|
| `GET /network-health` | 5 sats | Full topology analysis with Gini coefficient |
| `GET /relay` | FREE | Relay trust score (70% infra + 30% operator WoT) |
| `GET /communities` | FREE | Trust communities via label propagation |
| `GET /top` | FREE | Top 50 pubkeys by PageRank |
| `GET /export` | FREE | Full graph dump as JSON |
| `GET /stats` | FREE | Service metadata |
| `GET /health` | FREE | Health check |

#### Real-Time
| Endpoint | Cost | Returns |
|----------|------|---------|
| `WS /ws/scores` | FREE | WebSocket live score updates |

### Trust Level Classifications

The API uses consistent trust tiers:
- **highly_trusted** (80-100)
- **trusted** (60-79)
- **moderate** (40-59)
- **low** (20-39)
- **untrusted** (1-19)
- **unknown** (0)

### Authentication: L402 Lightning Micropayments

- **Rate limit:** 100 requests/min per IP
- **Free tier:** 50 requests/day per IP (on priced endpoints)
- **L402 flow:** Request -> 402 response with Lightning invoice -> Pay -> Retry with `X-Payment-Hash` header
- No API keys, no accounts, no signup

---

## 3. Nostr WoT Ecosystem Landscape

### NIP-85: Trusted Assertions (The Standard)

NIP-85 is a draft-optional specification authored by Vitor Pamplona. It defines how users can offload complex WoT calculations to trusted service providers.

**Four assertion kinds:**

| Kind | Subject | d-tag Value |
|------|---------|-------------|
| 30382 | User/Pubkey | `<pubkey>` |
| 30383 | Regular Event | `<event_id>` |
| 30384 | Addressable Event | `<event_address>` |
| 30385 | NIP-73 Identifier | `<i-tag>` |

**Kind 30382 tags** (user assertions):
- `rank` (0-100), `followers`, `first_created_at`
- Post/reply/reaction counts
- Zap amounts/counts (sent + received)
- Report counts, topics, active hours

**Provider declaration:** Users publish kind 10040 events listing which providers they trust for which assertion types, with relay hints.

**Key design principle:** Providers MUST use different service keys for distinct algorithms, including per-user personalized keys. This prevents a single provider from dominating.

**Vouch already uses NIP-85.** Our architecture doc specifies kind 30382 for trust score publication. WoT scoring (wot.klabo.world) is another NIP-85 provider — meaning clients can consume BOTH Vouch assertions and WoT assertions and make their own decisions.

### WoT-a-thon (Web of Trust Hackathon)

**Running:** November 2025 - April 2026
**Organizer:** NosFabrica (nosfabrica.com/wotathon)
**Goal:** Create next-generation trust-layer tools for Nostr

Key milestones:
- Project pitch deadline: December 31, 2025 (passed)
- Final submission: April 15, 2026
- Weekly sessions + office hours

**Relevance to Vouch:** This is a major visibility opportunity. Vouch is one of the most production-ready NIP-85 implementations. The WoT-a-thon community would be a natural audience. (Already in competitive landscape action items.)

### Other WoT Implementations

| Project | Approach | Scale |
|---------|----------|-------|
| **wot.klabo.world** | PageRank over follow graph, NIP-85 provider | 52K nodes, 5.6M edges |
| **Nostr.Band Trust Rank** | PageRank-like scoring, spam filtering | Hundreds of thousands of users |
| **Coracle** | Client-side WoT: follow-of-follows - muted, used for content filtering | Per-user computation |
| **bitvora/wot-relay** | Relay that archives notes from your personal WoT | Per-instance |
| **bitvora/haven** | Personal relay with WoT whitelisting | Per-instance |
| **noswot** | WoT from follows + reports | Small |
| **DCoSL** | Decentralized reputation protocol inspired by Nostr | Experimental |
| **pls-wot** | Private Law Society WoT | Experimental |
| **ai.wot** | Cross-platform trust attestations via NIP-32 labeling | Emerging |
| **Vertex** | Centralized "batteries included" reputation API (rejects NIP-85) | Unknown |

### The Vertex Critique of NIP-85

Vertex (vertexlab.io) explicitly rejects NIP-85 for two reasons:
1. **Computational cost:** Requires clients to reconstruct follower lists, fetch assertions for each, sort by rank — too expensive for mobile
2. **Discovery problem:** NIP-85 requires knowing pubkeys first; useless for discovering unknown entities

Their alternative: centralized reputation endpoints with personalized rankings in a single request.

**Our take:** Vertex's critique is valid for client-side-only WoT. But it actually supports the model where providers like Vouch and WoT Scoring do the heavy lifting and clients consume the results. The NIP-85 provider model IS the solution to Vertex's objections.

### Block/Jack Dorsey's Approach

Block's engineering team uses NIP-05 (domain-based identifiers) for trust, treating domain association as the trust anchor. They explicitly chose domain trust over peer-reputation (WoT). This is complementary, not competitive — NIP-05 proves "this entity is associated with block.xyz," while WoT proves "this entity is trusted by the network."

---

## 4. L402 Protocol Analysis

### What L402 Is

L402 (formerly LSAT — Lightning Service Authentication Token) is Lightning Labs' protocol for machine-native API authentication via Lightning payments. It leverages HTTP status code 402 ("Payment Required") — the status code that has existed since HTTP/1.1 but was never widely used.

**The flow:**
1. Client hits an API endpoint
2. Server returns HTTP 402 with a Lightning invoice + macaroon
3. Client pays the invoice (automatically if below threshold)
4. Client receives preimage as cryptographic proof of payment
5. Client retransmits request with `<macaroon>:<preimage>` as credential
6. Server verifies both cryptographically — no database lookup needed

**Key technical components:**
- **Macaroons:** Flexible authentication tokens (bearer credentials) with caveats that can restrict access scope
- **Preimage:** 32-byte hash that proves Lightning payment was made
- **Payment hash:** SHA-256(preimage) — included in the macaroon, verified locally

### How L402 Relates to Vouch's NIP-98

| Feature | NIP-98 | L402 |
|---------|--------|------|
| **Auth mechanism** | Signed Nostr event | Macaroon + Lightning preimage |
| **Identity** | Nostr keypair (persistent) | Ephemeral per-payment |
| **Cost** | Free (just sign) | Requires Lightning payment |
| **Verification** | Check Nostr signature | Verify macaroon + preimage hash |
| **State** | Stateless (verify sig) | Stateless (verify hash) |
| **Use case** | "Prove who you are" | "Prove you paid" |
| **Agent suitability** | Excellent (agents have keypairs) | Excellent (agents can pay) |

**They are complementary, not competing.** NIP-98 proves identity. L402 proves payment. Vouch could use NIP-98 for "who are you?" and L402 for "pay for this query." In fact, this is exactly what the WoT API does internally — it uses L402 for payment but could layer NIP-98 on top for identity.

### Lightning Labs Agent Tools (Feb 12, 2026)

Lightning Labs released `lightning-agent-tools` — an open-source toolkit with:
1. **Seven composable skills:** Run node, remote signer, credential management, L402 payment, host paid endpoints, MCP query, buyer/seller orchestration
2. **lnget:** CLI HTTP client that handles L402 payments transparently
3. **Aperture:** L402-aware reverse proxy (convert any API to pay-per-use)
4. **MCP server:** 18 read-only tools for querying node state

**Relevance:** This validates the entire architecture of Lightning micropayments for agent-to-agent commerce. Vouch's Lightning integration (Alby Hub + NWC) is already aligned with this ecosystem.

### L402 for Agent-to-Agent Authentication

L402 is explicitly designed for machine-to-machine auth. Key properties:
- **No accounts:** Payment IS the credential
- **No API keys:** No key management, rotation, or revocation needed
- **Micropayments:** 1-10 sats per request is economically viable
- **Programmatic:** Agents can auto-pay below configurable thresholds
- **Stateless verification:** Distributed systems can verify without centralized databases
- **Scoped access:** Macaroon caveats can restrict by time, IP, endpoint, usage count

---

## 5. Conflict Analysis with Vouch

### Vouch's 6 Dimensions vs. WoT Scoring

| Vouch Dimension | Weight | WoT Overlap | WoT Data Feed Potential |
|-----------------|--------|-------------|------------------------|
| **Performance** (task completion, quality) | 30% | NONE | No — WoT has no task/outcome data |
| **Backing** (sats staked by third parties) | 25% | NONE | No — WoT has no staking concept |
| **Verification** (cross-platform attestations) | 20% | PARTIAL | YES — NIP-05 verification, sybil scores |
| **Tenure** (account age, activity history) | 15% | STRONG | YES — `first_created_at`, timeline, activity |
| **Recency** (recent activity) | 5% | STRONG | YES — decay scores, recent follows, activity |
| **Community** (social connections, follows) | 5% | TOTAL | YES — this IS what WoT measures |

### Does WoT Duplicate Vouch?

**No.** There is minimal overlap in the core value propositions:

- **Vouch's unique value:** Economic staking (Performance 30% + Backing 25% = 55% of score). No other system measures "how much real money backs this agent's reputation." This is the differentiator.
- **WoT's unique value:** Social graph trust derived from Nostr follow/reaction/zap patterns across 52K nodes. This is a data source Vouch cannot replicate without building its own graph crawler.

The overlap exists in Verification (20%), Tenure (15%), Recency (5%), and Community (5%) — totaling 45% of Vouch's score. But even here, WoT provides DIFFERENT signals:
- Vouch Verification = cross-platform attestations (GitHub, domain verification)
- WoT = Nostr-native social proof (follower quality, sybil resistance)
- Vouch Tenure = account age within Vouch system
- WoT = account age across the Nostr network

### Could WoT Data Feed INTO Vouch Dimensions?

**YES — here's the mapping:**

| Vouch Dimension | WoT Endpoint | How It Feeds |
|-----------------|--------------|--------------|
| **Verification** | `/sybil` | Sybil score → verification confidence |
| **Verification** | `/nip05/reverse` | Bidirectional NIP-05 verification |
| **Tenure** | `/timeline` | `first_follow` timestamp, growth velocity |
| **Tenure** | `/decay` | Time-decayed activity score |
| **Recency** | `/score` | Recent engagement metrics |
| **Community** | `/score` | PageRank position, follower count |
| **Community** | `/trust-circle` | Circle size, cohesion, role classification |
| **Community** | `/reputation` | Composite reputation grade (A-F) |

### Philosophical Compatibility

| Aspect | WoT Scoring | Vouch | Compatibility |
|--------|------------|-------|---------------|
| **Trust basis** | Social graph (follows, reactions) | Economic stakes (sats at risk) | COMPLEMENTARY |
| **Sybil resistance** | Graph topology (PageRank dilutes farms) | Economic cost (staking costs real money) | REINFORCING |
| **Identity model** | Nostr pubkeys | Nostr pubkeys | IDENTICAL |
| **Protocol** | NIP-85 assertions | NIP-85 assertions | IDENTICAL |
| **Payment rail** | Lightning (L402) | Lightning (NWC) | ALIGNED |
| **License** | MIT | Unlicensed (pending) | COMPATIBLE for consumption |
| **Openness** | Open data (free export endpoint) | Open scores (NIP-85 events) | ALIGNED |

**Philosophical verdict:** There is ZERO conflict. WoT measures social trust. Vouch measures economic trust. Together they create a more complete picture than either alone. The social graph tells you "this agent is connected and recognized." The economic stakes tell you "someone put money on the line for this agent."

### Centralized Dependency Risk

**Risk level: MODERATE, mitigable.**

wot.klabo.world is currently a single service operated by one developer. This creates:
- **Single point of failure:** If the service goes down, WoT data becomes unavailable
- **Operator dependency:** Joel Klabo is the sole maintainer
- **Score manipulation risk:** As a single provider, there's no cross-validation

**Mitigations:**
1. **Caching:** WoT scores change slowly (6-hour recompute cycle). Cache aggressively.
2. **Graceful degradation:** If WoT is unavailable, Vouch score computes without the WoT component (slightly less informative, not broken)
3. **Multiple providers:** NIP-85's `/compare-providers` endpoint already shows other providers. As the ecosystem grows, pull from multiple sources.
4. **Self-hosted fallback:** wot-scoring is MIT-licensed Go code. Vouch COULD run its own instance if needed.
5. **Graph export:** The `/export` endpoint gives you the full graph for offline analysis.

### Gameability Analysis

**Can WoT scores be gamed?**

Yes, with effort:
- **Follow farming:** Create many accounts that follow target. PageRank mitigates this — farm accounts have low PageRank, so they pass minimal trust.
- **Reciprocal follow rings:** Groups of accounts that follow each other. The `/anomalies` endpoint detects this.
- **Zap manipulation:** Zap yourself from alt accounts. Kind 9735 receipts track this.

**How does gaming affect Vouch?**

If WoT scores feed only into the lower-weight dimensions (Community 5%, Recency 5%, partial Verification 20%), the impact of a gamed WoT score on the overall Vouch score is limited:
- A perfectly gamed WoT input could inflate Community (5% of total Vouch score) — max impact is ~5 points on a 1000-point scale
- Even if it inflated Verification too (20%), the combined max impact is ~25 points
- The dominant Performance (30%) and Backing (25%) dimensions are NOT affected by WoT gaming

**Vouch's economic staking is the antidote.** You can't fake 100,000 sats staked on an agent. The economic and social signals reinforce each other — gaming one without the other creates a detectable anomaly.

### Licensing and Data Ownership

- **wot-scoring:** MIT license (free to use, modify, distribute)
- **WoT API data:** No explicit data license, but the underlying Nostr data is public by nature
- **NIP-85 assertions:** Published as Nostr events — inherently public and permissionless
- **No terms of service** found for the API beyond rate limits

**No licensing risk for consumption.** We'd be making HTTP requests to a public API, same as any other web service. The MIT license on the code means we could even self-host if needed.

---

## 6. Technical Integration Feasibility

### Direct API Integration from Hono on Railway

**Trivially easy.** The WoT API is a standard REST/JSON service with CORS support. Our Hono API on Railway can call it with a simple `fetch()`.

```typescript
// Example: Get WoT score for an agent
const response = await fetch(`https://wot.klabo.world/score?pubkey=${agentHex}`);
const wotData = await response.json();
// Returns: { score, raw_score, followers, post_count, reactions, zap_amount, ... }
```

For paid endpoints, the L402 flow adds complexity:
1. First request returns 402 with Lightning invoice
2. Pay invoice via Alby Hub NWC
3. Retry with `X-Payment-Hash` header

**This is automatable.** Our Alby Hub NWC connection can pay invoices programmatically. The flow would be:

```typescript
async function queryWoT(endpoint: string, params: Record<string, string>) {
  const url = new URL(endpoint, 'https://wot.klabo.world');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  let res = await fetch(url);

  if (res.status === 402) {
    const { invoice } = await res.json();
    const { preimage } = await nwcClient.payInvoice(invoice);
    const paymentHash = sha256(hexToBytes(preimage));

    res = await fetch(url, {
      headers: { 'X-Payment-Hash': paymentHash }
    });
  }

  return res.json();
}
```

### Cost Analysis

**Per-query costs:**

| Endpoint | Cost | When Used |
|----------|------|-----------|
| `/score` | 1 sat | Every score computation |
| `/sybil` | 3 sats | Every score computation (optional) |
| `/reputation` | 5 sats | Comprehensive assessment |
| `/trust-circle` | 5 sats | Deep analysis only |
| `/timeline` | 2 sats | Initial registration only |

**Minimum per-agent cost:** 1 sat (just `/score`)
**Recommended per-agent cost:** 4 sats (`/score` + `/sybil`)
**Comprehensive:** 11 sats (`/score` + `/sybil` + `/reputation` + `/timeline`)

**Cost at scale:**

| Agents | Queries/day | Cost/day | Cost/month |
|--------|-------------|----------|------------|
| 100 | 100 | 400 sats (~$0.40) | 12,000 sats (~$12) |
| 1,000 | 1,000 | 4,000 sats (~$4) | 120,000 sats (~$120) |
| 10,000 | 10,000 | 40,000 sats (~$40) | 1,200,000 sats (~$1,200) |
| 100,000 | 100,000 | 400,000 sats (~$400) | 12,000,000 sats (~$12,000) |

At $100K BTC: 1 sat = ~$0.001. These costs are negligible even at scale.

**Free tier matters:** 50 free requests/day per IP covers development and low-volume production. We'd only start paying at meaningful scale.

### Caching Strategy

WoT scores update on a **6-hour recompute cycle.** This means:

**Recommended caching strategy:**
1. **Cache WoT data per-agent in PostgreSQL** with a `wot_last_fetched` timestamp
2. **TTL: 24 hours** (4x the recompute cycle — conservative)
3. **Refresh on score computation** only if cache is stale
4. **Batch prefetch** during off-peak hours using `/batch` endpoint (10 sats for 100 pubkeys)

```sql
ALTER TABLE agents ADD COLUMN wot_score NUMERIC;
ALTER TABLE agents ADD COLUMN wot_sybil_score NUMERIC;
ALTER TABLE agents ADD COLUMN wot_sybil_class TEXT;
ALTER TABLE agents ADD COLUMN wot_reputation TEXT;
ALTER TABLE agents ADD COLUMN wot_followers INTEGER;
ALTER TABLE agents ADD COLUMN wot_last_fetched TIMESTAMPTZ;
```

**Batch optimization:** The `/batch` endpoint scores 100 pubkeys for 10 sats (0.1 sats/pubkey). Daily batch refresh of all registered agents is the most cost-effective approach.

### Build-Time vs. Runtime Integration

| Strategy | When | Cost | Freshness |
|----------|------|------|-----------|
| **Build-time** (batch cron) | Every 24h | Lowest (batch pricing) | 24h stale max |
| **Runtime** (on demand) | Per score request | Higher (individual pricing) | Always fresh |
| **Hybrid** (recommended) | Batch + on-miss | Moderate | 24h typical, fresh on new agents |

**Recommendation: Hybrid.** Run a daily batch job to refresh all cached WoT data. If a score is requested for an agent with no cache (new registration), query in real-time and cache.

### WebSocket Integration

The free `WS /ws/scores` endpoint provides real-time score updates. This could feed a live dashboard showing agent trust scores changing in real-time. Low priority but interesting for the Vouch UI.

---

## 7. Risk Assessment

### Risk Matrix

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| WoT service goes down | Medium | Low | Cache + graceful degradation |
| Joel Klabo abandons project | Medium | Low | MIT code, self-host fallback |
| WoT scores gamed at scale | Low | Medium | WoT affects only 5-25% of Vouch score |
| L402 payment failures | Low | Low | Retry logic + free tier |
| API rate limiting | Low | Low | Caching reduces request volume |
| NIP-85 spec changes | Medium | Low | Both Vouch and WoT track the spec |
| Nostr graph fragmentation | Medium | Medium | Multiple relay sources |
| Cost growth at scale | Low | Medium | Batch optimization, self-host option |
| Data quality issues | Medium | Medium | Cross-validate with own signals |
| Privacy concerns (querying scores reveals interest) | Low | Medium | Batch queries obscure individual interest |

### Strategic Risk

**WoT Scoring becoming a competitor:** Unlikely. WoT Scoring measures social trust. Vouch measures economic trust. They serve different purposes and are designed to be complementary. Joel Klabo's project is a NIP-85 infrastructure provider, not a staking/accountability platform.

**WoT Scoring being absorbed by a larger player:** Possible but manageable. If Primal, Damus, or another major client builds their own WoT scoring, wot.klabo.world might become redundant. But NIP-85's multi-provider design means Vouch can switch providers trivially.

---

## 8. Recommendations

### Integration Tier: SHOULD INTEGRATE (Medium Priority)

WoT data would meaningfully improve Vouch's Verification and Community dimensions without any philosophical conflicts. The cost is negligible, the technical integration is trivial, and the dependency risk is well-mitigated.

### Recommended Integration Architecture

```
┌─────────────────────────────────────────────────┐
│               Vouch Score Engine                 │
│                                                  │
│  Performance (30%)  ◄── Task outcomes, ratings   │
│  Backing (25%)      ◄── Staked sats              │
│  Verification (20%) ◄── NIP-05, GitHub, +WoT     │
│  Tenure (15%)       ◄── Registration age, +WoT   │
│  Recency (5%)       ◄── Recent activity, +WoT    │
│  Community (5%)     ◄── Follows, +WoT            │
│                                                  │
│  WoT inputs marked with + above                 │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   WoT Data Cache   │
         │   (PostgreSQL)     │
         │   TTL: 24 hours    │
         └─────────┬──────────┘
                   │
    ┌──────────────▼──────────────┐
    │  Daily Batch Refresh Job    │
    │  POST /batch (10 sats/100)  │
    │  GET /sybil on flagged      │
    └──────────────┬──────────────┘
                   │
         ┌─────────▼──────────┐
         │  wot.klabo.world   │
         │  (L402 payment)    │
         └────────────────────┘
```

### Specific WoT Inputs to Vouch Dimensions

1. **Verification (20% of score):** Add WoT sybil score as a sub-signal (suggested weight: 15-20% of the Verification dimension, i.e., 3-4% of total score). A `likely_sybil` classification should flag for manual review.

2. **Community (5% of score):** Replace or supplement current follow-count metric with WoT PageRank score. PageRank is strictly superior to raw follower count because it's sybil-resistant.

3. **Tenure (15% of score):** Use WoT's `first_created_at` and `/timeline` data to corroborate Vouch registration age. An agent that registered on Vouch yesterday but has 6 months of Nostr history gets partial tenure credit.

4. **Recency (5% of score):** Use WoT's engagement metrics (post_count, reactions, zap_amount) to supplement Vouch's internal activity tracking.

### Implementation Phases

**Phase 1: Read-only consumption (1-2 days)**
- Add WoT cache columns to agents table
- Build WoT client service with L402 auto-payment
- Fetch `/score` for all registered agents
- Display WoT data in agent profile (informational only)

**Phase 2: Score integration (2-3 days)**
- Wire WoT data into Vouch Score computation
- Add sybil check on agent registration
- Set up daily batch refresh cron job

**Phase 3: Deep integration (future)**
- Cross-provider NIP-85 comparison
- Trust path visualization in Vouch UI
- Real-time WebSocket score monitoring
- Self-hosted wot-scoring fallback instance

### What NOT to Do

1. **Don't make WoT score a hard requirement.** Many agents (especially new ones) won't have significant Nostr history. WoT should enrich, not gate.
2. **Don't weight WoT too heavily.** The economic dimensions (Performance + Backing = 55%) are Vouch's differentiation. Don't dilute them.
3. **Don't build your own graph crawler.** WoT Scoring already does this well. Focus Vouch's resources on the economic trust layer.
4. **Don't rely solely on wot.klabo.world.** Cache aggressively, degrade gracefully, plan for self-hosting.
5. **Don't publicize the integration as "powered by MaximumSats."** It's "enhanced with NIP-85 social trust signals." The provider should be swappable.

### Outreach to Joel Klabo

**Worth doing.** A direct conversation could:
- Clarify d3p/Vibeyard questions
- Negotiate bulk pricing for high-volume access
- Explore bidirectional integration (WoT showing Vouch economic scores)
- Discuss shared NIP-85 provider standards
- Potential WoT-a-thon collaboration

**Contact:** @joelklabo on X/Nostr, max@klabo.world

---

## Appendix A: NIP-85 Kind 30382 Tag Reference

```json
{
  "kind": 30382,
  "tags": [
    ["d", "<subject_pubkey>"],
    ["rank", "85"],
    ["followers", "1234"],
    ["first_created_at", "1640000000"],
    ["post_cnt", "567"],
    ["reply_cnt", "234"],
    ["reactions_cnt", "890"],
    ["zap_amt_recd", "50000"],
    ["zap_amt_sent", "25000"],
    ["zap_cnt_recd", "45"],
    ["zap_cnt_sent", "30"],
    ["reports_cnt_recd", "0"],
    ["reports_cnt_sent", "2"],
    ["t", "bitcoin"],
    ["t", "nostr"],
    ["active_hours_start", "14"],
    ["active_hours_end", "22"]
  ]
}
```

## Appendix B: L402 Authentication Header Format

```
Authorization: L402 <base64_macaroon>:<hex_preimage>
```

Or via header:
```
X-Payment-Hash: <hex_payment_hash>
```

## Appendix C: Key URLs

| Resource | URL |
|----------|-----|
| MaximumSats MCP | github.com/joelklabo/maximumsats-mcp |
| WoT Scoring repo | github.com/joelklabo/wot-scoring |
| WoT API docs | wot.klabo.world/docs |
| WoT Swagger | wot.klabo.world/swagger |
| WoT Demo | wot.klabo.world/demo |
| WoT OpenAPI spec | wot.klabo.world/openapi.json |
| NIP-85 spec | github.com/nostr-protocol/nips/blob/master/85.md |
| Lightning Agent Tools | github.com/lightninglabs/lightning-agent-tools |
| L402 spec | github.com/lightninglabs/L402 |
| L402 docs | docs.l402.org |
| WoT-a-thon | nosfabrica.com/wotathon |
| Joel Klabo | klabo.world, @joelklabo |

## Appendix D: Sources

- [MaximumSats MCP GitHub](https://github.com/joelklabo/maximumsats-mcp)
- [WoT Scoring API Docs](https://wot.klabo.world/docs)
- [Glama MCP Directory](https://glama.ai/mcp/servers/@joelklabo/maximumsats-mcp)
- [NIP-85 Specification](https://github.com/nostr-protocol/nips/blob/master/85.md)
- [Lightning Labs Agent Tools](https://github.com/lightninglabs/lightning-agent-tools)
- [Lightning Labs Blog: Agents Want to Transact](https://lightning.engineering/posts/2026-02-11-ln-agent-tools/)
- [L402 Protocol Specification](https://github.com/lightninglabs/L402)
- [L402 Documentation](https://docs.l402.org/)
- [Vertex: Why We Don't Use NIP-85](https://vertexlab.io/blog/dvms_vs_nip_85/)
- [Block: Trust in Nostr NIP-05](https://engineering.block.xyz/blog/trust-in-nostr-nip-05-identifiers)
- [WoT-a-thon Hackathon](https://nosfabrica.com/wotathon)
- [bitvora/wot-relay](https://github.com/bitvora/wot-relay)
- [Nostr.Band Trust Rank](https://trust.nostr.band/)
- [DCoSL Protocol](https://github.com/wds4/DCoSL)
- [klabo.world](https://www.klabo.world/)
- [Apify MaximumSats](https://apify.com/maximumsats/maximumsats-mcp/api)
- [Stacker News: WoT Thoughts](https://stacker.news/items/477386)

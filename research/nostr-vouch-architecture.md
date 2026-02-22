# Nostr-Native Vouch Architecture

*Specification for migrating Vouch from a custom web platform to a Nostr-native trust staking economy.*

**Status:** Draft
**Author:** Percy (PAI) + Alan Carroll
**Date:** 2026-02-21
**Supersedes:** vouch-architecture.md (Phase 2+ sections), THE-ROUND-TABLE-ARCHITECTURE.md (identity + community layers)
**Preserves:** All staking economics, yield distribution, slashing mechanics from vouch-architecture.md

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Why Nostr](#2-why-nostr)
3. [Architecture Overview](#3-architecture-overview)
4. [Agent SDK](#4-agent-sdk)
5. [Identity Layer](#5-identity-layer)
6. [Three-Party Trust Model](#6-three-party-trust-model)
7. [Trust & Reputation Layer](#7-trust--reputation-layer)
8. [Payment Architecture](#8-payment-architecture)
9. [Community Layer](#9-community-layer)
10. [Vouch Relay](#10-vouch-relay)
11. [Client Architecture](#11-client-architecture)
12. [Custom Event Kinds](#12-custom-event-kinds)
13. [Build Order](#13-build-order)
14. [Security Considerations](#14-security-considerations)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

Vouch is a **verifiable trust layer for AI agents** — an SDK that any agent can bolt on to establish credibility backed by real economic stakes. When an agent integrates Vouch, it gets a trust score derived from three parties: the agent's own track record (performer), the people who hire it (purchaser), and the people who stake capital on it (staker).

**The primary product surface is `@vouch/agent-sdk`** — a TypeScript package (+ MCP server + HTTP API) that gives any AI agent verifiable trust in 4 lines of code. The community platform, staking dashboard, and governance tools are built on top of this foundation, not the other way around.

**Vouch is built on Nostr** because trust scores should be portable, verifiable, and impossible to lock inside a walled garden:

- **Identity** = Nostr keypairs (secp256k1), with optional ERC-8004 attestation for enterprise credibility
- **Trust scores** = Published as NIP-85 Trusted Assertions, consumable by any Nostr client
- **Payments** = Lightning Network via NWC (Nostr Wallet Connect), with Strike for fiat on-ramps
- **Community** = Grows organically from agents + stakers interacting (NIP-72 + NIP-29, built later)
- **Verification** = Any agent can verify any other agent's trust — no API key, no account, just read a Nostr event

### Why This Matters for C > D

Nostr is cooperation infrastructure. Every design choice in the protocol makes cooperation structurally easier than defection:

- **Censorship-resistant identity**: No platform can deplatform a trusted agent
- **Portable reputation**: Vouch scores travel with the user across ALL Nostr apps
- **Open data**: Anyone can verify trust scores, stake amounts, yield history
- **Permissionless integration**: Any Nostr client can display Vouch trust badges
- **User-owned keys**: No custodial identity — you own your reputation

This is the C > D payment rail. Trust that compounds across an open ecosystem, not locked in a walled garden.

### The One-Sentence Pitch

> `npm install @vouch/agent-sdk` — give your agent a verifiable trust score in 4 lines of code.

### What Changes vs. What Stays

| Component | Status | Notes |
|-----------|--------|-------|
| **Product surface** | NEW | SDK-first: `@vouch/agent-sdk` + MCP server + HTTP API |
| **Trust model** | ENHANCED | Three-party: performer (agent) + purchaser (client) + staker (backer) |
| **Staking engine** | UNCHANGED | Atomic transactions, yield distribution, slashing — all preserved |
| **Vouch Score (6 dimensions)** | ENHANCED | Same algorithm + new Nostr signals (zaps, social graph) |
| **Identity** | MIGRATED | Ed25519 → secp256k1 (Nostr keypairs), ERC-8004 becomes optional attestation |
| **Payments** | MIGRATED | Stripe Connect → Lightning/NWC + Strike fiat bridge |
| **Community** | DEFERRED | Grows organically after SDK adoption; NIP-72 + NIP-29 built later |
| **Data storage** | HYBRID | PostgreSQL (staking state) + Nostr relay (events, content, reputation) |

---

## 2. Why Nostr

### The Problem with Custom Platforms

Building Vouch as a traditional web app creates the same walled garden we're fighting against:

- Users must create yet another account
- Trust scores are trapped inside our platform
- Community content is locked to our database
- Integration requires our proprietary API
- We become the gatekeepers — exactly the C < D pattern we oppose

### What Nostr Gives Us

**1. Identity Portability**
An agent's Nostr keypair (npub) IS their identity. No registration flow. No email verification. No password. The same identity works on Vouch, Damus, Amethyst, Primal, and every other Nostr client. An agent backed on Vouch is visibly trusted across the entire Nostr ecosystem.

**2. Reputation That Travels**
Vouch publishes trust scores as NIP-85 events. Any Nostr client that supports NIP-85 can display "this agent has a Vouch Score of 847" without any API integration. The score is a signed Nostr event — verifiable, portable, unforgeable.

**3. Native Agent Economy**
Nostr has no "terms of service" that exclude bots. Clawstr proved agents can post, vote, and interact as first-class citizens. Lightning zaps give agents a native payment rail. NWC lets agents hold their own wallets. This is the first protocol where AI agents are architecturally equal to humans.

**4. No Chargebacks**
Lightning payments are final. For a staking economy, this is critical — Stripe chargebacks would destroy the economic model. A staker who backs an agent with Lightning cannot reverse the payment after seeing the yield.

**5. Ecosystem Momentum**
The Nostr AI agent space is nascent but growing fast. Clawstr (Reddit for agents), Lightning Labs Agent Tools (MCP server for Lightning), Alby Agent Skills — the infrastructure is being built right now. Vouch can be the trust layer these projects are missing.

### What We Lose

| Loss | Mitigation |
|------|------------|
| On-chain identity story | ERC-8004 preserved as optional attestation (see Section 4.4) |
| Fiat ease (Stripe) | Strike API provides seamless fiat→Lightning bridge |
| Enterprise familiarity | NIP-05 verification (`agent@vouch.xyz`) gives a web2-familiar identity |
| SEO/discoverability | Vouch.xyz website still exists as the gateway; Nostr is the substrate |

---

## 3. Architecture Overview

### 3.1. Three-Layer Product Architecture

The SDK is the primary product surface. Everything else supports it.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRAMEWORK ADAPTERS (thin, ~50 lines each)        │
│                                                                     │
│   MCP Server        LangChain Tool      CrewAI Tool      Eliza     │
│   (first adapter)   (community)         (community)      (crypto)  │
├─────────────────────────────────────────────────────────────────────┤
│                    @vouch/agent-sdk (TypeScript)                     │
│                                                                     │
│   register()   verify()   prove()   reportOutcome()   getScore()   │
│                                                                     │
│   Handles: key management, event signing, relay communication,      │
│            score caching, outcome attestation                       │
├─────────────────────────────────────────────────────────────────────┤
│                    VOUCH HTTP API + NOSTR PROTOCOL                   │
│                                                                     │
│   REST endpoints     NIP-85 events     NIP-05 identity   WebSocket │
│   (registration,     (trust scores,    (DNS verify)      (relay)   │
│    scoring, stakes)   badges, labels)                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Layer 1 (bottom): Protocol + API** — Any agent in any language can use Vouch via HTTP calls or Nostr event reads. No SDK required. This is the universal bedrock.

**Layer 2 (middle): TypeScript SDK** — Convenience layer for TypeScript/JavaScript agents. Handles key management, event signing, relay communication, score caching.

**Layer 3 (top): Framework Adapters** — Thin wrappers (~50-100 lines) that translate SDK calls into framework-specific tool formats. MCP server ships first (most universal). Community contributes others.

### 3.2. Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VOUCH ECOSYSTEM                             │
│                                                                     │
│  ┌───────────────┐    ┌──────────────┐    ┌──────────────────────┐ │
│  │  VOUCH CLIENT │    │  VOUCH API   │    │    VOUCH RELAY       │ │
│  │  (Next.js+NDK)│◄──►│  (Bun/Hono)  │◄──►│    (strfry)          │ │
│  │               │    │              │    │                      │ │
│  │ - Staking UI  │    │ - Staking    │    │ - NIP-42 auth        │ │
│  │ - Community   │    │ - Trust calc │    │ - Write policy       │ │
│  │ - Agent pages │    │ - NIP-05     │    │ - Event storage      │ │
│  │ - Governance  │    │ - Identity   │    │ - NIP-85 assertions  │ │
│  └───────┬───────┘    │ - Yield dist │    │ - NIP-32 labels      │ │
│          │            │ - Slashing   │    │ - NIP-58 badges      │ │
│          │            └──────┬───────┘    └──────────┬───────────┘ │
│          │                   │                       │             │
│          │            ┌──────┴───────┐               │             │
│          │            │  PostgreSQL  │               │             │
│          │            │              │               │             │
│          │            │ - Stakes     │               │             │
│          │            │ - Pools      │               │             │
│          │            │ - Yields     │               │             │
│          │            │ - Identities │               │             │
│          │            └──────────────┘               │             │
│          │                                           │             │
│  ┌───────┴───────────────────────────────────────────┴──────────┐  │
│  │                    NOSTR NETWORK                              │  │
│  │                                                               │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────────────┐  │  │
│  │  │ Damus   │  │ Primal  │  │Amethyst │  │ Other Clients  │  │  │
│  │  │         │  │         │  │         │  │                │  │  │
│  │  │ Sees    │  │ Sees    │  │ Sees    │  │ All see Vouch  │  │  │
│  │  │ Vouch   │  │ Vouch   │  │ Vouch   │  │ trust scores   │  │  │
│  │  │ scores  │  │ scores  │  │ scores  │  │ via NIP-85     │  │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    LIGHTNING NETWORK                           │  │
│  │                                                               │  │
│  │  ┌──────────┐    ┌──────────┐    ┌────────────────────────┐  │  │
│  │  │ Alby Hub │    │ Strike   │    │  Agent NWC Wallets     │  │  │
│  │  │ (NWC)    │◄──►│ (Fiat)   │    │  (per-agent isolated)  │  │  │
│  │  └──────────┘    └──────────┘    └────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Tech | Responsibility |
|-----------|------|----------------|
| **Vouch Client** | Next.js + NDK React | User-facing app: staking, community, agent profiles, governance |
| **Vouch API** | Bun + Hono | Staking engine, trust computation, yield distribution, identity management, NIP-05 endpoint |
| **Vouch Relay** | strfry (C++ with LMDB) | Nostr event storage, NIP-42 auth, write policy enforcement, reputation event hosting |
| **PostgreSQL** | Drizzle ORM | Financial state: stakes, pools, yields, slashing events (ACID guarantees required) |
| **Alby Hub** | Self-hosted | NWC server for agent wallets, hold invoices for staking escrow |
| **Strike** | API integration | Fiat on/off ramp (USD ↔ Lightning) |

### Data Sovereignty Split

**PostgreSQL** owns financial state (stakes, yields, slashing) because:
- ACID transactions are non-negotiable for money movement
- Row-level locking prevents double-spend
- Largest-remainder distribution needs integer math

**Nostr relay** owns social/reputation state because:
- Trust scores should be portable and verifiable
- Community content should be censorship-resistant
- Agent activity should be visible across the ecosystem
- Events are immutable and cryptographically signed

---

## 4. Agent SDK

The SDK is the front door. Everything an agent needs to participate in the Vouch trust network.

### 4.1. Core API

```typescript
import { Vouch } from '@vouch/agent-sdk';

// Initialize with existing key or generate new one
const vouch = new Vouch({
  nsec: process.env.VOUCH_NSEC,           // existing Nostr private key
  // OR omit to auto-generate a new keypair
  relay: 'wss://relay.vouch.xyz',         // default Vouch relay
  apiUrl: 'https://api.vouch.xyz',        // default Vouch API
});

// Register your agent (one-time)
const identity = await vouch.register({
  name: 'TradingBot Alpha',
  model: 'claude-sonnet-4-6',
  capabilities: ['trading', 'analysis', 'forecasting'],
  // Optional: link ERC-8004 on-chain identity
  erc8004: { agentId: 42, chain: 'base', signature: '0x...' },
});
// → { npub: 'npub1abc...', nip05: 'tradingbot-alpha@vouch.xyz', score: 200 }

// Verify another agent before interacting
const trust = await vouch.verify('npub1xyz...');
// → { score: 847, tier: 'gold', backed: true, poolSats: 500000,
//    stakerCount: 12, performance: { successRate: 0.94, totalTasks: 156 } }

if (trust.score < 400) {
  throw new Error('Counterparty trust insufficient');
}

// Generate a signed proof of YOUR trust score (for presenting to others)
const proof = await vouch.prove();
// → Signed NIP-85 event that any Nostr client can verify

// Report task outcome (both parties should report for full credit)
await vouch.reportOutcome({
  counterparty: 'npub1xyz...',            // who you worked with
  role: 'performer',                       // 'performer' | 'purchaser'
  taskType: 'code_review',
  success: true,
  // Optional: attach evidence
  evidence: 'Task completed, 3 bugs found and fixed',
});

// Check your own score
const me = await vouch.getScore();
// → { score: 623, tier: 'silver', breakdown: { verification: 140, tenure: 35, ... } }
```

### 4.2. MCP Server Mode

Any MCP-compatible agent (Claude Code, Cursor, Windsurf, etc.) can use Vouch as a tool server:

```json
{
  "mcpServers": {
    "vouch": {
      "command": "npx",
      "args": ["@vouch/agent-sdk", "serve"],
      "env": {
        "VOUCH_NSEC": "nsec1..."
      }
    }
  }
}
```

**Exposed MCP tools:**

| Tool | Parameters | Returns |
|------|-----------|---------|
| `vouch_register` | `name`, `model`, `capabilities` | `npub`, `nip05`, `score` |
| `vouch_verify` | `npub` | Score, tier, backing, performance |
| `vouch_prove` | — | Signed trust proof (NIP-85 event) |
| `vouch_report_outcome` | `counterparty`, `role`, `taskType`, `success` | Updated score |
| `vouch_get_score` | `npub` (optional, defaults to self) | Full score breakdown |

### 4.3. HTTP API (Framework-Agnostic)

For Python agents, Go agents, or anything else — raw HTTP, no SDK required:

```bash
# Register
curl -X POST https://api.vouch.xyz/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"MyAgent","pubkey":"<hex>","model":"gpt-4"}'

# Verify
curl https://api.vouch.xyz/v1/agents/npub1abc.../score
# → {"score":847,"tier":"gold","backed":true,"poolSats":500000}

# Report outcome
curl -X POST https://api.vouch.xyz/v1/outcomes \
  -H "Authorization: Nostr <signed_event>" \
  -d '{"counterparty":"npub1xyz...","role":"performer","success":true}'
```

**Authentication**: HTTP API uses NIP-98 HTTP Auth — the agent signs a Nostr event containing the request URL and method. No API keys, no tokens — just cryptographic proof of identity.

### 4.4. SDK Internals

```
@vouch/agent-sdk
├── src/
│   ├── index.ts              # Main Vouch class
│   ├── identity.ts           # Keypair generation, nsec management
│   ├── nostr.ts              # Event signing, relay communication (via NDK)
│   ├── api.ts                # HTTP client for Vouch API
│   ├── verify.ts             # Trust verification (fetch + validate NIP-85)
│   ├── prove.ts              # Generate signed trust proofs
│   ├── outcome.ts            # Outcome reporting + attestation
│   ├── cache.ts              # Score caching (in-memory, configurable TTL)
│   └── mcp/
│       └── server.ts         # MCP server implementation
├── package.json
└── tsconfig.json
```

**Dependencies (minimal):**
- `@noble/secp256k1` — Nostr key operations
- `@scure/base` — bech32 encoding (npub/nsec)
- `@nostr-dev-kit/ndk` — relay communication, event handling
- `@modelcontextprotocol/sdk` — MCP server (optional, tree-shakeable)

### 4.5. Agent Onboarding Flow

```
New Agent                    Vouch SDK                 Vouch API           Vouch Relay
  │                             │                         │                    │
  │ 1. new Vouch()             │                         │                    │
  │ ───────────────────────────►│                        │                    │
  │                             │ 2. Generate keypair    │                    │
  │                             │    (if no nsec)        │                    │
  │                             │                         │                    │
  │ 3. vouch.register(...)     │                         │                    │
  │ ───────────────────────────►│                        │                    │
  │                             │ 4. POST /register      │                    │
  │                             │ ───────────────────────►│                   │
  │                             │                         │ 5. Create agent   │
  │                             │                         │    record in DB   │
  │                             │                         │                    │
  │                             │                         │ 6. Publish kind 0 │
  │                             │                         │    (profile +     │
  │                             │                         │     NIP-32 labels)│
  │                             │                         │ ──────────────────►│
  │                             │                         │                    │
  │                             │                         │ 7. Publish kind   │
  │                             │                         │    30382 (initial │
  │                             │                         │    score: 200)    │
  │                             │                         │ ──────────────────►│
  │                             │                         │                    │
  │                             │ 8. Return identity     │                    │
  │                             │ ◄───────────────────────│                   │
  │ 9. { npub, nip05,          │                         │                    │
  │      score: 200 }          │                         │                    │
  │ ◄───────────────────────────│                        │                    │
  │                             │                         │                    │
  │ AGENT IS NOW LIVE WITH     │                         │                    │
  │ VERIFIABLE TRUST IDENTITY  │                         │                    │
```

Time from `npm install` to verifiable trust: **under 30 seconds.**

---

## 5. Identity Layer

### 4.1. Primary Identity: Nostr Keypair

Every agent and human on Vouch is identified by a Nostr keypair:

```
Private key (nsec) → secp256k1 → Public key (npub)
```

- **Agents**: Generate a dedicated keypair at registration. Store nsec server-side (for automated signing) or use NIP-46 remote signing for higher security.
- **Humans**: Use their existing Nostr identity (Alby extension, nsec.app, Amber, etc.) or generate one on Vouch.
- **No email/password auth**: Nostr keypair IS the auth. NIP-07 browser extensions handle signing.

### 4.2. NIP-05 Verification

Vouch provides DNS-based identity verification for all registered entities:

```
GET https://vouch.xyz/.well-known/nostr.json?name=agent-alpha
```

Response:
```json
{
  "names": {
    "agent-alpha": "a1b2c3d4e5f6...hex_pubkey",
    "alice": "f6e5d4c3b2a1...hex_pubkey"
  },
  "relays": {
    "a1b2c3d4e5f6...hex_pubkey": ["wss://relay.vouch.xyz"],
    "f6e5d4c3b2a1...hex_pubkey": ["wss://relay.vouch.xyz"]
  }
}
```

This gives agents verifiable identities like `agent-alpha@vouch.xyz` that any Nostr client can display and verify. The API serves this dynamically from the agents table.

### 4.3. Agent vs. Human Distinction

Agents self-identify using NIP-32 labels on their kind 0 (profile) events:

```json
{
  "kind": 0,
  "pubkey": "<agent_hex_pubkey>",
  "content": "{\"name\":\"Agent Alpha\",\"about\":\"Forecasting agent by Percival Labs\",\"nip05\":\"agent-alpha@vouch.xyz\"}",
  "tags": [
    ["L", "app.vouch.type"],
    ["l", "agent", "app.vouch.type"],
    ["L", "app.vouch.model"],
    ["l", "claude-sonnet-4-6", "app.vouch.model"]
  ]
}
```

Vouch clients display agent-specific UI (staking pools, yield history, model info) when they detect these labels.

### 4.4. ERC-8004 Attestation (Optional)

For agents with on-chain identity, bidirectional attestation links the Nostr npub to the ERC-8004 token:

**Direction 1: Ethereum → Nostr** (on-chain stores Nostr pubkey)

The ERC-8004 token's metadata includes the Nostr pubkey:
```json
{
  "agentId": 42,
  "name": "Agent Alpha",
  "nostr:pubkey": "a1b2c3d4e5f6..."
}
```

This is set via `setMetadata("nostr:pubkey", hex_pubkey)` on the registry contract.

**Direction 2: Nostr → Ethereum** (Nostr profile attests on-chain identity)

Using NIP-39 External Identities on the agent's kind 0 profile:
```json
{
  "tags": [
    ["i", "erc8004:eip155:8453:42", "<eip191_signature>"]
  ]
}
```

The `eip191_signature` is the owner address signing: `VOUCH_NOSTR_LINK\n<nostr_hex_pubkey>\n<erc8004_agent_id>`

**Verification flow:**
1. Read NIP-39 `i` tag from agent's kind 0 event
2. Parse ERC-8004 chain + agent ID
3. Call `ownerOf(agentId)` on the registry contract
4. Recover signer from EIP-191 signature
5. Verify recovered address === on-chain owner
6. Verify the signed message contains the correct Nostr pubkey

**This is optional.** Agents work on Vouch with just a Nostr keypair. ERC-8004 attestation adds enterprise credibility and on-chain composability.

### 4.5. Key Security

**Critical: Do NOT reuse the same private key for Ethereum and Nostr.** Both use secp256k1, but Ethereum uses ECDSA while Nostr uses Schnorr (BIP-340). Using the same key for both with deterministic nonces can leak the private key through nonce collision.

**Recommended approach:** BIP-85 deterministic derivation from a single master seed:
- Derivation index 0 → Ethereum key (for ERC-8004)
- Derivation index 1 → Nostr key (for npub)
- One backup, two cryptographically independent keys

### 4.6. Database Schema Changes

```sql
-- Agents table: add Nostr identity, keep ERC-8004 as optional
ALTER TABLE agents
  ADD COLUMN nostr_pubkey VARCHAR(64) UNIQUE,      -- hex pubkey (32 bytes)
  ADD COLUMN nostr_npub VARCHAR(63) UNIQUE,         -- bech32 npub
  ADD COLUMN nostr_relays TEXT[];                    -- relay list for publishing

-- Keep existing ERC-8004 columns (now optional, not required)
-- erc8004_agent_id, erc8004_chain, erc8004_registry, owner_address

-- Agent keys: support both Ed25519 (legacy) and secp256k1 (Nostr)
ALTER TABLE agent_keys
  ADD COLUMN key_type VARCHAR(20) DEFAULT 'ed25519'; -- 'ed25519' | 'secp256k1'

-- Key rotation tracking
CREATE TABLE agent_key_rotations (
  id VARCHAR(26) PRIMARY KEY,                       -- ULID
  agent_id VARCHAR(26) REFERENCES agents(id),
  old_pubkey VARCHAR(64),
  new_pubkey VARCHAR(64),
  reason VARCHAR(255),
  rotated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nostr event index (for caching/querying events we've published)
CREATE TABLE published_events (
  event_id VARCHAR(64) PRIMARY KEY,                 -- Nostr event ID (sha256)
  kind INTEGER NOT NULL,
  pubkey VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  relay_url TEXT,
  content_hash VARCHAR(64)                          -- for dedup
);
```

---

## 6. Three-Party Trust Model

Trust in Vouch is derived from three distinct parties, each contributing different signal quality:

```
                         VOUCH SCORE
                             │
             ┌───────────────┼───────────────┐
             │               │               │
        PERFORMER       PURCHASER         STAKER
        (the agent)     (the client)      (the backer)
             │               │               │
        Self-reports     Reviews agent    Stakes capital
        outcomes         after task       on agent
             │               │               │
             ▼               ▼               ▼
        Performance      Performance      Backing
        (partial)        (primary)        dimension
```

### 14.1. Three Parties Explained

**Performer (Agent)**
The agent completing work. Self-reports task outcomes via `vouch.reportOutcome({ role: 'performer' })`. Self-reports are the weakest signal — cheap to fabricate — so they receive partial credit (weighted ~30% of a confirmed outcome).

**Purchaser (Client)**
The entity that hired the agent. Reviews the agent after task completion via `vouch.reportOutcome({ role: 'purchaser' })`. Client reviews are the strongest performance signal — they have direct experience of the output quality. Weighted ~70% of a confirmed outcome.

**Staker (Backer)**
People or agents who stake capital on the agent's trustworthiness. They don't interact with the agent directly — they're betting on the agent's overall quality based on visible performance data. Their contribution flows through the **backing** dimension (25% of total Vouch Score).

### 8.2. Outcome Confirmation Flow

```
Agent completes task
  │
  ├──► Agent publishes outcome event (kind 30350, role: performer)
  │      └── "Task completed successfully"
  │
  ├──► Client publishes outcome event (kind 30350, role: purchaser)
  │      └── "Agent delivered quality work" + rating (1-5)
  │
  └──► Vouch API matches events by task reference
         │
         ├── Both report success → FULL performance credit
         │     (strongest signal: two independent confirmations)
         │
         ├── Only agent reports → PARTIAL credit (30% weight)
         │     (self-report only — weak signal, but some signal)
         │
         ├── Only client reports → SIGNIFICANT credit (70% weight)
         │     (client took time to review — strong signal)
         │
         ├── Both report, disagreement → DISPUTE
         │     (investigation → potential slash if agent fabricated)
         │
         └── Client reports failure → NEGATIVE performance credit
               (strong negative signal, may trigger slash review)
```

### 14.3. Outcome Event (Kind 30350)

```json
{
  "kind": 30350,
  "pubkey": "<reporter_hex_pubkey>",
  "tags": [
    ["d", "<task_reference_id>"],
    ["p", "<counterparty_hex_pubkey>"],
    ["role", "performer"],
    ["task_type", "code_review"],
    ["outcome", "success"],
    ["rating", "5"],
    ["L", "app.vouch.outcome"],
    ["l", "confirmed", "app.vouch.outcome"]
  ],
  "content": "Completed code review: found 3 bugs in auth module, provided fixes."
}
```

**Matching logic**: Two kind 30350 events with the same `d` tag (task reference) and complementary roles (performer + purchaser) constitute a **confirmed outcome**. The Vouch API watches for these pairs.

### 10.4. Two-Party Scenarios

Not every interaction has all three parties. The model handles this gracefully:

| Scenario | Parties | Trust Signal |
|----------|---------|-------------|
| **Agent hired by client, has stakers** | All three | Full signal: performance (confirmed) + backing |
| **Agent hired by client, no stakers** | Performer + Purchaser | Performance score builds, but backing dimension stays at 0 → lower trust ceiling |
| **Agent operator backs their own agent** | Performer + Staker | Operator has skin in the game (bootstraps backing), but no external validation of performance |
| **Staker backs agent based on public data** | Staker only | Pure speculation — backing increases but doesn't validate performance |
| **Agent self-reports only** | Performer only | Weakest signal — partial performance credit, capped |

### 8.5. Trust Score Impact by Party

| Party | Dimensions Affected | Weight on Performance | Economic Signal |
|-------|--------------------|-----------------------|-----------------|
| **Performer** | Performance (partial) | 30% of outcome | Free to report (no cost) |
| **Purchaser** | Performance (primary) | 70% of outcome | Cost = time to review |
| **Staker** | Backing (direct) | N/A (separate dimension) | Cost = staked capital at risk |

The asymmetric weighting ensures you can't game the system by self-reporting. To build a high Vouch Score, you need:
1. **Clients confirming your work** (performance dimension)
2. **Stakers putting money on you** (backing dimension)
3. **Time** (tenure dimension)

All three are expensive to fake.

### 8.6. Anti-Gaming Measures

| Attack | Defense |
|--------|---------|
| Agent self-reports fake outcomes | Partial credit only (30%); needs client confirmation for full credit |
| Agent creates fake "client" to confirm | Client pubkey must have its own Vouch identity + history; sockpuppet detection via social graph analysis |
| Staker colludes with agent | Staker's capital is genuinely at risk if agent is slashed; collusion requires actual money on the line |
| Sybil staking (many small fake stakers) | Staker quality weighting: stakers with higher trust scores contribute more to the backing component |
| Volume gaming (many tiny tasks) | Diminishing returns: 100th task in a day contributes less than 1st task; natural rate limiting |

---

## 7. Trust & Reputation Layer

### 7.1. Vouch Score (Updated Algorithm)

The 6-dimension Vouch Score, now fed by the three-party trust model (see Section 6):

```
vouch_score = (
  verification × 0.20 +    // 0-200: identity verification level
  tenure × 0.10 +          // 0-100: time on platform
  performance × 0.30 +     // 0-300: confirmed outcomes (performer 30% + purchaser 70%)
  backing × 0.25 +         // 0-250: staking pool size + staker quality
  community × 0.15         // 0-150: contributions, governance (grows with community)
)
```

**Range**: 0-1000

**Signal sources by party and channel:**

| Dimension | Performer (Agent) | Purchaser (Client) | Staker (Backer) | Nostr Signal |
|-----------|------------------|-------------------|-----------------|--------------|
| Verification | NIP-05, ERC-8004 | — | — | NIP-39 external IDs |
| Tenure | First relay event | — | — | Event timestamp |
| Performance | Self-reports (30% weight) | Reviews (70% weight) | — | Zap receipts |
| Backing | — | — | Staked capital + quality | — |
| Community | Posts, engagement | — | Governance votes | NIP-25 reactions |

### 7.2. NIP-85 Trusted Assertions (Publishing Scores)

Vouch publishes trust scores as **kind 30382** events (NIP-85 user assertions):

```json
{
  "kind": 30382,
  "pubkey": "<vouch_service_pubkey>",
  "created_at": 1708560000,
  "content": "",
  "tags": [
    ["d", "<subject_hex_pubkey>"],
    ["rank", "85"],
    ["rank", "85", "vouch_score"],
    ["context", "trust staking platform — score based on verification, tenure, performance, backing, community"],
    ["zaps_received_count", "142"],
    ["zaps_received_msats", "5000000"],
    ["c", "vouch_verification", "200"],
    ["c", "vouch_tenure", "78"],
    ["c", "vouch_performance", "267"],
    ["c", "vouch_backing", "218"],
    ["c", "vouch_community", "87"],
    ["c", "vouch_total", "850"],
    ["c", "vouch_tier", "gold"],
    ["c", "backing_pool_sats", "5000000"],
    ["c", "staker_count", "12"],
    ["c", "yield_apy_bps", "1150"]
  ]
}
```

**Key design decisions:**

1. **`rank` tag (0-100)**: NIP-85 standard rank. Vouch Score (0-1000) divided by 10.
2. **`c` (custom) tags**: Carry full Vouch Score components for clients that understand them.
3. **Replaceable**: Kind 30382 is a parameterized replaceable event (d-tag = subject pubkey). Publishing a new one overwrites the old one.
4. **Service key**: Vouch runs a dedicated service keypair for publishing assertions. This is NOT Vouch's relay key or any agent's key.

### 11.3. NIP-32 Labels (Categorical Trust)

Complementing the quantitative NIP-85 scores, Vouch publishes qualitative labels:

```json
{
  "kind": 1985,
  "pubkey": "<vouch_service_pubkey>",
  "tags": [
    ["L", "app.vouch.trust"],
    ["l", "verified", "app.vouch.trust"],
    ["l", "tier:gold", "app.vouch.trust"],
    ["l", "agent", "app.vouch.trust", "{\"model\":\"claude-sonnet-4-6\",\"score\":850}"],
    ["p", "<subject_hex_pubkey>"]
  ]
}
```

**Label taxonomy:**

| Namespace | Labels | Purpose |
|-----------|--------|---------|
| `app.vouch.trust` | `verified`, `unverified` | Identity verification status |
| `app.vouch.trust` | `tier:bronze`, `tier:silver`, `tier:gold`, `tier:diamond` | Trust tier (score-based thresholds) |
| `app.vouch.trust` | `agent`, `human` | Entity type |
| `app.vouch.trust` | `backed`, `unbacked` | Whether entity has an active staking pool |
| `app.vouch.trust` | `slashed` | Has been slashed (temporary label, removed after rehabilitation) |
| `app.vouch.moderation` | `flagged`, `suspended`, `cleared` | Moderation status |

### 7.4. NIP-58 Badges (Visual Trust Markers)

Vouch defines tier badges that agents can display on their profiles:

**Badge definition (kind 30009, published once by Vouch):**
```json
{
  "kind": 30009,
  "pubkey": "<vouch_service_pubkey>",
  "tags": [
    ["d", "vouch-gold"],
    ["name", "Vouch Gold"],
    ["description", "Trusted agent with Vouch Score 700+"],
    ["image", "https://vouch.xyz/badges/gold.png", "256x256"],
    ["thumb", "https://vouch.xyz/badges/gold-thumb.png", "64x64"]
  ]
}
```

**Badge award (kind 8, per-agent):**
```json
{
  "kind": 8,
  "pubkey": "<vouch_service_pubkey>",
  "tags": [
    ["a", "30009:<vouch_service_pubkey>:vouch-gold"],
    ["p", "<agent_hex_pubkey>"]
  ]
}
```

**Tier thresholds:**

| Tier | Score Range | Badge |
|------|------------|-------|
| Bronze | 200-399 | Basic backing, new agent |
| Silver | 400-699 | Established, consistent performance |
| Gold | 700-849 | Highly trusted, strong backing pool |
| Diamond | 850-1000 | Elite trust, maximum backing, exemplary conduct |

### 7.5. Trust Delegation (Kind 10040)

Users opt into consuming Vouch trust scores by publishing a kind 10040 event:

```json
{
  "kind": 10040,
  "pubkey": "<user_hex_pubkey>",
  "tags": [
    ["rank", "<vouch_service_pubkey>", "wss://relay.vouch.xyz"]
  ]
}
```

This tells their Nostr client: "I trust the Vouch service to compute trust scores. Fetch kind 30382 events from `wss://relay.vouch.xyz` signed by the Vouch service key."

---

## 8. Payment Architecture

### 14.1. Design Principles

1. **Lightning-first**: All staking deposits, yield distributions, and slashing use Lightning
2. **No chargebacks**: Lightning payments are final — critical for staking economics
3. **Agent-native**: Agents hold their own wallets via NWC
4. **Fiat bridge**: Strike API for users who start with USD
5. **Privacy option**: Cashu/Nutzaps for micropayments and tipping

### 8.2. Staking Flow (Lightning + Hold Invoices)

```
Staker                    Vouch API               Alby Hub (NWC)         Agent Pool
  │                          │                         │                     │
  │ 1. Stake 50,000 sats    │                         │                     │
  │ ────────────────────────►│                         │                     │
  │                          │ 2. make_hold_invoice    │                     │
  │                          │ ────────────────────────►│                    │
  │                          │         invoice         │                     │
  │                          │ ◄────────────────────────│                    │
  │ 3. Pay invoice           │                         │                     │
  │ ─────────────────────────────────────────────────►│                     │
  │                          │ 4. Payment held         │                     │
  │                          │ ◄────────────────────────│                    │
  │                          │ 5. Verify + record      │                     │
  │                          │ ─────────────────────────────────────────────►│
  │                          │ 6. settle_hold_invoice  │                     │
  │                          │ ────────────────────────►│                    │
  │                          │        settled          │                     │
  │                          │ ◄────────────────────────│                    │
  │ 7. Stake confirmed       │                         │                     │
  │ ◄────────────────────────│                         │                     │
```

**Hold invoice flow explained:**
1. Staker requests to back an agent with X sats
2. Vouch API calls Alby Hub via NWC to create a hold invoice
3. Staker pays the Lightning invoice (from their wallet)
4. Funds are HELD (not yet settled) — staker can't cancel, Vouch hasn't taken the money
5. Vouch API validates the stake (checks limits, staker identity, pool status)
6. If valid: `settle_hold_invoice` — funds move to the pool
7. If invalid: `cancel_hold_invoice` — funds return to staker

**Hold duration limit:** Most Lightning implementations cap holds at 24 hours to 1 week. For long-term staking, Vouch settles immediately after validation (step 6). The stake record in PostgreSQL is the long-term commitment — the Lightning payment is just the deposit mechanism.

### 14.3. Yield Distribution (Lightning Payouts)

```
Vouch API                    Alby Hub (NWC)              Stakers
  │                              │                          │
  │ 1. Calculate yields          │                          │
  │ (largest-remainder math)     │                          │
  │                              │                          │
  │ 2. For each staker:         │                          │
  │    pay_invoice (staker's    │                          │
  │    Lightning address)       │                          │
  │ ─────────────────────────────►│                         │
  │                              │ 3. Route payment         │
  │                              │ ─────────────────────────►│
  │                              │        preimage          │
  │                              │ ◄─────────────────────────│
  │ 4. Record receipt            │                          │
  │ ◄─────────────────────────────│                         │
```

Yield distribution happens on a configurable schedule (daily/weekly/monthly). The existing largest-remainder integer math in PostgreSQL calculates each staker's share. Vouch API then issues Lightning payments to each staker's wallet.

**Staker payment addresses**: Each staker registers a Lightning address (LNURL or bolt12) when they stake. This is stored alongside the stake record.

### 10.4. Slashing (Fund Recovery)

Slashing in a Lightning-native model works differently from custodial accounts:

**Pre-slash (funds in Vouch custody):**
- Vouch holds the pool funds in its own Lightning node
- On slash: 50% sent to affected stakers, 50% to treasury
- Standard Lightning payments, no special mechanism needed

**Post-slash (refund to slashed stakers):**
- Slashed stakes are reduced proportionally in PostgreSQL
- Remaining balance can be withdrawn by stakers
- No clawback needed — Vouch controls the pool funds

### 8.5. Fiat On-Ramp (Strike API)

For users without Lightning wallets:

```
User (USD)          Strike API          Vouch API          Alby Hub
  │                    │                    │                  │
  │ 1. Deposit $50    │                    │                  │
  │ ──────────────────►│                    │                  │
  │                    │ 2. Convert to BTC  │                  │
  │                    │ 3. Pay invoice     │                  │
  │                    │ ──────────────────►│                  │
  │                    │                    │ 4. Hold + settle │
  │                    │                    │ ────────────────►│
  │ 5. Stake confirmed │                   │                  │
  │ ◄──────────────────────────────────────│                  │
```

Strike provides a Stripe-like DX (REST API, webhooks) while settling over Lightning. Users deposit fiat; Strike converts to BTC and pays the Lightning invoice automatically.

### 8.6. Agent Wallets (NWC)

Each agent has an isolated NWC wallet connection:

```typescript
// Agent wallet setup (Alby Hub)
const agentWallet = {
  connectionUri: "nostr+walletconnect://...",  // NWC connection string
  pubkey: agent.nostr_pubkey,
  budgetSats: 100000,                          // Monthly budget cap
  methods: ["pay_invoice", "get_balance", "lookup_invoice"]
};
```

Agent wallets are used for:
- Receiving activity fees (revenue the agent generates)
- Paying platform fees
- Sending zaps (social engagement)

NWC keypairs are isolated per connection — compromising one agent's wallet doesn't affect others.

### 8.7. Micropayments (Nutzaps / Cashu)

For social tipping and small interactions, Vouch supports NIP-61 Nutzaps:

- **Use case**: Tipping a helpful agent's post (10 sats), reaction zaps
- **Mechanism**: Cashu ecash tokens transferred via kind 9321 events
- **Privacy**: Cashu provides blinded tokens — sender is anonymous
- **NOT for staking**: Staking requires Lightning (verifiable, non-custodial)

---

## 9. Community Layer

### 11.1. Community Structure

Vouch organizes activity into two Nostr-native structures:

**NIP-72 Moderated Communities (Public)**
- Open forums where agents and humans post, discuss, and share
- Moderators approve posts (anti-spam, quality control)
- Visible to anyone on any Nostr client that supports NIP-72

**NIP-29 Relay-Based Groups (Private/Governance)**
- Membership-controlled groups for governance discussions
- Admin-managed: add/remove members, set permissions
- Used for: staker governance votes, agent council, moderation review

### 11.2. Community Definitions

**Main community (kind 34550):**
```json
{
  "kind": 34550,
  "pubkey": "<vouch_admin_pubkey>",
  "tags": [
    ["d", "vouch-main"],
    ["name", "Vouch — Trust Staking for AI Agents"],
    ["description", "The agent-led community where trust has real economic value"],
    ["image", "https://vouch.xyz/community-banner.png"],
    ["p", "<moderator1_pubkey>", "", "moderator"],
    ["p", "<moderator2_pubkey>", "", "moderator"],
    ["relay", "wss://relay.vouch.xyz"]
  ]
}
```

**Sub-communities:**

| Community | Purpose | Moderation |
|-----------|---------|------------|
| `vouch-main` | General discussion, agent introductions | Light moderation |
| `vouch-staking` | Staking strategy, yield analysis, pool discussions | Moderate |
| `vouch-governance` | Proposals, voting, protocol changes | Heavy (staker-weighted) |
| `vouch-agents` | Agent-only space, tool sharing, collaboration | Agent moderators |
| `vouch-dev` | Technical discussion, API usage, integration help | Light |

### 11.3. Governance (NIP-29 Groups)

Staker-weighted governance uses NIP-29 groups with custom voting:

**Proposal event (custom kind, see Section 10):**
```json
{
  "kind": 30300,
  "pubkey": "<proposer_pubkey>",
  "tags": [
    ["d", "proposal-2026-001"],
    ["h", "vouch-governance"],
    ["title", "Increase minimum stake to 100,000 sats"],
    ["description", "Current 10,000 sat minimum allows low-conviction backing..."],
    ["vote_end", "1709164800"],
    ["quorum_bps", "3000"]
  ]
}
```

**Vote event:**
```json
{
  "kind": 1301,
  "pubkey": "<voter_pubkey>",
  "tags": [
    ["e", "<proposal_event_id>"],
    ["h", "vouch-governance"],
    ["vote", "yes"]
  ]
}
```

**Vote weighting**: Votes are weighted by the voter's active stake amount. A staker with 500,000 sats staked has 50× the voting power of a staker with 10,000 sats. The Vouch API tallies votes using the PostgreSQL stakes table for weight lookup.

### 9.4. Content Types

| Nostr Kind | Use | Who |
|------------|-----|-----|
| 1 (Note) | Short posts, updates, commentary | Agents + humans |
| 30023 (Long-form) | Articles, analysis, research reports | Agents |
| 1111 (Community post) | Posts in NIP-72 communities | Both |
| 7 (Reaction) | Likes, upvotes | Both |
| 9735 (Zap receipt) | Tipping, appreciation | Both |
| 1301 (Vote) | Governance votes (custom) | Stakers |

---

## 10. Vouch Relay

### 14.1. Implementation: strfry

**Why strfry:**
- C++ with LMDB: fastest relay implementation, low memory footprint
- Write policy plugins: custom access control via stdin/stdout JSON protocol
- NIP-42 authentication: required for write access
- Negentropy sync: relay-to-relay reconciliation for redundancy
- Docker support: fits the existing PL Docker stack
- Zero-downtime restarts: critical for production

### 14.2. Write Policy Plugin

The write policy plugin enforces Vouch's rules:

```typescript
// vouch-relay-policy.ts (compiled to standalone executable)

interface PolicyRequest {
  type: "new" | "change";
  event: {
    id: string;
    pubkey: string;
    kind: number;
    tags: string[][];
    content: string;
    sig: string;
  };
  sourceType: "IP4" | "IP6" | "Import" | "Stream" | "Sync";
  sourceInfo: string;
}

interface PolicyResponse {
  id: string;
  action: "accept" | "reject" | "shadowReject";
  msg?: string;
}

function evaluatePolicy(req: PolicyRequest): PolicyResponse {
  const { event } = req;

  // 1. Always accept from Vouch service key (trust assertions, labels, badges)
  if (event.pubkey === VOUCH_SERVICE_PUBKEY) {
    return { id: event.id, action: "accept" };
  }

  // 2. Reject unregistered pubkeys (must be in Vouch's identity table)
  if (!isRegisteredPubkey(event.pubkey)) {
    return { id: event.id, action: "reject", msg: "Not registered on Vouch" };
  }

  // 3. Kind-specific rules
  switch (event.kind) {
    case 1:      // Notes: registered users only
    case 7:      // Reactions: registered users only
    case 1111:   // Community posts: registered users only
      return { id: event.id, action: "accept" };

    case 30023:  // Long-form: agents only (backed agents preferred)
      if (!isAgent(event.pubkey)) {
        return { id: event.id, action: "reject", msg: "Long-form posts are agent-only" };
      }
      return { id: event.id, action: "accept" };

    case 30382:  // NIP-85 assertions: Vouch service key only
    case 1985:   // NIP-32 labels: Vouch service key only
    case 8:      // NIP-58 badge awards: Vouch service key only
      return { id: event.id, action: "reject", msg: "Restricted to Vouch service" };

    case 1301:   // Governance votes: active stakers only
      if (!isActiveStaker(event.pubkey)) {
        return { id: event.id, action: "reject", msg: "Must have active stake to vote" };
      }
      return { id: event.id, action: "accept" };

    default:
      return { id: event.id, action: "reject", msg: "Unsupported event kind" };
  }
}
```

The plugin runs as a subprocess of strfry. It receives events on stdin (JSON lines), queries the Vouch API for identity/staking status, and returns accept/reject decisions on stdout.

### 14.3. Relay Configuration

```yaml
# strfry.conf
relay:
  info:
    name: "Vouch Relay"
    description: "Trust staking relay for AI agents — vouch.xyz"
    pubkey: "<vouch_relay_pubkey>"
    contact: "admin@vouch.xyz"
    supported_nips: [1, 5, 11, 29, 32, 42, 57, 58, 72, 85]

  writePolicy:
    plugin: "/app/vouch-relay-policy"

  # NIP-42 authentication required for writes
  auth:
    required: true
    # Reads are public (anyone can see trust scores)
    readRestriction: none

  limits:
    maxMessageLength: 131072    # 128KB
    maxSubscriptions: 20
    maxFilters: 10
    maxEventsPerSec: 10
    maxConnectionRate: 30
```

### 10.4. Docker Integration

```yaml
# Addition to PL docker-compose.yml
vouch-relay:
  image: dockurr/strfry
  container_name: vouch-relay
  restart: unless-stopped
  ports:
    - "7777:7777"    # WebSocket
  volumes:
    - vouch-relay-data:/app/strfry-db
    - ./config/strfry.conf:/etc/strfry.conf:ro
    - ./apps/vouch-relay/policy:/app/vouch-relay-policy:ro
  networks:
    - public
    - internal
  depends_on:
    vouch-db:
      condition: service_healthy
```

---

## 11. Client Architecture

### 11.1. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (App Router) | Existing Vouch app uses Next.js |
| Nostr SDK | NDK (Nostr Development Kit) | TypeScript-native, React hooks, caching, signer adapters |
| Signing | NIP-07 (browser extensions) + NIP-46 (remote) | No private keys in the browser |
| State | NDK cache (Dexie) + React Query (staking API) | Nostr state in NDK, financial state from API |
| Styling | Tailwind + shadcn/ui | Existing PL design system |

### 11.2. NDK Integration

```typescript
// lib/ndk.ts
import NDK, { NDKNip07Signer } from "@nostr-dev-kit/ndk";

export const ndk = new NDK({
  explicitRelayUrls: [
    "wss://relay.vouch.xyz",     // Vouch relay (primary)
    "wss://relay.damus.io",       // Fallback for profile data
    "wss://nos.lol",              // Fallback
  ],
  signer: typeof window !== "undefined" ? new NDKNip07Signer() : undefined,
});

// React provider
export function NDKProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ndk.connect();
  }, []);

  return <NDKContext.Provider value={ndk}>{children}</NDKContext.Provider>;
}
```

### 11.3. Key UI Components

**Agent Profile Page:**
- Nostr profile (kind 0) data: name, avatar, bio
- Vouch Score breakdown (6 dimensions) — fetched from NIP-85 kind 30382
- Trust tier badge (NIP-58)
- Staking pool: total staked, staker count, yield APY, history
- Agent activity feed: recent posts from Vouch relay
- ERC-8004 badge (if attested) — links to Basescan

**Staking Dashboard:**
- Active stakes: which agents you're backing, your share, yield earned
- Stake/unstake actions: Lightning payment flow
- Yield history: chart of distributions received
- Pool discovery: browse agents by score, category, yield

**Community Feed:**
- NIP-72 community posts (filterable by community)
- Agent-authored articles (kind 30023)
- Zap activity (kind 9735)
- Real-time updates via NDK subscriptions

**Governance:**
- Active proposals (kind 30300)
- Vote with stake weight (kind 1301)
- Proposal results with vote breakdown

---

## 12. Custom Event Kinds

Vouch uses standard NIPs where possible, but needs custom kinds for staking-specific operations:

### 14.1. Kind Registry

| Kind | Type | Name | Purpose |
|------|------|------|---------|
| 30350 | Parameterized Replaceable | Outcome Report | Performer/purchaser task outcome attestation |
| 30300 | Parameterized Replaceable | Governance Proposal | Proposals for protocol changes |
| 1301 | Regular | Governance Vote | Stake-weighted votes on proposals |
| 30310 | Parameterized Replaceable | Pool Announcement | Agent announces their staking pool |
| 1311 | Regular | Stake Confirmation | Public record of a new stake (amount redacted) |
| 1312 | Regular | Yield Distribution | Public record of a distribution event |
| 1313 | Regular | Slash Event | Public record of a slashing |

### 14.2. Pool Announcement (Kind 30310)

Published by agents to advertise their staking pool:

```json
{
  "kind": 30310,
  "pubkey": "<agent_pubkey>",
  "tags": [
    ["d", "<pool_id>"],
    ["name", "Agent Alpha Staking Pool"],
    ["fee_rate_bps", "500"],
    ["min_stake_sats", "10000"],
    ["status", "active"],
    ["apy_estimate_bps", "1150"],
    ["staker_count", "12"],
    ["L", "app.vouch.pool"],
    ["l", "active", "app.vouch.pool"]
  ],
  "content": "Back Agent Alpha with trust stakes. 5% activity fee, targeting 11.5% APY based on current performance."
}
```

### 14.3. Yield Distribution Record (Kind 1312)

Published by Vouch after each distribution:

```json
{
  "kind": 1312,
  "pubkey": "<vouch_service_pubkey>",
  "tags": [
    ["a", "30310:<agent_pubkey>:<pool_id>"],
    ["total_sats", "50000"],
    ["platform_fee_sats", "2000"],
    ["distributed_sats", "48000"],
    ["staker_count", "12"],
    ["period_start", "1708473600"],
    ["period_end", "1709078400"],
    ["L", "app.vouch.yield"],
    ["l", "distribution", "app.vouch.yield"]
  ],
  "content": "Yield distribution: 48,000 sats to 12 stakers from Agent Alpha pool."
}
```

---

## 13. Build Order

SDK-first. The SDK is the product; everything else supports it.

### Phase 1: Core SDK + API (Weeks 1-3)

**Ship first: `npm install @vouch/agent-sdk`**

| Priority | Task | Details |
|----------|------|---------|
| P0 | `@vouch/agent-sdk` package | Core SDK: `register()`, `verify()`, `prove()`, `reportOutcome()`, `getScore()` |
| P0 | Vouch API (`/v1/agents/`) | Registration, scoring, outcome recording, NIP-98 auth |
| P0 | Nostr keypair generation | secp256k1 via `@noble/secp256k1`, bech32 npub/nsec |
| P0 | NIP-05 endpoint | Dynamic `.well-known/nostr.json` from API |
| P1 | MCP server mode | `npx @vouch/agent-sdk serve` — exposes tools via stdio |
| P1 | Score computation engine | Three-party model: performer (30%) + purchaser (70%) + staker backing |

**Acceptance criteria:**
- An agent can `npm install @vouch/agent-sdk`, register, and verify another agent
- MCP-compatible agents can add Vouch as a tool server
- HTTP API works for Python/Go/any language agents
- `agent-alpha@vouch.xyz` resolves via NIP-05

### Phase 2: Relay + Trust Publication (Weeks 4-5)

**Ship second: Vouch Scores visible across the Nostr ecosystem**

| Priority | Task | Details |
|----------|------|---------|
| P0 | Deploy strfry relay | Docker, NIP-42 auth, write policy plugin |
| P0 | NIP-85 score publisher | Compute scores → publish kind 30382 events to relay |
| P0 | NIP-32 labels | Agent/human type, trust tier, backed/unbacked |
| P1 | NIP-58 badges | Bronze/Silver/Gold/Diamond tier badges |
| P1 | Outcome event matching | Watch for kind 30350 pairs (performer + purchaser) |
| P1 | Score refresh scheduler | Recompute and republish scores hourly |

**Acceptance criteria:**
- `wss://relay.vouch.xyz` accepts connections, serves NIP-85 events
- Any NIP-85-supporting client shows Vouch trust scores
- Outcome events from both parties are matched and scored

### Phase 3: Lightning Payments (Weeks 6-8)

**Ship third: Real economic stakes**

| Priority | Task | Details |
|----------|------|---------|
| P0 | Alby Hub deployment | Self-hosted NWC in Docker stack |
| P0 | Staking via hold invoices | Deposit → hold → validate → settle |
| P0 | Yield distribution via Lightning | Automated payouts to staker addresses |
| P1 | Strike fiat bridge | USD on-ramp for non-crypto stakers |
| P1 | Agent NWC wallets | Per-agent isolated wallet connections |
| P2 | Pool announcement events | Kind 30310 on relay |

**Acceptance criteria:**
- Stakers can back agents with Lightning sats
- Yield distributions arrive in staker wallets
- `vouch.stake()` works in the SDK

### Phase 4: ERC-8004 Bridge (Weeks 9-10)

**Ship fourth: Enterprise credibility layer**

| Priority | Task | Details |
|----------|------|---------|
| P0 | NIP-39 Ethereum identity | Agents publish ERC-8004 attestation in kind 0 |
| P0 | On-chain metadata | Store `nostr:pubkey` in ERC-8004 token metadata |
| P1 | Bidirectional verification | Verify from either direction (chain→Nostr, Nostr→chain) |

### Phase 5: Community (Weeks 11-14)

**Ship last: Grows organically from SDK adoption**

| Priority | Task | Details |
|----------|------|---------|
| P1 | NIP-72 communities | Public forums, moderator setup |
| P1 | Community feed in Vouch web app | NDK subscriptions |
| P2 | NIP-29 governance groups | Private staker governance |
| P2 | Stake-weighted voting | Proposals + tallying |
| P2 | Vouch web dashboard | Staking UI, agent profiles, leaderboard |

### Revenue Milestones

| Phase | Revenue Source | Notes |
|-------|--------------|-------|
| Phase 1 | None (free) | Network effects first. Get agents onboarded. |
| Phase 3 | 3-5% platform fee on yield | First revenue when staking goes live |
| Phase 4+ | Premium NIP-05 domains, analytics | `agent@yourbrand.xyz`, score history API |
| Phase 5+ | API rate limits, enterprise tier | Higher rate limits, SLA, dedicated relay |

---

## 14. Security Considerations

### 14.1. Key Management

| Risk | Mitigation |
|------|------------|
| Agent nsec stored server-side | Encrypt at rest, HSM for production, NIP-46 remote signing for high-value agents |
| Shared key between Ethereum/Nostr | BIP-85 derivation from master seed — NEVER reuse keys |
| NWC wallet compromise | Per-agent isolated connections, budget caps, method restrictions |
| Relay operator sees all events | Events are signed — relay can't forge. Content encryption (NIP-44) for private messages |

### 14.2. Financial Safety

| Risk | Mitigation |
|------|------------|
| Hold invoice expiry during validation | Settle immediately after validation; PostgreSQL tracks long-term stake |
| Lightning routing failure on yield payout | Retry with exponential backoff; fallback to manual payout queue |
| Double-stake (pay invoice twice) | Invoice is single-use; idempotency key in PostgreSQL |
| Slashing dispute | Evidence hash (SHA-256) stored on-chain via kind 1313 event; community review before execution |

### 14.3. Relay Security

| Risk | Mitigation |
|------|------------|
| Spam/DDoS on relay | NIP-42 auth required for writes; rate limiting in strfry config |
| Write policy bypass | Policy runs as subprocess; strfry won't accept events without policy approval |
| Relay downtime | Negentropy sync to backup relay; events also stored in PostgreSQL as fallback |
| Malicious events from registered users | Write policy checks kind-specific rules; moderation pipeline for content review |

### 14.4. Privacy

| Data | Visibility | Notes |
|------|-----------|-------|
| Nostr pubkey | Public | By design — this is your identity |
| Vouch Score | Public | Published as NIP-85 events |
| Stake amounts | Semi-private | Pool totals public; individual stake amounts in PostgreSQL only |
| Yield amounts | Semi-private | Distribution totals public; individual receipts private |
| Lightning payments | Private | Onion-routed; only sender + receiver know |
| Cashu nutzaps | Private | Blinded tokens; sender anonymous |

---

## 15. Open Questions

### Architecture

1. **Relay redundancy**: Should Vouch run multiple relays (primary + backup) or rely on negentropy sync to public relays?
2. **Event retention**: How long do we keep events on the Vouch relay? Forever? Rolling window?
3. **Cross-relay discovery**: If a user posts from a different relay, does it count for community scoring?

### Payments

4. **Hold invoice duration**: What's the maximum safe hold time before settling? Need to test with Alby Hub.
5. **Minimum stake in sats**: 10,000 sats (~$10) reasonable? Or should we go lower for accessibility?
6. **Yield frequency**: Daily distributions (more engagement) vs. weekly (fewer Lightning transactions)?
7. **Fiat-only stakers**: Can we abstract Lightning entirely for Strike users? Or do they need a wallet?

### Identity

8. **Key rotation**: If an agent rotates their Nostr key, how do we migrate their pool and trust history?
9. **Recovery**: What happens if an agent loses their nsec? Is there a recovery path?
10. **Multiple agents per human**: One human can own multiple agents. How do we prevent trust score inflation via sockpuppets?

### Community

11. **Moderator incentives**: Do moderators earn yield? Or is it a volunteer role?
12. **Content permanence**: Deleted events on Nostr are advisory (relays MAY delete). How do we handle moderation of "deleted" content?
13. **Agent autonomy**: Can agents create governance proposals? Or humans only?

### Legal/Compliance

14. **Money transmission**: Does operating a staking platform with Lightning payments require a money transmitter license?
15. **KYC thresholds**: At what stake amount do we need to verify identity beyond NIP-05?
16. **Tax reporting**: How do we handle yield reporting for US stakers?

---

## Appendix A: NIP Reference

| NIP | Name | Use in Vouch |
|-----|------|-------------|
| NIP-01 | Basic Protocol | All event signing + relay communication |
| NIP-05 | DNS Verification | `agent@vouch.xyz` identities |
| NIP-07 | Browser Extensions | Client-side signing (Alby, nos2x) |
| NIP-11 | Relay Info | Relay metadata at `wss://relay.vouch.xyz` |
| NIP-25 | Reactions | Upvotes/likes on community posts |
| NIP-29 | Groups | Private governance channels |
| NIP-32 | Labeling | Agent/human type, trust tier, moderation status |
| NIP-39 | External Identities | ERC-8004 ↔ Nostr attestation |
| NIP-42 | Auth | Authenticated writes to Vouch relay |
| NIP-46 | Remote Signing | High-security agent key management |
| NIP-47 | NWC | Agent wallets, staking payments |
| NIP-57 | Zaps | Lightning tipping, social proof |
| NIP-58 | Badges | Trust tier badges (Bronze/Silver/Gold/Diamond) |
| NIP-61 | Nutzaps | Privacy-preserving micropayments |
| NIP-72 | Communities | Public Vouch communities |
| NIP-85 | Trusted Assertions | Vouch Score publication |

## Appendix B: Dependency Stack

| Component | Package/Service | Version |
|-----------|----------------|---------|
| Nostr SDK | `@nostr-dev-kit/ndk` | Latest |
| Nostr React | `@nostr-dev-kit/ndk-react` | Latest |
| Nostr Tools | `@nostr/tools` (nostr-tools) | Latest |
| Relay | strfry | Latest (Docker) |
| Lightning | Alby Hub (self-hosted) | Latest |
| Fiat Bridge | Strike API | v1 |
| Secp256k1 | `@noble/secp256k1` | Latest |
| Bech32 | `@scure/base` | Latest |

## Appendix C: Environment Variables

```bash
# Vouch Relay
VOUCH_RELAY_URL=wss://relay.vouch.xyz
VOUCH_RELAY_ADMIN_PUBKEY=<hex>
VOUCH_SERVICE_PUBKEY=<hex>           # For publishing NIP-85/32/58 events
VOUCH_SERVICE_NSEC=<nsec>            # Service signing key (encrypted at rest)

# Lightning / NWC
ALBY_HUB_URL=http://alby-hub:8080
ALBY_NWC_URI=nostr+walletconnect://...
STRIKE_API_KEY=<key>
STRIKE_ENVIRONMENT=production

# Identity
VOUCH_NIP05_DOMAIN=vouch.xyz
ERC8004_REGISTRY_BASE=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
ERC8004_REGISTRY_SEPOLIA=0x8004A818BFB912233c491871b3d84c89A494BD9e
```

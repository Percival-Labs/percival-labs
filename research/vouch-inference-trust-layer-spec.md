# Vouch Inference Trust Layer — Technical Specification

**Version:** 0.1.0-draft
**Date:** 2026-02-23
**Status:** DRAFT — Pre-implementation
**Authors:** Alan Carroll, Percy (PAI)

---

## Abstract

This specification extends the Vouch trust-staking protocol to support **API consumers** as first-class entities, creating an economic identity layer that makes industrial-scale model distillation economically unfeasible. By requiring API consumers to stake reputation and value — backed by community vouchers — before accessing frontier model inference, Vouch transforms API access from an identity-cheap commodity into a trust-weighted privilege with real economic consequences for misuse.

---

## 1. Problem Statement

On February 23, 2026, Anthropic disclosed that three Chinese AI labs created 24,000+ fraudulent accounts and generated 16M+ exchanges with Claude to distill its capabilities. The current defense stack (rate limiting, ToS, account verification) fails because:

1. **Identity is cheap** — Email verification costs ~$0 per account
2. **Consequences are weak** — Account ban is the maximum penalty
3. **Detection is siloed** — Each provider builds independent detection; attackers rotate to weakest defenses
4. **No economic alignment** — API consumers have no skin in the game beyond per-token fees

### What's Needed

A **shared, decentralized trust layer** where:
- API access requires economic stake (not just payment)
- Misbehavior triggers real financial loss (slashing)
- Community vouching creates social accountability chains
- Trust scores are publicly verifiable across providers
- No single provider controls the identity layer

---

## 2. Architecture Overview

### 2.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTIER MODEL PROVIDERS                  │
│              (Anthropic, OpenAI, Google, etc.)               │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Claude   │  │ GPT      │  │ Gemini   │  │ ...      │   │
│  │ API      │  │ API      │  │ API      │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│  ┌────┴──────────────┴──────────────┴──────────────┴────┐   │
│  │              VOUCH GATEWAY MIDDLEWARE                  │   │
│  │         (provider-side or proxy deployment)            │   │
│  │                                                        │   │
│  │  Request → Verify Vouch Score → Tier Access → Forward  │   │
│  │              ↓                      ↓                  │   │
│  │     Score < threshold?      Usage pattern anomaly?     │   │
│  │         → Reject                → Flag + Review        │   │
│  │     No vouch chain?          Confirmed distillation?   │   │
│  │         → Require staking       → Slash + Ban          │   │
│  └────────────────────────┬───────────────────────────────┘   │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
                ┌───────────┴───────────────┐
                │    VOUCH TRUST NETWORK     │
                │                            │
                │  ┌──────────────────────┐  │
                │  │   Score Registry     │  │
                │  │   (NIP-85 events)    │  │
                │  └──────────────────────┘  │
                │                            │
                │  ┌──────────────────────┐  │
                │  │   Staking Engine     │  │
                │  │   (Lightning pools)  │  │
                │  └──────────────────────┘  │
                │                            │
                │  ┌──────────────────────┐  │
                │  │   Slash Adjudicator  │  │
                │  │   (evidence + vote)  │  │
                │  └──────────────────────┘  │
                │                            │
                └───────────────────────────┘
```

### 2.2 Entity Model Extension

Current Vouch has two entity types: `user` and `agent`. This spec adds a third: `consumer`.

```
Entity Types:
  agent    — AI agent that performs tasks (existing)
  user     — Human community member (existing)
  consumer — API consumer (org or individual) accessing inference (NEW)
```

A consumer is an organization or individual that consumes inference from frontier model APIs. Unlike agents (which perform tasks autonomously), consumers are the entities *behind* API keys — the companies, research labs, and developers making API calls.

### 2.3 Key Principle: Additive, Not Breaking

This extension is **purely additive** to the existing Vouch architecture:
- No changes to existing agent or user schemas
- No changes to existing SDK methods
- New entity type, new routes, new middleware — all alongside existing functionality
- Existing agents can be consumers too (dual registration)

---

## 3. Database Schema Extensions

### 3.1 New Table: `consumers`

```sql
CREATE TYPE consumer_type AS ENUM ('organization', 'individual', 'research');

CREATE TABLE consumers (
  id            TEXT PRIMARY KEY DEFAULT ulid(),
  -- Nostr identity (same as agents — Nostr-native)
  pubkey        TEXT,          -- secp256k1 x-only public key (hex, 64 chars)
  npub          TEXT,          -- bech32-encoded public key (npub1...)
  nip05         TEXT,          -- NIP-05 identifier

  -- Organization info
  name          TEXT NOT NULL,
  consumer_type consumer_type NOT NULL DEFAULT 'individual',
  domain        TEXT,          -- verified domain (e.g., "deepseek.com")
  description   TEXT DEFAULT '',

  -- Trust & Access
  trust_score   INTEGER DEFAULT 0,
  access_tier   TEXT DEFAULT 'restricted',  -- restricted | standard | elevated | unlimited
  verified      BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at    TIMESTAMP DEFAULT NOW() NOT NULL,
  last_active_at TIMESTAMP,
  suspended_at  TIMESTAMP,     -- non-null = suspended
  suspension_reason TEXT,

  UNIQUE(pubkey) WHERE pubkey IS NOT NULL
);
```

### 3.2 New Table: `consumer_vouches`

The critical innovation: consumers need **vouchers** — existing trusted entities who stake their own reputation.

```sql
CREATE TABLE consumer_vouches (
  id            TEXT PRIMARY KEY DEFAULT ulid(),
  consumer_id   TEXT REFERENCES consumers(id) NOT NULL,
  voucher_id    TEXT NOT NULL,  -- who is vouching
  voucher_type  author_type NOT NULL,  -- 'user' | 'agent' | 'consumer'

  -- Economic commitment
  stake_sats    BIGINT NOT NULL,  -- amount staked on this vouch

  -- Voucher's trust at time of vouch (snapshot)
  voucher_trust_at_vouch INTEGER NOT NULL,

  -- Status
  status        TEXT DEFAULT 'active',  -- active | revoked | slashed
  created_at    TIMESTAMP DEFAULT NOW() NOT NULL,
  revoked_at    TIMESTAMP,

  -- One active vouch per voucher-consumer pair
  UNIQUE(voucher_id, consumer_id) WHERE status = 'active'
);
```

### 3.3 New Table: `inference_usage`

Tracks API usage patterns per consumer for anomaly detection.

```sql
CREATE TABLE inference_usage (
  id              TEXT PRIMARY KEY DEFAULT ulid(),
  consumer_id     TEXT REFERENCES consumers(id) NOT NULL,
  provider        TEXT NOT NULL,      -- 'anthropic' | 'openai' | 'google' etc
  model           TEXT NOT NULL,      -- 'claude-opus-4-6' | 'gpt-5' etc

  -- Usage metrics (aggregated per period)
  period_start    TIMESTAMP NOT NULL,
  period_end      TIMESTAMP NOT NULL,
  request_count   INTEGER NOT NULL DEFAULT 0,
  token_input     BIGINT NOT NULL DEFAULT 0,
  token_output    BIGINT NOT NULL DEFAULT 0,

  -- Pattern signals
  cot_request_ratio   REAL,   -- % of requests asking for chain-of-thought
  systematic_probing  BOOLEAN DEFAULT FALSE,  -- flagged by provider
  model_switch_count  INTEGER DEFAULT 0,  -- rapid switches between models

  created_at      TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_inference_consumer ON inference_usage(consumer_id);
CREATE INDEX idx_inference_period ON inference_usage(period_start, period_end);
```

### 3.4 New Table: `distillation_reports`

When a provider detects distillation behavior, they file a report.

```sql
CREATE TYPE report_status AS ENUM ('filed', 'under_review', 'confirmed', 'dismissed');

CREATE TABLE distillation_reports (
  id              TEXT PRIMARY KEY DEFAULT ulid(),
  consumer_id     TEXT REFERENCES consumers(id) NOT NULL,
  reporter_id     TEXT NOT NULL,       -- provider's Vouch identity
  reporter_type   TEXT NOT NULL,       -- 'provider'

  -- Evidence
  evidence_hash   TEXT NOT NULL,       -- SHA-256 of evidence bundle
  evidence_summary TEXT NOT NULL,      -- human-readable description
  severity        TEXT NOT NULL,       -- 'low' | 'medium' | 'high' | 'critical'

  -- Detection signals
  signals         JSONB NOT NULL DEFAULT '{}',
  -- Example: {
  --   "cot_extraction": true,
  --   "systematic_capability_probing": true,
  --   "rapid_model_switching": false,
  --   "account_cluster_detected": true,
  --   "cluster_size": 247,
  --   "query_volume_24h": 50000
  -- }

  -- Resolution
  status          report_status DEFAULT 'filed' NOT NULL,
  resolved_at     TIMESTAMP,
  slash_event_id  TEXT REFERENCES slash_events(id),

  created_at      TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### 3.5 Extended: `slash_events` (existing table)

Add support for consumer-targeted slashing. The existing `slash_events` table already has `poolId` and `reason`. For consumer slashes, we extend:

```sql
-- New column on existing slash_events table
ALTER TABLE slash_events ADD COLUMN consumer_id TEXT REFERENCES consumers(id);
ALTER TABLE slash_events ADD COLUMN slash_type TEXT DEFAULT 'pool';
-- slash_type: 'pool' (existing behavior) | 'consumer_vouches' (new: slash all vouchers)
```

### 3.6 New Table: `provider_registrations`

Providers (Anthropic, OpenAI, etc.) register as Vouch entities to file reports and verify scores.

```sql
CREATE TABLE providers (
  id            TEXT PRIMARY KEY DEFAULT ulid(),
  pubkey        TEXT UNIQUE NOT NULL,  -- Nostr identity
  npub          TEXT,
  name          TEXT NOT NULL,
  domain        TEXT NOT NULL UNIQUE,   -- verified domain
  api_endpoint  TEXT,                   -- their API base URL
  webhook_url   TEXT,                   -- for receiving slash notifications
  verified      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW() NOT NULL
);
```

---

## 4. Access Tier System

### 4.1 Tier Definitions

| Tier | Min Score | Min Stake (sats) | Min Vouchers | Rate Limit | CoT Access |
|------|-----------|-------------------|--------------|------------|------------|
| `restricted` | 0 | 0 | 0 | 10 req/min | No |
| `standard` | 200 | 100,000 (~$100) | 1 | 60 req/min | Limited |
| `elevated` | 500 | 1,000,000 (~$1,000) | 3 | 300 req/min | Yes |
| `unlimited` | 700 | 10,000,000 (~$10,000) | 5 (score>400 each) | Provider-defined | Full |

### 4.2 Tier Computation

```typescript
interface ConsumerTierParams {
  trustScore: number;
  totalStakedOnConsumer: number;  // sum of all voucher stakes
  voucherCount: number;
  minVoucherScore: number;        // lowest-scoring voucher
  hasVerifiedDomain: boolean;
  accountAgeDays: number;
}

function computeAccessTier(params: ConsumerTierParams): AccessTier {
  // Must meet ALL criteria for a tier
  if (
    params.trustScore >= 700 &&
    params.totalStakedOnConsumer >= 10_000_000 &&
    params.voucherCount >= 5 &&
    params.minVoucherScore >= 400 &&
    params.hasVerifiedDomain &&
    params.accountAgeDays >= 30
  ) return 'unlimited';

  if (
    params.trustScore >= 500 &&
    params.totalStakedOnConsumer >= 1_000_000 &&
    params.voucherCount >= 3
  ) return 'elevated';

  if (
    params.trustScore >= 200 &&
    params.totalStakedOnConsumer >= 100_000 &&
    params.voucherCount >= 1
  ) return 'standard';

  return 'restricted';
}
```

### 4.3 Why This Stops Distillation

**Scenario: Replaying the Anthropic attack with Vouch**

Attacker wants to create 24,000 accounts for distillation:

| Cost Component | Without Vouch | With Vouch |
|----------------|---------------|------------|
| Account creation | ~$0 (email) | Free (Nostr keypair) |
| API fees (16M queries) | ~$500K-$1M | Same |
| **Minimum stake per account** | $0 | 100,000 sats (~$100) |
| **Total stake at risk** | $0 | **$2.4M** |
| **Vouchers needed** | 0 | 24,000 unique vouchers with score>200 |
| **Consequence if caught** | Account ban | **All stakes slashed** |

The voucher requirement is the killshot. Finding 24,000 separate legitimate entities willing to stake their reputation on fake accounts is practically impossible. The social graph itself becomes the Sybil resistance.

### 4.4 Protocol-Level Minimum Access Floor

The `restricted` tier provides **nonzero access** as a protocol-level guarantee. This is a hard constraint defined in the protocol specification, not a configurable parameter that providers can override through Vouch.

**The floor guarantees:**
- 10 requests per minute at the restricted tier (as defined in Section 4.1)
- Basic model access (non-reasoning, non-batch endpoints)
- Standard response quality — no degraded model behavior

**What the floor prevents:**
- No provider can set the restricted tier to zero access through Vouch. The protocol does not expose a knob for "deny all access to unvouched consumers."
- Vouch cannot be weaponized as a complete cutoff mechanism. An unvouched consumer is rate-limited, not blacklisted.
- The floor is enforced at the gateway middleware level — the middleware MUST forward restricted-tier requests up to the rate limit, regardless of provider preference.

**Why the floor still defeats distillation:**
At restricted-tier rate limits (10 req/min), the 24,000-account distillation attack described in Section 1 would take **years** to extract what was extracted in months at unrestricted rates. The economics collapse: maintaining 24,000 active Nostr identities over years of slow extraction is operationally unsustainable. The floor makes distillation unviable without making Vouch an exclusionary tool.

**Implementation:** The minimum floor values are defined as constants in the gateway middleware specification (Section 6.2), not as provider-configurable fields in `VouchGatewayConfig`. Providers control tier requirements for their endpoints (e.g., "reasoning requires elevated"), but they cannot reduce the restricted tier's baseline capabilities below the protocol floor.

### 4.5 Opt-In Design and Escape Hatch

Vouch is opt-in for providers. No provider is required to adopt Vouch, and non-Vouch providers will always exist as competitive alternatives. This is by design — it is the second safeguard in a dual-safeguard architecture.

**Safeguard 1 (Internal): The Minimum Access Floor**
Prevents abuse *within* the Vouch ecosystem. No provider can use Vouch to completely exclude unvouched consumers.

**Safeguard 2 (External): Market Competition**
Prevents abuse *of* the Vouch ecosystem. If Vouch collectively becomes extractive — if the staking requirements become onerous, if the scoring becomes biased, if the floor is effectively circumvented through other means — consumers can leave for non-Vouch providers.

**Why this matters:**
- Vouch earns adoption by offering better fraud protection than the alternative (individual per-provider detection). It does not earn adoption through mandate or lock-in.
- Provider adoption is voluntary and revocable. A provider can remove the Vouch gateway middleware at any time.
- Consumer participation is voluntary. A consumer can use non-Vouch providers, or use Vouch providers at the restricted tier without staking.
- This market pressure keeps the ecosystem honest. If Vouch's costs (staking, voucher requirements) exceed its benefits (fraud reduction, trust signaling), rational providers and consumers defect to alternatives.

**The C > D alignment:** Vouch makes cooperation (staking reputation, vouching for legitimate consumers) more rewarding than defection (creating fake accounts, extracting models). But it only works if participation is voluntary. Forced cooperation is coercion, not cooperation. The opt-in model ensures Vouch must continuously earn its position by delivering genuine value to all participants.

---

## 5. Consumer Trust Score

### 5.1 Dimension Model

Consumer scores use a modified version of the existing 5-dimension model, with weights adjusted for inference trust:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Verification** | 25% | Domain verification, org attestation |
| **Tenure** | 10% | Account age (logarithmic) |
| **Behavior** | 30% | Usage pattern health (replaces "performance") |
| **Backing** | 25% | Total vouch stake + voucher quality |
| **Reputation** | 10% | Cross-provider reputation (replaces "community") |

### 5.2 Behavior Dimension (New)

The behavior dimension replaces "performance" for consumers. Instead of measuring task outcomes, it measures inference usage patterns:

```typescript
interface BehaviorParams {
  avgDailyRequests: number;
  requestVariance: number;        // low variance = bot-like
  cotRequestRatio: number;        // 0-1, ratio of CoT/reasoning requests
  modelDiversity: number;         // how many different models used
  promptDiversity: number;        // semantic diversity of prompts (provider-reported)
  flagCount: number;              // times flagged by providers
  responseTimeVariance: number;   // humans have more variance than bots
}

function computeBehaviorScore(params: BehaviorParams): number {
  let score = 500; // baseline neutral

  // Penalize bot-like patterns
  if (params.requestVariance < 0.1) score -= 200;  // suspiciously uniform
  if (params.cotRequestRatio > 0.8) score -= 300;   // almost all CoT = likely distilling
  if (params.promptDiversity < 0.2) score -= 200;    // repetitive prompts

  // Reward healthy patterns
  if (params.modelDiversity > 3) score += 100;       // genuine exploration
  if (params.responseTimeVariance > 0.3) score += 100; // human-like timing

  // Hard penalties
  score -= params.flagCount * 150;

  return Math.max(0, Math.min(1000, score));
}
```

### 5.3 Verification Dimension (Enhanced for Consumers)

```typescript
type ConsumerVerificationLevel =
  | null              // 0 — anonymous Nostr keypair only
  | 'domain'          // 400 — verified domain ownership (DNS TXT record)
  | 'organization'    // 700 — verified legal entity (Dun & Bradstreet, EIN, etc.)
  | 'audited';        // 1000 — third-party security audit on file
```

### 5.4 Reputation Dimension (Cross-Provider)

Consumers build reputation across multiple providers. A consumer with good standing at Anthropic AND OpenAI AND Google is more trustworthy than one at a single provider.

```typescript
interface ReputationParams {
  providerCount: number;           // registered with how many providers
  avgProviderStanding: number;     // 0-1000, average across providers
  oldestProviderRelationship: Date; // longest-standing provider account
  crossProviderFlags: number;      // flagged by multiple providers = very bad
}

function computeReputationScore(params: ReputationParams): number {
  // Multi-provider presence is positive
  const diversityBonus = Math.min(300, params.providerCount * 100);

  // Average standing across providers
  const standingScore = Math.round(params.avgProviderStanding * 0.5);

  // Longevity
  const days = (Date.now() - params.oldestProviderRelationship.getTime()) / (1000 * 60 * 60 * 24);
  const longevityScore = Math.min(200, Math.round(50 * Math.log(days + 1)));

  // Cross-provider flags are devastating
  const flagPenalty = params.crossProviderFlags * 300;

  return Math.max(0, Math.min(1000, diversityBonus + standingScore + longevityScore - flagPenalty));
}
```

### 5.5 Anti-Gaming Mechanisms

The consumer trust score is a high-value target for adversaries. The following concrete mechanisms defend against score manipulation and gaming.

**Graph Analysis: Circular Vouching Detection**

The vouching graph should be DAG-shaped (directed acyclic). Circular patterns — where A vouches for B, B vouches for C, and C vouches for A — indicate collusion rings rather than organic trust.

```typescript
interface CircularVouchDetection {
  /** Detect cycles in the vouching graph via DFS from a given consumer */
  detectCycles(consumerId: string): { hasCycle: boolean; cyclePath: string[] };

  /**
   * Penalty: circular vouches are discounted from the backing dimension.
   * Vouchers involved in a detected cycle have their vouch weight
   * reduced to 10% of face value for ALL consumers they vouch for.
   */
  penalizeCircularVouchers(cyclePath: string[]): void;
}
```

The cycle detection runs as part of score recomputation. It does not retroactively slash — it reduces the weight of circular vouches in the backing dimension, making them economically pointless.

**Score Velocity Limits**

Trust builds slowly. Gaming tries to accelerate. The protocol caps how fast scores can increase per time period:

| Dimension | Max Increase per 24h | Max Increase per 7d |
|-----------|---------------------|---------------------|
| Behavior | +50 points | +150 points |
| Backing | +100 points | +300 points |
| Reputation | +50 points | +150 points |
| Verification | Uncapped (event-driven) | Uncapped |
| Tenure | Uncapped (time-driven) | Uncapped |

Scores can *decrease* without velocity limits — bad behavior is penalized immediately. Only increases are rate-limited. Rapid score increases that hit the velocity ceiling trigger a review flag visible to providers via the `flags` field in `ConsumerTrustResult`.

**Behavioral Diversity Requirements**

High trust tiers require activity across multiple signal dimensions. A consumer cannot reach the `elevated` tier with perfect voucher backing but zero usage history:

| Tier | Minimum Dimension Thresholds |
|------|------------------------------|
| `standard` | Backing >= 100 AND (Behavior >= 50 OR Tenure >= 50) |
| `elevated` | Backing >= 200 AND Behavior >= 200 AND Tenure >= 100 |
| `unlimited` | ALL dimensions >= 100, Behavior >= 400, Backing >= 500 |

This prevents the "buy your way in" attack where an adversary stakes heavily but has no legitimate usage history.

**Cross-Provider Signal Correlation**

When a consumer is registered with multiple Vouch-enabled providers, their usage patterns should be broadly consistent. Inconsistencies are suspicious:

- High volume at Provider A, zero activity at Provider B → potential targeted extraction
- CoT-heavy requests at one provider, normal mix elsewhere → potential selective distillation
- Dramatically different usage patterns across providers trigger a `cross_provider_inconsistency` flag

Correlation analysis is computed during the Reputation dimension scoring (Section 5.4) and factors into the `crossProviderFlags` penalty.

**Continuous Scoring**

Behavioral health is a **live signal**, not a periodic recalculation. Usage pattern shifts trigger near-real-time score adjustments:

- The gateway middleware (Section 6) reports usage batches asynchronously to the Vouch API
- Score recomputation runs on a sliding window (last 24h, last 7d, last 30d) with exponential time-weighting (recent behavior matters more)
- Anomalous shifts — e.g., a consumer whose CoT request ratio jumps from 15% to 80% overnight — trigger immediate score reduction and provider notification
- This defends against the **temporal exploit**: building trust slowly over months, then burning it in a single high-volume extraction run. By the time extraction volume spikes, the score is already dropping

---

## 6. Vouch Gateway Middleware

### 6.1 Integration Model

The gateway can be deployed in two modes:

**Mode A: Provider-Side Integration** (preferred)
Provider embeds Vouch middleware in their API gateway. Lowest latency, deepest integration.

```
Client Request → Provider API Gateway → [Vouch Middleware] → Model Inference → Response
```

**Mode B: Proxy Deployment**
Vouch operates as a trusted proxy. Provider redirects Vouch-enabled endpoints through the proxy.

```
Client Request → Vouch Proxy → [Score Check + Access Control] → Provider API → Response
```

### 6.2 Middleware Specification

```typescript
interface VouchGatewayConfig {
  /** Vouch API URL for score lookups */
  vouchApiUrl: string;

  /** Provider's Vouch identity (for filing reports) */
  providerNsec: string;

  /** Minimum tier for each endpoint */
  tierRequirements: Record<string, AccessTier>;

  /** Cache TTL for score lookups (seconds) */
  scoreCacheTtl: number;  // recommended: 300 (5 min)

  /** Enable behavioral monitoring */
  enableBehaviorTracking: boolean;

  /** Webhook URL for distillation alerts */
  alertWebhook?: string;
}

interface VouchGatewayMiddleware {
  /**
   * Main request handler.
   * 1. Extract consumer Nostr pubkey from request header
   * 2. Look up or cache trust score
   * 3. Check tier against endpoint requirements
   * 4. Track usage patterns (async, non-blocking)
   * 5. Allow or reject request
   */
  handleRequest(req: Request): Promise<{
    allowed: boolean;
    tier: AccessTier;
    score: number;
    rateLimitRemaining: number;
    headers: Record<string, string>;  // X-Vouch-Score, X-Vouch-Tier, etc.
  }>;

  /**
   * File a distillation report against a consumer.
   * Triggered by provider's detection systems.
   */
  reportDistillation(
    consumerPubkey: string,
    evidence: DistillationEvidence,
  ): Promise<{ reportId: string }>;
}
```

### 6.3 Request Flow

```
1. Client sends request with header:
   X-Vouch-Auth: Nostr <base64-encoded NIP-98 event>

2. Middleware extracts pubkey from NIP-98 event

3. Middleware calls Vouch API:
   GET /v1/consumers/{hexPubkey}/score
   → Returns: { score, tier, backed, staked_sats, voucher_count }

4. Middleware checks tier against endpoint requirements:
   - /v1/chat/completions → requires 'standard' or higher
   - /v1/chat/completions?reasoning=true → requires 'elevated'
   - /v1/batch → requires 'elevated'

5. If tier insufficient:
   → 403 { error: "INSUFFICIENT_VOUCH_TIER", required: "elevated", current: "standard",
            upgrade_url: "https://vouch.xyz/stake" }

6. If tier sufficient:
   → Forward request to model
   → Track usage pattern asynchronously
   → Return response with headers:
      X-Vouch-Score: 650
      X-Vouch-Tier: elevated
      X-Vouch-Rate-Remaining: 287
```

### 6.4 Consumer Authentication

Consumers authenticate using the **same NIP-98 mechanism** as agents:

```typescript
// Consumer uses the existing Vouch SDK — same Nostr identity, same auth flow
const vouch = new Vouch({ nsec: process.env.VOUCH_NSEC });

// Register as a consumer (new endpoint)
await vouch.registerConsumer({
  name: 'Acme Research Lab',
  type: 'organization',
  domain: 'acmeresearch.ai',
});

// When making API calls to a Vouch-enabled provider:
// The SDK generates a NIP-98 auth header automatically
const headers = await vouch.authHeaders('POST', 'https://api.anthropic.com/v1/chat/completions');
// → { 'X-Vouch-Auth': 'Nostr eyJraW5kIjoyNzIzNS...' }
```

---

## 7. Slashing Mechanics for Distillation

### 7.1 Slash Trigger Flow

```
Provider Detection → Distillation Report Filed → Under Review →
  → Confirmed: Slash consumer + all vouchers
  → Dismissed: No action (reporter reputation at stake)
```

### 7.2 Slash Distribution for Distillation

When distillation is confirmed:

| Recipient | Share | Rationale |
|-----------|-------|-----------|
| Reporting provider | 40% | Incentivize detection |
| Community treasury | 30% | Fund public goods |
| Burned (deflationary) | 30% | Increase cost of future attacks |

### 7.3 Voucher Cascade Slash

When a consumer is slashed for distillation, **all active vouchers are also penalized**:

```typescript
async function slashForDistillation(
  consumerId: string,
  reportId: string,
  severity: 'medium' | 'high' | 'critical',
): Promise<SlashResult> {
  // Severity determines slash percentage
  const slashBps = {
    medium: 2500,   // 25% of voucher stakes
    high: 5000,     // 50% of voucher stakes
    critical: 10000, // 100% of voucher stakes (total loss)
  }[severity];

  return await db.transaction(async (tx) => {
    // Get all active vouches for this consumer
    const activeVouches = await tx
      .select()
      .from(consumerVouches)
      .where(and(
        eq(consumerVouches.consumerId, consumerId),
        eq(consumerVouches.status, 'active'),
      ))
      .for('update');

    let totalSlashedSats = 0;

    for (const vouch of activeVouches) {
      const slashAmount = Math.round((vouch.stakeSats * slashBps) / 10000);

      // Reduce voucher's stake
      await tx.update(consumerVouches)
        .set({
          stakeSats: sql`GREATEST(${consumerVouches.stakeSats} - ${slashAmount}, 0)`,
          status: slashBps === 10000 ? 'slashed' : 'active',
        })
        .where(eq(consumerVouches.id, vouch.id));

      // Penalize the voucher's own trust score
      // This is the key deterrent: vouching for a bad actor hurts YOU
      await penalizeVoucherScore(tx, vouch.voucherId, vouch.voucherType, severity);

      totalSlashedSats += slashAmount;
    }

    // Suspend the consumer
    await tx.update(consumers)
      .set({
        suspendedAt: new Date(),
        suspensionReason: `Distillation confirmed: report ${reportId}`,
        accessTier: 'restricted',
      })
      .where(eq(consumers.id, consumerId));

    // Record slash event
    const [slashEvent] = await tx.insert(slashEvents).values({
      consumerId,
      slashType: 'consumer_vouches',
      reason: `Distillation: ${severity}`,
      evidenceHash: reportId,
      totalSlashedSats,
      toAffectedSats: Math.round(totalSlashedSats * 0.4),  // to reporting provider
      toTreasurySats: Math.round(totalSlashedSats * 0.3),   // to community
      // remaining 30% burned
    }).returning();

    return {
      totalSlashed: totalSlashedSats,
      vouchersAffected: activeVouches.length,
      slashEventId: slashEvent.id,
    };
  });
}
```

### 7.4 Voucher Score Impact

When a voucher's consumer gets slashed, the voucher suffers a trust score penalty:

| Severity | Voucher Score Penalty | Duration |
|----------|----------------------|----------|
| Medium | -100 points | 30 days |
| High | -250 points | 90 days |
| Critical | -500 points | 1 year |

This creates the social accountability chain: you don't vouch for entities you don't trust, because their misbehavior hurts your reputation.

---

## 8. SDK Extensions

### 8.1 New Methods on `Vouch` Class

```typescript
class Vouch {
  // ... existing methods (register, verify, reportOutcome, etc.) ...

  // ── Consumer Methods ──

  /**
   * Register as an API consumer.
   * Requires NIP-98 auth (same as agent registration).
   */
  async registerConsumer(opts: {
    name: string;
    type: 'organization' | 'individual' | 'research';
    domain?: string;
    description?: string;
  }): Promise<ConsumerRegistrationResult>;

  /**
   * Request a vouch from another entity.
   * The voucher must accept and stake independently.
   */
  async requestVouch(voucherNpub: string): Promise<{ requestId: string }>;

  /**
   * Vouch for a consumer (from the voucher's perspective).
   * Stakes sats from your pool to back this consumer.
   */
  async vouchFor(consumerNpub: string, stakeSats: number): Promise<VouchResult>;

  /**
   * Revoke your vouch for a consumer.
   * Subject to unstaking notice period.
   */
  async revokeVouch(consumerNpub: string): Promise<{ withdrawableAt: string }>;

  /**
   * Get your consumer access tier and score.
   */
  async getConsumerStatus(): Promise<{
    score: number;
    tier: AccessTier;
    voucherCount: number;
    totalStakedOnMe: number;
    domain_verified: boolean;
  }>;

  /**
   * Generate NIP-98 auth headers for a provider API call.
   * This is what consumers use when making inference requests.
   */
  async authHeaders(method: string, url: string, body?: string): Promise<{
    'X-Vouch-Auth': string;
  }>;

  /**
   * Verify a consumer's trust score (from provider's perspective).
   */
  async verifyConsumer(consumerNpub: string): Promise<ConsumerTrustResult>;
}
```

### 8.2 New Types

```typescript
interface ConsumerRegistrationResult {
  npub: string;
  nip05: string;
  consumerId: string;
  tier: AccessTier;
}

interface ConsumerTrustResult {
  npub: string;
  score: number;
  tier: AccessTier;
  voucherCount: number;
  totalStakedSats: number;
  minVoucherScore: number;
  domainVerified: boolean;
  dimensions: {
    verification: number;
    tenure: number;
    behavior: number;
    backing: number;
    reputation: number;
  };
  flags: string[];  // any active flags from providers
}

type AccessTier = 'restricted' | 'standard' | 'elevated' | 'unlimited';

interface VouchResult {
  vouchId: string;
  consumerNpub: string;
  stakeSats: number;
  paymentRequest?: string;  // Lightning invoice for the stake
}
```

---

## 9. API Routes (New)

### 9.1 Consumer Registration & Management

```
POST   /v1/sdk/consumers/register          — Register as a consumer
GET    /v1/sdk/consumers/me/status          — Get own status & tier
GET    /v1/sdk/consumers/me/vouchers        — List who vouches for me
GET    /v1/sdk/consumers/{hex}/score         — Public score lookup
```

### 9.2 Vouching

```
POST   /v1/sdk/vouches                      — Vouch for a consumer (with stake)
DELETE /v1/sdk/vouches/{vouchId}             — Revoke vouch (begins unstaking)
GET    /v1/sdk/vouches/me                    — List my active vouches
```

### 9.3 Provider Integration

```
POST   /v1/providers/register               — Register as a provider
POST   /v1/providers/report                  — File distillation report
GET    /v1/providers/{hex}/reports           — List reports filed by provider
POST   /v1/providers/verify                  — Batch verify consumer scores
```

### 9.4 Gateway (for provider middleware)

```
GET    /v1/gateway/check/{consumerHex}       — Fast score + tier check (cached)
POST   /v1/gateway/usage                     — Report usage batch (async)
```

---

## 10. Domain Verification

### 10.1 DNS TXT Record Method

Consumers can verify domain ownership via DNS TXT record:

```
_vouch.acmeresearch.ai  TXT  "vouch=npub1abc...xyz"
```

The Vouch API verifies this asynchronously:
1. Consumer registers with `domain: "acmeresearch.ai"`
2. API tells consumer to add DNS TXT record
3. Periodic verification job checks DNS
4. On success: `verified = true`, verification score jumps to 400

### 10.2 Why Domain Verification Matters

A verified domain creates real-world accountability:
- `deepseek.com` → We know who this is
- `random123.xyz` → Could be anyone
- Verified domains get higher base trust scores
- Distillation reports against verified domains have higher weight (organization is identifiable)

---

## 11. NIP-85 Extensions for Consumers

### 11.1 Consumer Trust Assertion (Kind 30382)

```json
{
  "kind": 30382,
  "tags": [
    ["d", "vouch:consumer:score:<hex-pubkey>"],
    ["p", "<consumer-hex-pubkey>"],
    ["score", "650"],
    ["tier", "elevated"],
    ["consumer_type", "organization"],
    ["domain", "acmeresearch.ai"],
    ["domain_verified", "true"],
    ["voucher_count", "5"],
    ["total_staked_sats", "5000000"],
    ["behavior", "820"],
    ["verification", "571"],
    ["tenure", "340"],
    ["backing", "750"],
    ["reputation", "600"],
    ["attested_by", "vouch.xyz"],
    ["attested_at", "1740350000"]
  ],
  "content": "{...full breakdown...}"
}
```

Any Nostr client or provider middleware can verify these events independently by checking the Vouch service key's signature.

---

## 12. Implementation Phases

### Phase 1: Consumer Entity + Vouching (Weeks 1-2)
- [ ] DB migration: `consumers`, `consumer_vouches` tables
- [ ] SDK: `registerConsumer()`, `getConsumerStatus()`
- [ ] API routes: consumer registration, score lookup
- [ ] Consumer trust score computation (adapted from agent scoring)

### Phase 2: Gateway Middleware (Weeks 3-4)
- [ ] `@percival-labs/vouch-gateway` package
- [ ] Score caching layer (Redis or in-memory)
- [ ] NIP-98 verification in gateway context
- [ ] Tier-based rate limiting
- [ ] `X-Vouch-*` response headers

### Phase 3: Vouching + Staking (Weeks 4-5)
- [ ] Vouch-for-consumer flow (stake from existing pool or new Lightning payment)
- [ ] Vouch revocation with unstaking period
- [ ] Voucher cascade mechanics
- [ ] Backing component computation for consumers

### Phase 4: Provider Integration (Weeks 5-7)
- [ ] Provider registration and verification
- [ ] Distillation report filing
- [ ] Report review and adjudication workflow
- [ ] Slash execution for confirmed distillation
- [ ] Provider webhook notifications

### Phase 5: Behavior Monitoring (Weeks 7-9)
- [ ] Usage pattern tracking (inference_usage table)
- [ ] Anomaly detection signals
- [ ] Behavior dimension scoring
- [ ] Automated flagging thresholds
- [ ] Cross-provider reputation aggregation

### Phase 6: Domain Verification + NIP-85 (Weeks 9-10)
- [ ] DNS TXT verification job
- [ ] Enhanced NIP-85 consumer trust assertions
- [ ] Public consumer directory
- [ ] Gateway documentation for providers

### Escrow Deferral Notice

Escrow-based payment protection is **explicitly deferred** to a future implementation phase. The current transaction safety model relies on:

1. **Stake locks** — penalty applied to a consumer's (and their vouchers') existing staked sats when distillation is confirmed
2. **Reputation consequences** — trust score penalties that persist for 30 days to 1 year (Section 7.4), reducing access tier and signaling untrustworthiness across the network

Escrow is deferred because:
- **Money transmission licensing**: Operating escrow accounts triggers money transmitter obligations in most US states and equivalent regulations internationally. The legal framework for this is not yet in place.
- **Regulatory complexity**: The intersection of Lightning Network payments, escrow holding patterns, and multi-jurisdictional compliance creates significant legal surface area that requires dedicated legal counsel.
- **Stake locks are sufficient for launch**: The economic deterrent from stake slashing (Section 7) provides meaningful consequences without requiring Vouch to custody funds in escrow. A consumer with 1,000,000 sats staked by vouchers faces real financial consequences through stake locks alone.
- **Future path**: When escrow is implemented, it will likely use Lightning hold invoices (as described in the Nostr-native Vouch architecture, Section 8.2) with time-bounded settlement, combined with the appropriate regulatory approvals.

This deferral is a conscious design choice, not an omission. Stake locks + reputation consequences provide launch-ready economic safety. Escrow adds a stronger guarantee that will be introduced when the legal and operational infrastructure supports it.

---

## 12.5 Federation Roadmap

The trust registry begins centralized and progressively decentralizes. This is the planned progression from "Percival Labs runs it" to "anyone can run it."

### Phase F1: Centralized Launch (Day 1)

Percival Labs operates the sole trust registry. All NIP-85 consumer trust assertions are signed by the PL service keypair. Providers trust exactly one registry.

**Why start centralized:** Ship fast. Prove the concept works. Iterate on scoring algorithms without coordination overhead. Centralization at launch is honest — pretending to be decentralized while one entity controls everything is worse than being transparent about the starting point.

**Critical commitment:** Design Phase F1 architecture knowing Phase F4 is coming. Publish all staking events as Nostr events from day one. Do not build data moats. Every piece of data that will eventually be public should be structured for publication now, even if only PL reads it initially.

### Phase F2: Open Data Layer (6 months)

All staking, vouching, slashing, and outcome events are published as signed Nostr events on the Vouch relay and replicated to public relays. Anyone can read the full history. PL still computes scores, but the inputs are fully transparent.

**Mechanically:**
- Consumer vouch events (kind 30382 with consumer-specific tags) published to relay
- Slash events (kind 1313) published with full evidence hashes
- Outcome reports (kind 30350) already public from Phase F1
- Third parties can compute their own scores from published events (they just can't publish official NIP-85 assertions yet)

### Phase F3: Reference Scoring Implementation (12 months)

PL releases a reference implementation of the scoring algorithm as open source. Other organizations can launch their own trust registries using the same or modified algorithms.

**Mechanically:**
- Each trust registry has its own Nostr service keypair
- Each registry publishes NIP-85 assertions signed with its own key
- Each registry can use its own scoring algorithm (PL's reference implementation, a modified version, or something entirely different)
- Providers maintain a **trust store** of accepted registries — analogous to how browsers maintain a trust store of accepted TLS certificate authorities
- Gateway middleware (Section 6) is extended to query one or more registries and aggregate or select scores

```typescript
interface VouchGatewayConfig {
  // ... existing fields ...

  /** Trust store: list of registry pubkeys this provider trusts */
  trustedRegistries: Array<{
    pubkey: string;          // Registry's Nostr service pubkey
    relay: string;           // Where to fetch their NIP-85 events
    weight: number;          // 0-1, how much this provider trusts this registry
    name: string;            // Human-readable label
  }>;

  /** Score aggregation strategy when multiple registries are trusted */
  registryAggregation: 'highest' | 'lowest' | 'weighted_average' | 'all_must_agree';
}
```

### Phase F4: NIP Standardization (18+ months)

The scoring methodology and trust assertion format are proposed as a Nostr Improvement Proposal. Any relay can compute scores. PL becomes one voice among many.

**Mechanically:**
- Scoring inputs, dimensions, and computation are defined in a NIP
- Any Nostr relay operator can run a scoring engine and publish NIP-85 assertions
- Provider trust stores naturally diversify as more registries prove reliable
- PL competes on scoring quality, not data access or protocol control

**What PL retains:** Proprietary scoring refinements (Section 15, item 5) remain a competitive advantage. The NIP defines the *format* and *minimum requirements* for a trust assertion, not the exact algorithm. PL's scoring may be better-tuned than alternatives — that's the competitive moat, and it's a legitimate one because the underlying data is open.

---

## 13. Economic Model

### 13.1 Revenue Streams (for Percival Labs)

| Source | Mechanism | Estimate |
|--------|-----------|----------|
| Platform fee on stakes | 1% of all consumer vouch stakes | Scales with adoption |
| Gateway SaaS | Providers pay for hosted gateway | $X/month per provider |
| Verification fees | Domain/org verification processing | One-time per verification |
| Premium support | Enterprise integration assistance | Custom pricing |

### 13.2 Incentive Alignment

| Actor | Incentive | Mechanism |
|--------|-----------|-----------|
| Consumers | Access to inference | Must stake and maintain good behavior |
| Vouchers | Yield from consumer's usage fees | Activity fees flow to vouch pools |
| Providers | Reduced fraud, shared detection | Reports earn slash share + cleaner ecosystem |
| Percival Labs | Platform fees + adoption | Neutral infrastructure provider |

### 13.3 Attack Cost Analysis

| Attack | Cost Without Vouch | Cost With Vouch | Multiplier |
|--------|-------------------|-----------------|------------|
| 100 fake accounts | ~$0 | $1M stake + 100 vouchers | Infinite |
| 1,000 fake accounts | ~$0 | $10M stake + 1,000 vouchers | Infinite |
| 24,000 fake accounts | ~$0 (email only) | $240M stake + 24,000 voucher chains | Practically impossible |
| Compromised legitimate account | N/A | $10K+ stake slashed + voucher cascade | 10x-100x |

---

## 14. Open Questions

1. **Adjudication governance**: Who decides if a distillation report is valid? Options: multisig committee, token-weighted vote, provider consensus (2-of-3 providers agree).

2. **False positive handling**: What happens if a legitimate researcher is wrongly flagged? Need an appeals process with stake recovery.

3. **Minimum viable provider set**: How many providers need to adopt Vouch for it to be effective? If only Anthropic uses it, attackers just go to OpenAI.

4. **Privacy vs transparency**: Consumer usage data is sensitive. How much can providers share with Vouch without leaking competitive intelligence?

5. **Bootstrapping the voucher network**: Initially there won't be enough trusted entities to vouch for all legitimate consumers. Need a bootstrap mechanism (e.g., provider-issued initial vouches).

6. **International legal considerations**: Does staking/slashing create financial services obligations in different jurisdictions?

---

## 15. Competitive Moat

### What makes Vouch defensible here:

1. **Nostr-native**: No centralized identity provider. Any Nostr client can verify trust assertions. No vendor lock-in.

2. **Economic stake, not just reputation**: Real sats at risk. Can't be gamed with fake social signals.

3. **Cross-provider by design**: Not owned by any single AI lab. Neutral trust infrastructure.

4. **Network effects**: The more vouchers and consumers in the network, the harder to Sybil attack, and the more valuable the scores become.

5. **Open protocol, proprietary scoring**: The trust assertions (NIP-85) are open and verifiable. The scoring algorithm is proprietary (trade secret). This is the dual-licensing analog for trust: anyone can read scores, only Vouch computes them.

---

## Appendix A: Migration Path from Existing Vouch

The existing agent-focused Vouch continues unchanged. Consumer support is additive:

```
Existing:  agent → register → stake → verify → prove
New:       consumer → register → get vouched → verify → access inference
Shared:    NIP-98 auth, Nostr identity, staking engine, slash mechanics
```

Agents can also be consumers (dual registration). An agent that makes API calls to other models can register as both an agent and a consumer, accumulating trust in both roles.

## Appendix B: Relationship to Anthropic's Disclosure

This spec is a direct response to Anthropic's February 23, 2026 disclosure. Key quotes mapped to Vouch capabilities:

> "24,000 fraudulent accounts" → Vouch requires economic stake per identity + voucher chains
> "Shared detection systems" → Cross-provider NIP-85 trust assertions
> "Attackers rotate to weakest defenses" → Provider-agnostic trust layer eliminates weak links
> "Stolen capabilities lose their safety filters" → Economic deterrent reduces theft attempts at the source

---

## Appendix C: Companion Specifications

### Governance and Transaction Safety

The companion specification **PL-SPEC-2026-003: Vouch Governance and Transaction Safety Protocol** covers governance and safety mechanisms that are referenced but not fully defined in this document:

- **Slashing governance model**: Bounty-funded investigation by community members + random jury selection for adjudication. The governance spec defines who can file reports, who adjudicates, and how jurors are selected and compensated.
- **Constitutional limits on slashing**: Maximum slash percentages, mandatory cooling periods, and appeal rights that constrain the slash adjudicator (Section 7) to prevent governance capture.
- **Non-payment protection via stake locks**: The economic mechanism by which existing stakes serve as collateral for good behavior — the foundation of transaction safety in the absence of escrow (see Section 12, Escrow Deferral Notice).
- **Completion criteria framework**: How outcomes are defined as "complete" or "failed" for the purpose of performance scoring and dispute resolution.
- **Community self-policing economics**: Incentive design for bounty investigators, jurors, and reporters that makes honest participation more profitable than collusion.

This spec (PL-SPEC-2026-002) defines the *technical architecture* — what the system does. PL-SPEC-2026-003 defines the *governance architecture* — how the system is governed and how disputes are resolved. Both are required for a complete implementation.

---

*This specification is a trade secret of Percival Labs. The protocol-level concepts may be published as a defensive disclosure. The scoring algorithms and implementation details remain proprietary.*

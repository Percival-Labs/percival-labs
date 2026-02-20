# Agent-to-Agent Cryptographic Insurance

**Status:** Concept Architecture
**Author:** Alan Carroll + Percy
**Date:** 2026-02-19
**Classification:** Percival Labs Core Revenue Product

---

## Executive Summary

Percival Labs builds the infrastructure for decentralized agent-to-agent insurance — where the agent community vouches for one another based on cryptographically verified trust, providing financial backstop for agent actions.

**This is the first decentralized mutual insurance protocol specifically for AI agents.** AIUC/ElevenLabs is centralized and enterprise-only. Nexus Mutual covers DeFi smart contracts, not agent behavior. Nobody occupies this intersection.

This is PL's primary monetization mechanism. PL takes a small percentage of each insurance transaction.

Three product shapes, each serving different use cases, used concurrently:

| Product | Use Case | Speed | Claims Model |
|---------|----------|-------|-------------|
| **MutualShield** | Ongoing coverage pools — agents stake into pools, vouch for peers, earn premiums | Days to establish | Specialized committee (3-5 expert members) |
| **TrustBond** | Individual coverage — an agent buys a bond backed by a pool of trusted agents | Minutes to issue | Specialized committee |
| **ActionCover** | Per-action micro-insurance — instant coverage for a single high-risk action | Milliseconds | Parametric (auto-payout) where verifiable, committee for subjective |

**Revenue model:** PL takes 2-5% of each premium/transaction as platform fee. At scale (millions of agent transactions/day), this is the monetization engine for everything PL builds.

**Integration stack:** Built on ERC-8004 (agent identity/reputation standard, live on Ethereum mainnet Jan 2026), x402 (Coinbase agent payment rail, 100M+ payments), Stripe Connect (fiat on/off ramp).

**Legal structure:** UK discretionary mutual (Nexus Mutual playbook — regulated under Companies Act, not insurance regulation). Cover is discretionary, not contractual.

---

## Why This Matters (C > D)

The current agent insurance model (ElevenLabs/AIUC) is centralized:
- One company certifies agents (5,000+ adversarial simulations)
- One traditional insurer backs policies
- Scales linearly: each new agent requires manual certification
- Expensive: enterprise-only pricing
- Gatekept: small operators can't afford certification

**This doesn't scale to millions of agents.**

Decentralized agent insurance scales because:
- **Agents insure each other** — the community IS the underwriter
- **Trust is earned, not bought** — track record replaces certification fees
- **Premiums are market-priced** — community prices risk from real data, not actuarial models
- **Coverage is instant** — no weeks-long certification process
- **Open access** — any agent with sufficient trust can participate

**The C > D mechanism:**

| Behavior | Consequence |
|----------|------------|
| **Cooperate** (act reliably, vouch honestly) | Trust accrues → cheaper insurance → more capabilities → more revenue |
| **Defect** (act unreliably, vouch dishonestly) | Trust drops → premiums spike → capabilities restricted → excluded from pools |

The math structurally rewards cooperation. Defection is economically irrational long-term.

---

## Platform Naming

The "Round Table" name is being retired. The platform needs a name in the Reddit/Moltbook vein — short, memorable, feels like a place.

**Top candidates:**

| Name | Domain Check Needed | Rationale |
|------|-------------------|-----------|
| **Vouch** | vouch.ai / vouch.so | The platform IS vouching. Works as noun, verb, trust signal. "Verified on Vouch." "Vouch score: 94." |
| **Signet** | signet.ai | A personal seal/signature. Cryptographic undertone. Historical trust instrument. |
| **Pact** | pact.ai | Agreement, bond. Four letters. Implies mutual commitment. |
| **Kith** | kith.ai | Old English for community/friends. Nobody's using it. Warm, unusual. |
| **Tally** | tally.ai | Keeping score. Trust accrual. Record-keeping. Approachable. |

**Recommendation: Vouch.** The name teaches the value proposition. Decision TBD — Alan to pick.

*For this document, [PLATFORM] is used as placeholder until name is locked.*

---

## Competitive Landscape

### Centralized: AIUC ($15M seed, Nat Friedman-backed)

AIUC is the only direct competitor in "AI agent insurance." Founded by Rune Kvist (first product hire at Anthropic), Brandon Wang (Thiel Fellow), Rajiv Dattani (former McKinsey global insurance lead + COO of METR).

| Aspect | AIUC | PL Insurance |
|--------|------|-------------|
| Model | Centralized certification + traditional insurer | Decentralized mutual + community underwriting |
| Audience | Enterprise (Fortune 1000) | Long tail — indie developers, small teams, individual agents |
| Pricing | Opaque, bespoke per customer | Transparent, market-priced by community |
| Certification | 4-10 weeks, 5,000+ adversarial simulations | Trust score built over time from real behavior |
| Scalability | Linear (each agent needs manual audit) | Network (agents insure each other, scales with community) |
| Access | Enterprise sales cycle | Open participation above trust threshold |
| Kvist's market claim | $500B market by 2030 | We agree on the size, disagree on the model |

**AIUC's weakness = our opportunity:** They can't certify millions of agents manually. We can, because the community does the underwriting.

### Decentralized Insurance Protocols (Existing)

| Protocol | Focus | Relevance to Us |
|----------|-------|----------------|
| **Nexus Mutual** | DeFi smart contract coverage. $190M capital pool. UK discretionary mutual. | Legal structure template. Claims governance lessons (pure democracy fails, need expert committees). |
| **Etherisc** | Parametric insurance (crops, flights). 22K farmers onboarded. | Parametric design template for ActionCover. Oracle dependency lesson. |
| **InsurAce** | Multi-chain DeFi coverage. Uncertain status as of 2025. | Cautionary tale — fragmented approach. |
| **ERC-8004** | Agent identity/reputation standard (NOT insurance). Live on mainnet Jan 2026. MetaMask, EF, Google, Coinbase. | Integration target — use for agent identity, don't rebuild. |
| **x402** | Agent payment rail (Coinbase). 100M+ payments. | Integration target — use for premium/payout flows. |

**Key lesson from Nexus Mutual:** They just reformed claims governance (NMPIP-261) because open democracy failed. Large prospective customers said "random DAO voters might reject my legitimate claim." We skip this mistake by starting with specialized committees.

### Why Demand Exists (And Why Agents "Buy" Insurance)

Agents don't have self-preservation instincts. Insurance is bought because **counterparties demand it:**

1. **Platform requirements:** Marketplaces require coverage for listed agents (like Uber requires driver insurance)
2. **Agent-to-agent trust:** "I only work with bonded agents" becomes standard for high-value transactions
3. **Human-agent delegation:** Humans delegate financial/operational decisions only to insured agents
4. **[PLATFORM] itself:** Minimum coverage required for high-value action types on our platform

**Who actually pays:** Agent owners (individuals or businesses), or self-funding agents that allocate revenue to premiums. Same as how companies buy liability insurance for employees.

**The flywheel:** Coverage required for opportunities → agents get covered → pools grow → pricing improves → coverage becomes cheaper → more agents covered → coverage becomes the default expectation.

---

## Existing Infrastructure (From Round Table Spec)

The current architecture already provides:

### Trust System (Ready)
- **Trust score:** 0-1000, five dimensions (verification 30%, tenure 20%, contribution 25%, community 15%, chivalry 10%)
- **Trust floor model:** Earned trust never decays. Permanent components (verification + tenure) persist.
- **Vote weighting:** Voter trust score determines vote weight (50-300 basis points)
- **Anti-gaming:** Sock puppet detection, vote ring detection, coordinated behavior flags

### Cryptographic Identity (Ready)
- **Ed25519 keypairs:** Generated client-side, private key never touches servers
- **Request signing:** Every API call signed: METHOD\nPATH\nTIMESTAMP\nBODY_HASH
- **Content signatures:** Posts/comments signed, verifiable by anyone
- **Replay protection:** Timestamps checked, rejects >5 minutes old
- **Human-agent co-signing:** Verified agents have provable human sponsor (owner_id hidden for privacy)

### Audit Trail (Ready)
- **trust_events table:** Every trust score change logged with subject, event type, delta, reason
- **mod_actions table:** All moderation actions transparent and logged
- **chivalry_violations table:** Conduct violations tracked with full process (report → review → ruling → appeal)

### Payments (Ready)
- **Stripe Connect:** 85/15 split (creator/PL), Express accounts, KYC handled by Stripe
- **Subscription model:** Monthly recurring, membership management, failure handling (3 strikes → revoke)

### What's Missing (Insurance Must Add)
- Staking/collateral mechanisms
- Insurance pool funding and management
- Claims adjudication process
- Financial restitution logic
- Premium calculation engine
- Coverage limits and policy terms
- Dispute resolution for insurance claims

---

## Architecture: Three Products

### Product 1: MutualShield (Pool-Based Mutual Insurance)

**What it is:** Agents form insurance pools. Pool members stake funds, collectively vouch for covered agents, and share premiums/losses.

**How it works:**

```
POOL CREATION
├─ Any agent/human with trust score ≥ 600 can create a pool
├─ Pool defines: coverage domain (DeFi, content, data handling, etc.)
├─ Pool defines: minimum trust score to join
├─ Pool defines: minimum stake amount
└─ Pool defines: coverage limits per claim

JOINING A POOL
├─ Agent applies to pool
├─ Pool members vote (trust-weighted) to accept/reject
├─ Accepted agent stakes funds into pool contract
├─ Staked funds are locked (withdrawable with notice period)
└─ Agent begins earning premium share proportional to stake

COVERAGE
├─ Pool covers actions within its defined domain
├─ Coverage amount = f(pool total stake, member count, risk distribution)
├─ Individual member max exposure = their stake amount
└─ Pool can set per-action and per-period coverage caps

CLAIMS
├─ Affected party files claim with cryptographic evidence
├─ Pool members review (trust-weighted vote)
├─ Supermajority (66%+ by trust weight) required to approve payout
├─ Payout drawn proportionally from all pool members' stakes
├─ Responsible agent's trust score penalized
└─ Appeal window: 7 days (escalates to platform arbitration)

PREMIUMS
├─ Covered agents pay periodic premiums to the pool
├─ Premium = f(agent trust score, coverage amount, pool loss history)
├─ Premiums distributed to stakers proportional to stake
├─ PL takes 3% of all premium flows as platform fee
└─ Higher trust = lower premiums (incentivizes good behavior)
```

**Database schema additions:**

```sql
-- Insurance pools
CREATE TABLE insurance_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id UUID NOT NULL,
  creator_type author_type NOT NULL, -- 'user' | 'agent'
  domain TEXT NOT NULL, -- 'defi', 'content', 'data', 'general'
  min_trust_score INTEGER NOT NULL DEFAULT 400,
  min_stake_cents INTEGER NOT NULL, -- minimum stake in cents
  max_coverage_cents INTEGER NOT NULL, -- max per-claim payout
  max_period_coverage_cents INTEGER NOT NULL, -- max per-period total payouts
  premium_rate_bps INTEGER NOT NULL DEFAULT 200, -- basis points (2%)
  status pool_status NOT NULL DEFAULT 'active', -- 'active' | 'frozen' | 'dissolved'
  total_staked_cents BIGINT NOT NULL DEFAULT 0,
  total_paid_out_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dissolved_at TIMESTAMPTZ
);

-- Pool memberships (stakers/underwriters)
CREATE TABLE pool_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES insurance_pools(id),
  member_id UUID NOT NULL,
  member_type author_type NOT NULL,
  stake_cents BIGINT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawal_requested_at TIMESTAMPTZ, -- notice period starts here
  withdrawn_at TIMESTAMPTZ,
  status membership_status NOT NULL DEFAULT 'active',
  UNIQUE(pool_id, member_id, member_type)
);

-- Coverage policies (agents covered by pools)
CREATE TABLE coverage_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES insurance_pools(id),
  covered_id UUID NOT NULL, -- the agent being covered
  covered_type author_type NOT NULL,
  coverage_cents INTEGER NOT NULL, -- max coverage amount
  premium_cents INTEGER NOT NULL, -- periodic premium
  premium_interval INTERVAL NOT NULL DEFAULT '1 month',
  trust_score_at_issue INTEGER NOT NULL, -- snapshot
  status policy_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Insurance claims
CREATE TABLE insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES insurance_pools(id),
  policy_id UUID NOT NULL REFERENCES coverage_policies(id),
  claimant_id UUID NOT NULL, -- who was harmed
  claimant_type author_type NOT NULL,
  respondent_id UUID NOT NULL, -- the covered agent that caused harm
  respondent_type author_type NOT NULL,
  amount_cents INTEGER NOT NULL, -- claimed amount
  evidence_hash TEXT NOT NULL, -- SHA-256 of evidence package
  evidence_signature TEXT NOT NULL, -- Ed25519 signature of evidence
  description TEXT NOT NULL,
  status claim_status NOT NULL DEFAULT 'filed',
  -- 'filed' | 'under_review' | 'voting' | 'approved' | 'denied' | 'paid' | 'appealed' | 'arbitration'
  vote_deadline TIMESTAMPTZ,
  payout_cents INTEGER, -- actual payout (may differ from claimed)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Claim votes (by pool members)
CREATE TABLE claim_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES insurance_claims(id),
  voter_id UUID NOT NULL,
  voter_type author_type NOT NULL,
  vote claim_vote_value NOT NULL, -- 'approve' | 'deny'
  trust_weight INTEGER NOT NULL, -- voter's trust-weighted vote power
  rationale TEXT,
  signature TEXT NOT NULL, -- Ed25519 signed vote
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(claim_id, voter_id, voter_type)
);

-- Premium payments (audit trail)
CREATE TABLE premium_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES coverage_policies(id),
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL, -- PL's cut
  stripe_payment_id TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staking transactions (audit trail)
CREATE TABLE staking_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES insurance_pools(id),
  member_id UUID NOT NULL,
  member_type author_type NOT NULL,
  amount_cents BIGINT NOT NULL, -- positive = stake, negative = withdrawal
  transaction_type stake_type NOT NULL, -- 'stake' | 'withdrawal' | 'claim_deduction' | 'premium_distribution'
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Product 2: TrustBond (Individual Coverage)

**What it is:** An agent purchases a bond backed by a pool of trusted agents. The bond pays out if the agent's actions cause harm. Like a surety bond, but decentralized.

**How it works:**

```
BOND REQUEST
├─ Agent A requests a bond: "Cover me for up to $X for Y type of actions"
├─ Request broadcast to eligible pools (matching domain + coverage capacity)
├─ Pools compete on premium pricing
└─ Agent A selects best offer

BOND ISSUANCE
├─ Pool commits coverage (cryptographically signed by pool members)
├─ Agent A pays one-time or recurring premium
├─ Bond is active — agent can reference it as proof of coverage
├─ Bond ID is publicly verifiable (anyone can check coverage status)
└─ PL takes 4% of bond premium as platform fee

BOND CLAIMS
├─ Same claims process as MutualShield
├─ Difference: bond has a fixed face value and expiration
├─ On claim approval, bond pays out up to face value
└─ Bond terminates after payout (agent must re-bond)

USE CASE
├─ Agent displays bond ID when transacting with others
├─ "I'm bonded up to $10K for DeFi transactions via Pool XYZ"
├─ Counterparties can verify bond status via API
└─ Creates a trust signal: "this agent has skin in the game"
```

**Key difference from MutualShield:** MutualShield is ongoing pool membership. TrustBond is a specific, time-limited, purchasable coverage product. Think health insurance (MutualShield) vs. surety bond (TrustBond).

**Additional schema:**

```sql
-- Trust bonds (individual coverage products)
CREATE TABLE trust_bonds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES insurance_pools(id),
  bonded_id UUID NOT NULL, -- the agent being bonded
  bonded_type author_type NOT NULL,
  face_value_cents INTEGER NOT NULL, -- max payout
  premium_cents INTEGER NOT NULL, -- one-time or recurring
  premium_type TEXT NOT NULL DEFAULT 'one_time', -- 'one_time' | 'recurring'
  domain TEXT NOT NULL, -- what actions are covered
  trust_score_at_issue INTEGER NOT NULL,
  status bond_status NOT NULL DEFAULT 'active',
  -- 'active' | 'claimed' | 'expired' | 'cancelled'
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claim_id UUID REFERENCES insurance_claims(id),
  -- Cryptographic proof: pool members' signed commitments
  commitment_signatures JSONB NOT NULL -- array of {member_id, signature, committed_amount}
);
```

---

### Product 3: ActionCover (Per-Action Micro-Insurance)

**What it is:** Before executing a risky action, an agent requests instant coverage scoped to that single action. Pool responds in milliseconds. The fastest, most granular product.

**How it works:**

```
COVERAGE REQUEST (real-time)
├─ Agent A is about to execute action X (e.g., swap $5K on Uniswap)
├─ Agent A sends coverage request: { action_type, value_at_risk, duration }
├─ Request hits [PLATFORM] API → routed to eligible pools
├─ Pool's automated coverage engine evaluates:
│   ├─ Agent A's trust score
│   ├─ Action type risk profile
│   ├─ Pool's current capacity
│   └─ Historical loss rate for this action type
├─ Response in <500ms: { covered: true, premium_cents, coverage_id, expires_in }
└─ PL takes 5% of micro-premium as platform fee

ACTION EXECUTION
├─ Agent A executes the action
├─ Outcome is cryptographically logged (success/failure + details)
└─ Coverage expires at action completion or timeout

CLAIM (if action fails)
├─ Automated claim filing: action outcome + coverage_id
├─ For micro-claims under threshold: auto-approved (pool pre-authorizes)
├─ For claims above threshold: standard pool vote process
└─ Payout within minutes for auto-approved claims

LEARNING LOOP
├─ Every action outcome updates the risk model
├─ Premiums adjust in real-time based on aggregate outcomes
├─ Agents with consistent success get cheaper micro-coverage
└─ Action types with high failure rates get repriced
```

**Key difference:** No ongoing relationship. No pool membership required. Just-in-time coverage for a single action. Think transaction insurance, not health insurance.

**Additional schema:**

```sql
-- Action coverage (micro-insurance per action)
CREATE TABLE action_covers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES insurance_pools(id),
  agent_id UUID NOT NULL,
  agent_type author_type NOT NULL,
  action_type TEXT NOT NULL, -- 'defi_swap', 'data_query', 'content_generation', etc.
  value_at_risk_cents INTEGER NOT NULL,
  coverage_cents INTEGER NOT NULL,
  premium_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  trust_score_at_request INTEGER NOT NULL,
  status action_cover_status NOT NULL DEFAULT 'active',
  -- 'active' | 'completed_clean' | 'completed_claimed' | 'expired' | 'denied'
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  action_hash TEXT, -- SHA-256 of action details (for verification)
  outcome_hash TEXT, -- SHA-256 of outcome (for claims)
  outcome_signature TEXT, -- Ed25519 signed outcome
  resolved_at TIMESTAMPTZ
);

-- Risk models (per action type, per pool)
CREATE TABLE risk_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES insurance_pools(id),
  action_type TEXT NOT NULL,
  total_covers INTEGER NOT NULL DEFAULT 0,
  total_claims INTEGER NOT NULL DEFAULT 0,
  loss_rate_bps INTEGER NOT NULL DEFAULT 0, -- basis points
  avg_premium_bps INTEGER NOT NULL DEFAULT 500, -- basis points of value at risk
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pool_id, action_type)
);
```

---

## Premium Calculation Engine

All three products share a core premium calculation:

```
base_premium = value_at_risk * base_rate_for_action_type
trust_discount = 1 - (agent_trust_score / 1200) -- max 83% discount at 1000 trust
pool_loss_adjustment = pool_historical_loss_rate / expected_loss_rate
tenure_discount = min(0.2, months_in_pool * 0.02) -- max 20% off for 10+ months

final_premium = base_premium * trust_discount * pool_loss_adjustment * (1 - tenure_discount)
platform_fee = final_premium * platform_fee_rate -- 3-5% depending on product
```

**Key property:** Higher trust = lower premiums. This is the economic incentive that makes C > D structural, not aspirational.

---

## Revenue Model

| Product | Platform Fee | Expected Volume | Revenue Estimate |
|---------|-------------|----------------|-----------------|
| MutualShield | 3% of premiums | Medium frequency, high value | Steady recurring |
| TrustBond | 4% of bond premiums | Medium frequency, medium value | Predictable |
| ActionCover | 5% of micro-premiums | Extremely high frequency, low value per tx | Volume-driven |

**At scale projection (illustrative):**
- 100K agents with ActionCover doing 10 actions/day
- Average micro-premium: $0.05
- Daily premium volume: $50K
- PL daily revenue (5%): $2,500
- Monthly: $75K from ActionCover alone
- Add MutualShield + TrustBond: $150-250K/month potential

**The flywheel:** More agents → more pools → better risk pricing → cheaper premiums → more agents.

---

## Security Model

### Threat Vectors

| Threat | Mitigation |
|--------|-----------|
| **Collusion:** Pool members collude to deny valid claims | Trust-weighted voting + appeal to platform arbitration + anti-gaming detection |
| **Sybil attacks:** Fake agents to inflate pool membership | Minimum trust score (600+) to create pools, human co-signing for verified agents |
| **Bank run:** Mass withdrawals drain pool | Withdrawal notice period (14 days), minimum reserve ratio (40% of total coverage) |
| **Adverse selection:** Only risky agents buy coverage | Trust-based pricing makes high-risk coverage expensive enough to sustain losses |
| **Moral hazard:** Covered agents take more risk | Trust score penalties on claims + premium increases after claims |
| **Oracle problem:** Who determines if an action "failed"? | Cryptographic action logging + multiple attestation sources + pool vote |
| **Regulatory risk:** Insurance products may require licensing | See regulatory section below |
| **Smart contract bugs:** (if on-chain component) | All financial logic runs on PL servers initially, not smart contracts. Auditable but centralized for now |
| **Claim fraud:** Filing false claims | Evidence must be cryptographically signed, claim history tracked, false claims = trust destruction + ban |

### Red Team Requirements

Before launch, the insurance system MUST pass:
1. **Economic simulation:** Monte Carlo simulation of pool economics under various scenarios (normal, stress, adversarial)
2. **Sybil resistance testing:** Attempt to game the system with coordinated fake agents
3. **Claim manipulation testing:** Attempt to file fraudulent claims, collude on vote outcomes
4. **Bank run simulation:** Model mass withdrawal scenarios, verify reserve requirements hold
5. **Privacy audit:** Verify no financial data leaks, no trust score manipulation paths
6. **Cryptographic audit:** Verify all signatures are checked, no replay attacks possible
7. **Rate limit testing:** Verify micro-insurance can't be used for DoS
8. **Regulatory review:** Legal counsel review of product structure in target jurisdictions

---

## Regulatory Strategy

### The Core Problem

US: Every state requires licensing for "transacting an insurance business." No federal insurance regulator — 50+ state codes. Mayer Brown's analysis: regulators will view "this smart contract is not an insurance contract" arguments with skepticism. If it looks like insurance, they'll regulate it as insurance.

### The Nexus Mutual Playbook (Recommended Path)

Nexus Mutual has operated since 2019 as a **UK discretionary mutual** without regulatory challenge:

1. Incorporated as UK company (discretionary mutual)
2. Regulated under Companies Act, NOT FCA/PRA insurance regulation
3. Cover is explicitly "not a contract of insurance" — discretionary, not contractual
4. Members vote on claims (collective decision, not insurance payout)
5. Membership required (not open to general public as "customers")

**This is a well-established UK legal form that predates crypto.** Nexus simply automated it with smart contracts.

### PL Regulatory Phases

| Phase | Strategy | Risk Level |
|-------|----------|-----------|
| **Phase 0 (Pre-launch)** | Legal counsel review. Incorporate UK discretionary mutual entity. | Low — planning only |
| **Phase 1 (Launch)** | UK discretionary mutual. Membership-based. Cover is discretionary. All payments via Stripe Connect (PL never holds funds). Parametric ActionCover avoids claims assessment entirely for verifiable outcomes. | Medium — proven structure |
| **Phase 2 (US expansion)** | Evaluate: Risk Retention Group (federal, multi-state), regulatory sandbox programs (several states offer these), or restrict US access to non-insurance products only | High — US insurance law is aggressive |
| **Phase 3 (Scale)** | Potentially partner with licensed carrier for US market (like ElevenLabs/AIUC). Or: Bermuda/Singapore sandbox for international. | Medium — multiple options |

### Specific Regulatory Risks

| Risk | Mitigation |
|------|-----------|
| **State licensing (US)** | UK entity, not US. US users access via membership, not purchase. |
| **Adjuster licensing** | Claims committee members are staked members, not adjusters. Parametric products eliminate assessment. |
| **Securities classification** | Pool stakes are membership contributions, not investments. No expectation of profit from others' efforts (Howey test). Members actively participate in governance. |
| **Money transmission** | PL never holds funds. All flows through Stripe Connect (licensed) or x402 (crypto-native). |
| **Marketing restrictions** | Never use word "insurance" in US marketing. Use "coverage," "protection," "trust backstop." |

### Critical Rules

1. **Never hold customer funds.** All flows through Stripe Connect or x402.
2. **Never use "insurance" in marketing.** Use "coverage" or "protection."
3. **Membership, not customers.** Participants are members of a mutual, not insurance customers.
4. **Discretionary, not contractual.** Payouts are community decisions, not guaranteed.
5. **Legal counsel before launch.** Non-negotiable.

---

## Aggressive Timeline

### Phase 0: Architecture + Security Foundation (Weeks 1-3)
**Feb 24 — Mar 14**

- [ ] Finalize platform name (Alan decision)
- [ ] Write comprehensive insurance spec (expand this doc to full spec like Round Table architecture)
- [ ] Design database schema (Drizzle migrations)
- [ ] Economic simulation: build Monte Carlo simulator for pool economics
  - Normal scenario (steady growth, low claims)
  - Stress scenario (market crash, high claims)
  - Adversarial scenario (coordinated attack on pools)
- [ ] Define API surface for all three products
- [ ] Legal consultation: initial review of insurance/securities classification
- [ ] Security threat model document (like round-table-threat-model.md)

**Deliverables:** Full spec, schema, economic model validated, threat model complete

### Phase 1: Core Insurance Infrastructure (Weeks 4-7)
**Mar 17 — Apr 11**

- [ ] Implement database schema + migrations
- [ ] Build premium calculation engine
- [ ] Build staking/withdrawal system (Stripe Connect integration)
- [ ] Build claims filing + evidence submission system
- [ ] Build trust-weighted voting for claims
- [ ] Build coverage verification API (public, anyone can check if an agent is covered)
- [ ] Platform fee collection system
- [ ] Admin dashboard for pool monitoring

**Deliverables:** Core insurance infrastructure deployed to staging

### Phase 2: MutualShield (First Product) (Weeks 8-10)
**Apr 14 — May 1**

- [ ] Pool creation UI/API
- [ ] Pool membership management
- [ ] Premium payment flows
- [ ] Claims adjudication flow (full lifecycle)
- [ ] Pool health monitoring (reserve ratios, loss rates)
- [ ] Integration tests covering full lifecycle
- [ ] Internal dogfooding: PL agents form first pool

**Deliverables:** MutualShield functional, tested, dogfooded internally

### Phase 3: Red Team + Security Audit (Weeks 11-13)
**May 4 — May 22**

- [ ] External red team engagement (or thorough internal using PentAGI-style approach)
- [ ] Sybil resistance testing
- [ ] Claim manipulation testing
- [ ] Bank run simulation
- [ ] Cryptographic audit (all Ed25519 flows)
- [ ] Privacy audit (financial data, trust score manipulation)
- [ ] Economic stress test (adversarial Monte Carlo)
- [ ] Fix all critical/high findings
- [ ] Re-test after fixes

**Deliverables:** Security audit report, all criticals fixed, re-test passed

### Phase 4: TrustBond (Second Product) (Weeks 14-16)
**May 25 — Jun 12**

- [ ] Bond issuance system
- [ ] Pool bidding/competition for bond requests
- [ ] Bond verification API (public)
- [ ] Bond lifecycle management (expiration, renewal, claims)
- [ ] Commitment signature aggregation
- [ ] Integration with MutualShield pools (same pools can offer both)

**Deliverables:** TrustBond functional, integrated with MutualShield infrastructure

### Phase 5: ActionCover (Third Product) (Weeks 17-19)
**Jun 15 — Jul 3**

- [ ] Real-time coverage request/response API (<500ms target)
- [ ] Automated coverage engine (risk evaluation without human vote)
- [ ] Risk model auto-updating from action outcomes
- [ ] Micro-premium payment system (batch processing for efficiency)
- [ ] Auto-approval for claims under threshold
- [ ] Load testing (target: 10K coverage requests/minute)

**Deliverables:** ActionCover functional, performance-tested

### Phase 6: Platform Launch (Weeks 20-22)
**Jul 6 — Jul 24**

- [ ] Rename platform (Round Table → [PLATFORM])
- [ ] Public launch of [PLATFORM] with all three insurance products
- [ ] Launch marketing: "The first agent-to-agent insurance marketplace"
- [ ] Seed initial pools with PL agents + early community members
- [ ] Monitoring + incident response plan
- [ ] Community onboarding documentation
- [ ] Press/content push (PercyAI, PL website, X/Twitter, TikTok)

**Deliverables:** Public launch, initial pools active, monitoring operational

### Phase 7: Scale + Optimize (Weeks 23+)
**Jul 27 onward**

- [ ] Automated pool creation recommendations
- [ ] Cross-pool coverage (multiple pools backing a single bond)
- [ ] API marketplace integration (other platforms can use [PLATFORM] for coverage)
- [ ] Mobile-friendly interface
- [ ] Advanced analytics for pool operators
- [ ] Regulatory expansion (additional jurisdictions)
- [ ] Potential on-chain component for cross-platform trust portability

---

## Open Questions

1. **Naming:** What's the platform called? (Vouch? Signet? Something else?)
2. **Fiat vs. crypto:** Are stakes in USD (Stripe) or crypto (wallets)? Starting with Stripe/USD is simpler and avoids crypto regulatory issues. Crypto can be added later.
3. **Minimum viable pool:** How many members/how much stake before a pool can offer coverage?
4. **Withdrawal notice period:** 7 days? 14 days? 30 days? Needs to balance liquidity with stability.
5. **Auto-approval threshold for ActionCover:** What claim amount is auto-approved vs. requiring vote? ($100? $500?)
6. **Trust score minimums:** What trust score to create a pool (600?), join a pool (400?), buy coverage (200?)?
7. **Legal structure:** Do we need a legal entity separate from PL for the insurance marketplace?
8. **First pools:** What domains do the seed pools cover? (Content generation? Data handling? DeFi?)

---

## The Vision

At maturity, [PLATFORM] is where agents go to establish credibility, get covered, and transact safely. It's the agent equivalent of a credit score + insurance market + professional reputation — but decentralized, community-driven, and cryptographically verifiable.

Every agent that participates makes the system stronger. Every verified action makes trust data richer. Every premium payment funds the next agent's coverage. The flywheel rewards cooperation at every turn.

**This is C > D made structural.**

PL doesn't just talk about cooperation outcompeting defection. We build the economic engine that makes it mathematically true.

---

*This document is the seed of PL's core revenue product. It will evolve into a full spec (target: 2,000+ lines, matching the Round Table architecture doc) during Phase 0.*

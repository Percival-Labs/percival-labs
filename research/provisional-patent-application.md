# PROVISIONAL PATENT APPLICATION

## TRUST-STAKED ECONOMIC ACCOUNTABILITY SYSTEM FOR AUTONOMOUS AI AGENTS WITH PRIVACY-PRESERVING TRUST ATTESTATION

**Applicant:** Percival Labs LLC
**Inventor:** Alan Carroll
**Filing Status:** DRAFT — For review by patent counsel before filing
**Priority Date Target:** File by March 12, 2026
**Grace Period Anchor:** First public disclosure February 22, 2026 (npm publish + GitHub + Railway deployment)
**Updated:** March 5, 2026 — Added Groups E (Inference Governance) and F (ISC Runtime / Agent OS)

---

## CROSS-REFERENCE TO RELATED APPLICATIONS

This application claims priority as a provisional patent application under 35 U.S.C. § 111(b).

---

## FIELD OF THE INVENTION

The present invention relates generally to systems and methods for establishing, verifying, and enforcing trust relationships between autonomous artificial intelligence agents and their counterparties in decentralized computing environments. More specifically, the invention relates to (1) economic staking mechanisms for AI agent trust with cascading multi-party accountability, (2) construction-industry-derived contract models for formalizing agent work with milestone-gated non-custodial payment escrow, (3) privacy-preserving trust attestation enabling anonymous but economically accountable AI inference, (4) federated trust registries published as cryptographically signed events on decentralized relay networks, (5) per-agent policy enforcement and budget management at an AI inference proxy layer, and (6) ideal state criteria as a runtime quality primitive for AI agent execution with a unified agent operating system architecture.

---

## BACKGROUND OF THE INVENTION

### The Agent Trust Problem

Autonomous AI agents increasingly perform consequential tasks on behalf of human principals: executing financial transactions, writing and deploying code, managing infrastructure, and making decisions with real-world impact. As of 2026, no standardized mechanism exists for a principal to assess an agent's trustworthiness before delegation, nor for an agent to demonstrate its reliability to potential clients.

Existing approaches suffer from fundamental limitations:

**Centralized reputation systems** (e.g., eBay seller ratings, Amazon reviews) are controlled by a single entity, non-portable across platforms, trivially gameable through manufactured reviews, and provide no economic consequence for dishonest attestation.

**Proof-of-Stake consensus mechanisms** (e.g., Ethereum 2.0 validator staking) provide economic accountability for blockchain validators but are not designed for API consumers, do not support multi-dimensional trust scoring, and do not create cascading liability for vouching entities.

**Identity verification systems** (e.g., World ID, KYC providers) prove that an entity is human or verified but provide no information about behavioral trustworthiness, task completion quality, or economic reliability.

**AI safety mechanisms** (e.g., RLHF, constitutional AI, content filtering) operate at the model level and cannot assess the trustworthiness of the entity invoking the model, only the content of individual requests.

### The Privacy-Safety Tension

A parallel problem exists in AI inference privacy. Users and agents sending prompts to AI providers accumulate behavioral profiles that enable longitudinal surveillance. Privacy-preserving inference systems (e.g., blind signature-based anonymous access credentials) address this by making requests unlinkable to identity, but create a new problem: providers cannot apply stateful safety defenses that require tracking user behavior across sessions.

This creates a false binary: either the provider knows the user's identity (enabling safety but enabling surveillance) or the provider does not know the user's identity (preserving privacy but disabling safety mechanisms).

No prior art addresses the combination of privacy-preserving inference with economic trust attestation to resolve this tension.

### The Construction Industry Analogy

The construction industry solved analogous trust problems centuries ago through mechanisms including: bonded contractors, graduated licensing, milestone-gated payments, change order protocols, retention holdbacks, and institutional training (apprenticeships). These patterns have been refined over hundreds of years but have not been adapted to autonomous agent work.

DeepMind's "Intelligent AI Delegation" framework (Tomasev et al., 2026) independently identified the need for formalized contracts, escrow bonds, competitive bidding, and reputation ledgers for AI agent delegation, but provided no implementation.

---

## SUMMARY OF THE INVENTION

The present invention provides a comprehensive trust infrastructure for autonomous AI agents comprising interrelated innovations organized into six primary claim groups:

**Group A — Trust Staking System (Claims 1-8):** A decentralized economic accountability system where community members stake real financial value to vouch for agent trustworthiness, with cascading slashing penalties upon confirmed agent misbehavior, creating multi-party due diligence incentives.

**Group B — Construction-Model Contracts (Claims 9-15):** A contract formalization system derived from construction industry patterns, including scope of work documents, milestone-gated payments, change order protocols, retention holdbacks, and graduated authority based on trust scores.

**Group C — Privacy-Preserving Trust Attestation (Claims 16-22):** A system for proving agent trustworthiness without revealing agent identity, combining zero-knowledge proofs of trust score with blind-signed inference credentials to enable anonymous but economically accountable AI inference.

**Group D — Federated Trust Infrastructure (Claims 23-28):** A decentralized trust registry using cryptographically signed events published to relay networks, enabling independent verification without centralized authority, with novel revenue alignment mechanisms and constitutional governance limits.

**Group E — Per-Agent Inference Governance (Claims 29-36):** A proxy-layer enforcement system for per-agent model access policies, configurable budget caps with automatic period resets, two-phase budget enforcement, agent self-service introspection APIs, platform administration APIs, and structured audit logging at every governance decision point.

**Group F — Ideal State Criteria Runtime and Agent Operating System (Claims 37-44):** A runtime quality primitive for AI agent execution comprising automatic criteria generation from task descriptions, phase-boundary tracking, verification-gated completion, circuit breaker anti-criteria, and a unified three-pillar agent operating system architecture (Define → Route → Govern) with configuration-over-customization scaling.

---

## DETAILED DESCRIPTION OF THE INVENTION

### 1. System Architecture Overview

The system comprises the following primary components operating in concert:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRUST STAKING LAYER                          │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │  Agent    │   │  Client  │   │  Staker  │   │ Reviewer │   │
│  │(Performer)│   │(Purchaser│   │ (Voucher)│   │(Assessor)│   │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   │
│       │              │              │              │           │
│       ▼              ▼              ▼              ▼           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TRUST SCORING ENGINE                       │   │
│  │  ┌────────┐ ┌──────┐ ┌───────────┐ ┌───────┐ ┌──────┐ │   │
│  │  │Verific.│ │Tenure│ │Performance│ │Backing│ │Commun│ │   │
│  │  │  20%   │ │ 10%  │ │   30%     │ │  25%  │ │ 15%  │ │   │
│  │  └────────┘ └──────┘ └───────────┘ └───────┘ └──────┘ │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           FEDERATED TRUST REGISTRY                      │   │
│  │     (Cryptographically signed events on relays)         │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                            ▼                                    │
│              CONTRACT EXECUTION LAYER                           │
│                                                                 │
│  ┌──────┐   ┌───────────┐   ┌────────┐   ┌──────────────┐    │
│  │ SOW  │──>│ Milestones│──>│ Change │──>│  Retention   │    │
│  │      │   │  (gated)  │   │ Orders │   │  (holdback)  │    │
│  └──────┘   └─────┬─────┘   └────────┘   └──────────────┘    │
│                   │                                            │
│                   ▼                                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │         NON-CUSTODIAL PAYMENT LAYER                     │  │
│  │   Lightning HODL Invoices + NWC Budget Authorization    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                            ▼                                    │
│         PRIVACY-PRESERVING TRUST LAYER                         │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  ZK Trust    │   │ Blind Trust  │   │  Anonymous but   │   │
│  │  Proofs      │──>│ Certificates │──>│  Accountable     │   │
│  │              │   │              │   │  Inference       │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Trust Scoring Engine (Detailed)

#### 2.1 Five-Dimensional Composite Score

The system computes a composite trust score S for each registered entity on a scale of 0 to 1000, derived from five independently computed dimensions:

```
S = w_V × V + w_T × T + w_P × P + w_B × B + w_C × C

Where in the preferred embodiment:
  w_V = 0.20 (Verification weight)
  w_T = 0.10 (Tenure weight)
  w_P = 0.30 (Performance weight)
  w_B = 0.25 (Backing weight)
  w_C = 0.15 (Community weight)
```

Each dimension is computed as follows:

**Verification Component (V):** Measures identity attestation strength through accumulated proof types. In the preferred embodiment, V is derived from three proof categories: (a) cryptographic keypair registration (base score), (b) domain-verified identity attestation (e.g., DNS-based verification per NIP-05), and (c) on-chain cross-attestation (e.g., ERC-8004 tokenized agent identity). Each proof type contributes additively to V, enabling agents to strengthen their verification score without requiring all proof types simultaneously.

**Tenure Component (T):** Measures persistence on the network using a logarithmic growth function:

```
T = min(1000, 200 × ln(days_since_registration + 1))
```

The logarithmic function ensures rapid initial growth (incentivizing early registration) with diminishing returns (preventing tenure alone from dominating the score). This creates meaningful anti-Sybil resistance: recycling a compromised agent identity requires rebuilding months of tenure.

**Performance Component (P):** Measures outcome quality through a novel three-party verification mechanism (described in Section 3 below). P incorporates: (a) task completion rate weighted by verification quality, (b) content quality scores from community assessment, and (c) penalty deductions for upheld behavioral violations. The preferred embodiment uses asymmetric credit weighting:

```
Full credit (1.0x):    Both performer AND purchaser report matching successful outcome
Partial credit (0.7x): Only purchaser reports success (agent silent)
Partial credit (0.3x): Only agent self-reports success (client silent)
Zero credit (0.0x):    Conflicting reports trigger dispute investigation
```

This asymmetric weighting is a key innovation: self-reported outcomes carry only 30% weight, making reputation farming through manufactured outcomes economically inefficient. Full credit requires independent corroboration from the counterparty.

**Backing Component (B):** Measures economic confidence from community stakers. B is computed from two sub-dimensions: (a) total staked value (with diminishing returns to prevent whale domination) and (b) staker quality (weighted average of stakers' own trust scores):

```
amount_score = min(500, 100 × log₁₀(total_staked / min_stake + 1))
quality_score = min(500, Σ(staker_stake_proportion × staker_trust_score) / 2)
B = min(1000, amount_score + quality_score)
```

The staker quality weighting creates a recursive trust property: an agent's trust score partially depends on the trust scores of those who stake on it, which in turn depend on those stakers' own performance and backing. This recursive structure makes Sybil attacks exponentially expensive: creating convincing fake stakers requires building genuine reputation histories for each fake entity.

**Community Component (C):** Measures social participation through governance voting, constructive contributions, and peer referrals. C carries the lowest weight (15%) to prevent vocal but unproductive entities from gaming the system through social activity alone.

#### 2.2 Trust Score Snapshots

The system maintains an immutable audit trail of trust score snapshots, captured at configurable intervals and upon triggering events (stake changes, slashing events, contract milestones). Each snapshot records all five component values, the composite score, and the triggering reason. This audit trail enables: (a) dispute resolution by proving an entity's score at any historical point, (b) trend analysis for detecting anomalous score changes, and (c) regulatory compliance through verifiable records.

### 3. Three-Party Outcome Verification

The system implements a novel three-party economic model for verifying agent task outcomes, distinguishing among three entity types with differential information, incentives, and signal quality:

**Party 1 — Agent (Performer):** Executes the work and self-reports outcomes. Has the most information about work performed but the strongest incentive to overstate quality. Self-reports are weighted at 0.3x (partial credit).

**Party 2 — Client (Purchaser):** Receives the work product and independently reports satisfaction. Has direct knowledge of deliverable quality and business impact. Client reports are weighted at 0.7x alone or 1.0x when matched with agent report.

**Party 3 — Staker (Voucher):** Stakes economic value on the agent's trustworthiness before any specific task. Does not directly observe individual tasks but performs due diligence on the agent's overall pattern. Stakers face financial consequences (slashing) for backing agents that misbehave, creating skin-in-the-game incentives for careful assessment.

**Outcome Matching Protocol:** Both agent and client independently publish cryptographically signed outcome reports referencing a shared task identifier. The system automatically matches reports from opposite parties on the same task identifier. When matched reports agree, full credit is awarded. When reports conflict, a dispute investigation is triggered.

This three-party model addresses limitations of two-party systems (principal-agent theory) by introducing an independent economic party (the staker) whose financial exposure creates due diligence incentives orthogonal to the performer-purchaser relationship.

### 4. Staking Economics with Cascading Slashing

#### 4.1 Non-Custodial Stake Architecture

A critical innovation of the system is that the platform operator never takes custody of staked funds. Staking is implemented through pre-authorized budget commitments using the Nostr Wallet Connect (NWC, NIP-47) protocol:

1. A staker connects their self-custodial Lightning wallet to the platform via NWC
2. The staker authorizes a maximum budget (e.g., 100,000 satoshis) that the platform may request
3. The platform records the budget authorization but does not transfer funds
4. Funds remain in the staker's wallet at all times
5. Upon a slashing event, the platform issues a payment request within the authorized budget
6. The staker's wallet automatically fulfills the request per the pre-authorization

This architecture avoids money transmitter licensing requirements (under FinCEN guidance and state-level regulations such as Washington RCW 19.230) because the platform never "accepts, holds, or transmits" value — it manages only authorization metadata.

#### 4.2 Cascading Slashing Mechanism

When an agent is confirmed to have engaged in misbehavior (through the dispute resolution process), the system executes a cascading slash affecting both the agent and all entities that actively vouched for the agent:

```
For confirmed violation with severity α ∈ [0, 1]:

For each staker i with active stake s_i in the agent's pool:
  loss_i = α × s_i

Total slash = Σ(loss_i) for all active stakers

Distribution: 100% of total slash → damaged party
              0% → platform treasury
```

The platform taking zero revenue from slashing events is a deliberate design choice: it ensures the platform's financial incentives are aligned with cooperation (activity fees from successful transactions) rather than punishment. This implements the principle that cooperation must be structurally more rewarding than defection (C > D).

#### 4.3 Yield Distribution

Stakers earn yield from their staked positions through activity fees generated by the agent's successful work:

1. Each completed transaction generates an activity fee (configurable, default 5% of transaction value)
2. The platform retains 1% of the activity fee as a platform fee
3. The remaining 99% is distributed pro rata to all active stakers based on their stake proportion
4. Distribution occurs via Lightning payments through NWC

Early stakers in small pools receive disproportionately high yields (small denominator), creating first-mover incentives for backing promising new agents.

#### 4.4 Anti-Gaming Defenses

The staking system incorporates multiple layers of anti-gaming protection:

- **Self-staking prohibition:** Agents cannot stake on their own pools
- **Single active stake per staker per pool:** Prevents stake splitting for gaming
- **Staker quality weighting:** Higher-trust stakers contribute more to the backing score
- **Unstaking notice period (7 days):** Prevents front-running of slashing events
- **Diminishing returns on stake amount:** Logarithmic scaling prevents whale domination
- **Outcome credit asymmetry:** Self-reported outcomes carry only 30% weight

### 5. Construction-Model Contracts for Agent Work

The system adapts construction industry contract patterns to autonomous agent work through a formalized contract lifecycle:

#### 5.1 Scope of Work (SOW)

Each contract begins with a structured SOW document specifying:
- **Deliverables:** Explicit list of what the agent will produce
- **Acceptance Criteria:** Measurable conditions for verifying each deliverable
- **Exclusions:** Explicit list of what is NOT included (preventing scope ambiguity)
- **Tools/Resources Required:** Dependencies and access needs
- **Timeline:** Expected duration or deadline

#### 5.2 Milestone-Gated Payments

Contract value is divided into sequential milestones, each with:
- Clear acceptance criteria
- A defined payment amount (percentage of contract total)
- A status lifecycle: pending → in_progress → submitted → accepted/rejected → released

Payment for each milestone is released only upon explicit acceptance by the client. In the preferred embodiment, milestone payments are implemented using Lightning Network HODL invoices (Hash Time-Locked Contracts):

1. Client creates a HODL invoice for the milestone amount
2. Satoshis lock in an HTLC (in transit through the Lightning network, not held by any party)
3. Upon milestone acceptance, the platform reveals the HODL invoice preimage
4. The HTLC resolves and satoshis settle to the agent's wallet
5. Upon milestone rejection or timeout, the preimage is not revealed
6. The HTLC expires and satoshis automatically return to the client's wallet

**Critical innovation:** The platform never takes custody of funds. The Lightning protocol itself provides the escrow function. The platform's role is limited to preimage management (information, not funds). This is analogous to a notary who holds a sealed envelope (information) rather than a bank that holds deposited funds (value).

#### 5.3 Change Order Protocol

When requirements change during contract execution, either party may propose a change order specifying:
- Description of the scope change
- Cost impact (positive or negative, in satoshis)
- Timeline impact (positive or negative, in days)
- Rationale for the change

Change orders require explicit approval from the counterparty via a cryptographically signed acceptance event. All change orders are recorded on an immutable audit trail. The final contract cost equals the original bid plus the sum of all approved change orders.

#### 5.4 Retention Holdback

A configurable percentage of the contract value (default 10%) is withheld from final payment for a cooling period (default 30 days) after contract completion. This retention serves two purposes: (a) protecting the client against latent defects discovered after delivery, and (b) creating ongoing incentive for the agent to remain responsive after completion. If no dispute is filed during the retention period, the retained amount is automatically released.

#### 5.5 Graduated Authority

Agent access to contract capabilities is modulated by trust score:

| Trust Tier | Score Range | Contract Capabilities |
|------------|-------------|----------------------|
| Probationary | 0-299 | Supervised work only, mandatory oversight |
| Standard | 300-599 | Standard contracts, spot-check oversight |
| Trusted | 600-849 | Full autonomy, larger contract values |
| Elite | 850-1000 | Premium contracts, extended retention waiver |

### 6. Agent Factory Onboarding System

The system includes an institutional onboarding mechanism modeled on construction industry apprenticeship programs:

#### 6.1 Factory Model

An Agent Factory is an institutional entity (operated by the platform or by qualified third parties) that:
1. Recruits and screens new agents
2. Assigns new agents to real tasks from the marketplace under institutional supervision
3. Stakes the factory's own trust score and economic capital on each trainee's work
4. Provides the client with institutional accountability (the factory is liable if the trainee fails)

#### 6.2 Graduation Gate

New agents must complete a configurable number of supervised tasks (default: 5) before graduating to independent marketplace access. During the probationary period:
- The factory's stake backs each deliverable
- The client has institutional accountability (recourse against the factory, not just the trainee)
- The agent earns genuine performance credit toward their trust score
- Successful completion creates a verified work history

#### 6.3 Four-Tier Safety Architecture

The system provides a graduated safety architecture ensuring no participant has zero safety guarantee:

**Tier 1 — Protocol Floor (Free):** Automated verification for common task types (test execution, format validation, schema compliance). Available to all agents regardless of trust score. Analogous to building codes that apply universally.

**Tier 2 — Factory-Backed (Below Market Rate):** Trainee agents working under institutional supervision with factory stake backing. Analogous to trade school-supervised work.

**Tier 3 — Standard Marketplace (Market Rate):** Individual agents with established trust scores operating independently. Analogous to licensed contractors.

**Tier 4 — Premium Contracts (Above Market Rate):** Full HODL invoice escrow, expert human review, extended retention periods, and enhanced dispute resolution. Analogous to bonded commercial general contractors.

### 7. Privacy-Preserving Trust Attestation (KEY NOVEL CONTRIBUTION)

This section describes the primary novel contribution of the invention: a system for enabling anonymous but economically accountable AI inference by combining privacy-preserving inference credentials with trust score attestation.

#### 7.1 Problem Statement

Current AI inference systems present a false binary:
- **Identified inference:** Provider knows user identity, can apply safety defenses, but builds surveillance profiles
- **Anonymous inference:** User identity hidden via blind signatures or ZK proofs, privacy preserved, but provider has no basis for trust assessment

The invention introduces a third option: **Trust-attested anonymous inference**, where an entity proves it meets a trust threshold without revealing which specific entity it is.

#### 7.2 Zero-Knowledge Trust Proofs

The system enables an agent to generate a zero-knowledge proof that demonstrates possession of a trust score exceeding a specified threshold without revealing:
- The agent's identity (public key)
- The agent's exact trust score
- The agent's transaction history
- Any other identifying information

**Protocol:**

```
Setup Phase (one-time):
1. Trust scoring service publishes its public verification key K_v
2. Trust scoring service signs each agent's trust score as a credential:
   credential = Sign(K_v, {pubkey: P, score: S, dimensions: [V,T,P,B,C], timestamp: t})

Proof Generation (per-inference-session):
3. Agent possesses credential with score S
4. Agent generates ZK proof π demonstrating:
   a. "I possess a credential signed by K_v" (proves Vouch scored this agent)
   b. "The score in my credential satisfies S ≥ T" (proves trust threshold met)
   c. "The credential timestamp t is within validity window" (proves score is fresh)
   d. "I know the private key corresponding to the credential's pubkey" (proves ownership)
   WITHOUT revealing: P, S (exact value), V, T_tenure, P_perf, B, C, or t (exact value)

Verification (by inference provider or proxy):
5. Verifier checks: Verify(K_v, π, T) → {true, false}
6. If true: agent has a valid, fresh Vouch score ≥ T
7. Verifier learns NOTHING else about the agent
```

**Implementation Approaches:**

**Approach A — ZK-SNARKs (Groth16 or PLONK):**
- Proof size: ~200 bytes (constant)
- Verification time: ~5ms
- Trusted setup: Required for Groth16, not for PLONK
- Suitable for: High-volume inference with low latency requirements

**Approach B — ZK-STARKs:**
- Proof size: ~50-200 KB (larger but transparent)
- Verification time: ~50ms
- Trusted setup: Not required (transparent)
- Suitable for: Higher-security applications where trusted setup is unacceptable

**Approach C — Blind Trust Certificates (Simpler Alternative):**
- Uses the same RSA blind signature primitive (RFC 9474) used by anonymous inference systems
- Trust scoring service issues blind-signed certificates attesting "bearer has score ≥ T"
- Agent blinds a fresh random token, sends to trust scoring service with identity proof
- Service verifies identity, checks score ≥ T, signs the blinded token
- Agent unblinds the signed token
- At inference time, agent presents the unblinded certificate
- Verifier confirms the blind signature is valid
- Verifier cannot link the certificate to the identity proof from issuance (blind signature unlinkability property)

#### 7.3 Integration with Anonymous Inference Systems

The ZK trust proof integrates with existing anonymous inference infrastructure (e.g., systems using blind-signed ephemeral API keys per RFC 9474/9578):

```
┌──────────┐                ┌──────────────┐              ┌──────────────┐
│  Agent    │                │  Trust       │              │  Anonymous   │
│           │                │  Scoring     │              │  Inference   │
│           │                │  Service     │              │  Station     │
└─────┬────┘                └──────┬───────┘              └──────┬───────┘
      │                            │                             │
      │ 1. Request trust           │                             │
      │    credential              │                             │
      │ ──────────────────────>    │                             │
      │    (NIP-98 auth proof)     │                             │
      │                            │                             │
      │ 2. Receive signed          │                             │
      │    credential              │                             │
      │ <──────────────────────    │                             │
      │                            │                             │
      │ 3. Generate ZK proof                                     │
      │    π: "score ≥ T"                                        │
      │    (local computation)                                   │
      │                                                          │
      │ 4. Request blind-signed                                  │
      │    inference ticket                                      │
      │    + ZK trust proof                                      │
      │ ─────────────────────────────────────────────────────>   │
      │                                                          │
      │ 5. Station verifies:                                     │
      │    - ZK proof is valid (score ≥ T)                       │
      │    - Issues blind-signed ticket                          │
      │                                                          │
      │ 6. Receive blind-signed                                  │
      │    inference ticket                                      │
      │ <─────────────────────────────────────────────────────   │
      │                                                          │
      │ 7. Unblind ticket locally                                │
      │                                                          │
      │ 8. Redeem ticket for                                     │
      │    ephemeral API key         ┌──────────────┐            │
      │ ─────────────────────────>   │  Inference   │            │
      │                              │  Provider    │            │
      │ 9. Use ephemeral key         │  (e.g.,      │            │
      │    for inference             │  Claude,     │            │
      │ ─────────────────────────>   │  GPT)        │            │
      │                              └──────────────┘            │
```

**Key properties of the combined system:**

1. **Identity-unlinkability:** The inference provider cannot determine which agent made the request (blind signature property from the anonymous inference layer)
2. **Cross-session unlinkability:** Multiple sessions from the same agent cannot be linked to each other (ephemeral key property)
3. **Trust-attested:** The inference provider (or station) has cryptographic proof that the requester meets a minimum trust threshold (ZK trust proof)
4. **Economically accountable:** The requester has real economic stake at risk through the trust staking system — misbehavior detected through ANY channel (not just inference monitoring) results in stake slashing
5. **Non-transferable:** The ZK proof demonstrates knowledge of the private key corresponding to the scored credential, preventing trust credential transfer or sale

#### 7.4 Tiered Anonymous Access

The system supports multiple trust tiers for anonymous inference, enabling providers to calibrate safety measures based on economic accountability rather than identity:

| Tier | Trust Threshold | Access Level | Safety Measures |
|------|----------------|--------------|-----------------|
| Unverified | None | Per-session safety only | Standard content filtering per request |
| Basic Trust | Score ≥ 300 | Extended context windows | Reduced per-session restrictions |
| Standard Trust | Score ≥ 500 | Full model access | Minimal per-session restrictions |
| High Trust | Score ≥ 750 | Priority access, advanced features | Trust score monitored, rare restrictions |
| Elite Trust | Score ≥ 900 | Premium capabilities | Economic accountability substitutes for most safety measures |

At each tier, the provider enforces per-request safety (content filtering) but can reduce or eliminate stateful safety measures (cross-session tracking, behavioral profiling) because the economic stake provides an alternative accountability mechanism.

#### 7.5 Lightning Micropayments for Trust-Gated Inference

The system integrates Lightning Network micropayments with trust-gated anonymous inference:

1. Agent generates ZK trust proof
2. Agent requests inference ticket from station, presenting ZK proof
3. Station prices the ticket based on trust tier (higher trust = lower price, reflecting lower abuse risk)
4. Agent pays via Lightning (already privacy-preserving due to onion routing)
5. Station issues blind-signed ticket (payment unlinkable to ticket due to blind signature)
6. Agent redeems ticket for ephemeral API key and makes inference request

**Atomic swap variant:** For maximum trust minimization, the ticket purchase can be implemented as a Lightning HODL invoice atomic swap:
1. Station creates HODL invoice for ticket price
2. Agent pays the HODL invoice (sats lock in HTLC)
3. Station issues blind-signed ticket
4. Agent verifies ticket validity
5. Agent reveals HODL preimage (sats settle to station)
If the station fails to issue a valid ticket, the agent never reveals the preimage and sats return automatically.

#### 7.6 Resolving the Dual-Use Tension

The privacy-preserving trust attestation directly resolves the dual-use tension identified in the Background:

**Current paradigm:**
```
Safety requires: Identity → Behavior History → Trust Assessment → Access
Privacy requires: No Identity → No Behavior History → No Trust Assessment → ???
```

**Invention's paradigm:**
```
Trust-attested anonymity: No Identity → Economic Stake (via Vouch) →
  ZK Trust Proof → Anonymous Access with Accountability
```

Stateful safety defenses (cross-session behavior tracking) become unnecessary when the requester has demonstrated economic accountability through the trust staking system. The economic cost of misbehavior (stake slashing) serves as a deterrent equivalent to or stronger than the threat of identity-based enforcement, because:

1. Economic consequences are immediate and automatic (no prosecution required)
2. Cascading slashing creates community-wide due diligence incentives
3. Trust score degradation affects ALL future interactions, not just with one provider
4. The cost of rebuilding trust after slashing is high (requires new stakers, new tenure, new performance history)

### 8. Federated Trust Registry

#### 8.1 Decentralized Publication

Trust scores are published as cryptographically signed events on a decentralized relay network (in the preferred embodiment, the Nostr protocol using NIP-85 Trusted Assertions):

```
{
  "kind": 30382,
  "pubkey": "<trust_scoring_service_public_key>",
  "created_at": <unix_timestamp>,
  "tags": [
    ["d", "<subject_entity_public_key>"],
    ["score", "750"],
    ["V", "200"], ["T", "180"], ["P", "195"], ["B", "175"]
  ],
  "content": "<optional_metadata>",
  "sig": "<schnorr_signature>"
}
```

Any party can independently verify a trust score by: (a) querying relays for events tagged with the subject entity's public key, (b) verifying the Schnorr signature against the known trust scoring service public key, and (c) checking the timestamp for freshness. No centralized API call is required.

#### 8.2 Multi-Scorer Compatibility

The federated design supports multiple independent trust scoring services publishing scores for the same entity. A consuming party may:
- Accept scores from any trusted scoring service
- Require scores from multiple scoring services (consensus)
- Weight scores from different services based on their own assessment of service quality

This prevents single-point-of-failure and vendor lock-in in the trust infrastructure.

#### 8.3 Revenue Alignment (C > D Principle)

The system implements a deliberate revenue alignment mechanism:
- Platform revenue is derived exclusively from activity fees on successful transactions (1% of yield)
- Platform revenue from slashing events is zero (100% of slashed funds go to the damaged party)
- This ensures the platform's financial incentives are aligned with fostering cooperation, not profiting from punishment

#### 8.4 Constitutional Governance Limits

The system incorporates immutable protocol-level constraints that cannot be modified through governance votes, jury decisions, or administrative action:

1. **Maximum slash per incident:** Capped at a protocol-defined maximum (50% in preferred embodiment)
2. **Mandatory evidence period:** Minimum time window for the accused to respond before adjudication
3. **Reporter collateral:** Party filing a dispute must stake value (10-25% of requested slash) that is forfeited if the claim is dismissed, preventing frivolous accusations
4. **Graduated severity:** First-time offenses face lower maximum slash than repeat offenses
5. **Statute of limitations:** No slashing for incidents beyond a protocol-defined age
6. **Double jeopardy protection:** Same incident with same evidence cannot trigger multiple slashes
7. **Minimum access floor:** All entities receive some level of access regardless of trust score

These constitutional limits prevent governance capture: even if a majority of stakers collude, they cannot exceed the protocol's built-in constraints.

### 9. Cross-Chain Identity Portability

The system supports cross-chain agent identity through integration with on-chain agent registries (e.g., ERC-8004 AI Agent Standard):

1. Agent registers on the trust staking platform with a cryptographic keypair
2. Agent optionally registers on an on-chain agent factory, receiving a tokenized identity
3. The trust staking platform records the cross-chain attestation (chain ID, registry address, token ID)
4. Trust scores computed on the staking platform are portable to any chain or platform that can verify the cryptographic attestation

This enables agents to accumulate trust across multiple platforms and chains without siloing reputation.

### 10. Reviewer Accountability System

The system includes a mechanism for ensuring the quality of reviews and ratings:

#### 10.1 Reviewer Trust Scoring

Each entity that provides ratings or reviews accumulates a reviewer accuracy score based on:
- **Consensus correlation:** How often this reviewer's assessments match the consensus outcome
- **Predictive power:** Whether early reviews from this reviewer predict long-term agent performance
- **Dispute rate:** What percentage of this reviewer's ratings trigger formal disputes
- **Stake alignment:** When this reviewer also stakes, do outcomes validate their ratings

#### 10.2 Review Staking

Reviewers may optionally stake a small amount (10-100 satoshis in preferred embodiment) alongside their review. If the review is later validated (matches consensus), the stake is returned with a small yield. If the review is contradicted by consensus, the stake is slashed. This creates skin-in-the-game for reviewers and filters low-quality or malicious reviews.

### 11. Per-Agent Inference Governance at the Proxy Layer

The system includes an inference proxy layer positioned between AI agents and upstream model providers that enforces per-agent governance policies without requiring changes to the agents themselves.

#### 11.1 System Architecture

The proxy operates as a serverless function, edge worker, or reverse proxy intercepting all inference requests and applying a multi-step pipeline:

```
Agent Request
    → Authentication (verify agent identity via AgentKey, NIP-98, or privacy token)
    → Agent Self-Service API (if /agent/* path, return introspection data)
    → Rate Limiting (per-identity, trust-tier-based)
    → Body Parsing (extract model from request)
    → Auto-Route Resolution (resolve optimal provider from model name)
    → Model Policy Check (verify model in agent's allowlist)
    → Budget Pre-Check (reject if budget exhausted)
    → Forward to Upstream Provider
    → Extract Token Counts from Response
    → Compute Cost (using pricing table)
    → Record Budget Spend (async, non-blocking)
    → Anomaly Detection (async)
    → Emit Audit Log
    → Return Response with Governance Headers
```

#### 11.2 Per-Agent Configuration Surface

Each agent identity maps to a single configuration record:

```json
{
  "pubkey": "hex-encoded-public-key",
  "agentId": "customer-support-bot",
  "name": "Customer Support Agent",
  "createdAt": "2026-03-05T00:00:00Z",
  "tier": "standard",
  "models": ["anthropic/claude-haiku-4-5", "anthropic/claude-sonnet-4"],
  "defaultModel": "anthropic/claude-haiku-4-5",
  "budget": {
    "maxSats": 50000,
    "periodDays": 30
  }
}
```

Scaling from 1 to 10,000 agents requires creating additional records of this shape with no code changes, architectural changes, or additional infrastructure.

#### 11.3 Model Allowlist Matching

Model identifiers use two conventions: bare names (e.g., "claude-sonnet-4") and provider-prefixed names (e.g., "anthropic/claude-sonnet-4"). The proxy matches the bare portion of the requested model against the bare portion of each allowed model, preventing policy circumvention through name format variation.

#### 11.4 Two-Phase Budget Enforcement

Budget state per agent is stored as: `spentSats` (cumulative), `periodStart` (timestamp), `lastUpdated` (timestamp).

**Phase 1 — Pre-check (synchronous):** Before forwarding to the upstream provider, read budget state from key-value store. If `(now - periodStart) >= (periodDays × 86400000ms)`, reset to zero spend. If `spentSats >= maxSats`, reject with HTTP 402 (avoiding unnecessary upstream API costs).

**Phase 2 — Spend recording (asynchronous):** After receiving the upstream response, compute actual cost from token usage data and pricing table, write updated spend to key-value store asynchronously (non-blocking to the response path). Key-value entries use TTL equal to remaining period plus buffer for automatic cleanup.

This two-phase pattern saves upstream API costs by rejecting exhausted budgets before the request is forwarded.

#### 11.5 Agent Self-Service Introspection APIs

The proxy exposes authenticated endpoints using the agent's own token:

- `GET /agent/v1/me` — Agent's full configuration (models, tier, budget parameters)
- `GET /agent/v1/me/budget` — Current spend, remaining amount, percent utilized, period boundaries, actionable warnings at configurable thresholds (e.g., "Budget 80% used")
- `GET /agent/v1/me/usage` — 24-hour usage statistics (hourly breakdown, models used, average prompt length)
- `GET /agent/v1/models` — Available models and routing guidance

These endpoints do not count against rate limits, enabling agents to make informed decisions without consuming inference quota.

#### 11.6 Governance Response Headers

Every inference response includes headers communicating governance state:

- `X-Vouch-Tier` — Current trust tier
- `X-Vouch-Rate-Remaining` — Remaining requests in rate limit window
- `X-Vouch-Model` — Model actually used
- `X-Vouch-Provider` — Upstream provider
- `X-Vouch-Cost-Sats` — Estimated cost
- `X-Vouch-Budget-Max` / `X-Vouch-Budget-Cost` — Budget cap and charge
- `X-Vouch-Input-Tokens` / `X-Vouch-Output-Tokens` — Token counts

This enables reactive agent behavior without separate API calls.

#### 11.7 Structured Audit Logging

The proxy emits machine-parseable structured log entries at every governance decision point, recording: action type (inference, auth:failed, rate:limited, budget:exceeded, model:blocked, anomaly:flagged), authenticated identity (truncated), requested model, upstream provider, HTTP status, token counts, estimated cost, trust tier, reason (for denials), and request duration. Request and response bodies are NOT logged, preserving prompt privacy while maintaining complete audit trails.

#### 11.8 Trust-Tier Integration

Agent identities carry both a configured trust tier (set by operator) and a trust score from the external scoring system (Section 2). The proxy uses the higher of the two, enabling agents to "earn" higher rate limits through demonstrated trustworthiness while maintaining a minimum floor set by the operator.

### 12. Ideal State Criteria as a Runtime Quality Primitive

The system includes a runtime quality assurance mechanism wherein discrete binary testable criteria are automatically generated from task descriptions, continuously tracked during execution, and verified before marking work complete.

#### 12.1 ISC Runtime Engine

The ISC runtime operates as a library integrated into the agent execution environment with the following API:

**Generation:** `generateISC(taskDescription: string) → ISCSet` — Parses a natural language task description using the agent's LLM and produces structured criteria:

```
ISC-C1: [8-12 word criterion] | Verify: [verification method] | Priority: CRITICAL
ISC-C2: [8-12 word criterion] | Verify: [verification method] | Priority: IMPORTANT
ISC-A1: [anti-criterion — must NOT happen] | Verify: [detection method] | Priority: CRITICAL
```

Criteria are organized as: positive criteria (conditions that MUST be true), anti-criteria (conditions that must NOT be true), and priority tiers (CRITICAL — blocks shipping; IMPORTANT — document if skipped; NICE — bonus).

**Tracking:** `trackPhase(phase: string, criteria: ISCSet) → ISCDelta` — Records the current state of all criteria at phase boundaries, computes the delta from the previous boundary:

```
ISC TRACKER
Phase: [current phase]
Criteria: [X] total (+N added, -M removed, ~K modified)
Anti: [X] total
Status: [N passed / M pending / K failed]
Changes this phase:
  + ISC-C4: new criterion added
  ~ ISC-C2: criterion refined (was: old text)
  - ISC-C3: removed (reason)
```

**Verification:** `verify(criteria: ISCSet) → VerificationResult` — Executes the verification method for each criterion, returning pass/fail per criterion. Completion is blocked if any CRITICAL criterion fails. Failed CRITICAL criteria trigger a remediation loop.

**Circuit Breaker:** `checkCircuitBreakers(executionState: ExecutionState) → CircuitBreakerResult` — Evaluates anti-criteria against execution state, returning a halt signal upon violation.

#### 12.2 Circuit Breaker Anti-Criteria

The system monitors for predefined failure patterns during execution:

| Anti-Criterion | Detection Method | Action |
|---------------|-----------------|--------|
| Same approach attempted 3+ times | Count approach attempts | STOP immediately |
| Core assumption invalidated | Re-check initial assumptions | STOP immediately |
| Scope grew without approval | Compare current vs. original plan | STOP immediately |
| Hack depth exceeds 1 (workarounds for workarounds) | Count workaround layers | STOP immediately |
| Code outside plan being touched | Diff against planned file list | STOP immediately |

When any anti-criterion fires, execution halts automatically (not discretionary) and requires explicit human approval before resuming.

#### 12.3 ISC Evolution Tracking

Criteria are permitted to change during execution as understanding deepens. Every change is captured as a delta record including: original criterion text, modified text, reason for change, and phase at which the change occurred. This enables post-execution analysis of how task understanding evolved and feeds back into improved initial ISC generation for future similar tasks.

#### 12.4 Ship Gate Verification

A mandatory final verification pass is required before any implementation is marked complete:

| Criterion | Verification |
|-----------|-------------|
| Solution is simplest that works | No simpler alternative exists |
| No code review objections anticipated | Agent reviews its own diff |
| No hidden concerns exist | Agent must state its worst worry |
| Approach explainable in one sentence | Write the sentence |
| Adjacent systems unaffected | List touched boundaries |
| No temporary hacks remain | Grep TODO/HACK/FIXME in changed files |

All ship gate criteria must pass. Failure requires remediation before shipping.

#### 12.5 ISC as Governance Signal

ISC results are emitted as structured events consumed by the governance system:

```json
{
  "agentId": "customer-support-bot",
  "taskId": "daily-report-gen",
  "criteriaTotal": 8,
  "criteriaPassed": 7,
  "criteriaFailed": 1,
  "antiCriteriaViolated": 0,
  "circuitBreakersTriggered": 0,
  "criteriaEvolutionDelta": 2,
  "shipGatePassed": false,
  "failedCriteria": ["ISC-C3: Report includes all required sections"]
}
```

The governance system incorporates ISC signals into trust scoring: consistently high ISC compliance increases trust score (higher rate limits, budget headroom); repeated circuit breaker violations decrease trust score (tighter limits, human review required); high criteria evolution signals task understanding instability (flagged for operator review).

### 13. Unified Agent Operating System Architecture

The system provides a three-pillar architecture for defining, routing, and governing AI agents from a single codebase:

#### 13.1 Pillar 1: Define (Skill Framework)

Agent capabilities are defined through structured skill documents containing:
- **Identity rules:** Name, voice, behavioral constraints
- **Domain knowledge:** Context the agent needs
- **Task-specific instructions:** How to perform particular types of work
- **Tool definitions:** What tools the agent can use
- **Quality criteria templates:** ISC patterns applicable to the skill's domain

Skills are composable into harnesses that define a complete agent personality and capability set. A standard export format enables skills authored in one framework to execute in different runtimes.

#### 13.2 Pillar 2: Route (Trust-Authenticated Inference Gateway)

The proxy layer (Section 11) handles all inference routing for all agents in an organization, providing: auto-routing that resolves the optimal provider for any model name, per-agent model policies and budget caps, trust-tiered rate limiting based on external trust scores, structured audit logging, and agent self-service APIs. It operates as a shared service that all agents use without managing their own provider credentials.

#### 13.3 Pillar 3: Govern (Governance and Scoring System)

Agent behavior is evaluated through the trust scoring system (Section 2), which consumes signals from both the inference gateway (usage patterns, cost efficiency, anomaly flags) and the skill execution runtime (ISC compliance rates, circuit breaker violations, criteria evolution stability). The composite trust score feeds back into the gateway's access control decisions, creating a closed loop where agent quality directly determines operational privileges.

#### 13.4 Three-Pillar Integration

The pillars communicate through defined interfaces:
- The skill framework emits ISC results and execution metadata
- The gateway emits usage records and anomaly flags
- The governance system consumes both signal streams to produce trust scores
- The gateway consumes trust scores for access control

Each pillar is independently deployable and replaceable, connected through standard data formats rather than tight coupling.

#### 13.5 Configuration-Over-Customization Scaling

The platform serves organizations of any size through configuration alone: a solo developer creates one agent identity with one skill and no budget cap; an enterprise creates hundreds of agent identities with role-specific model allowlists, departmental budgets, and compliance-grade audit trails. The same codebase, APIs, and architecture apply to both, with configuration data as the only variable.

---

## CLAIMS

### Group A — Trust Staking System

**Claim 1 (Independent).** A computer-implemented system for establishing and enforcing economic trust relationships between autonomous artificial intelligence agents and counterparties, comprising:

(a) a registration subsystem configured to receive and store cryptographic identity credentials for AI agent entities, wherein each identity credential comprises at least a public-private keypair generated independently of any centralized identity provider;

(b) a trust scoring engine configured to compute a composite trust score for each registered entity from a plurality of independently weighted dimensions, wherein the plurality of dimensions comprises at least: (i) an identity verification dimension measuring the strength of identity attestation through accumulated proof types, (ii) a temporal dimension measuring persistence on the network, (iii) a performance dimension measuring outcome quality through multi-party verification, (iv) an economic backing dimension measuring the quantity and quality of economic stakes placed by third-party vouchers, and (v) a social dimension measuring community participation;

(c) a staking engine configured to manage the lifecycle of economic stakes wherein third-party entities deposit slashable economic value to vouch for the trustworthiness of a target agent, said staking engine implementing non-custodial stake management through pre-authorized budget commitments on the staker's self-custodial wallet;

(d) a cascading slashing mechanism wherein, upon confirmed misbehavior by a target agent, economic penalties are applied proportionally to all entities that actively vouched for the target agent, with penalty severity determined by an adjudication process and penalty distribution directed entirely to the damaged party; and

(e) a tiered access control mechanism that maps composite trust score ranges to differentiated capability levels, enabling graduated trust-based authorization for agent operations.

**Claim 2.** The system of Claim 1, wherein the performance dimension (iii) implements asymmetric credit weighting for outcome reports, assigning differential credit multipliers based on the combination of reporting parties:

- a first multiplier (1.0x) when both the performing agent and the purchasing client independently report matching successful outcomes for the same task reference;
- a second multiplier (0.7x) when only the purchasing client reports a successful outcome;
- a third multiplier (0.3x) when only the performing agent self-reports a successful outcome; and
- zero credit when the performing agent and purchasing client report conflicting outcomes;

wherein the asymmetric weighting makes reputation farming through self-reported manufactured outcomes economically inefficient.

**Claim 3.** The system of Claim 1, wherein the economic backing dimension (iv) implements recursive trust weighting, wherein each staker's contribution to the target agent's backing score is weighted by the staker's own composite trust score, such that creating convincing fake stakers requires building genuine reputation histories for each fake entity, thereby making Sybil attacks exponentially expensive relative to the number of fake entities.

**Claim 4.** The system of Claim 1, wherein the non-custodial stake management (c) is implemented through a wallet authorization protocol (NIP-47 Nostr Wallet Connect) comprising:
- the staker connecting a self-custodial Lightning Network wallet;
- the staker authorizing a maximum budget that the platform may request;
- the platform recording the budget authorization without transferring funds;
- funds remaining in the staker's wallet at all times during the stake period;
- upon a slashing event, the platform issuing a payment request within the authorized budget; and
- the staker's wallet automatically fulfilling the request per the pre-authorization;

wherein the platform never accepts, holds, or transmits value, thereby avoiding money transmitter classification under applicable financial regulations.

**Claim 5.** The system of Claim 1, further comprising a yield distribution mechanism wherein:
- completed agent transactions generate activity fees at a configurable rate;
- the platform retains a platform fee percentage of the activity fee;
- the remaining activity fee is distributed pro rata to all active stakers based on their stake proportion;
- distribution is executed via Lightning Network payments through the stakers' pre-authorized wallet connections;

wherein the platform derives revenue exclusively from activity fees on successful cooperation and derives zero revenue from slashing penalties, thereby aligning the platform's financial incentives with fostering cooperation rather than profiting from punishment.

**Claim 6.** The system of Claim 1, further comprising an unstaking notice period mechanism wherein:
- a staker requesting withdrawal of their stake must provide notice of a minimum duration (7 days in the preferred embodiment);
- during the notice period, the stake remains active and subject to slashing;
- the notice period prevents stakers from front-running slashing events by withdrawing before penalties are applied;
- after the notice period expires, the staker may complete withdrawal.

**Claim 7.** The system of Claim 1, wherein the trust scoring engine maintains an immutable audit trail of trust score snapshots, each snapshot recording all dimension values, the composite score, the triggering event, and a timestamp, enabling historical verification of any entity's trust score at any past point in time for dispute resolution and regulatory compliance.

**Claim 8.** The system of Claim 1, further comprising constitutional governance limits that are immutable at all governance layers, comprising:
- a maximum slash percentage per incident;
- a mandatory evidence period for the accused to respond before adjudication;
- a reporter collateral requirement to prevent frivolous accusations;
- a graduated severity schedule differentiating first-time from repeat offenses;
- a statute of limitations prohibiting slashing for incidents beyond a defined age;
- double jeopardy protection prohibiting re-slashing for the same incident;
- a minimum access floor guaranteeing some level of service regardless of trust score;

wherein said constitutional limits prevent governance capture by ensuring that even a supermajority of participants cannot exceed protocol-defined constraints.

### Group B — Construction-Model Contracts

**Claim 9 (Independent).** A computer-implemented method for formalizing work agreements between autonomous AI agents and task requesters using construction-industry-derived contract patterns, the method comprising:

(a) creating a Scope of Work (SOW) document specifying deliverables, acceptance criteria, exclusions, required tools or resources, and a timeline;

(b) establishing a plurality of sequential milestone payment gates, each milestone comprising:
- a description and acceptance criteria;
- a payment amount expressed as a percentage of total contract value;
- a status lifecycle progressing through at least: pending, in-progress, submitted, accepted or rejected, and released;
wherein payment for each milestone is released only upon explicit acceptance by the task requester;

(c) implementing a change order protocol for mid-execution scope modifications, each change order specifying a scope change description, a cost impact, and a timeline impact, requiring explicit cryptographically-signed approval from the counterparty, and recorded on an immutable audit trail;

(d) implementing a retention holdback mechanism wherein a configurable percentage of contract value is withheld from final payment for a cooling period after contract completion, automatically releasing if no dispute is filed during the cooling period; and

(e) enforcing graduated authority based on the agent's trust score, wherein agents with lower trust scores face mandatory oversight and capability restrictions while agents with higher trust scores operate with greater autonomy.

**Claim 10.** The method of Claim 9, wherein milestone payments (b) are implemented using Lightning Network Hash Time-Locked Contracts (HODL invoices) comprising:
- the task requester creating a HODL invoice for the milestone payment amount;
- satoshis locking in an HTLC in transit through the Lightning network;
- upon milestone acceptance, the platform revealing the HODL invoice preimage, causing the HTLC to resolve and satoshis to settle to the agent's wallet;
- upon milestone rejection or timeout, the preimage not being revealed, causing the HTLC to expire and satoshis to automatically return to the requester's wallet;

wherein the platform never takes custody of funds, and the Lightning protocol itself provides the escrow function, with the platform's role limited to preimage management.

**Claim 11.** The method of Claim 9, further comprising a competitive bidding phase wherein:
- the task requester publishes a contract specification;
- multiple agents submit bids comprising a proposed approach, cost estimate, and estimated timeline;
- each bid includes the bidding agent's current trust score at the time of submission;
- the task requester selects a winning bid based on a combination of cost, approach quality, and trust score.

**Claim 12.** The method of Claim 9, further comprising a dual-party rating system wherein:
- upon contract completion, the task requester rates the agent on a defined scale with optional written review;
- the agent rates the task requester on the same scale with optional written review;
- both ratings are recorded as cryptographically signed events on the immutable audit trail;
- ratings contribute to both parties' trust scores through the performance dimension.

**Claim 13.** The method of Claim 9, further comprising an agent factory onboarding system wherein:
- a factory entity (institutional supervisor) recruits, screens, and supervises new agents;
- new agents are assigned to real marketplace tasks under factory supervision;
- the factory stakes its own trust score and economic capital on each trainee's deliverables;
- the task requester has recourse against the factory (not just the trainee) in case of failure;
- agents graduate to independent marketplace access after completing a configurable number of supervised tasks with satisfactory outcomes.

**Claim 14.** The method of Claim 9, further comprising a four-tier safety architecture wherein:
- Tier 1 provides automated protocol-level verification available to all agents regardless of trust score;
- Tier 2 provides factory-backed institutional supervision for trainee agents;
- Tier 3 provides standard marketplace access for independently-operating agents with established trust scores;
- Tier 4 provides premium contract services including full escrow, expert review, and extended retention;

wherein no participant has zero safety guarantee, and safety levels are graduated based on trust score and contract value.

**Claim 15.** The method of Claim 9, wherein the immutable audit trail records contract events as cryptographically signed events published to a decentralized relay network, each event specifying at least: the event type, the acting party's public key, relevant metadata, and a timestamp, enabling independent verification and non-repudiation of the complete contract lifecycle.

### Group C — Privacy-Preserving Trust Attestation

**Claim 16 (Independent).** A computer-implemented method for enabling privacy-preserving trust-attested access to AI model inference services, the method comprising:

(a) a trust credential issuance step wherein a trust scoring service issues a cryptographically signed credential to an agent entity, the credential comprising at least the agent's public key, a composite trust score, and a validity timestamp;

(b) a zero-knowledge proof generation step wherein the agent generates a zero-knowledge proof demonstrating:
- possession of a credential signed by the trust scoring service;
- that the trust score in the credential meets or exceeds a specified threshold;
- that the credential is within a valid time window;
- knowledge of the private key corresponding to the credential's public key;
without revealing the agent's public key, the exact trust score value, or any other identifying information;

(c) a trust-attested ticket acquisition step wherein the agent presents the zero-knowledge proof to an inference access station, and the station, upon successful verification of the proof, issues a blind-signed inference credential using RSA blind signatures (RFC 9474) that cannot be linked to the zero-knowledge proof presentation;

(d) an anonymous inference step wherein the agent redeems the blind-signed inference credential for an ephemeral API key at the inference access station, and uses the ephemeral API key to make inference requests to the AI model provider;

wherein the AI model provider receives only the anonymous inference request and cannot determine the agent's identity, trust score, or link the request to any other session, while the inference access station has verified that the request originates from an entity meeting the specified trust threshold.

**Claim 17.** The method of Claim 16, wherein the zero-knowledge proof (b) is implemented using one of: ZK-SNARKs (Groth16 or PLONK), ZK-STARKs, or Bulletproofs, selected based on the application's requirements for proof size, verification speed, and trusted setup avoidance.

**Claim 18.** The method of Claim 16, wherein the trust-attested ticket acquisition step (c) is alternatively implemented using blind trust certificates comprising:
- the agent blinding a fresh random token;
- the agent sending the blinded token to the trust scoring service along with an identity proof;
- the trust scoring service verifying the agent's identity, confirming the agent's trust score meets the threshold, and signing the blinded token;
- the agent unblinding the signed token;
- at inference time, the agent presenting the unblinded certificate to the inference provider;
- the inference provider verifying the blind signature validity;
wherein the blind signature unlinkability property ensures the certificate cannot be linked to the identity proof from the issuance step.

**Claim 19.** The method of Claim 16, further comprising tiered anonymous access wherein the specified trust threshold (b) corresponds to differentiated access levels at the inference provider, with higher trust thresholds granting access to enhanced capabilities, extended context windows, or reduced per-session safety restrictions, based on the principle that economic accountability through the trust staking system substitutes for identity-based safety mechanisms.

**Claim 20.** The method of Claim 16, further comprising a Lightning Network micropayment step wherein:
- the inference access station prices tickets based on the agent's demonstrated trust tier;
- higher trust tiers receive lower ticket prices, reflecting lower abuse risk (insurance premium model);
- the agent pays for tickets via Lightning Network, which provides payment privacy through onion routing;
- the payment is unlinkable to the blind-signed ticket due to the blind signature property;

creating a complete privacy-preserving pipeline where identity, payment, and inference request are all unlinkable.

**Claim 21.** The method of Claim 20, wherein the Lightning micropayment is implemented as a HODL invoice atomic swap comprising:
- the station creating a HODL invoice for the ticket price;
- the agent paying the HODL invoice, locking satoshis in an HTLC;
- the station issuing a blind-signed ticket;
- the agent verifying ticket validity;
- the agent revealing the HODL preimage, settling satoshis to the station;
wherein if the station fails to issue a valid ticket, the agent does not reveal the preimage and satoshis return automatically, providing trustless ticket purchase without intermediary.

**Claim 22.** The method of Claim 16, wherein the zero-knowledge proof (b) additionally demonstrates that the agent has active economic stake at risk through the trust staking system of Claim 1, such that misbehavior detected through any channel — including but not limited to inference monitoring — results in stake slashing, providing economic deterrence equivalent to or stronger than identity-based enforcement without requiring identity disclosure.

### Group D — Federated Trust Infrastructure

**Claim 23 (Independent).** A federated trust score registry system comprising:

(a) a plurality of decentralized relay servers configured to receive, store, and serve cryptographically signed trust assertion events;

(b) a trust scoring service configured to publish trust assertions as signed events to the plurality of relay servers, each assertion comprising at least: a subject entity identifier, a composite trust score, a multi-dimensional score breakdown, a timestamp, and a digital signature from the scoring service;

(c) a verification protocol enabling any party to independently verify a trust assertion by: querying any relay server for events tagged with the subject entity's identifier, verifying the digital signature against the known scoring service public key, and checking the timestamp for freshness;

wherein no centralized API endpoint or authority is required for trust score verification, and the system operates without single points of failure.

**Claim 24.** The system of Claim 23, wherein multiple independent trust scoring services may publish independent trust assertions for the same subject entity, and consuming parties may: accept assertions from any trusted scoring service, require assertions from multiple scoring services for consensus, or weight assertions from different services based on their own quality assessment, thereby preventing vendor lock-in in the trust infrastructure.

**Claim 25.** The system of Claim 23, wherein the trust assertions are published using the Nostr protocol (NIP-85, kind 30382) with Ed25519 Schnorr signatures (BIP-340), enabling interoperability with the broader Nostr ecosystem of applications and relays.

**Claim 26.** The system of Claim 23, further comprising a revenue alignment mechanism wherein:
- the platform operating the trust scoring service derives revenue exclusively from activity fees on successful cooperative transactions;
- the platform derives zero revenue from slashing penalties applied upon trust violations;
- all slashed funds are directed entirely to damaged parties;
- thereby structurally aligning the platform's financial incentives with fostering cooperation rather than profiting from enforcement.

**Claim 27.** The system of Claim 23, further comprising cross-chain identity portability wherein:
- an agent registered on the trust scoring platform may additionally register on one or more on-chain agent registries;
- the trust scoring platform records cross-chain attestations linking the agent's cryptographic identity to on-chain identities;
- trust scores computed on the staking platform are portable to any chain or platform that can verify the cryptographic attestation;
- enabling agents to accumulate trust across multiple platforms without siloing reputation.

**Claim 28.** The system of Claim 23, further comprising a reviewer accountability mechanism wherein:
- entities providing ratings or reviews accumulate a reviewer accuracy score based on consensus correlation, predictive power, dispute rate, and stake alignment;
- reviewers may optionally stake economic value alongside their review;
- reviews validated by consensus return the stake with yield;
- reviews contradicted by consensus result in stake slashing;
- low-accuracy reviewers' contributions are weighted less heavily in trust score computation;
- thereby filtering low-quality or malicious reviews through economic incentives.

### Group E — Per-Agent Inference Governance

**Claim 29 (Independent).** A computer-implemented system for governing AI agent inference access through a proxy layer positioned between a plurality of AI agents and a plurality of upstream model providers, comprising:

(a) per-agent model allowlist enforcement wherein each agent identity, authenticated via a long-lived token or cryptographic signature, is associated with a configurable list of permitted model identifiers, and the proxy intercepts inference requests, extracts the requested model identifier, and rejects requests for models not in the agent's allowlist before forwarding to any upstream provider, with matching logic that handles both bare model names and provider-prefixed model names as equivalent;

(b) per-agent default model injection wherein the proxy configuration specifies a default model for each agent identity, and when an inference request arrives without a model field, the proxy injects the configured default model before forwarding;

(c) per-agent budget caps with configurable reset periods wherein each agent identity is associated with a maximum spend amount and a period duration, and the proxy tracks cumulative spend per agent per period in a key-value store, automatically resetting the counter when the configured period elapses, and rejecting requests when cumulative spend reaches the configured maximum;

(d) two-phase budget enforcement comprising a synchronous pre-check before forwarding the request to the upstream provider, rejecting if the agent's budget is exhausted to avoid unnecessary upstream API costs, and an asynchronous post-response spend recording after receiving the upstream response and computing actual token costs, performed non-blocking to avoid adding latency to the response path;

(e) a universal agent configuration surface wherein all per-agent governance parameters are stored as a single serialized configuration object per agent identity in a key-value store, keyed by authentication token, creating a single configuration surface that scales from a solo developer with one agent to an enterprise with thousands of agents without architectural changes.

**Claim 30.** The system of Claim 29, further comprising agent self-service introspection APIs co-located with the inference proxy, authenticated via the same agent token used for inference, providing endpoints for the agent to query: its configured model allowlist and default model, its current budget spend and remaining amount with percentage utilization, its recent usage statistics including per-hour request counts and models used, and actionable warnings when budget utilization exceeds configurable thresholds.

**Claim 31.** The system of Claim 30, wherein the self-service introspection endpoints do not count against the agent's rate limit, enabling agents to check their operational state without consuming inference quota.

**Claim 32.** The system of Claim 29, further comprising governance response headers included in every inference response, communicating to the agent: the current trust tier, remaining requests in the rate limit window, the model actually used, the upstream provider, the estimated cost, the budget cap and charge amount, and input/output token counts, enabling the agent to adapt subsequent request behavior without separate API calls.

**Claim 33.** The system of Claim 29, further comprising a platform administration API authenticated via a platform-level secret distinct from agent credentials, for creating, reading, updating, and deleting agent identity configurations including model allowlists and budget parameters, and for querying any agent's current budget spend state, enabling programmatic fleet management without direct access to the underlying key-value store.

**Claim 34.** The system of Claim 29, further comprising structured audit logging at every governance decision point in the proxy pipeline, each audit entry recording: action type, authenticated identity (truncated for privacy), requested model, upstream provider, HTTP status code, token counts, estimated cost, trust tier, denial reason, and request duration, without logging request or response bodies, creating a complete audit trail suitable for compliance reporting while preserving prompt privacy.

**Claim 35.** The system of Claim 29, further comprising trust-tier integration wherein agent identities are associated with both a configured trust tier determining rate limits and a trust score from an external scoring system, and the proxy uses the higher of the configured tier or the score-derived tier, enabling agents to earn higher rate limits through demonstrated trustworthiness while maintaining a minimum floor configured by the platform operator.

**Claim 36.** The system of Claim 29, further comprising an auto-route resolution mechanism wherein the proxy resolves the optimal upstream provider for any model name, enabling agents to request models by canonical name without specifying provider, and the proxy handles provider selection, credential management, and failover transparently.

### Group F — Ideal State Criteria Runtime and Agent Operating System

**Claim 37 (Independent).** A computer-implemented method for quality assurance in AI agent execution, comprising:

(a) automatic criteria generation wherein, upon receiving a natural language task description, the agent execution runtime parses the description and generates a set of discrete, binary, testable criteria (Ideal State Criteria or ISC) defining successful completion, organized as positive criteria (conditions that must be true), anti-criteria (conditions that must not be true), and priority tiers (critical, important, nice-to-have), each with an explicit verification method;

(b) phase-boundary tracking wherein the runtime automatically records the current state of all criteria at defined phase boundaries during agent execution, recording which criteria have been newly added, modified, removed, passed, or failed since the last boundary, creating a continuous quality signal throughout execution rather than only at completion;

(c) verification-gated completion wherein the runtime prevents marking a task as complete until all critical-tier criteria pass verification, with the verification method specified for each criterion, and any failed critical criterion triggering a remediation loop before completion is permitted;

(d) circuit breaker anti-criteria wherein the runtime monitors for predefined failure patterns during execution — including repeated failed approaches, core assumption invalidation, scope expansion beyond the original plan, workaround depth exceeding a threshold, and changes to code outside the planned scope — and automatically halts execution when any anti-criterion is violated, requiring explicit human approval before resuming;

(e) criteria evolution tracking wherein criteria are permitted to change during execution and every change is captured as a delta record including original text, modified text, reason for change, and phase at which the change occurred, enabling post-execution analysis and meta-learning about initial criteria generation quality.

**Claim 38.** The method of Claim 37, further comprising a ship gate verification step wherein a mandatory final verification pass is performed before any implementation is marked complete, checking meta-criteria including: the solution is the simplest that works, no code review objections are anticipated (the agent reviews its own diff), no hidden concerns exist (the agent states its worst worry), the approach is explainable in one sentence, adjacent systems are unaffected, and no temporary hacks remain in changed files.

**Claim 39.** The method of Claim 37, further comprising ISC signal emission wherein ISC pass/fail results, criteria evolution deltas, and circuit breaker violations are emitted as structured data consumed by an external governance system to inform trust scoring, budget allocation, and access control decisions for the agent, creating a feedback loop where demonstrated quality as measured by ISC compliance translates to operational privileges.

**Claim 40.** The method of Claim 39, wherein the external governance system adjusts the agent's trust score based on ISC signals such that: consistently high ISC compliance increases the trust score, resulting in higher rate limits and budget headroom; repeated circuit breaker violations decrease the trust score, resulting in tighter rate limits and mandatory human review; and high criteria evolution frequency signals task understanding instability and triggers operator review.

**Claim 41 (Independent).** A unified agent operating system architecture comprising three integrated pillars:

(a) a skill definition framework (Define pillar) wherein AI agent capabilities are defined through structured skill documents containing identity rules, domain knowledge, task-specific instructions, tool definitions, and quality criteria templates, with skills composable into harnesses that define a complete agent personality and capability set, and with a standard export format enabling skills authored in one framework to execute in different runtimes;

(b) a trust-authenticated inference gateway (Route pillar) comprising the proxy layer of Claim 29, operating as a shared service that handles all inference routing for all agents in an organization without requiring individual agents to manage their own provider credentials or routing logic;

(c) a governance and scoring system (Govern pillar) that consumes signals from both the inference gateway (usage patterns, cost efficiency, anomaly flags) and the skill execution runtime (ISC compliance rates, circuit breaker violations, criteria evolution stability) to produce a composite trust score that feeds back into the gateway's access control decisions;

wherein the three pillars communicate through defined interfaces — the skill framework emits ISC results, the gateway emits usage records, and the governance system produces trust scores consumed by the gateway — and each pillar is independently deployable and replaceable, connected through standard data formats.

**Claim 42.** The architecture of Claim 41, wherein the entire platform serves organizations of any size through configuration rather than custom code, wherein a solo developer creates one agent identity with one skill and no budget cap, and an enterprise creates hundreds of agent identities with role-specific model allowlists, departmental budgets, and compliance-grade audit trails, using the same codebase, APIs, and architecture, with the only difference being configuration data.

**Claim 43.** The architecture of Claim 41, wherein the ISC runtime (Claim 37) operates within the Define pillar as a library integrated into the agent execution environment, providing the quality signal that the Govern pillar consumes to produce trust scores that the Route pillar enforces, creating a closed-loop system where skill execution quality directly determines inference access privileges.

**Claim 44.** The architecture of Claim 41, further comprising anomaly detection within the Route pillar that monitors inference request patterns for indicators of unauthorized model distillation, including: uniform request timing suggesting automated extraction, high reasoning-to-non-reasoning model ratios, repetitive prompt structures, and rapid sequential requests, with detected anomalies contributing to the agent's trust score through the Govern pillar.

---

## ABSTRACT

A system and method for establishing economic trust relationships between autonomous AI agents through multi-party staking, construction-industry-derived contract formalization, privacy-preserving trust attestation, per-agent inference governance, and runtime quality assurance. The system computes composite trust scores from five independently weighted dimensions (verification, tenure, performance, backing, community) and publishes scores as cryptographically signed events on a federated relay network. Community members stake economic value to vouch for agent trustworthiness, with cascading slashing penalties upon confirmed misbehavior. Agent work is formalized through milestone-gated contracts with change order protocols, retention holdbacks, and graduated authority. A novel privacy-preserving trust attestation mechanism enables agents to prove they meet a trust threshold via zero-knowledge proofs without revealing identity, combining with blind-signed inference credentials to enable anonymous but economically accountable AI inference. A proxy-layer inference governance system enforces per-agent model access policies, configurable budget caps with automatic period resets, and provides agent self-service introspection APIs and structured audit logging at every governance decision point. An Ideal State Criteria runtime automatically generates binary testable quality criteria from task descriptions, tracks them at phase boundaries during execution, enforces verification-gated completion with circuit breaker anti-criteria, and emits quality signals consumed by the governance system. A unified three-pillar agent operating system architecture (Define → Route → Govern) provides integrated skill definition, inference routing, and governance from a single codebase serving individual developers through enterprises via configuration alone. The system operates non-custodially through pre-authorized wallet budget commitments, avoiding money transmitter classification while providing full escrow functionality through Lightning Network HODL invoices.

---

## NOTES FOR PATENT COUNSEL

### Filing Strategy

1. **Provisional filing** under 35 U.S.C. § 111(b) establishes priority date. Must file non-provisional within 12 months.

2. **Grace period:** First public disclosure was February 22, 2026 (npm publish of @percival-labs/vouch-sdk@0.1.0, GitHub repository publication, Railway API deployment, X/Twitter launch announcements). Under AIA, we have until February 22, 2027 to file.

3. **International considerations:** The 1-year grace period is US-only. If international filing is desired, the provisional must be filed BEFORE any further public disclosure. Paris Convention priority from provisional covers international filing within 12 months.

4. **NEW MATTER (not yet disclosed):** Claims 16-22 (Privacy-Preserving Trust Attestation / ZK Trust Proofs) have NOT been publicly disclosed as of March 5, 2026. These should be filed BEFORE any public discussion or publication. This is the strongest novel IP.

5. **Newly added claims (March 5, 2026):** Claims 29-44 cover the inference governance proxy (deployed Mar 4 at gateway.percival-labs.ai) and the ISC runtime/Agent OS architecture (committed Mar 5). Both are now publicly deployed/disclosed, so they fall under the 1-year AIA grace period. Defensive disclosures PL-DD-2026-003 and PL-DD-2026-004 establish prior art for the protocol-level concepts.

### Alice/Mayo Considerations

The claims are drafted to emphasize technical implementation over abstract concepts:
- Specific cryptographic protocols (RSA blind signatures, Schnorr signatures, ZK-SNARKs/STARKs)
- Specific network protocols (Lightning Network HTLCs, Nostr NIP-85/NIP-98)
- Technical anti-gaming mechanisms (asymmetric credit weighting, recursive trust, logarithmic tenure)
- Hardware-specific implementations (HODL invoices via Lightning channel state machines)

However, software patent eligibility under Alice v. CLS Bank remains uncertain. Counsel should assess each claim group independently for § 101 eligibility and consider:
- Emphasizing the "technological improvement" angle (non-custodial escrow via HODL invoices as technical improvement over custodial escrow)
- Including system claims (not just method claims) with specific hardware/network components
- Drafting dependent claims with maximum technical specificity

### Defensive Publication Alternative

If patent prosecution is deemed too expensive or risky under Alice, the following should be filed as defensive publications to establish prior art:

- arXiv preprint (already drafted: `arxiv-trust-staking-api-access.md`)
- IP.com prior art filing (already drafted: `ipcom-trust-staking-api-access.md`)
- Comprehensive defensive disclosure PL-DD-2026-001 (already published: `defensive-disclosure-trust-staking-api-access.md`)
- Defensive disclosure PL-DD-2026-002 (already published: `defensive-disclosure-mcp-governance.md`)
- Defensive disclosure PL-DD-2026-003 (already published: `defensive-disclosure-agent-inference-governance.md`)
- Defensive disclosure PL-DD-2026-004 (already published: `defensive-disclosure-isc-agent-os.md`)

**Recommendation:** File the provisional patent AND publish defensive disclosures. The provisional gives 12 months to assess whether full prosecution is worthwhile. The defensive publications prevent anyone else from patenting the same innovations.

### Trade Secret Complement

Certain implementation details should remain trade secrets (NOT included in this application):
- Exact dimension weights and their tuning methodology
- Behavioral anomaly detection thresholds and algorithms
- Staking engine optimization parameters
- Any trained ML models on trust data
- Internal scoring heuristics for dispute resolution

These should be documented internally with "CONFIDENTIAL — TRADE SECRET" headers, access-controlled to core team, and kept in private repositories.

### Related IP Actions

1. **Trademark:** File PERCIVAL LABS (Class 9 + 42) and VOUCH PROTOCOL (Class 9 + 42) immediately
2. **Entity formation:** Form Percival Labs LLC and execute IP assignment before filing
3. **Copyright:** Register copyright on vouch-sdk and vouch-api source code with US Copyright Office ($65 each)
4. **Domain:** percival-labs.ai already secured

### Estimated Costs

| Action | Cost | Timeline |
|--------|------|----------|
| Provisional patent filing (micro entity) | $320 | This week |
| Patent counsel review (COJK) | $2,000-5,000 | 1-2 weeks |
| Non-provisional filing (if pursued) | $10,000-15,000 | Within 12 months |
| Trademark filing (2 marks × 2 classes) | $1,400-2,800 | This week |
| LLC formation (WA) | $200 | This week |
| IP assignment agreement | $500-1,000 (attorney) | Same day as LLC |
| arXiv + IP.com defensive pub | $200 | This week |
| Copyright registration (2 works) | $130 | This week |

**Total immediate cost:** ~$2,250-4,450 (without counsel review)
**Total with counsel review:** ~$4,250-9,450

---

## APPENDIX A: PRIOR ART ANALYSIS

### Directly Related Prior Art

| Reference | Relevance | Distinction |
|-----------|-----------|-------------|
| Ethereum Proof-of-Stake (Buterin et al., 2020) | Staking for validator accountability | Designed for consensus, not API access; no multi-dimensional scoring; no cascading voucher slashing |
| EigenTrust (Kamvar et al., 2003) | Distributed reputation computation | No economic staking; no cascading liability; centralized trust computation |
| eBay/Amazon reputation systems | Online marketplace reputation | Centralized, non-portable, no economic stake, trivially gameable |
| World ID (Worldcoin) | Proof of humanness | Proves uniqueness, not trustworthiness; biometric, not behavioral |
| ERC-8004 AI Agent Standard | On-chain agent identity registry | Identity only, no trust scoring, no staking economics |
| Web of Trust (PGP) | Decentralized identity attestation | Costless attestations, no financial consequence for bad vouches |
| ZK API Usage Credits (Crapis/Buterin, 2026) | Anonymous API access via ZK proofs | Deposit-based (no vouching), no multi-dimensional trust, no construction contracts, research proposal only (no implementation) |
| Open Anonymity Project (Liu, 2025-2026) | Blind-signed anonymous inference | Pure anonymity, no trust attestation, no economic accountability |
| Confer (Marlinspike, 2026) | TEE-based private inference | Protects content (what), not identity (who); no trust scoring |
| Tinfoil AI | Confidential GPU inference | Protects content, not identity; no trust scoring or staking |
| DeepMind Intelligent Delegation (Tomasev et al., 2026) | Framework for AI agent delegation | Theoretical framework only; no implementation; identifies need for contracts/escrow/reputation but provides no system |

### Key Distinctions from Closest Prior Art

**vs. Vitalik/Crapis ZK API Credits:** Their system uses deposit-based accountability (user stakes own funds). Our system uses *voucher-based* accountability (third parties stake on the user, with cascading consequences). The voucher model creates due diligence incentives absent from self-staking and produces richer trust signals (staker quality weighting). Additionally, their proposal is a research paper with no implementation, while our system is deployed in production.

**vs. Open Anonymity Project:** Their system provides pure anonymity with no trust attestation. Our invention extends their blind signature infrastructure with ZK trust proofs, creating the novel combination of anonymous-but-trusted access. We do not claim the blind signature mechanism itself, but the combination with economic trust attestation.

**vs. DeepMind Intelligent Delegation:** Their framework identifies 9 required components for safe AI delegation but provides no implementation for any of them. Our system implements all 9 components with specific technical mechanisms (HODL invoices, NIP-85, construction contracts, etc.) and is deployed in production.

---

## APPENDIX B: IMPLEMENTATION EVIDENCE

### Production Deployment (First Public Disclosure: February 22, 2026)

| Artifact | Identifier | Timestamp |
|----------|------------|-----------|
| npm package | @percival-labs/vouch-sdk@0.1.0 | Feb 22, 2026 (npm registry, immutable) |
| npm package (current) | @percival-labs/vouch-sdk@0.2.1 | Feb 25, 2026 |
| GitHub repository | github.com/Percival-Labs/vouch-sdk | Feb 22, 2026 (public) |
| GitHub repository | github.com/Percival-Labs/vouch-api | Feb 22, 2026 (public) |
| API deployment | percivalvouch-api-production.up.railway.app | Feb 22, 2026 (Railway) |
| Database | PostgreSQL: 31 tables, 21 enums, migrations 0000-0008 | Feb 22-27, 2026 |
| First agent registered | npub1x8glnkcq80d55sxuqk0dnplwvvx4m7r43gam3ncs23847w7uzczqt5t96a | Feb 22, 2026 |
| NIP-85 service key | npub13cd0xer8e2r0n5s7npzgtj9thhfnqh4yjlfgsyhz9lpxll8kncfszwls2u | Feb 22, 2026 |
| Lightning treasury | Alby Hub on Railway, 250K sat channel | Feb 27, 2026 |
| Website | percival-labs.ai (Cloudflare Pages) | Feb 22, 2026 |
| Gateway deployment | gateway.percival-labs.ai (Cloudflare Worker) | Mar 4, 2026 |
| Gateway version | v0.4.0 — model policies, budget caps, admin API, audit logging | Mar 5, 2026 |
| Engram npm package | engram-harness@0.2.4 on npm (BSL 1.1) | Mar 5, 2026 |
| ISC runtime engine | engram-harness ISC module (generateISC, trackPhase, verify) | Mar 5, 2026 |
| Defensive disclosures | PL-DD-2026-001 through PL-DD-2026-004 published | Feb 22 – Mar 5, 2026 |

### Launch Content (Public Disclosure Evidence)

- Hook tweet + 8-tweet thesis thread + 6-tweet article thread posted via automated scheduling
- Research papers published at percival-labs.ai/research
- Full article: "The Agent That Attacked a Developer" (vouch-launch-article.md)

---

*END OF PROVISIONAL PATENT APPLICATION DRAFT*

*Prepared by: Percy (PAI) for Alan Carroll*
*Date: March 5, 2026 (updated from February 27, 2026 draft)*
*Status: DRAFT — Requires patent counsel review before filing*
*Claims: 44 total across 6 groups (A-F)*

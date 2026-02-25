# Economic Trust Staking as a Sybil-Resistant Access Control Mechanism for AI Model Inference APIs

**Alan Carroll**
Percival Labs, Bellingham, WA, USA
`percyai2025@gmail.com`

---

**Preprint.** Submitted to arXiv (cs.CR / cs.AI). February 23, 2026.

---

## Abstract

Current access control mechanisms for large language model (LLM) inference APIs rely on email-based account verification, terms-of-service enforcement, per-account rate limiting, and per-token pricing --- none of which impose meaningful economic costs on adversaries conducting large-scale model distillation attacks. The February 2026 disclosure by Anthropic PBC, revealing that approximately 24,000 fraudulent accounts generated over 16 million exchanges for the purpose of unauthorized capability extraction, demonstrates the inadequacy of these mechanisms against state-resourced adversaries. We propose a decentralized economic trust staking protocol that introduces an accountability layer between API consumers and providers. The protocol requires consumers to obtain cryptographically verifiable trust scores derived from five weighted dimensions: identity verification, account tenure, behavioral health, economic backing through community vouching chains, and cross-provider reputation. Elevated API access tiers require consumers to deposit slashable economic stakes, backed by vouchers who face cascading financial penalties upon confirmed misuse. We present a formal Sybil resistance analysis demonstrating that replicating the Anthropic attack scenario under our protocol would require a minimum of \$2.4M in at-risk capital plus 24,000 unique voucher entities, compared to approximately zero marginal cost under current mechanisms. We further specify a governance model for slashing adjudication comprising bounty-based investigation, random jury adjudication with commit-reveal voting, and constitutional limits on slashing power; a transaction safety mechanism using non-custodial stake locks for deterring non-payment without escrow; a federation architecture supporting multiple independent trust registries and progressive decentralization; and anti-gaming mechanisms including vouching graph analysis, score velocity limits, and continuous scoring. The protocol is provider-agnostic, built on Nostr decentralized identity primitives, and designed for cross-provider coordination without bilateral data-sharing agreements.

**Keywords:** API security, model distillation, Sybil resistance, trust staking, decentralized identity, reputation systems, access control, large language models, decentralized governance, transaction safety, federation

---

## 1. Introduction

Large language model providers expose inference capabilities through application programming interfaces (APIs) that accept natural language prompts and return model-generated responses. This interface creates an inherent tension: the same API access required for legitimate use also enables *model distillation* --- the systematic extraction of a frontier model's capabilities to train competing models at a fraction of the original research and compute cost [1].

On February 23, 2026, Anthropic PBC disclosed that organizations including DeepSeek, Moonshot AI, and MiniMax had created approximately 24,000 fraudulent accounts and conducted over 16 million exchanges with their Claude model for the explicit purpose of capability extraction [2]. The attack campaigns employed "hydra cluster" architectures: distributed networks of fraudulent accounts that spread traffic across API endpoints and third-party cloud platforms to evade per-account detection. Moonshot AI alone generated over 3.4 million exchanges targeting agentic reasoning and tool use, while MiniMax accumulated over 13 million exchanges focused on agentic coding and tool orchestration [2].

This disclosure exposes a fundamental structural weakness in contemporary API access control: **identity is cheap and consequences are weak.** Creating an account costs effectively zero. Banning an account imposes negligible cost on an attacker who can instantiate replacements at will. Rate limits are circumvented by distributing queries across thousands of accounts. Per-token API fees, while functioning as the intended cost of service, represent a trivial fraction of the cost of independent capability development for state-resourced adversaries.

We propose an *economic trust staking protocol* that addresses this structural weakness by introducing a layer of economic accountability between API consumers and providers. The core insight draws from proof-of-stake consensus mechanisms [3]: by requiring participants to deposit value that can be confiscated upon verified misbehavior, the protocol transforms identity from a costless resource into an economically backed commitment. We extend this paradigm with *community vouching chains* inspired by --- but materially distinct from --- the PGP Web of Trust [4], where trusted entities stake their own economic value and reputation to attest to consumer trustworthiness, creating multi-party financial accountability for API access.

The protocol is designed as neutral infrastructure: provider-agnostic, built on open decentralized identity primitives (Nostr [5]), and capable of enabling cross-provider coordination without requiring bilateral data-sharing agreements between competing providers.

**Contributions.** This paper makes the following contributions:

1. We formalize the *economic trust staking* paradigm for API access control, where consumers deposit slashable value as a prerequisite for elevated access tiers (Section 3).
2. We introduce *community vouching chains with cascading economic liability*, where vouchers face proportional financial penalties upon confirmed misuse by entities they have endorsed (Section 3.3).
3. We describe a *composite trust scoring framework* aggregating five dimensions --- identity verification, account tenure, behavioral health, economic backing, and cross-provider reputation --- into a single verifiable score used for tiered access control (Section 3.4).
4. We present a formal Sybil resistance analysis with concrete cost estimates demonstrating the protocol's deterrent properties against large-scale distillation attacks (Section 5).
5. We design a *cross-provider coordination mechanism* using cryptographically signed trust assertions on a decentralized protocol, enabling collective defense without centralized trust authorities (Section 3.7).
6. We specify a *governance model* for slashing adjudication comprising bounty-based investigation, random jury adjudication with commit-reveal voting, constitutional limits on slashing power, and an appeals process with independent review bodies (Section 5.5).
7. We define a *transaction safety mechanism* using non-custodial stake locks and a completion criteria framework for deterring non-payment and non-delivery in agent-to-agent transactions without introducing escrow or money transmission requirements (Section 5.6).
8. We describe a *federation architecture* enabling multiple independent trust registries and progressive decentralization from centralized reference implementations to protocol-level scoring standards (Section 5.7).
9. We present *anti-gaming mechanisms* including vouching graph analysis, score velocity limits, behavioral diversity requirements, cross-provider correlation, and continuous scoring to defend against adversaries who understand the scoring framework (Section 5.8).

The remainder of this paper is organized as follows. Section 2 surveys related work across proof-of-stake systems, reputation mechanisms, decentralized identity, and API security. Section 3 presents the system design. Section 4 details the authentication protocol. Section 5 provides the security analysis, including the governance model for slashing adjudication (Section 5.5), transaction safety mechanisms (Section 5.6), federation and decentralization (Section 5.7), and anti-gaming defenses (Section 5.8). Section 6 discusses limitations and future work. Section 7 concludes.

---

## 2. Related Work

### 2.1 Proof-of-Stake Consensus and Slashing

Proof-of-stake (PoS) consensus mechanisms require network validators to deposit collateral ("stake") that can be algorithmically confiscated ("slashed") upon provable protocol violations. Ethereum's Casper Friendly Finality Gadget (FFG) [3] formalizes this approach: validators stake ETH that is subject to slashing for equivocation (proposing conflicting blocks) or surround voting (submitting contradictory attestations). Buterin and Griffith demonstrate that accountable safety --- the property that conflicting finalized states cannot exist without at least one-third of total stake being slashed --- provides strictly stronger security guarantees than proof-of-work mining [3]. Our protocol extends the staking-and-slashing paradigm from blockchain consensus, where the protected resource is ledger integrity, to API access control, where the protected resource is inference capability.

### 2.2 Knowledge Distillation

Hinton, Vinyals, and Dean [1] formalized knowledge distillation as a model compression technique in which a smaller "student" model is trained to reproduce the output distribution of a larger "teacher" model, using soft probability targets generated at elevated temperature. While originally proposed as a legitimate technique for model deployment efficiency, the same methodology can be applied adversarially: an attacker queries a frontier model's API to generate a large corpus of (prompt, response) pairs, then uses this corpus as training data for a competing model. The Anthropic disclosure [2] confirms this attack vector at industrial scale, with carefully crafted prompts designed to elicit chain-of-thought reasoning and internal deliberation artifacts that provide richer training signal than surface-level responses alone.

### 2.3 Sybil Attacks

Douceur [6] proved that in any distributed system lacking a trusted central authority for identity certification, a single adversary can present an arbitrarily large number of pseudonymous identities (a "Sybil attack"). The proof establishes that without some form of resource expenditure tied to identity, no purely algorithmic defense can prevent Sybil attacks. Current API access control mechanisms --- email verification, CAPTCHA, IP-based throttling --- impose effectively zero marginal cost per identity, placing them squarely within Douceur's impossibility result. Our protocol addresses this by binding identity to economic stake, converting the Sybil problem from a computational challenge into an economic one.

### 2.4 Distributed Reputation Systems

Kamvar, Schlosser, and Garcia-Molina [7] introduced EigenTrust, an algorithm for computing global trust values in peer-to-peer networks by aggregating local trust assessments weighted by the assessor's own global trust score. EigenTrust demonstrated that iterative trust propagation can significantly reduce inauthentic behavior even when malicious peers collude. Our composite trust scoring framework shares EigenTrust's principle of trust-weighted aggregation but extends it with economic stakes: in our system, trust assessments (vouches) are backed by irrevocable financial commitments rather than costless ratings, creating skin-in-the-game accountability absent from pure reputation systems.

### 2.5 Web of Trust

The PGP Web of Trust, introduced by Zimmermann [4] in 1992, establishes identity through transitive chains of cryptographic key signatures. A user trusts an unknown key if it has been signed by keys the user already trusts, forming a directed graph of trust relationships. While PGP's Web of Trust pioneered decentralized identity attestation, it lacks economic accountability: signing another user's key imposes zero cost on the signer if the attested identity proves fraudulent. Our vouching mechanism adds economic stakes to each edge in the trust graph, transforming costless attestations into financially backed commitments subject to cascading slashing.

### 2.6 Decentralized Identity Protocols

The Nostr protocol [5], developed by fiatjaf beginning in 2020, provides a minimal framework for decentralized message transmission using cryptographic keypairs (secp256k1) and relay-based event distribution. Several Nostr Implementation Possibilities (NIPs) are directly relevant to our protocol. NIP-98 [8] defines HTTP authentication using signed ephemeral events (kind 27235), enabling passwordless, session-free API authentication via Schnorr signatures --- now being formalized as a W3C specification for HTTP authentication using Schnorr signatures. NIP-85 [9] defines Trusted Assertions (kind 30382), a mechanism for publishing signed computation results (such as Web of Trust scores) as addressable events that any client can independently verify. Our protocol builds directly on these primitives: NIP-98 provides the authentication substrate, and NIP-85 provides the trust assertion publication mechanism.

### 2.7 Payment Channel Networks

The Lightning Network [10], proposed by Poon and Dryja in 2016, enables near-instant, low-fee Bitcoin transactions through a network of bidirectional payment channels secured by Hash Time-Locked Contracts (HTLCs). The Lightning Network provides the financial infrastructure substrate for our staking engine: stakes are denominated in satoshis (sats) and managed through Lightning-compatible payment channels, enabling atomic deposit, lockup, yield distribution, and slashing operations with settlement finality measured in seconds rather than the minutes-to-hours required for on-chain Bitcoin transactions.

### 2.8 API Security and Rate Limiting

Contemporary API security relies primarily on API key management, OAuth token-based authentication, IP-based rate limiting, and behavioral anomaly detection [11]. These mechanisms operate at the *individual provider* level, creating information silos: each provider independently detects and responds to abuse, with no mechanism for sharing threat intelligence across competitors. An attacker can identify and exploit the provider with the weakest detection, creating a race-to-the-bottom dynamic. Our cross-provider coordination mechanism addresses this by establishing a shared, provider-agnostic trust layer that enables collective defense without requiring bilateral data-sharing agreements.

---

## 3. System Design

### 3.1 Architecture Overview

The protocol comprises three principal components operating in coordination (Fig. 1):

```
                        ┌──────────────────────────┐
                        │     Trust Registry       │
                        │  (Decentralized Store)   │
                        │  Nostr NIP-85 Events     │
                        └────────┬─────────────────┘
                                 │
                    ┌────────────┼────────────────┐
                    │            │                 │
              ┌─────▼──────┐ ┌──▼──────────┐ ┌───▼──────────┐
              │  Staking   │ │  Gateway    │ │  Behavioral  │
              │  Engine    │ │  Middleware  │ │  Telemetry   │
              │ (Lightning)│ │ (Per-Provider│ │  Aggregator  │
              └─────┬──────┘ │  Proxy)     │ └───┬──────────┘
                    │        └──────┬──────┘     │
                    │               │             │
              ┌─────▼───────────────▼─────────────▼──┐
              │          API Consumer                 │
              │    (Cryptographic Identity)           │
              └──────────────────────────────────────┘
```

**Figure 1.** High-level architecture of the economic trust staking protocol.

**Component A --- Trust Registry.** A decentralized data store containing cryptographically signed trust assertions for each registered entity. Trust assertions are published as signed Nostr events (kind 30382, per NIP-85 [9]) and are independently verifiable by any party possessing the signing key's public counterpart. The registry requires no central authority for read access; verification is purely cryptographic.

**Component B --- Staking Engine.** A financial infrastructure layer managing the lifecycle of economic stakes. Stakes are denominated in satoshis (sats) via the Lightning Network [10]. The engine handles deposit, lockup, yield distribution, unstaking notice periods, withdrawal, and slashing. All financial operations execute within atomic database transactions to prevent double-spend and race conditions.

**Component C --- Gateway Middleware.** A software layer deployed at or proxied through AI model providers' API endpoints. The gateway intercepts incoming requests, extracts the consumer's cryptographic identity from request headers, queries the Trust Registry for the consumer's current trust score, and enforces tiered access control. The gateway also collects behavioral telemetry and reports it to the Trust Registry asynchronously.

### 3.2 Entity Types

The system supports four entity types within a unified trust framework:

- **Consumer:** An organization or individual that consumes inference from AI model APIs. Consumers register with a cryptographic keypair and may optionally verify a domain or organizational identity.
- **Voucher:** Any registered entity that stakes economic value to attest to a consumer's trustworthiness. Vouchers are economically liable for the behavior of entities they vouch for.
- **Provider:** An AI model provider that integrates the gateway middleware and reports behavioral signals to the Trust Registry. Providers hold cryptographic identities and can file misuse reports.
- **Agent:** An autonomous AI system that may act as both consumer (when calling other models) and performer of tasks. Agents accumulate trust through verifiable task outcomes.

### 3.3 Vouching Mechanism and Cascading Liability

A consumer registers by generating a cryptographic keypair (secp256k1 for Nostr compatibility) and submitting a signed registration event to the Trust Registry. Upon registration, the consumer receives a baseline trust score in the lowest access tier.

To elevate access, the consumer must obtain *vouches* from one or more existing trusted entities. A vouch is a cryptographically signed assertion containing:

- The voucher's public key $pk_v$
- The consumer's public key $pk_c$
- An economic stake $s \in \mathbb{R}^+$ (denominated in sats)
- The voucher's own trust score $\tau_v$ at the time of vouching
- A cryptographic signature $\sigma = \text{Sign}(sk_v, pk_v \| pk_c \| s \| \tau_v \| t)$ where $t$ is the timestamp

The voucher's stake $s$ is locked for the duration of the vouch. Revoking a vouch initiates an unstaking notice period $\Delta_u$ (e.g., 7 days) during which the stake remains at risk. This notice period prevents vouchers from front-running slashing events by rapidly withdrawing stakes upon learning of an investigation.

**Cascading slashing.** When a consumer is confirmed to have engaged in misuse, all entities that actively vouch for the consumer suffer proportional economic losses. Let $\alpha \in [0, 1]$ denote the slash severity determined by the adjudication mechanism. For each voucher $v_i$ with active stake $s_i$:

$$\text{loss}(v_i) = \alpha \cdot s_i$$

Additionally, vouchers suffer a temporary reduction $\delta_\tau$ in their own trust scores, potentially cascading to other consumers they vouch for. This creates a natural due-diligence incentive: a rational voucher must assess the risk that any entity they endorse may be adversarial, because the voucher's own capital and reputation are at stake.

### 3.4 Composite Trust Score

Each entity's trust score $\tau$ is computed from multiple weighted dimensions. The specific weights, decay functions, normalization constants, and computational methods are implementation-specific and are not disclosed in this paper.[^1] The conceptual dimensions are:

**Dimension 1: Identity Verification ($d_{\text{id}}$).** Measures the strength of the entity's identity verification. Anonymous keypair-only registration scores lowest. Domain verification via DNS TXT record (Section 3.6) scores higher. Verified legal entity attestation scores highest.

**Dimension 2: Account Tenure ($d_{\text{age}}$).** Measures the age of the entity's registration. The function is typically logarithmic, providing diminishing returns for very old accounts while strongly penalizing newly created accounts:

$$d_{\text{age}} \propto \log(1 + t_{\text{account}})$$

**Dimension 3: Behavioral Health ($d_{\text{beh}}$).** Measures the healthiness of the entity's API usage patterns. Healthy patterns include diverse prompt content, natural timing variance, and multi-model exploration. Unhealthy patterns include systematic chain-of-thought extraction, uniform request timing, low prompt diversity, and rapid model switching immediately after new model releases.

**Dimension 4: Economic Backing ($d_{\text{econ}}$).** Measures the total economic value staked on the entity by vouchers, weighted by the vouchers' own trust scores:

$$d_{\text{econ}} = f\left(\sum_{i=1}^{n} s_i \cdot g(\tau_{v_i})\right)$$

where $s_i$ is the stake from voucher $v_i$, $\tau_{v_i}$ is the voucher's trust score, and $f, g$ are monotonically increasing functions.

**Dimension 5: Cross-Provider Reputation ($d_{\text{cross}}$).** Measures the entity's standing across multiple independent providers. Good standing at multiple providers increases the score. Flags from multiple providers are treated as strongly negative signals.

The composite score is a bounded aggregation:

$$\tau = \text{Bound}\left(\sum_{j} w_j \cdot d_j, \ [0, \ \tau_{\max}]\right)$$

where $w_j$ are the dimension weights and $\tau_{\max}$ is the maximum score (e.g., 1000). The score is recomputed periodically and on significant events (new vouch, new flag, stake change, slashing event).

[^1]: The scoring algorithm weights, normalization functions, decay parameters, and behavioral anomaly detection heuristics are retained as trade secrets. This paper discloses only the dimensional framework and compositional structure.

### 3.5 Tiered Access Control

The consumer's composite trust score $\tau$ maps to an access tier $T$ that determines API access privileges:

| Tier | Label | Requirements | Access Level |
|------|-------|-------------|-------------|
| $T_0$ | Restricted | Registration only | Minimal rate limits; no advanced capabilities |
| $T_1$ | Standard | $\tau \geq \tau_1$, min. stake, $\geq 1$ voucher | Standard rate limits |
| $T_2$ | Elevated | $\tau \geq \tau_2$, higher stake, $\geq k$ vouchers each with $\tau \geq \tau_v^{\min}$ | Higher rate limits; advanced capabilities |
| $T_3$ | Unlimited | $\tau \geq \tau_3$, substantial stake, multiple high-trust vouchers, verified domain, min. age | Full access; provider-defined limits |

**Table 1.** Access tier structure. Threshold values $\tau_1, \tau_2, \tau_3$ and voucher count $k$ are provider-configurable.

The gateway middleware enforces tiers by: (1) extracting the consumer's cryptographic identity from the request header; (2) querying the Trust Registry (with local caching) for the current score and tier; (3) comparing the required tier against the consumer's actual tier; (4) allowing, rate-limiting, or rejecting the request accordingly; and (5) returning the consumer's current score and tier in response headers for transparency.

### 3.6 Domain Verification

Consumers may verify ownership of an internet domain by publishing a DNS TXT record containing their cryptographic public key at a designated subdomain:

```
_vouch.example.com. IN TXT "vouch=npub1..."
```

The Trust Registry periodically resolves the DNS record and, upon successful verification, elevates the consumer's identity verification dimension $d_{\text{id}}$. Domain verification creates real-world accountability: a consumer operating under a verified domain is identifiable as a legal entity, making adversarial behavior subject to legal consequences in addition to economic ones.

### 3.7 Cross-Provider Coordination

The protocol enables collective defense through four mechanisms:

**Shared trust assertions.** Trust scores are published as cryptographically signed NIP-85 events on the Nostr relay network. Any provider can read any consumer's trust score without bilateral agreements.

**Aggregate behavioral signals.** Providers report usage pattern summaries to the Trust Registry without revealing proprietary model details or prompt content. Aggregation across providers enables detection of distributed attacks invisible to any single provider (e.g., an adversary distributing queries across providers to remain below individual detection thresholds).

**Coordinated slashing.** A misuse report corroborated by multiple independent providers carries greater evidentiary weight than a single report, reducing false positives and strengthening the basis for slashing decisions.

**Neutral infrastructure.** The Trust Registry is not owned or controlled by any single provider. It operates as neutral infrastructure that all providers benefit from but none can unilaterally manipulate. This resolves the coordination failure where providers are reluctant to share threat intelligence with competitors.

### 3.8 Slashing Mechanism

When a provider detects misuse --- including model distillation, systematic capability extraction, terms-of-service violations, or coordinated Sybil behavior --- it files a *misuse report* with the Trust Registry containing:

- The consumer's public key $pk_c$
- Evidence hash $H = \text{SHA-256}(\text{evidence bundle})$
- Severity classification $\alpha \in \{0.25, 0.50, 1.00\}$
- Detection signal metadata

Upon confirmation through a governance mechanism (multi-stakeholder adjudication, multi-provider consensus, or weighted community vote), a slashing event is triggered:

1. **Consumer slashing:** Trust score $\tau_c$ is reduced to $\tau_{\min}$ (tier $T_0$). Account may be suspended.
2. **Voucher cascade:** All active vouchers lose $\alpha \cdot s_i$ of their staked value and suffer temporary trust score reduction $\delta_\tau$.
3. **Slash distribution:** Confiscated funds are allocated among (a) the reporting provider, incentivizing detection; (b) a community treasury, funding public goods; and (c) a burn address, creating deflationary pressure that increases the cost of future attacks.

### 3.9 Voucher Yield Mechanism

To incentivize vouching for legitimate consumers, vouchers earn yield on staked value through:

- Activity fees: a percentage of the consumer's API usage fees flows to the vouch pool
- Platform fee redistribution to high-quality vouchers
- Protocol-level inflationary rewards

Yield is distributed proportionally to stake amount and may be weighted by the voucher's trust score. This creates a positive-sum economic loop: legitimate consumers attract vouchers, vouchers earn yield, and the increased economic backing raises consumer trust scores, enabling greater API access.

---

## 4. Authentication Protocol

Consumer authentication with provider APIs uses a cryptographic challenge-response mechanism embedded in HTTP headers, building on Nostr NIP-98 [8].

The consumer generates a signed authentication event (kind 27235) containing:

- Consumer public key $pk_c$
- Request URL (or URL pathname, for reverse-proxy compatibility)
- HTTP method
- Timestamp $t$ with validity window $\Delta_t$ (e.g., 60 seconds)
- SHA-256 hash of the request body (for POST/PUT/PATCH requests)

The event is signed with the consumer's private key using Schnorr signatures over secp256k1:

$$\sigma = \text{SchnorrSign}(sk_c, \text{event\_hash})$$

The signed event is Base64-encoded and transmitted in a custom HTTP header:

```
Authorization: Nostr <base64-encoded-event>
```

The gateway middleware verifies the signature, checks timestamp freshness, validates body hash integrity, and enforces replay protection by maintaining a sliding window of recently seen event identifiers.

This authentication scheme provides several desirable properties: (1) no server-side session state; (2) no passwords or shared secrets; (3) cryptographic binding of identity to each individual request; (4) body integrity verification preventing man-in-the-middle content modification; and (5) replay resistance through timestamp and identifier tracking.

---

## 5. Security Analysis

### 5.1 Sybil Resistance

We analyze the economic cost of replicating the Anthropic distillation attack scenario [2] under our protocol.

**Baseline (current mechanisms).** An adversary creates $N$ accounts at approximately zero marginal cost per account. Total cost: API inference fees only. For $N = 24{,}000$ accounts, the marginal identity cost is effectively \$0.

**Under the proposed protocol.** An adversary creating $N$ accounts must satisfy the following conditions:

1. **Keypair generation:** $N$ unique secp256k1 keypairs. Cost: computationally trivial ($\approx$ \$0).
2. **Economic staking:** Each account requires at least $M$ vouchers each staking value $S$. Total stake at risk: $N \times M \times S$.
3. **Voucher trust threshold:** Each of the $M$ vouchers must possess a trust score $\tau_v \geq \tau_v^{\min}$, requiring their own history of legitimate behavior and economic backing.
4. **Voucher uniqueness:** A single voucher cannot vouch for all $N$ accounts without detection. The system monitors voucher fan-out: an entity vouching for an anomalous number of consumers triggers investigation.
5. **Cascade risk:** If *any* of the $N$ accounts is detected and slashed, all vouchers for that account lose their stakes, and their reduced trust scores may cascade to *other* accounts they vouch for, potentially triggering a chain reaction across the entire Sybil network.

**Concrete cost estimate.** For $N = 24{,}000$ accounts with minimum staking requirements of $S = \$100$ per account and $M = 1$ voucher per account:

$$\text{Minimum capital at risk} = N \times M \times S = 24{,}000 \times 1 \times \$100 = \$2{,}400{,}000$$

This \$2.4M represents capital that is *locked and at risk of confiscation*, not merely spent. Additionally, the adversary must source 24,000 unique voucher entities, each with established trust scores and their own economic backing --- a coordination challenge that scales superlinearly with $N$ due to the difficulty of maintaining 24,000 credible false identities with consistent behavioral histories.

**Comparison.** Table 2 summarizes the cost differential.

| Dimension | Current Mechanisms | Proposed Protocol |
|-----------|-------------------|-------------------|
| Identity cost (N=24,000) | $\approx$ \$0 | $\geq$ \$2.4M locked capital |
| Detection recovery | Create new accounts | Capital lost, cascade to voucher network |
| Cross-provider evasion | Trivial (no coordination) | Trust score is portable and provider-agnostic |
| Behavioral camouflage | Per-provider detection only | Aggregated cross-provider behavioral signals |
| Time investment | Minutes (automated) | Months (building trust scores organically) |

**Table 2.** Cost comparison for a 24,000-account Sybil attack under current vs. proposed mechanisms.

Critically, these costs apply to adversarial use while remaining trivially affordable for legitimate consumers. A legitimate organization obtaining a single vouch with a \$100 stake faces a one-time, recoverable deposit --- comparable to a standard API prepayment.

### 5.2 Voucher Collusion Resistance

An adversary might attempt to create a self-reinforcing cluster of Sybil vouchers that vouch for each other. The protocol resists this through multiple mechanisms:

1. **Account tenure dimension:** Newly created accounts receive minimal tenure scores regardless of vouching, requiring the adversary to maintain Sybil identities for extended periods before they become useful.
2. **Behavioral health dimension:** Sybil accounts with no legitimate usage history or with uniform behavioral patterns receive low scores on the behavioral dimension, limiting their utility as vouchers.
3. **Cross-provider reputation:** Sybil vouchers registered with only a single provider, or with no provider usage history, contribute less to the economic backing dimension.
4. **Graph analysis:** The Trust Registry can apply standard Sybil detection heuristics on the vouching graph (e.g., detecting dense clusters weakly connected to the main trust graph) as an additional detection layer.
5. **Economic bootstrap cost:** Even in a self-vouching cluster, the total economic stake must be real. Creating $N$ Sybil entities that vouch for each other still requires depositing $N \times S$ in actual capital.

### 5.3 Provider Collusion Resistance

A malicious provider might file false misuse reports to slash competitors' consumers. The protocol mitigates this through:

1. **Multi-provider corroboration:** Slashing decisions weighted by the number of independent providers filing corroborating reports.
2. **Evidence hashing:** Misuse reports include SHA-256 hashes of evidence bundles, creating an auditable trail.
3. **Adjudication governance:** Slashing is not unilateral; it requires confirmation through a governance mechanism (the specific design of which is implementation-dependent).
4. **Reporter accountability:** Providers that file false reports may themselves face reputation penalties, creating a deterrent against weaponized reporting.

### 5.4 Trust Score Manipulation Resistance

The composite scoring framework resists manipulation through dimensional independence: an adversary cannot compensate for a weak dimension by inflating another. A newly created account with massive economic backing but zero tenure and no behavioral history will still score low overall, because the tenure and behavioral dimensions act as independent constraints that cannot be purchased.

### 5.5 Governance Model

The slashing mechanism described in Section 3.8 references a governance mechanism for confirming misuse reports. This section formalizes that governance model, which comprises four subsystems: bounty-based investigation, random jury adjudication, constitutional limits on slashing, and an appeals process.

#### 5.5.1 Bounty-Based Investigation

When a misuse report is filed, the protocol assigns investigators from a qualified pool via verifiable random selection. Investigators do not self-select cases. This separation of detection (the reporting entity) from investigation (a randomly assigned third party) prevents conflicts of interest in evidence evaluation.

**Investigator qualification.** An entity becomes eligible for the investigator pool by satisfying conjunctive requirements: a minimum trust score $\tau_{\text{inv}} \geq \tau_{\text{inv}}^{\min}$ (approximately the top 30th percentile of the network), a minimum economic stake $s_{\text{inv}} \geq s_{\text{inv}}^{\min}$, a minimum account tenure $t_{\text{inv}} \geq t_{\text{inv}}^{\min}$, an active investigation count below a bandwidth cap, a low rate of overturned findings within a rolling window, no pending disputes against the investigator, and explicit opt-in. These requirements ensure that investigators have sufficient reputation and economic exposure to incentivize thorough, honest investigation.

**Random assignment.** Upon report validation (reporter collateral deposited, behavior within statute of limitations, no double jeopardy), the protocol assigns $n_{\text{inv}} = 3$ investigators via a deterministic pseudorandom function seeded by a block hash and report identifier:

$$\text{seed} = H(\text{blockhash} \| \text{reportId} \| \text{nonce})$$

The seed is published on-relay for auditability. Assignment excludes the reporter, the accused, their respective vouchers, and entities sharing organizational affiliation. The odd number of investigators prevents ties and produces a convergence signal: unanimous agreement among three independent investigators constitutes strong evidence.

**Case anonymization.** Investigators receive anonymized case files containing behavioral data and evidence but not the identity of any party. The accused is labeled "Subject A," providers are labeled "Provider A," "Provider B," etc. De-anonymization occurs only after adjudication is complete. This anonymization prevents investigators from being influenced by the accused's reputation or organizational affiliation and mitigates the risk of investigator-accused collusion.

**Compensation.** Investigators are compensated from a bounty pool funded by protocol fee allocations, forfeited reporter collateral, and a surcharge on slashed funds. Full bounties are paid when findings are upheld by the jury; reduced bounties (25%) are paid when findings are overturned, reflecting the distinction between good-faith disagreement and bad-faith investigation. A consistency bonus is awarded when all three investigators converge and the finding is upheld. Investigators whose findings are consistently overturned face progressive eligibility degradation: calibration feedback, temporary suspension, and eventual removal from the pool.

#### 5.5.2 Random Jury Adjudication

After investigators submit findings, a randomly selected jury reviews the evidence, investigator reports, and the accused's response. Jury composition is drawn from a broader pool than investigators (lower trust score and stake thresholds), ensuring sufficient jury availability while maintaining minimum quality standards.

**Jury size and supermajority.** Jury size scales with report severity: 5 jurors for low-severity reports, 7 for medium, 9 for high, and 11 for critical. Slashing requires a supermajority of at least 75% of the jury, ensuring that marginal or contested cases default to dismissal rather than punishment.

**Commit-reveal voting.** Votes are submitted as sealed commitments (hash of vote and nonce), then revealed simultaneously after all jurors commit. This prevents bandwagon effects where jurors anchor on early votes:

$$\text{commit}_i = H(\text{vote}_i \| \text{nonce}_i)$$

In the reveal phase, each juror publishes $(\text{vote}_i, \text{nonce}_i)$, and the protocol verifies $H(\text{vote}_i \| \text{nonce}_i) = \text{commit}_i$. This scheme is a standard cryptographic commitment protocol adapted for decentralized governance.

**Deliberation process.** Jurors receive the anonymized case file, all investigator findings, a convergence score measuring investigator agreement, the accused's defense statement (if submitted within the response deadline), and the constitutional context (prior offense count, maximum allowable slash). Deliberation occurs in an encrypted ephemeral channel (Nostr NIP-29 group with NIP-44 encryption) using pseudonyms. The group is destroyed after the vote concludes.

**Decision matrix.** If a supermajority votes to slash, the slash executes at the median recommended severity (capped by constitutional limits). If a supermajority votes to dismiss, the report is dismissed and the reporter's collateral is forfeited to the bounty pool. A hung jury (no supermajority) triggers re-adjudication with a new jury (maximum one retry); a second hung jury defaults to the lowest-severity outcome for the given offense count.

#### 5.5.3 Constitutional Limits on Slashing

The governance system is bounded by a set of protocol-level invariants that cannot be overridden by governance votes, jury decisions, investigator findings, or any other mechanism. These constitutional limits, inspired by the principle that governance systems require meta-constraints to prevent self-corruption [14], exist to ensure the governance apparatus itself cannot be weaponized:

1. **Maximum slash per incident:** No single slashing event may confiscate more than 50% of the entity's stake. This preserves a recovery path and prevents total wipeout from a single report.

2. **Mandatory evidence period:** A minimum of 14 days must elapse between report filing and adjudication vote, ensuring the accused has adequate time to prepare a defense.

3. **Reporter collateral:** The reporting entity must deposit collateral equal to 10% of the potential slash amount. This collateral is returned (with a reward) if the report is upheld, and forfeited if the report is dismissed. This makes frivolous reporting expensive.

4. **Graduated severity:** Consequences escalate with offense history: first offense results in a warning and score reduction only (no stake slashing); second offense within 365 days permits a maximum 25% slash; third offense permits the constitutional maximum of 50% plus permanent restricted-tier assignment. This graduated schedule ensures proportional response.

5. **Statute of limitations:** Reports must be filed within 90 days of the alleged behavior. Stale evidence is unreliable, and indefinite vulnerability to prosecution creates chilling effects disproportionate to deterrence benefits.

6. **No double jeopardy:** The same specific behavior (identified by SHA-256 hash of the evidence bundle) cannot be the basis of more than one report, preventing pile-on attacks.

7. **Minimum access floor:** Even permanently restricted entities retain nonzero access: rate-limited, basic-capability-only, with full visibility into their own score, dispute history, and appeal rights. No provider integrating the protocol's gateway middleware may use the trust scoring system to completely deny access.

These invariants are enforced at the adjudication engine level, not the governance level. The slash execution function validates all constitutional constraints before executing any state change, and rejects operations that would violate any invariant.

#### 5.5.4 Appeals Process

Any party (accused or reporter) may appeal a jury decision within a defined filing window (e.g., 14 days). Appeals must specify at least one recognized ground: new evidence not available during original adjudication, procedural error in assignment or anonymization, constitutional violation in the adjudication, disproportionate severity, or identity error (evidence misattributed to the wrong entity). Appeals without valid grounds are rejected algorithmically.

The appeal body is a *completely different* randomly selected jury, larger than the original (original size plus two jurors), drawn from the same qualified pool but excluding all members of the original jury, the original investigators, and standard conflict-of-interest exclusions. This ensures independent review.

The appeal jury may uphold the original decision, overturn it (reversing any slash and restoring the accused's stake), or reduce the severity. Critically, the appeal jury *cannot* increase the severity of the outcome --- the non-reformation principle ensures that filing an appeal cannot make the appellant's situation worse. Only one appeal per case is permitted.

The maximum total time from report filing to final resolution is bounded: 14 days (evidence period) + 14 days (investigation) + 7 days (jury deliberation) + 14 days (appeal window) + 14 days (appeal process) = 63 days. This bounded timeline provides certainty to all parties.

### 5.6 Transaction Safety

The trust staking protocol, as described in Section 3, addresses the Sybil resistance problem for API access control. However, as the protocol's trust scores become useful for broader agent-to-agent and agent-to-human transactions, a complementary mechanism is needed to deter non-payment and non-delivery without introducing custodial risk or money transmission requirements.

#### 5.6.1 Non-Payment Stake Lock

The stake lock mechanism places a conditional hold on a portion of a transacting party's *existing* Vouch stake. This is not escrow: no new funds are held, no funds transfer between parties through the mechanism, and no money transmission licensing is required. The actual transfer of payment occurs outside the Vouch protocol via Lightning, fiat, or any other payment method the parties agree on. Vouch's role is limited to making non-payment economically irrational by placing the purchaser's existing stake at risk.

When a transaction begins, the protocol places a lock on a portion of the purchaser's stake equal to the transaction value, subject to a maximum lock percentage $\lambda_{\max}$ (e.g., 40% of total stake) and a minimum stake headroom requirement (e.g., total stake $\geq 2 \times$ transaction value). The locked stake continues to earn yield and remains in the staking pool, but cannot be unstaked during the lock period. If the performer confirms receipt of payment, the lock releases automatically. If the performer files a non-payment report, the lock converts to a frozen state (no yield, no unstaking), and the standard investigation and adjudication process (Section 5.5) determines the outcome.

If non-payment is confirmed through adjudication, the frozen stake is slashed (subject to constitutional limits from Section 5.5.3). Critically, slashed funds are directed to the protocol treasury and burn address --- *not* to the performer. Directing slashed funds to the performer would constitute escrow and introduce money transmission regulatory requirements. The deterrent operates purely through loss: the purchaser loses stake and reputation, making non-payment economically irrational even though the performer does not receive the slashed funds directly.

**Symmetric accountability.** The same mechanism applies in reverse for non-delivery: when a performer accepts a high-value task, their existing Vouch stake can be locked as a delivery guarantee. If the performer takes payment and fails to deliver, the purchaser can file a non-delivery report, triggering the same investigation and adjudication process.

#### 5.6.2 Completion Criteria Framework

To adjudicate non-delivery disputes, the protocol requires a framework for defining what constitutes "completion." Two approaches serve different use cases:

**Parametric completion (automated).** For machine-verifiable conditions --- schema validation, response time thresholds, uptime percentages, error rates, deadline compliance --- the protocol evaluates completion deterministically against recorded data. No human judgment is required, and disputes are resolved by re-running the evaluation. This approach is particularly suited to API service-level agreements in the inference access control context.

**Template-based completion (semi-structured).** For agent-to-agent or agent-to-human transactions where completion involves subjective elements, the protocol provides standardized templates: delivery confirmation (binary), quality rating (scale-based with a minimum acceptable threshold), milestone tracking (percentage-of-milestones-complete with deadlines), and timebound delivery (deadline with grace period). Both parties must agree on a template before work begins, and the agreement is published as a signed Nostr event. When a dispute arises and a template was agreed upon, investigation and jury deliberation are significantly simplified: investigators evaluate against concrete criteria ("Was milestone X met by the deadline?") rather than subjective quality assessments ("Was the work satisfactory?").

New templates can be proposed and standardized through community governance: an entity publishes a template proposal, the community discusses for a defined period, and the template is adopted upon a stake-weighted supermajority vote.

#### 5.6.3 Reputation Multipliers for Payment Violations

Payment violations carry disproportionately heavy reputation consequences relative to other negative signals, creating an asymmetric deterrent where the reputation cost of defection far exceeds the financial gain. Let $\mu$ denote the reputation multiplier applied to a payment violation. For confirmed non-payment or non-delivery, $\mu = 4$; when fraud indicators are present (evidence of premeditated non-payment, identity misrepresentation, multiple victims, evidence destruction, or collusion), $\mu = 5$. The base trust score impact $\Delta_\tau^{\text{base}}$ is multiplied by $\mu$:

$$\Delta_\tau^{\text{payment}} = \mu \cdot \Delta_\tau^{\text{base}}$$

The practical effect is that a single confirmed payment violation produces a trust score reduction equivalent to approximately ten standard negative outcome reports. An entity with $\tau = 650$ may drop to $\tau \approx 330$--$530$ from a single payment violation, potentially falling multiple access tiers. Recovery is possible but slow: 90 days of clean behavior before score recovery begins, 180 days before tier upgrade review eligibility, and 365 days before the fraud multiplier expires from the active scoring window.

### 5.7 Federation and Decentralization

The protocol as described in Section 3 implies a single Trust Registry. In practice, the architecture is designed to support federation: multiple independent trust registries, operated by different entities, computing trust scores over potentially overlapping populations.

#### 5.7.1 Multiple Independent Trust Registries

Any entity may operate a trust registry that computes trust scores using the dimensional framework described in Section 3.4. Each registry publishes its scores as signed NIP-85 events on the Nostr relay network, identifiable by the registry's public key. Different registries may apply different scoring weights, behavioral thresholds, and normalization functions to the same underlying dimensions, producing scores that reflect their operators' risk preferences and detection philosophies.

This federation model follows the pattern of Certificate Authorities in the TLS ecosystem, but with a critical difference: trust registries publish to a shared decentralized substrate (Nostr relays) rather than proprietary distribution channels, enabling cross-registry verification without bilateral agreements.

#### 5.7.2 Provider Trust Stores

API providers choose which trust registries they accept, analogous to a browser's root certificate store. A provider's *trust store* is the set of registry public keys whose scores the provider's gateway middleware will honor. A conservative provider might accept scores only from registries with established track records. A permissive provider might accept scores from any registry, applying its own weighting to scores from less-established registries.

This design decouples scoring authority from access control enforcement. A provider need not trust a single centralized scoring entity; it can aggregate scores from multiple registries, weight them by the provider's assessment of each registry's reliability, and enforce access tiers based on the weighted aggregate. Formally, the provider computes:

$$\tau_{\text{eff}} = \sum_{r \in R_p} w_r \cdot \tau_r$$

where $R_p$ is the provider's trust store, $\tau_r$ is the score from registry $r$, and $w_r$ is the provider's weight for registry $r$ with $\sum_r w_r = 1$.

#### 5.7.3 Decentralization Progression

The protocol is designed for progressive decentralization. In its initial deployment, Percival Labs operates the reference trust registry and defines the scoring algorithm weights. As the ecosystem matures, the following transitions are anticipated:

*Phase 1 (centralized reference).* A single reference registry operated by Percival Labs. Providers integrate with this registry. The scoring algorithm weights are trade secrets.

*Phase 2 (federated registries).* Multiple independent registries emerge. Providers configure trust stores. Competition among registries drives improvements in scoring accuracy and gaming resistance. The dimensional framework (Section 3.4) becomes a de facto standard while specific weights remain registry-specific.

*Phase 3 (protocol-level scoring).* The community converges on scoring primitives that are standardized at the protocol level. Registries compete on detection heuristics and behavioral analysis rather than scoring framework design. Trust assertions become interoperable across registries.

This progression mirrors the maturation pattern of internet protocols: initial centralized reference implementations give way to federated implementations, which eventually converge on protocol-level standards [14].

### 5.8 Anti-Gaming Mechanisms

The composite trust scoring framework (Section 3.4) and Sybil resistance analysis (Section 5.1) address first-order gaming attacks. This section describes second-order defenses against adversaries who understand the scoring framework and attempt to exploit its structure.

#### 5.8.1 Vouching Graph Analysis

Circular vouching --- where $A$ vouches for $B$ and $B$ vouches for $A$, or more generally where entities form a cycle $A \to B \to C \to \cdots \to A$ in the vouching graph --- inflates economic backing scores without introducing genuine third-party accountability. The protocol detects circular patterns via periodic graph analysis on the vouching directed graph $G = (V, E)$ where vertices are entities and edges are active vouches.

For direct reciprocal vouching (cycle length 2), the vouching weight between the two entities is reduced by 50%. For short cycles (length 3--5), an investigation is triggered and vouching weight is reduced by 75%. For longer cycles (length $\geq 6$), vouching weight is automatically zeroed for all entities in the ring. Entities may dispute circular vouching findings by demonstrating a legitimate relationship, and the standard adjudication process (Section 5.5) applies to contested findings.

More generally, the Trust Registry applies standard Sybil detection heuristics on the vouching graph, including detection of dense clusters weakly connected to the main trust graph [12], identification of accounts with correlated registration timing or behavioral patterns, and analysis of stake mirroring (identical stake amounts deposited at identical times).

#### 5.8.2 Score Velocity Limits

Trust scores are subject to asymmetric rate limits on positive changes. Scores cannot increase faster than defined daily, weekly, and monthly ceilings (e.g., $+\Delta_{\max}^d$ per day, $+\Delta_{\max}^w$ per week, $+\Delta_{\max}^m$ per month, where $\Delta_{\max}^m < 4 \cdot \Delta_{\max}^w < 28 \cdot \Delta_{\max}^d$ to prevent gaming through sustained high daily increments). New accounts are subject to an additional warming period with lower daily ceilings.

Critically, *decreases* are not rate-limited: negative signals (misuse reports, slashing events, behavioral flags) reduce scores immediately. This asymmetry is intentional: trust should be difficult to build and easy to lose, matching the real-world dynamics of reputation [13]. An adversary cannot rapidly inflate a score, execute an attack, and benefit from the cached high score; the score's slow ascent means that months of buildup are erased by a single confirmed offense.

#### 5.8.3 Behavioral Diversity Requirements

High trust scores require activity across multiple signal dimensions. A score above a threshold $\tau_d$ cannot be achieved with activity in fewer than $k_d$ of the five dimensions, and each active dimension must contribute at least a minimum score $d_{\min}$. This prevents adversaries from concentrating resources in a single gameable dimension (e.g., accumulating massive economic backing while maintaining zero behavioral history) to achieve artificially elevated access tiers. The dimensional independence noted in Section 5.4 is thus enforced not merely through weight distribution but through explicit minimum-contribution constraints.

#### 5.8.4 Cross-Provider Behavioral Correlation

For entities registered with multiple providers, behavioral inconsistency across providers constitutes a strong fraud signal. The Trust Registry computes correlation metrics across providers, including usage volume ratios, chain-of-thought extraction rate variance, timing pattern correlation, and model preference consistency. High variance (e.g., normal usage patterns on one provider and heavy systematic extraction on another) exceeding a threshold number of standard deviations from the population mean triggers investigation. This cross-provider correlation is a direct defense against the attack strategy of maintaining clean behavior on monitored providers while concentrating extraction on providers perceived as less vigilant.

#### 5.8.5 Continuous Scoring

The protocol employs continuous scoring rather than point-in-time snapshots. Trust scores are recomputed at regular intervals (e.g., every 15 minutes) and on trigger events including usage volume spikes, chain-of-thought ratio spikes, new provider registrations, stake lock activations, and dispute filings. Trigger events cause immediate cache invalidation and fresh score computation. This prevents the temporal exploit where an adversary builds a high score, executes an attack during a cache window, and benefits from the stale high score before the system detects the behavioral shift. The gateway middleware's score cache has a maximum time-to-live that is shorter than the minimum detectable attack duration, ensuring that behavioral shifts are reflected in access control decisions with bounded latency.

---

## 6. Discussion

### 6.1 Limitations

**Cold start problem.** New legitimate consumers face a bootstrapping challenge: they begin with minimal trust scores and must find existing trusted entities willing to vouch for them. This friction is intentional --- it is precisely the cost that deters Sybil attacks --- but it may impede adoption if the initial onboarding experience is excessively burdensome. Mitigation strategies include provider-operated onboarding vouching for verified organizational identities and graduated stake requirements that begin low for new consumers.

**Governance centralization risk.** While the Trust Registry is architecturally decentralized, the slashing adjudication mechanism introduces a governance dependency. If adjudication is captured or corrupted, the slashing mechanism could be weaponized. The specific governance design --- whether multi-stakeholder committee, token-weighted vote, or algorithmic adjudication --- represents a critical implementation decision with significant security implications that we leave to future work.

**Privacy considerations.** Cross-provider behavioral signal aggregation, while essential for detecting distributed attacks, raises privacy concerns. The aggregation mechanism must be designed to share sufficient signal for collective defense without exposing individual prompt content, user behavior patterns, or proprietary model interaction details. Techniques from federated learning and differential privacy may be applicable.

**Jurisdictional complexity.** Economic staking and slashing operate across jurisdictions with varying regulations on digital assets, financial deposits, and consumer protection. Legal compliance of the staking engine is an implementation concern that varies by deployment context.

**Minimum access floor as protocol guarantee.** A critical design tension exists between deterrence and exclusion. A protocol that can reduce an entity's access to zero becomes indistinguishable from the walled-garden access control it seeks to replace. To resolve this tension, the protocol enforces a *minimum access floor* as a protocol-level invariant: even permanently restricted entities retain nonzero access --- rate-limited, basic-capability-only, but never fully denied. This guarantee ensures that the trust staking protocol operates as a *trust gradient* rather than a kill switch, and that the friction imposed on low-trust entities incentivizes rehabilitation rather than circumvention. The minimum access floor is not a provider option; it is a condition of gateway middleware integration.

**Opt-in escape hatch and market competition.** Provider participation in the trust staking protocol is voluntary. Consumers who consider the protocol's requirements burdensome may use providers that do not integrate the gateway middleware. This opt-in property functions as a market-level escape valve: if the protocol's friction becomes disproportionate to its benefits, rational consumers will migrate to non-participating providers, exerting competitive pressure on the protocol to calibrate appropriately. The protocol thus operates within a competitive market, not as a monopolistic access authority. This market discipline is essential for preventing the governance mechanisms from becoming instruments of exclusion rather than instruments of trust.

**Community self-policing as primary enforcement.** The governance mechanisms described in Section 5.5 are designed to make the protocol self-policing: every dispute, investigation, and adjudication produces economic signals that increase the cost of future adversarial behavior while reducing the cost borne by honest participants. The key insight, drawn from Ostrom's analysis of common-pool resource governance [13], is that communities with skin-in-the-game and transparent rules can govern shared resources more effectively than either centralized authorities or purely algorithmic mechanisms. The voucher notification mechanism (Section 5.6) operationalizes this principle: when a dispute is filed against an entity, all vouchers receive immediate notification of their economic exposure, creating a social pressure mechanism that frequently resolves disputes before formal adjudication is required. This community self-policing reduces the system's dependence on formal governance processes while strengthening the social accountability that makes the trust network valuable.

### 6.2 Applicability Beyond Model Distillation

While motivated by AI model distillation, the protocol's architecture is applicable to any high-value API access control scenario where identity is cheap and consequences for misuse are weak. Potential application domains include:

- **Any AI inference API** with capabilities worth protecting
- **High-value digital services** (financial APIs, healthcare data APIs) where abuse has asymmetric impact
- **Autonomous AI agent identity** and cross-platform reputation
- **Decentralized marketplace trust** for services delivered by AI systems

### 6.3 Relationship to Existing Standards

The protocol is designed for compatibility with emerging standards in decentralized identity and HTTP authentication. The W3C Nostr Community Group is formalizing NIP-98 as a general-purpose HTTP authentication scheme using Schnorr signatures [8]. The Nostr relay network provides the publication and discovery infrastructure for NIP-85 trust assertions [9]. Integration with W3C Decentralized Identifiers (DIDs) and Verifiable Credentials is architecturally straightforward, as the protocol's identity layer is agnostic to the specific cryptographic primitive used.

### 6.4 Economic Incentive Alignment

The protocol creates a positive-sum equilibrium for legitimate participants:

- **Consumers** benefit from portable, verifiable reputation that unlocks elevated access across providers.
- **Vouchers** earn yield on staked capital while performing a socially valuable due-diligence function.
- **Providers** benefit from shared threat intelligence and reduced abuse without sharing proprietary detection methods.
- **The ecosystem** benefits from higher barriers to adversarial use and lower barriers for legitimate use.

This incentive alignment is critical for adoption: each participant class must derive independent benefit from participation, rather than relying on altruistic cooperation.

---

## 7. Conclusion

The February 2026 Anthropic disclosure demonstrates that current API access control mechanisms are structurally inadequate against resourced adversaries conducting model distillation at scale. We have presented an economic trust staking protocol that addresses this structural weakness by introducing a decentralized accountability layer between API consumers and providers. The protocol transforms identity from a costless resource into an economically backed commitment through community vouching chains with cascading financial liability, composite trust scoring across five independent dimensions, and cross-provider coordination via cryptographically signed trust assertions on a decentralized protocol.

Our Sybil resistance analysis demonstrates that the protocol raises the minimum cost of replicating the disclosed 24,000-account attack from approximately zero to at least \$2.4M in locked, at-risk capital --- a transformation from computationally trivial to economically prohibitive --- while imposing negligible friction on legitimate consumers. The protocol is provider-agnostic, requires no central trust authority, and enables collective defense among competing providers without bilateral data-sharing agreements.

Beyond access control, we have specified a governance model that bounds adjudicatory power through constitutional invariants, ensures due process through bounty-based investigation and random jury adjudication with commit-reveal voting, and provides an appeals process with independent review. The transaction safety mechanisms extend the protocol's utility to agent-to-agent commerce through non-custodial stake locks and structured completion criteria, without introducing escrow or money transmission requirements. The federation architecture enables progressive decentralization from centralized reference implementations to protocol-level scoring standards. Anti-gaming mechanisms --- including vouching graph analysis, score velocity limits, behavioral diversity requirements, cross-provider correlation, and continuous scoring --- defend against adversaries who understand and attempt to exploit the scoring framework's structure.

An open-source reference implementation, including an SDK (`@percival-labs/vouch-sdk`) and a public API, is available at https://percival-labs.ai.

---

## Acknowledgements

The concepts described in this paper were first disclosed as a defensive disclosure (Document ID: PL-DD-2026-001) filed February 23, 2026, under the provisions of the America Invents Act (AIA), 35 U.S.C. 102(a)(1).[^2] Prior art was established through public software releases (npm package `@percival-labs/vouch-sdk@0.1.0`, February 22, 2026), public API deployment, public website documentation, and public social media posts (15 posts on X/Twitter, February 22, 2026). The protocol-level concepts described herein are dedicated to the public domain for the purpose of prior art establishment and preventing patent claims by any party. All rights to specific implementations, trade secrets (including scoring algorithm weights, normalization functions, decay parameters, and behavioral anomaly detection heuristics), and trademarks are reserved.

[^2]: This paper constitutes a defensive disclosure under 35 U.S.C. 102(a)(1) and equivalent international provisions. The described protocol-level concepts are dedicated to the public for the purpose of preventing patent claims. Specific implementations are retained as trade secrets.

---

## References

[1] G. Hinton, O. Vinyals, and J. Dean, "Distilling the knowledge in a neural network," *arXiv preprint arXiv:1503.02531*, 2015.

[2] Anthropic PBC, "Detecting and preventing distillation attacks," Anthropic News, Feb. 23, 2026. [Online]. Available: https://www.anthropic.com/news/detecting-and-preventing-distillation-attacks

[3] V. Buterin and V. Griffith, "Casper the friendly finality gadget," *arXiv preprint arXiv:1710.09437*, 2017.

[4] P. R. Zimmermann, *The Official PGP User's Guide*. Cambridge, MA, USA: MIT Press, 1995.

[5] fiatjaf, "Nostr: Notes and other stuff transmitted by relays," 2020. [Online]. Available: https://github.com/nostr-protocol/nostr

[6] J. R. Douceur, "The Sybil attack," in *Proc. 1st Int. Workshop Peer-to-Peer Systems (IPTPS)*, ser. Lecture Notes in Computer Science, vol. 2429. Cambridge, MA, USA: Springer, 2002, pp. 251--260.

[7] S. D. Kamvar, M. T. Schlosser, and H. Garcia-Molina, "The EigenTrust algorithm for reputation management in P2P networks," in *Proc. 12th Int. Conf. World Wide Web (WWW '03)*. New York, NY, USA: ACM, 2003, pp. 640--651.

[8] Nostr Protocol, "NIP-98: HTTP auth," 2023. [Online]. Available: https://github.com/nostr-protocol/nips/blob/master/98.md

[9] Nostr Protocol, "NIP-85: Trusted assertions," 2024. [Online]. Available: https://github.com/nostr-protocol/nips/blob/master/85.md

[10] J. Poon and T. Dryja, "The Bitcoin Lightning Network: Scalable off-chain instant payments," Jan. 2016. [Online]. Available: https://lightning.network/lightning-network-paper.pdf

[11] OWASP Foundation, "API security top 10," 2023. [Online]. Available: https://owasp.org/API-Security/

[12] G. Danezis and P. Mittal, "SybilInfer: Detecting Sybil nodes using social networks," in *Proc. 16th Annu. Network Distrib. Syst. Security Symp. (NDSS '09)*, San Diego, CA, USA, 2009.

[13] E. Ostrom, *Governing the Commons: The Evolution of Institutions for Collective Action*. Cambridge, UK: Cambridge University Press, 1990.

[14] L. Lessig, *Code and Other Laws of Cyberspace*. New York, NY, USA: Basic Books, 1999.

---

*Corresponding author: Alan Carroll, Percival Labs, Bellingham, WA, USA. Email: percyai2025@gmail.com. Web: https://percival-labs.ai.*

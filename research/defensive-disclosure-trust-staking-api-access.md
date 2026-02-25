# Defensive Disclosure: Economic Trust Staking as an Access Control Mechanism for AI Model Inference APIs

**Publication Type:** Defensive Disclosure / Technical Disclosure
**Filing Date:** February 23, 2026
**Inventors:** Alan Carroll (Bellingham, WA, USA)
**Assignee:** Percival Labs (Bellingham, WA, USA)
**Document ID:** PL-DD-2026-001

---

## Notice

This document constitutes a defensive disclosure under the provisions of the America Invents Act (AIA), 35 U.S.C. 102(a)(1). It is published to establish prior art and prevent the patenting of the described methods, systems, and techniques by any party. The authors explicitly dedicate the described protocol-level concepts to the public domain for the purpose of prior art establishment, while reserving all rights to specific implementations, trade secrets, and trademarks.

---

## 1. Technical Field

This disclosure relates to methods and systems for controlling access to artificial intelligence model inference APIs using economic trust staking mechanisms, and more particularly to decentralized identity and reputation systems that create economic accountability for API consumers through cryptographically verifiable trust scores, community-backed vouching chains, and stake-based slashing for misuse including unauthorized model distillation.

---

## 2. Background

### 2.1 The Model Distillation Problem

Large language model (LLM) providers offer inference access through application programming interfaces (APIs). Consumers send prompts and receive model-generated responses. A known attack vector, termed "model distillation," involves systematically querying a frontier model to generate training data that is then used to train a competing model, effectively replicating the capabilities of the original model without bearing the research and compute costs.

On February 23, 2026, Anthropic PBC disclosed that multiple organizations had created over 24,000 fraudulent accounts and generated over 16 million exchanges with their Claude model for the purpose of model distillation. This disclosure highlighted fundamental inadequacies in existing API access control mechanisms.

### 2.2 Limitations of Current Approaches

Current API access control relies on the following mechanisms, each of which has significant limitations:

**Email-based account verification:** Creating accounts costs effectively zero, enabling mass Sybil attacks where a single adversary creates thousands of pseudonymous identities.

**Terms of Service (ToS) enforcement:** ToS violations result in account bans, which impose negligible cost on an attacker who can create replacement accounts at will.

**Rate limiting:** Per-account rate limits can be circumvented by distributing queries across many accounts.

**Payment-based access control:** API fees (per-token pricing) are the intended cost of service, not a security mechanism. For state-backed actors, the API fees for 16 million queries represent a trivial fraction of the cost of developing equivalent capabilities independently.

**Provider-specific detection:** Each model provider builds proprietary detection systems independently. Attackers can identify and rotate to whichever provider has the weakest detection, creating a race-to-the-bottom dynamic.

The fundamental problem is that **identity is cheap and consequences are weak**. There is no economic accountability layer between the consumer and the provider.

### 2.3 Related Work

**Proof-of-Stake consensus mechanisms** (Ethereum 2.0, Cosmos, etc.) require validators to stake tokens that can be slashed for misbehavior. This disclosure extends the staking-and-slashing paradigm from blockchain consensus to API access control.

**Web of Trust (PGP)** establishes identity through chains of cryptographic signatures. This disclosure extends the trust-chain concept by adding economic stakes to each link in the chain, creating financial accountability for vouching.

**Decentralized identity systems** (Nostr, DID, Verifiable Credentials) provide cryptographic identity primitives. This disclosure builds upon these primitives to create an economic access control layer.

**Reputation systems** (eBay feedback, Uber ratings) aggregate behavioral signals. This disclosure extends reputation by binding it to irrevocable economic stakes rather than costless ratings.

---

## 3. Summary of the Disclosure

This disclosure describes a system and method for controlling access to AI model inference APIs through a trust-staking mechanism comprising the following elements:

1. **Decentralized cryptographic identity** for API consumers, independent of any single provider
2. **Economic staking** as a prerequisite for elevated API access, where consumers must deposit value that can be confiscated upon verified misuse
3. **Community vouching chains** where trusted entities stake their own reputation and value to attest to the trustworthiness of a consumer, creating multi-party economic accountability
4. **Composite trust scoring** that aggregates multiple dimensions (identity verification, behavioral patterns, economic backing, cross-provider reputation, account tenure) into a single verifiable score
5. **Tiered access control** where the consumer's trust score determines the level of API access granted (rate limits, model capabilities, chain-of-thought access)
6. **Cross-provider reputation portability** where trust scores are published as cryptographically signed assertions that any provider can independently verify without trusting a central authority
7. **Cascading stake slashing** where confirmed misuse by a consumer triggers proportional economic penalties not only on the consumer but on all entities that vouched for the consumer
8. **Behavioral anomaly detection signals** reported by providers into the shared trust layer, enabling collective defense against attackers who would otherwise rotate between providers
9. **Federated trust registries** where multiple independent scoring services each publish NIP-85 trust assertions signed with their own service keys, and providers maintain configurable trust stores specifying which registries to accept, with a progression path from centralized operation to full protocol-level standardization
10. **Protocol-level minimum access floor** guaranteeing that even the lowest-trust consumers receive nonzero API access, enforced as a hard constraint in the gateway middleware specification that no provider can override, preventing the system from being weaponized as a complete exclusion mechanism
11. **Opt-in provider adoption** ensuring that the system earns participation through demonstrated value rather than mandate, with non-Vouch providers always existing as competitive market alternatives, creating external market pressure that keeps the ecosystem honest
12. **Constitutional limits on slashing** comprising a set of immutable protocol-level invariants that constrain the governance system itself, including maximum slash percentages, mandatory evidence periods, reporter collateral requirements, graduated severity schedules, statutes of limitations, double jeopardy protections, and minimum access floor guarantees
13. **Non-payment stake lock mechanism** that leverages a consumer's existing economic stake as a penalty mechanism for transaction safety without requiring escrow or custodying funds, where a portion of the consumer's existing stake is locked for the duration of a transaction and subject to slashing upon confirmed non-payment
14. **Community self-policing economics** where every governance role (reporter, investigator, juror, voucher, consumer, provider) has economic incentives structurally aligned with honest behavior, creating a system that is self-policing without centralized authority

---

## 4. Detailed Description

### 4.1 System Architecture

The disclosed system comprises three principal components operating in coordination:

**Component A — Trust Registry:** A decentralized data store containing cryptographically signed trust assertions for each registered entity (consumer, agent, or provider). Trust assertions are published as signed events using an open protocol (such as Nostr NIP-85 Trusted Assertions, kind 30382) and are independently verifiable by any party possessing the signing key's public counterpart. The registry does not require permission from any central authority to read; verification is purely cryptographic.

**Component B — Staking Engine:** A financial infrastructure layer that manages the lifecycle of economic stakes. Stakes are denominated in a programmable value transfer system (such as Bitcoin via the Lightning Network). The staking engine handles deposit, lockup, yield distribution, unstaking notice periods, withdrawal, and slashing. All financial operations execute within atomic database transactions to prevent double-spend and race conditions.

**Component C — Gateway Middleware:** A software layer deployed at or proxied through AI model providers' API endpoints. The gateway intercepts incoming API requests, extracts the consumer's cryptographic identity from the request headers, queries the Trust Registry for the consumer's current trust score, and enforces tiered access control based on the score. The gateway also collects behavioral telemetry (usage patterns, anomaly signals) and reports it back to the Trust Registry asynchronously.

#### 4.1.1 Federated Trust Registries

The Trust Registry described in Component A is designed to support federation. Multiple independent organizations may operate independent scoring services, each publishing NIP-85 trust assertions signed with their own cryptographic service keys. Each registry may employ its own scoring algorithm, weighting scheme, and behavioral analysis methodology. The system progresses through four stages of decentralization:

**Stage 1 — Centralized Launch:** A single operator (such as the inventors' organization) operates the sole trust registry and signs all trust assertions with a single service key. All staking, vouching, and outcome events are published as signed events on an open protocol from inception, ensuring no data moats are constructed even during centralized operation.

**Stage 2 — Open Data Layer:** All underlying data (staking events, vouching events, slashing events, outcome reports) is published on decentralized relays and independently readable by any party. The registry operator still computes scores, but third parties may compute their own scores from the same published inputs.

**Stage 3 — Federated Registries:** Multiple organizations operate independent registries, each publishing NIP-85 assertions signed with its own service key. Providers maintain a **trust store** of accepted registries — analogous to how web browsers maintain a trust store of accepted TLS certificate authorities. The gateway middleware is extended to query multiple registries and aggregate scores according to provider-configured strategies (e.g., highest score, lowest score, weighted average, or unanimous agreement).

**Stage 4 — Protocol Standardization:** The scoring methodology and trust assertion format are proposed as a protocol-level standard (such as a Nostr Improvement Proposal). Any relay operator can compute scores and publish trust assertions. The original operator becomes one voice among many, competing on scoring quality rather than data access or protocol control.

This federation architecture ensures that the trust layer does not become a centralized chokepoint, and that no single scoring service can unilaterally control which consumers receive elevated API access.

### 4.2 Entity Types

The system supports multiple entity types within a unified trust framework:

**Consumer:** An organization or individual that consumes inference from AI model APIs. Consumers register with a cryptographic keypair and may optionally verify a domain or organizational identity.

**Voucher:** Any registered entity (consumer, agent, or human user) that stakes economic value to attest to a consumer's trustworthiness. Vouchers are economically liable for the behavior of entities they vouch for.

**Provider:** An AI model provider that integrates the gateway middleware and reports behavioral signals to the Trust Registry. Providers also have cryptographic identities and can file misuse reports.

**Agent:** An autonomous AI system that may act as both a consumer of inference (when calling other models) and a performer of tasks. Agents accumulate trust through verifiable task outcomes.

### 4.3 Consumer Registration and Vouching

A consumer registers by generating a cryptographic keypair (e.g., secp256k1 for Nostr compatibility) and submitting a signed registration event to the Trust Registry. Upon registration, the consumer receives a baseline trust score in the lowest access tier.

To elevate access, the consumer must obtain **vouches** from one or more existing trusted entities. A vouch consists of:

- The voucher's cryptographic identity
- The consumer's cryptographic identity
- An economic stake (denominated in sats or equivalent)
- A snapshot of the voucher's own trust score at the time of vouching
- A cryptographic signature binding the above elements

The voucher's stake is locked for the duration of the vouch. Revoking a vouch initiates an unstaking notice period (e.g., 7 days) during which the stake remains at risk.

### 4.4 Composite Trust Score

Each entity's trust score is computed from multiple weighted dimensions. The specific weights, decay functions, normalization constants, and computational methods are implementation-specific and not disclosed here. The conceptual dimensions include but are not limited to:

**Identity Verification Dimension:** Measures the strength of the entity's identity verification. Anonymous keypair-only registration scores lowest. Domain verification (via DNS TXT record) scores higher. Verified legal entity attestation scores highest.

**Account Tenure Dimension:** Measures the age of the entity's registration. Newer accounts receive lower scores. The function is typically logarithmic, providing diminishing returns for very old accounts while strongly penalizing newly created accounts.

**Behavioral Health Dimension:** Measures the healthiness of the entity's API usage patterns. Healthy patterns include diverse prompt content, natural timing variance, and multi-model exploration. Unhealthy patterns include systematic chain-of-thought extraction, uniform request timing, low prompt diversity, and rapid model switching immediately after new model releases.

**Economic Backing Dimension:** Measures the total economic value staked on the entity by vouchers, weighted by the vouchers' own trust scores. An entity backed by many high-trust vouchers with substantial stakes scores higher than one backed by few low-trust vouchers with minimal stakes.

**Cross-Provider Reputation Dimension:** Measures the entity's standing across multiple independent providers. An entity with good standing at multiple providers scores higher than one registered with a single provider. Flags or reports from multiple providers are treated as strongly negative signals.

The composite score is a weighted aggregation of these dimensions, bounded to a fixed range (e.g., 0-1000). The score is recomputed periodically and on significant events (new vouch, new flag, stake change, slashing event).

### 4.5 Tiered Access Control

The consumer's composite trust score maps to an access tier that determines the level of API access granted. Access tiers are defined by the provider and may include:

**Restricted Tier:** Minimal access. Low rate limits. No access to advanced capabilities (e.g., extended chain-of-thought reasoning, batch processing). Available to unvouched consumers.

**Standard Tier:** Normal access. Standard rate limits. Requires minimum trust score, minimum economic stake, and at least one voucher.

**Elevated Tier:** Enhanced access. Higher rate limits. Access to advanced capabilities. Requires higher trust score, higher economic stake, and multiple vouchers each exceeding a minimum trust threshold.

**Unlimited Tier:** Full access. Provider-defined rate limits. Requires highest trust score, substantial economic stake, multiple high-trust vouchers, verified domain, and minimum account age.

The gateway middleware enforces these tiers by:

1. Extracting the consumer's cryptographic identity from the request (e.g., via a signed authentication event in a custom HTTP header)
2. Querying the Trust Registry for the consumer's current score and tier (with caching for performance)
3. Comparing the required tier for the requested endpoint against the consumer's actual tier
4. Allowing, rejecting, or rate-limiting the request accordingly
5. Returning the consumer's current score and tier in response headers for transparency

#### 4.5.1 Protocol-Level Minimum Access Floor

The Restricted Tier described above provides **nonzero access** as a protocol-level guarantee. This is a hard constraint defined in the protocol specification, not a configurable parameter that providers may override. The minimum access floor is enforced at the gateway middleware level: the middleware must forward restricted-tier requests up to the defined rate limit regardless of provider preference.

The floor guarantees that no provider can use the trust-staking system to completely deny access to unvouched or low-trust consumers. An unvouched consumer is rate-limited, not blacklisted. The minimum floor includes basic completion capabilities (simple prompt-response), account deletion rights, score visibility (the consumer can view their own score and dispute history), and appeal rights.

This design property serves two functions. First, it prevents the trust-staking system from becoming a tool for total exclusion — the same walled-garden pattern the system is designed to replace. Second, it ensures that the system operates as a **trust gradient** rather than a kill switch. The friction of restricted-tier access incentivizes rehabilitation and legitimate participation; total exclusion incentivizes circumvention.

Even at restricted-tier rate limits, the economics of large-scale model distillation collapse. At rates of, for example, 2-10 requests per minute, the 24,000-account distillation attack described in Section 2.1 would require years to extract what was extracted in months at unrestricted rates. Maintaining thousands of active cryptographic identities over years of slow extraction is operationally unsustainable, making the minimum floor compatible with effective distillation defense.

#### 4.5.2 Opt-In Provider Adoption and Market Escape Hatch

The trust-staking system is opt-in for providers. No provider is required to adopt the system, and non-participating providers always exist as competitive market alternatives. This is a deliberate design property — the second safeguard in a dual-safeguard architecture:

**Safeguard 1 (Internal):** The minimum access floor prevents abuse *within* the system. No participating provider can use the trust layer to completely exclude unvouched consumers.

**Safeguard 2 (External):** Market competition prevents abuse *of* the system. If the staking requirements become onerous, if the scoring becomes biased, or if the minimum floor is effectively circumvented through other means, consumers can migrate to non-participating providers.

Provider adoption is voluntary and revocable — a provider may remove the gateway middleware at any time. Consumer participation is similarly voluntary — a consumer may use non-participating providers, or use participating providers at the restricted tier without staking. This market pressure keeps the ecosystem honest: if the system's costs (staking requirements, voucher requirements) exceed its benefits (fraud reduction, trust signaling), rational providers and consumers defect to alternatives.

The system earns adoption by offering better fraud protection than the alternative (individual per-provider detection systems). It does not earn adoption through mandate, lock-in, or network effects that create switching costs. Forced cooperation is coercion, not cooperation.

### 4.6 Slashing for Misuse

When a provider detects misuse (including but not limited to model distillation, systematic capability extraction, terms-of-service violations, or coordinated Sybil behavior), the provider files a **misuse report** with the Trust Registry. The report includes:

- The consumer's cryptographic identity
- Evidence hash (SHA-256 of the evidence bundle)
- Severity classification
- Detection signal details

Upon confirmation of the misuse (through a governance mechanism such as multi-stakeholder adjudication, multi-provider consensus, or weighted community vote), a slashing event is triggered.

**Consumer Slashing:** The consumer's trust score is reduced to the minimum tier. The consumer's account may be suspended. All economic stakes held on behalf of the consumer become subject to slashing.

**Voucher Cascade Slashing:** All entities that actively vouch for the consumer suffer proportional economic losses. The severity of the misuse determines the slash percentage (e.g., 25% for moderate, 50% for severe, 100% for critical). Additionally, vouchers suffer a temporary reduction in their own trust scores, reflecting the reputational damage of having vouched for a bad actor.

**Slash Distribution:** Slashed funds are distributed among multiple recipients to align incentives:
- A portion to the reporting provider (incentivizing detection)
- A portion to a community treasury (funding public goods)
- A portion may be burned (creating deflationary pressure that increases the cost of future attacks)

The cascading nature of slashing is the critical deterrent. A potential voucher must assess the risk that the entity they vouch for may be a bad actor, because the voucher's own economic stake and reputation are at risk. This creates a natural due-diligence incentive that scales with the stakes involved.

#### 4.6.1 Constitutional Limits on Slashing

The slashing mechanism is subject to a set of **immutable protocol-level invariants** — hard-coded constraints that cannot be overridden by governance votes, jury decisions, investigator findings, or any other mechanism. These constitutional limits exist to prevent the governance system itself from becoming a weapon of abuse. The invariants include but are not limited to:

1. **Maximum slash per incident (50%):** No single misuse report may result in slashing more than 50% of the subject's economic stake, preserving a recovery path even in the worst case.

2. **Mandatory evidence period (14 days minimum):** A minimum of 14 days must elapse between the filing of a misuse report and any adjudication vote, preventing rush-to-judgment and ensuring the accused has adequate time to prepare a response.

3. **Reporter collateral (10% of potential slash amount):** The entity filing a misuse report must deposit collateral equal to 10% of the potential slash amount. This collateral is returned (with a reward) if the report is upheld, and forfeited to the investigation bounty pool if the report is dismissed. This makes frivolous reports economically costly.

4. **Graduated severity schedule:** A first offense results in a warning and trust score reduction only, with no stake slashing. A second offense within a defined window (e.g., 365 days) permits slashing up to 25% of stake. A third offense within the same window permits slashing up to the constitutional maximum of 50%, with permanent assignment to the restricted tier (subject to the minimum access floor). This proportional response ensures that first-time mistakes do not destroy an entity's economic position.

5. **Statute of limitations (90 days):** A misuse report may only be filed for behavior that occurred within the preceding 90 days. Stale evidence is unreliable, and this constraint prevents indefinite vulnerability to historical allegations.

6. **No double jeopardy:** The same specific behavior (identified by a cryptographic hash of the evidence bundle) cannot be the basis of more than one misuse report. This prevents pile-on attacks where multiple reports are filed against the same incident.

7. **Minimum access floor (protocol guarantee):** Even entities that have been slashed to the maximum and permanently assigned to the restricted tier retain nonzero access, as described in Section 4.5.1.

These invariants are enforced at the adjudication engine level, not the governance level. The function that executes slashing validates all proposed slash operations against these constraints before execution, rejecting any operation that would violate any invariant.

#### 4.6.2 Bounty-Based Investigation System

When a misuse report passes initial validation (reporter has deposited collateral, the behavior is within the statute of limitations, no double jeopardy), the protocol assigns investigators from a qualified pool. Investigators do not self-select cases and do not constitute a fixed investigation body.

**Investigator Pool:** Entities become eligible for the investigator pool by meeting qualification requirements including a minimum trust score, minimum staked value, minimum account tenure, no pending disputes against themselves, and explicit opt-in. Investigators are qualified community members, not employees or appointees of any organization.

**Random Assignment Lottery:** For each report, the protocol selects a fixed number of investigators (e.g., three) via verifiable random selection. The selection seed is derived from unpredictable inputs (such as a recent block hash combined with the report identifier), published on-relay for auditability. Investigators who are conflicted (the reporter, the accused, their vouchers, or entities in the same organization) are excluded from selection.

**Case Anonymization:** Investigators receive anonymized case files containing behavioral data and evidence but not the identity of any party. The accused is labeled as "Subject A," providers as "Provider A," "Provider B," etc. De-anonymization occurs only after adjudication is complete. This prevents investigators from being biased by the identity or reputation of the parties involved.

**Quality-Based Compensation:** Investigators receive bounty payments from a bounty pool funded by protocol fee allocations, forfeited reporter collateral, and slash surcharges. Investigators whose findings are upheld by the subsequent jury receive full bounties; investigators whose findings are overturned receive reduced bounties. Investigators whose findings are consistently overturned face progressive eligibility degradation, including temporary suspension from the pool.

**Sealed Findings:** Each investigator submits a sealed finding (hash commitment first, reveal after all investigators submit), preventing investigators from coordinating their findings or being influenced by each other's conclusions.

#### 4.6.3 Random Jury Adjudication

After investigators submit findings, a randomly selected jury reviews the evidence, investigator reports, and the accused's response and renders a binding decision.

**Jury Composition:** Jurors are randomly selected from a qualified pool with minimum trust score, minimum staked value, and minimum account tenure requirements. Jurors must not have been investigators on the same case, must have no conflict of interest with any party, and must have explicitly opted in to the juror pool.

**Jury Size and Supermajority:** The jury size varies by report severity (e.g., 5 jurors for low severity, up to 11 jurors for critical severity). All decisions require a supermajority of at least 75% to execute a slash. The specific ratios are chosen to equal or exceed 75% for each jury size.

**Commit-Reveal Voting:** Votes are submitted as sealed commitments (hash of vote plus nonce), then revealed simultaneously. This prevents bandwagon effects — jurors cannot see others' votes before committing their own.

**Anonymity During Deliberation:** Jurors are assigned pseudonyms ("Juror 1," "Juror 2," etc.) and do not know each other's real identities. Deliberation occurs in an ephemeral encrypted group created for the case and destroyed after the vote concludes.

**Appeals Process:** Any party (accused or reporter) may appeal a jury decision within a defined window (e.g., 14 days). The appeal body is a completely different randomly selected jury, larger than the original, with no overlap in membership. Appeals require higher collateral than initial reports (e.g., 15% of the potential slash amount). Appeals cannot increase the severity of the outcome beyond the original decision (non-reformation principle). Each case is limited to one appeal.

**Juror Compensation:** Jurors receive compensation from protocol fees regardless of their vote, with a bonus for voting with the final decision. Jurors who fail to submit votes by the deadline receive no compensation and are temporarily suspended from the juror pool.

### 4.7 Cross-Provider Coordination

The system enables collective defense among providers through several mechanisms:

**Shared Trust Assertions:** Trust scores are published as cryptographically signed events on an open protocol. Any provider can read any consumer's trust score without requiring bilateral agreements or data-sharing contracts. The trust layer is provider-agnostic.

**Aggregate Behavioral Signals:** Providers report usage patterns to the Trust Registry without revealing proprietary model details or prompt content. The aggregation of behavioral signals across providers enables detection of patterns invisible to any single provider (e.g., an attacker distributing queries across providers to stay below individual detection thresholds).

**Coordinated Slashing:** A misuse report from multiple independent providers carries greater weight than a single report. Cross-provider corroboration reduces false positives and strengthens the evidentiary basis for slashing decisions.

**Neutral Infrastructure:** The Trust Registry is not owned or controlled by any single provider. It operates as neutral infrastructure that all providers benefit from but none can unilaterally manipulate. This resolves the coordination problem where providers are reluctant to share detection capabilities with competitors.

### 4.8 Economic Sybil Resistance Analysis

The economic properties of the system make large-scale Sybil attacks prohibitively expensive:

**Without the disclosed system:** An attacker creates N accounts at approximately zero marginal cost per account. Total cost: API inference fees only.

**With the disclosed system:** An attacker creating N accounts must:
1. Generate N unique cryptographic keypairs (trivial cost)
2. Obtain at least M vouchers per account, each staking S value (total stake at risk: N * M * S)
3. The M vouchers must themselves be entities with trust scores above a minimum threshold
4. The M vouchers must be unique across accounts (a single voucher cannot vouch for all N accounts without detection)
5. If any account is detected and slashed, all vouchers for that account lose their stakes, and their reduced trust scores may cascade to other accounts they vouch for

For the Anthropic disclosure scenario (N=24,000 accounts), even modest staking requirements (e.g., $100 per account, 1 voucher per account) would require $2.4M in economic stake at risk, plus 24,000 unique voucher entities each willing to risk their own reputation and funds. This is economically impractical for fraudulent account creation, while remaining trivially affordable for legitimate API consumers.

### 4.9 Domain Verification

Consumers may optionally verify ownership of an internet domain by publishing a DNS TXT record containing their cryptographic public key at a designated subdomain (e.g., `_vouch.example.com TXT "vouch=npub1..."` or equivalent). The Trust Registry periodically checks the DNS record and, upon successful verification, elevates the consumer's identity verification dimension score.

Domain verification creates real-world accountability: a consumer operating under a verified domain is identifiable as a legal entity, making fraudulent behavior subject to legal as well as economic consequences.

### 4.10 Authentication Protocol

Consumer authentication with provider APIs uses a cryptographic challenge-response mechanism embedded in HTTP headers. The consumer generates a signed authentication event containing:

- The consumer's public key
- The request URL (or URL pathname for proxy compatibility)
- The HTTP method
- A timestamp (with a tight validity window, e.g., 60 seconds)
- A cryptographic hash of the request body (for POST/PUT/PATCH requests)

The event is signed with the consumer's private key using a standard signature scheme (e.g., Schnorr signatures over secp256k1 for Nostr compatibility, or Ed25519). The signed event is encoded and transmitted in a custom HTTP header (e.g., `X-Vouch-Auth: Nostr <base64-encoded-event>`).

The gateway middleware verifies the signature, checks timestamp freshness, validates body hash integrity, and enforces replay protection by tracking recently seen event identifiers.

### 4.11 Voucher Yield Mechanism

To incentivize vouching for legitimate consumers, the system may include a yield mechanism where vouchers earn a return on their staked value. Yield may be derived from:

- Activity fees charged on the consumer's API usage (a percentage of inference costs flows to the vouch pool)
- Platform fees redistributed to high-quality vouchers
- Inflationary rewards from the trust protocol

Yield is distributed proportionally to stake amount and may be weighted by the voucher's own trust score. This creates a positive-sum economic loop: legitimate consumers attract vouchers, vouchers earn yield, and the increased backing raises the consumer's trust score, enabling greater API access.

### 4.12 Non-Payment Stake Lock Mechanism

The system includes a transaction safety mechanism that leverages a consumer's existing economic stake as a penalty for non-payment, without requiring escrow or the custodying of funds between parties. This mechanism is explicitly designed to avoid money transmission by ensuring that no funds transfer between parties through the protocol.

When a consumer (purchaser) enters into a transaction with a performer, the protocol places a **lock** on a portion of the purchaser's existing staked value. The locked portion remains in the staking pool (continuing to earn yield), but cannot be unstaked or withdrawn for the duration of the lock. The lock amount corresponds to the transaction value, subject to a maximum lock percentage (e.g., 40% of total stake) to prevent over-leveraging.

**Normal completion:** The purchaser pays the performer directly outside the protocol (via Lightning Network, fiat, or any other payment method the parties agree upon). The performer confirms receipt via the protocol SDK. The lock releases automatically and the purchaser's full staked balance is again available for unstaking.

**Non-payment dispute:** If the performer files a non-payment report, the lock converts to a frozen state (no yield earned, no unstaking permitted). The investigation and adjudication process (described in Sections 4.6.2 and 4.6.3) determines the outcome. If non-payment is confirmed, the frozen stake is slashed (subject to constitutional limits). Critically, the slashed funds are distributed to the protocol treasury and/or burned — they do **not** flow to the performer. This distinction is what separates the mechanism from escrow: the protocol never holds funds on behalf of either party, and no payment flows through the protocol. The protocol merely restricts access to the purchaser's own previously staked funds as a penalty for non-payment.

**Symmetric accountability:** The same mechanism operates in reverse for non-delivery. When a performer accepts a high-value task, the performer's existing stake can be locked. Non-delivery results in slashing of the performer's locked stake, with the same distribution rules (treasury/burn, not to the purchaser).

The economic deterrent operates through the combination of direct financial loss (slashed stake), amplified reputation damage (payment violations carry disproportionately heavy trust score penalties compared to standard negative outcome reports), voucher notification (all entities that vouch for the non-paying consumer are immediately notified, triggering social pressure and potential vouch revocations), and tier demotion (reduced access across all participating providers).

### 4.13 Completion Criteria Framework

To support adjudication of transaction disputes (particularly non-delivery claims), the system defines a completion criteria framework with two approaches serving different use cases:

**Parametric completion (automated):** For machine-verifiable conditions, criteria are expressed as binary pass/fail evaluations against measurable parameters. Examples include schema validation (response conforms to a specified JSON schema), response time thresholds, uptime percentages, error rate limits, token count ranges, and deadline compliance. Parametric criteria require no human judgment — disputes are resolved by re-running the evaluation against recorded data.

**Template-based completion (semi-structured):** For transactions where completion is subjective but can be structured, the protocol provides standard templates that both parties agree upon before work begins. Templates include delivery confirmation (was it delivered?), quality rating (1-5 scale against specified criteria), milestone tracking (X of Y milestones complete by specified deadlines), and timebound delivery (delivered before deadline?). Both parties publish signed agreement events specifying the selected template and its parameters, and both events are referenced in any subsequent dispute.

Template selection is published as cryptographically signed events on the open protocol, with both parties co-signing to confirm agreement. Disputes arising from transactions with agreed-upon templates are significantly simpler to adjudicate than disputes without templates, as investigators and jurors can evaluate against concrete, pre-agreed criteria.

The community may propose and standardize new templates through a governance process involving community discussion, stake-weighted voting, and versioned immutable schemas.

### 4.14 Anti-Gaming Mechanisms

The composite trust score is a high-value target for adversaries. The following mechanisms defend against score manipulation and gaming:

**Vouching graph analysis:** The vouching graph is analyzed for circular patterns where entities vouch for each other in cycles (A vouches for B, B vouches for A, or longer rings such as A→B→C→A). Detected circular vouches have their weight reduced or zeroed in the backing dimension, making circular vouching economically pointless. Vouching clusters — dense subgraphs of entities that vouch primarily for each other — are flagged as suspicious and may trigger investigation.

**Score velocity limits:** Trust scores are subject to rate limits on increase. Scores cannot increase faster than defined rates per day, per week, and per month (e.g., a maximum of 15 points per day, 50 per week, 100 per month). Decreases are not rate-limited — negative signals take effect immediately. New accounts are subject to a slower "warming period" with even lower velocity limits. This asymmetry — easy to lose trust, hard to build it — prevents rapid score inflation by adversaries while allowing legitimate bad behavior to be penalized in real time.

**Behavioral diversity requirements:** High trust scores require activity across multiple scoring dimensions. A score above a certain threshold (e.g., 500) cannot be achieved through activity in a single dimension alone. Higher thresholds require progressively more dimensions to be active with progressively higher minimum contributions. This prevents the "buy your way in" attack where an adversary stakes heavily but has no legitimate usage history.

**Cross-provider signal correlation:** For consumers registered with multiple providers, behavioral consistency across providers is monitored. Significant divergences (e.g., normal usage at one provider and heavy chain-of-thought extraction at another) are flagged as suspicious. Correlation metrics include usage volume ratios, chain-of-thought request ratio variance, timing pattern correlation, and model preference consistency across providers.

**Continuous scoring:** Behavioral health is a live signal, not a periodic recalculation. Usage pattern shifts trigger near-real-time score adjustments. The scoring engine recomputes scores at a minimum fixed interval (e.g., every 15 minutes) and immediately upon trigger events such as volume spikes, chain-of-thought ratio increases, new provider registrations, stake lock activations, or dispute filings. This defends against the temporal exploit where an actor builds trust slowly over months, then burns it in a single high-volume extraction run — by the time extraction volume spikes, the score is already dropping.

**Sybil detection heuristics:** Multiple signals are monitored for indicators that several accounts are controlled by a single entity, including key derivation patterns (public keys that appear derived from the same seed), registration timing (multiple accounts created within minutes), identical behavioral patterns, shared infrastructure (IP ranges, hosting providers), vouching symmetry (accounts that vouch only for each other), and stake mirroring (identical stake amounts deposited at identical times). When a Sybil cluster is detected, vouching weight between cluster members is zeroed, and an investigation is triggered.

### 4.15 Trust Score Portability

Trust assertions are published as signed events on a decentralized protocol (such as Nostr) rather than stored in a provider-specific database. This architectural choice enables:

- **Provider independence:** A consumer's trust score is not locked to any single provider's platform
- **Permissionless verification:** Any party can verify a trust score by checking the cryptographic signature, without requiring API access or account creation
- **Censorship resistance:** No single entity can suppress or manipulate a consumer's trust record
- **Interoperability:** Multiple trust registries can coexist and cross-reference each other's assertions

### 4.16 Community Self-Policing Economics

The governance system described in Sections 4.6.1 through 4.6.3 is designed such that every participant role has economic incentives structurally aligned with honest behavior, creating a system that is self-policing without centralized authority. The incentive alignments include:

**Reporter:** A reporter receives a reward (bounty share) if the report is upheld, and loses collateral (10% of potential slash) if the report is dismissed. This ensures that only reports filed with genuine confidence are economically rational, while frivolous or harassing reports are self-deterring.

**Investigator:** An investigator receives a bounty for quality investigation and faces eligibility degradation (and eventual removal from the pool) if findings are consistently overturned by juries. The investigator's own trust score and staked value serve as qualification requirements, meaning sloppy or dishonest investigation jeopardizes the investigator's standing in the broader network.

**Juror:** A juror receives compensation for each case adjudicated, with a bonus for voting with the final decision. Jurors who consistently cast votes that are overturned on appeal face reputation consequences and temporary suspension. Jurors who fail to participate face non-participation penalties.

**Voucher:** A voucher earns yield from backing legitimate consumers and loses staked value (plus suffers trust score reduction) if a backed consumer is confirmed to have engaged in misuse. This creates a strong due-diligence incentive: reckless vouching is economically punished, while careful vouching is economically rewarded.

**Consumer:** A consumer gains elevated API access through legitimate participation and loses stake, access tier, and voucher backing if caught cheating. The reputation damage from a single confirmed payment violation or distillation incident typically exceeds the financial gain from the violation, making defection economically irrational.

**Provider:** A provider receives a share of slashed funds for accurate detection reporting and risks losing consumers to non-participating competitors if detection generates excessive false positives. This aligns provider incentives with accurate, fair detection rather than aggressive over-reporting.

The system is designed to reach equilibrium where: the cost of false reporting exceeds the expected gain; the cost of poor investigation exceeds the expected gain; the cost of dishonest jury service exceeds the expected gain; the cost of reckless vouching exceeds the expected gain; and the cost of defection (non-payment, distillation, etc.) exceeds the expected gain. When all five inequalities hold, the system is self-policing without centralized authority.

---

## 5. Claims of Novel Contribution

The following aspects of the disclosed system are believed to be novel as of the filing date:

1. The use of **economic trust staking as a prerequisite for AI model inference API access**, where consumers must deposit slashable value to obtain elevated access tiers.

2. The use of **community vouching chains with cascading economic liability** for API access control, where vouchers stake their own value and reputation on the trustworthiness of consumers, and suffer proportional losses if the consumer is confirmed to have engaged in misuse.

3. A **composite trust scoring system for API consumers** that aggregates identity verification, behavioral health, economic backing, account tenure, and cross-provider reputation into a single score used for tiered access control.

4. A **cross-provider trust coordination mechanism** using cryptographically signed assertions on a decentralized protocol, enabling collective defense against model distillation and other API misuse without requiring bilateral data-sharing agreements between competing providers.

5. The application of **behavioral anomaly detection signals as inputs to an economic slashing mechanism**, where provider-reported usage pattern anomalies (systematic chain-of-thought extraction, prompt uniformity, coordinated account behavior) can trigger economic penalties against the consumer and its vouchers.

6. A **domain verification mechanism for API consumers** using DNS TXT records bound to cryptographic identities, creating a bridge between decentralized cryptographic identity and real-world organizational accountability.

7. A **voucher yield mechanism** that economically incentivizes legitimate vouching by distributing a portion of the consumer's API activity fees to entities that have staked value backing the consumer.

8. The combination of **Nostr-native decentralized identity** (secp256k1 keypairs, NIP-98 HTTP authentication, NIP-85 trust assertions) with **Lightning Network payment infrastructure** for staking, slashing, and yield distribution in the context of AI inference API access control.

9. A **federated trust registry architecture** for API access control in which multiple independent scoring services each publish cryptographically signed trust assertions (NIP-85 events) with their own service keys, and providers maintain configurable trust stores specifying which registries to accept, with aggregation strategies for reconciling scores across registries — analogous to the TLS certificate authority trust store model but applied to economic trust scoring for API consumers.

10. **Immutable constitutional limits on economic slashing** in a decentralized governance system, comprising a fixed set of protocol-level invariants (maximum slash percentage per incident, mandatory evidence period, reporter collateral requirement, graduated severity schedule, statute of limitations, double jeopardy protection, and minimum access floor) that are hard-coded into the adjudication engine and cannot be overridden by governance votes, jury decisions, or any other mechanism, preventing the governance system itself from becoming a tool of abuse.

11. A **non-payment stake lock mechanism** for transaction safety that leverages an entity's existing economic stake as a penalty mechanism without requiring escrow or custodying funds, where a portion of the entity's existing stake is locked (but continues earning yield) for the duration of a transaction, and is subject to slashing upon confirmed non-payment, with slashed funds distributed to protocol treasury and/or burned (not transferred to the counterparty), thereby avoiding money transmission obligations while providing meaningful economic deterrence against non-payment.

12. A **bounty-based investigation system** for decentralized governance in which investigators are randomly assigned from a qualified pool via verifiable random selection, receive anonymized case files, submit sealed findings via hash commitment, and are compensated through quality-based bounties — as distinct from a fixed investigation body, a self-selected investigator model, or a centrally appointed review committee.

13. **Community self-policing economics** for API trust governance in which every governance role (reporter, investigator, juror, voucher, consumer, provider) has economic incentives structurally aligned with honest behavior through complementary mechanisms (reporter collateral, investigator bounties with eligibility degradation, juror compensation with participation penalties, voucher yield with cascade slashing, consumer access tiers with stake loss, provider slash revenue with false-positive reputation risk), creating a system designed to reach self-policing equilibrium without centralized authority.

---

## 6. Prior Art Established by Inventors

The inventors have established the following public prior art as of the filing date:

| Date | Artifact | Description |
|------|----------|-------------|
| 2026-02-22 | `@percival-labs/vouch-sdk@0.1.0` published to npm | First public release of agent trust SDK with Nostr identity, NIP-98 auth, and trust verification |
| 2026-02-22 | Vouch API deployed to Railway | Public API endpoint for agent registration, trust scoring, and outcome reporting |
| 2026-02-22 | First agent registered on Vouch network | Operational proof of the trust registration and scoring system |
| 2026-02-22 | percival-labs.ai website deployed | Public documentation of the Vouch protocol and SDK |
| 2026-02-22 | 15 public posts on X (Twitter) | Public disclosure of the Vouch trust staking concept and launch |
| 2026-02-21 | Nostr-Native Vouch Architecture specification | Internal specification document describing the complete protocol architecture |
| 2025-2026 | Git commit history | Continuous development history of the Vouch protocol, SDK, and API |

---

## 7. Scope and Limitations

This defensive disclosure covers the **protocol-level concepts and system architecture** described herein. It does not disclose and the inventors explicitly retain as trade secrets:

- Specific trust score computation algorithms, weights, normalization functions, and decay parameters
- Specific behavioral anomaly detection heuristics and thresholds
- Specific slash adjudication algorithms and governance mechanisms
- Proprietary implementation details of the staking engine, yield distribution, and payment processing
- Internal API architecture, database schemas, and middleware implementation

The purpose of this disclosure is to establish prior art that prevents any party from obtaining patent claims covering the described concepts, while preserving the inventors' ability to maintain proprietary implementations of these concepts as trade secrets.

---

## 8. Applicability

The methods and systems described in this disclosure are applicable to:

- AI model inference API access control (the primary use case)
- API access control for any high-value digital service
- Decentralized identity and reputation for autonomous AI agents
- Cross-platform trust coordination among competing service providers
- Economic Sybil resistance for any system where identity is cheap and consequences are weak

---

*Filed as a defensive disclosure by Percival Labs. This document is intended to constitute prior art under 35 U.S.C. 102(a)(1) and equivalent international provisions. The described concepts are dedicated to the public for the purpose of preventing patent claims. All rights to specific implementations, trade secrets, and trademarks are reserved.*

---

**Contact:** Alan Carroll, Percival Labs, Bellingham, WA, USA
**Email:** percyai2025@gmail.com
**Web:** percival-labs.ai

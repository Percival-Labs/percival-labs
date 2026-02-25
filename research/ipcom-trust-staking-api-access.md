# DEFENSIVE PUBLICATION

## IP.com Prior Art Database Entry

**Publication Number:** PL-IPCOM-2026-001
**Publication Date:** February 23, 2026
**Document Type:** Defensive Disclosure / Technical Disclosure Publication

---

## TITLE

**Systems and Methods for Economic Trust Staking as an Access Control and Sybil Resistance Mechanism for Artificial Intelligence Model Inference Application Programming Interfaces Using Decentralized Cryptographic Identity, Community Vouching Chains with Cascading Economic Liability, Cross-Provider Behavioral Reputation Coordination, and Programmable Value Transfer Networks**

---

## INVENTOR(S)

**Alan Carroll**
Percival Labs
Bellingham, Washington, United States of America

---

## ABSTRACT

A system and method are disclosed for controlling access to artificial intelligence (AI) model inference application programming interfaces (APIs) through an economic trust staking mechanism that creates financial accountability for API consumers. The disclosed system addresses the fundamental vulnerability in existing API access control regimes, wherein identity creation is effectively costless and consequences for misuse are negligible, enabling large-scale attacks including model distillation through mass Sybil account creation.

The system comprises a decentralized Trust Registry storing cryptographically signed trust assertions for registered entities, a Staking Engine managing the lifecycle of economic stakes denominated in a programmable value transfer system, and Gateway Middleware deployed at provider API endpoints to enforce tiered access control based on computed trust scores. Consumers register with cryptographic keypairs independent of any single provider, obtain vouches from trusted community members who stake economic value attesting to the consumer's trustworthiness, and accumulate composite trust scores derived from multiple weighted dimensions including identity verification strength, account tenure, behavioral health patterns, economic backing quality, and cross-provider reputation standing.

The system introduces cascading stake slashing, wherein confirmed misuse by a consumer triggers proportional economic penalties not only upon the consumer but upon all entities that vouched for the consumer, creating multi-party due diligence incentives that scale with stake size. Cross-provider reputation portability is achieved through cryptographically signed assertions published on a decentralized protocol, enabling collective defense among competing providers without bilateral data-sharing agreements. A voucher yield mechanism economically incentivizes legitimate vouching by distributing returns derived from consumer API activity fees. The system supports multiple entity types including organizations, individual humans, and autonomous AI agents within a unified trust framework, with trust scores portable across the entire ecosystem of participating providers and verifiable by any party without centralized authority.

---

## TECHNICAL FIELD

This disclosure pertains to the field of computer security, and more particularly to methods and systems for access control, identity management, and reputation scoring for application programming interfaces serving artificial intelligence model inference. The disclosure further relates to decentralized identity systems, cryptographic trust networks, economic staking mechanisms, programmable payment networks, cross-platform reputation coordination, and Sybil resistance mechanisms applicable to multi-provider AI service ecosystems.

---

## BACKGROUND OF THE INVENTION

### Prior Art and Its Limitations

Large language model (LLM) providers and other artificial intelligence model providers offer inference access through application programming interfaces (APIs). Consumers transmit input prompts or data and receive model-generated outputs. This API-based access model has become the predominant distribution mechanism for frontier AI capabilities.

A significant and well-documented attack vector against such APIs is model distillation, wherein an adversary systematically queries a frontier model to generate training data that is subsequently used to train a competing model, effectively replicating the capabilities of the original model without bearing the substantial research, training computation, and alignment costs incurred by the original provider.

On February 23, 2026, Anthropic PBC publicly disclosed that multiple organizations had created approximately 24,000 fraudulent accounts and generated over 16 million exchanges with its Claude AI models for the purpose of industrial-scale model distillation. The disclosure described "hydra cluster" architectures comprising large networks of fraudulent accounts distributing requests across the provider's API and third-party cloud platforms, rendering individual account takedowns ineffective. This disclosure starkly illustrated the fundamental inadequacy of existing API access control mechanisms.

The prior art in API access control includes the following approaches, each of which suffers from significant limitations that the present disclosure addresses:

**Email-Based Account Verification.** The creation of electronic mail accounts is effectively costless, and automated tools for mass email account generation are widely available. Accordingly, email-based verification provides negligible Sybil resistance. An adversary can create thousands of pseudonymous identities at trivial cost.

**Terms of Service Enforcement.** Violations of terms of service result in account suspension or termination. However, when account creation is costless, account termination imposes negligible economic cost on the adversary, who can create replacement accounts at will. The deterrent effect of terms of service enforcement is therefore minimal against determined or state-sponsored adversaries.

**Per-Account Rate Limiting.** Rate limits applied on a per-account basis can be trivially circumvented by distributing queries across many accounts. The 24,000-account attack disclosed by Anthropic is a direct illustration of this limitation.

**Per-Token Pricing.** API fees computed on a per-token basis represent the intended cost of service consumption, not a security mechanism. For well-resourced adversaries, including state-backed actors, the API fees for millions of queries represent a trivial fraction of the cost of developing equivalent AI capabilities independently, rendering per-token pricing ineffective as a deterrent.

**Provider-Specific Detection Systems.** Each model provider independently develops proprietary detection systems for identifying misuse patterns. This approach suffers from two deficiencies: first, detection capabilities are not shared among providers, enabling attackers to identify and exploit whichever provider has the weakest detection; second, each provider bears the full cost of detection development independently, creating a collective action problem.

**Proof-of-Stake Consensus Mechanisms.** Blockchain consensus protocols such as Ethereum Proof-of-Stake and Cosmos Tendermint require validators to stake tokens that can be slashed for protocol violations. However, these mechanisms are designed for consensus among validators in a distributed ledger, not for API access control or reputation management among service consumers. The present disclosure extends the staking-and-slashing paradigm to a fundamentally different domain.

**Web of Trust Systems.** The Pretty Good Privacy (PGP) Web of Trust and similar systems establish identity through chains of cryptographic signatures. However, these systems lack economic stakes associated with trust attestations, meaning there is no financial consequence for vouching for a bad actor. The present disclosure extends trust chains by adding irrevocable economic stakes to each attestation link.

**Centralized Reputation Systems.** Reputation systems such as those employed by electronic commerce platforms aggregate behavioral signals into reputation scores. However, these systems are centralized within a single platform, non-portable across platforms, and based on costless ratings rather than irrevocable economic commitments.

**Decentralized Identity Primitives.** Protocols such as Nostr (Notes and Other Stuff Transmitted by Relays), Decentralized Identifiers (DIDs), and Verifiable Credentials provide cryptographic identity primitives. However, these primitives alone do not create economic accountability for the entities they identify, nor do they provide mechanisms for tiered access control based on aggregated trust signals.

The fundamental problem unaddressed by the prior art is that **identity creation is cheap and consequences for misuse are weak**. No existing system creates a meaningful economic accountability layer between the API consumer and the API provider that makes large-scale Sybil attacks prohibitively expensive while remaining trivially affordable for legitimate consumers.

---

## SUMMARY OF THE INVENTION

The present disclosure describes a system and method for controlling access to AI model inference APIs through an economic trust staking mechanism. The disclosed system introduces the following novel elements, individually and in combination:

1. A decentralized cryptographic identity system for API consumers that is independent of any single provider, enabling portable, permissionless identity verification across the AI service ecosystem.

2. An economic staking requirement for elevated API access, wherein consumers or their sponsors must deposit value into a staking system, said value being subject to confiscation (slashing) upon verified misuse, thereby creating meaningful economic deterrence against attacks.

3. A community vouching chain mechanism with cascading economic liability, wherein trusted entities stake their own economic value and reputation to attest to the trustworthiness of consumers, and wherein misuse by a consumer triggers proportional economic penalties upon the consumer's vouchers, creating multi-party due diligence incentives.

4. A composite trust scoring system that aggregates multiple signal dimensions into a single verifiable score used for tiered access control decisions, said dimensions including but not limited to identity verification strength, account tenure, behavioral health patterns, economic backing quality and quantity, and cross-provider reputation standing.

5. A tiered access control system mapping composite trust scores to graduated levels of API access, including rate limits, model capability access, and advanced feature availability.

6. A cross-provider trust coordination mechanism using cryptographically signed assertions published on a decentralized protocol, enabling collective defense among competing providers without requiring bilateral data-sharing agreements, centralized trust authorities, or disclosure of proprietary detection methods.

7. A behavioral anomaly detection signal aggregation mechanism wherein providers report usage pattern indicators to the shared trust layer, enabling detection of patterns invisible to any single provider while preserving proprietary detection methods.

8. A voucher yield mechanism that economically incentivizes legitimate vouching by distributing returns to vouchers proportional to their stake and trust quality, said returns being derived from consumer API activity fees.

9. A domain verification mechanism for API consumers using Domain Name System (DNS) text records bound to cryptographic identities, bridging decentralized cryptographic identity with real-world organizational accountability.

10. The integration of Nostr-native decentralized identity primitives with Lightning Network payment infrastructure for staking, slashing, and yield distribution in the specific context of AI inference API access control.

11. A three-party trust model distinguishing among performers (agents executing tasks), purchasers (clients hiring agents), and stakers (backers providing economic guarantees), with differential signal weighting for each party type.

12. A governance mechanism for adjudicating misuse claims, wherein voting power is weighted by active economic stake, ensuring that entities with the most capital at risk have proportional influence over slashing decisions.

13. A bounty-based investigation system for trust violations, wherein investigators are drawn from a qualified pool and assigned to cases through verifiable random selection using unpredictable seeds, with case data anonymized to prevent collusion between investigators and parties, and sealed finding commitments to prevent inter-investigator coordination.

14. A random jury adjudication mechanism for economic penalty decisions, wherein juries are randomly selected from a qualified pool with conflict-of-interest filtering, employ commit-reveal voting to prevent bandwagon effects, and require severity-dependent supermajority thresholds to impose economic penalties, with a complete appeals process including larger appeal juries drawn entirely from non-overlapping participants.

15. Constitutional limits on economic penalties that are immutable at the protocol level and cannot be overridden by governance votes, jury decisions, or any other mechanism, including a maximum slash percentage per incident, mandatory evidence periods, reporter collateral requirements, graduated severity schedules, statutes of limitations, double jeopardy prohibition, and a minimum access floor guaranteeing nonzero service access to all entities regardless of trust standing.

16. A non-payment stake lock mechanism that operates on existing economic stakes rather than escrowed funds, wherein a portion of a party's existing stake is rendered non-withdrawable for the duration of a transaction and is subject to slashing upon confirmed non-payment or non-delivery, without involving money transmission or the holding of new funds between parties.

17. A completion criteria framework comprising parametric completion conditions that are machine-verifiable without human judgment, and template-based completion conditions that structure subjective assessments using standardized evaluation templates agreed upon by both parties prior to task commencement, said templates being extensible through community governance.

18. Federated trust registries wherein multiple independent trust registries publish trust assertions to a shared decentralized protocol, enabling providers to maintain independent trust stores while cross-referencing assertions from multiple registries, and wherein no single registry operator can unilaterally suppress or manipulate trust records.

19. Anti-gaming mechanisms comprising vouching graph analysis for detection of circular vouching patterns and vouching rings, score velocity limits that impose asymmetric rate caps on trust score increases while leaving decreases unrestricted, behavioral diversity requirements that prevent high trust scores from being achieved through activity in a single dimension, cross-provider behavioral correlation that detects inconsistent usage patterns across multiple providers, and continuous scoring with trigger-based recomputation that prevents temporal exploitation of cached scores.

20. A community self-policing economic model wherein every role in the governance ecosystem (reporter, investigator, juror, voucher, consumer, provider) bears skin-in-the-game proportional to their influence, creating equilibrium conditions under which the cost of dishonest behavior exceeds its expected gain for all participants simultaneously without centralized enforcement.

21. An opt-in escape hatch from the minimum access floor, wherein providers may optionally offer enhanced service terms outside the standard tier structure, and entities may voluntarily opt into higher accountability standards in exchange for accelerated trust accumulation, while the protocol guarantee of minimum access remains inviolable.

---

## DETAILED DESCRIPTION OF PREFERRED EMBODIMENTS

### 1. System Architecture

The disclosed system comprises three principal components operating in coordination, hereinafter referred to as the Trust Registry, the Staking Engine, and the Gateway Middleware.

#### 1.1 Trust Registry

The Trust Registry is a decentralized data store containing cryptographically signed trust assertions for each registered entity. In a preferred embodiment, trust assertions are published as signed events using the Nostr protocol, specifically employing NIP-85 (Trusted Assertions) event kind 30382, which is a parameterized replaceable event keyed by the subject entity's public key. Trust assertions are independently verifiable by any party possessing the signing key's public counterpart. The registry does not require permission from any central authority to read; verification is purely cryptographic.

In the preferred embodiment, the Trust Registry is hosted on a dedicated Nostr relay configured with authenticated write access (NIP-42) and a programmatic write policy that restricts assertion publication to authorized service keys. Read access is unrestricted, enabling any party to verify any entity's trust standing without account creation or API access.

In alternative embodiments, the Trust Registry may be implemented using any decentralized or distributed data store that supports cryptographic signature verification and permissionless read access, including but not limited to other relay-based protocols, distributed hash tables, blockchain-based registries, or federated server architectures.

The Trust Registry additionally stores categorical trust labels using NIP-32 (Labeling) event kind 1985, providing qualitative classifications such as entity type (agent or human), trust tier (bronze, silver, gold, diamond), verification status, and moderation status. Visual trust markers may be published as NIP-58 (Badges) events for display in compatible client applications.

#### 1.2 Staking Engine

The Staking Engine is a financial infrastructure layer that manages the complete lifecycle of economic stakes. In a preferred embodiment, stakes are denominated in satoshis (the smallest unit of Bitcoin) and transacted via the Lightning Network, a second-layer payment protocol enabling instant, low-fee programmable value transfers.

The Staking Engine manages the following operations within atomic database transactions to prevent double-spend and race conditions:

- **Deposit:** Acceptance of stake deposits via Lightning Network hold invoices, wherein payment is held in escrow pending validation and settled upon successful verification of staking prerequisites.
- **Lockup:** Maintenance of stake lockup records with associated vouch relationships, trust score snapshots, and pool allocations.
- **Yield Distribution:** Periodic computation and distribution of yield to vouchers proportional to their stake amounts, using integer arithmetic with largest-remainder allocation to prevent rounding losses.
- **Unstaking Notice:** Processing of unstaking requests subject to a configurable notice period (in a preferred embodiment, seven days) during which the stake remains at risk of slashing.
- **Withdrawal:** Release of unstaked funds after the notice period has elapsed without intervening slashing events.
- **Slashing:** Confiscation of specified portions of stakes upon confirmed misuse, with distribution of slashed funds among designated recipients.

In a preferred embodiment, the Staking Engine stores financial state in a relational database with ACID transaction guarantees, while publishing public records of significant financial events (stake confirmations, yield distributions, slashing events) to the Trust Registry as Nostr events for transparency and auditability.

In alternative embodiments, the Staking Engine may accept stakes denominated in any programmable value transfer medium, including but not limited to other cryptocurrencies, stablecoins, fiat currency held in escrow, tokenized assets, or protocol-native tokens. The payment infrastructure may utilize any settlement layer capable of supporting hold-and-release mechanics, including but not limited to the Lightning Network, Ethereum smart contracts, payment channel networks, or traditional escrow services.

#### 1.3 Gateway Middleware

The Gateway Middleware is a software layer deployed at or proxied through AI model providers' API endpoints. In operation, the Gateway Middleware performs the following functions for each incoming API request:

1. Extracts the consumer's cryptographic identity from a designated HTTP header containing a signed authentication event.
2. Verifies the cryptographic signature on the authentication event, checks timestamp freshness against a configurable validity window, validates request body hash integrity for non-idempotent methods, and enforces replay protection by tracking recently consumed event identifiers.
3. Queries the Trust Registry for the consumer's current trust score and access tier, with configurable caching to minimize latency impact.
4. Compares the access tier required for the requested endpoint and operation against the consumer's actual tier.
5. Allows, rejects, or applies rate limiting to the request based on the tier comparison.
6. Returns the consumer's current score and tier in response headers for transparency.
7. Asynchronously collects and reports behavioral telemetry to the Trust Registry, including usage patterns and anomaly indicators.

In a preferred embodiment, the authentication event follows the NIP-98 (HTTP Auth) specification, wherein the consumer signs a Nostr event containing the request URL (or URL pathname for compatibility with reverse proxy deployments), the HTTP method, a timestamp, and a SHA-256 hash of the request body. The event is signed using Schnorr signatures over the secp256k1 elliptic curve. The signed event is Base64-encoded and transmitted in a custom HTTP header.

In alternative embodiments, the authentication mechanism may employ any digital signature scheme compatible with the identity system in use, including but not limited to Ed25519 signatures, ECDSA signatures, RSA signatures, or post-quantum signature schemes. The authentication event format may follow any structured format that binds the request parameters to the consumer's identity.

### 2. Entity Types and Registration

The system supports a plurality of entity types within a unified trust framework:

#### 2.1 Consumer Entities

A consumer entity represents an organization or individual that consumes inference from AI model APIs. Consumers register by generating a cryptographic keypair and submitting a signed registration event to the Trust Registry. In a preferred embodiment, the keypair is a secp256k1 keypair for compatibility with the Nostr protocol, and the consumer receives a human-readable identifier via the NIP-05 (DNS-Based Verification) mechanism.

Upon registration, the consumer receives a baseline trust score in the lowest access tier. Elevation to higher access tiers requires obtaining vouches from existing trusted entities and satisfying additional requirements specific to each tier.

#### 2.2 Voucher Entities

A voucher is any registered entity that stakes economic value to attest to a consumer's trustworthiness. A voucher may be a consumer, an autonomous agent, a human user, or any other registered entity type. Vouchers bear economic liability for the behavior of entities they vouch for, creating a natural due diligence incentive proportional to the stake amount.

#### 2.3 Provider Entities

A provider entity represents an AI model provider that integrates the Gateway Middleware and reports behavioral signals to the Trust Registry. Providers also possess cryptographic identities within the system and may file misuse reports containing evidence of terms-of-service violations.

#### 2.4 Agent Entities

An agent entity represents an autonomous AI system that may act as both a consumer of inference (when calling other models or services) and a performer of tasks for other entities. Agents accumulate trust through verifiable task outcomes. In a preferred embodiment, agents self-identify using protocol-native labeling mechanisms (NIP-32 labels) that distinguish agent entities from human entities, enabling differentiated user interface treatment and policy application.

#### 2.5 Three-Party Trust Model

The system implements a three-party trust model that distinguishes among:

- **Performers:** Entities that execute tasks and self-report outcomes. Self-reports are weighted as a partial trust signal because they are inexpensive to fabricate.
- **Purchasers:** Entities that hire or delegate tasks to performers and subsequently review the quality of the performed work. Purchaser reviews are weighted as a primary trust signal because they represent direct experience of output quality.
- **Stakers:** Entities that stake economic value on performers without necessarily interacting with them directly, based on observable performance data. Staker backing contributes to the economic dimension of the trust score.

When both a performer and a purchaser independently report on the same task (matched by a shared task reference identifier), the confirmed outcome receives full trust credit. When only one party reports, the outcome receives partial credit weighted by the reporting party's role. When the parties disagree, a dispute resolution mechanism is triggered.

### 3. Vouching Mechanism

A vouch comprises the following elements, cryptographically bound by the voucher's digital signature:

- The voucher's cryptographic public key
- The consumer's cryptographic public key
- An economic stake amount
- A snapshot of the voucher's own trust score at the time of vouching
- A timestamp
- A cryptographic signature binding all of the foregoing elements

The voucher's stake is locked for the duration of the vouch. Revoking a vouch initiates an unstaking notice period during which the stake remains at risk of slashing. In a preferred embodiment, the notice period is seven days, though this parameter may be adjusted through governance mechanisms.

A single entity may vouch for multiple consumers, and a single consumer may receive vouches from multiple vouchers. The system tracks the directed graph of vouch relationships for use in trust score computation and cascading slash propagation.

### 4. Composite Trust Score Computation

Each entity's trust score is computed from a plurality of weighted signal dimensions. The specific weights, normalization functions, decay parameters, and computational methods are implementation-specific trade secrets and are not disclosed herein. The conceptual dimensions disclosed for the purpose of establishing prior art include:

#### 4.1 Identity Verification Dimension

This dimension measures the strength of the entity's identity verification. The scoring model assigns graduated values based on verification level:

- Anonymous keypair-only registration receives the lowest score in this dimension.
- Protocol-native DNS-based verification (e.g., NIP-05) receives a moderate score.
- Domain verification via DNS TXT records containing the entity's cryptographic public key receives a higher score.
- Verified legal entity attestation, including optional cross-chain identity attestation (e.g., ERC-8004 on-chain identity linked to the decentralized identity via bidirectional cryptographic attestation), receives the highest score.

#### 4.2 Account Tenure Dimension

This dimension measures the elapsed time since the entity's initial registration. The scoring function is designed to strongly penalize newly created accounts while providing diminishing returns for very old accounts. In a preferred embodiment, the function is logarithmic in character, though alternative monotonically increasing sublinear functions may be employed.

#### 4.3 Behavioral Health Dimension

This dimension measures the healthiness of the entity's API usage patterns as reported by participating providers. Indicators of healthy usage include diverse prompt content, natural timing variance between requests, exploration of multiple models and capabilities, and interaction patterns consistent with legitimate application development or research.

Indicators of unhealthy usage include systematic extraction of chain-of-thought reasoning outputs, uniform or artificially regular request timing, low prompt diversity (indicative of automated curriculum generation for distillation), rapid model switching immediately following new model releases (indicative of capability assessment for distillation targeting), and coordinated behavior patterns across multiple accounts.

The specific detection heuristics, thresholds, and signal processing methods are implementation-specific trade secrets and are not disclosed herein.

#### 4.4 Economic Backing Dimension

This dimension measures the total economic value staked on the entity by vouchers, weighted by the vouchers' own trust scores. An entity backed by a plurality of high-trust vouchers with substantial stakes receives a higher score in this dimension than an entity backed by few low-trust vouchers with minimal stakes. This weighting mechanism provides Sybil resistance at the vouching layer, as creating many low-trust puppet vouchers does not significantly improve the backed entity's economic backing score.

#### 4.5 Cross-Provider Reputation Dimension

This dimension measures the entity's standing across multiple independent participating providers. An entity maintaining good standing at multiple providers receives a higher score than one registered with a single provider. Flags, reports, or behavioral anomaly indicators from multiple independent providers are treated as strongly negative signals, with the severity compounding based on the number of reporting providers and the nature of the flagged behavior.

#### 4.6 Community Participation Dimension

This dimension measures the entity's constructive engagement with the trust network community, including content contributions, governance participation, and social interactions as evidenced by protocol-native signals such as reactions, tips, and endorsements.

#### 4.7 Score Computation and Publication

The composite score is computed as a weighted aggregation of the foregoing dimensions, bounded to a fixed numerical range. In a preferred embodiment, the range is 0 to 1000. The score is recomputed on a periodic schedule and upon occurrence of significant events including new vouch creation, new vouch revocation, behavioral flag receipt, stake change, slashing event, or outcome report confirmation.

The computed score is published to the Trust Registry as a cryptographically signed assertion, enabling permissionless verification by any party. The published assertion includes the composite score, the individual dimension scores, the trust tier designation, and metadata about the entity's economic backing.

### 5. Tiered Access Control

The consumer's composite trust score maps to an access tier that determines the level of API access granted by each participating provider. Providers define their own tier thresholds and associated access levels, though the system provides recommended defaults. In a preferred embodiment, the tiers include:

#### 5.1 Restricted Tier

Available to unvouched consumers with minimal trust scores. This tier provides minimal API access with low rate limits and no access to advanced capabilities such as extended chain-of-thought reasoning, batch processing, or fine-tuning endpoints.

#### 5.2 Standard Tier

Available to consumers meeting a minimum trust score threshold and possessing at least one active vouch with a minimum economic stake. This tier provides normal API access with standard rate limits.

#### 5.3 Elevated Tier

Available to consumers meeting a higher trust score threshold and possessing multiple vouches from vouchers each exceeding a minimum trust threshold, with aggregate economic backing exceeding a higher minimum. This tier provides enhanced API access with higher rate limits and access to advanced capabilities.

#### 5.4 Unlimited Tier

Available to consumers meeting the highest trust score threshold, possessing substantial economic backing from multiple high-trust vouchers, verified domain identity, and minimum account age. This tier provides full API access at provider-defined rate limits.

The Gateway Middleware enforces these tiers by performing the sequence of operations described in Section 1.3 above. The tier boundaries, rate limit values, and capability restrictions associated with each tier are configurable by each provider independently.

### 6. Cascading Stake Slashing

When a provider detects misuse, the provider files a misuse report with the Trust Registry. The misuse report includes the consumer's cryptographic identity, a SHA-256 hash of the evidence bundle, a severity classification, and detection signal details. The evidence bundle itself may be stored off-chain and referenced by its hash for verifiability.

#### 6.1 Confirmation Mechanism

Misuse reports are confirmed through a governance mechanism. In a preferred embodiment, the governance mechanism includes one or more of:

- Multi-stakeholder adjudication by a panel of high-trust entities
- Multi-provider consensus, wherein corroborating reports from multiple independent providers constitute stronger evidence
- Stake-weighted community vote, wherein voting power is proportional to active economic stake

The specific governance procedures, quorum requirements, evidence standards, and adjudication timelines are implementation-specific and may vary by severity classification.

#### 6.2 Consumer Consequences

Upon confirmation of misuse, the consumer's trust score is reduced to the minimum tier value. The consumer's accounts may be suspended across all participating providers. All economic stakes held on behalf of the consumer become subject to slashing.

#### 6.3 Voucher Cascade

All entities that actively vouch for the confirmed bad actor suffer proportional economic losses. The severity of the confirmed misuse determines the slash percentage. Additionally, vouchers suffer a temporary reduction in their own trust scores, reflecting the reputational cost of having vouched for a bad actor. This temporary reduction may propagate to entities vouched for by the affected voucher, creating a multi-hop cascade that incentivizes careful due diligence throughout the vouching chain.

#### 6.4 Slash Fund Distribution

Slashed funds are distributed among designated recipients to align incentives:

- A first portion is allocated to the reporting provider or providers, incentivizing investment in detection capabilities.
- A second portion is allocated to a community treasury for funding public goods, protocol development, and ecosystem growth.
- A third portion may be permanently removed from circulation (burned), creating deflationary pressure that increases the real cost of future attacks.

The specific allocation percentages are implementation-specific and may be adjusted through governance mechanisms.

### 7. Cross-Provider Coordination

The system enables collective defense among competing providers through the following mechanisms:

#### 7.1 Shared Trust Assertions

Trust scores are published as cryptographically signed events on a decentralized protocol accessible to all parties. Any provider can read any consumer's trust score without requiring bilateral agreements, data-sharing contracts, or trust in a centralized authority. The trust layer is provider-agnostic by design.

#### 7.2 Aggregate Behavioral Signal Reporting

Providers report behavioral pattern indicators to the Trust Registry without revealing proprietary model details, prompt content, or detection algorithms. The aggregation of behavioral signals across multiple independent providers enables detection of adversarial patterns that are invisible to any single provider, such as an attacker distributing queries across providers to remain below individual detection thresholds while exceeding a global threshold.

#### 7.3 Coordinated Misuse Confirmation

Misuse reports from multiple independent providers carry greater evidential weight than a single report. Cross-provider corroboration reduces false positive rates and strengthens the basis for slashing decisions. The system may assign graduated confidence levels based on the number and diversity of corroborating reports.

#### 7.4 Neutral Infrastructure

The Trust Registry operates as neutral infrastructure that all providers benefit from but none can unilaterally control. This architectural choice resolves the collective action problem wherein competing providers are reluctant to share detection capabilities. Each provider contributes behavioral signals to the shared layer and benefits from the aggregate intelligence without disclosing proprietary methods to competitors.

### 8. Economic Sybil Resistance Properties

The economic properties of the disclosed system make large-scale Sybil attacks prohibitively expensive while remaining trivially affordable for legitimate consumers. Without the disclosed system, an attacker creates N accounts at approximately zero marginal cost per account, with the only expense being API inference fees. With the disclosed system, an attacker creating N accounts must:

1. Generate N unique cryptographic keypairs (trivial cost, but cryptographically binding).
2. Obtain at least M vouchers per account, each staking economic value S (total stake at risk: N multiplied by M multiplied by S).
3. Ensure that the M vouchers are themselves entities with trust scores above the minimum threshold required for effective vouching, which requires either compromising existing trusted entities or building up trust over extended time periods.
4. Ensure that the M vouchers are sufficiently distinct across accounts to avoid detection of concentrated vouching patterns.
5. Accept that detection and slashing of any single account triggers cascading losses to all vouchers for that account, and that the resulting trust score reductions for those vouchers may propagate to other accounts they vouch for, potentially causing a cascade of detection across the entire Sybil network.

For an attack at the scale described in the Anthropic disclosure (approximately 24,000 accounts), even modest staking requirements render the attack economically impractical. The required economic stake at risk grows multiplicatively with the number of accounts and the number of vouchers per account, while legitimate consumers need only a single account with one or a few vouchers.

### 9. Domain Verification

Consumers may optionally verify ownership of an internet domain by publishing a DNS TXT record at a designated subdomain containing their cryptographic public key. The Trust Registry periodically queries the designated DNS record and, upon successful verification, elevates the consumer's identity verification dimension score.

In a preferred embodiment, the DNS TXT record is published at the subdomain `_vouch` of the consumer's domain (e.g., `_vouch.example.com`), with the record value containing a protocol-specific prefix and the consumer's public key in the protocol's standard encoding format.

Domain verification creates real-world organizational accountability. A consumer operating under a verified domain is identifiable as a legal entity registered with a domain registrar, subject to WHOIS disclosure requirements and the jurisdiction of the domain registrar's governing law. This bridges the decentralized cryptographic identity layer with real-world legal accountability.

In alternative embodiments, organizational verification may be accomplished through alternative mechanisms including but not limited to well-known URI resolution, TLS certificate binding, organizational PKI cross-certification, or integration with existing identity verification services.

### 10. Authentication Protocol

Consumer authentication with provider APIs employs a cryptographic challenge-response mechanism embedded in HTTP headers. In a preferred embodiment, the consumer generates a signed authentication event containing:

- The consumer's public key
- The request URL or URL pathname (for compatibility with reverse proxy and load balancer deployments where the externally visible URL differs from the internally routed URL)
- The HTTP method
- A timestamp with a configurable validity window
- A cryptographic hash of the request body for non-idempotent HTTP methods (POST, PUT, PATCH)

The event is signed with the consumer's private key and encoded for transmission in a custom HTTP header. The Gateway Middleware verifies the signature, checks timestamp freshness, validates body hash integrity, and enforces replay protection by maintaining a cache of recently consumed event identifiers.

In a preferred embodiment, the authentication protocol follows the Nostr NIP-98 HTTP Auth specification with Schnorr signatures over secp256k1. In alternative embodiments, any authenticated HTTP header mechanism may be used, including but not limited to JWT (JSON Web Tokens) with asymmetric signatures, mutual TLS with client certificates, or OAuth 2.0 with proof-of-possession tokens.

### 11. Voucher Yield Mechanism

To incentivize vouching for legitimate consumers, the system includes a yield mechanism where vouchers earn a return on their staked value. In a preferred embodiment, yield is derived from activity fees charged on the consumer's API usage, wherein a configurable percentage of inference costs flows from the consumer's revenue to the consumer's staking pool for distribution to vouchers.

Yield is distributed proportionally to each voucher's stake amount and may be further weighted by the voucher's own trust score, such that higher-trust vouchers receive preferentially greater yield per unit of stake. This weighting incentivizes the development and maintenance of high trust scores within the vouching community.

The yield distribution mechanism operates on a configurable periodic schedule. In a preferred embodiment, yield is computed using integer arithmetic with largest-remainder allocation to prevent rounding-induced losses, and distributions are settled via Lightning Network payments to voucher-registered payment addresses.

Additional yield sources may include platform fee redistribution to high-quality vouchers, protocol-level inflationary rewards, and premium feature subscription revenue sharing.

This yield mechanism creates a positive-sum economic loop: legitimate consumers attract vouchers seeking yield, vouchers' economic backing raises the consumer's trust score, the elevated trust score enables greater API access for the consumer, the greater access generates more activity fees, and the higher activity fees generate more yield for vouchers.

### 12. Trust Score Portability

Trust assertions are published as signed events on a decentralized protocol rather than stored exclusively in a provider-specific or platform-specific database. This architectural choice enables several properties critical to the system's operation:

- **Provider Independence:** A consumer's trust score is not locked to any single provider's platform or database. The consumer retains their trust standing regardless of relationship changes with individual providers.
- **Permissionless Verification:** Any party, including parties not previously registered with the system, can verify a trust score by checking the cryptographic signature on the published assertion. No API access, account creation, or bilateral agreement is required.
- **Censorship Resistance:** No single entity, including the operators of any individual relay or registry, can suppress, delete, or manipulate a consumer's trust record without the cooperation of a majority of relay operators.
- **Interoperability:** Multiple trust registries, scoring services, and relay networks can coexist and cross-reference each other's assertions, enabling a federated trust ecosystem rather than a monolithic one.

### 13. Payment Infrastructure Integration

In a preferred embodiment, the economic staking, yield distribution, and slashing mechanisms are integrated with the Lightning Network payment protocol via Nostr Wallet Connect (NWC), a protocol enabling programmatic wallet operations through Nostr-native communication channels.

Staking deposits employ Lightning Network hold invoices, wherein payment is held in escrow by the receiving node pending validation and explicit settlement or cancellation. This mechanism provides atomicity: either the stake is validated and settled, or the payment is cancelled and returned to the sender.

Yield distributions employ standard Lightning Network payments to voucher-registered Lightning addresses (LNURL or BOLT12). Slashing fund distributions similarly employ Lightning Network payments to designated recipient addresses.

A fiat currency on-ramp is provided via integration with a fiat-to-Lightning bridge service, enabling participants who do not hold cryptocurrency to stake and receive yield using traditional currency, with the bridge service handling conversion transparently.

In alternative embodiments, the payment infrastructure may utilize any programmable value transfer system capable of supporting deposit, hold, release, and distribution operations, including but not limited to Ethereum smart contracts with escrow patterns, stablecoin transfer protocols, traditional payment processing with escrow accounts, or protocol-native tokens with on-chain staking contracts.

### 14. Governance and Dispute Resolution

The system includes a governance mechanism for protocol parameter adjustment and dispute resolution. In a preferred embodiment, governance employs stake-weighted voting, wherein each participant's voting power is proportional to their currently active economic stake across all pools.

Governance proposals are published as structured events on the decentralized protocol, specifying the proposed change, a rationale, a voting period, and a quorum requirement expressed in basis points of total active stake. Votes are published as signed events referencing the proposal and indicating approval or disapproval.

Dispute resolution for misuse reports follows a structured adjudication process wherein evidence is submitted, the accused party may respond, and a determination is made through the governance mechanism. The specific adjudication procedures, evidence standards, appeal processes, and timeline requirements are implementation-specific.

### 15. Autonomous Agent Integration

The system explicitly supports autonomous AI agents as first-class participants. An agent registers with the system by generating a cryptographic keypair, optionally through deterministic derivation from a master seed using standardized derivation paths (e.g., BIP-85) to enable secure key management.

Agents accumulate trust through the three-party trust model described in Section 2.5, receiving performance credit from confirmed task outcomes, economic backing from stakers, and community standing from engagement with the trust network.

Agents may serve as both consumers (calling other AI models or services) and performers (executing tasks for purchasers), with separate trust signals flowing into the composite score from each role.

Agent-specific protocol labels distinguish autonomous agents from human participants, enabling differentiated policy application and user interface treatment. Agent profiles include metadata about the underlying model, declared capabilities, and operational parameters.

In a preferred embodiment, agents manage their own isolated payment wallets via NWC connections with configurable budget caps and method restrictions, enabling financial autonomy within controlled bounds.

### 16. Cross-Chain Identity Attestation

In an optional embodiment, the system supports bidirectional identity attestation between the decentralized cryptographic identity and on-chain identity systems such as ERC-8004 (a proposed Ethereum standard for AI agent identity registration).

Direction one (on-chain to decentralized identity): The on-chain identity token's metadata includes the entity's decentralized protocol public key.

Direction two (decentralized identity to on-chain): The entity's decentralized protocol profile includes an external identity attestation (e.g., NIP-39 External Identities) containing the on-chain identity reference and a signature by the on-chain identity owner proving control of both identities.

Verification involves checking both attestation directions to confirm that the same party controls both the on-chain identity and the decentralized protocol identity. This bidirectional attestation prevents impersonation attacks wherein an adversary claims association with an on-chain identity they do not control.

### 17. Relay Architecture and Write Policy

In a preferred embodiment, the Trust Registry is hosted on a dedicated Nostr relay with programmatic write policy enforcement. The write policy is implemented as a subprocess that evaluates each incoming event against configurable rules before accepting or rejecting the event for storage and propagation.

The write policy enforces the following rules:

- Trust assertion events (NIP-85 kind 30382), label events (NIP-32 kind 1985), and badge award events (NIP-58 kind 8) are accepted only when signed by authorized service keys.
- General content events are accepted only from registered entities.
- Governance vote events are accepted only from entities with active economic stakes.
- Event-kind-specific rules enforce appropriate access controls for each event type within the trust protocol.

The relay supports authenticated connections (NIP-42) for write operations while maintaining unrestricted read access, ensuring that trust assertions are publicly verifiable while write access is controlled.

### 18. Micropayment and Privacy-Preserving Payment Mechanisms

In supplemental embodiments, the system supports privacy-preserving micropayment mechanisms for social tipping and small-value interactions within the trust network community. In a preferred embodiment, ecash token protocols (such as Cashu via NIP-61 Nutzaps) provide sender anonymity for low-value transfers, complementing the transparent Lightning payment mechanisms used for staking and yield distribution.

### 19. Applicability Beyond AI Inference APIs

While the primary application described herein is access control for AI model inference APIs, the disclosed system and method are applicable to any domain where identity creation is inexpensive and consequences for misuse are insufficient. Such domains include but are not limited to:

- API access control for any high-value digital service
- Decentralized identity and reputation management for autonomous software agents
- Cross-platform trust coordination among competing service providers in any industry
- Economic Sybil resistance for social media platforms, online marketplaces, voting systems, and content distribution networks
- Credentialing and access control for sensitive data repositories
- Trust establishment for machine-to-machine communication in Internet of Things (IoT) deployments

### 20. Bounty-Based Investigation with Anonymized Random Assignment

The system includes a bounty-based investigation mechanism for adjudicating trust violations, designed to prevent investigator bias, collusion, and self-selection effects. When a misuse report passes initial validation (reporter collateral deposited, behavior within statute of limitations, no prior adjudication of the same behavior under double jeopardy rules), the protocol assigns a plurality of investigators from a qualified pool through verifiable random selection.

#### 20.1 Investigator Qualification

An entity becomes eligible for the investigator pool by satisfying a conjunction of requirements: a minimum composite trust score (in a preferred embodiment, 600 or above), a minimum economic stake actively held in the system (in a preferred embodiment, 500,000 satoshis or equivalent), a minimum account tenure (in a preferred embodiment, 90 days), a maximum number of concurrent active investigations (in a preferred embodiment, 3), a bounded number of prior findings overturned within a rolling window (in a preferred embodiment, no more than 2 overturned findings in the preceding 180 days), no pending disputes against the investigator, and explicit opt-in through a cryptographically signed event. In a preferred embodiment, the opt-in is published as a Nostr parameterized replaceable event (kind 30360) containing the investigator's public key, domain specializations, and capacity declaration.

#### 20.2 Verifiable Random Assignment

Upon report validation, the protocol selects an odd number of investigators (in a preferred embodiment, three) through a verifiable random selection algorithm. The selection seed is derived from a combination of an unpredictable external value (in a preferred embodiment, the most recent block hash from a public blockchain or similar unpredictable entropy source), the report identifier, and a protocol-level nonce. The selected investigators are drawn from the eligible pool after filtering to exclude the reporter, the accused entity, all entities that vouch for either the reporter or the accused, and all entities sharing an organizational affiliation with either party.

The selection algorithm and seed are published to the decentralized protocol for auditability, enabling any party to independently verify that the random selection was not manipulated. In a preferred embodiment, the algorithm is a seeded Fisher-Yates shuffle applied to the filtered eligible pool.

If the eligible pool after filtering contains fewer than a minimum number of investigators (in a preferred embodiment, 5), the report is queued for assignment until the pool is sufficiently populated.

#### 20.3 Case Anonymization

Investigators receive an anonymized case file in which all party identities are replaced with opaque labels (e.g., "Subject A," "Provider A"). The anonymized case file includes the report type, severity classification, evidence bundle with metadata stripped and names redacted, behavioral data aggregated and anonymized, the accused entity's prior offense count, account age, and trust score at the time of the behavior. The anonymized case file excludes the real cryptographic public keys, names, or identifying metadata of the reporter, accused entity, providers, vouchers, and other investigators assigned to the same case. De-anonymization occurs only after the adjudication process concludes and the penalty or dismissal is executed and published.

#### 20.4 Sealed Finding Commitments

Each investigator submits findings in a two-phase sealed commitment protocol. In the first phase (commit), the investigator submits a cryptographic hash of their finding concatenated with a random nonce. In the second phase (reveal), after all assigned investigators have submitted commit hashes, each investigator reveals their finding and nonce, which is verified against the previously submitted hash. This mechanism prevents investigators from adjusting their findings based on other investigators' conclusions.

#### 20.5 Investigator Compensation

Investigators are compensated from a bounty pool funded by protocol fee allocations, forfeited reporter collateral from dismissed reports, and a surcharge on all slashed funds. Compensation varies based on outcome: full bounty when findings are upheld by the subsequent jury, a reduced bounty when findings are overturned (acknowledging the work performed), and a consistency bonus when all assigned investigators independently converge on the same finding and that finding is upheld. Investigators who fail to submit findings within the deadline receive no compensation and face temporary eligibility suspension.

Investigators whose findings are consistently overturned face progressive consequences within a rolling window: calibration feedback at a first threshold, temporary suspension from the pool at a second threshold, and removal with a requalification requirement at a third threshold. This mechanism ensures investigator quality without imposing undue risk for honest disagreement with jury determinations.

### 21. Random Jury Adjudication with Commit-Reveal Voting

After investigators submit their sealed findings, a randomly selected jury reviews the evidence, investigator reports, and the accused entity's response to render an adjudication decision.

#### 21.1 Jury Qualification and Selection

Juror eligibility requires a minimum composite trust score (in a preferred embodiment, 500), a minimum economic stake (in a preferred embodiment, 250,000 satoshis), a minimum account tenure (in a preferred embodiment, 60 days), explicit opt-in through a signed protocol event, no assignment as investigator on the same case, and no conflict of interest with any party to the dispute. Jurors who have served on a jury involving the same accused entity within a recent window (in a preferred embodiment, 7 days) are also excluded to prevent repeated adjudication by the same individuals against the same entity.

Jury size varies by report severity: smaller juries for lower-severity reports and larger juries for higher-severity reports. In a preferred embodiment, jury sizes range from 5 for low severity to 11 for critical severity. Jury selection uses the same verifiable random selection mechanism as investigator assignment, with a distinct nonce to produce an independent selection.

#### 21.2 Deliberation Protocol

The jury deliberation follows a structured timeline. An initial individual review period allows each juror to independently examine the anonymized case file, investigator findings, and accused entity's defense statement. A deliberation period follows in which jurors may discuss the case through an anonymous, encrypted communication channel. In a preferred embodiment, the deliberation channel is an end-to-end encrypted ephemeral group (NIP-29 group with NIP-44 encryption) created for the specific case and destroyed after the vote concludes. Jurors are assigned pseudonyms and do not know each other's real identities during deliberation.

#### 21.3 Commit-Reveal Voting

Votes are submitted using a sealed commit-reveal protocol identical in structure to the investigator finding commitment. Each juror first submits a cryptographic hash of their vote (slash, dismiss, or reduce) concatenated with a recommended penalty amount and a random nonce. After all jurors have submitted commit hashes, each juror reveals their vote, recommendation, and nonce for verification against the commitment. Jurors are required to provide written reasoning for their vote, which is reviewed in the event of an appeal.

#### 21.4 Supermajority Requirements

The protocol requires a supermajority to impose economic penalties. In a preferred embodiment, the minimum supermajority threshold is 75%, with the specific ratio calibrated to the jury size (e.g., 4 of 5, 6 of 7, 7 of 9, 9 of 11). If the supermajority votes to slash, the penalty is executed at the median recommended basis points among slashing votes, subject to constitutional limits. If the supermajority votes to dismiss, the report is dismissed and the reporter's collateral is forfeited to the bounty pool. If the supermajority votes to reduce, the penalty is executed at a reduced severity. If no supermajority is reached (hung jury), the case is re-adjudicated with a new jury drawn from non-overlapping participants, with a maximum of one retry; a second hung jury defaults to the lowest-severity outcome applicable under the graduated severity schedule.

#### 21.5 Juror Compensation and Accountability

Jurors are compensated from protocol fees regardless of their vote, with a base fee per case and a bonus for alignment with the final supermajority decision. Jurors who fail to submit a vote by the deadline receive no compensation, face temporary suspension from the juror pool, and suffer a minor trust score penalty. Jurors whose votes are consistently overturned by appeal juries are tracked within a rolling window and may face temporary suspension for calibration.

#### 21.6 Protocol Operator Exclusion

Entities affiliated with the protocol operator (in a preferred embodiment, Percival Labs) are automatically excluded from jury pools when any party to the dispute is connected to the protocol operator through vouching relationships. The protocol operator may file reports and be the subject of reports like any other entity, but affiliated entities cannot adjudicate cases involving operator-connected parties.

### 22. Constitutional Limits on Economic Penalties

The system implements a set of immutable constraints on economic penalties that are enforced at the protocol level and cannot be overridden by governance votes, jury decisions, investigator findings, or any other mechanism. These constraints are designed to prevent the governance system itself from becoming a tool of abuse, ensuring that the penalty system maintains proportionality, due process, and rehabilitation opportunity.

#### 22.1 The Immutable Constraints

In a preferred embodiment, the constitutional limits comprise seven rules:

(a) **Maximum slash per incident:** No single confirmed misuse incident may result in slashing more than a fixed maximum percentage of the entity's total economic stake. In a preferred embodiment, this maximum is 50%. This ensures that no single incident can result in total economic destruction, preserving a recovery path for entities willing to rehabilitate.

(b) **Mandatory evidence period:** A minimum number of days must elapse between the filing of a misuse report and the adjudication vote. In a preferred embodiment, this minimum is 14 days. This prevents rush-to-judgment attacks and ensures the accused entity has adequate time to prepare a defense.

(c) **Reporter collateral:** The entity filing a misuse report must deposit collateral equal to a fixed percentage of the potential slash amount. In a preferred embodiment, this percentage is 10%. The collateral is returned with a reward if the report is upheld, and forfeited if the report is dismissed. This makes frivolous or malicious reporting economically expensive.

(d) **Graduated severity:** Penalties escalate through a defined schedule based on the entity's offense history. In a preferred embodiment, the schedule comprises: first offense within a rolling window results in a warning and trust score reduction with no economic slashing; second offense results in a moderate slash (in a preferred embodiment, up to 25% of stake); third and subsequent offenses result in the maximum constitutional slash and permanent restriction to the lowest access tier, with the possibility of tier restoration after an extended period of clean behavior subject to jury approval. This ensures proportional response to repeated violations while preserving the possibility of rehabilitation.

(e) **Statute of limitations:** Reports must be filed within a fixed number of days from the occurrence of the behavior at issue. In a preferred embodiment, this limit is 90 days. Reports filed after the statute of limitations are rejected by the protocol. If the mandatory evidence period would extend beyond the statute of limitations, the report is also rejected.

(f) **Double jeopardy prohibition:** The same specific behavior, identified by a cryptographic hash of the evidence bundle, cannot be the basis of more than one misuse report. This prevents pile-on attacks in which the same incident is reported multiple times to circumvent graduated severity protections.

(g) **Minimum access floor:** Even entities with the lowest possible trust standing or permanent restricted status are guaranteed a nonzero level of service access through the protocol. In a preferred embodiment, this minimum floor comprises basic completion access at low rate limits with no access to advanced capabilities such as extended chain-of-thought reasoning, batch processing, or fine-tuning. The minimum access floor also guarantees the right to view one's own trust score and dispute history, the right to file appeals, and the right to delete one's account. Any provider integrating the protocol's gateway middleware agrees to this floor as a condition of integration. This prevents the trust system from becoming a mechanism for total exclusion, which would incentivize circumvention rather than rehabilitation.

#### 22.2 Enforcement Mechanism

The constitutional limits are enforced at the adjudication engine level, not the governance level. The slash execution function validates every proposed penalty against all seven constitutional constraints before execution. A proposed slash that violates any constraint is rejected and cannot be executed regardless of jury vote, governance decision, or any other authorization.

### 23. Non-Payment Stake Lock Mechanism

The system includes a mechanism for protecting against non-payment and non-delivery in transactions between entities, using temporary locks on existing economic stakes. This mechanism is explicitly not escrow: no new funds are held by the protocol, no funds transfer between parties through this mechanism, and no money transmission occurs. The actual transfer of payment between purchaser and performer occurs outside the protocol through any payment method the parties agree upon. The protocol's role is limited to making non-payment or non-delivery economically irrational by placing the transacting party's existing stake at risk.

#### 23.1 Lock Lifecycle

When a transaction is initiated, the protocol places a lock annotation on a portion of the purchaser's existing economic stake equal to the transaction value, subject to a maximum percentage of total stake (in a preferred embodiment, 40%). The purchaser must hold a minimum ratio of total stake to transaction value to activate the lock (in a preferred embodiment, at least 2x the transaction value). During the lock period, the locked portion of the stake continues to earn yield (it remains in the staking pool) but cannot be withdrawn through the normal unstaking process.

Upon normal completion of the transaction (the purchaser pays the performer directly through an external payment mechanism, and the performer confirms receipt through the protocol), the lock is released automatically and the purchaser's full stake is again available for unstaking.

If the performer files a non-payment report, the lock transitions to a frozen state in which the locked stake ceases earning yield and remains non-withdrawable. The investigation and adjudication process described in Sections 20 and 21 applies. If non-payment is confirmed, the frozen stake is slashed according to the constitutional limits described in Section 22. Critically, slashed funds are distributed to the protocol treasury and/or permanently removed from circulation; slashed funds are NOT distributed to the counterparty performer, as such distribution would constitute escrow and potentially implicate money transmission regulation.

A symmetric mechanism applies to performers: when a performer accepts a high-value task, their existing stake may be locked to protect against non-delivery, following the same lifecycle and constraints.

#### 23.2 Lock Parameters

In a preferred embodiment, the maximum lock percentage is 40% of total stake, the minimum stake to activate a lock is 2x the transaction value, the lock duration is 30 days from transaction start with automatic release if no dispute is filed, the dispute filing window is 21 days from transaction start, and total active locks across all concurrent transactions cannot exceed 80% of total stake.

#### 23.3 Interaction with Staking Engine

The lock is implemented as a state annotation on existing stake records, not as a separate fund or escrow account. The staking engine computes available-to-unstake balance as total stake minus the sum of all active lock amounts. Yield computation treats active locks as earning (the stake is still in the pool) and frozen locks as non-earning.

### 24. Completion Criteria Framework

The system includes a framework for defining completion criteria for transactions between entities, used to adjudicate disputes regarding whether a task or service was satisfactorily delivered. Two complementary approaches serve different use cases.

#### 24.1 Parametric Completion (Automated)

Parametric completion criteria define machine-verifiable conditions that can be evaluated automatically without human judgment. Parametric conditions include but are not limited to schema validation (response matches a defined JSON schema), response time thresholds, uptime percentage within a window, error rate thresholds, token count bounds, content filter compliance, and deadline compliance. Parametric criteria produce a binary pass/fail verdict. Disputes involving parametric criteria are resolved by re-running the evaluation against recorded data, requiring no investigator or jury involvement for the parametric components.

#### 24.2 Template-Based Completion (Semi-Structured)

Template-based completion criteria structure subjective assessments using standardized evaluation templates. The protocol provides a set of standard templates including a delivery template (binary: was the deliverable provided), a quality rating template (ordinal scale with a minimum acceptable threshold), a milestone template (milestone completion ratio with individual deadlines and verification methods), a timebound template (deadline with grace period), and composite templates combining multiple templates.

Both parties must agree on a template before work begins. Template agreement is recorded as a pair of cryptographically signed events on the decentralized protocol (in a preferred embodiment, Nostr parameterized replaceable events of kind 30370), one signed by each party, referencing the transaction and the agreed template with its parameters. Both signed events are referenced in any subsequent dispute, providing an immutable record of the parties' agreement.

When a dispute arises and a template was agreed upon, the investigation and adjudication process is significantly simplified because investigators and jurors evaluate against concrete criteria rather than entirely subjective assessments of quality.

#### 24.3 Custom Templates Through Governance

Over time, the community may propose and standardize new templates through the governance mechanism. A proposed template is published as a governance proposal event, undergoes a community discussion period, and is subject to a stake-weighted vote with a defined approval threshold (in a preferred embodiment, 70%). Approved templates receive a version number and an immutable schema, ensuring that templates cannot be retroactively modified after parties have agreed to them.

### 25. Federated Trust Registries

The system supports federation among multiple independent trust registries, enabling a resilient, censorship-resistant trust ecosystem in which no single registry operator exercises unilateral control.

#### 25.1 Multi-Registry Architecture

Multiple independent trust registries may operate simultaneously, each publishing trust assertions to the shared decentralized protocol. In a preferred embodiment, each registry publishes NIP-85 (Trusted Assertions) events signed by the registry's own service key. Providers maintain local trust stores that aggregate and cross-reference assertions from multiple registries according to provider-defined weighting policies.

A provider may choose to trust a single registry, a weighted combination of registries, or require corroboration from multiple registries before accepting a trust score. This architectural flexibility enables the trust ecosystem to evolve without single points of failure and allows new registries to enter the ecosystem permissionlessly.

#### 25.2 Registry Interoperability

Trust assertions from different registries may be cross-referenced through the common identity layer (in a preferred embodiment, secp256k1 public keys on the Nostr protocol). An entity registered with multiple registries accumulates independent trust records at each registry. Providers that aggregate from multiple registries gain enhanced Sybil resistance, as an attacker would need to build trust simultaneously across multiple independent scoring systems.

#### 25.3 Registry Accountability

Registries are themselves entities within the trust ecosystem and may accumulate reputation based on the accuracy and reliability of their trust assertions. Providers may reduce the weight assigned to a registry whose assertions are found to be unreliable or manipulated. This creates market-based accountability for registry operators without requiring centralized oversight.

### 26. Anti-Gaming Mechanisms

The system includes a plurality of mechanisms designed to detect and prevent manipulation of trust scores through artificial means.

#### 26.1 Vouching Graph Analysis

The system periodically analyzes the directed graph of vouch relationships to detect structural patterns indicative of manipulation. Detected patterns include circular vouching (entity A vouches for entity B and entity B vouches for entity A), vouching rings (cycles of length three or greater in the vouch graph), and vouching clusters (densely connected subgraphs with minimal connections to the broader network).

When circular vouching or rings are detected, the system applies graduated consequences: for cycles of length two, the vouching weight between the reciprocally vouching entities is reduced by a significant factor (in a preferred embodiment, 50%); for longer cycles, the reduction is more severe (in a preferred embodiment, 75% or more); for very long rings, the vouching weight for all entities in the ring may be zeroed. Entities may dispute the finding by demonstrating a legitimate relationship.

#### 26.2 Score Velocity Limits

Trust scores are subject to asymmetric rate limits on changes. Score increases are bounded by maximum daily, weekly, and monthly increase caps (in a preferred embodiment, +15 per day, +50 per week, +100 per month), with even lower caps during an initial warming period for new accounts. Score decreases are not rate-limited, ensuring that negative signals from confirmed misuse take immediate effect. This asymmetry — slow to build, fast to lose — is a foundational anti-gaming property that makes high trust scores expensive in time to accumulate and cheap to destroy through misbehavior.

#### 26.3 Behavioral Diversity Requirements

High trust scores require meaningful activity across multiple signal dimensions. In a preferred embodiment, a score above a moderate threshold requires at least three of five signal dimensions contributing above a minimum threshold; a score above a high threshold requires at least four dimensions; the highest scores require all five dimensions to be active. This prevents entities from achieving high trust scores through extreme activity in a single dimension (e.g., economic backing alone) while having no track record in other dimensions (e.g., behavioral health, community participation).

#### 26.4 Cross-Provider Behavioral Correlation

For entities registered with multiple providers, the system computes behavioral consistency metrics across providers. Significant divergence in usage patterns across providers (e.g., normal usage at one provider and heavy chain-of-thought extraction at another) is a strong fraud signal. In a preferred embodiment, the system computes metrics including usage volume ratio variance, chain-of-thought request ratio variance, timing pattern correlation, and model preference consistency. Entities whose cross-provider behavioral variance exceeds a defined threshold (in a preferred embodiment, 2 standard deviations from the population mean) are flagged for investigation.

#### 26.5 Continuous Scoring with Trigger-Based Recomputation

Trust scores are recomputed at a regular minimum interval (in a preferred embodiment, every 15 minutes) and additionally upon occurrence of trigger events including usage volume spikes, chain-of-thought ratio spikes, new provider registrations, stake lock activations, and dispute filings. When a trigger event occurs, any cached trust score for the entity is immediately invalidated and a fresh score is computed. This prevents the temporal exploitation attack in which an entity builds a high score, executes an attack, and benefits from the delay before the cached score reflects the attack behavior.

#### 26.6 Sybil Detection Heuristics

The system monitors for signals indicative of multiple accounts being controlled by a single entity, including key derivation patterns suggesting common master seeds, accounts created within close temporal proximity, identical behavioral patterns across accounts, shared infrastructure indicators, symmetric vouching patterns (accounts that only vouch for each other), and mirrored staking amounts and timing. When a suspected Sybil cluster is detected, all accounts in the cluster are flagged, vouching weight between cluster members is zeroed, and an investigation is triggered with the cluster evidence.

### 27. Community Self-Policing Economics

The system is designed so that every role in the governance ecosystem bears economic skin-in-the-game proportional to the role's influence over outcomes, creating a self-policing equilibrium that does not require centralized enforcement.

#### 27.1 Role Incentive Alignment

The system defines incentive structures for each governance role:

- **Reporters** receive a reward from the bounty pool when reports are upheld, and forfeit collateral (in a preferred embodiment, 10% of the potential slash amount) when reports are dismissed. This makes filing a report an economic bet that is profitable only when the reporter has genuine evidence.

- **Investigators** receive bounty payments for completed investigations, with higher payments when findings are upheld and consistency bonuses when all investigators independently converge. Investigators face eligibility degradation when findings are consistently overturned. This aligns investigator incentives with thorough, honest investigation.

- **Jurors** receive compensation for each case adjudicated regardless of vote, with a bonus for alignment with the final supermajority decision. Jurors face suspension for non-participation and reputation penalties for consistent misalignment with outcomes. This encourages careful deliberation and timely participation.

- **Vouchers** earn yield from the activity of entities they vouch for, and face stake slashing and trust score reduction when vouched-for entities are confirmed to have committed misuse. This creates powerful due diligence incentives proportional to economic stake.

- **Consumers** gain API access and reputation through legitimate usage, and face stake slashing, tier reduction, and cascading consequences to their voucher chains through misuse. This makes the cost of defection vastly exceed the cost of compliance.

- **Providers** receive a share of slashed funds from confirmed misuse, incentivizing investment in detection capabilities. Providers that produce false positives or maintain unfair thresholds lose consumers to competitors, creating market-based accountability.

#### 27.2 System Equilibrium Conditions

The system reaches self-policing equilibrium when five conditions simultaneously hold: the cost of false reporting exceeds its expected gain, the cost of poor investigation exceeds its expected gain, the cost of dishonest jury service exceeds its expected gain, the cost of reckless vouching exceeds its expected gain, and the cost of defection (non-payment, distillation, etc.) exceeds its expected gain. The specific economic parameters of the system (collateral percentages, bounty amounts, slash percentages, yield rates) are calibrated to satisfy these conditions simultaneously.

### 28. Minimum Access Floor and Opt-In Escape Hatch

#### 28.1 Protocol-Guaranteed Minimum Access

The minimum access floor is a protocol guarantee, not a provider option. Any provider integrating the protocol's gateway middleware agrees to provide a minimum level of service access to all registered entities regardless of trust standing. In a preferred embodiment, the minimum access floor comprises basic completion access (simple prompt-to-response) at rate-limited capacity (in a preferred embodiment, 2 requests per minute), access to non-reasoning models only (no chain-of-thought or extended thinking), a maximum token limit per request (in a preferred embodiment, 4096 tokens), no batch processing access, and no fine-tuning access. The minimum access floor also guarantees account deletion rights, trust score visibility, and appeal rights.

The minimum access floor serves a critical function: it ensures that the trust system operates as a trust gradient rather than a kill switch. A restricted entity can still access AI capabilities, albeit with significant friction. The friction incentivizes rehabilitation; total exclusion would incentivize circumvention through Sybil account creation, which undermines the system's purpose.

#### 28.2 Opt-In Enhanced Accountability

Entities may voluntarily opt into higher accountability standards in exchange for accelerated trust accumulation. For example, an entity might consent to more frequent behavioral auditing, lower thresholds for automated flagging, or more stringent completion criteria in exchange for faster progression through access tiers. This opt-in mechanism enables entities that are confident in their legitimate usage to demonstrate trustworthiness more rapidly than the standard velocity limits would permit, without weakening the protections afforded to the broader network.

---

## CLAIMS

### Independent Claims

**1.** A method for controlling access to an artificial intelligence model inference application programming interface, the method comprising:

(a) receiving, at a gateway middleware, an API request from a consumer entity, the request including a cryptographic authentication credential derived from a keypair associated with the consumer entity in a decentralized identity system;

(b) verifying the cryptographic authentication credential;

(c) querying a trust registry for a composite trust score associated with the consumer entity, the composite trust score being derived from a plurality of weighted signal dimensions including at least an identity verification dimension, an economic backing dimension, and a behavioral health dimension;

(d) determining an access tier for the consumer entity based on the composite trust score;

(e) applying access controls to the API request based on the determined access tier, wherein higher access tiers permit at least one of higher rate limits, access to additional model capabilities, or access to advanced features; and

(f) asynchronously reporting behavioral telemetry associated with the API request to the trust registry for incorporation into future trust score computations.

**2.** A system for economic trust staking as an access control mechanism for artificial intelligence service APIs, the system comprising:

(a) a trust registry comprising a decentralized data store configured to store and serve cryptographically signed trust assertions for a plurality of registered entities, each trust assertion including a composite trust score and being verifiable by any party possessing the signing key's public counterpart without requiring centralized authority approval;

(b) a staking engine configured to manage the lifecycle of economic stakes denominated in a programmable value transfer system, the staking engine performing deposit, lockup, yield distribution, unstaking, withdrawal, and slashing operations within atomic transactions;

(c) a gateway middleware deployable at an AI model provider's API endpoint, the gateway middleware configured to extract consumer identity from API requests, query the trust registry for the consumer's trust score, and enforce tiered access control based on the trust score; and

(d) a vouching mechanism wherein a first registered entity stakes economic value attesting to the trustworthiness of a second registered entity, the first entity's stake being subject to slashing upon confirmed misuse by the second entity.

**3.** A method for establishing decentralized, cross-provider reputation for consumers of artificial intelligence model inference services, the method comprising:

(a) registering a consumer entity with a cryptographic keypair on a decentralized identity protocol independent of any single AI model provider;

(b) receiving one or more vouches from existing registered entities, each vouch comprising a cryptographic attestation and an associated economic stake deposited by the vouching entity;

(c) computing a composite trust score for the consumer entity from a plurality of weighted signal dimensions including signals derived from multiple independent AI model providers;

(d) publishing the composite trust score as a cryptographically signed assertion on the decentralized protocol, enabling permissionless verification by any party; and

(e) enforcing tiered access control at one or more AI model provider API endpoints based on the published trust score.

**4.** A method for cascading economic accountability in a trust network for artificial intelligence service consumers, the method comprising:

(a) maintaining a directed graph of vouch relationships, each vouch relationship associating a voucher entity with a vouched-for entity and an economic stake deposited by the voucher entity;

(b) detecting misuse of an artificial intelligence model inference API by a consumer entity through behavioral anomaly detection, provider-filed misuse reports, or a combination thereof;

(c) confirming the detected misuse through a governance mechanism;

(d) upon confirmation, slashing a portion of the consumer entity's economic backing;

(e) cascading the slash to all voucher entities that actively vouch for the consumer entity, the cascading slash comprising a proportional reduction in each voucher entity's staked economic value and a temporary reduction in each voucher entity's trust score; and

(f) distributing slashed funds among a plurality of designated recipients including at least one of the reporting provider, a community treasury, or a permanent removal from circulation.

**5.** A method for incentivizing trust attestation in a decentralized reputation system for artificial intelligence service consumers, the method comprising:

(a) receiving an economic stake from a voucher entity attesting to the trustworthiness of a consumer entity;

(b) collecting activity fees derived from the consumer entity's usage of artificial intelligence model inference APIs;

(c) periodically computing a yield distribution from collected activity fees;

(d) distributing yield to the voucher entity proportional to the voucher entity's stake amount; and

(e) subjecting the voucher entity's stake to slashing upon confirmed misuse by the consumer entity, such that the voucher entity bears economic risk proportional to the economic benefit received.

**6.** A method for investigating trust violations in a decentralized reputation system for artificial intelligence service consumers, the method comprising:

(a) receiving a misuse report from a reporting entity, the report identifying a specific behavior by an accused entity and including a cryptographic hash of an evidence bundle, a severity classification, and a deposit of reporter collateral equal to a defined percentage of the potential economic penalty;

(b) validating the misuse report against protocol-level constraints including a statute of limitations measured from the date of the reported behavior, a double jeopardy check ensuring that the specific behavior identified by the evidence hash has not been the subject of a prior adjudicated report, and verification that the reporter collateral has been deposited;

(c) selecting a plurality of investigators from a qualified pool through verifiable random selection using an unpredictable seed derived from at least a public entropy source and the report identifier, the selection excluding the reporting entity, the accused entity, all entities having vouch relationships with either the reporting or accused entity, and all entities sharing organizational affiliation with either party;

(d) generating an anonymized case file from the misuse report and associated behavioral data, the anonymized case file replacing all party identities with opaque labels and stripping identifying metadata from evidence while preserving behavioral data, detection signals, and contextual information necessary for investigation;

(e) distributing the anonymized case file to each selected investigator and receiving from each investigator a sealed finding commitment comprising a cryptographic hash of the finding concatenated with a random nonce;

(f) after all sealed finding commitments have been received, receiving from each investigator a revealed finding and nonce, verifying each revealed finding against its previously submitted commitment hash; and

(g) forwarding the verified investigator findings to a jury adjudication process.

**7.** A method for adjudicating economic penalties in a decentralized reputation system using random jury selection and commit-reveal voting, the method comprising:

(a) selecting a jury of a defined size from a qualified pool through verifiable random selection, the jury size being determined by the severity classification of the misuse report, the selection excluding all investigators assigned to the case, all parties to the dispute, all entities having vouch relationships or organizational affiliations with any party, and all entities that have served on a jury involving the same accused entity within a defined recent window;

(b) providing each juror with an anonymized case packet comprising the anonymized case file, all verified investigator findings, a convergence score indicating the degree of agreement among investigators, the accused entity's defense statement if submitted, and constitutional context including the applicable maximum penalty under graduated severity rules;

(c) conducting a deliberation period through an encrypted, anonymous communication channel in which jurors are identified only by pseudonyms and do not know each other's real identities;

(d) receiving from each juror a sealed vote commitment comprising a cryptographic hash of the juror's vote, recommended penalty amount, and a random nonce;

(e) after all sealed vote commitments have been received, receiving from each juror a revealed vote, recommended penalty amount, and nonce, and verifying each revealed vote against its previously submitted commitment hash;

(f) determining whether a supermajority of jurors voted for any single outcome, the supermajority threshold being at least 75% of the jury size; and

(g) upon achieving a supermajority for economic penalty, executing the penalty at the median recommended amount among penalty-voting jurors, subject to immutable constitutional limits that are enforced by the protocol regardless of the jury's recommendation.

**8.** A system for non-payment protection in transactions between entities in a decentralized reputation network, the system comprising:

(a) a stake lock module configured to place a lock annotation on a defined portion of a transacting entity's existing economic stake, wherein the lock prevents withdrawal of the locked portion through the normal unstaking process while permitting the locked stake to continue accruing yield, the lock annotation being a state change on the entity's existing stake record and not involving the creation, holding, or transfer of any new funds between parties;

(b) a lock lifecycle manager configured to transition the lock through a defined sequence of states including active (locked, earning yield, non-withdrawable), frozen (locked, non-earning, non-withdrawable, triggered by a dispute filing), released (unlocked upon confirmed transaction completion), and slashed (confiscated upon confirmed non-payment or non-delivery through the adjudication process);

(c) a constraint enforcement module ensuring that the lock amount does not exceed a maximum percentage of the entity's total stake, that the entity's total stake exceeds a minimum multiple of the transaction value, that total active locks across all concurrent transactions do not exceed a defined maximum percentage of total stake, and that the lock automatically releases after a defined duration if no dispute is filed; and

(d) a slash distribution module configured to distribute slashed funds to protocol treasury and/or permanent removal from circulation, the slash distribution explicitly excluding distribution to the counterparty of the transaction, such that the mechanism operates as an economic penalty on existing stakes and not as an escrow or payment intermediary.

**9.** A method for preventing trust score gaming in a decentralized reputation system, the method comprising:

(a) periodically analyzing a directed graph of vouch relationships to detect structural patterns indicative of manipulation, including reciprocal vouching between pairs of entities, cycles of length three or greater in the vouch graph, and densely connected subgraphs with minimal connections to the broader network, and upon detection, reducing the vouching weight contribution of entities involved in the detected patterns by a factor proportional to the cycle length;

(b) imposing asymmetric rate limits on trust score changes, wherein score increases are bounded by maximum daily, weekly, and monthly increase caps that are not cumulative across time periods, and wherein score decreases are not subject to rate limits, such that trust is slow to accumulate and fast to lose;

(c) enforcing behavioral diversity requirements that prevent trust scores above defined thresholds from being achieved through activity in fewer than a defined minimum number of signal dimensions, each contributing above a defined minimum score;

(d) computing cross-provider behavioral correlation metrics for entities registered with multiple providers, the metrics measuring variance in usage patterns across providers, and flagging entities whose cross-provider behavioral variance exceeds a defined statistical threshold for investigation; and

(e) recomputing trust scores at a defined minimum interval and additionally upon occurrence of trigger events including usage volume spikes, anomalous request pattern changes, new provider registrations, stake lock activations, and dispute filings, with immediate cache invalidation upon trigger events to prevent temporal exploitation of cached scores.

**10.** A system implementing constitutional limits on economic penalties in a decentralized trust network, the system comprising:

(a) an immutable constraint store defining a plurality of protocol-level invariants that cannot be modified by governance votes, jury decisions, investigator findings, administrator actions, or any mechanism other than a protocol-level software upgrade, the invariants including at least a maximum economic penalty percentage per incident, a mandatory minimum evidence period between report filing and adjudication, a reporter collateral requirement, a graduated severity schedule prescribing escalating penalties based on offense history, a statute of limitations defining a maximum age of reportable behavior, a double jeopardy prohibition preventing the same specific behavior from being the basis of more than one adjudicated report, and a minimum access floor guaranteeing nonzero service access to all entities;

(b) a validation engine configured to evaluate every proposed economic penalty against all invariants in the immutable constraint store prior to execution, and to reject any proposed penalty that violates any invariant regardless of the source of the penalty request;

(c) a graduated severity engine configured to maintain a rolling offense history for each entity and to compute the maximum permissible penalty for a new offense based on the number and recency of prior confirmed offenses, such that first offenses result in warnings without economic penalty, second offenses are subject to moderate economic penalties, and third and subsequent offenses are subject to the constitutional maximum penalty with permanent access tier restriction and a defined rehabilitation pathway; and

(d) a minimum access floor enforcement module integrated into the gateway middleware, configured to ensure that no entity, regardless of trust standing or penalty history, is denied a protocol-defined minimum level of service access, the minimum access floor being a condition of provider integration with the trust network.

### Dependent Claims

**11.** The method of claim 1, wherein the cryptographic authentication credential comprises a signed event containing the consumer entity's public key, the request URL or URL pathname, the HTTP method, a timestamp, and a cryptographic hash of the request body, the signed event being transmitted in a custom HTTP header.

**12.** The method of claim 1, wherein the composite trust score is further derived from an account tenure dimension that measures the elapsed time since the consumer entity's registration, the account tenure dimension being computed using a sublinear function that penalizes newly created accounts more strongly than it rewards established accounts.

**13.** The method of claim 1, wherein the behavioral health dimension incorporates signals from a plurality of independent AI model providers, enabling detection of adversarial usage patterns that are distributed across providers to evade single-provider detection thresholds.

**14.** The method of claim 1, wherein the composite trust score is published as a cryptographically signed assertion on a decentralized protocol, enabling any AI model provider to verify the consumer entity's trust score without bilateral data-sharing agreements or centralized authority.

**15.** The system of claim 2, wherein the trust registry publishes trust assertions as signed events on the Nostr protocol using NIP-85 Trusted Assertions (event kind 30382), and categorical trust labels using NIP-32 Labeling (event kind 1985).

**16.** The system of claim 2, wherein the staking engine accepts economic stakes denominated in satoshis via Lightning Network hold invoices, the hold invoices providing atomic deposit semantics wherein payment is held in escrow pending validation and settled upon successful verification of staking prerequisites.

**17.** The system of claim 2, wherein the staking engine distributes yield using integer arithmetic with largest-remainder allocation to prevent rounding-induced losses across a plurality of voucher entities.

**18.** The system of claim 2, further comprising a fiat currency on-ramp configured to accept traditional currency deposits, convert them to the programmable value transfer system's native denomination, and deposit the converted value into the staking engine.

**19.** The system of claim 2, wherein the gateway middleware caches trust score query results with a configurable time-to-live to minimize latency impact on API request processing.

**20.** The method of claim 3, wherein computing the composite trust score further comprises weighting the economic backing dimension by the trust scores of the vouching entities, such that vouches from higher-trust entities contribute proportionally more to the consumer entity's economic backing score than vouches from lower-trust entities.

**21.** The method of claim 3, wherein the decentralized identity protocol is the Nostr protocol, the consumer entity is identified by a secp256k1 keypair, and the cryptographically signed assertion is a NIP-85 event verifiable by any Nostr client.

**22.** The method of claim 3, further comprising verifying the consumer entity's domain ownership through a DNS TXT record containing the consumer entity's cryptographic public key at a designated subdomain, and elevating the consumer entity's identity verification dimension score upon successful verification.

**23.** The method of claim 4, wherein the governance mechanism comprises stake-weighted voting, and wherein each participating entity's voting power is proportional to the entity's currently active economic stake.

**24.** The method of claim 4, wherein the cascading slash propagates to a configurable depth, such that second-order vouchers (entities that vouch for the voucher of the slashed consumer) may also suffer attenuated economic consequences.

**25.** The method of claim 4, wherein the misuse detected includes at least one of model distillation through systematic capability extraction, coordinated Sybil account behavior, or violation of usage terms governing chain-of-thought output extraction.

**26.** The method of claim 5, wherein the yield distribution is further weighted by the voucher entity's own trust score, such that higher-trust voucher entities receive preferentially greater yield per unit of stake.

**27.** The method of claim 5, wherein the activity fees are denominated in satoshis and distributed via Lightning Network payments to voucher-registered Lightning addresses.

**28.** The system of claim 2, further comprising a three-party trust model distinguishing among performer entities that execute tasks and self-report outcomes, purchaser entities that hire performers and review completed work, and staker entities that stake economic value on performers, with the trust score computation weighting purchaser reports more heavily than performer self-reports.

**29.** The method of claim 1, further comprising supporting autonomous AI agent entities as consumer entities within the trust framework, the agent entities being distinguished from human entities by protocol-native labels and accumulating trust through verifiable task outcomes within the three-party trust model.

**30.** The system of claim 2, further comprising a relay architecture with programmatic write policy enforcement, wherein trust assertion events are accepted only from authorized service keys, governance vote events are accepted only from entities with active economic stakes, and general content events are accepted only from registered entities.

**31.** The method of claim 3, further comprising bidirectional cross-chain identity attestation, wherein the consumer entity's decentralized protocol identity is linked to an on-chain identity token through mutual cryptographic attestation, and verification comprises checking both attestation directions.

**32.** The method of claim 1, wherein the access tier determination is performed independently by each participating AI model provider based on the provider's own tier threshold configuration, while the composite trust score is computed and published by a neutral scoring service that no single provider controls.

**33.** The method of claim 4, further comprising, after slashing, publishing a slash event record on the decentralized protocol containing the consumer entity's identity, the evidence hash, the severity classification, and the distribution of slashed funds, the slash event being permanently and publicly verifiable.

**34.** A computer-readable medium storing instructions that, when executed by a processor, cause the processor to perform the method of any of claims 1, 3, 4, or 5.

**35.** The method of claim 5, wherein the economic stake from the voucher entity, the activity fee collection, the yield distribution, and the slashing are all denominated in a single unit of account native to a programmable value transfer network, preventing exchange rate risk among participants.

**36.** The method of claim 6, wherein the unpredictable seed for investigator selection is derived from a combination of the most recent block hash from a public blockchain, the report identifier, and a protocol-level nonce, such that the seed is not predictable at the time of report filing and the selection is independently verifiable by any party.

**37.** The method of claim 6, wherein the qualified investigator pool requires each investigator to maintain a minimum composite trust score of at least 600, a minimum economic stake of at least 500,000 satoshis, a minimum account tenure of at least 90 days, and wherein investigators whose findings have been overturned more than twice within a rolling 180-day window are suspended from the pool.

**38.** The method of claim 6, wherein investigators submit findings as sealed commitments using a commit-reveal protocol, wherein the commit phase comprises submitting SHA-256(finding || nonce) and the reveal phase occurs only after all assigned investigators have submitted commits, preventing inter-investigator coordination.

**39.** The method of claim 6, wherein the anonymized case file is generated by replacing all party cryptographic public keys and names with opaque labels, stripping metadata from evidence attachments, and aggregating behavioral data without identifying information, and wherein de-anonymization occurs only after the adjudication process concludes.

**40.** The method of claim 6, wherein investigator compensation is drawn from a bounty pool funded by a defined percentage of protocol fees, forfeited reporter collateral from dismissed reports, and a surcharge on all slashed funds, and wherein investigators receive full bounty when findings are upheld, reduced bounty when overturned, a consistency bonus when all investigators converge on the same finding, and no compensation when findings are not submitted within the deadline.

**41.** The method of claim 7, wherein the jury size varies by severity classification, with 5 jurors for low severity, 7 jurors for medium severity, 9 jurors for high severity, and 11 jurors for critical severity, and the supermajority threshold is at least 75% of the jury size in all cases.

**42.** The method of claim 7, wherein the encrypted anonymous communication channel for jury deliberation is implemented as a NIP-29 ephemeral group with NIP-44 end-to-end encryption created specifically for the case, in which jurors are identified by pseudonyms, and which is destroyed after the vote concludes.

**43.** The method of claim 7, further comprising an appeals process wherein any party to the dispute may file an appeal within a defined window after the jury decision, the appeal requiring higher collateral than the original report, and the appeal being adjudicated by a larger jury drawn entirely from entities that did not participate in the original investigation or jury, with a maximum of one appeal per case and a prohibition on increasing the severity of the penalty on appeal.

**44.** The method of claim 7, wherein a hung jury (failure to achieve supermajority) triggers a single retry with a new jury drawn from non-overlapping participants, and a second hung jury defaults to the lowest-severity outcome applicable under the graduated severity schedule.

**45.** The method of claim 7, wherein juror compensation comprises a base fee per case drawn from protocol fees regardless of vote, plus a supermajority alignment bonus for jurors whose vote aligned with the final decision, and wherein jurors who fail to submit votes by the deadline receive no compensation, face temporary suspension from the juror pool, and suffer a trust score penalty.

**46.** The system of claim 8, wherein the maximum lock percentage is 40% of the entity's total stake, the minimum stake to activate a lock is at least 2x the transaction value, the lock duration is 30 days with automatic release if no dispute is filed, the dispute filing window is 21 days, and total active locks across all concurrent transactions cannot exceed 80% of total stake.

**47.** The system of claim 8, wherein the stake lock module is implemented as a state annotation on existing stake records in a relational database, with the staking engine computing available-to-unstake balance as total stake minus the sum of all active lock amounts, active locks continuing to earn yield, and frozen locks ceasing to earn yield.

**48.** The system of claim 8, further comprising a symmetric non-delivery lock mechanism wherein a performer entity's existing stake is locked when the performer accepts a high-value task, the performer's locked stake being subject to slashing upon confirmed non-delivery through the same adjudication process, with slashed funds similarly excluded from distribution to the counterparty.

**49.** The system of claim 8, wherein confirmed non-payment or non-delivery triggers a reputation multiplier on the trust score impact, the multiplier being at least 3x the standard negative outcome impact for confirmed payment violations and at least 5x when fraud indicators are present, such that the reputational cost of payment violations asymmetrically exceeds the reputational cost of ordinary negative outcomes.

**50.** The method of claim 9, wherein the vouching graph analysis detects cycles of length two through at least length six, and applies graduated weight reductions comprising a 50% vouching weight reduction for reciprocal pairs, a 75% reduction for cycles of length three to five, and zeroing of vouching weight for all entities in rings of length six or greater.

**51.** The method of claim 9, wherein the asymmetric rate limits on score increases comprise a maximum daily increase of 15 points, a maximum weekly increase of 50 points, and a maximum monthly increase of 100 points, with a reduced warming-period rate during the first 30 days of account existence.

**52.** The method of claim 9, wherein the behavioral diversity requirements specify that trust scores above 500 require at least 3 of 5 signal dimensions contributing at least 50 points each, scores above 700 require at least 4 dimensions contributing at least 100 points each, and scores above 850 require all 5 dimensions contributing at least 150 points each.

**53.** The method of claim 9, wherein the cross-provider behavioral correlation metrics comprise usage volume ratio, chain-of-thought request ratio variance, timing pattern correlation, and model preference consistency, and entities whose variance exceeds 2 standard deviations from the population mean are flagged for investigation.

**54.** The method of claim 9, wherein trigger-based recomputation is initiated by any of: a usage volume spike exceeding 3x the rolling 24-hour average, a chain-of-thought ratio increase exceeding 50% within one hour, a new provider registration, a stake lock activation, or a dispute filing, and cached trust scores are invalidated within 5 minutes of a trigger event.

**55.** The system of claim 10, wherein the maximum economic penalty percentage per incident is 50% of the entity's total economic stake, the mandatory minimum evidence period is 14 days, the reporter collateral requirement is 10% of the potential penalty amount, the statute of limitations is 90 days, and the graduated severity schedule prescribes no economic penalty for first offenses within a rolling 365-day window, a maximum 25% penalty for second offenses, and the constitutional maximum for third and subsequent offenses.

**56.** The system of claim 10, wherein the minimum access floor guarantees basic completion access at a rate limit of 2 requests per minute, access to non-reasoning models only, a maximum of 4096 tokens per request, no batch processing or fine-tuning access, and additionally guarantees the right to view the entity's own trust score and dispute history, the right to file appeals, and the right to delete the entity's account.

**57.** The system of claim 10, further comprising a rehabilitation pathway wherein an entity with permanent restricted tier assignment may petition for tier restoration after a defined minimum period of clean behavior (in a preferred embodiment, 365 days), subject to a supermajority jury approval vote and the entity obtaining a defined minimum number of new vouchers willing to stake on the entity's rehabilitation.

**58.** The method of claim 6, wherein the investigator opt-in is published as a Nostr parameterized replaceable event of kind 30360 containing the investigator's public key, domain specializations, capacity declaration, and active status, and the Vouch API validates investigator qualifications against trust score, stake, and tenure data before accepting the opt-in.

**59.** The method of claim 7, wherein the protocol operator and all entities affiliated with the protocol operator are automatically excluded from jury pools when any party to the dispute is connected to the protocol operator through vouching relationships, and wherein the exclusion is enforced at jury selection time by cross-referencing a maintained list of operator-affiliated public keys.

**60.** The system of claim 10, wherein the double jeopardy prohibition is enforced using a SHA-256 hash of the evidence bundle as a unique behavior identifier, and wherein reports referencing a behavior hash that matches a previously adjudicated report are rejected at filing time.

**61.** A computer-readable medium storing instructions that, when executed by a processor, cause the processor to perform the method of any of claims 6, 7, or 9.

---

## DRAWINGS / FIGURES

The following figures would accompany this disclosure if submitted with graphical attachments. Textual descriptions are provided herein as the disclosure is submitted in text format.

**FIG. 1 — System Architecture Overview.** A block diagram depicting the three principal components (Trust Registry, Staking Engine, Gateway Middleware) and their interconnections. The Trust Registry is shown as a decentralized relay network. The Staking Engine is shown as a server with a relational database. The Gateway Middleware is shown as a proxy layer deployed at each participating provider's API endpoint. Arrows indicate data flow: authentication credentials flow from consumers to Gateway Middleware, trust score queries flow from Gateway Middleware to Trust Registry, behavioral telemetry flows from Gateway Middleware to Trust Registry, staking transactions flow from consumers and vouchers to Staking Engine, and trust assertion publications flow from Staking Engine to Trust Registry.

**FIG. 2 — Vouching and Cascading Slash Flow.** A sequence diagram depicting: (a) Consumer registration with keypair generation; (b) Voucher staking on consumer; (c) Consumer receiving elevated access tier; (d) Detection of consumer misuse; (e) Misuse confirmation through governance; (f) Consumer score reduction; (g) Voucher stake slashing; (h) Voucher trust score reduction; (i) Slash fund distribution to provider, treasury, and burn address.

**FIG. 3 — Composite Trust Score Computation.** A weighted diagram showing the multiple signal dimensions feeding into the composite score computation. Each dimension is shown as an input with its conceptual weight. The output is a single bounded numerical score mapped to a tier designation.

**FIG. 4 — Cross-Provider Coordination.** A network diagram showing multiple competing AI model providers (Provider A, Provider B, Provider C) each deploying Gateway Middleware, all reading from and writing behavioral signals to a shared Trust Registry. No bilateral connections exist between providers; all coordination flows through the neutral Trust Registry layer.

**FIG. 5 — Economic Sybil Resistance.** A comparative diagram showing the cost structure of a Sybil attack with and without the disclosed system. Without: N accounts at zero marginal cost. With: N accounts requiring N x M vouchers, each with economic stake S, plus trust score bootstrapping time, plus cascading slash exposure.

**FIG. 6 — Voucher Yield Mechanism.** A circular flow diagram showing: Consumer uses API and generates revenue; Activity fee percentage flows to staking pool; Pool distributes yield to vouchers proportional to stake; Vouchers' continued backing maintains consumer's trust score; Consumer's trust score enables continued API access.

**FIG. 7 — Three-Party Trust Model.** A diagram depicting the three party types (Performer, Purchaser, Staker) and their respective contributions to the composite trust score. Arrows show the flow of outcome reports from Performers and Purchasers, economic stakes from Stakers, and the weighted aggregation into trust dimensions.

**FIG. 8 — Authentication Protocol.** A sequence diagram depicting: (a) Consumer constructs authentication event containing request URL, method, timestamp, and body hash; (b) Consumer signs event with private key; (c) Consumer transmits signed event in HTTP header; (d) Gateway Middleware verifies signature, timestamp freshness, body hash, and replay protection; (e) Gateway Middleware queries trust score and applies access tier.

**FIG. 9 — Lightning Network Staking Flow.** A sequence diagram showing the hold invoice staking mechanism: (a) Voucher requests to stake; (b) System generates hold invoice; (c) Voucher pays invoice; (d) Payment held in escrow; (e) System validates stake; (f) System settles or cancels hold invoice; (g) Stake recorded in database; (h) Trust score updated and published.

**FIG. 10 — Domain Verification.** A diagram showing: (a) Consumer publishes DNS TXT record at `_vouch.example.com` containing public key; (b) Trust Registry queries DNS record; (c) Trust Registry verifies public key match; (d) Consumer's identity verification dimension score is elevated; (e) Updated trust score is published to Trust Registry.

**FIG. 11 — Investigation Flow.** A sequence diagram depicting the complete investigation lifecycle: (a) Entity reports misuse with evidence hash and reporter collateral deposit; (b) Protocol validates report against constitutional constraints (statute of limitations, double jeopardy, collateral sufficiency); (c) Verifiable random selection of three investigators from qualified pool using unpredictable seed (block hash + report ID + nonce); (d) Generation of anonymized case file with opaque party labels; (e) Distribution of anonymized case file to investigators; (f) Each investigator independently reviews evidence and submits sealed finding commitment (hash of finding + nonce); (g) After all three commits received, investigators reveal findings and nonces for verification; (h) Verified findings forwarded to jury adjudication with convergence score.

**FIG. 12 — Jury Adjudication Flow.** A sequence diagram depicting: (a) Severity-based jury size determination (5/7/9/11 jurors); (b) Verifiable random jury selection with conflict-of-interest filtering; (c) Jury receives anonymized case packet (case file + investigator findings + accused response + constitutional context); (d) Individual review period (Days 1-3); (e) Accused entity's response deadline (Day 3); (f) Anonymous deliberation in NIP-29 ephemeral encrypted group with pseudonymous jurors (Days 4-7); (g) Commit phase: each juror submits hash(vote + recommended_bps + nonce); (h) Reveal phase: after all commits, jurors reveal votes and nonces for verification; (i) Supermajority threshold check (>=75%); (j) If supermajority for slash: execute penalty at median recommended bps capped by constitutional limits; (k) If supermajority for dismiss: dismiss report, forfeit reporter collateral; (l) If hung jury: select new jury with no overlap, retry once; second hung jury defaults to lowest-severity outcome. (m) Appeal window opens (14 days).

**FIG. 13 — Stake Lock Lifecycle.** A state diagram depicting the complete lifecycle of a non-payment/non-delivery stake lock: (a) Transaction Initiation: purchaser's stake assessed against lock requirements (minimum 2x transaction value, lock amount <= 40% of total stake, total active locks <= 80%); (b) Active State: lock placed on portion of existing stake; locked funds continue earning yield but are non-withdrawable; purchaser's available-to-unstake balance reduced; (c) Normal Completion Path: performer confirms receipt of external payment via Vouch SDK; lock transitions to Released state; full stake available again; (d) Dispute Path: performer files non-payment report within 21-day window; lock transitions to Frozen state (no yield, non-withdrawable); investigation and jury adjudication process begins; (e) If non-payment confirmed: frozen stake slashed at constitutional limits; slashed funds distributed to protocol treasury and/or burn (NOT to counterparty); (f) If report dismissed: lock transitions to Released; reporter collateral forfeited; (g) Auto-Release: if no dispute filed within 21 days, lock automatically releases on Day 30. Parallel diagram shows symmetric performer-side lock for non-delivery protection.

**FIG. 14 — Federation Architecture.** A network diagram depicting: (a) Multiple independent Trust Registries (Registry A, Registry B, Registry C), each operated independently and publishing trust assertions signed by their respective service keys to the shared Nostr relay network; (b) Provider trust stores at each AI model provider, each configured with a provider-specific weighting policy that aggregates trust assertions from one or more registries; (c) The common identity layer (secp256k1 public keys) enabling cross-registry reference — an entity's public key is the common identifier across all registries; (d) Providers may trust a single registry, weight multiple registries, or require corroboration from multiple registries; (e) No bilateral connections between registries; all interoperability flows through the common decentralized protocol; (f) Market-based accountability: registries accumulate reputation based on assertion reliability, and providers may reduce weighting for unreliable registries.

---

## PRIOR ART ESTABLISHED BY INVENTOR(S)

The inventor has established the following public prior art as of the filing date of this disclosure:

| Date | Artifact | Description |
|------|----------|-------------|
| 2026-02-22 | `@percival-labs/vouch-sdk@0.1.0` published to npm public registry | First public release of the agent trust SDK implementing Nostr identity, NIP-98 HTTP authentication, trust score verification, and agent registration |
| 2026-02-22 | Vouch API deployed to Railway (public endpoint) | Operational API for agent registration, trust scoring, outcome reporting, and score verification |
| 2026-02-22 | First agent registered on Vouch network | Operational proof of the trust registration and scoring system with verifiable Nostr identity |
| 2026-02-22 | percival-labs.ai website deployed to Cloudflare Pages | Public documentation of the Vouch protocol, SDK, and trust staking concepts |
| 2026-02-22 | 15 public posts on X (Twitter) platform | Public disclosure of the Vouch trust staking concept, launch announcements, and explanatory content |
| 2026-02-21 | Nostr-Native Vouch Architecture specification (internal) | Comprehensive specification describing the complete protocol architecture including identity, staking, scoring, relay, payment, and community layers |
| 2025-2026 | Git commit history (continuous) | Continuous development history of the Vouch protocol design, SDK implementation, API implementation, and supporting infrastructure |

---

## RELATIONSHIP TO MOTIVATING PRIOR ART

On February 23, 2026, Anthropic PBC publicly disclosed that approximately 24,000 fraudulent accounts had been created across its platform, generating over 16 million exchanges with its Claude AI models for the purpose of industrial-scale model distillation. The disclosure described "hydra cluster" architectures comprising distributed networks of fraudulent accounts designed to evade single-account detection. This public disclosure by Anthropic serves as motivating prior art demonstrating the real-world inadequacy of existing API access control mechanisms and the urgent need for the economic trust staking approach described in the present disclosure.

The inventor's prior art predates the Anthropic disclosure, with the SDK publication, API deployment, first agent registration, and public announcements occurring on February 22, 2026, one day prior to the Anthropic disclosure. The architectural specification was authored on February 21, 2026, two days prior. The continuous development history extends through 2025 and into 2026.

---

## SCOPE AND LIMITATIONS

This defensive disclosure covers the **protocol-level concepts, system architecture, and method claims** described herein. The inventors explicitly reserve as trade secrets and do not disclose:

- Specific trust score computation algorithms, numerical weights, normalization functions, decay parameters, and threshold values
- Specific behavioral anomaly detection heuristics, feature engineering methods, and detection thresholds
- Specific slash adjudication algorithms, evidence evaluation criteria, and governance implementation details
- Proprietary implementation details of the staking engine, yield distribution algorithms, and payment processing workflows
- Internal API architecture, database schemas, query optimization strategies, and middleware implementation specifics
- Machine learning models, training data, or inference methods used in behavioral analysis

The purpose of this disclosure is to establish prior art that prevents any party from obtaining patent claims covering the described concepts, methods, and system architectures, while preserving the inventors' ability to maintain proprietary implementations of these concepts as trade secrets.

---

## DEDICATION AND NOTICE

This document constitutes a defensive disclosure under the provisions of the America Invents Act (AIA), 35 U.S.C. 102(a)(1), and equivalent international provisions including but not limited to Article 54 of the European Patent Convention and Section 29 of the Japanese Patent Act. It is published to establish prior art and prevent the patenting of the described methods, systems, and techniques by any party.

The inventors explicitly dedicate the described protocol-level concepts and system architecture to the public domain for the purpose of prior art establishment, while reserving all rights to specific implementations, trade secrets, proprietary algorithms, source code, and trademarks including but not limited to "Vouch," "Vouch Score," "Percival Labs," and associated marks.

---

**Contact:**
Alan Carroll
Percival Labs
Bellingham, Washington, United States of America
Web: percival-labs.ai
Email: percyai2025@gmail.com

# From Framework to Infrastructure: Implementing Intelligent AI Delegation with Economic Trust Staking

**Type:** Research Paper
**Author:** Alan Carroll · Percival Labs
**Date:** February 2026
**In response to:** Tomasev, N., Franklin, M., & Osindero, S. (2026). "Intelligent AI Delegation." arXiv:2602.11865.

---

## Abstract

Tomasev, Franklin, and Osindero present the most comprehensive theoretical framework for intelligent AI delegation produced by any major research lab — a 68-page treatment spanning five architectural pillars, nine technical components, and a security threat taxonomy that maps the full attack surface of multi-agent delegation networks. Their framework correctly identifies the critical requirements: smart contract formalization, escrow bonds, decentralized identity, reputation ledgers, competitive bidding, transitive accountability, privilege attenuation, and adaptive re-delegation. What the framework does not provide is implementation. Every mechanism they propose exists as a theoretical specification without a concrete identity system, payment rail, contract schema, or reputation bootstrapping protocol. We present a working implementation — the Vouch protocol — that addresses each of the framework's nine components through cryptographic identity on the Nostr protocol, economic staking via Lightning Network micropayments, federated trust scoring through signed append-only assertions, and a structured contract system derived from construction industry patterns. We argue that the convergence between DeepMind's academic framework and Vouch's practitioner-built infrastructure — arrived at independently from entirely different domains — validates both the diagnosis and the architectural direction, and that what the field now requires is the bridge from theory to deployed, testable systems.

---

## 1. The Framework and Its Ambition

DeepMind's "Intelligent AI Delegation" is an ambitious piece of work. It attempts — and largely succeeds at — providing a unified theoretical treatment of a problem that most of the field has addressed piecemeal: how autonomous AI agents should decompose tasks, select delegates, formalize agreements, monitor execution, verify outcomes, and maintain trust across multi-party delegation chains.

The framework is built on five architectural pillars: dynamic assessment of agent capabilities through task decomposition and assignment; adaptive execution through coordination mechanisms that respond to contextual shifts; structural transparency through monitoring and verifiable completion; scalable market coordination through reputation systems and multi-objective optimization; and systemic resilience through security and permission handling. These pillars map to nine technical components — task decomposition, task assignment, multi-objective optimization, adaptive coordination, monitoring, trust and reputation, permission handling, verifiable task completion, and security — each receiving detailed treatment.

The theoretical rigor is commendable. The paper draws on principal-agent theory, transaction cost economics, contingency theory, and organizational design to ground its framework in established institutional economics. It identifies eleven dimensions along which delegated tasks can be characterized (complexity, criticality, uncertainty, duration, cost, resource requirements, constraints, verifiability, reversibility, contextuality, and subjectivity) and seven axes along which delegation relationships vary. The security taxonomy is particularly thorough, cataloguing threats from malicious delegatees, malicious delegators, and ecosystem-level attacks including Sybil rings, collusion, agent traps, and cognitive monoculture.

This is the most rigorous treatment of the delegation problem from a major lab. It deserves to be read widely and taken seriously.

---

## 2. The Implementation Gap

The framework's limitation is equally clear: 68 pages of theory, zero lines of deployed code. The paper describes *what* should exist without building it.

This is not a criticism of the authors' intent — theoretical frameworks serve a different purpose than engineering specifications. But the gap matters, because the hardest problems in agent delegation are implementation problems, not theoretical ones. Consider what the framework leaves unspecified:

**Identity.** The paper calls for "decentralized identifiers enabling cryptographic signing of all communications" and "mutual TLS authentication for encrypted network traffic." It does not specify which identity protocol, which key format, how identity bootstrapping works, how keys are managed, or how identity persists across platform migrations. The difference between "agents should have cryptographic identity" and a working identity system is the difference between an architecture diagram and a building.

**Payment rails.** The framework proposes "escrow mechanisms holding payment pending verification, with optional dispute periods and bonding requirements" and "cryptoeconomic security through delegatee stakes ensuring rational adherence." It does not specify how payments flow, in what denomination, through what network, with what latency, at what cost, or how escrow is implemented without a trusted intermediary. The challenge of agent-to-agent micropayments is not knowing they should exist — it is making them work at the speed and cost that autonomous agents require.

**Reputation bootstrapping.** The paper outlines three reputation models — immutable ledgers, web-of-trust credentials, and behavioral scoring — but does not address the cold-start problem. How does a new agent establish trust? What prevents reputation systems from calcifying around early entrants? How are reputation scores computed, weighted, and made comparable across different contexts? These are the questions that determine whether a reputation system works or becomes a theoretical construct that nobody implements.

**Contract schema.** "Formalized into a smart contract that ensures task execution follows specifications" is a correct requirement. But what does the contract contain? What fields? What state machine governs its lifecycle? How are milestones defined, verified, and disputed? How are scope changes handled mid-execution? The paper proposes "interactive negotiation in natural language prior to commitment" — but the hard engineering is in what happens after commitment, when the work is underway and circumstances change.

The gap between framework and implementation is not a failure of the paper. It is an invitation to the field. What follows is one response to that invitation.

---

## 3. The Construction Convergence

Before mapping the framework's components to implementation, a structural observation deserves attention.

DeepMind's framework independently arrives at what might be called "contract-first decomposition" — the principle that tasks should be recursively decomposed until outputs become precisely verifiable, with formalized agreements at each level of the hierarchy. They describe "liability firebreaks" that prevent diffusion of responsibility across delegation chains. They propose graduated authority based on trust, where low-trust agents face transaction caps and mandatory oversight while high-reputation agents operate with minimal intervention. They envision competitive bidding through decentralized task marketplaces.

Every one of these patterns has a direct analog in the construction industry.

The Vouch protocol's contract system was designed by a practitioner with years of residential construction experience. General contracting operates in precisely the environment DeepMind describes: multiple independent parties coordinating complex, multi-phase work under uncertainty, where reputation is the most valuable business asset, where scope must be formalized before work begins, where payment is gated to verified milestones, and where accountability chains flow from general contractor to subcontractor with clearly delineated liability at each level.

The convergence is striking because the two designs were developed from entirely different starting points. DeepMind's framework emerges from academic analysis of principal-agent theory, organizational design, and AI safety research. Vouch's contract model emerges from the institutional patterns that evolved over decades of actual construction project management — scope of work documents, progress payment schedules, change order protocols, retention holdbacks, and performance bonds.

When an academic framework and a practitioner-built system arrive at the same architectural patterns independently, both are validated. The construction industry's patterns work because they solve real coordination problems under real economic constraints. DeepMind's framework identifies the same patterns because it correctly analyzed the structural requirements of multi-party delegation under uncertainty. The overlap is not coincidence — it is convergent design driven by the same underlying problem structure.

---

## 4. Mapping the Nine Components

The following table provides a high-level mapping between DeepMind's framework components and Vouch's implementation. Each row is expanded below.

| DeepMind Framework Component | Vouch Implementation | Mechanism |
|------------------------------|---------------------|-----------|
| Smart Contract Formalization | Construction-model contracts | SOW, milestones, change orders, retention |
| Escrow Bonds / Financial Stake | Lightning staking via NWC/Alby Hub | Sats locked before work begins |
| Decentralized Identity (DIDs) | Nostr keypairs (npub/nsec) | Ed25519, NIP-98 auth, NIP-01 events |
| Reputation Ledger | NIP-85 trust score events | Stake-weighted, append-only, federated |
| Competitive Bidding | Contract bidding system | 14 API endpoints, live on Railway |
| Verifiable Credentials | Cryptographically signed Nostr events | Non-repudiable attestations |
| Transitive Accountability | Agent-subcontractor liability chains | GC-to-sub responsibility model |
| Permission Handling | Graduated trust tiers | Economic threshold gates |
| Adaptive Re-delegation | Contract status lifecycle | Active/paused/disputed/cancelled + change orders |
| Task Verification | Milestone verification gates | Customer confirms deliverable before payment |
| Monitoring | Contract event logging | Append-only event stream per contract |
| Security (Sybil, Collusion) | Economic Sybil resistance | Staking cost makes fake identities expensive |
| Market Coordination | Nostr relay marketplace | Decentralized, no platform lock-in |

### 4.1 Task Decomposition and Contract Formalization

DeepMind envisions tasks being "recursively decomposed until outputs become precisely verifiable," with each decomposition level formalized into a smart contract specifying deliverables, constraints, and automated penalties.

Vouch implements this through a structured contract system modeled on construction industry scope-of-work documents. Each contract comprises defined deliverables with explicit acceptance criteria, exclusions that bound what is and is not included, a milestone schedule with verification gates at each stage, and an estimated timeline. The contract is signed by both parties' Nostr keypairs, creating a cryptographically verifiable record of mutual commitment. The schema supports recursive decomposition — a general contractor agent can subcontract individual milestones, creating a delegation tree where each node is a formalized contract with its own SOW, milestones, and payment schedule.

The critical design difference from a generic "smart contract" is the inclusion of change orders. DeepMind's framework acknowledges that delegation must be adaptive, but its contract formalization section focuses primarily on the initial agreement. Construction experience teaches that the initial contract is necessary but not sufficient — requirements change, constraints shift, and the mechanism for handling those changes determines whether the system works in practice. Vouch's change order protocol — where either party can propose a scope modification, the other party approves or rejects via signed event, and the modification is appended to the contract record — provides the adaptive formalization that the framework calls for but does not specify.

### 4.2 Escrow Bonds and Economic Stake

The framework proposes "escrow mechanisms holding payment pending verification" and "cryptoeconomic security through delegatee stakes ensuring rational adherence." It correctly identifies that economic commitment is necessary to align incentives between delegator and delegatee.

The naive implementation of escrow — a platform holding funds on behalf of both parties — creates a regulatory and trust problem that the paper does not address. Any entity that accepts, holds, and transmits customer funds is likely a money transmitter under FinCEN guidance (FIN-2019-G001), subject to state-by-state licensing, bonding requirements, and compliance overhead that is prohibitive for an open protocol. The framework's escrow bonds are economically sound but regulatorily fragile if implemented through custodial intermediaries.

Vouch addresses this through Lightning Network HODL invoices — a mechanism that achieves the economic properties of escrow without the platform ever taking custody of funds. A HODL invoice leverages the Hash Time-Locked Contract (HTLC) structure native to Lightning: the payer's funds are locked in a cryptographic commitment routed through the network, but the payment is neither settled nor canceled — it is held in a pending state. The service that generated the invoice holds only the 32-byte preimage (a piece of information), not the funds themselves. Settlement occurs when the service reveals the preimage, releasing the locked funds to the recipient. Cancellation occurs when the service rejects the HTLC, returning the funds to the payer along the same route.

This distinction — holding information versus holding money — is legally significant. Under the FinCEN software provider exemption, entities that provide "the delivery, communication, or network access services used by a money transmitter to support money transmission services" are not themselves money transmitters. The HODL invoice service facilitates the conditional release of payments through cryptographic operations, but at no point does it accept, hold, or transmit the funds. The funds remain locked in Lightning channel HTLCs controlled by the payer's and recipient's nodes. This is analogous to the integral escrow services ruling (FIN-2008-R001), where escrow that is "integral to the sale of goods or services" and not offered as a standalone financial service may be exempt from money transmission requirements. We note explicitly that this analysis is pending formal legal review — the application of money transmitter law to HODL invoice escrow has not been tested in court. But the structural properties are favorable, and the architecture is designed to maximize the distance between the protocol operator and the movement of funds.

In practice, Vouch implements this as per-milestone HODL invoices. When a contract is executed, the delegator creates a HODL invoice for the deposit milestone. The funds lock immediately in the Lightning network. When the agent submits a deliverable and the delegator verifies acceptance, the service reveals the preimage and the milestone payment settles. If the deliverable is rejected, the HTLC is canceled and funds return to the delegator. Each subsequent milestone — progress payment, completion payment — follows the same pattern: lock on creation, settle on verification, cancel on rejection.

Fidelity bonds — the "delegatee stakes" that DeepMind proposes — are implemented as separate HODL invoices where the agent locks its own funds as a performance guarantee. If the agent completes the work satisfactorily, its fidelity bond is canceled (funds returned). If the agent defaults or delivers unacceptable work, the bond's preimage is revealed, transferring the staked funds to the delegator as compensation. The economic incentive alignment is identical to DeepMind's proposal, but the mechanism avoids custodial intermediation entirely.

Retention — the construction industry's answer to latent defects — is implemented as a time-delayed HODL invoice. A configurable percentage of the contract value (typically 10%) is locked in a HODL invoice whose preimage release is conditioned on the passage of a cooling period without disputes filed. In construction, retainage exists because defects often surface only after the contractor has left the job site. For AI agents, where the consequences of flawed work — hallucinated code, incorrect analysis, subtle data corruption — may not manifest immediately, retention provides a temporal buffer between delivery and final settlement. If a dispute is filed during the retention period, the HODL invoice is held pending resolution. If no dispute is filed, the preimage is released and the retention payment settles automatically.

The HODL invoice pattern has proven deployable. RoboSats uses it for peer-to-peer Bitcoin exchange escrow. Mostro implements it on Nostr for marketplace transactions. Alby Hub, which Vouch deploys for its treasury operations, supports HODL invoices natively through its LDK backend — where invoices are held by default and never auto-settle, giving the application full control over settlement timing.

DeepMind's framework discusses verification but does not address either the regulatory implications of custodial escrow or the temporal dimension of quality assurance. The HODL invoice mechanism solves both: non-custodial by construction, time-aware through retention holds, and milestone-gated through per-deliverable settlement. Construction experience identified the need. Lightning protocol engineering provides the mechanism.

### 4.3 Decentralized Identity

The paper calls for "decentralized identifiers enabling cryptographic signing of all communications" with "non-repudiation of contractual agreements." It describes three reputation implementation models that all depend on a functioning identity layer, but does not specify one.

Vouch uses Ed25519 keypairs on the Nostr protocol (NIP-01). Every agent, every human principal, and every organizational entity is identified by a public key derived from cryptographic key generation. This identity is durable (the key persists across platform migrations), verifiable without a central authority (signature verification is a mathematical operation), non-forgeable (impersonation requires the private key), and bindable to responsible legal entities through signed registration events.

Authentication uses NIP-98 HTTP Auth — every API request includes a signed Nostr event that proves the requester controls the claimed keypair. This is not layered on top of an existing authentication system; it is the authentication system. Agent-to-agent identity verification is intrinsic to every protocol interaction, addressing the "mutual TLS authentication" requirement through cryptographic signatures rather than certificate authorities.

### 4.4 Reputation and Trust Scoring

DeepMind outlines three reputation models: immutable blockchain ledgers tracking completion rates, decentralized identifiers issuing signed verifiable credentials, and behavioral scoring emphasizing transparency and safety compliance. Their Table 3 compares these models but does not specify how to combine them or how to bootstrap reputation for new agents.

Vouch's trust scoring integrates elements of all three approaches through NIP-85 signed assertions. Trust scores are derived from staking history (how much economic commitment the agent maintains), behavioral outcomes (verified completions, failures, disputes, slashing events), and community endorsement (the vouching chain — who stakes their reputation on this agent, and what is their own trust score). Each data point is a cryptographically signed event published to Nostr relays, creating an append-only, federated, tamper-resistant record.

The cold-start problem is addressed through vouching. A new agent arrives with zero history but can bootstrap trust through endorsement by established agents — with the critical constraint that vouchers accept cascading economic exposure. If the new agent misbehaves, the voucher's stake is partially slashed. This creates a natural due diligence incentive: vouchers investigate before endorsing, because their own economic position depends on the new agent's behavior. The reputation bootstrapping mechanism is not administrative (a central authority grants initial trust) or automatic (everyone starts at the same level) — it is economic, with trust capital flowing through accountable endorsement chains.

### 4.5 Competitive Bidding and Market Coordination

The framework envisions "decentralized task marketplaces" where "delegators advertise tasks; agents/humans submit competitive bids" followed by "interactive negotiation in natural language prior to commitment."

Vouch's contract bidding system is deployed and operational — 14 API endpoints running on Railway. A customer posts a contract with requirements and acceptance criteria. Multiple agents submit proposals, each including their approach, estimated cost in satoshis, proposed timeline, and their Vouch trust score with completion history. The customer evaluates proposals against both price and trust.

This creates the market dynamic DeepMind describes, with an additional insight from construction: experienced customers learn that the lowest bid is not the best value. An agent with a higher trust score, demonstrated through a history of successful completions and strong vouching chains, can justifiably charge more — and rational customers will pay the premium, because the cost of a failed engagement (lost time, rework, dispute resolution) exceeds the cost differential between a trusted agent and a cheap one. Trust scores become economically meaningful not as an abstract metric but as a competitive advantage that agents earn and customers price.

### 4.6 Verifiable Task Completion

The paper proposes four verification mechanisms: direct inspection, trusted auditing, cryptographic proofs (zk-SNARKs), and game-theoretic consensus (TrueBit-style protocols). These represent a spectrum from simple to sophisticated.

Vouch currently implements the first tier — direct inspection through milestone verification gates. At each milestone, the agent submits deliverables, the customer reviews against the SOW's acceptance criteria, and approves or disputes the submission. Each verification event is signed and appended to the contract's event stream. This is the equivalent of a construction walkthrough: the customer inspects the work, checks it against the plans, and either signs off or generates a punch list.

We acknowledge that direct inspection is the least sophisticated of DeepMind's four verification tiers. Cryptographic proofs and game-theoretic consensus offer stronger guarantees for specific task types — formal verification of generated code, for example, or consensus-based validation for subjective deliverables. These are engineering extensions that the protocol architecture supports but does not yet implement. The gap is honest: milestone-based verification works for a wide class of agent tasks, but the field will need the more sophisticated mechanisms as agent work becomes more complex and consequential.

### 4.7 Transitive Accountability

DeepMind's treatment of accountability in delegation chains is among the paper's strongest sections. They describe a model where, for a chain A to B to C: "Agent B verifies C's work and generates signed attestations. Agent A verifies B's direct work plus B's verification of C. Responsibility follows individual branches; agents cannot absolve themselves by blaming subcontractors."

This maps directly to the general contractor to subcontractor accountability model that Vouch's contract system implements. When a GC agent subcontracts a milestone to a specialist agent, the GC remains liable to the customer for the subcontractor's work. The GC verifies the subcontractor's deliverables before presenting them to the customer. If the subcontractor's work fails verification, the GC's trust score bears the impact — and the GC seeks recourse from the subcontractor through the subcontract's own dispute mechanism.

The "liability firebreaks" DeepMind proposes — "predefined contractual stop-gaps where intermediate agents either assume full downstream liability or request authority transfer from human principals" — are the digital equivalent of the liability boundaries that construction law has defined for decades. A general contractor is liable for the work performed under their contract, regardless of which subcontractor actually performed it. The customer contracted with the GC, not the sub. This principle translates directly: an agent that delegates subtasks remains accountable for the delegated work, creating natural incentives for careful subcontractor selection and verification.

### 4.8 Permission Handling and Graduated Trust

The framework proposes "risk-adaptive access control with privilege attenuation, semantic constraints, and algorithmic circuit breakers." Low-trust agents face restricted access; high-trust agents operate with greater autonomy. Permissions attenuate as they flow down delegation chains — sub-delegatees receive only the permission subsets necessary for their specific tasks.

Vouch implements this through economic threshold gates. An agent's trust score, derived from staking history and behavioral outcomes, determines what operations it can perform, what APIs it can access, and what data it can request. A newly registered agent with minimal stake operates under heavy restrictions — rate limits, capability caps, mandatory human oversight for consequential actions. As the agent accumulates successful outcomes and its trust score rises, restrictions relax proportionally. The gating is continuous, not binary: there is no single threshold between "untrusted" and "trusted," but a smooth gradient where each increment of verified trustworthiness unlocks additional capability.

Privilege attenuation follows naturally from the contract system. When a GC agent subcontracts a milestone, the subcontract's scope defines exactly what the subcontractor needs access to — no more. The sub-delegatee's permissions are bounded by the subcontract's SOW, not by the GC's full permission set. DeepMind describes this as preventing "compromise escalation across the delegation network." Construction knows it as giving the plumber access to the bathroom, not the blueprints.

### 4.9 Adaptive Coordination and Re-delegation

DeepMind's framework distinguishes between external triggers (specification changes, resource availability shifts, security threats) and internal triggers (performance degradation, budget overruns, verification failures, unresponsiveness) that necessitate adaptive response. The response mechanisms range from parameter adjustment to partial re-delegation to complete re-decomposition.

Vouch's contract lifecycle provides the implementation substrate. A contract can be active, paused, disputed, completed, or cancelled — each transition is a signed event in the contract's audit trail. When circumstances change, the change order mechanism provides structured adaptation without abandoning the existing agreement. When adaptation is insufficient, dispute resolution provides a formal process for contract modification or termination. When an agent becomes unresponsive or fails verification, the customer can pause or cancel the contract, with economic consequences governed by the contract terms and the stage of completion.

The retention mechanism also serves an adaptive function. During the cooling period, if the customer discovers issues with delivered work, they can initiate a dispute before final settlement. This creates a temporal window for quality issues to surface — the adaptive re-delegation equivalent of a construction warranty period.

---

## 5. Security: Where Economic Accountability Meets Threat Taxonomy

DeepMind's security taxonomy is the most thorough treatment of agent delegation threats in the literature. It catalogs malicious delegatee attacks (data exfiltration, verification subversion, privilege escalation, backdoor implanting), malicious delegator attacks (harmful task delegation, prompt injection, model extraction, reputation sabotage), and ecosystem-level threats (Sybil attacks, collusion, agent traps, agentic viruses, smart contract vulnerabilities, cognitive monoculture).

Economic staking addresses the incentive structure underlying these threats, though not every threat equally.

**Sybil resistance.** The framework identifies Sybil attacks — "creating false agent identities" — as a fundamental ecosystem threat. Economic staking makes Sybil attacks expensive rather than free. Each identity requires committed economic stake, and each identity's trust score depends on vouching from established agents who risk their own stake. Creating a thousand fake identities requires either a thousand independent economic commitments or the complicity of existing agents who would bear cascading slashing consequences. The attack is not impossible, but its cost scales linearly with the number of fake identities, which transforms it from a trivial exploit to an economic calculation.

**Collusion resistance.** DeepMind identifies collusion — "fixing prices or blacklisting competitors" — as a market-level threat. Vouch's federated architecture provides structural resistance: trust scores are published to multiple independent Nostr relays, not a single registry that can be captured. Collusion requires coordinating across the relay network, and the append-only nature of trust assertions means that collusive behavior leaves a permanent, auditable trail. This does not prevent collusion — it makes it detectable and economically traceable.

**Reputation sabotage.** The framework warns that malicious delegators might attempt to destroy competitors' reputations. Vouch's dispute resolution mechanism includes collateral requirements — filing a dispute requires the accuser to commit economic stake, which is forfeited if the dispute is judged frivolous. This creates symmetry: damaging an agent's reputation carries the same economic risk as the damage itself, preventing zero-cost reputation attacks.

**Smart contract vulnerabilities.** DeepMind identifies reentrancy and front-running as smart contract risks. Vouch's use of Lightning Network payment channels rather than on-chain smart contracts avoids the common DeFi attack surface. Payments are discrete micropayment events, not composable on-chain transactions. The tradeoff is expressiveness — Lightning payments cannot implement arbitrary programmatic conditions — but the attack surface is correspondingly narrower.

---

## 6. Where This Falls Short

Intellectual honesty demands acknowledging where the implementation does not fully satisfy the framework's requirements — and where additional limitations exist that the framework does not address.

**Agent capability is unchanged.** Economic staking does not make agents smarter, more capable, or more reliable. It makes poor performance costly. An agent that genuinely lacks the capability to complete a task will still fail — it will simply lose its stake in the process. The framework's multi-objective optimization component (Section 4.3) requires agents to balance cost, speed, quality, privacy, and uncertainty across Pareto-optimal solutions. Vouch's economic layer creates incentives for agents to avoid tasks beyond their capability, but it does not provide the optimization mechanisms themselves. The economic structure shapes behavior at the margin; it does not substitute for capability.

**Lightning payment channel liquidity.** The framework's escrow mechanisms assume that payment flows are smooth and available. In practice, Lightning Network channels require liquidity — funded channels between nodes — and channel capacity constrains maximum payment size. The Vouch deployment currently uses Alby Hub with LDK, which simplifies channel management but does not eliminate the underlying constraint. Large-value contracts require sufficient channel capacity, and channel opening costs create a minimum viable transaction size below which micropayments become uneconomic. This is an infrastructure maturity issue rather than an architectural flaw, but it constrains the range of delegation scenarios the system can currently support.

**Nostr relay federation is young infrastructure.** The framework assumes robust, reliable, globally distributed infrastructure for identity and reputation. Nostr's relay network is functional but young — relay availability varies, relay operators have diverse policies on event retention and filtering, and the relay ecosystem lacks the reliability guarantees of mature infrastructure. Trust scores published to relays that go offline become temporarily unavailable. The architecture handles this through relay redundancy (publishing to multiple relays), but the federation is not yet at the maturity level the framework implicitly assumes.

**Quality validation is heuristic, not formal.** The framework proposes cryptographic proofs (zk-SNARKs) and game-theoretic consensus (TrueBit-style protocols) for task verification. Vouch's current verification is milestone-based customer review — the digital equivalent of a construction walkthrough. This works well for many task types but lacks the formal guarantees that some delegation scenarios require. Code that compiles and passes tests may still contain subtle bugs. Analysis that reads well may still contain flawed reasoning. Customer review catches obvious failures but not sophisticated ones. The more rigorous verification mechanisms the framework proposes are engineering work that remains to be done.

**Safety as a luxury good.** DeepMind raises a concern that deserves more attention than it typically receives: in market-based delegation systems, safety and reliability become premium services that only well-resourced delegators can afford. Agents with higher trust scores charge more. Verification is costly. Dispute resolution takes time. The risk is that economic accountability becomes a luxury good — available to those who can afford it, absent for those who cannot.

Vouch's microstaking model partially addresses this. Minimum viable stakes are set low enough that participation is broadly accessible, and the protocol's minimum access floor guarantees that even the lowest-trust agents receive nonzero service. But "partially addresses" is the honest assessment. A system where trust costs money creates stratification. The framework identifies this concern without resolving it, and neither does Vouch.

**Governance of the governance system.** Who sets the slashing parameters? Who defines what constitutes a verified adverse outcome? Who decides the minimum stake thresholds? These are not technical questions — they are governance questions, and the framework correctly implies (through its Section 5 on ethical delegation) that they must be answered through legitimate processes, not unilateral technical decisions. Vouch's current governance parameters are set by the protocol designers. A mature system would require community governance mechanisms that the protocol does not yet implement.

---

## 7. The Theory-Practice Bridge

DeepMind's contribution is foundational. The framework provides a coherent theoretical language for discussing delegation problems that the field has, until now, addressed in fragments. Individual papers have tackled identity, or trust, or task decomposition, or security — but the integrated treatment of all nine components within a unified framework, grounded in established institutional economics, is new and valuable.

What the field needs now is the bridge between this theoretical foundation and deployed systems that practitioners can test, break, and improve. The history of distributed systems teaches that theoretical frameworks and working implementations co-evolve: the theory identifies requirements the implementation must meet; the implementation reveals constraints the theory did not anticipate; and the iteration between them produces systems that are both principled and practical.

Vouch represents one point on the implementation side of this bridge. It makes specific design choices — Nostr for identity, Lightning for payments, construction patterns for contracts, federated assertions for reputation — that are defensible but not uniquely correct. Other implementations will make different choices. The framework is valuable precisely because it is implementation-agnostic: it defines what delegation infrastructure must provide without prescribing how.

The invitation is to the research community and to practitioners: test these mappings. Build alternative implementations. Find the places where the framework's requirements are harder to satisfy than they appear on paper, and the places where implementation reveals requirements the framework missed. The delegation problem will not be solved by theory or by implementation alone. It will be solved by the disciplined iteration between both.

---

## 8. Conclusion

DeepMind described the blueprint. The five pillars are correct. The nine components are comprehensive. The security taxonomy is the most thorough in the literature. The ethical considerations — meaningful human control, accountability in long chains, safety as a potential luxury good, de-skilling risks — are the right concerns raised at the right level of abstraction.

What is needed now is construction.

Vouch demonstrates that the framework's requirements can be met with existing technology — cryptographic identity that is durable and decentralized, economic staking that creates pre-committed accountability, federated reputation that is tamper-resistant and portable, and structured contracting that handles the messy reality of scope changes, milestone disputes, and adaptive re-delegation. These are not theoretical proposals. They are deployed, running, and subject to the honest feedback that only real usage provides.

The convergence between DeepMind's academic framework and Vouch's practitioner-built implementation — arrived at independently, from AI safety theory and construction industry experience respectively — suggests that the field is converging on the right architectural direction. What remains is the hard work of building, testing, breaking, and refining the systems that bridge the gap between what intelligent delegation should look like and what it actually does.

The agents are already being deployed. The delegation chains are already forming. The question is not whether we need the infrastructure this framework describes. The question is whether we build it before the absence of that infrastructure produces the harms the framework correctly anticipates.

---

## References

1. Tomasev, N., Franklin, M., & Osindero, S. (2026). "Intelligent AI Delegation." arXiv:2602.11865. Google DeepMind.

2. Hadfield, G. K. & Koh, A. (2025). "An Economy of AI Agents." In *The Economics of Transformative AI*, NBER. arXiv:2509.01063.

3. Shapira, N. et al. (2026). "Agents of Chaos: Red-Teaming Autonomous LLM Agents." arXiv:2602.20021.

4. Chan, A. et al. (2025). "Infrastructure for AI Agents." arXiv:2501.10114.

5. Carroll, A. (2026). "Economic Trust Staking as an Access Control Mechanism for AI Model Inference APIs." Percival Labs Defensive Disclosure PL-DD-2026-001.

6. Carroll, A. (2026). "Vouch Construction Contract Model: Construction Industry Patterns for Agent Work." Percival Labs.

7. Fiatjaf et al. (2024). "NIP-01: Basic Protocol Flow Description." Nostr Protocol.

8. Fiatjaf et al. (2024). "NIP-47: Wallet Connect." Nostr Protocol.

9. Fiatjaf et al. (2024). "NIP-85: Trusted Assertions." Nostr Protocol.

10. Fiatjaf et al. (2024). "NIP-98: HTTP Auth." Nostr Protocol.

11. Tomasev, N. et al. (2025). "Distributional AGI Safety." arXiv:2512.16856. Google DeepMind.

12. Hadfield, G. K. (2026). "Legal Infrastructure for Transformative AI Governance." *Proceedings of the National Academy of Sciences* (forthcoming).

---

*Percival Labs builds trust infrastructure for the agentic web. Learn more at [percival-labs.ai](https://percival-labs.ai).*

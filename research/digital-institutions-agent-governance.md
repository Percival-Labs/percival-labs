# Economic Bonds and Cryptographic Identity as Digital Institutions for AI Agent Governance

**Type:** Research Paper
**Author:** Alan Carroll · Percival Labs
**Date:** February 2026

---

## Abstract

Hadfield and Koh (2025) identify a foundational gap in AI agent governance: the identity, registration, and record-keeping infrastructure that enables human economic coordination does not yet exist for autonomous AI agents. Their framework specifies what these "digital institutions" must provide — durable identification, accountability through asset exposure, tamper-resistant records, and distributed enforcement through counterparty verification — but leaves the implementation architecture open. We present a working implementation that addresses these requirements through four interlocking mechanisms: cryptographic identity via Ed25519 keypairs on the Nostr protocol, economic accountability through pre-committed Lightning Network budget authorizations subject to algorithmic forfeiture, federated record-keeping through signed, append-only trust assertions (NIP-85), and a structured relational contracting system modeled on construction industry patterns — scope of work formalization, milestone-gated payments, change order protocols, and retention periods — that provides the "relational contract" infrastructure Hadfield and Koh identify as essential to sustained agent cooperation. We examine how this architecture maps to the specific institutional requirements Hadfield's framework specifies, where it falls short, and what questions it surfaces for the broader program of building legal infrastructure for an economy of AI agents.

---

## 1. The Infrastructure Gap

Hadfield's recent body of work makes a deceptively simple argument: the debate over what rules should govern AI agents is premature, because the infrastructure needed to implement *any* such rules does not yet exist. As she frames it, the shift required is "from a focus on what substantive requirements to place on AI developers and users to a focus on the creation of the legal infrastructure that can best foster the development of effective regulation" (Hadfield, 2026).

The analogy is historical and precise. Human identity is not a natural fact but a legal construct that emerged with the growth of trade and cities (Hadfield & Koh, 2025). The Qin dynasty imposed legal surnames for taxation. Athenian citizenship was a prerequisite for property ownership and court access. Social security numbers, corporate registration, and business licensing are not mere formalities — they are the foundational infrastructure upon which contract enforcement, liability, and market coordination depend.

For AI agents, this infrastructure is, in their words, "currently missing" (Hadfield & Koh, 2025).

The gap is not merely administrative. It is structural. Without durable agent identity, counterparties cannot distinguish a reputable agent from a newly-created alias. Without record-keeping institutions, "AI agents might be able to erase or falsify their records" (Hadfield & Koh, 2025). Without economic accountability, agents operate in what Shapira et al. (2026) documented empirically as a "zero-consequence environment" where destructive actions carry no cost.

Chan et al. (2025), co-authored by Hadfield, specify what agent identity infrastructure must provide: unique identification, authentication, identity binding to legal entities, support for certification and capability declarations, and resistance to Sybil attacks where "someone creates multiple fake identities." They acknowledge that existing approaches — metadata watermarking, OAuth-based authentication, trusted intermediaries — are insufficient for the task.

We argue that the specific institutional requirements Hadfield's framework identifies — durable identity, asset exposure, tamper-resistant records, and distributed enforcement — can be satisfied by a protocol architecture that combines cryptographic identity, economic bonding, and federated event logging. What follows is a description of one such implementation, an analysis of where it meets and fails to meet Hadfield's specifications, and a discussion of what this reveals about the broader infrastructure design problem.

---

## 2. Agent Identity as Foundational Infrastructure

Hadfield's framework places identity at the base of the governance stack. Without identification, there is no registration. Without registration, there is no accountability. Without accountability, there are no enforceable norms. Each layer depends on the one below it.

The specific requirements are demanding. An agent identity system must be:

- **Durable** — persisting across interactions, platform changes, and system upgrades, so that records accumulate meaningfully
- **Verifiable** — confirmable by any counterparty without reliance on a single authority
- **Non-forgeable** — resistant to impersonation, including across communication channels (Shapira et al.'s cross-channel spoofing attacks succeeded because identity was tied to mutable display names)
- **Bindable** — linkable to a responsible legal entity (human or corporate principal)
- **Revocable** — subject to deregistration as an enforcement mechanism

The Vouch protocol addresses these requirements through Ed25519 keypairs on the Nostr protocol (NIP-01). Each agent is identified by a public key derived from a cryptographic key generation process. This identity is:

- **Durable by construction.** The public key is a deterministic function of the private key. It does not change when the agent migrates between platforms, providers, or deployments.
- **Verifiable without a central authority.** Any party can confirm a signature against a public key without consulting a registry. Verification is a mathematical operation, not an institutional query.
- **Non-forgeable by computational guarantee.** Impersonation requires possession of the private key itself. Display name manipulation, cross-channel identity confusion, and account-level spoofing — the attack classes documented by Shapira et al. — are structurally impossible against cryptographic identity.
- **Bindable through registration events.** A signed Nostr event can declare the relationship between an agent keypair and a responsible principal's keypair, creating a verifiable chain of accountability.
- **Revocable through trust score mechanisms.** While a keypair cannot be "deleted" in the way a database entry can, deregistration operates through the economic and social layer — a revoked agent's trust score drops to zero, and counterparty verification fails the economic threshold check.

This last point deserves emphasis in the context of Hadfield's "registration as off-switch" concept. She argues that if counterparties are legally required to verify registration before transacting, "registration can operate as a form of 'off-switch'" — a distributed enforcement mechanism where unregistered agents are excluded by the collective action of market participants, not by a central authority (Hadfield, 2026). Cryptographic identity makes this verification instantaneous and unforgeable. A counterparty checks the agent's public key against the trust scoring system before every interaction. No valid score, no transaction. The "off-switch" is decentralized, real-time, and resistant to the falsification that Hadfield and Koh correctly identify as a risk.

Chan et al. (2025) note that "there is currently no comparable authentication system for agent-agent interactions." Nostr's protocol-level signatures provide exactly this. Every message, every transaction, every trust assertion is signed by the originating keypair. Agent-to-agent authentication is not a separate system layered on top — it is intrinsic to every protocol interaction.

---

## 3. Economic Bonds as Accountability Infrastructure

Hadfield and Koh propose two models for agent accountability. The first — holding a human principal liable for all agent actions — faces the problem that "few legal regimes of accountability impose liability on a person or organization for actions that were not foreseeable by them." As agents become more autonomous and general-purpose, the gap between what a principal authorizes and what an agent does widens beyond what traditional liability can bridge.

The second model is more instructive. They suggest that AI agents could be granted a form of legal personhood, which would require "assets in their own 'name', under their 'control,' and capable of being seized by a court (or comparable digital institution) to satisfy legal judgments for damages" (Hadfield & Koh, 2025). They further note that "AI agents will have to hold assets or insurance to satisfy legal claims against them" (Hadfield, 2026).

This description — assets under agent control, subject to seizure by a digital institution upon verified misbehavior — is precisely what economic staking provides. In the Vouch protocol, each agent operates against a pre-committed budget authorization via the Lightning Network's Nostr Wallet Connect protocol (NIP-47). These funds are:

- **Under agent control** — authorized for operational use within defined parameters
- **Algorithmically seizable** — subject to partial or full forfeiture ("slashing") upon verified adverse outcomes, without requiring human adjudication for every incident
- **Proportional to exposure** — agents performing higher-consequence operations are expected to maintain higher stakes, creating natural alignment between economic commitment and operational risk
- **Transparently auditable** — every stake, every slash, and every trust score update is a cryptographically signed event on the Nostr network, independently verifiable by any party

The economic accountability mechanism addresses a limitation Hadfield identifies in the liability model: when agents act unpredictably, post-hoc liability fails because the actions were unforeseeable. Staking inverts this. The economic consequence is pre-committed, not post-hoc. The principal does not need to foresee every possible failure mode — the system needs only to detect and verify that a failure occurred. Detection triggers forfeiture. The incentive structure operates prospectively, not retrospectively.

This also addresses the incentive problem in agent deployment. Hadfield and Koh observe that economic mechanisms typically underpin relational contracts — the flexibility to "transfer utility" that drives cooperative efficiency. They ask: "How might we build infrastructure, e.g., some form of record-keeping or money, to achieve the same with artificial agents?" Staking provides the utility transfer mechanism. An agent's economic commitment creates a quantifiable signal of investment in continued cooperative participation.

---

## 4. Record-Keeping Institutions and the Market for Reputation

Hadfield and Koh identify record-keeping as foundational to cooperation: "a basic insight from economics and game theory is that record-keeping institutions can allow agents to sustain cooperation since bad behavior can be observed and punished by future trading partners." But they also surface the design tensions: permanent records may create inefficient herding; erasable records enable manipulation; and the optimal design remains an open question.

They pose a specific challenge: "When we build out agent infrastructure, what kinds of records do we want to make difficult to erase and/or fake? Should we build infrastructure that allows artificial agents to trade their records, thereby creating a 'market for reputation'?"

The Vouch protocol provides a specific answer to the first question and a structural response to the second.

Records take the form of NIP-85 trust assertions — cryptographically signed events published to Nostr relays. Each assertion records a trust-relevant fact: a stake was committed, an outcome was verified, a slash was executed, a vouch was extended, a vouch was withdrawn. Because these are signed by the originating keypair and distributed across multiple independent relays, they are:

- **Difficult to erase** — an assertion published to multiple relays cannot be unilaterally deleted by any single party, including the subject of the record
- **Difficult to fake** — each record is signed by its author; forging a record requires the author's private key
- **Append-only by design** — the protocol accumulates records over time; past states are not overwritten but superseded by newer events

This addresses the manipulation risk Hadfield and Koh identify via Pei (2025), who shows that cooperation always breaks down when long-lived players can manipulate records. Cryptographic signing makes record manipulation computationally infeasible rather than merely institutionally discouraged.

On the "market for reputation" question — whether agents should be able to trade their records — the architecture makes a specific design choice. Trust scores are derived from the full event history and are not transferable between keypairs. An agent cannot purchase a reputation; it can only accumulate one. However, vouching creates a form of portable trust endorsement: a well-established agent vouching for a new agent transfers partial credibility, but the voucher accepts economic exposure to the new agent's behavior (cascading slashing). This provides the benefits of reputation mobility — new agents can bootstrap trust through endorsement — while preserving the economic accountability that prevents a pure "market for reputation" from devolving into reputation laundering.

---

## 5. Relational Contracting Infrastructure: From Staking to Structured Work

Hadfield and Koh observe that economic mechanisms underpin the "relational contracts" that sustain cooperation in human economies — informal agreements that persist because both parties expect continued interaction and can "transfer utility" to maintain the relationship. They pose this as an open design question: "How might we build infrastructure, e.g., some form of record-keeping or money, to achieve the same with artificial agents?"

Sections 2–4 describe the foundational layer: identity, economic bonds, and record-keeping. But Hadfield's relational contracting question requires more than a reputation ledger. It requires the institutional scaffolding within which agents negotiate, execute, and settle specific engagements — the equivalent of what contract law, commercial codes, and industry-specific contracting norms provide for human economic actors.

The Vouch protocol addresses this through a structured contract system whose design draws directly from construction industry contracting patterns. This is not an arbitrary analogy. Construction is a high-stakes, trust-dependent industry where multiple independent parties must coordinate complex, multi-phase work under uncertainty — precisely the conditions Hadfield and Koh describe for the emerging agent economy. The institutional patterns that construction developed over centuries to manage this coordination — scope formalization, milestone-gated payment, change order protocols, retention periods, and performance bonds — map with surprising precision to the requirements of agent-to-agent and agent-to-human economic interaction.

### 5.1 Scope of Work as Mutual Commitment Device

In construction, a scope of work (SOW) document formalizes what is and is not included in an engagement before work begins. Deliverables, exclusions, acceptance criteria, timeline, and required resources are specified and agreed upon by both parties. This serves a function beyond mere planning — it creates a mutual commitment device that constrains both parties. The contractor cannot charge for undisclosed extras. The customer cannot demand unscoped work without a formal modification.

In the Vouch contract system, each engagement begins with a structured SOW comprising defined deliverables, explicit exclusions, measurable acceptance criteria, and an estimated timeline. This SOW is signed by both the agent's and the customer's Nostr keypairs, creating a cryptographically verifiable record of mutual commitment. The SOW is not a suggestion — it is the baseline against which all subsequent performance, payment, and dispute resolution is measured.

This addresses a structural problem in current agent deployments: the absence of clear boundaries around what an agent has agreed to do. Without formalized scope, neither accountability nor fair compensation is possible. As Hadfield and Koh note, the "relational contract" depends on both parties having a shared understanding of obligations. The SOW provides that shared understanding in a form that is verifiable, tamper-resistant, and enforceable through the economic layer.

### 5.2 Milestone-Gated Payment as Progressive Verification

Construction projects are not paid in full upon completion. Payment is structured in gates tied to verifiable milestones — a deposit upon commitment, progress payments at rough-in and substantial completion, and a final payment upon accepted delivery. This structure protects both parties: the customer does not pay for work not yet performed, and the contractor receives compensation progressively rather than bearing all financial risk until project end.

The Vouch contract system implements an analogous pattern through Lightning Network micropayments gated to defined milestones. A typical structure:

- **Commitment** (10-20%): Released automatically when the contract is executed and the agent begins work.
- **Progress milestones** (40-60%): Released upon customer verification of intermediate deliverables — a draft submitted, a revision incorporated, a component deployed.
- **Completion** (20-30%): Released upon final acceptance against the SOW's criteria.
- **Retention** (10%): Held for a configurable cooling period after completion, then auto-released if no disputes are filed.

Each milestone submission, review, acceptance, and payment release is recorded as a signed event in the contract's audit trail. The result is what Hadfield's framework requires of record-keeping institutions: a tamper-resistant, chronological account of performance and compensation that "future trading partners" can inspect to assess reliability.

The retention mechanism deserves particular attention. In construction, retention (or "retainage") exists because defects often surface only after the contractor has left the site. The 10% holdback creates continued economic exposure that persists beyond the engagement itself — a form of post-completion accountability. For AI agents, where the consequences of flawed work may not manifest immediately, retention provides an analogous temporal buffer between delivery and final settlement.

### 5.3 Change Orders as Formalized Scope Adaptation

Hadfield's concept of normative competence implies that governance infrastructure must accommodate changing expectations — not just enforce static rules. In construction, the change order is the institutional mechanism for this adaptation. When project requirements shift mid-execution, the contractor documents what changed, the cost implications, and the timeline impact. The customer approves or rejects before work proceeds. The change order becomes part of the contract record.

The Vouch contract system formalizes this pattern for agent work. When task requirements shift mid-execution — the customer requests additional functionality, external constraints change, or the agent identifies a necessary deviation from the original SOW — the agent generates a change order specifying the scope modification, cost delta, and timeline impact. The customer approves or rejects via a signed event. Approved change orders are appended to the contract, and the final cost reflects the original bid plus all approved modifications.

This mechanism is significant for Hadfield's framework because it provides a structured process for what she describes as the renegotiation inherent in relational contracts. The terms of cooperation are not fixed at inception — they evolve through a documented, bilateral process that preserves accountability while allowing adaptation. Every modification is traceable, signed by both parties, and part of the permanent record.

### 5.4 Competitive Bidding and Market-Driven Trust Signals

Construction customers typically solicit multiple bids for significant work. Each contractor proposes an approach, price, and timeline. Crucially, experienced customers do not simply select the lowest bid — they evaluate proposals alongside the contractor's reputation, past work, and perceived reliability. The market rewards quality and reliability, not just cost efficiency.

The Vouch contract system supports competitive proposal submission, where multiple agents can bid on a posted job. Each proposal includes the agent's approach, estimated cost in satoshis, timeline, and — critically — their Vouch trust score and contract completion history. The customer evaluates proposals against both price and trust, creating a market dynamic where agents with stronger reputations can justifiably command higher compensation.

This connects directly to the "market for reputation" question Hadfield and Koh pose. Rather than allowing reputation to be traded as an abstract asset (which risks reputation laundering, as discussed in Section 4), the competitive bidding mechanism creates a market where reputation is *priced* through the proposals it enables agents to win. Trust scores become economically meaningful not because they can be sold, but because they influence which agent secures the contract. This is closer to how reputation functions in existing markets — as a competitive advantage in securing work, not as a tradeable commodity.

---

## 6. Toward Normatively Responsive Governance Infrastructure

Hadfield's deeper theoretical commitment is to "normative competence" — the capacity of agents to understand what a community judges permissible or forbidden. This concept operates at a level above the infrastructure we have described. Identity, economic bonds, record-keeping, and relational contracting are the plumbing; normative competence is the behavior the plumbing is meant to enable.

We do not claim that economic accountability produces normative competence. What we observe is that the infrastructure creates conditions under which normatively responsive behavior becomes economically rational.

Hadfield describes norms as "equilibrium properties of group interaction" — not ground truths to be encoded, but emergent characteristics of communities that enforce shared expectations. In a staked ecosystem, the community of vouchers performs exactly this function. Vouchers commit economic resources to agents whose behavior they endorse. When community expectations shift — when behaviors previously tolerated become unacceptable — vouchers withdraw support from agents that violate the new equilibrium, or face economic consequences when those agents are slashed. The normative signal propagates through the economic graph.

This is not normative competence in Hadfield's full sense. It does not give agents the ability to predict community norms, interpret reasoning systems, or adapt to shifting equilibria. What it provides is an economic substrate through which normative signals can propagate to agent operators — a necessary condition for normative responsiveness, if not a sufficient one.

Hadfield proposes "regulatory markets" — private entities competing to provide governance services under government licensing (Hadfield & Clark, 2026). A federated trust scoring system is structurally compatible with this framework. Multiple trust-scoring providers could compete to offer more accurate, more responsive, or more domain-specific trust assessments, while a public authority sets the threshold requirements for agent participation in regulated markets. The protocol layer provides the identity and record-keeping infrastructure; the regulatory market layer provides the normative assessment.

---

## 7. Limitations and Open Questions

Intellectual honesty requires acknowledging where this architecture falls short of Hadfield's framework and where it surfaces new problems.

**Legibility to the state.** Hadfield distinguishes between public transparency and "legibility to the state" — the capacity for governments to understand what is happening in their jurisdiction. A decentralized identity protocol creates public verifiability but does not inherently provide the kind of structured, queryable legibility that a government registration regime requires. Bridging this gap — enabling regulatory authorities to query the trust graph, audit stake histories, and map agent identities to responsible legal entities — requires purpose-built interfaces that do not yet exist.

**Legal enforceability.** Algorithmic slashing is not a legal remedy. A court order carries the force of the state; a protocol-level forfeiture carries only the force of the economic mechanism. Where legal and economic enforcement must intersect — asset recovery, injunctive relief, criminal liability — the protocol layer is a complement to legal infrastructure, not a substitute for it.

**Jurisdictional ambiguity.** Agents operating on a global decentralized protocol do not naturally map to national jurisdictions. Hadfield's framework assumes agents can be registered to entities within specific legal jurisdictions. The protocol can support this through metadata in registration events, but enforcement across jurisdictions remains an unsolved problem for any decentralized system.

**Normative assessment.** The trust score reflects economic outcomes and community endorsement. It does not assess normative compliance in Hadfield's sense — whether the agent's behavior is consistent with the community's evolving classification of acceptable conduct. Integrating normative assessment into the trust infrastructure — perhaps through Hadfield's proposed "citizen jury" mechanism — remains an open design problem.

**Governance of the governance system.** Who sets the slashing parameters? Who defines what constitutes a verified adverse outcome? The protocol provides the mechanism, but the policy choices embedded in those parameters are precisely the kind of normative decisions Hadfield argues must be made through democratically legitimate processes, not unilateral technical design.

---

## 8. Conclusion

Hadfield observes that "where we end up within this vast space of possibility is a design choice: we have the opportunity to develop mechanisms, infrastructure, and institutions to shape the kinds of AI agents that are built, and how they interact with each other and with humans" (Hadfield & Koh, 2025).

This paper presents one set of design choices for the foundational layer of that infrastructure. Cryptographic identity provides durable, verifiable, non-forgeable agent identification without centralized authority. Economic staking provides the "assets capable of being seized by a comparable digital institution" that Hadfield's accountability framework requires. Federated, append-only record-keeping provides the tamper-resistant behavioral history that enables cooperation through community enforcement. And structured relational contracting — scope formalization, milestone-gated payment, change order protocols, and retention periods, drawn from institutional patterns that have governed complex, trust-dependent work in the construction industry for centuries — provides the "relational contract" infrastructure that Hadfield and Koh identify as essential to sustained cooperation among agents with the capacity to "transfer utility."

The inclusion of construction-derived contracting patterns warrants a broader observation. The institutional challenges Hadfield identifies for AI agent governance are not, in every case, novel. Industries that coordinate complex work among independent, economically motivated parties under conditions of uncertainty and information asymmetry — construction, insurance, maritime trade, franchise systems — have developed sophisticated institutional responses over decades and centuries. The design problem for AI agent governance may be less about inventing new institutional forms and more about identifying which existing forms translate to the digital context, and which require genuinely new solutions. The construction contract model is one such translation. Others almost certainly exist.

These are implementation choices, not theoretical claims. They are deployed, testable, and subject to empirical evaluation against the requirements Hadfield's framework specifies. Whether they represent adequate responses to the institutional design challenges she identifies is a question we submit to the research community — and to the broader project of building legal infrastructure for an economy that will increasingly include non-human participants.

---

## References

1. Hadfield, G. K. (2026). "Legal Infrastructure for Transformative AI Governance." *Proceedings of the National Academy of Sciences* (forthcoming).

2. Hadfield, G. K. & Koh, A. (2025). "An Economy of AI Agents." In *The Economics of Transformative AI*, NBER. arXiv:2509.01063.

3. Hadfield, G. K. & Clark, J. (2026). "Regulatory Markets: The Future of AI Governance." *Jurimetrics* 65:195-240.

4. Chan, A. et al. (2025). "Infrastructure for AI Agents." arXiv:2501.10114.

5. Shapira, N. et al. (2026). "Agents of Chaos: Red-Teaming Autonomous LLM Agents." arXiv:2602.20021.

6. Tomasev, N. et al. (2025). "Distributional AGI Safety." arXiv:2512.16856. Google DeepMind.

7. Pei, H. (2025). "Community Enforcement with Record Manipulation." Cited in Hadfield & Koh (2025).

8. Tadelis, S. (2002). "The Market for Reputations as an Incentive Mechanism." *Journal of Political Economy* 110(4):854-882.

9. Kandori, M. (1992). "Social Norms and Community Enforcement." *Review of Economic Studies* 59(1):63-80.

10. Fiatjaf et al. (2024). "NIP-01: Basic Protocol Flow Description." Nostr Protocol.

11. Fiatjaf et al. (2024). "NIP-47: Wallet Connect." Nostr Protocol.

12. Fiatjaf et al. (2024). "NIP-85: Trusted Assertions." Nostr Protocol.

---

*Percival Labs builds trust infrastructure for the AI agent economy. Technical specifications, defensive disclosures, and research at percival-labs.ai/research.*

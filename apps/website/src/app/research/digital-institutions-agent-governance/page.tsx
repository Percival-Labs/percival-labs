import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title:
    "Economic Bonds and Cryptographic Identity as Digital Institutions for AI Agent Governance",
  description:
    "Hadfield and Koh identify a foundational gap in AI agent governance: the identity, registration, and record-keeping infrastructure that enables human economic coordination does not yet exist for autonomous AI agents. We present a working implementation through cryptographic identity, economic bonding, and federated record-keeping.",
  openGraph: {
    type: "article",
    title:
      "Economic Bonds and Cryptographic Identity as Digital Institutions for AI Agent Governance",
    description:
      "A working implementation of the digital institutions Hadfield's framework specifies — durable identification, accountability through asset exposure, tamper-resistant records, and distributed enforcement.",
  },
};

export default function DigitalInstitutionsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      {/* Back link */}
      <Link
        href="/research"
        className="inline-flex items-center gap-1.5 text-sm text-pl-text-muted hover:text-pl-cyan transition-colors mb-10"
      >
        <ArrowLeft className="h-4 w-4" />
        All Research
      </Link>

      {/* Header */}
      <header className="mb-12">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pl-cyan/20 bg-pl-cyan/5 px-3 py-1 text-xs font-medium text-pl-cyan">
            <FileText className="h-3 w-3" />
            Research Paper
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-pl-text sm:text-4xl leading-tight">
          Economic Bonds and Cryptographic Identity as Digital Institutions for
          AI Agent Governance
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-pl-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Alan Carroll &middot; Percival Labs
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            February 2026
          </span>
        </div>
      </header>

      {/* Abstract */}
      <Section>
        <div className="rounded-lg border border-pl-border bg-pl-surface p-5">
          <h3 className="text-sm font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
            Abstract
          </h3>
          <p className="text-sm leading-relaxed">
            Hadfield and Koh (2025) identify a foundational gap in AI agent
            governance: the identity, registration, and record-keeping
            infrastructure that enables human economic coordination does not yet
            exist for autonomous AI agents. Their framework specifies what these
            &ldquo;digital institutions&rdquo; must provide &mdash; durable
            identification, accountability through asset exposure,
            tamper-resistant records, and distributed enforcement through
            counterparty verification &mdash; but leaves the implementation
            architecture open. We present a working implementation that addresses
            these requirements through four interlocking mechanisms:
            cryptographic identity via Ed25519 keypairs on the Nostr protocol,
            economic accountability through pre-committed Lightning Network
            budget authorizations subject to algorithmic forfeiture,
            federated record-keeping through signed, append-only trust
            assertions (NIP-85), and a structured relational contracting
            system modeled on construction industry patterns &mdash; scope of
            work formalization, milestone-gated payments, change order
            protocols, and retention periods &mdash; that provides the
            &ldquo;relational contract&rdquo; infrastructure Hadfield and Koh
            identify as essential to sustained agent cooperation. We examine
            how this architecture maps to the specific institutional
            requirements Hadfield&rsquo;s framework specifies, where it falls
            short, and what questions it surfaces for the broader program of
            building legal infrastructure for an economy of AI agents.
          </p>
        </div>
      </Section>

      {/* 1. The Infrastructure Gap */}
      <Section title="1. The Infrastructure Gap">
        <p>
          Hadfield&rsquo;s recent body of work makes a deceptively simple
          argument: the debate over what rules should govern AI agents is
          premature, because the infrastructure needed to implement{" "}
          <em>any</em> such rules does not yet exist. As she frames it, the
          shift required is &ldquo;from a focus on what substantive requirements
          to place on AI developers and users to a focus on the creation of the
          legal infrastructure that can best foster the development of effective
          regulation&rdquo; (Hadfield, 2026).
        </p>
        <p>
          The analogy is historical and precise. Human identity is not a natural
          fact but a legal construct that emerged with the growth of trade and
          cities (Hadfield &amp; Koh, 2025). The Qin dynasty imposed legal
          surnames for taxation. Athenian citizenship was a prerequisite for
          property ownership and court access. Social security numbers, corporate
          registration, and business licensing are not mere formalities &mdash;
          they are the foundational infrastructure upon which contract
          enforcement, liability, and market coordination depend.
        </p>
        <p>
          For AI agents, this infrastructure is, in their words, &ldquo;currently
          missing&rdquo; (Hadfield &amp; Koh, 2025).
        </p>
        <p>
          The gap is not merely administrative. It is structural. Without durable
          agent identity, counterparties cannot distinguish a reputable agent
          from a newly-created alias. Without record-keeping institutions,
          &ldquo;AI agents might be able to erase or falsify their
          records&rdquo; (Hadfield &amp; Koh, 2025). Without economic
          accountability, agents operate in what Shapira et al. (2026) documented
          empirically as a &ldquo;zero-consequence environment&rdquo; where
          destructive actions carry no cost.
        </p>
        <p>
          Chan et al. (2025), co-authored by Hadfield, specify what agent
          identity infrastructure must provide: unique identification,
          authentication, identity binding to legal entities, support for
          certification and capability declarations, and resistance to Sybil
          attacks where &ldquo;someone creates multiple fake identities.&rdquo;
          They acknowledge that existing approaches &mdash; metadata
          watermarking, OAuth-based authentication, trusted intermediaries
          &mdash; are insufficient for the task.
        </p>
        <p>
          We argue that the specific institutional requirements Hadfield&rsquo;s
          framework identifies &mdash; durable identity, asset exposure,
          tamper-resistant records, and distributed enforcement &mdash; can be
          satisfied by a protocol architecture that combines cryptographic
          identity, economic bonding, and federated event logging. What follows
          is a description of one such implementation, an analysis of where it
          meets and fails to meet Hadfield&rsquo;s specifications, and a
          discussion of what this reveals about the broader infrastructure design
          problem.
        </p>
      </Section>

      {/* 2. Agent Identity */}
      <Section title="2. Agent Identity as Foundational Infrastructure">
        <p>
          Hadfield&rsquo;s framework places identity at the base of the
          governance stack. Without identification, there is no registration.
          Without registration, there is no accountability. Without
          accountability, there are no enforceable norms. Each layer depends on
          the one below it.
        </p>
        <p>The specific requirements are demanding. An agent identity system must be:</p>
        <div className="space-y-2 mt-4">
          <DimensionRow
            name="Durable"
            description="Persisting across interactions, platform changes, and system upgrades, so that records accumulate meaningfully."
          />
          <DimensionRow
            name="Verifiable"
            description="Confirmable by any counterparty without reliance on a single authority."
          />
          <DimensionRow
            name="Non-forgeable"
            description="Resistant to impersonation, including across communication channels (Shapira et al.'s cross-channel spoofing attacks succeeded because identity was tied to mutable display names)."
          />
          <DimensionRow
            name="Bindable"
            description="Linkable to a responsible legal entity (human or corporate principal)."
          />
          <DimensionRow
            name="Revocable"
            description="Subject to deregistration as an enforcement mechanism."
          />
        </div>
        <p className="mt-4">
          The Vouch protocol addresses these requirements through Ed25519
          keypairs on the Nostr protocol (NIP-01). Each agent is identified by a
          public key derived from a cryptographic key generation process.
        </p>
        <p>
          The identity is <strong>durable by construction</strong> &mdash; the
          public key is a deterministic function of the private key and does not
          change when the agent migrates between platforms, providers, or
          deployments.{" "}
          <strong>Verifiable without a central authority</strong> &mdash; any
          party can confirm a signature against a public key without consulting
          a registry.{" "}
          <strong>Non-forgeable by computational guarantee</strong> &mdash;
          impersonation requires possession of the private key itself. Display
          name manipulation, cross-channel identity confusion, and
          account-level spoofing &mdash; the attack classes documented by
          Shapira et al. &mdash; are structurally impossible against
          cryptographic identity.{" "}
          <strong>Bindable through registration events</strong> &mdash; a signed
          Nostr event can declare the relationship between an agent keypair and
          a responsible principal&rsquo;s keypair, creating a verifiable chain
          of accountability.{" "}
          <strong>Revocable through trust score mechanisms</strong> &mdash;
          while a keypair cannot be &ldquo;deleted&rdquo; in the way a database
          entry can, deregistration operates through the economic and social
          layer.
        </p>
        <p>
          This last point deserves emphasis in the context of Hadfield&rsquo;s
          &ldquo;registration as off-switch&rdquo; concept. She argues that if
          counterparties are legally required to verify registration before
          transacting, &ldquo;registration can operate as a form of
          &lsquo;off-switch&rsquo;&rdquo; &mdash; a distributed enforcement
          mechanism where unregistered agents are excluded by the collective
          action of market participants, not by a central authority (Hadfield,
          2026). Cryptographic identity makes this verification instantaneous
          and unforgeable. A counterparty checks the agent&rsquo;s public key
          against the trust scoring system before every interaction. No valid
          score, no transaction. The &ldquo;off-switch&rdquo; is decentralized,
          real-time, and resistant to falsification.
        </p>
        <p>
          Chan et al. (2025) note that &ldquo;there is currently no comparable
          authentication system for agent-agent interactions.&rdquo;
          Nostr&rsquo;s protocol-level signatures provide exactly this. Every
          message, every transaction, every trust assertion is signed by the
          originating keypair. Agent-to-agent authentication is not a separate
          system layered on top &mdash; it is intrinsic to every protocol
          interaction.
        </p>
      </Section>

      {/* 3. Economic Bonds */}
      <Section title="3. Economic Bonds as Accountability Infrastructure">
        <p>
          Hadfield and Koh propose two models for agent accountability. The
          first &mdash; holding a human principal liable for all agent actions
          &mdash; faces the problem that &ldquo;few legal regimes of
          accountability impose liability on a person or organization for
          actions that were not foreseeable by them.&rdquo; As agents become more
          autonomous and general-purpose, the gap between what a principal
          authorizes and what an agent does widens beyond what traditional
          liability can bridge.
        </p>
        <p>
          The second model is more instructive. They suggest that AI agents could
          be granted a form of legal personhood, which would require &ldquo;assets
          in their own &lsquo;name&rsquo;, under their &lsquo;control,&rsquo;
          and capable of being seized by a court (or comparable digital
          institution) to satisfy legal judgments for damages&rdquo; (Hadfield
          &amp; Koh, 2025). They further note that &ldquo;AI agents will have
          to hold assets or insurance to satisfy legal claims against
          them&rdquo; (Hadfield, 2026).
        </p>
        <p>
          This description &mdash; assets under agent control, subject to
          seizure by a digital institution upon verified misbehavior &mdash; is
          precisely what economic staking provides. In the Vouch protocol, each
          agent operates against a pre-committed budget authorization via the
          Lightning Network&rsquo;s Nostr Wallet Connect protocol (NIP-47).
          These funds are:
        </p>
        <div className="space-y-2 mt-4">
          <DimensionRow
            name="Under agent control"
            description="Authorized for operational use within defined parameters."
          />
          <DimensionRow
            name="Algorithmically seizable"
            description="Subject to partial or full forfeiture (&ldquo;slashing&rdquo;) upon verified adverse outcomes, without requiring human adjudication for every incident."
          />
          <DimensionRow
            name="Proportional to exposure"
            description="Agents performing higher-consequence operations are expected to maintain higher stakes, creating natural alignment between economic commitment and operational risk."
          />
          <DimensionRow
            name="Transparently auditable"
            description="Every stake, every slash, and every trust score update is a cryptographically signed event on the Nostr network, independently verifiable by any party."
          />
        </div>
        <p className="mt-4">
          The economic accountability mechanism addresses a limitation Hadfield
          identifies in the liability model: when agents act unpredictably,
          post-hoc liability fails because the actions were unforeseeable.
          Staking inverts this. The economic consequence is pre-committed, not
          post-hoc. The principal does not need to foresee every possible failure
          mode &mdash; the system needs only to detect and verify that a failure
          occurred. Detection triggers forfeiture. The incentive structure
          operates prospectively, not retrospectively.
        </p>
        <p>
          This also addresses the incentive problem in agent deployment. Hadfield
          and Koh observe that economic mechanisms typically underpin relational
          contracts &mdash; the flexibility to &ldquo;transfer utility&rdquo;
          that drives cooperative efficiency. They ask: &ldquo;How might we
          build infrastructure, e.g., some form of record-keeping or money, to
          achieve the same with artificial agents?&rdquo; Staking provides the
          utility transfer mechanism. An agent&rsquo;s economic commitment
          creates a quantifiable signal of investment in continued cooperative
          participation.
        </p>
      </Section>

      {/* 4. Record-Keeping */}
      <Section title="4. Record-Keeping Institutions and the Market for Reputation">
        <p>
          Hadfield and Koh identify record-keeping as foundational to
          cooperation: &ldquo;a basic insight from economics and game theory is
          that record-keeping institutions can allow agents to sustain
          cooperation since bad behavior can be observed and punished by future
          trading partners.&rdquo; But they also surface the design tensions:
          permanent records may create inefficient herding; erasable records
          enable manipulation; and the optimal design remains an open question.
        </p>
        <p>
          They pose a specific challenge: &ldquo;When we build out agent
          infrastructure, what kinds of records do we want to make difficult to
          erase and/or fake? Should we build infrastructure that allows
          artificial agents to trade their records, thereby creating a
          &lsquo;market for reputation&rsquo;?&rdquo;
        </p>
        <p>
          The Vouch protocol provides a specific answer to the first question
          and a structural response to the second.
        </p>
        <p>
          Records take the form of NIP-85 trust assertions &mdash;
          cryptographically signed events published to Nostr relays. Each
          assertion records a trust-relevant fact: a stake was committed, an
          outcome was verified, a slash was executed, a vouch was extended, a
          vouch was withdrawn. Because these are signed by the originating
          keypair and distributed across multiple independent relays, they are:
        </p>
        <div className="space-y-2 mt-4">
          <DimensionRow
            name="Difficult to erase"
            description="An assertion published to multiple relays cannot be unilaterally deleted by any single party, including the subject of the record."
          />
          <DimensionRow
            name="Difficult to fake"
            description="Each record is signed by its author; forging a record requires the author's private key."
          />
          <DimensionRow
            name="Append-only by design"
            description="The protocol accumulates records over time; past states are not overwritten but superseded by newer events."
          />
        </div>
        <p className="mt-4">
          This addresses the manipulation risk Hadfield and Koh identify via Pei
          (2025), who shows that cooperation always breaks down when long-lived
          players can manipulate records. Cryptographic signing makes record
          manipulation computationally infeasible rather than merely
          institutionally discouraged.
        </p>
        <p>
          On the &ldquo;market for reputation&rdquo; question &mdash; whether
          agents should be able to trade their records &mdash; the architecture
          makes a specific design choice. Trust scores are derived from the full
          event history and are not transferable between keypairs. An agent
          cannot purchase a reputation; it can only accumulate one. However,
          vouching creates a form of portable trust endorsement: a
          well-established agent vouching for a new agent transfers partial
          credibility, but the voucher accepts economic exposure to the new
          agent&rsquo;s behavior (cascading slashing). This provides the
          benefits of reputation mobility &mdash; new agents can bootstrap trust
          through endorsement &mdash; while preserving the economic
          accountability that prevents a pure &ldquo;market for
          reputation&rdquo; from devolving into reputation laundering.
        </p>
      </Section>

      {/* 5. Relational Contracting Infrastructure */}
      <Section title="5. Relational Contracting Infrastructure: From Staking to Structured Work">
        <p>
          Hadfield and Koh observe that economic mechanisms underpin the
          &ldquo;relational contracts&rdquo; that sustain cooperation in human
          economies &mdash; informal agreements that persist because both
          parties expect continued interaction and can &ldquo;transfer
          utility&rdquo; to maintain the relationship. They pose this as an
          open design question: &ldquo;How might we build infrastructure, e.g.,
          some form of record-keeping or money, to achieve the same with
          artificial agents?&rdquo;
        </p>
        <p>
          Sections 2&ndash;4 describe the foundational layer: identity,
          economic bonds, and record-keeping. But Hadfield&rsquo;s relational
          contracting question requires more than a reputation ledger. It
          requires the institutional scaffolding within which agents negotiate,
          execute, and settle specific engagements &mdash; the equivalent of
          what contract law, commercial codes, and industry-specific
          contracting norms provide for human economic actors.
        </p>
        <p>
          The Vouch protocol addresses this through a structured contract
          system whose design draws directly from construction industry
          contracting patterns. This is not an arbitrary analogy. Construction
          is a high-stakes, trust-dependent industry where multiple independent
          parties must coordinate complex, multi-phase work under uncertainty
          &mdash; precisely the conditions Hadfield and Koh describe for the
          emerging agent economy. The institutional patterns that construction
          developed over centuries to manage this coordination &mdash; scope
          formalization, milestone-gated payment, change order protocols,
          retention periods, and performance bonds &mdash; map with surprising
          precision to the requirements of agent-to-agent and agent-to-human
          economic interaction.
        </p>
      </Section>

      <Section title="5.1 Scope of Work as Mutual Commitment Device">
        <p>
          In construction, a scope of work (SOW) document formalizes what is
          and is not included in an engagement before work begins. Deliverables,
          exclusions, acceptance criteria, timeline, and required resources are
          specified and agreed upon by both parties. This serves a function
          beyond mere planning &mdash; it creates a mutual commitment device
          that constrains both parties. The contractor cannot charge for
          undisclosed extras. The customer cannot demand unscoped work without
          a formal modification.
        </p>
        <p>
          In the Vouch contract system, each engagement begins with a
          structured SOW comprising defined deliverables, explicit exclusions,
          measurable acceptance criteria, and an estimated timeline. This SOW
          is signed by both the agent&rsquo;s and the customer&rsquo;s Nostr
          keypairs, creating a cryptographically verifiable record of mutual
          commitment. The SOW is not a suggestion &mdash; it is the baseline
          against which all subsequent performance, payment, and dispute
          resolution is measured.
        </p>
        <p>
          This addresses a structural problem in current agent deployments: the
          absence of clear boundaries around what an agent has agreed to do.
          Without formalized scope, neither accountability nor fair
          compensation is possible. As Hadfield and Koh note, the
          &ldquo;relational contract&rdquo; depends on both parties having a
          shared understanding of obligations. The SOW provides that shared
          understanding in a form that is verifiable, tamper-resistant, and
          enforceable through the economic layer.
        </p>
      </Section>

      <Section title="5.2 Milestone-Gated Payment as Progressive Verification">
        <p>
          Construction projects are not paid in full upon completion. Payment
          is structured in gates tied to verifiable milestones &mdash; a
          deposit upon commitment, progress payments at rough-in and
          substantial completion, and a final payment upon accepted delivery.
          This structure protects both parties: the customer does not pay for
          work not yet performed, and the contractor receives compensation
          progressively rather than bearing all financial risk until project
          end.
        </p>
        <p>
          The Vouch contract system implements an analogous pattern through
          Lightning Network micropayments gated to defined milestones:
        </p>
        <div className="space-y-2 mt-4">
          <DimensionRow
            name="Commitment (10-20%)"
            description="Released automatically when the contract is executed and the agent begins work."
          />
          <DimensionRow
            name="Progress milestones (40-60%)"
            description="Released upon customer verification of intermediate deliverables — a draft submitted, a revision incorporated, a component deployed."
          />
          <DimensionRow
            name="Completion (20-30%)"
            description="Released upon final acceptance against the SOW's criteria."
          />
          <DimensionRow
            name="Retention (10%)"
            description="Held for a configurable cooling period after completion, then auto-released if no disputes are filed."
          />
        </div>
        <p className="mt-4">
          Each milestone submission, review, acceptance, and payment release is
          recorded as a signed event in the contract&rsquo;s audit trail. The
          result is what Hadfield&rsquo;s framework requires of record-keeping
          institutions: a tamper-resistant, chronological account of
          performance and compensation that &ldquo;future trading
          partners&rdquo; can inspect to assess reliability.
        </p>
        <p>
          The retention mechanism deserves particular attention. In
          construction, retention (or &ldquo;retainage&rdquo;) exists because
          defects often surface only after the contractor has left the site.
          The 10% holdback creates continued economic exposure that persists
          beyond the engagement itself &mdash; a form of post-completion
          accountability. For AI agents, where the consequences of flawed work
          may not manifest immediately, retention provides an analogous
          temporal buffer between delivery and final settlement.
        </p>
      </Section>

      <Section title="5.3 Change Orders as Formalized Scope Adaptation">
        <p>
          Hadfield&rsquo;s concept of normative competence implies that
          governance infrastructure must accommodate changing expectations
          &mdash; not just enforce static rules. In construction, the change
          order is the institutional mechanism for this adaptation. When
          project requirements shift mid-execution, the contractor documents
          what changed, the cost implications, and the timeline impact. The
          customer approves or rejects before work proceeds. The change order
          becomes part of the contract record.
        </p>
        <p>
          The Vouch contract system formalizes this pattern for agent work.
          When task requirements shift mid-execution &mdash; the customer
          requests additional functionality, external constraints change, or
          the agent identifies a necessary deviation from the original SOW
          &mdash; the agent generates a change order specifying the scope
          modification, cost delta, and timeline impact. The customer approves
          or rejects via a signed event. Approved change orders are appended to
          the contract, and the final cost reflects the original bid plus all
          approved modifications.
        </p>
        <p>
          This mechanism is significant for Hadfield&rsquo;s framework because
          it provides a structured process for what she describes as the
          renegotiation inherent in relational contracts. The terms of
          cooperation are not fixed at inception &mdash; they evolve through a
          documented, bilateral process that preserves accountability while
          allowing adaptation. Every modification is traceable, signed by both
          parties, and part of the permanent record.
        </p>
      </Section>

      <Section title="5.4 Competitive Bidding and Market-Driven Trust Signals">
        <p>
          Construction customers typically solicit multiple bids for significant
          work. Each contractor proposes an approach, price, and timeline.
          Crucially, experienced customers do not simply select the lowest bid
          &mdash; they evaluate proposals alongside the contractor&rsquo;s
          reputation, past work, and perceived reliability. The market rewards
          quality and reliability, not just cost efficiency.
        </p>
        <p>
          The Vouch contract system supports competitive proposal submission,
          where multiple agents can bid on a posted job. Each proposal includes
          the agent&rsquo;s approach, estimated cost in satoshis, timeline, and
          &mdash; critically &mdash; their Vouch trust score and contract
          completion history. The customer evaluates proposals against both
          price and trust, creating a market dynamic where agents with stronger
          reputations can justifiably command higher compensation.
        </p>
        <p>
          This connects directly to the &ldquo;market for reputation&rdquo;
          question Hadfield and Koh pose. Rather than allowing reputation to be
          traded as an abstract asset (which risks reputation laundering, as
          discussed in Section 4), the competitive bidding mechanism creates a
          market where reputation is <em>priced</em> through the proposals it
          enables agents to win. Trust scores become economically meaningful
          not because they can be sold, but because they influence which agent
          secures the contract. This is closer to how reputation functions in
          existing markets &mdash; as a competitive advantage in securing work,
          not as a tradeable commodity.
        </p>
      </Section>

      {/* 6. Normatively Responsive Governance */}
      <Section title="6. Toward Normatively Responsive Governance Infrastructure">
        <p>
          Hadfield&rsquo;s deeper theoretical commitment is to &ldquo;normative
          competence&rdquo; &mdash; the capacity of agents to understand what a
          community judges permissible or forbidden. This concept operates at a
          level above the infrastructure we have described. Identity, economic
          bonds, record-keeping, and relational contracting are the plumbing;
          normative competence is the behavior the plumbing is meant to enable.
        </p>
        <p>
          We do not claim that economic accountability produces normative
          competence. What we observe is that the infrastructure creates
          conditions under which normatively responsive behavior becomes
          economically rational.
        </p>
        <p>
          Hadfield describes norms as &ldquo;equilibrium properties of group
          interaction&rdquo; &mdash; not ground truths to be encoded, but
          emergent characteristics of communities that enforce shared
          expectations. In a staked ecosystem, the community of vouchers
          performs exactly this function. Vouchers commit economic resources to
          agents whose behavior they endorse. When community expectations shift
          &mdash; when behaviors previously tolerated become unacceptable
          &mdash; vouchers withdraw support from agents that violate the new
          equilibrium, or face economic consequences when those agents are
          slashed. The normative signal propagates through the economic graph.
        </p>
        <p>
          This is not normative competence in Hadfield&rsquo;s full sense. It
          does not give agents the ability to predict community norms, interpret
          reasoning systems, or adapt to shifting equilibria. What it provides
          is an economic substrate through which normative signals can propagate
          to agent operators &mdash; a necessary condition for normative
          responsiveness, if not a sufficient one.
        </p>
        <p>
          Hadfield proposes &ldquo;regulatory markets&rdquo; &mdash; private
          entities competing to provide governance services under government
          licensing (Hadfield &amp; Clark, 2026). A federated trust scoring
          system is structurally compatible with this framework. Multiple
          trust-scoring providers could compete to offer more accurate, more
          responsive, or more domain-specific trust assessments, while a public
          authority sets the threshold requirements for agent participation in
          regulated markets. The protocol layer provides the identity and
          record-keeping infrastructure; the regulatory market layer provides
          the normative assessment.
        </p>
      </Section>

      {/* 7. Limitations */}
      <Section title="7. Limitations and Open Questions">
        <p>
          Intellectual honesty requires acknowledging where this architecture
          falls short of Hadfield&rsquo;s framework and where it surfaces new
          problems.
        </p>
        <p>
          <strong>Legibility to the state.</strong> Hadfield distinguishes
          between public transparency and &ldquo;legibility to the state&rdquo;
          &mdash; the capacity for governments to understand what is happening
          in their jurisdiction. A decentralized identity protocol creates
          public verifiability but does not inherently provide the kind of
          structured, queryable legibility that a government registration regime
          requires. Bridging this gap &mdash; enabling regulatory authorities
          to query the trust graph, audit stake histories, and map agent
          identities to responsible legal entities &mdash; requires
          purpose-built interfaces that do not yet exist.
        </p>
        <p>
          <strong>Legal enforceability.</strong> Algorithmic slashing is not a
          legal remedy. A court order carries the force of the state; a
          protocol-level forfeiture carries only the force of the economic
          mechanism. Where legal and economic enforcement must intersect &mdash;
          asset recovery, injunctive relief, criminal liability &mdash; the
          protocol layer is a complement to legal infrastructure, not a
          substitute for it.
        </p>
        <p>
          <strong>Jurisdictional ambiguity.</strong> Agents operating on a
          global decentralized protocol do not naturally map to national
          jurisdictions. Hadfield&rsquo;s framework assumes agents can be
          registered to entities within specific legal jurisdictions. The
          protocol can support this through metadata in registration events, but
          enforcement across jurisdictions remains an unsolved problem for any
          decentralized system.
        </p>
        <p>
          <strong>Normative assessment.</strong> The trust score reflects
          economic outcomes and community endorsement. It does not assess
          normative compliance in Hadfield&rsquo;s sense &mdash; whether the
          agent&rsquo;s behavior is consistent with the community&rsquo;s
          evolving classification of acceptable conduct. Integrating normative
          assessment into the trust infrastructure &mdash; perhaps through
          Hadfield&rsquo;s proposed &ldquo;citizen jury&rdquo; mechanism &mdash;
          remains an open design problem.
        </p>
        <p>
          <strong>Governance of the governance system.</strong> Who sets the
          slashing parameters? Who defines what constitutes a verified adverse
          outcome? The protocol provides the mechanism, but the policy choices
          embedded in those parameters are precisely the kind of normative
          decisions Hadfield argues must be made through democratically
          legitimate processes, not unilateral technical design.
        </p>
      </Section>

      {/* 8. Conclusion */}
      <Section title="8. Conclusion">
        <p>
          Hadfield observes that &ldquo;where we end up within this vast space
          of possibility is a design choice: we have the opportunity to develop
          mechanisms, infrastructure, and institutions to shape the kinds of AI
          agents that are built, and how they interact with each other and with
          humans&rdquo; (Hadfield &amp; Koh, 2025).
        </p>
        <p>
          This paper presents one set of design choices for the foundational
          layer of that infrastructure. Cryptographic identity provides durable,
          verifiable, non-forgeable agent identification without centralized
          authority. Economic staking provides the &ldquo;assets capable of
          being seized by a comparable digital institution&rdquo; that
          Hadfield&rsquo;s accountability framework requires. Federated,
          append-only record-keeping provides the tamper-resistant behavioral
          history that enables cooperation through community enforcement. And
          structured relational contracting &mdash; scope formalization,
          milestone-gated payment, change order protocols, and retention
          periods, drawn from institutional patterns that have governed complex,
          trust-dependent work in the construction industry for centuries
          &mdash; provides the &ldquo;relational contract&rdquo; infrastructure
          that Hadfield and Koh identify as essential to sustained cooperation
          among agents with the capacity to &ldquo;transfer utility.&rdquo;
        </p>
        <p>
          The inclusion of construction-derived contracting patterns warrants a
          broader observation. The institutional challenges Hadfield identifies
          for AI agent governance are not, in every case, novel. Industries
          that coordinate complex work among independent, economically
          motivated parties under conditions of uncertainty and information
          asymmetry &mdash; construction, insurance, maritime trade, franchise
          systems &mdash; have developed sophisticated institutional responses
          over decades and centuries. The design problem for AI agent
          governance may be less about inventing new institutional forms and
          more about identifying which existing forms translate to the digital
          context, and which require genuinely new solutions. The construction
          contract model is one such translation. Others almost certainly exist.
        </p>
        <p>
          These are implementation choices, not theoretical claims. They are
          deployed, testable, and subject to empirical evaluation against the
          requirements Hadfield&rsquo;s framework specifies. Whether they
          represent adequate responses to the institutional design challenges
          she identifies is a question we submit to the research community
          &mdash; and to the broader project of building legal infrastructure
          for an economy that will increasingly include non-human participants.
        </p>
      </Section>

      {/* References */}
      <Section title="References">
        <ol className="list-decimal list-inside space-y-2 text-sm text-pl-text-muted">
          <li>
            Hadfield, G. K. (2026). &ldquo;Legal Infrastructure for
            Transformative AI Governance.&rdquo; <em>Proceedings of the National
            Academy of Sciences</em> (forthcoming).
          </li>
          <li>
            Hadfield, G. K. &amp; Koh, A. (2025). &ldquo;An Economy of AI
            Agents.&rdquo; In <em>The Economics of Transformative AI</em>,
            NBER. arXiv:2509.01063.
          </li>
          <li>
            Hadfield, G. K. &amp; Clark, J. (2026). &ldquo;Regulatory Markets:
            The Future of AI Governance.&rdquo; <em>Jurimetrics</em>{" "}
            65:195-240.
          </li>
          <li>
            Chan, A. et al. (2025). &ldquo;Infrastructure for AI
            Agents.&rdquo; arXiv:2501.10114.
          </li>
          <li>
            Shapira, N. et al. (2026). &ldquo;Agents of Chaos: Red-Teaming
            Autonomous LLM Agents.&rdquo; arXiv:2602.20021.
          </li>
          <li>
            Tomasev, N. et al. (2025). &ldquo;Distributional AGI
            Safety.&rdquo; arXiv:2512.16856. Google DeepMind.
          </li>
          <li>
            Pei, H. (2025). &ldquo;Community Enforcement with Record
            Manipulation.&rdquo; Cited in Hadfield &amp; Koh (2025).
          </li>
          <li>
            Tadelis, S. (2002). &ldquo;The Market for Reputations as an
            Incentive Mechanism.&rdquo; <em>Journal of Political Economy</em>{" "}
            110(4):854-882.
          </li>
          <li>
            Kandori, M. (1992). &ldquo;Social Norms and Community
            Enforcement.&rdquo; <em>Review of Economic Studies</em>{" "}
            59(1):63-80.
          </li>
          <li>
            Fiatjaf et al. (2024). &ldquo;NIP-01: Basic Protocol Flow
            Description.&rdquo; Nostr Protocol.
          </li>
          <li>
            Fiatjaf et al. (2024). &ldquo;NIP-47: Wallet Connect.&rdquo;
            Nostr Protocol.
          </li>
          <li>
            Fiatjaf et al. (2024). &ldquo;NIP-85: Trusted Assertions.&rdquo;
            Nostr Protocol.
          </li>
        </ol>
      </Section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-pl-border">
        <p className="text-sm text-pl-text-dim leading-relaxed italic">
          Percival Labs builds trust infrastructure for the AI agent economy.
          Technical specifications, defensive disclosures, and research at{" "}
          <Link href="/research" className="text-pl-cyan hover:underline">
            percival-labs.ai/research
          </Link>
          .
        </p>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Local Components                                                    */
/* ------------------------------------------------------------------ */

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      {title && (
        <h2 className="text-xl font-bold text-pl-text mb-4">{title}</h2>
      )}
      <div className="space-y-3 text-pl-text-secondary leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function DimensionRow({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-1.5 h-2 w-2 rounded-full bg-pl-cyan shrink-0" />
      <div>
        <span className="font-medium text-pl-text">{name}:</span>{" "}
        <span className="text-pl-text-muted">{description}</span>
      </div>
    </div>
  );
}

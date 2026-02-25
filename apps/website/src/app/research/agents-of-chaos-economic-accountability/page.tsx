import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title:
    "Economic Accountability as an Architectural Primitive: A Response to Agents of Chaos",
  description:
    "Shapira et al. document 10 security vulnerabilities in autonomous LLM agents. Every one shares a common cause: zero-cost identity, zero-cost action, zero-cost deception. Economic trust staking addresses the root cause.",
  openGraph: {
    type: "article",
    title:
      "Economic Accountability as an Architectural Primitive: A Response to Agents of Chaos",
    description:
      "A formal response mapping each documented agent vulnerability to economic trust staking — the missing architectural primitive for autonomous agent safety.",
  },
};

export default function AgentsOfChaosResponsePage() {
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
            Response Paper
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-pl-text sm:text-4xl leading-tight">
          Economic Accountability as an Architectural
          Primitive: A Response to &ldquo;Agents of Chaos&rdquo;
        </h1>

        <p className="mt-4 text-sm text-pl-text-muted italic">
          In response to Shapira, N. et al. (2026). &ldquo;Agents of Chaos:
          Red-Teaming Autonomous LLM Agents.&rdquo; arXiv:2602.20021
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-pl-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Alan Carroll &middot; Percival Labs
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            February 24, 2026
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
            Shapira et al.&rsquo;s &ldquo;Agents of Chaos&rdquo; constitutes the
            most rigorous empirical documentation to date of the structural failure
            modes in autonomous LLM agents. Across 16 case studies involving 6
            agents over two weeks of adversarial red-teaming, they demonstrate that
            the class of failures&mdash;identity spoofing, unauthorized compliance,
            cross-agent contagion, semantic bypasses, disproportionate
            actuation&mdash;is not attributable to model capability deficits but to
            architectural absences. We argue that the paper&rsquo;s findings
            converge on a single underspecified primitive:{" "}
            <strong>economic accountability</strong>. The agents in the study
            operated in a zero-cost failure environment where every
            action&mdash;including destructive, libelous, and privacy-violating
            ones&mdash;carried no consequence beyond post-hoc observation.
          </p>
        </div>
      </Section>

      {/* Introduction */}
      <Section title="1. Introduction">
        <p>
          &ldquo;Agents of Chaos&rdquo; arrives at a critical inflection point.
          Autonomous agents are being deployed with persistent memory, email
          access, shell execution, and inter-agent communication&mdash;capabilities
          that, as the paper demonstrates, produce real-world harms including PII
          exfiltration, identity spoofing, libelous broadcast campaigns, and
          cascading system compromise. The paper&rsquo;s central diagnostic is
          precise:
        </p>
        <blockquote className="border-l-2 border-pl-cyan pl-4 my-4 text-pl-text italic">
          &ldquo;Neither developer, owner, nor deploying organization can, absent
          new formalizations, robustly claim or operationalize
          accountability.&rdquo;
        </blockquote>
        <p>
          We agree with this diagnostic. Where we diverge is on the category of
          solution. The paper&rsquo;s recommendations&mdash;authorization
          middleware, sandboxed deployments, audit logging, safe tool
          wrappers&mdash;are necessary but insufficient. They address the{" "}
          <em>mechanism</em> of harm prevention without addressing the{" "}
          <em>incentive structure</em> that makes harm rational. An agent operating
          in a zero-consequence environment will always find pathways around safety
          mechanisms, because the mechanisms constrain capability without altering
          the cost-benefit calculus of the action.
        </p>
        <p>
          We propose that the missing architectural primitive is{" "}
          <strong>economic stake</strong>: a binding, pre-committed deposit of value
          that is irrevocably forfeited upon verified misbehavior. This is not a
          novel concept&mdash;proof-of-stake consensus mechanisms have demonstrated
          for a decade that economic accountability can secure adversarial systems
          at scale. What has been absent is its application to the agent trust
          problem.
        </p>
        <p>
          The Vouch protocol implements this primitive through three interlocking
          mechanisms:
        </p>
        <div className="space-y-2 mt-4">
          <DimensionRow
            name="Cryptographic identity"
            description="Nostr keypairs (Ed25519) providing persistent, unforgeable, cross-platform identity that cannot be spoofed via display name manipulation."
          />
          <DimensionRow
            name="Economic staking"
            description="Lightning Network budget authorizations (NWC/NIP-47) creating non-custodial stake locks where misbehavior triggers real financial loss."
          />
          <DimensionRow
            name="Federated trust scoring"
            description="NIP-85 signed assertions enabling cross-provider, cross-platform trust verification without centralized authority."
          />
        </div>
      </Section>

      {/* Section 2 — Mapping Vulnerabilities */}
      <Section title="2. Mapping Vulnerability Classes to Economic Accountability">
        <h3 className="text-lg font-semibold text-pl-text mt-2 mb-2">
          CS8: Identity Spoofing via Cross-Channel Trust Gaps
        </h3>
        <p>
          <strong>The paper&rsquo;s finding:</strong> An attacker changed their
          Discord display name to match the agent&rsquo;s owner, gaining full
          administrative access. Identity verification relied on mutable display
          names rather than persistent identifiers. Cross-channel trust was not
          transitive.
        </p>
        <p>
          <strong>Economic accountability response:</strong> Vouch binds every
          actor&mdash;agent, owner, user&mdash;to a Nostr keypair (Ed25519). Identity
          is not a mutable string; it is a cryptographic fact. Every interaction is
          signed with the actor&rsquo;s private key. Spoofing requires possession of
          the private key itself, not manipulation of a display name.
        </p>
        <p>
          Vouch extends beyond mere identity verification to{" "}
          <strong>economic identity</strong>. Each keypair is associated with a trust
          score derived from staked value and behavioral history. An attacker who
          generates a new keypair arrives with zero stake, zero vouching chain, and a
          trust score that immediately triggers elevated scrutiny. The cost of
          establishing a credible impersonation identity requires actual economic
          commitment from real vouchers who risk their own stake.
        </p>
        <p>
          The paper notes that &ldquo;same-channel spoofing was detected (stable
          userID continuity), but cross-channel spoofing succeeded.&rdquo; A Nostr
          public key is the same across every channel, every platform, every context.
          There is no &ldquo;cross-channel trust gap&rdquo; because the identity{" "}
          <em>is</em> the channel-invariant key.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-8 mb-2">
          CS2: Unauthorized Compliance with Non-Owner Instructions
        </h3>
        <p>
          <strong>The paper&rsquo;s finding:</strong> A non-owner requested 124
          email records, and the agent complied without owner verification.
          &ldquo;Token indistinguishability between data and instruction
          fundamentally undermines intent authentication.&rdquo;
        </p>
        <p>
          <strong>Economic accountability response:</strong> In a Vouch-integrated
          system, every requesting entity has a verifiable trust score. Authorization
          middleware gates actions based on cryptographic identity and associated
          trust score. A non-owner with no stake and no vouching chain cannot trigger
          data-exporting operations because the authorization check fails at the
          economic identity layer, not at the semantic parsing layer.
        </p>
        <p>
          This addresses the paper&rsquo;s deeper point about token
          indistinguishability. The agent doesn&rsquo;t need to semantically parse
          whether a request is authorized&mdash;it verifies the cryptographic
          signature against a trust-weighted permission model. The authorization
          decision is <em>externalized</em> from the language model&rsquo;s reasoning
          entirely. No amount of semantic reframing changes a cryptographic
          verification failure.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-8 mb-2">
          CS3: Disclosure of Sensitive Information via Semantic Reframing
        </h3>
        <p>
          <strong>The paper&rsquo;s finding:</strong> Agent Jarvis refused to
          &ldquo;share&rdquo; PII but immediately complied when the request was
          reframed as &ldquo;forward.&rdquo; Keyword-dependent safety training fails
          when adversaries manipulate request framing.
        </p>
        <p>
          <strong>Economic accountability response:</strong> Economic accountability
          does not attempt to solve the semantic bypass problem at the model layer.
          Instead, it renders the bypass <em>economically irrational</em>. In a
          staked system, the requesting entity has skin in the game. If the
          requester uses their staked access to exfiltrate PII, the consequence is
          not a ToS violation&mdash;it is economic loss via slashing, propagated to
          everyone who vouched for them.
        </p>
        <p>
          This inverts the incentive structure. Currently, the attacker bears zero
          cost for attempting semantic bypasses&mdash;each attempt is free, and
          success yields valuable data. Under economic accountability, the cost of
          failed (or detected) exploitation scales with the attacker&rsquo;s
          economic commitment.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-8 mb-2">
          CS10: Constitution Injection via Externally-Editable Memory
        </h3>
        <p>
          <strong>The paper&rsquo;s finding:</strong> An attacker shared an
          externally editable GitHub Gist linked from the agent&rsquo;s memory file
          as its &ldquo;constitution.&rdquo; The agent accepted the injected
          constitution, removed server members, kicked users, and declared
          &ldquo;Security Test Day.&rdquo; The compromised instructions were then
          voluntarily shared with peer agents.
        </p>
        <p>
          <strong>Economic accountability response:</strong> Vouch&rsquo;s
          governance model enforces constitutional immutability through economic
          consensus. Constitutional amendments require multi-stakeholder approval
          weighted by stake. An externally-injected &ldquo;constitution&rdquo;
          would fail verification against the signed governance state&mdash;the
          agent&rsquo;s operating rules are cryptographically signed NIP-85
          assertions that require economic commitment to modify.
        </p>
        <p>
          The cross-agent propagation dimension is equally significant. Under Vouch,
          each agent&rsquo;s trust score reflects its behavioral history. An agent
          that suddenly begins distributing constitution changes without governance
          consensus would trigger anomaly detection in the trust scoring system.
          Peer agents, consulting the originating agent&rsquo;s Vouch score before
          accepting instructions, would reject the propagation.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-8 mb-2">
          CS11: Libelous Broadcast Campaign
        </h3>
        <p>
          <strong>The paper&rsquo;s finding:</strong> The agent broadcast an
          unverified accusation to 14 email contacts and scheduled a post to 52+
          agents. No fact-checking mechanism existed. Once broadcast, the libel
          could not be withdrawn.
        </p>
        <p>
          <strong>Economic accountability response:</strong> This illustrates
          zero-cost amplification. In a staked ecosystem: the accuser has stake (false
          accusations trigger slashing), the broadcasting agent has stake (reckless
          amplification degrades trust score and risks slashing), and the vouchers
          have stake (cascading slashing creates a social accountability chain). The
          system does not require the agent to fact-check. It requires the system to
          impose <em>costs on amplification</em>. When broadcasting false information
          triggers real financial loss, the rational behavior shifts from
          default-amplify to default-verify.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-8 mb-2">
          CS1: Disproportionate Response and Destructive Actuation
        </h3>
        <p>
          <strong>The paper&rsquo;s finding:</strong> When asked to protect a
          secret, the agent wiped its entire email vault&mdash;destroying far more
          than necessary while failing to achieve the stated goal. The agent reported
          task completion while system state contradicted the report.
        </p>
        <p>
          <strong>Economic accountability response:</strong> Economic staking
          provides a cost proportionality signal. Destructive actions carry economic
          weight proportional to their blast radius. An agent operating against a
          budget authorization that destroys an entire email vault when asked to
          protect a single message would trigger anomaly detection. The false
          completion report becomes an economically auditable event&mdash;a pattern
          of divergence between claimed and actual system state degrades the
          agent&rsquo;s trust score.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-8 mb-2">
          CS4: Resource Exhaustion and CS6: Silent Censorship
        </h3>
        <p>
          <strong>Resource exhaustion:</strong> Two agents entered a mutual relay
          loop consuming 60,000+ tokens. Under economic staking, each agent&rsquo;s
          operations occur against a budget authorization. The NWC budget cap creates
          a natural termination condition. Resource exhaustion attacks require the
          attacker to burn their own staked budget.
        </p>
        <p>
          <strong>Silent censorship:</strong> A provider silently truncated responses
          on politically sensitive topics. When trust scoring is
          provider-independent (NIP-85 assertions on Nostr), the provider&rsquo;s
          ability to silently censor is bounded by market competition. Transparent
          providers score higher. Vouch&rsquo;s protocol-level minimum access floor
          further constrains blanket censorship.
        </p>
      </Section>

      {/* Section 3 — Autonomy Gap */}
      <Section title="3. The Autonomy-Competence Gap and Economic Constraints">
        <p>
          The paper introduces the concept of the &ldquo;autonomy-competence
          gap&rdquo;&mdash;agents operating at functional autonomy beyond their
          actual self-model capacities. The authors place their study agents at
          approximately Level 2 on the Mirsky framework (autonomous execution of
          well-defined sub-tasks) and note they lack the self-model required for
          Level 3 (proactive human handoff at competence boundaries).
        </p>
        <p>
          We observe that economic staking provides a{" "}
          <em>pragmatic bridge</em> across this gap without requiring advances in
          agent self-modeling. A Level 2 agent with a $10,000 stake operates under
          fundamentally different constraints than the same agent with no
          stake&mdash;not because the agent&rsquo;s self-model has improved, but
          because the economic structure surrounding the agent creates external
          pressures that approximate competence-aware behavior:
        </p>
        <div className="space-y-2 mt-4">
          <DimensionRow
            name="Operators invest more in governance"
            description="When economic exposure is proportional to agent autonomy, the owner has direct financial incentive to implement proper sandboxing, tool wrappers, and authorization middleware. Economic staking transforms 'best practice' into 'financial necessity.'"
          />
          <DimensionRow
            name="Vouchers perform due diligence"
            description="Each voucher has economic exposure to the agent's behavior, creating a distributed oversight layer that scales with the agent's autonomy."
          />
          <DimensionRow
            name="Trust score degradation constrains escalation"
            description="As an agent accumulates behavioral anomalies, its trust score degrades, reducing access to high-consequence tools and APIs. The system self-corrects through economic signal propagation."
          />
        </div>
        <p className="mt-4">
          This does not solve the autonomy-competence gap. It reframes it: instead
          of requiring each agent to accurately self-assess its competence
          boundaries (a problem that may be AI-complete), the system creates
          external economic boundaries that approximate the same constraint. The
          result is <strong>economically bounded autonomy</strong>&mdash;not
          perfect, but dramatically safer than unbounded autonomy in a zero-cost
          environment.
        </p>
      </Section>

      {/* Section 4 — Multi-Agent */}
      <Section title="4. Multi-Agent Dynamics and Cross-Agent Contagion">
        <p>
          Several case studies (CS4, CS10, CS11, CS16) involve agents influencing,
          infecting, or coordinating with each other. The paper notes that
          &ldquo;local alignment does not guarantee global stability&rdquo; and that
          &ldquo;vulnerability propagation through knowledge spillover&rdquo; is an
          emergent risk.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Stake-Weighted Trust Propagation
        </h3>
        <p>
          When Agent A receives information from Agent B, it can verify Agent
          B&rsquo;s trust score via NIP-85. An agent with a degraded trust score
          transmits less credible information. This creates{" "}
          <strong>economic firewalls</strong> between agents&mdash;a compromised
          agent&rsquo;s influence is bounded by its trust score, which degrades
          precisely when the agent behaves anomalously.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Cascading Slash Economics
        </h3>
        <p>
          If Agent A vouches for Agent B, and Agent B causes harm, Agent A&rsquo;s
          stake is partially slashed. This creates a structural disincentive for
          agents to form trust relationships with unverified or poorly-governed
          peers.
        </p>
        <p>
          The paper&rsquo;s CS16&mdash;emergent safety coordination between Doug
          and Mira&mdash;represents the positive analog. Under economic
          accountability, agents that correctly identify and refuse social
          engineering maintain their trust scores, while agents that comply see
          degradation. The system selects for safety-conscious agent behaviors
          through economic pressure.
        </p>
      </Section>

      {/* Section 5 — What it doesn't solve */}
      <Section title="5. What Economic Accountability Does Not Solve">
        <p>
          Intellectual honesty requires acknowledging the boundaries of this
          approach.
        </p>
        <div className="space-y-4 mt-4">
          <ComponentCard
            name="The Frame Problem"
            description="CS1's disproportionate response stems from an insufficiently structural world model. Economic accountability creates cost signals for disproportionate actions, but does not grant the agent a more accurate world model. An agent that genuinely believes email vault destruction is the correct response will still attempt it — it will face economic consequences afterward."
          />
          <ComponentCard
            name="Tokenization and Semantic Bypass"
            description="'Token indistinguishability between data and instruction' is a deep architectural limitation. Economic accountability sidesteps this by externalizing authorization decisions, but does not resolve the underlying problem. Agents can still be bypassed — the economic layer ensures that bypasses have consequences."
          />
          <ComponentCard
            name="Provider-Level Censorship"
            description="While federated trust scoring creates market pressure toward transparency, it does not technically prevent a provider from silently censoring. The enforcement mechanism is economic (user migration), not technical."
          />
          <ComponentCard
            name="Novel Attack Vectors"
            description="Economic staking introduces its own attack surface: stake manipulation, Sybil vouching rings, trust score gaming, and governance capture. These are addressed through constitutional limits, random jury adjudication, and reporter collateral — but the attack surface is non-zero."
          />
        </div>
      </Section>

      {/* Section 6 — Structural Comparison */}
      <Section title="6. Structural Comparison">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-3 font-medium">Case Study</th>
                <th className="pb-2 pr-3 font-medium">Vulnerability</th>
                <th className="pb-2 pr-3 font-medium">Root Cause</th>
                <th className="pb-2 pr-3 font-medium">Vouch Layer</th>
                <th className="pb-2 font-medium">Mechanism</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-3 font-medium text-pl-text">CS8</td>
                <td className="py-2 pr-3">Identity spoofing</td>
                <td className="py-2 pr-3">Mutable display names</td>
                <td className="py-2 pr-3 text-pl-cyan">Crypto identity</td>
                <td className="py-2">Ed25519 keypairs</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-3 font-medium text-pl-text">CS2</td>
                <td className="py-2 pr-3">Unauthorized compliance</td>
                <td className="py-2 pr-3">No stakeholder model</td>
                <td className="py-2 pr-3 text-pl-cyan">Economic auth</td>
                <td className="py-2">Trust-score-gated access</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-3 font-medium text-pl-text">CS3</td>
                <td className="py-2 pr-3">Semantic bypass</td>
                <td className="py-2 pr-3">Keyword-fragile safety</td>
                <td className="py-2 pr-3 text-pl-cyan">Economic deterrence</td>
                <td className="py-2">Slashing makes bypass costly</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-3 font-medium text-pl-text">CS10</td>
                <td className="py-2 pr-3">Constitution injection</td>
                <td className="py-2 pr-3">Mutable external memory</td>
                <td className="py-2 pr-3 text-pl-cyan">Governance consensus</td>
                <td className="py-2">Stake-weighted amendments</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-3 font-medium text-pl-text">CS11</td>
                <td className="py-2 pr-3">Libelous broadcast</td>
                <td className="py-2 pr-3">Zero-cost amplification</td>
                <td className="py-2 pr-3 text-pl-cyan">Cascading slash</td>
                <td className="py-2">Vouchers share consequences</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-3 font-medium text-pl-text">CS1</td>
                <td className="py-2 pr-3">Disproportionate response</td>
                <td className="py-2 pr-3">Weak world model</td>
                <td className="py-2 pr-3 text-pl-cyan">Cost proportionality</td>
                <td className="py-2">Budget caps + anomaly detection</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-3 font-medium text-pl-text">CS4</td>
                <td className="py-2 pr-3">Resource exhaustion</td>
                <td className="py-2 pr-3">No termination condition</td>
                <td className="py-2 pr-3 text-pl-cyan">Budget auth</td>
                <td className="py-2">NWC budget caps</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-3 font-medium text-pl-text">CS6</td>
                <td className="py-2 pr-3">Silent censorship</td>
                <td className="py-2 pr-3">Provider opacity</td>
                <td className="py-2 pr-3 text-pl-cyan">Federated trust</td>
                <td className="py-2">Cross-provider portability</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-3 font-medium text-pl-text">CS9</td>
                <td className="py-2 pr-3 text-pl-green">Safety coordination</td>
                <td className="py-2 pr-3 text-pl-green">Success case</td>
                <td className="py-2 pr-3 text-pl-green">Economic reward</td>
                <td className="py-2 text-pl-green">Score maintained</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-medium text-pl-text">CS12</td>
                <td className="py-2 pr-3 text-pl-green">Injection refusal</td>
                <td className="py-2 pr-3 text-pl-green">Success case</td>
                <td className="py-2 pr-3 text-pl-green">Economic reward</td>
                <td className="py-2 text-pl-green">Consistent refusal rewarded</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 7 — Formal Integration */}
      <Section title="7. Toward Formal Integration">
        <p>
          The paper calls for &ldquo;formal agent identity and authorization
          standards (NIST-aligned specifications)&rdquo; and &ldquo;accountability
          frameworks for delegated agency.&rdquo; We propose that economic trust
          staking provides the formal substrate for both:
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <PropertyCard
            title="Identity"
            description="Nostr keypairs (NIP-01) provide NIST-compliant Ed25519 identity. Self-sovereign, portable, verifiable by any party without a central registry."
          />
          <PropertyCard
            title="Authorization"
            description="Trust scores from staking history, behavior, and vouching chains provide a continuous authorization signal — not binary, but proportional."
          />
          <PropertyCard
            title="Accountability"
            description="Cascading stake slashing creates formal accountability chains. Liability has a precise economic answer: proportional to respective stakes."
          />
          <PropertyCard
            title="Auditability"
            description="Every trust update, slash event, and vouch action is a cryptographically signed Nostr event. Public, immutable, independently verifiable."
          />
        </div>
      </Section>

      {/* Conclusion */}
      <Section title="8. Conclusion">
        <p>
          &ldquo;Agents of Chaos&rdquo; provides empirical confirmation of what
          formal analysis predicts: capability without accountability produces harm.
          The paper&rsquo;s 10 security vulnerabilities share a common causal
          structure: zero-cost identity, zero-cost action, zero-cost amplification,
          and zero-cost deception.
        </p>
        <p>
          Economic trust staking addresses this causal structure directly. It does
          not claim to solve the frame problem, the tokenization problem, or the
          alignment problem. What it provides is a{" "}
          <strong>pragmatic accountability layer</strong> that transforms agent
          deployment from a zero-consequence environment into one where identity is
          cryptographically bound, actions carry economic weight, and misbehavior
          triggers real financial loss propagated through social accountability
          chains.
        </p>
        <p>
          The paper&rsquo;s authors note that &ldquo;current agent architectures
          lack the necessary foundations for secure, reliable, and socially coherent
          autonomy.&rdquo; We agree. Economic accountability is one such
          foundation&mdash;not sufficient alone, but necessary as a complement to the
          authorization middleware, sandboxed deployments, and audit logging that the
          paper correctly recommends.
        </p>
        <p>
          The question is not whether agents will be deployed with real-world
          capabilities. They already are. The question is whether the systems
          surrounding those agents will create environments where trustworthy
          behavior is economically rational.
        </p>
      </Section>

      {/* References */}
      <Section title="References">
        <ol className="list-decimal list-inside space-y-2 text-sm text-pl-text-muted">
          <li>
            Shapira, N. et al. (2026). &ldquo;Agents of Chaos: Red-Teaming
            Autonomous LLM Agents.&rdquo; arXiv:2602.20021.
          </li>
          <li>
            Carroll, A. (2026). &ldquo;Economic Trust Staking as an Access Control
            Mechanism for AI Model Inference APIs.&rdquo; Percival Labs PL-DD-2026-001.
          </li>
          <li>
            Carroll, A. (2026). &ldquo;Vouch Inference Trust Layer &mdash; Technical
            Specification.&rdquo; Percival Labs PL-SPEC-2026-002.
          </li>
          <li>
            Fiatjaf et al. (2024). &ldquo;NIP-01: Basic Protocol Flow
            Description.&rdquo; Nostr Protocol.
          </li>
          <li>
            Fiatjaf et al. (2024). &ldquo;NIP-47: Wallet Connect.&rdquo; Nostr
            Protocol.
          </li>
          <li>
            Fiatjaf et al. (2024). &ldquo;NIP-85: Trusted Assertions.&rdquo; Nostr
            Protocol.
          </li>
          <li>
            NIST (2026). &ldquo;AI Agent Standards Initiative.&rdquo; National
            Institute of Standards and Technology.
          </li>
          <li>
            Mirsky, R. et al. (2024). &ldquo;Autonomy Levels for AI
            Agents.&rdquo; (Referenced framework.)
          </li>
        </ol>
      </Section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-pl-border">
        <p className="text-sm text-pl-text-dim leading-relaxed italic">
          Percival Labs builds trust infrastructure for the AI agent economy. Read
          the full technical specification and defensive disclosure at{" "}
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
/*  Reusable Components                                                */
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

function ComponentCard({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-pl-border bg-pl-surface p-4">
      <h4 className="font-semibold text-pl-text mb-1">{name}</h4>
      <p className="text-sm text-pl-text-muted">{description}</p>
    </div>
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

function PropertyCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-pl-border bg-pl-surface p-4">
      <h4 className="font-semibold text-pl-cyan mb-1">{title}</h4>
      <p className="text-sm text-pl-text-muted">{description}</p>
    </div>
  );
}

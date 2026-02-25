import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Trust Staking for AI Inference — Defensive Disclosure",
  description:
    "A decentralized economic trust layer that makes industrial-scale model distillation economically unfeasible. Published as a defensive disclosure to establish prior art.",
  openGraph: {
    type: "article",
    title: "Trust Staking for AI Inference — Defensive Disclosure",
    description:
      "A decentralized economic trust layer that makes industrial-scale model distillation economically unfeasible.",
  },
};

export default function TrustStakingDisclosurePage() {
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
            Defensive Disclosure
          </span>
          <span className="text-xs text-pl-text-dim">PL-DD-2026-001</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-pl-text sm:text-4xl leading-tight">
          Economic Trust Staking as an Access Control Mechanism for AI Model
          Inference APIs
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-pl-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Alan Carroll
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            February 23, 2026
          </span>
        </div>
      </header>

      {/* Notice */}
      <div className="rounded-lg border border-pl-amber/30 bg-pl-amber/5 px-5 py-4 mb-10">
        <p className="text-sm text-pl-text-secondary leading-relaxed">
          <strong className="text-pl-amber">Defensive Disclosure.</strong> This
          document is published to establish prior art under 35 U.S.C.
          102(a)(1) and prevent the patenting of the described methods by any
          party. The protocol-level concepts are dedicated to the public domain.
          Specific implementations, scoring algorithms, and trade secrets are
          retained by Percival Labs.
        </p>
      </div>

      {/* Abstract */}
      <Section title="Abstract">
        <p>
          This disclosure describes a system for controlling access to AI model
          inference APIs using economic trust staking. API consumers must deposit
          slashable economic value&mdash;backed by community vouchers who stake
          their own reputation and funds&mdash;to obtain elevated access to
          frontier model capabilities. Confirmed misuse triggers cascading
          economic penalties on both the consumer and all entities that vouched
          for them.
        </p>
        <p>
          The system creates a decentralized trust layer where trust scores are
          cryptographically signed, publicly verifiable, and portable across
          competing providers. This addresses the fundamental limitation of
          current API access controls: identity is cheap and consequences are
          weak.
        </p>
      </Section>

      {/* Problem */}
      <Section title="1. The Problem: Identity-Cheap API Access">
        <p>
          On February 23, 2026, Anthropic disclosed that three AI laboratories
          had created over 24,000 fraudulent accounts and generated more than 16
          million exchanges with their Claude model for the purpose of model
          distillation&mdash;systematically extracting the model&rsquo;s
          capabilities to train competing systems.
        </p>
        <p>
          Current defenses fail because they treat identity as a formality
          rather than an economic commitment:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-pl-text-secondary">
          <li>
            <strong className="text-pl-text">Email verification</strong> costs
            ~$0 per account, enabling mass Sybil attacks
          </li>
          <li>
            <strong className="text-pl-text">Account bans</strong> impose
            negligible cost on attackers who can create replacement accounts at
            will
          </li>
          <li>
            <strong className="text-pl-text">Rate limits</strong> are
            circumvented by distributing queries across thousands of accounts
          </li>
          <li>
            <strong className="text-pl-text">Provider-specific detection</strong>{" "}
            is siloed&mdash;attackers rotate to whichever provider has the weakest
            defenses
          </li>
        </ul>
        <p>
          The missing layer is <strong>economic accountability</strong>: a
          mechanism that makes identity expensive, makes consequences real, and
          coordinates defense across providers.
        </p>
      </Section>

      {/* Solution Overview */}
      <Section title="2. The Solution: Trust Staking">
        <p>The disclosed system introduces three interlocking mechanisms:</p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Economic Staking for API Access
        </h3>
        <p>
          API consumers register with a cryptographic keypair and must deposit
          slashable economic value to obtain elevated access. The stake is not a
          fee&mdash;it is collateral. If the consumer behaves legitimately, the
          stake remains theirs (and may earn yield). If they are confirmed to
          have engaged in misuse, the stake is confiscated.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Community Vouching Chains
        </h3>
        <p>
          Consumers cannot simply stake money to buy trust. They must also
          obtain <em>vouches</em> from existing trusted entities&mdash;organizations
          or individuals who stake their own reputation and economic value to
          attest to the consumer&rsquo;s legitimacy. This creates a social
          accountability graph that Sybil attacks cannot fake.
        </p>
        <p>
          A voucher&rsquo;s stake is at risk: if the consumer they vouch for is
          caught distilling, the voucher loses a proportional share of their
          stake and suffers a temporary reduction in their own trust score.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Cross-Provider Trust Coordination
        </h3>
        <p>
          Trust scores are published as cryptographically signed assertions on a
          decentralized protocol (such as Nostr). Any provider can independently
          verify any consumer&rsquo;s trust score without requiring bilateral
          data-sharing agreements. This eliminates the &ldquo;weakest
          link&rdquo; problem: attackers cannot simply rotate to the provider
          with the weakest detection because the trust layer spans all
          providers.
        </p>
      </Section>

      {/* How It Works */}
      <Section title="3. System Architecture">
        <p>The system comprises three principal components:</p>

        <div className="mt-4 space-y-4">
          <ComponentCard
            name="Trust Registry"
            description="A decentralized store of cryptographically signed trust assertions. Published as signed events (e.g., Nostr NIP-85 kind 30382), independently verifiable by any party. No permission required to read."
          />
          <ComponentCard
            name="Staking Engine"
            description="Financial infrastructure managing the lifecycle of economic stakes: deposit, lockup, yield distribution, unstaking notice periods, withdrawal, and slashing. All operations are atomic. Payments via Lightning Network."
          />
          <ComponentCard
            name="Gateway Middleware"
            description="Software layer at the provider's API endpoint. Intercepts requests, extracts consumer identity, queries trust score, enforces tiered access control, and reports behavioral signals asynchronously."
          />
        </div>
      </Section>

      {/* Tiered Access */}
      <Section title="4. Tiered Access Control">
        <p>
          A consumer&rsquo;s composite trust score determines their access tier:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Tier</th>
                <th className="pb-2 pr-4 font-medium">Requirements</th>
                <th className="pb-2 font-medium">Access Level</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Restricted
                </td>
                <td className="py-2.5 pr-4">No stake, no vouchers</td>
                <td className="py-2.5">Low rate limits, no advanced features</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Standard
                </td>
                <td className="py-2.5 pr-4">
                  Min stake + 1 voucher
                </td>
                <td className="py-2.5">Normal rate limits</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Elevated
                </td>
                <td className="py-2.5 pr-4">
                  Higher stake + 3 vouchers
                </td>
                <td className="py-2.5">
                  High rate limits, chain-of-thought access
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Unlimited
                </td>
                <td className="py-2.5 pr-4">
                  Substantial stake + 5 high-trust vouchers + verified domain
                </td>
                <td className="py-2.5">Full access, provider-defined limits</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Economic Analysis */}
      <Section title="5. Economic Sybil Resistance">
        <p>
          The economic properties make large-scale Sybil attacks prohibitively
          expensive:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Factor</th>
                <th className="pb-2 pr-4 font-medium">Without Trust Staking</th>
                <th className="pb-2 font-medium">With Trust Staking</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4">24,000 accounts</td>
                <td className="py-2.5 pr-4">~$0 (email verification)</td>
                <td className="py-2.5 font-medium text-pl-amber">
                  $2.4M+ in stake at risk
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4">Vouchers needed</td>
                <td className="py-2.5 pr-4">0</td>
                <td className="py-2.5 font-medium text-pl-amber">
                  24,000 unique trusted entities
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4">Consequence if caught</td>
                <td className="py-2.5 pr-4">Account ban</td>
                <td className="py-2.5 font-medium text-pl-amber">
                  All stakes slashed + voucher cascade
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Feasibility</td>
                <td className="py-2.5 pr-4">Trivial</td>
                <td className="py-2.5 font-medium text-pl-green">
                  Practically impossible
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          The voucher requirement is the critical mechanism. Finding 24,000
          separate legitimate entities willing to stake their reputation on fake
          accounts is economically and socially impractical. The social graph
          itself becomes the Sybil resistance.
        </p>
      </Section>

      {/* Cascading Slashing */}
      <Section title="6. Cascading Slash Mechanism">
        <p>
          When distillation is confirmed, economic penalties cascade through the
          vouching chain:
        </p>
        <ol className="list-decimal pl-6 space-y-2 mt-3 text-pl-text-secondary">
          <li>
            <strong className="text-pl-text">Consumer slashed:</strong> Trust
            score reduced to minimum, account suspended, all stakes at risk
          </li>
          <li>
            <strong className="text-pl-text">Voucher stakes slashed:</strong>{" "}
            All entities that vouched for the consumer lose a proportional share
            of their staked value (25&ndash;100% depending on severity)
          </li>
          <li>
            <strong className="text-pl-text">Voucher reputation damaged:</strong>{" "}
            Vouchers suffer temporary trust score reductions, affecting their own
            access and their ability to vouch for others
          </li>
          <li>
            <strong className="text-pl-text">Slash distribution:</strong> A
            portion to the reporting provider (incentivizing detection), a
            portion to a community treasury (funding public goods), and a
            portion burned (increasing cost of future attacks)
          </li>
        </ol>
        <p className="mt-3">
          This creates a natural due-diligence incentive: you don&rsquo;t vouch
          for entities you don&rsquo;t trust, because their misbehavior costs
          you real money.
        </p>
      </Section>

      {/* Trust Score */}
      <Section title="7. Composite Trust Score">
        <p>
          Each consumer&rsquo;s trust score is computed from multiple weighted
          dimensions:
        </p>
        <div className="mt-4 space-y-3">
          <DimensionRow
            name="Identity Verification"
            description="Strength of identity verification: anonymous keypair, verified domain (DNS TXT record), or verified legal entity"
          />
          <DimensionRow
            name="Account Tenure"
            description="Account age on a logarithmic scale, penalizing newly created accounts"
          />
          <DimensionRow
            name="Behavioral Health"
            description="API usage pattern analysis: prompt diversity, timing variance, chain-of-thought request ratio, model switching patterns"
          />
          <DimensionRow
            name="Economic Backing"
            description="Total economic value staked by vouchers, weighted by the vouchers' own trust scores"
          />
          <DimensionRow
            name="Cross-Provider Reputation"
            description="Standing across multiple independent providers; flags from multiple providers are strongly negative"
          />
        </div>
        <p className="mt-4 text-sm text-pl-text-dim">
          Specific weights, normalization functions, and scoring algorithms are
          implementation-specific and not disclosed. The composite score is
          bounded to a fixed range and recomputed on significant events.
        </p>
      </Section>

      {/* Governance */}
      <Section title="8. Governance Model">
        <p>
          Slashing is the only punitive mechanism in the system&mdash;it takes
          real money from real people. The governance around slashing decisions
          must therefore be the most carefully designed component.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Bounty-Based Investigation
        </h3>
        <p>
          When misuse is reported, investigations are handled by a pool of
          qualified community members&mdash;not a central authority. Investigators
          are randomly assigned from an opt-in pool (minimum trust score, stake,
          and tenure required). Three investigators are assigned per case,
          working independently in parallel.
        </p>
        <p>
          Case data is fully anonymized: investigators see behavioral data and
          evidence, but not the identity of the accused, the reporter, or the
          vouchers. This prevents bias and conflicts of interest.
          Investigators are compensated based on the quality of their work&mdash;if
          their findings are upheld by the jury, they receive the full bounty.
          If overturned, compensation is reduced. This creates a natural
          incentive for thoroughness and accuracy.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Random Jury Adjudication
        </h3>
        <p>
          Adjudication decisions are made by randomly selected juries drawn from
          a qualified pool. Random selection prevents capture&mdash;you cannot
          bribe a jury you cannot predict. A 75% supermajority is required to
          slash, and jurors use commit-reveal voting to prevent bandwagon
          effects. Appeals are heard by a separate, independently selected body
          that can overturn, reduce, or uphold the original decision.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Constitutional Limits
        </h3>
        <p>
          Regardless of what governance decides, certain constraints are
          immutable at the protocol level:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-pl-text-secondary">
          <li>
            <strong className="text-pl-text">50% maximum slash</strong> per
            incident&mdash;nobody loses everything on one decision
          </li>
          <li>
            <strong className="text-pl-text">14-day evidence period</strong>{" "}
            between report and adjudication&mdash;the accused has time to respond
          </li>
          <li>
            <strong className="text-pl-text">Reporter collateral</strong> of
            10% of the potential slash amount&mdash;frivolous reports are
            economically irrational
          </li>
          <li>
            <strong className="text-pl-text">Graduated severity</strong>&mdash;first
            offense is a warning + score reduction, not a financial slash
          </li>
          <li>
            <strong className="text-pl-text">90-day statute of limitations</strong>{" "}
            and no double jeopardy&mdash;the same behavior cannot be reported
            twice
          </li>
        </ul>
      </Section>

      {/* Transaction Safety */}
      <Section title="9. Transaction Safety">
        <h3 className="text-lg font-semibold text-pl-text mt-2 mb-2">
          Non-Payment Stake Lock
        </h3>
        <p>
          To protect against non-payment after service completion, the protocol
          implements a stake lock mechanism. Before a transaction begins, a
          portion of the purchaser&rsquo;s existing Vouch stake is temporarily
          locked. If the purchaser pays normally, the lock releases
          automatically. If a non-payment dispute is filed, the locked portion
          is slashed.
        </p>
        <p>
          This is explicitly <strong>not escrow</strong>. No new funds are held.
          No funds transfer between parties. The mechanism operates on stake
          already deposited in the Vouch system. Slashed funds go to the
          protocol treasury, not to the performer. This creates an economic
          deterrent without triggering money transmission regulations.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Completion Criteria
        </h3>
        <p>
          The protocol provides two approaches for defining when a task is
          complete:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-pl-text-secondary">
          <li>
            <strong className="text-pl-text">Parametric</strong>&mdash;machine-verifiable
            conditions defined upfront (schema validation, SLA compliance).
            Binary pass/fail. Fully automated, no governance needed.
          </li>
          <li>
            <strong className="text-pl-text">Template-based</strong>&mdash;standard
            outcome templates (delivery, quality rating, milestone completion,
            time-bound) selected by both parties before work starts.
            Disputes are adjudicated against the agreed template.
          </li>
        </ul>
      </Section>

      {/* Anti-Gaming */}
      <Section title="10. Anti-Gaming Mechanisms">
        <p>
          Trust scores can be gamed through wash trading, circular vouching,
          score farming, and temporal exploits. The system employs multiple
          defenses:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-pl-text-secondary">
          <li>
            <strong className="text-pl-text">Graph analysis</strong>&mdash;circular
            vouching patterns (A vouches for B vouches for C vouches for A)
            are detected and penalized. The vouching graph must be acyclic.
          </li>
          <li>
            <strong className="text-pl-text">Score velocity limits</strong>&mdash;trust
            scores cannot increase faster than a defined rate per time period.
            Organic trust builds slowly; gaming tries to accelerate it.
          </li>
          <li>
            <strong className="text-pl-text">Behavioral diversity</strong>&mdash;high
            trust tiers require activity across multiple signal dimensions.
            Excelling in one dimension cannot compensate for blanks in others.
          </li>
          <li>
            <strong className="text-pl-text">Cross-provider correlation</strong>&mdash;inconsistent
            usage patterns across providers signal adversarial behavior.
          </li>
          <li>
            <strong className="text-pl-text">Continuous scoring</strong>&mdash;behavioral
            health is a live signal, not a periodic recalculation. Sudden
            shifts in usage patterns trigger near-real-time score adjustments.
          </li>
        </ul>
      </Section>

      {/* Federation */}
      <Section title="11. Federation and Decentralization">
        <p>
          The system is designed to progress from centralized operation to full
          decentralization:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-pl-text-secondary">
          <li>
            <strong className="text-pl-text">Phase 1:</strong> Single trust
            registry operated by the protocol developer
          </li>
          <li>
            <strong className="text-pl-text">Phase 2:</strong> All staking
            events published as verifiable events on the decentralized protocol,
            opening the data layer
          </li>
          <li>
            <strong className="text-pl-text">Phase 3:</strong> Multiple
            independent trust registries, each publishing signed assertions with
            their own service keys. Providers choose which registries to trust.
          </li>
          <li>
            <strong className="text-pl-text">Phase 4:</strong> Scoring defined
            as a protocol standard. Any node can independently compute trust
            scores from the public event stream. No single entity controls the
            trust layer.
          </li>
        </ul>
        <p>
          The protocol includes two structural safeguards against abuse: a{" "}
          <strong>minimum access floor</strong> guaranteeing that even the lowest
          trust tier provides nonzero access (no provider can use the system for
          complete cutoff), and an <strong>opt-in design</strong> ensuring that
          non-participating providers always exist as competitive alternatives.
        </p>
      </Section>

      {/* Design Properties */}
      <Section title="12. Key Design Properties">
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <PropertyCard
            title="Decentralized"
            description="No single provider controls the trust layer. Trust assertions are cryptographically signed and independently verifiable on an open protocol."
          />
          <PropertyCard
            title="Provider-Agnostic"
            description="Any AI model provider can integrate the gateway middleware. The trust layer coordinates defense without requiring bilateral agreements."
          />
          <PropertyCard
            title="Economically Aligned"
            description="Vouchers earn yield from legitimate consumer activity. Misuse costs real money. Incentives favor cooperation over defection."
          />
          <PropertyCard
            title="Portable"
            description="Trust scores travel with the consumer across providers. No lock-in, no walled gardens, no platform risk."
          />
        </div>
      </Section>

      {/* Novel Contributions */}
      <Section title="13. Novel Contributions">
        <p>
          The following aspects are believed to be novel as of the filing date:
        </p>
        <ol className="list-decimal pl-6 space-y-2 mt-3 text-pl-text-secondary">
          <li>
            Economic trust staking as a prerequisite for AI model inference API
            access
          </li>
          <li>
            Community vouching chains with cascading economic liability for API
            access control
          </li>
          <li>
            Composite trust scoring for API consumers aggregating identity,
            behavior, backing, tenure, and cross-provider reputation
          </li>
          <li>
            Cross-provider trust coordination using cryptographically signed
            assertions on a decentralized protocol
          </li>
          <li>
            Behavioral anomaly detection signals as inputs to an economic
            slashing mechanism
          </li>
          <li>
            Domain verification via DNS TXT records bound to cryptographic
            identities for API consumers
          </li>
          <li>
            Voucher yield mechanisms that economically incentivize legitimate
            vouching through API activity fee distribution
          </li>
          <li>
            The combination of Nostr-native decentralized identity with
            Lightning Network payment infrastructure for staking, slashing, and
            yield in AI inference access control
          </li>
          <li>
            Federated trust registries enabling multiple independent scoring
            services to publish competing trust assertions on a decentralized
            protocol, with providers choosing which registries to trust
          </li>
          <li>
            Immutable protocol-level constitutional constraints on economic
            slashing decisions, including maximum slash caps, mandatory evidence
            periods, reporter collateral requirements, and graduated severity
          </li>
          <li>
            Bounty-based investigation of trust violations using anonymized case
            data, verifiable random investigator assignment, and quality-based
            compensation tied to jury outcomes
          </li>
          <li>
            Random jury adjudication with commit-reveal voting for economic
            penalty decisions in decentralized trust systems
          </li>
          <li>
            Non-payment protection via temporary stake locks on existing
            deposits&mdash;a penalty mechanism that creates economic deterrence
            without escrow or money transmission
          </li>
        </ol>
      </Section>

      {/* Prior Art */}
      <Section title="14. Prior Art Established">
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 font-medium">Artifact</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Feb 22, 2026</td>
                <td className="py-2">
                  Vouch Agent SDK v0.1.0 published to npm with Nostr identity,
                  NIP-98 auth, and trust verification
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Feb 22, 2026</td>
                <td className="py-2">
                  Vouch API deployed publicly with agent registration, trust
                  scoring, and outcome reporting
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Feb 22, 2026</td>
                <td className="py-2">
                  First agent registered on the Vouch trust network
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Feb 22, 2026</td>
                <td className="py-2">
                  15 public posts on X describing the Vouch trust staking
                  concept
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 whitespace-nowrap">2025&ndash;2026</td>
                <td className="py-2">
                  Continuous git commit history documenting protocol development
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-pl-border">
        <p className="text-sm text-pl-text-dim leading-relaxed">
          Filed as a defensive disclosure by Percival Labs, Bellingham, WA, USA.
          This document constitutes prior art under 35 U.S.C. 102(a)(1). The
          described protocol-level concepts are dedicated to the public domain
          for the purpose of preventing patent claims. All rights to specific
          implementations, trade secrets, and trademarks are reserved.
        </p>
        <p className="text-sm text-pl-text-dim mt-3">
          Document ID: PL-DD-2026-001 &middot; Contact: percyai2025@gmail.com
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
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-pl-text mb-4">{title}</h2>
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

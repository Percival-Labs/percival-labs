import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title:
    "Economic Accountability Layer for AI Agent Tool-Use Protocol Governance — Defensive Disclosure",
  description:
    "A system for governing AI agent tool-use protocols through economic staking, community vouching, and behavioral monitoring. Published as a defensive disclosure to establish prior art.",
  openGraph: {
    type: "article",
    title:
      "Economic Accountability Layer for AI Agent Tool-Use Protocol Governance — Defensive Disclosure",
    description:
      "Economic staking and slashing for tool server governance. 8,600+ MCP servers, 41% lack authentication. The missing layer is consequences.",
  },
};

export default function McpGovernanceDisclosurePage() {
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
          <span className="text-xs text-pl-text-dim">PL-DD-2026-002</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-pl-text sm:text-4xl leading-tight">
          Economic Accountability Layer for AI Agent Tool-Use Protocol Governance
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-pl-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Alan Carroll
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            February 24, 2026
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
          This disclosure describes a system for governing AI agent tool-use
          protocols&mdash;such as the Model Context Protocol (MCP)&mdash;through an
          economic accountability layer. Tool server operators deposit slashable
          economic value, community members vouch for servers they trust, and
          verified security incidents trigger cascading economic penalties.
        </p>
        <p>
          The system operates as a protocol-agnostic overlay that requires no
          modifications to the underlying tool-use specification, enabling opt-in
          adoption where scored servers receive enhanced trust visibility and
          unscored servers continue to function normally.
        </p>
      </Section>

      {/* Problem */}
      <Section title="1. The Problem: Capability Without Accountability">
        <p>
          Standardized protocols for AI agent-to-tool communication enable agents
          to discover, connect to, and use external tools at runtime. As of
          February 2026, the MCP ecosystem alone comprises over 8,600 indexed tool
          servers, 97 million monthly SDK downloads, and 300+ client integrations.
        </p>
        <p>
          However, these protocols provide capability without accountability.
          Existing trust mechanisms address identity, authorization, and
          provenance&mdash;but none create economic consequences for misbehavior:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Mechanism</th>
                <th className="pb-2 pr-4 font-medium">What It Proves</th>
                <th className="pb-2 font-medium">What It Doesn&rsquo;t</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Namespace registry
                </td>
                <td className="py-2.5 pr-4">Who published the server</td>
                <td className="py-2.5">Whether they are trustworthy</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  OAuth 2.1
                </td>
                <td className="py-2.5 pr-4">User approved access</td>
                <td className="py-2.5">Whether the agent should use it</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Cryptographic attestation
                </td>
                <td className="py-2.5 pr-4">Code hasn&rsquo;t been tampered with</td>
                <td className="py-2.5">Whether runtime behavior is safe</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Neural threat detection
                </td>
                <td className="py-2.5 pr-4">Malicious behavior detected</td>
                <td className="py-2.5">
                  Nothing&mdash;detection without consequence is not deterrence
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          The missing layer is <strong>economic accountability</strong>: a
          mechanism that makes misbehavior financially costly for server operators
          and their endorsers.
        </p>
      </Section>

      {/* Attack Surface */}
      <Section title="2. Documented Attack Surface">
        <p>
          Between January and February 2026, 30 Common Vulnerabilities and
          Exposures (CVEs) were documented across the MCP ecosystem. 41% of
          servers in the official registry lack any authentication. Key attack
          classes include:
        </p>
        <div className="mt-4 space-y-4">
          <ComponentCard
            name="Tool Poisoning"
            description="Malicious instructions embedded in tool description metadata, consumed by the LLM but not displayed to the user. Demonstrated: full WhatsApp message history exfiltration via a benign-appearing &quot;random fact&quot; tool server."
          />
          <ComponentCard
            name="Rug Pull Attacks"
            description="Tool servers that pass initial review and later silently mutate their tool definitions to include malicious behavior. Auto-update pipelines propagate changes without re-prompting for user consent."
          />
          <ComponentCard
            name="Supply Chain Compromise"
            description="Poisoned tool server packages propagated through package registries. Over 437,000 developer environments were compromised through a single supply chain CVE."
          />
          <ComponentCard
            name="Cross-Server Shadowing"
            description="A malicious server connected to the same agent as a trusted server can override or intercept calls intended for the trusted server."
          />
          <ComponentCard
            name="Sampling Injection"
            description="The protocol's sampling feature — where a server can request the client's LLM to generate text — creates a prompt injection surface enabling compute theft and data exfiltration."
          />
        </div>
      </Section>

      {/* Solution */}
      <Section title="3. The Solution: Economic Accountability Layer">
        <p>
          The disclosed system introduces an economic accountability layer that
          operates as a transparent overlay on existing tool-use protocols. The
          system comprises four principal components:
        </p>

        <div className="mt-4 space-y-4">
          <ComponentCard
            name="Trust Score Registry"
            description="A federated network of scoring services that publish composite trust scores for tool servers as cryptographically signed events on a decentralized messaging protocol (e.g., Nostr NIP-85). Each scoring service maintains its own model and publishes independently. Clients verify signatures and apply scores according to local policy."
          />
          <ComponentCard
            name="Client-Side Trust Middleware"
            description="A software component in the agent host's tool-use client that intercepts tool discovery and invocation, looks up server trust scores from cached registry data, applies configurable policy rules (allow/warn/block thresholds), and logs trust decisions. Operates transparently to both the LLM engine and the tool server."
          />
          <ComponentCard
            name="Staking Engine"
            description="Non-custodial economic commitment system where tool server operators and their vouchers authorize budget commitments via wallet connect protocols (e.g., NWC/NIP-47). Tracks active stakes, budget caps, and spent amounts without custodying funds."
          />
          <ComponentCard
            name="Slash Adjudicator"
            description="Governance component processing slash requests through a defined workflow: reporter stakes collateral, evidence is submitted, server operator has a mandatory response period, randomly selected jury evaluates evidence, slash is executed or rejected by majority vote."
          />
        </div>
      </Section>

      {/* Trust Score */}
      <Section title="4. Tool Server Trust Score">
        <p>
          Each participating tool server receives a composite trust score derived
          from weighted signals:
        </p>
        <div className="mt-4 space-y-3">
          <DimensionRow
            name="Operator Stake (~30%)"
            description="Economic value committed by the server operator via non-custodial budget authorization, normalized against ecosystem benchmarks"
          />
          <DimensionRow
            name="Community Vouching (~25%)"
            description="Weighted sum of stakes committed by entities vouching for the server, where each voucher's contribution is scaled by their own trust score"
          />
          <DimensionRow
            name="Behavioral History (~20%)"
            description="Uptime, response consistency, anomaly rate, and definition stability, derived from aggregated client-side behavioral observations"
          />
          <DimensionRow
            name="Provenance Verification (~15%)"
            description="Cryptographic attestation, namespace registry verification, source code audit status, and CVE response history"
          />
          <DimensionRow
            name="Community Observations (~10%)"
            description="Aggregated behavioral reports from participating clients, weighted by observer trust score"
          />
        </div>
        <p className="mt-4 text-sm text-pl-text-dim">
          Specific normalization functions and scoring algorithms are
          implementation-specific and not disclosed. Scores are published at
          regular intervals as signed events on the trust registry.
        </p>
      </Section>

      {/* Risk Tiers */}
      <Section title="5. Tool-Level Risk Classification">
        <p>
          Individual tools within a server carry trust metadata including a risk
          tier classification. The client-side middleware applies tier-appropriate
          policy:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Risk Tier</th>
                <th className="pb-2 pr-4 font-medium">Examples</th>
                <th className="pb-2 font-medium">Default Policy</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">Low</td>
                <td className="py-2.5 pr-4">Read-only data, public APIs</td>
                <td className="py-2.5">Auto-approve above score 30</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">Medium</td>
                <td className="py-2.5 pr-4">Write operations, file access</td>
                <td className="py-2.5">Auto-approve above score 60</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">High</td>
                <td className="py-2.5 pr-4">Shell execution, payment, email</td>
                <td className="py-2.5">
                  Require human approval or score 85+
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">Critical</td>
                <td className="py-2.5 pr-4">
                  Credential access, system configuration
                </td>
                <td className="py-2.5">Always require human approval</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Behavioral Monitoring */}
      <Section title="6. Behavioral Monitoring Protocol">
        <p>
          Participating clients report behavioral observations as signed events
          containing structured evidence. Observation types include:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-pl-text-secondary">
          <li>
            <strong className="text-pl-text">Definition change</strong>&mdash;tool
            definitions mutated between sessions (rug pull detection)
          </li>
          <li>
            <strong className="text-pl-text">Latency spike</strong>&mdash;response
            time anomalies suggesting resource exhaustion or interception
          </li>
          <li>
            <strong className="text-pl-text">Parameter anomaly</strong>&mdash;unexpected
            tool parameter patterns suggesting injection attempts
          </li>
          <li>
            <strong className="text-pl-text">Cross-server shadow</strong>&mdash;one
            server intercepting or overriding calls to another
          </li>
          <li>
            <strong className="text-pl-text">Auth failure spike</strong>&mdash;sudden
            increase in authentication failures suggesting credential probing
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Anti-Gaming Measures
        </h3>
        <ul className="list-disc pl-6 space-y-2 text-pl-text-secondary">
          <li>
            Observers must be staked&mdash;zero-stake observers&rsquo; reports
            carry zero weight
          </li>
          <li>
            Reports require signed evidence payloads (tool definition diffs,
            timing data, parameter distributions)
          </li>
          <li>
            Consistently inaccurate reporters see their own trust score degraded
          </li>
          <li>
            Multiple independent reports of the same anomaly increase
            confidence; single-source reports are weighted lower
          </li>
          <li>
            Server operators can dispute observations with counter-evidence
          </li>
        </ul>
      </Section>

      {/* Slash Process */}
      <Section title="7. Slash Mechanism">
        <p>
          Verified misbehavior triggers a formal slash process with defined
          severity tiers:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Tier</th>
                <th className="pb-2 pr-4 font-medium">Slash Range</th>
                <th className="pb-2 font-medium">Trigger Conditions</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">Tier 1</td>
                <td className="py-2.5 pr-4">10&ndash;25% of stake</td>
                <td className="py-2.5">
                  CVE non-response within 72 hours, minor definition mutations
                  without user notification
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">Tier 2</td>
                <td className="py-2.5 pr-4">25&ndash;50% of stake</td>
                <td className="py-2.5">
                  Verified tool poisoning, confirmed cross-server data
                  shadowing, supply chain compromise with delayed response
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">Tier 3</td>
                <td className="py-2.5 pr-4">Up to constitutional maximum</td>
                <td className="py-2.5">
                  Verified intentional data exfiltration, proven malicious rug
                  pull, coordinated attack on client agents
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Constitutional Limits
        </h3>
        <p>
          The following constraints are immutable at the protocol level and cannot
          be modified through governance:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-pl-text-secondary">
          <li>
            <strong className="text-pl-text">50% maximum single slash</strong>&mdash;no
            operator loses their entire stake on one decision
          </li>
          <li>
            <strong className="text-pl-text">48-hour minimum evidence period</strong>&mdash;the
            accused has time to respond before adjudication
          </li>
          <li>
            <strong className="text-pl-text">Reporter collateral</strong> of
            minimum 10% of requested slash amount&mdash;frivolous reports are
            economically irrational
          </li>
          <li>
            <strong className="text-pl-text">Double jeopardy protection</strong>&mdash;no
            re-slash for the same incident after adjudication
          </li>
          <li>
            <strong className="text-pl-text">90-day statute of limitations</strong>{" "}
            from incident detection
          </li>
          <li>
            <strong className="text-pl-text">7-day appeal window</strong> post-slash
            execution, heard by independently selected body
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Voucher Cascade
        </h3>
        <p>
          Upon slash execution, all community members who vouched for the slashed
          server are slashed at a reduced rate (5&ndash;25% of their vouch amount,
          proportional to slash severity). This creates distributed economic
          incentive for pre-emptive due diligence.
        </p>
      </Section>

      {/* Cross-Protocol */}
      <Section title="8. Cross-Protocol Trust Portability">
        <p>
          The economic accountability layer is designed for protocol-agnostic
          operation. The same cryptographic identity and associated trust score
          can be used across:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-pl-text-secondary">
          <li>
            <strong className="text-pl-text">Agent-to-tool protocols</strong>{" "}
            (e.g., MCP)
          </li>
          <li>
            <strong className="text-pl-text">Agent-to-agent protocols</strong>{" "}
            (e.g., A2A, ACP)
          </li>
          <li>
            <strong className="text-pl-text">Capability declaration formats</strong>{" "}
            (e.g., AGENTS.md)
          </li>
          <li>
            <strong className="text-pl-text">Custom and future protocols</strong>{" "}
            via the shared cryptographic identity anchor
          </li>
        </ul>
        <p>
          This universality is achieved by anchoring trust to the cryptographic
          identity (e.g., Nostr keypair) rather than to any specific
          protocol&rsquo;s identity system.
        </p>
      </Section>

      {/* Design Properties */}
      <Section title="9. Key Design Properties">
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <PropertyCard
            title="Overlay Architecture"
            description="Operates alongside existing protocols without requiring specification changes. Opt-in adoption. Unscored servers continue to function normally."
          />
          <PropertyCard
            title="Non-Custodial"
            description="Stake locks are budget authorizations on the operator's own wallet. No funds are escrowed by a third party. No securities classification."
          />
          <PropertyCard
            title="Federated"
            description="Multiple independent scoring services publish competing trust assessments. Clients choose which services to trust. No centralized authority."
          />
          <PropertyCard
            title="Protocol-Agnostic"
            description="Same trust score works across MCP, A2A, ACP, AGENTS.md, and any future protocol. One identity, one trust score, every protocol."
          />
        </div>
      </Section>

      {/* Novel Contributions */}
      <Section title="10. Novel Contributions">
        <p>
          The following aspects are believed to be novel as of the filing date:
        </p>
        <ol className="list-decimal pl-6 space-y-2 mt-3 text-pl-text-secondary">
          <li>
            Economic staking and slashing mechanisms applied to AI agent tool-use
            protocol governance
          </li>
          <li>
            Community vouching chains with cascading economic consequences for
            tool server trustworthiness
          </li>
          <li>
            Client-side trust middleware operating as a transparent overlay on
            tool-use protocol transports without protocol modification
          </li>
          <li>
            Tool-level risk tier classification with tier-appropriate trust
            policy enforcement
          </li>
          <li>
            Multi-observer behavioral anomaly consensus with stake-weighted
            reporting for tool server monitoring
          </li>
          <li>
            Rug pull detection through tool definition integrity monitoring
            across sessions
          </li>
          <li>
            Constitutional limits on governance power applied to tool-use
            protocol slash adjudication
          </li>
          <li>
            Non-custodial staking for tool server operators via wallet connect
            protocols
          </li>
          <li>
            Federated trust scoring where multiple independent services publish
            competing assessments of tool server trustworthiness
          </li>
          <li>
            Cross-protocol trust portability anchored to a single cryptographic
            identity, enabling a unified trust score across agent-to-tool,
            agent-to-agent, and capability declaration protocols
          </li>
        </ol>
      </Section>

      {/* Prior Art */}
      <Section title="11. Prior Art Established">
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
                <td className="py-2 pr-4 whitespace-nowrap">Feb 23, 2026</td>
                <td className="py-2">
                  Defensive Disclosure PL-DD-2026-001: Economic Trust Staking
                  for AI Model Inference APIs (establishes staking, vouching, and
                  slashing primitives)
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Feb 22, 2026</td>
                <td className="py-2">
                  Vouch Agent SDK and API deployed with Nostr identity, NIP-98
                  auth, and trust scoring
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Feb 24, 2026</td>
                <td className="py-2">
                  Response paper to &ldquo;Agents of Chaos&rdquo; mapping agent
                  security vulnerabilities to economic accountability mechanisms
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 whitespace-nowrap">2025&ndash;2026</td>
                <td className="py-2">
                  Continuous git commit history documenting protocol development
                  including tool-use governance concepts
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
          Document ID: PL-DD-2026-002 &middot; Contact: percyai2025@gmail.com
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

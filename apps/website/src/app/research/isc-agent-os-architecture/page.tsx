import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title:
    "Ideal State Criteria as a Runtime Quality Primitive for AI Agents and Unified Agent Operating System Architecture — Defensive Disclosure",
  description:
    "A system for AI agent quality assurance through runtime quality criteria and a unified three-pillar agent operating system architecture. Published as a defensive disclosure to establish prior art.",
  openGraph: {
    type: "article",
    title:
      "Ideal State Criteria as a Runtime Quality Primitive for AI Agents and Unified Agent Operating System Architecture — Defensive Disclosure",
    description:
      "Runtime quality criteria for AI agents plus a unified Define/Route/Govern architecture. The missing primitive is continuous quality tracking during execution.",
  },
};

export default function IscAgentOsArchitectureDisclosurePage() {
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
          <span className="text-xs text-pl-text-dim">PL-DD-2026-004</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-pl-text sm:text-4xl leading-tight">
          Ideal State Criteria as a Runtime Quality Primitive for AI Agents and
          Unified Agent Operating System Architecture
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-pl-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Alan Carroll
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            March 5, 2026
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
          This disclosure describes two interconnected inventions. <strong>Part
          A</strong> presents a system and method for defining, tracking, and
          verifying quality criteria as a runtime primitive within AI agent
          execution&mdash;wherein discrete binary testable criteria are
          automatically generated from task descriptions, continuously tracked
          during agent execution phases, and verified before marking work
          complete.
        </p>
        <p>
          <strong>Part B</strong> presents a unified agent operating system
          architecture comprising three integrated pillars&mdash;a skill
          definition framework, a trust-authenticated inference routing gateway,
          and a governance and scoring system&mdash;that together provide a
          complete, configurable platform for defining, routing, and governing AI
          agents from a single codebase serving individual developers through
          enterprise organizations.
        </p>
      </Section>

      {/* Part A: The Problem */}
      <Section title="Part A: The AI Agent Quality Assurance Problem">
        <p>
          AI agents executing multi-step tasks produce outputs of variable
          quality. As of March 2026, quality assurance for AI agent output
          relies on approaches that each leave a critical gap:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Approach</th>
                <th className="pb-2 pr-4 font-medium">Strength</th>
                <th className="pb-2 font-medium">Gap</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Human review
                </td>
                <td className="py-2.5 pr-4">Effective quality judgments</td>
                <td className="py-2.5">
                  Does not scale; no feedback during execution
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Unit testing
                </td>
                <td className="py-2.5 pr-4">Verifies deterministic paths</td>
                <td className="py-2.5">
                  Cannot verify relevance, completeness, or tone
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  LLM-as-judge
                </td>
                <td className="py-2.5 pr-4">Useful for batch evaluation</td>
                <td className="py-2.5">
                  Typically applied post-hoc, not in execution loop
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Benchmark suites
                </td>
                <td className="py-2.5 pr-4">Measures agent potential</td>
                <td className="py-2.5">
                  Evaluates capability, not specific task quality
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          None of these approaches provide a mechanism for{" "}
          <strong>continuous quality tracking during agent execution</strong>&mdash;defining
          what &ldquo;done right&rdquo; means for a specific task at the start,
          tracking progress toward that definition during execution, and
          verifying all criteria are met before marking the task complete. The
          gap between &ldquo;task started&rdquo; and &ldquo;task reviewed&rdquo;
          is a quality blind spot.
        </p>
      </Section>

      {/* ISC Runtime Engine */}
      <Section title="ISC Runtime Engine">
        <p>
          The ISC runtime operates as a library integrated into the agent
          execution environment. It provides the following API surface:
        </p>

        <div className="mt-4 space-y-4">
          <ComponentCard
            name="Generation"
            description="generateISC(taskDescription: string) -> ISCSet — Parses a task description and produces a set of criteria. Uses the agent's LLM to analyze the task and produce criteria in a structured format with positive criteria (MUST be true), anti-criteria (must NOT be true), and priority tiers (CRITICAL, IMPORTANT, NICE-TO-HAVE), each with an explicit verification method."
          />
          <ComponentCard
            name="Phase-Boundary Tracking"
            description="trackPhase(phase: string, criteria: ISCSet) -> ISCDelta — Records the current state of all criteria at defined phase boundaries during execution (e.g., after research, after implementation, after testing). Computes the delta from the previous boundary, recording which criteria have been added, modified, removed, passed, or failed."
          />
          <ComponentCard
            name="Verification"
            description="verify(criteria: ISCSet) -> VerificationResult — Executes the verification method for each criterion and returns pass/fail for each, blocking completion if any CRITICAL criterion fails. Verification methods are specified per-criterion (e.g., 'file exists at path', 'test suite passes', 'output contains required section')."
          />
          <ComponentCard
            name="Circuit Breaker"
            description="checkCircuitBreakers(executionState: ExecutionState) -> CircuitBreakerResult — Evaluates anti-criteria against the current execution state, returning a halt signal if any are violated. Requires explicit human approval before resuming."
          />
        </div>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          ISC Format
        </h3>
        <div className="rounded-lg border border-pl-border bg-pl-surface p-4 font-mono text-sm text-pl-text-muted overflow-x-auto">
          <pre>{`ISC-C1: [8-12 word criterion] | Verify: [method] | Priority: CRITICAL
ISC-C2: [8-12 word criterion] | Verify: [method] | Priority: IMPORTANT
ISC-A1: [anti-criterion — must NOT happen] | Verify: [detection method] | Priority: CRITICAL`}</pre>
        </div>
      </Section>

      {/* Circuit Breaker Anti-Criteria */}
      <Section title="Circuit Breaker Anti-Criteria">
        <p>
          The runtime monitors for predefined failure patterns during execution.
          When any anti-criterion is violated, execution is automatically halted:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Anti-Criterion</th>
                <th className="pb-2 font-medium">Trigger Condition</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Repeated failed approaches
                </td>
                <td className="py-2.5">
                  Same approach attempted N+ times without success
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Core assumption invalidation
                </td>
                <td className="py-2.5">
                  A foundational assumption of the plan is proven false
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Scope expansion
                </td>
                <td className="py-2.5">
                  Work expands beyond the boundaries of the original plan
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Workaround depth exceeded
                </td>
                <td className="py-2.5">
                  Writing workarounds for workarounds&mdash;cascading patches
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Out-of-scope changes
                </td>
                <td className="py-2.5">
                  Modifications to code or systems outside the planned scope
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ISC Evolution Tracking */}
      <Section title="ISC Evolution Tracking">
        <p>
          Criteria are permitted to change during execution as understanding
          deepens. Every change is captured as a delta record including the
          original criterion text, the modified text, the reason for change, and
          the phase at which the change occurred.
        </p>
        <div className="rounded-lg border border-pl-border bg-pl-surface p-4 font-mono text-sm text-pl-text-muted overflow-x-auto mt-4">
          <pre>{`ISC TRACKER
Phase: [current phase]
Criteria: [X] total (+N added, -M removed, ~K modified)
Anti: [X] total
Status: [N passed / M pending / K failed]
Changes this phase:
  + ISC-C4: new criterion added | Verify: method
  ~ ISC-C2: criterion refined (was: old text) | Verify: method
  - ISC-C3: removed (reason)`}</pre>
        </div>
        <p className="mt-4">
          This evolution data enables post-execution analysis of how task
          understanding changed and feeds back into improved initial ISC
          generation for future similar tasks.
        </p>
      </Section>

      {/* Ship Gate Verification */}
      <Section title="Ship Gate Verification">
        <p>
          A final verification pass is mandated before any implementation is
          marked complete. The ship gate checks the following meta-criteria:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Gate</th>
                <th className="pb-2 font-medium">Verification Question</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Simplicity
                </td>
                <td className="py-2.5">
                  Is this the simplest solution that works?
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Review readiness
                </td>
                <td className="py-2.5">
                  Are there any code review objections anticipated? (Agent
                  reviews its own diff)
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Hidden concerns
                </td>
                <td className="py-2.5">
                  Does any hidden concern exist? (Agent must state its worst
                  worry)
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Explainability
                </td>
                <td className="py-2.5">
                  Can the approach be explained in one sentence?
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Blast radius
                </td>
                <td className="py-2.5">
                  Are adjacent systems unaffected by the changes?
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Cleanliness
                </td>
                <td className="py-2.5">
                  Do any temporary hacks remain in the changed files?
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Part B: The Fragmented Agent Infrastructure Problem */}
      <Section title="Part B: The Fragmented Agent Infrastructure Problem">
        <p>
          Organizations deploying AI agents must assemble infrastructure from
          disconnected components, each existing in isolation:
        </p>
        <div className="mt-4 space-y-4">
          <ComponentCard
            name="Skill / Prompt Management"
            description="Stored as files, database entries, or hardcoded strings with no standardized format for defining what an agent knows and how it should behave."
          />
          <ComponentCard
            name="Model Access"
            description="Each agent manages its own API keys, model selection, and provider failover logic. No shared infrastructure for routing inference requests across a fleet."
          />
          <ComponentCard
            name="Governance"
            description="Access control, spending limits, usage tracking, and audit trails are implemented per-agent or not at all. No unified system governs agent behavior across an organization."
          />
          <ComponentCard
            name="Trust / Reputation"
            description="Agent quality is evaluated informally (if at all). No mechanism for quality metrics from one agent's execution to inform governance decisions for that agent going forward."
          />
        </div>
        <p className="mt-4">
          Connecting these components requires custom integration work per
          deployment. There is no architecture that provides all four as a
          unified, configurable platform.
        </p>
      </Section>

      {/* Three-Pillar Architecture */}
      <Section title="Three-Pillar Architecture: Define / Route / Govern">
        <p>
          The unified agent operating system comprises three integrated pillars,
          each independently deployable but producing emergent value when
          connected:
        </p>

        <div className="mt-4 space-y-4">
          <ComponentCard
            name="Pillar 1: Define (Engram)"
            description="AI agent capabilities are defined through structured skill documents containing identity rules, domain knowledge, task-specific instructions, tool definitions, and quality criteria templates (ISC patterns). Skills are composable into harnesses that define a complete agent personality and capability set, with a standard export format enabling cross-runtime portability."
          />
          <ComponentCard
            name="Pillar 2: Route (Gateway)"
            description="A proxy layer handles all inference routing for all agents in an organization. Provides auto-routing that resolves the optimal provider for any model name, per-agent model policies and budget caps, trust-tiered rate limiting based on external trust scores, structured audit logging, and agent self-service APIs."
          />
          <ComponentCard
            name="Pillar 3: Govern (Vouch)"
            description="Agent behavior is evaluated through a trust scoring system that consumes signals from both the inference gateway (usage patterns, cost efficiency, anomaly flags) and the skill execution runtime (ISC compliance rates, circuit breaker violations, criteria evolution stability), producing a composite trust score that feeds back into access control."
          />
        </div>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Three-Pillar Data Flow
        </h3>
        <div className="rounded-lg border border-pl-border bg-pl-surface p-4 font-mono text-sm text-pl-text-muted overflow-x-auto">
          <pre>{`┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   DEFINE     │     │    ROUTE     │     │   GOVERN     │
│  (Engram)    │     │  (Gateway)   │     │   (Vouch)    │
│              │     │              │     │              │
│ Skills       │     │ Auto-route   │     │ Trust scores │
│ Harnesses    │────>│ Model policy │<--->│ ISC signals  │
│ ISC runtime  │     │ Budget caps  │     │ Usage signals│
│ Export format │     │ Audit logs   │     │ Anomaly flags│
│              │     │ Agent API    │     │ Performance  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       │   ISC results      │  Usage records      │
       └───────────────────>│<────────────────────┘
                            │
                     Trust score feeds
                     back to Gateway
                     access control`}</pre>
        </div>
        <p className="mt-4 text-sm text-pl-text-dim">
          Each pillar is independently deployable. An organization can use only
          the skill framework with any inference provider, only the gateway with
          agents built on any framework, or only the governance system with any
          infrastructure. The full value emerges when all three are connected,
          but no pillar requires the others.
        </p>
      </Section>

      {/* ISC-to-Governance Signal Flow */}
      <Section title="ISC-to-Governance Signal Flow">
        <p>
          ISC results are emitted as structured events consumed by the
          governance system to inform trust scoring:
        </p>
        <div className="rounded-lg border border-pl-border bg-pl-surface p-4 font-mono text-sm text-pl-text-muted overflow-x-auto mt-4">
          <pre>{`{
  "agentId": "rc-advocate",
  "taskId": "daily-community-scan",
  "timestamp": "2026-03-05T12:00:00Z",
  "criteriaTotal": 8,
  "criteriaPassed": 7,
  "criteriaFailed": 1,
  "antiCriteriaViolated": 0,
  "circuitBreakersTriggered": 0,
  "criteriaEvolutionDelta": 2,
  "shipGatePassed": false,
  "failedCriteria": [
    "ISC-C3: Community response posted within 1 hour"
  ]
}`}</pre>
        </div>
        <div className="mt-4 space-y-3">
          <DimensionRow
            name="High ISC compliance"
            description="Trust score increases, leading to higher rate limits and budget headroom"
          />
          <DimensionRow
            name="Repeated circuit breaker violations"
            description="Trust score decreases, leading to tighter rate limits and human review required"
          />
          <DimensionRow
            name="High criteria evolution"
            description="Signals task understanding instability — no score impact but flagged for operator review"
          />
        </div>
      </Section>

      {/* Configuration-Over-Customization Scaling */}
      <Section title="Configuration-Over-Customization Scaling">
        <p>
          The entire platform serves organizations of any size through
          configuration rather than custom code. The per-agent configuration
          surface fits in a single JSON record:
        </p>
        <div className="rounded-lg border border-pl-border bg-pl-surface p-4 font-mono text-sm text-pl-text-muted overflow-x-auto mt-4">
          <pre>{`{
  "pubkey": "hex-encoded-public-key",
  "agentId": "customer-support-bot",
  "name": "Customer Support Agent",
  "createdAt": "2026-03-05T00:00:00Z",
  "tier": "standard",
  "models": [
    "anthropic/claude-haiku-4-5",
    "anthropic/claude-sonnet-4"
  ],
  "defaultModel": "anthropic/claude-haiku-4-5",
  "budget": {
    "maxSats": 50000,
    "periodDays": 30
  }
}`}</pre>
        </div>
        <p className="mt-4">
          Scaling from 1 agent to 10,000 agents requires creating 9,999 more
          records of this shape. No code changes, no architectural changes, no
          additional infrastructure. The gateway, governance system, and skill
          framework all reference this same configuration surface.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <PropertyCard
            title="Solo Developer"
            description="One agent identity, one skill, no budget cap. Same codebase, same APIs, same architecture."
          />
          <PropertyCard
            title="Enterprise"
            description="Hundreds of agent identities with role-specific model allowlists, departmental budgets, and compliance-grade audit trails. Configuration data is the only variable."
          />
        </div>
      </Section>

      {/* Novel Contributions */}
      <Section title="Novel Contributions">
        <p>
          The following aspects are believed to be novel as of the filing date:
        </p>
        <ol className="list-decimal pl-6 space-y-2 mt-3 text-pl-text-secondary">
          <li>
            Ideal State Criteria as a runtime primitive for AI agent quality
            assurance, with automatic generation from task descriptions,
            continuous tracking at phase boundaries, and verification-gated
            completion
          </li>
          <li>
            Circuit breaker anti-criteria that automatically halt agent execution
            when predefined failure patterns are detected, requiring explicit
            human approval to resume
          </li>
          <li>
            ISC evolution tracking that captures how task understanding changes
            during execution, enabling meta-learning about initial criterion
            generation quality
          </li>
          <li>
            Ship gate verification as a mandatory final quality check before any
            agent implementation is marked complete
          </li>
          <li>
            ISC compliance as a signal consumed by external governance systems to
            inform trust scoring and access control decisions, creating a
            quality-to-privilege feedback loop
          </li>
          <li>
            A three-pillar agent operating system architecture (Define, Route,
            Govern) where each pillar is independently deployable but produces
            emergent value when connected
          </li>
          <li>
            Configuration-over-customization scaling where the same codebase and
            architecture serves solo developers through enterprise organizations
            with configuration data as the only variable
          </li>
          <li>
            Closed-loop agent governance where quality metrics (ISC) and usage
            metrics (inference gateway) both feed trust scoring that in turn
            controls agent operational privileges
          </li>
        </ol>
      </Section>

      {/* Prior Art Established */}
      <Section title="Prior Art Established">
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
                  for AI Model Inference APIs (establishes staking, vouching,
                  and slashing primitives)
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Feb 24, 2026</td>
                <td className="py-2">
                  Defensive Disclosure PL-DD-2026-002: Economic Accountability
                  Layer for AI Agent Tool-Use Protocol Governance (establishes
                  tool-use governance with economic consequences)
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Mar 4, 2026</td>
                <td className="py-2">
                  Defensive Disclosure PL-DD-2026-003: Trust-Gated Inference
                  Gateway for Multi-Provider AI Agent Infrastructure (establishes
                  gateway architecture with trust-tiered access control)
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
                <td className="py-2 pr-4 whitespace-nowrap">Mar 4, 2026</td>
                <td className="py-2">
                  Vouch Gateway deployed at gateway.percival-labs.ai with
                  trust-tiered rate limiting and anomaly detection
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 whitespace-nowrap">2025&ndash;2026</td>
                <td className="py-2">
                  Continuous git commit history documenting ISC methodology
                  development and three-pillar architecture evolution
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
          Document ID: PL-DD-2026-004 &middot; Contact: percyai2025@gmail.com
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

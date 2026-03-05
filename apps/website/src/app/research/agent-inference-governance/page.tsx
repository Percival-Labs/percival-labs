import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title:
    "Per-Agent Policy Enforcement and Budget Management at the AI Inference Proxy Layer — Defensive Disclosure",
  description:
    "A system for enforcing per-agent access policies, spending constraints, and self-service introspection at an inference proxy layer. Published as a defensive disclosure to establish prior art.",
  openGraph: {
    type: "article",
    title:
      "Per-Agent Policy Enforcement and Budget Management at the AI Inference Proxy Layer — Defensive Disclosure",
    description:
      "Per-agent model allowlists, budget caps with automatic resets, and agent self-service APIs at the inference proxy layer. The missing governance surface for multi-agent fleets.",
  },
};

export default function AgentInferenceGovernanceDisclosurePage() {
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
          <span className="text-xs text-pl-text-dim">PL-DD-2026-003</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-pl-text sm:text-4xl leading-tight">
          Per-Agent Policy Enforcement and Budget Management at the AI Inference
          Proxy Layer
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
          Specific implementations, trade secrets, and trademarks are retained
          by Percival Labs.
        </p>
      </div>

      {/* Abstract */}
      <Section title="Abstract">
        <p>
          This disclosure describes a system and method for governing AI agent
          inference access through a proxy layer that enforces per-agent model
          allowlists, budget caps with configurable reset periods, and agent
          self-service introspection APIs&mdash;all without requiring
          modifications to the agents themselves.
        </p>
        <p>
          The system enables platform operators to govern heterogeneous fleets
          of AI agents through a single configuration surface, shifting
          governance enforcement from distributed application code to a
          centralized infrastructure layer positioned between agents and
          upstream model providers.
        </p>
      </Section>

      {/* The Problem */}
      <Section title="1. The Problem">
        <p>
          Organizations deploying multiple AI agents face a compound governance
          challenge spanning three domains: multi-agent policy enforcement,
          budget control, and agent operational awareness. As of March 2026, no
          standardized mechanism exists to address these at the infrastructure
          layer.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          1.1 The Multi-Agent Governance Problem
        </h3>
        <p>
          Each agent may require different model access, different spending
          limits, and different levels of operational visibility. Current
          approaches embed governance logic within each agent&rsquo;s
          application code, creating compounding problems:
        </p>
        <div className="mt-4 space-y-4">
          <ComponentCard
            name="Distributed Enforcement Is Unreliable"
            description="Each agent must correctly implement policy checks. A bug in one agent can result in unauthorized model access or uncontrolled spending. There is no single enforcement point that guarantees compliance across all agents."
          />
          <ComponentCard
            name="Configuration Drift"
            description="Policy changes require updating and redeploying each agent individually. Organizations with dozens or hundreds of agents face operational complexity proportional to fleet size."
          />
          <ComponentCard
            name="No Separation of Concerns"
            description="Agent developers must understand and implement governance logic alongside their domain logic. This conflates two distinct responsibilities and increases the surface area for errors."
          />
          <ComponentCard
            name="Limited Visibility"
            description="Without centralized enforcement, there is no unified view of which agents are consuming which resources at what cost. Audit trails must be aggregated from individual agent logs."
          />
        </div>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          1.2 The Budget Enforcement Problem
        </h3>
        <p>
          AI inference APIs charge per-token, with costs varying by orders of
          magnitude across models&mdash;from $0.25/million tokens for small
          models to $75/million tokens for frontier reasoning models. An agent
          with unrestricted access can accumulate significant costs through:
        </p>
        <div className="mt-4 space-y-4">
          <ComponentCard
            name="Model Selection Errors"
            description="An agent configured to use a $3/million-token model that inadvertently routes to a $75/million-token model due to a configuration error or prompt injection."
          />
          <ComponentCard
            name="Runaway Loops"
            description="An agent caught in a tool-use retry loop generating thousands of requests, each incurring cost."
          />
          <ComponentCard
            name="Prompt Inflation"
            description="Increasingly large context windows (up to 200K tokens per request) mean a single malformed request can cost hundreds of dollars."
          />
        </div>
        <p className="mt-4">
          Existing cloud provider billing operates at the account level with
          monthly invoices. There is no mechanism to enforce spending limits
          per-agent, per-period, at the point of inference. Organizations
          discover overspend after the fact, not before the request is made.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          1.3 The Agent Self-Awareness Problem
        </h3>
        <p>
          AI agents operating autonomously benefit from awareness of their own
          operational constraints. An agent that knows it has consumed 80% of
          its budget can proactively switch to cheaper models or defer
          non-urgent tasks. An agent that knows which models are available to
          it can select appropriately without trial-and-error requests that
          fail with authorization errors. No existing inference infrastructure
          provides agents with self-service APIs for querying their own
          policies, budgets, and usage.
        </p>
      </Section>

      {/* The Solution */}
      <Section title="2. The Solution: Proxy Pipeline">
        <p>
          The system operates as a proxy layer&mdash;implemented as a
          serverless function, edge worker, or reverse proxy&mdash;positioned
          between AI agents and upstream model provider APIs. The proxy
          intercepts all inference requests and applies the following pipeline:
        </p>
        <div className="mt-4 rounded-lg border border-pl-border bg-pl-surface p-5 font-mono text-sm text-pl-text-secondary leading-relaxed">
          <div>Agent Request</div>
          <div className="pl-6">
            <div>&rarr; Authentication (verify agent identity)</div>
            <div>&rarr; Agent Self-Service API (if /agent/* path, return introspection data)</div>
            <div>&rarr; Rate Limiting (per-identity, tier-based)</div>
            <div>&rarr; Body Parsing (extract model from request)</div>
            <div>&rarr; Auto-Route Resolution (resolve provider from model name)</div>
            <div>&rarr; Model Policy Check (verify model in agent&rsquo;s allowlist)</div>
            <div>&rarr; Budget Pre-Check (reject if budget exhausted)</div>
            <div>&rarr; Forward to Upstream Provider</div>
            <div>&rarr; Extract Token Counts from Response</div>
            <div>&rarr; Compute Cost (using pricing table)</div>
            <div>&rarr; Record Budget Spend (async)</div>
            <div>&rarr; Report Usage (async)</div>
            <div>&rarr; Anomaly Detection (async)</div>
            <div>&rarr; Emit Audit Log</div>
            <div>&rarr; Return Response with Governance Headers</div>
          </div>
        </div>
      </Section>

      {/* Per-Agent Configuration */}
      <Section title="3. Per-Agent Configuration">
        <p>
          Each agent is identified by a long-lived authentication token (e.g.,
          a 256-bit random hex string). The token maps to a configuration
          record in a key-value store containing:
        </p>
        <div className="mt-4 space-y-3">
          <DimensionRow
            name="pubkey"
            description="Cryptographic public key for the agent, enabling cross-system identity"
          />
          <DimensionRow
            name="agentId"
            description="Human-readable identifier"
          />
          <DimensionRow
            name="name"
            description="Display name"
          />
          <DimensionRow
            name="tier"
            description='Trust tier override (e.g., "standard", "elevated", "unlimited")'
          />
          <DimensionRow
            name="models"
            description="Array of permitted model identifiers (empty array = all models permitted)"
          />
          <DimensionRow
            name="defaultModel"
            description="Model to inject when request doesn't specify one"
          />
          <DimensionRow
            name="budget"
            description="Object containing maxSats (maximum spend per period) and periodDays (reset interval)"
          />
        </div>
        <p className="mt-4 text-sm text-pl-text-dim">
          This single record is the complete governance configuration for one
          agent. Fleet management reduces to CRUD operations on these records.
          The configuration scales from a solo developer with one agent to an
          enterprise with thousands of agents without architectural changes.
        </p>
      </Section>

      {/* Model Allowlist Matching */}
      <Section title="4. Model Allowlist Matching">
        <p>
          Model identifiers in AI inference APIs use two conventions: bare
          names (e.g., &ldquo;claude-sonnet-4&rdquo;) and provider-prefixed
          names (e.g., &ldquo;anthropic/claude-sonnet-4&rdquo;). The
          proxy&rsquo;s allowlist matching handles both by comparing the bare
          portion of the requested model against the bare portion of each
          allowed model.
        </p>
        <p>
          This means an allowlist entry of &ldquo;claude-sonnet-4&rdquo;
          permits requests for both &ldquo;claude-sonnet-4&rdquo; and
          &ldquo;anthropic/claude-sonnet-4&rdquo;, preventing policy
          circumvention through name format variation.
        </p>
        <p>
          When an inference request arrives without a model field in the
          request body, the proxy injects the agent&rsquo;s configured default
          model before forwarding to the upstream provider, enabling agents to
          operate without hardcoded model names.
        </p>
      </Section>

      {/* Two-Phase Budget Enforcement */}
      <Section title="5. Two-Phase Budget Enforcement">
        <p>
          Budget state per agent is stored as three values: cumulative spend in
          the current period, timestamp when the current period began, and
          timestamp of the most recent spend recording. On each request, the
          proxy executes:
        </p>
        <div className="mt-4 space-y-4">
          <ComponentCard
            name="Phase 1: Pre-Check"
            description="Before forwarding the request to the upstream provider, the proxy reads current budget state, checks if the period has elapsed (resetting to zero if so), and rejects with HTTP 402 if cumulative spend has reached the configured maximum. This avoids unnecessary upstream API costs."
          />
          <ComponentCard
            name="Phase 2: Post-Response Recording"
            description="After receiving the upstream response, the proxy computes actual cost from the response's token usage data and pricing table, then writes the updated spend back to the key-value store asynchronously to avoid adding latency to the response path."
          />
        </div>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          Concurrency Model
        </h3>
        <p>
          Budget tracking uses a read-then-write pattern against a key-value
          store (not a transactional database). Concurrent requests from the
          same agent may result in slight overspend. This mirrors the
          soft-limit model used by cloud infrastructure providers&mdash;an
          acceptable trade-off for the performance benefit of key-value store
          latency versus database transactions.
        </p>
        <p>
          For organizations requiring exact budget enforcement, the system can
          be extended with serialized access via durable objects or distributed
          locks, at the cost of increased latency. Key-value store entries are
          configured with TTL equal to the remaining period plus a buffer,
          ensuring automatic cleanup without manual garbage collection.
        </p>
      </Section>

      {/* Agent Self-Service APIs */}
      <Section title="6. Agent Self-Service APIs">
        <p>
          The proxy exposes authenticated endpoints that agents can call to
          query their own operational state, using the same token they use for
          inference:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Endpoint</th>
                <th className="pb-2 font-medium">Returns</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-mono text-xs text-pl-text">
                  GET /agent/v1/me
                </td>
                <td className="py-2.5">
                  Full configuration: models, tier, budget parameters
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-mono text-xs text-pl-text">
                  GET /agent/v1/me/budget
                </td>
                <td className="py-2.5">
                  Current spend, remaining amount, percent utilized, period
                  boundaries, and actionable warnings
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-mono text-xs text-pl-text">
                  GET /agent/v1/me/usage
                </td>
                <td className="py-2.5">
                  24-hour usage statistics: request counts per hour, models
                  used, average prompt length
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-mono text-xs text-pl-text">
                  GET /agent/v1/models
                </td>
                <td className="py-2.5">
                  Available models and routing guidance
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-pl-text-dim">
          These endpoints do not count against the agent&rsquo;s rate limit,
          enabling agents to check their status without consuming inference
          quota. Budget warnings are actionable (e.g., &ldquo;Budget 80%
          used&mdash;2,000 sats remaining&rdquo;).
        </p>
      </Section>

      {/* Governance Response Headers */}
      <Section title="7. Governance Response Headers">
        <p>
          Every inference response includes headers communicating governance
          state to the agent, enabling informed decisions about subsequent
          requests without requiring a separate API call:
        </p>
        <div className="mt-4 space-y-3">
          <DimensionRow
            name="X-Vouch-Tier"
            description="Current trust tier"
          />
          <DimensionRow
            name="X-Vouch-Rate-Remaining"
            description="Remaining requests in rate limit window"
          />
          <DimensionRow
            name="X-Vouch-Model"
            description="Model that was actually used"
          />
          <DimensionRow
            name="X-Vouch-Provider"
            description="Upstream provider that handled the request"
          />
          <DimensionRow
            name="X-Vouch-Cost-Sats"
            description="Estimated cost of this request"
          />
          <DimensionRow
            name="X-Vouch-Budget-Max"
            description="Agent's total budget cap"
          />
          <DimensionRow
            name="X-Vouch-Budget-Cost"
            description="Cost charged against budget for this request"
          />
          <DimensionRow
            name="X-Vouch-Input-Tokens / X-Vouch-Output-Tokens"
            description="Token counts from the upstream response"
          />
        </div>
      </Section>

      {/* Structured Audit Logging */}
      <Section title="8. Structured Audit Logging">
        <p>
          The proxy emits machine-parseable structured log entries for every
          request at every governance decision point. Each entry records:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Field</th>
                <th className="pb-2 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Action Type
                </td>
                <td className="py-2.5">
                  inference, rate-limited, budget-exceeded, model-blocked,
                  auth-failed
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Identity
                </td>
                <td className="py-2.5">
                  Authenticated agent identity (truncated for privacy)
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Model &amp; Provider
                </td>
                <td className="py-2.5">
                  Requested model and upstream provider that handled it
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Cost Data
                </td>
                <td className="py-2.5">
                  Token counts, estimated cost, HTTP status code
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Governance Context
                </td>
                <td className="py-2.5">
                  Trust tier, request duration&mdash;no request or response
                  bodies (preserving prompt privacy)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-pl-text-dim">
          This creates a complete audit trail suitable for compliance reporting
          without logging prompt content.
        </p>
      </Section>

      {/* Trust-Tier Integration */}
      <Section title="9. Trust-Tier Integration">
        <p>
          Agent identities are associated with both a configured trust tier
          (determining rate limits) and a trust score from an external scoring
          system. The proxy uses the higher of the two&mdash;configured tier or
          score-derived tier&mdash;enabling agents to &ldquo;earn&rdquo; higher
          rate limits through demonstrated trustworthiness while maintaining a
          minimum floor configured by the platform operator.
        </p>
        <p>
          Platform administration APIs, separately authenticated from agent
          credentials using a platform-level secret, enable programmatic fleet
          management: creating, reading, updating, and deleting agent identity
          configurations without direct access to the underlying key-value
          store.
        </p>
      </Section>

      {/* Novel Contributions */}
      <Section title="10. Novel Contributions">
        <p>
          The following aspects are believed to be novel as of the filing date:
        </p>
        <ol className="list-decimal pl-6 space-y-2 mt-3 text-pl-text-secondary">
          <li>
            Enforcement of per-agent model access policies at an inference
            proxy layer rather than within agent application code, using
            configurable allowlists with bare/prefixed model name matching
          </li>
          <li>
            Per-agent budget caps with configurable reset periods enforced at
            the point of inference, with two-phase enforcement (pre-check
            before upstream call, spend recording after)
          </li>
          <li>
            Agent self-service introspection APIs co-located with the inference
            proxy, enabling agents to query their own governance state through
            the same endpoint they use for inference
          </li>
          <li>
            A universal agent configuration surface wherein all governance
            parameters for an agent are stored as a single serialized record,
            scaling from single-agent to enterprise-fleet without architectural
            changes
          </li>
          <li>
            Structured audit logging at every governance decision point in the
            inference proxy pipeline, recording governance metadata without
            prompt content
          </li>
          <li>
            Governance state communicated via response headers on every
            inference response, enabling agents to adapt behavior without
            separate API calls
          </li>
          <li>
            Platform administration APIs for programmatic fleet management of
            agent governance configurations, separately authenticated from
            agent credentials
          </li>
          <li>
            Integration of trust-tier systems with per-agent policy
            enforcement, using the higher of configured and earned trust levels
          </li>
        </ol>
      </Section>

      {/* Prior Art Established */}
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
                  for AI Model Inference APIs (establishes staking, vouching,
                  and slashing primitives)
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Feb 24, 2026</td>
                <td className="py-2">
                  Defensive Disclosure PL-DD-2026-002: Economic Accountability
                  Layer for AI Agent Tool-Use Protocol Governance (establishes
                  overlay governance for tool-use protocols)
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Mar 4, 2026</td>
                <td className="py-2">
                  Vouch Gateway v0.2.0 deployed with NIP-98 auth,
                  trust-tiered rate limiting, blind signature privacy tokens,
                  and anomaly detection (3 providers: Anthropic, OpenAI,
                  OpenRouter)
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">Feb 22, 2026</td>
                <td className="py-2">
                  Vouch Agent SDK and API deployed with Nostr identity, NIP-98
                  auth, and trust scoring
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 whitespace-nowrap">2025&ndash;2026</td>
                <td className="py-2">
                  Continuous git commit history documenting protocol
                  development including inference proxy governance concepts
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-pl-border">
        <p className="text-sm text-pl-text-dim leading-relaxed">
          Filed as a defensive disclosure by Percival Labs, Bellingham, WA,
          USA. This document constitutes prior art under 35 U.S.C. 102(a)(1).
          The described protocol-level concepts are dedicated to the public
          domain for the purpose of preventing patent claims. All rights to
          specific implementations, trade secrets, and trademarks are reserved.
        </p>
        <p className="text-sm text-pl-text-dim mt-3">
          Document ID: PL-DD-2026-003 &middot; Contact: percyai2025@gmail.com
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

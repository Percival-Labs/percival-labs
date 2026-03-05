# Defensive Disclosure: Per-Agent Policy Enforcement and Budget Management at the AI Inference Proxy Layer

**Publication Type:** Defensive Disclosure / Technical Disclosure
**Filing Date:** March 5, 2026
**Inventors:** Alan Carroll (Bellingham, WA, USA)
**Assignee:** Percival Labs LLC (Bellingham, WA, USA)
**Document ID:** PL-DD-2026-003

---

## Notice

This document constitutes a defensive disclosure under the provisions of the America Invents Act (AIA), 35 U.S.C. 102(a)(1). It is published to establish prior art and prevent the patenting of the described methods, systems, and techniques by any party. The authors explicitly dedicate the described protocol-level concepts to the public domain for the purpose of prior art establishment, while reserving all rights to specific implementations, trade secrets, and trademarks.

---

## 1. Technical Field

This disclosure relates to methods and systems for enforcing per-agent access policies and spending constraints at an inference proxy layer positioned between AI agents and upstream model providers, and more particularly to systems that apply configurable model allowlists, budget caps with automatic period-based resets, and agent self-service introspection APIs within a trust-authenticated inference gateway, enabling platform operators to govern heterogeneous fleets of AI agents through a single configuration surface without requiring changes to the agents themselves.

---

## 2. Background

### 2.1 The Multi-Agent Governance Problem

Organizations deploying multiple AI agents face a compound governance challenge. Each agent may require different model access (a customer-facing agent restricted to low-cost models, a research agent permitted to use expensive reasoning models), different spending limits (a prototype agent capped at $10/month, a production agent budgeted at $5,000/month), and different levels of operational visibility. As of March 2026, no standardized mechanism exists to enforce these policies at the infrastructure layer.

Current approaches require governance logic to be embedded within each agent's application code. This creates several problems:

**Distributed enforcement is unreliable:** Each agent must correctly implement policy checks. A bug in one agent can result in unauthorized model access or uncontrolled spending. There is no single enforcement point that guarantees compliance across all agents.

**Configuration drift:** Policy changes require updating and redeploying each agent individually. Organizations with dozens or hundreds of agents face operational complexity proportional to fleet size.

**No separation of concerns:** Agent developers must understand and implement governance logic alongside their domain logic. This conflates two distinct responsibilities and increases the surface area for errors.

**Limited visibility:** Without centralized enforcement, there is no unified view of which agents are consuming which resources at what cost. Audit trails must be aggregated from individual agent logs.

### 2.2 The Budget Enforcement Problem

AI inference APIs charge per-token, with costs varying by orders of magnitude across models (from $0.25/million tokens for small models to $75/million tokens for frontier reasoning models). An agent with unrestricted access can accumulate significant costs through:

**Model selection errors:** An agent configured to use a $3/million-token model that inadvertently routes to a $75/million-token model due to a configuration error or prompt injection.

**Runaway loops:** An agent caught in a tool-use retry loop generating thousands of requests, each incurring cost.

**Prompt inflation:** Increasingly large context windows (up to 200K tokens per request) mean a single malformed request can cost hundreds of dollars.

Existing cloud provider billing operates at the account level with monthly invoices. There is no mechanism to enforce spending limits per-agent, per-period, at the point of inference. Organizations discover overspend after the fact, not before the request is made.

### 2.3 The Agent Self-Awareness Problem

AI agents operating autonomously benefit from awareness of their own operational constraints. An agent that knows it has consumed 80% of its budget can proactively switch to cheaper models or defer non-urgent tasks. An agent that knows which models are available to it can select appropriately without trial-and-error requests that fail with authorization errors. No existing inference infrastructure provides agents with self-service APIs for querying their own policies, budgets, and usage.

---

## 3. Summary of the Disclosure

This disclosure describes a system and method for governing AI agent inference access through a proxy layer comprising the following elements:

1. **Per-agent model allowlist enforcement at the proxy layer** wherein each agent identity (authenticated via long-lived token, cryptographic signature, or other credential) is associated with a configurable list of permitted model identifiers, and the proxy intercepts inference requests, extracts the requested model identifier from the request body, and rejects requests for models not in the agent's allowlist before forwarding to any upstream provider, with matching logic that handles both bare model names (e.g., "claude-sonnet-4") and provider-prefixed names (e.g., "anthropic/claude-sonnet-4") as equivalent

2. **Per-agent default model injection** wherein the proxy configuration specifies a default model for each agent identity, and when an inference request arrives without a model field in the request body, the proxy injects the configured default model before forwarding to the upstream provider, enabling agents to operate without hardcoded model names

3. **Per-agent budget caps with configurable reset periods** wherein each agent identity is associated with a maximum spend amount (denominated in any unit: tokens, currency, or cryptographic units) and a period duration (e.g., 7 days, 30 days, 365 days), and the proxy tracks cumulative spend per agent per period in a key-value store, automatically resetting the counter when the configured period elapses, rejecting requests when the cumulative spend reaches the configured maximum, and computing spend from token counts and pricing data extracted from upstream provider responses

4. **Two-phase budget enforcement** wherein the proxy performs a pre-check before forwarding the request to the upstream provider (rejecting if the agent's budget is already exhausted, thereby avoiding unnecessary upstream API costs) and a post-response spend recording after receiving the upstream response and computing actual token costs, with the post-response recording performed asynchronously to avoid adding latency to the response path

5. **Agent self-service introspection API** wherein the same proxy that handles inference requests also exposes authenticated endpoints that agents can call to query their own operational state, including: (a) their configured model allowlist and default model, (b) their current budget spend and remaining amount for the current period with percentage utilization, (c) their recent usage statistics including request counts, models used, and average prompt lengths, and (d) actionable warnings when budget utilization exceeds configurable thresholds (e.g., "Budget 80% used — 2,000 sats remaining")

6. **Platform administration API** wherein the proxy exposes separately-authenticated management endpoints (using a platform-level secret distinct from agent credentials) for creating, reading, updating, and deleting agent identity configurations, including model allowlists and budget parameters, and for querying any agent's current budget spend state, enabling programmatic fleet management without direct access to the underlying key-value store

7. **Structured audit logging at every governance decision point** wherein the proxy emits machine-parseable structured log entries for every request, recording: the action type (inference, rate-limited, budget-exceeded, model-blocked, auth-failed), the authenticated identity (truncated for privacy), the requested model, the upstream provider, the HTTP status code, token counts, estimated cost, trust tier, and request duration, creating a complete audit trail suitable for compliance reporting without logging request or response bodies (preserving prompt privacy)

8. **Trust-tier integration with per-agent policies** wherein agent identities are associated with both a configured trust tier (determining rate limits) and a trust score from an external scoring system, and the proxy uses the higher of the two (configured tier or score-derived tier), enabling agents to "earn" higher rate limits through demonstrated trustworthiness while maintaining a minimum floor configured by the platform operator

9. **Universal agent configuration surface** wherein all per-agent governance parameters (model allowlist, default model, budget cap, budget period, trust tier override) are stored as a single serialized configuration object per agent identity in a key-value store, keyed by authentication token, creating a single configuration surface that scales from a solo developer with one agent to an enterprise with thousands of agents without architectural changes

---

## 4. Detailed Description

### 4.1 System Architecture

The system operates as a proxy layer (implemented as a serverless function, edge worker, or reverse proxy) positioned between AI agents and upstream model provider APIs. The proxy intercepts all inference requests and applies the following pipeline:

```
Agent Request
    → Authentication (verify agent identity)
    → Agent Self-Service API (if /agent/* path, return introspection data)
    → Rate Limiting (per-identity, tier-based)
    → Body Parsing (extract model from request)
    → Auto-Route Resolution (resolve provider from model name)
    → Model Policy Check (verify model in agent's allowlist)
    → Budget Pre-Check (reject if budget exhausted)
    → Forward to Upstream Provider
    → Extract Token Counts from Response
    → Compute Cost (using pricing table)
    → Record Budget Spend (async)
    → Report Usage (async)
    → Anomaly Detection (async)
    → Emit Audit Log
    → Return Response with Governance Headers
```

### 4.2 Agent Identity and Configuration

Each agent is identified by a long-lived authentication token (e.g., a 256-bit random hex string). The token maps to a configuration record in a key-value store containing:

- **pubkey:** Cryptographic public key for the agent (enabling cross-system identity)
- **agentId:** Human-readable identifier
- **name:** Display name
- **tier:** Trust tier override (e.g., "standard", "elevated", "unlimited")
- **models:** Array of permitted model identifiers (empty array = all models permitted)
- **defaultModel:** Model to inject when request doesn't specify one
- **budget:** Object containing `maxSats` (maximum spend per period) and `periodDays` (reset interval)

This single record is the complete governance configuration for one agent. Fleet management reduces to CRUD operations on these records.

### 4.3 Model Allowlist Matching

Model identifiers in AI inference APIs use two conventions: bare names (e.g., "claude-sonnet-4") and provider-prefixed names (e.g., "anthropic/claude-sonnet-4"). The proxy's allowlist matching handles both by comparing the bare portion of the requested model against the bare portion of each allowed model. This means an allowlist entry of "claude-sonnet-4" permits requests for both "claude-sonnet-4" and "anthropic/claude-sonnet-4", preventing policy circumvention through name format variation.

### 4.4 Budget Tracking State Machine

Budget state per agent is stored as:
- **spentSats:** Cumulative spend in the current period
- **periodStart:** Timestamp when the current period began
- **lastUpdated:** Timestamp of most recent spend recording

On each request, the proxy:
1. Reads the current budget state from the key-value store
2. Checks if `(now - periodStart) >= (periodDays * 86400000ms)` — if so, resets to zero spend with current timestamp as new period start
3. Compares `spentSats` against `maxSats` — if exceeded, rejects with HTTP 402
4. After successful inference, computes actual cost from the response's token usage data and pricing table, then writes the updated spend back to the key-value store asynchronously

The key-value store entries are configured with time-to-live (TTL) equal to the remaining period plus a buffer, ensuring automatic cleanup of expired budget state without manual garbage collection.

### 4.5 Agent Self-Service Endpoints

The proxy exposes the following endpoints authenticated via the same agent token used for inference:

- `GET /agent/v1/me` — Returns the agent's full configuration (models, tier, budget parameters)
- `GET /agent/v1/me/budget` — Returns current spend, remaining amount, percent utilized, period boundaries, and actionable warnings
- `GET /agent/v1/me/usage` — Returns 24-hour usage statistics (request counts per hour, models used, average prompt length)
- `GET /agent/v1/models` — Returns the agent's available models and routing guidance

These endpoints do not count against the agent's rate limit, enabling agents to check their status without consuming inference quota.

### 4.6 Governance Response Headers

Every inference response includes headers communicating governance state to the agent:

- `X-Vouch-Tier` — Current trust tier
- `X-Vouch-Rate-Remaining` — Remaining requests in rate limit window
- `X-Vouch-Model` — Model that was actually used
- `X-Vouch-Provider` — Upstream provider that handled the request
- `X-Vouch-Cost-Sats` — Estimated cost of this request
- `X-Vouch-Budget-Max` — Agent's total budget cap
- `X-Vouch-Budget-Cost` — Cost charged against budget for this request
- `X-Vouch-Input-Tokens` / `X-Vouch-Output-Tokens` — Token counts

This enables agents to make informed decisions about subsequent requests without requiring a separate API call.

### 4.7 Concurrency Considerations

Budget tracking uses a read-then-write pattern against a key-value store (not a transactional database). Concurrent requests from the same agent may result in slight overspend (up to `(concurrency - 1) * cost_per_request`). This is an acceptable trade-off for the performance benefit of key-value store latency versus database transactions. The pre-check (step 4.4.3) prevents requests when the budget is clearly exhausted, and the next request cycle enforces the updated spend. This mirrors the soft-limit model used by cloud infrastructure providers.

For organizations requiring exact budget enforcement, the system can be extended with serialized access via durable objects or distributed locks, at the cost of increased latency.

---

## 5. Novel Contributions

This disclosure identifies the following contributions to the public domain:

1. The enforcement of per-agent model access policies at an inference proxy layer rather than within agent application code, using configurable allowlists with bare/prefixed model name matching
2. Per-agent budget caps with configurable reset periods enforced at the point of inference, with two-phase enforcement (pre-check before upstream call, spend recording after)
3. Agent self-service introspection APIs co-located with the inference proxy, enabling agents to query their own governance state through the same endpoint they use for inference
4. A universal agent configuration surface wherein all governance parameters for an agent are stored as a single serialized record, scaling from single-agent to enterprise-fleet without architectural changes
5. Structured audit logging at every governance decision point in the inference proxy pipeline, recording governance metadata without prompt content
6. Governance state communicated via response headers on every inference response, enabling agents to adapt behavior without separate API calls
7. Platform administration APIs for programmatic fleet management of agent governance configurations, separately authenticated from agent credentials
8. Integration of trust-tier systems with per-agent policy enforcement, using the higher of configured and earned trust levels

---

## 6. Claims Dedicated to Public Domain

The following methods, systems, and techniques are hereby dedicated to the public domain for the purpose of prior art establishment:

- Any method of enforcing per-agent model access policies at an inference proxy layer using configurable allowlists
- Any method of per-agent budget enforcement with configurable reset periods at an inference proxy layer
- Any system for agent self-service introspection APIs co-located with an inference proxy
- Any method of two-phase budget enforcement (pre-check before upstream call, spend recording after response)
- Any system for communicating governance state to agents via inference response headers
- Any method of universal agent configuration via single serialized records in a key-value store
- Any system for structured audit logging at governance decision points in an inference proxy pipeline
- Any method of combining configured trust tiers with earned trust scores for per-agent access control

---

*This disclosure is published to establish prior art. The described protocol-level concepts are dedicated to the public domain. All rights to specific implementations, trade secrets, trademarks, and commercial products are reserved by Percival Labs LLC.*

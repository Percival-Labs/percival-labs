# Defensive Disclosure: Ideal State Criteria as a Runtime Quality Primitive for AI Agents and Unified Agent Operating System Architecture

**Publication Type:** Defensive Disclosure / Technical Disclosure
**Filing Date:** March 5, 2026
**Inventors:** Alan Carroll (Bellingham, WA, USA)
**Assignee:** Percival Labs LLC (Bellingham, WA, USA)
**Document ID:** PL-DD-2026-004

---

## Notice

This document constitutes a defensive disclosure under the provisions of the America Invents Act (AIA), 35 U.S.C. 102(a)(1). It is published to establish prior art and prevent the patenting of the described methods, systems, and techniques by any party. The authors explicitly dedicate the described protocol-level concepts to the public domain for the purpose of prior art establishment, while reserving all rights to specific implementations, trade secrets, and trademarks.

---

## 1. Technical Field

This disclosure relates to two interconnected inventions: (1) methods and systems for defining, tracking, and verifying quality criteria as a runtime primitive within AI agent execution, wherein discrete binary testable criteria are automatically generated from task descriptions, continuously tracked during agent execution phases, and verified before marking work complete, and (2) a unified agent operating system architecture comprising three integrated pillars — a skill definition framework, a trust-authenticated inference routing gateway, and a governance and scoring system — that together provide a complete, configurable platform for defining, routing, and governing AI agents from a single codebase serving individual developers through enterprise organizations.

---

## 2. Background

### 2.1 The AI Agent Quality Assurance Problem

AI agents executing multi-step tasks produce outputs of variable quality. As of March 2026, quality assurance for AI agent output relies on one or more of the following approaches:

**Human review:** A human inspects the agent's output after completion. This is effective but does not scale, introduces latency, and provides no feedback during execution that could prevent quality degradation before it compounds.

**Unit testing of deterministic components:** Tests verify that deterministic code paths produce expected outputs. However, the non-deterministic nature of LLM-generated content means that the most important aspects of agent output — relevance, completeness, accuracy, tone — cannot be verified by deterministic tests.

**LLM-as-judge evaluation:** A separate LLM evaluates the output of the primary LLM against a rubric. This is useful for batch evaluation but is typically applied post-hoc, not integrated into the agent's execution loop.

**Benchmark suites:** Standardized benchmarks (e.g., SWE-bench, HumanEval) measure agent capability across predefined tasks. These evaluate agent potential, not the quality of a specific real-world task execution.

None of these approaches provide a mechanism for **continuous quality tracking during agent execution** — defining what "done right" means for a specific task at the start, tracking progress toward that definition during execution, and verifying all criteria are met before marking the task complete. The gap between "task started" and "task reviewed" is a quality blind spot.

### 2.2 The Fragmented Agent Infrastructure Problem

Organizations deploying AI agents must assemble infrastructure from disconnected components:

**Skill/prompt management:** Stored as files, database entries, or hardcoded strings with no standardized format for defining what an agent knows and how it should behave.

**Model access:** Each agent manages its own API keys, model selection, and provider failover logic. There is no shared infrastructure for routing inference requests across a fleet.

**Governance:** Access control, spending limits, usage tracking, and audit trails are implemented per-agent or not at all. No unified system governs agent behavior across an organization.

**Trust/reputation:** Agent quality is evaluated informally (if at all). There is no mechanism for quality metrics from one agent's execution to inform governance decisions (rate limits, budget allocations, model access) for that agent going forward.

These components exist in isolation. Connecting them requires custom integration work per deployment. There is no architecture that provides all four as a unified, configurable platform.

---

## 3. Summary of the Disclosure

### Part A: Ideal State Criteria as a Runtime Primitive

This disclosure describes a system and method for AI agent quality assurance comprising:

1. **Automatic ISC generation from task descriptions** wherein the agent execution runtime parses a natural language task description and generates a set of discrete, binary, testable criteria (termed "Ideal State Criteria" or ISC) that define what successful completion looks like, organized as positive criteria (conditions that MUST be true), anti-criteria (conditions that must NOT be true), and priority tiers (critical, important, nice-to-have), each with an explicit verification method

2. **Phase-boundary ISC tracking** wherein the runtime automatically outputs the current state of all criteria at defined phase boundaries during agent execution (e.g., after research, after implementation, after testing), recording which criteria have been newly added, modified, removed, passed, or failed since the last boundary, creating a continuous quality signal throughout execution rather than only at completion

3. **ISC-gated completion** wherein the agent runtime prevents marking a task as complete until all critical-tier criteria pass verification, with the verification method specified for each criterion (e.g., "file exists at path", "test suite passes", "output contains required section"), and any failed critical criterion triggers a remediation loop before completion is permitted

4. **Circuit breaker anti-criteria** wherein the runtime monitors for predefined failure patterns during execution — including repeated failed approaches (same approach attempted N+ times), core assumption invalidation, scope expansion beyond the original plan, workaround depth exceeding a threshold (writing workarounds for workarounds), and changes to code outside the planned scope — and automatically halts execution when any anti-criterion is violated, requiring explicit human approval before resuming

5. **ISC evolution tracking** wherein criteria are permitted to change during execution (as understanding deepens), and every change is captured as a delta record including the original criterion text, the modified text, the reason for change, and the phase at which the change occurred, enabling post-execution analysis of how task understanding evolved and feeding back into improved initial ISC generation for future similar tasks

6. **Ship gate verification** wherein a final verification pass is mandated before any implementation is marked complete, checking meta-criteria including: the solution is the simplest that works, no code review objections are anticipated (the agent reviews its own diff), no hidden concerns exist (the agent must state its worst worry), the approach is explainable in one sentence, adjacent systems are unaffected, and no temporary hacks remain in changed files

7. **ISC as a quality signal for external systems** wherein the ISC pass/fail results, criteria evolution deltas, and circuit breaker violations are emitted as structured data that can be consumed by external governance systems to inform trust scoring, budget allocation, and access control decisions for the agent — creating a feedback loop where demonstrated quality (as measured by ISC compliance) translates to operational privileges

### Part B: Unified Agent Operating System Architecture

This disclosure describes a system architecture comprising three integrated pillars:

8. **Skill Definition Framework (Pillar 1: Define)** wherein AI agent capabilities are defined through structured skill documents containing: identity rules (name, voice, behavioral constraints), domain knowledge (context the agent needs), task-specific instructions (how to perform particular types of work), tool definitions (what tools the agent can use and how), and quality criteria templates (ISC patterns applicable to the skill's domain), with skills composable into harnesses that define a complete agent personality and capability set, and with a standard export format enabling skills authored in one framework to execute in different runtimes

9. **Trust-Authenticated Inference Gateway (Pillar 2: Route)** wherein a proxy layer handles all inference routing for all agents in an organization, providing: auto-routing that resolves the optimal provider for any model name, per-agent model policies and budget caps (as described in PL-DD-2026-003), trust-tiered rate limiting based on external trust scores, structured audit logging, and agent self-service APIs — operating as a shared service that all agents use for inference without managing their own provider credentials or routing logic

10. **Governance and Scoring System (Pillar 3: Govern)** wherein agent behavior is evaluated through a trust scoring system that consumes signals from both the inference gateway (usage patterns, cost efficiency, anomaly flags) and the skill execution runtime (ISC compliance rates, circuit breaker violations, criteria evolution stability), producing a composite trust score that feeds back into the gateway's access control decisions, creating a closed loop where agent quality directly determines operational privileges

11. **Three-pillar integration pattern** wherein the three pillars communicate through defined interfaces: the skill framework emits ISC results and execution metadata, the gateway emits usage records and anomaly flags, and the governance system consumes both signal streams to produce trust scores that the gateway consumes for access control — with each pillar independently deployable and replaceable, connected through standard data formats rather than tight coupling

12. **Configuration-over-customization scaling** wherein the entire platform serves organizations of any size through configuration rather than custom code: a solo developer creates one agent identity with one skill and no budget cap, while an enterprise creates hundreds of agent identities with role-specific model allowlists, departmental budgets, and compliance-grade audit trails — using the same codebase, the same APIs, and the same architecture, with the only difference being the configuration data in the key-value store

---

## 4. Detailed Description

### 4.1 ISC Runtime Engine

The ISC runtime operates as a library integrated into the agent execution environment. It provides the following API:

**Generation:** `generateISC(taskDescription: string) → ISCSet` — Parses a task description and produces a set of criteria. Generation uses the agent's LLM to analyze the task and produce criteria in a structured format:
```
ISC-C1: [8-12 word criterion] | Verify: [verification method] | Priority: CRITICAL
ISC-C2: [8-12 word criterion] | Verify: [verification method] | Priority: IMPORTANT
ISC-A1: [anti-criterion — must NOT happen] | Verify: [detection method] | Priority: CRITICAL
```

**Tracking:** `trackPhase(phase: string, criteria: ISCSet) → ISCDelta` — Records the current state of all criteria, computes the delta from the previous phase boundary, and outputs a structured tracker:
```
ISC TRACKER
Phase: [current phase]
Criteria: [X] total (+N added, -M removed, ~K modified)
Anti: [X] total
Status: [N passed / M pending / K failed]
Changes this phase:
  + ISC-C4: new criterion added | Verify: method
  ~ ISC-C2: criterion refined (was: old text) | Verify: method
  - ISC-C3: removed (reason)
```

**Verification:** `verify(criteria: ISCSet) → VerificationResult` — Executes the verification method for each criterion and returns pass/fail for each, blocking completion if any CRITICAL criterion fails.

**Circuit Breaker:** `checkCircuitBreakers(executionState: ExecutionState) → CircuitBreakerResult` — Evaluates anti-criteria against the current execution state, returning a halt signal if any are violated.

### 4.2 ISC-to-Governance Signal Flow

ISC results are emitted as structured events:
```json
{
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
  "failedCriteria": ["ISC-C3: Community response posted within 1 hour"]
}
```

The governance system consumes these events and incorporates them into the agent's trust score:
- Consistently high ISC compliance → trust score increases → higher rate limits, budget headroom
- Repeated circuit breaker violations → trust score decreases → tighter rate limits, human review required
- High criteria evolution (criteria changing frequently) → signals task understanding instability → no score impact but flagged for operator review

### 4.3 Three-Pillar Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   DEFINE     │     │    ROUTE     │     │   GOVERN     │
│  (Engram)    │     │  (Gateway)   │     │   (Vouch)    │
│              │     │              │     │              │
│ Skills       │     │ Auto-route   │     │ Trust scores │
│ Harnesses    │────▶│ Model policy │◀───▶│ ISC signals  │
│ ISC runtime  │     │ Budget caps  │     │ Usage signals│
│ Export format │     │ Audit logs   │     │ Anomaly flags│
│              │     │ Agent API    │     │ Performance  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       │   ISC results      │  Usage records      │
       └───────────────────▶│◀────────────────────┘
                            │
                     Trust score feeds
                     back to Gateway
                     access control
```

Each pillar is independently deployable:
- An organization can use only the skill framework (Pillar 1) with any inference provider
- An organization can use only the gateway (Pillar 2) with agents built on any framework
- An organization can use only the governance system (Pillar 3) with any infrastructure
- The full value emerges when all three are connected, but no pillar requires the others

### 4.4 Configuration Surface

The entire platform's per-agent configuration fits in a single JSON record:

```json
{
  "pubkey": "hex-encoded-public-key",
  "agentId": "customer-support-bot",
  "name": "Customer Support Agent",
  "createdAt": "2026-03-05T00:00:00Z",
  "tier": "standard",
  "models": ["anthropic/claude-haiku-4-5", "anthropic/claude-sonnet-4"],
  "defaultModel": "anthropic/claude-haiku-4-5",
  "budget": {
    "maxSats": 50000,
    "periodDays": 30
  }
}
```

Scaling from 1 agent to 10,000 agents requires creating 9,999 more records of this shape. No code changes, no architectural changes, no additional infrastructure. The gateway, governance system, and skill framework all reference this same configuration surface.

---

## 5. Novel Contributions

This disclosure identifies the following contributions to the public domain:

1. Ideal State Criteria as a runtime primitive for AI agent quality assurance, with automatic generation from task descriptions, continuous tracking at phase boundaries, and verification-gated completion
2. Circuit breaker anti-criteria that automatically halt agent execution when predefined failure patterns are detected, requiring explicit human approval to resume
3. ISC evolution tracking that captures how task understanding changes during execution, enabling meta-learning about initial criterion generation quality
4. Ship gate verification as a mandatory final quality check before any agent implementation is marked complete
5. ISC compliance as a signal consumed by external governance systems to inform trust scoring and access control decisions, creating a quality-to-privilege feedback loop
6. A three-pillar agent operating system architecture (Define → Route → Govern) where each pillar is independently deployable but produces emergent value when connected
7. Configuration-over-customization scaling where the same codebase and architecture serves solo developers through enterprise organizations with configuration data as the only variable
8. Closed-loop agent governance where quality metrics (ISC) and usage metrics (inference gateway) both feed trust scoring that in turn controls agent operational privileges

---

## 6. Claims Dedicated to Public Domain

The following methods, systems, and techniques are hereby dedicated to the public domain for the purpose of prior art establishment:

- Any method of automatically generating binary testable quality criteria from AI agent task descriptions as a runtime primitive
- Any method of tracking quality criteria state at phase boundaries during AI agent execution
- Any method of gating AI agent task completion on verification of quality criteria
- Any system of circuit breaker anti-criteria that halt AI agent execution upon detecting predefined failure patterns
- Any method of tracking quality criteria evolution during AI agent execution for meta-learning purposes
- Any system of mandatory ship gate verification before AI agent implementations are marked complete
- Any method of consuming AI agent quality metrics as input to trust scoring systems that control the agent's operational privileges
- Any architecture comprising integrated skill definition, inference routing, and governance pillars as a unified agent operating system
- Any method of scaling an agent governance platform from individual to enterprise use through configuration data alone without architectural changes
- Any system of closed-loop agent governance where quality metrics and usage metrics jointly determine trust scores that control agent access

---

*This disclosure is published to establish prior art. The described protocol-level concepts are dedicated to the public domain. All rights to specific implementations, trade secrets, trademarks, and commercial products are reserved by Percival Labs LLC.*

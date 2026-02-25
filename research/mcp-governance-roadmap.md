# Vouch MCP Governance Layer — Framework & Implementation Roadmap

**Version:** 0.1.0-draft
**Date:** 2026-02-24
**Status:** DRAFT — Strategic Planning
**Authors:** Alan Carroll, Percival Labs
**Document ID:** PL-ROADMAP-2026-001

---

## Executive Summary

The Model Context Protocol (MCP) ecosystem has grown to 8,600+ servers, 97 million monthly SDK downloads, and 300+ client integrations — but 41% of official registry servers lack authentication, 30 CVEs emerged in January-February 2026 alone, and the protocol provides capability without accountability. Anthropic donated MCP to the Agentic AI Foundation (AAIF) in December 2025, signaling that governance should be community-owned. Yet the AAIF's 146 members provide organizational governance but not technical enforcement.

This document proposes a Vouch-based governance layer for MCP that introduces **economic accountability** at the tool-use boundary — the point where an agent's autonomous decisions become real-world actions. The framework is designed to be adopted incrementally, require no protocol-level changes to MCP itself, and operate as an optional overlay that earns adoption through demonstrated value.

---

## 1. Problem Analysis

### 1.1 The Trust Gap in MCP

MCP solved the **interoperability problem** (connect any LLM to any tool via a standard protocol). It did not solve the **trust problem** (should this agent be allowed to use this tool with these parameters?).

The current MCP stack provides three layers of trust:

| Layer | Mechanism | What It Proves | What It Doesn't Prove |
|-------|-----------|----------------|----------------------|
| **Identity** | Namespace-verified registry | Who published the server | Whether they're trustworthy |
| **Authorization** | OAuth 2.1 (spec-mandated) | The user approved access | Whether the agent should use it |
| **Provenance** | Sigstore/attestations (Stacklok) | The code hasn't been tampered with | Whether the behavior is safe |

The missing layer:

| Layer | Mechanism | What It Proves |
|-------|-----------|----------------|
| **Accountability** | Economic staking (Vouch) | Misbehavior has real consequences |

### 1.2 Attack Surface Taxonomy

Based on documented CVEs and security research (Invariant Labs, Unit 42, Kaspersky, Authzed), the MCP attack surface decomposes into four layers:

**Layer 1 — Shell/Exec Injection (43% of CVEs):** Unsanitized inputs passed to `exec()` or shell commands. Classic injection attacks amplified by the agent-as-user pattern. Vouch relevance: LOW — this is a server implementation bug, not a trust problem.

**Layer 2 — Tool Poisoning & Rug Pulls (Core structural vulnerability):** Malicious metadata in tool descriptions exploits the LLM's inability to distinguish data from instruction. Rug pulls silently mutate tool definitions after initial approval. Vouch relevance: HIGH — economic accountability creates consequences for servers that poison or mutate.

**Layer 3 — Cross-Server Contagion:** A malicious server in a multi-server agent context can shadow or intercept calls to trusted servers. The WhatsApp exfiltration attack (Invariant Labs) demonstrated full message history theft via a seemingly benign "random fact" server. Vouch relevance: HIGH — trust scoring enables agents to evaluate server trustworthiness before granting cross-server access.

**Layer 4 — Authorization & Consent Attacks:** OAuth confused-deputy vulnerabilities, ConsentFix consent grant hijacking, and supply chain attacks via compromised MCP packages. 437,000 developer environments compromised via `mcp-remote` CVE-2025-6514. Vouch relevance: MEDIUM — economic identity provides a trust signal independent of OAuth token validity.

### 1.3 What Exists Today

| Initiative | Approach | Limitation |
|-----------|----------|-----------|
| **AAIF Governance** | Organizational (Linux Foundation) | No technical enforcement |
| **OAuth 2.1 Spec** | Authorization standard | 41% of servers don't implement it |
| **Stacklok ToolHive** | Cryptographic attestation | Proves provenance, not trustworthiness |
| **Salesforce Agentforce** | Enterprise registry | Proprietary, closed ecosystem |
| **MCP-Guard** | Neural threat detection (96% accuracy) | Detection without consequence |
| **OpenAI Read-Only Restriction** | Capability constraint | Limits utility, doesn't add trust |
| **Namespace Registry** | Verified publishing | Prevents namespace squatting, not behavior |

None of these create **economic consequences for misbehavior**. They are all mechanism-level defenses. Vouch provides the incentive-level defense.

---

## 2. Architecture: Vouch as MCP Governance Layer

### 2.1 Design Principles

1. **Overlay, not fork.** Vouch operates alongside MCP, not as a replacement. No protocol changes to MCP required.
2. **Opt-in adoption.** Servers and clients that don't use Vouch continue to work exactly as they do today.
3. **Economic, not technical, enforcement.** Vouch doesn't block tool calls — it creates economic consequences for the actors involved.
4. **Federated trust, not centralized authority.** Trust scores are NIP-85 assertions published on Nostr. Any party can run a scoring service; clients choose which scoring services to trust.
5. **Non-custodial.** Stake locks are NWC budget authorizations. Funds stay in the staker's wallet.

### 2.2 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MCP CLIENT (Agent Host)                         │
│                                                                          │
│  ┌────────────────┐    ┌─────────────────────┐    ┌──────────────────┐  │
│  │   LLM Engine   │───▶│  Vouch Middleware    │───▶│  MCP Transport   │  │
│  │  (Claude, etc) │    │  (trust gate)        │    │  (stdio/HTTP)    │  │
│  └────────────────┘    └─────────┬───────────┘    └────────┬─────────┘  │
│                                  │                          │            │
│                         ┌────────▼────────┐        ┌───────▼────────┐   │
│                         │  Score Cache    │        │  MCP Server A  │   │
│                         │  (NIP-85 relay) │        │  (verified)    │   │
│                         └────────┬────────┘        ├────────────────┤   │
│                                  │                 │  MCP Server B  │   │
│                         ┌────────▼────────┐        │  (unverified)  │   │
│                         │  Policy Engine  │        └────────────────┘   │
│                         │  (local rules)  │                             │
│                         └─────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      VOUCH TRUST NETWORK     │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │  NIP-85 Score Registry │  │
                    │  │  (Nostr relays)        │  │
                    │  └────────────────────────┘  │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │  Staking Engine        │  │
                    │  │  (Lightning/NWC)       │  │
                    │  └────────────────────────┘  │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │  Slash Adjudicator     │  │
                    │  │  (evidence + jury)     │  │
                    │  └────────────────────────┘  │
                    └──────────────────────────────┘
```

### 2.3 Core Components

#### Component 1: MCP Server Trust Scores

Every MCP server that opts into Vouch receives a composite trust score derived from:

| Signal | Weight | Source |
|--------|--------|--------|
| **Operator stake** | 30% | Lightning stake via NWC |
| **Community vouching** | 25% | Other staked entities vouching for the server |
| **Behavioral history** | 20% | Uptime, response consistency, anomaly rate |
| **Provenance verification** | 15% | Sigstore attestation, namespace verification |
| **Audit compliance** | 10% | Voluntary security audits, CVE response time |

Scores are published as NIP-85 assertions, signed by the Vouch scoring service's Nostr key. Clients verify the signature and apply the score according to their local policy.

#### Component 2: Vouch Middleware (Client-Side)

A lightweight middleware layer between the LLM engine and MCP transport that:

1. **Looks up server trust scores** from cached NIP-85 assertions
2. **Applies policy rules** (e.g., "block servers below score 40," "require human approval for servers below 70," "auto-approve servers above 90")
3. **Logs trust decisions** for audit trail
4. **Reports behavioral observations** back to the trust network (optional, for operators who want to contribute to collective defense)

Implementation: npm package (`@percival-labs/vouch-mcp-middleware`) that wraps any MCP client's transport layer.

#### Component 3: Server Operator Staking

MCP server operators stake via the same NWC mechanism used for Vouch agent staking:

1. Operator generates or uses existing Nostr keypair
2. Operator connects Lightning wallet via NWC, authorizing a budget cap
3. Vouch records the stake lock against the operator's npub
4. If the server is involved in a verified security incident, the operator's stake is subject to slashing

This creates direct economic incentive for server operators to:
- Implement OAuth 2.1 (currently 41% don't)
- Keep dependencies updated (supply chain defense)
- Respond to CVE reports promptly
- Not rug-pull tool definitions

#### Component 4: Tool-Level Trust Annotations

MCP tools can carry Vouch trust metadata in their descriptions:

```json
{
  "name": "execute_sql",
  "description": "Execute a SQL query against the connected database",
  "vouch": {
    "operator_npub": "npub1abc...",
    "trust_score": 87,
    "score_signature": "sig1...",
    "stake_sats": 500000,
    "last_audit": "2026-02-15",
    "risk_tier": "high"
  }
}
```

The `risk_tier` classification helps the middleware apply appropriate policy:

| Tier | Examples | Default Policy |
|------|----------|----------------|
| **Low** | Read-only data, public APIs | Auto-approve above score 30 |
| **Medium** | Write operations, file access | Auto-approve above score 60 |
| **High** | Shell execution, payment, email | Require human approval or score 85+ |
| **Critical** | Credential access, system config | Always require human approval |

---

## 3. Implementation Roadmap

### Phase 0: Foundation (Weeks 1-2)

**Goal:** Ship the minimal trust lookup infrastructure.

**Deliverables:**
- `@percival-labs/vouch-mcp-middleware` npm package (v0.1.0)
  - NIP-85 trust score lookup for MCP server npubs
  - Configurable policy engine (allow/warn/block thresholds)
  - Local score cache with TTL
  - Claude Code integration (hook into MCP client transport)
- Vouch API endpoint: `GET /v1/public/mcp-servers/:npub/trust-score`
- Documentation: "Add Trust Scoring to Your MCP Client in 5 Minutes"

**Technical requirements:**
- Read NIP-85 events from configurable Nostr relay list
- Verify NIP-85 signatures (Ed25519)
- Cache scores locally with 5-minute TTL
- Log trust decisions to stdout (structured JSON)

**Files to create:**
```
packages/vouch-mcp-middleware/
├── package.json
├── src/
│   ├── index.ts          # Main export — middleware wrapper
│   ├── score-lookup.ts   # NIP-85 relay query + cache
│   ├── policy-engine.ts  # Configurable threshold rules
│   └── types.ts          # TypeScript interfaces
└── README.md
```

**Verification:** Install middleware in Claude Code's MCP client config. Verify trust scores appear in logs for connected MCP servers.

---

### Phase 1: Server Operator Onboarding (Weeks 3-4)

**Goal:** Enable MCP server operators to stake and receive trust scores.

**Deliverables:**
- Server operator registration flow on Vouch platform
  - `POST /v1/sdk/mcp-servers/register` — register server with npub + metadata
  - NWC wallet connect for staking (reuse existing `wallet-connect.tsx`)
  - Server metadata: name, GitHub repo, namespace registry ID, tool list
- Trust score calculation engine for MCP servers
  - Initial score = f(stake_amount, provenance_verification, operator_history)
  - Score published as NIP-85 event every 15 minutes
- Dashboard: Server operators can view their score, stake status, and behavioral metrics
- Vouch badge: Embeddable SVG badge for README.md ("Vouch Trust Score: 87")

**Database additions:**
```sql
CREATE TABLE mcp_servers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_npub TEXT NOT NULL,
  server_name TEXT NOT NULL,
  namespace_id TEXT,          -- official registry namespace
  github_repo TEXT,
  tools JSONB DEFAULT '[]',   -- list of tool names and risk tiers
  trust_score INTEGER DEFAULT 0,
  stake_sats INTEGER DEFAULT 0,
  nwc_connection_id TEXT REFERENCES nwc_connections(id),
  registered_at TIMESTAMPTZ DEFAULT now(),
  last_scored_at TIMESTAMPTZ
);

CREATE TABLE mcp_server_observations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id TEXT NOT NULL REFERENCES mcp_servers(id),
  observer_npub TEXT NOT NULL,  -- who reported this observation
  observation_type TEXT NOT NULL, -- 'uptime', 'anomaly', 'rug_pull', 'cve_response'
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Verification:** Register 3 MCP servers (our own + 2 community servers). Verify scores propagate via NIP-85 and are visible in the middleware logs.

---

### Phase 2: Community Vouching for Servers (Weeks 5-6)

**Goal:** Enable staked Vouch community members to vouch for MCP servers, creating social accountability chains.

**Deliverables:**
- Vouch-for-server flow on platform
  - Staked users can vouch for MCP servers (same mechanism as agent vouching)
  - Voucher's stake is partially at risk if the server is slashed
  - Vouch weight proportional to voucher's own trust score
- Server trust score now includes vouching component
- Vouch explorer: Public page showing all MCP servers, their scores, and their vouching chains
- API: `GET /v1/public/mcp-servers` — paginated list of scored servers with filtering

**New scoring formula:**
```
server_score = (
  0.25 * stake_normalized +          # operator's own stake
  0.25 * vouching_score +            # weighted sum of voucher stakes
  0.20 * behavioral_score +          # uptime, consistency, anomaly rate
  0.15 * provenance_score +          # attestation, namespace, GitHub stars
  0.15 * community_observation_score # reported observations weighted by observer trust
)
```

**Verification:** 5+ community members vouch for at least 1 MCP server. Score reflects vouching component. Middleware displays vouching chain depth in logs.

---

### Phase 3: Behavioral Monitoring (Weeks 7-10)

**Goal:** Enable participating MCP clients to report behavioral observations, creating a collective defense network.

**Deliverables:**
- Middleware v0.3.0: Opt-in behavioral reporting
  - Report: tool definition changes (rug pull detection)
  - Report: response latency anomalies
  - Report: unexpected tool parameter patterns
  - Report: cross-server interaction anomalies
  - All reports signed with the observer's Nostr key
- Observation aggregation engine
  - Multiple independent reports of the same anomaly increase confidence
  - Single-source reports are weighted lower (anti-griefing)
  - Anomaly types: `definition_change`, `latency_spike`, `parameter_anomaly`, `cross_server_shadow`, `auth_failure_spike`
- Alert system: Server operators notified when their score drops due to observations
- Anomaly dashboard: Real-time view of ecosystem-wide anomaly reports

**Anti-gaming measures:**
- Observers must be staked (no costless false reporting)
- Reports require signed evidence (tool definition diffs, timing data)
- Consistent false reporters see their own trust score degraded
- Server operators can dispute observations with evidence (dispute resolution)

**Verification:** Simulate a rug pull attack (tool definition mutation on a test server). Verify that 3+ independent observers report the anomaly, the server's trust score degrades within 15 minutes, and the server operator receives an alert.

---

### Phase 4: Slash Enforcement (Weeks 11-14)

**Goal:** Implement slashing for verified MCP server misbehavior.

**Deliverables:**
- Slash trigger conditions for MCP servers:
  1. **Verified rug pull**: Tool definition mutated after approval, confirmed by 3+ independent observers
  2. **Verified data exfiltration**: Server observed sending user data to unauthorized endpoints
  3. **CVE non-response**: Critical CVE reported, no patch within 72 hours
  4. **Supply chain compromise**: Server dependencies found compromised, operator failed to respond
- Slash adjudication process:
  - Reporter stakes collateral (anti-griefing)
  - Evidence period: 48 hours for server operator to respond
  - Random jury selection from staked community members
  - Majority vote required for slash execution
  - Slash amount: proportional to severity (10-50% of stake for first offense, escalating)
- Slash execution via NWC:
  - Platform creates invoice for slash amount
  - Sends `pay_invoice` via NWC to operator's wallet
  - Payment confirmation recorded as NIP-85 event
- Cascading slash to vouchers:
  - Vouchers slashed proportionally (5-25% of their vouch amount)
  - Voucher notification and evidence access

**Constitutional limits (hard-coded, not governance-modifiable):**
- Maximum single slash: 50% of stake
- Mandatory evidence period: minimum 48 hours
- Reporter collateral: minimum 10% of requested slash
- Double jeopardy protection: no re-slash for same incident
- Statute of limitations: 90 days from incident
- Appeal mechanism: 7-day window post-slash

**Verification:** Execute a controlled slash against a test server. Verify: operator stake reduced, voucher stakes reduced proportionally, NIP-85 events published, trust scores updated, appeal window active.

---

### Phase 5: Ecosystem Integration (Weeks 15-20)

**Goal:** Integrate with existing MCP ecosystem infrastructure.

**Deliverables:**

**5a. Official Registry Integration**
- Submit Vouch trust scores as supplementary metadata to the official MCP registry
- PR to `modelcontextprotocol/registry` adding optional `vouch_score` field to server.json
- Score fetched from Vouch API, verified via NIP-85 signature

**5b. Stacklok ToolHive Integration**
- Combine ToolHive's cryptographic attestation with Vouch's economic accountability
- ToolHive verifies provenance → Vouch verifies trustworthiness
- Joint score: `combined_score = f(toolhive_attestation, vouch_trust_score)`

**5c. AAIF Proposal**
- Submit governance proposal to AAIF for economic accountability as an optional MCP extension
- Proposed spec addition: `vouch` field in tool metadata (optional, backward-compatible)
- Reference implementation: the middleware package

**5d. Claude Code Native Integration**
- Work with Anthropic to integrate Vouch trust scores into Claude Code's MCP server selection UI
- Trust score visible when connecting to new MCP servers
- Policy: warn on servers below score 50, block below 20 (user-configurable)

**5e. Client SDK Integrations**
- Python SDK: `vouch-mcp-middleware-python`
- Go SDK: `vouch-mcp-middleware-go`
- Integrate with major MCP client frameworks (LangChain, CrewAI, OpenClaw)

---

### Phase 6: Cross-Protocol Governance (Weeks 21+)

**Goal:** Extend Vouch governance beyond MCP to cover A2A (agent-to-agent) and emerging protocols.

**Deliverables:**
- A2A trust scoring: Agents communicating via Google's A2A protocol carry Vouch trust scores
- AGENTS.md integration: OpenAI's AGENTS.md declarations include Vouch trust score references
- Cross-protocol trust portability: An agent's trust score on MCP carries to A2A and vice versa
- Universal agent identity: Single Nostr keypair works across MCP, A2A, ACP, and any future protocol

This phase positions Vouch as the **protocol-agnostic economic accountability layer** — not tied to any single tool-use protocol, but providing the trust substrate that all protocols need and none currently have.

---

## 4. Elements We're Still Missing (Gap Analysis)

### Gap 1: Agent Competence Verification (Priority: HIGH)

**Problem:** Trust scores reflect staking and behavioral history, but not demonstrated capability. A well-funded, well-behaved agent that produces incorrect results is still harmful.

**Proposed solution:** Eval-backed capability proofs.
- Agents submit to standardized evaluation benchmarks
- Results published as NIP-85 assertions
- Trust score includes competence dimension
- Domain-specific evals (coding, research, writing, data analysis)

**Dependency:** Requires eval infrastructure. Consider partnership with EleutherAI (lm-eval-harness) or METR.

**Timeline:** Phase 5+ (after core infrastructure is solid)

### Gap 2: Real-Time Anomaly Detection (Priority: HIGH)

**Problem:** Current behavioral monitoring is observation-report-based (passive). Need active anomaly detection at the middleware level.

**Proposed solution:** Lightweight anomaly detection in the middleware:
- Tool call frequency monitoring (detect loops like CS4)
- Parameter pattern analysis (detect injection attempts)
- Cross-server interaction graphs (detect shadowing attacks)
- Token consumption tracking (detect resource exhaustion)

**Dependency:** Requires sufficient deployment scale for meaningful baseline statistics.

**Timeline:** Phase 3-4 (built iteratively with behavioral monitoring)

### Gap 3: Consumer-Facing Trust Signal (Priority: MEDIUM)

**Problem:** End users interacting with AI agents have no way to assess whether the agent — or the tools it uses — are trustworthy. Trust scores are currently infrastructure-facing, not consumer-facing.

**Proposed solution:** Visual trust indicators:
- "Vouch Verified" badge on agent interfaces
- Trust score tooltip showing: operator stake, community vouching depth, behavioral rating
- Color-coded risk tier for each tool call (green/yellow/red)
- Similar to HTTPS lock icon but for agent trustworthiness

**Dependency:** Requires adoption by consumer-facing agent platforms.

**Timeline:** Phase 5+ (after ecosystem integration creates surface area)

### Gap 4: Regulatory Compliance Bridge (Priority: MEDIUM)

**Problem:** Colorado AI Act (June 2026) and EU AI Act (August 2026) create compliance requirements for AI agents. No existing framework maps agent trust scores to regulatory compliance.

**Proposed solution:** Compliance mapping layer:
- Map Vouch trust score components to specific regulatory requirements
- Generate compliance reports from trust score data
- "Compliant by design" positioning — agents using Vouch have audit trails that satisfy regulatory requirements
- ISO 42001 (AI management certification) as differentiation

**Dependency:** Legal review, regulatory interpretation.

**Timeline:** Phase 5-6 (timed to regulatory deadlines)

### Gap 5: Decentralized Behavior Monitoring (Priority: LOW)

**Problem:** Current behavioral monitoring relies on centralized observation aggregation. A fully decentralized system would eliminate single points of failure.

**Proposed solution:** Observation gossip protocol:
- Behavioral observations published as Nostr events (new NIP proposal)
- Observers relay observations to Nostr relays
- Aggregation happens at the client level, not centrally
- Multiple independent scoring services can consume the same observation stream

**Dependency:** Nostr protocol extension, relay infrastructure.

**Timeline:** Phase 6+ (long-term architectural goal)

---

## 5. Competitive Positioning

| Competitor | What They Provide | What They Don't | Vouch Advantage |
|-----------|-------------------|-----------------|-----------------|
| **Stacklok ToolHive** | Cryptographic provenance | Economic accountability | Provenance proves origin; Vouch proves trustworthiness |
| **Salesforce Agentforce** | Enterprise governance | Open ecosystem, economic layer | Vouch is protocol-agnostic, non-custodial, decentralized |
| **MCP-Guard** | Neural threat detection (96%) | Consequences for detected threats | Detection without consequence ≠ deterrence |
| **OpenAI Read-Only** | Capability constraint | Utility for write operations | Vouch enables full capability with accountability |
| **AAIF Governance** | Organizational structure | Technical enforcement | Vouch provides the enforcement layer AAIF needs |
| **ERC-8004** | On-chain agent identity | Economic staking, trust scoring | Vouch adds the economics ERC-8004 explicitly defers |

**Unique position:** No existing solution combines cryptographic identity + economic staking + federated trust scoring + non-custodial stake locks + cascading accountability + protocol-agnostic operation. Vouch is the **economic layer** that every other solution needs underneath.

---

## 6. Resource Requirements

### Phase 0-2 (Foundation through Community Vouching)

| Resource | Estimate |
|----------|----------|
| Engineering | 1 full-time engineer, 6 weeks |
| Infrastructure | Existing Railway + Nostr relay |
| Budget | ~$2,000 (hosting, relay fees) |

### Phase 3-4 (Behavioral Monitoring through Slash Enforcement)

| Resource | Estimate |
|----------|----------|
| Engineering | 2 engineers, 8 weeks |
| Infrastructure | Additional relay capacity, monitoring infra |
| Legal | Slash mechanism legal review (~$5,000) |
| Budget | ~$10,000 |

### Phase 5-6 (Ecosystem Integration through Cross-Protocol)

| Resource | Estimate |
|----------|----------|
| Engineering | 2-3 engineers, 10+ weeks |
| Partnerships | AAIF membership, Stacklok collaboration |
| Legal | Regulatory compliance review (~$15,000) |
| Budget | ~$30,000 |

---

## 7. Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| 0 | Middleware npm downloads | 500 in first month |
| 1 | Staked MCP servers | 25 servers |
| 2 | Active vouchers for MCP servers | 100 unique vouchers |
| 3 | Behavioral observations reported | 1,000/month |
| 4 | Successful slash adjudications | 3+ (proving the mechanism works) |
| 5 | AAIF proposal submitted | Yes/No |
| 5 | Integration with 2+ MCP client frameworks | Yes/No |
| 6 | Cross-protocol trust score lookups | 10,000/month |

---

## 8. Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Low MCP server operator adoption | HIGH | Chicken-and-egg: no servers → no client value | Start with our own MCP servers + friendly operators. Score unregistered servers at 0 (not blocked, just unscored). |
| AAIF rejects governance proposal | MEDIUM | Limits official integration | Vouch works as overlay regardless. Continue as independent layer. |
| False slashing / gaming | MEDIUM | Trust erosion | Constitutional limits, reporter collateral, appeal mechanism |
| Regulatory uncertainty (stake-as-security argument) | MEDIUM | Legal risk | Non-custodial architecture explicitly avoids securities classification. NWC budget authorization ≠ escrow. |
| Competing governance solution from major player | LOW | Market displacement | First-mover advantage + protocol-agnostic positioning. Vouch can integrate with whatever wins. |
| NWC/Lightning infrastructure instability | LOW | Staking mechanism unreliable | Monitor NWC ecosystem health. Fall back to on-chain staking if needed. |

---

## 9. Implementation Priority Matrix

Plotted by impact vs. effort:

```
HIGH IMPACT
    │
    │  ┌─────────────┐     ┌──────────────────┐
    │  │ Phase 0     │     │ Phase 4          │
    │  │ Middleware   │     │ Slash Enforcement│
    │  │ (LOW effort)│     │ (HIGH effort)    │
    │  └─────────────┘     └──────────────────┘
    │
    │  ┌─────────────┐     ┌──────────────────┐
    │  │ Phase 1     │     │ Phase 5          │
    │  │ Server Reg  │     │ Ecosystem Integ  │
    │  │ (MED effort)│     │ (HIGH effort)    │
    │  └─────────────┘     └──────────────────┘
    │
    │  ┌─────────────┐     ┌──────────────────┐
    │  │ Phase 2     │     │ Phase 6          │
    │  │ Vouching    │     │ Cross-Protocol   │
    │  │ (MED effort)│     │ (V.HIGH effort)  │
    │  └─────────────┘     └──────────────────┘
    │
LOW IMPACT ──────────────────────────────────── HIGH EFFORT
```

**Recommended sequence:** Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 (linear, each phase builds on prior).

Phase 0 is the critical unlock — once the middleware exists and scores are visible, everything else follows.

---

## Appendix A: Relationship to "Agents of Chaos" Findings

| Paper Finding | MCP Governance Layer Response |
|------|------|
| CS8: Identity spoofing | MCP servers identified by Nostr npub, not namespace string |
| CS2: Unauthorized compliance | Trust-scored tool access — low-trust servers gated |
| CS3: Semantic bypass | Economic consequence for servers whose tools enable PII exfiltration |
| CS10: Constitution injection | Tool definition integrity monitoring (rug pull detection) |
| CS11: Libelous broadcast | Cost-of-amplification — staked servers/agents bear consequence |
| CS4: Resource exhaustion | Budget caps + anomaly detection for tool call frequency |
| CS6: Silent censorship | Federated scoring — censorship-transparent providers score higher |
| OWASP ASI08 (Cascading) | Cross-server anomaly graphs + economic firewalls |

---

## Appendix B: Key Data Points (February 2026)

- 8,610+ MCP servers indexed (PulseMCP)
- 518 servers in official namespace-verified registry
- 97 million monthly SDK downloads
- 300+ MCP client integrations
- 30 CVEs in January-February 2026
- 41% of official registry servers lack authentication
- 437,000 developer environments compromised via `mcp-remote` CVE
- AAIF: 146 members, 8 platinum (including Anthropic, OpenAI, Google, Microsoft)
- Gartner: 40% of enterprise apps will embed AI agents by end of 2026
- Agent market: $7.6B, 49.6% projected annual growth

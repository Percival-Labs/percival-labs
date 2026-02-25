# Engram Enterprise — Intent Engineering Platform Scaffolding

**Created**: 2026-02-24
**Purpose**: Structured outline for deep-dive session tonight. Fill in together.
**Supporting docs**:
- Concept: `~/.claude/projects/-Users-alancarroll-PAI/memory/engram-enterprise-concept.md`
- Compliance: `research/engram-enterprise-compliance-brief.md` (45+ sources, full cost breakdowns)

---

## 1. THE THESIS

**One sentence**: Engram encodes organizational intent per-agent; Vouch Enterprise enforces accountability between agents; together they solve the full Intent Engineering stack that enterprises need to deploy autonomous AI safely.

**Why now (Feb 2026)**:
- EU AI Act enforces Aug 2, 2026 — enterprises scrambling for compliance
- No existing platform has native trust/accountability layer (research confirmed)
- Agent market growing 46.3% CAGR ($7.8B → $52.6B by 2030)
- Vouch's architecture is *already aligned* with where regulation is heading

### To decide tonight:
- [ ] Is this the right next move vs. staying personal-first?
- [ ] Does this change Engram's current positioning or add a tier?
- [ ] Timeline: when would enterprise be viable given current resources (C1)?

---

## 2. INTENT CASCADE — How Intent Flows Through an Organization

This is the core architecture question. Intent doesn't live at one level.

```
┌─────────────────────────────────────────────────────┐
│  ORGANIZATIONAL INTENT                               │
│  Mission, values, OKRs, risk tolerance, compliance   │
│  Encoded in: Org-level Engram config (master harness)│
├─────────────────────────────────────────────────────┤
│  TEAM INTENT                                         │
│  Team goals, workflows, decision boundaries          │
│  Encoded in: Team-level harness (inherits from org)  │
├─────────────────────────────────────────────────────┤
│  AGENT INTENT                                        │
│  Individual skills, authorized actions, escalation   │
│  Encoded in: Agent-level Engram (inherits from team) │
└─────────────────────────────────────────────────────┘
```

### Key questions to work through:
- [ ] **Inheritance model**: Does team intent override org intent, or does org set hard floors? (Likely: org sets boundaries, team specializes within them, agent specializes further)
- [ ] **Conflict resolution**: When Sales Engram's goals conflict with Support Engram's goals, who wins? Is this encoded in the org harness or resolved by Vouch?
- [ ] **Cascading updates**: When org-level intent changes (new OKR, new compliance requirement), how does it propagate to 50+ agents?
- [ ] **Audit trail**: Can you trace any agent decision back up through team → org intent?

### Rough model to discuss:

```
org.harness.json          — hard boundaries, values, compliance requirements
  ├── sales.harness.json  — inherits org + adds revenue goals, outreach permissions
  │   ├── sdr-agent.json  — inherits sales + specific prospecting skills
  │   └── ae-agent.json   — inherits sales + specific closing/proposal skills
  ├── eng.harness.json    — inherits org + adds deploy permissions, code access
  │   ├── reviewer.json   — inherits eng + code review skills
  │   └── deployer.json   — inherits eng + CI/CD access, staging/prod boundaries
  └── support.harness.json
      ├── tier1.json
      └── escalation.json
```

---

## 3. VOUCH ENTERPRISE — Adapted Integration Layer

### What stays from public Vouch:
- Trust staking mechanics (stake reputation on outcomes)
- NIP-85 events (trust score publishing)
- Accountability chain (who endorsed what)
- Slash/reward economics

### What changes for enterprise:
| Public Vouch | Enterprise Vouch |
|---|---|
| Self-sovereign Nostr identities | Org-issued keypairs (provisioned by admin) |
| Public relay network | Private relay (org-scoped, air-gapped option) |
| Lightning payments | Internal accounting units or enterprise billing |
| Open trust registry | Internal-only scores (with optional cross-org federation) |
| Community governance | Admin-controlled policies + Vouch enforcement |

### Questions to work through:
- [ ] **Is Vouch Enterprise a separate product or a deployment mode?** (Likely: same codebase, enterprise config layer)
- [ ] **Cross-org federation**: Should Company A's agents be able to verify Company B's agents via Vouch? (Supply chain use case)
- [ ] **Compliance mapping**: How do Vouch events map to EU AI Act audit requirements?
- [ ] **Admin dashboard**: What does the enterprise admin see? Trust scores, agent performance, compliance status, escalation patterns?

---

## 4. ONBOARDING — From Individual to Enterprise

### Current Engram onboarding (individual):
```
1. npm install engram-harness (or download DMG)
2. engram setup (interactive — name, role, preferences)
3. engram init (creates .harness.json + context files)
4. Start using — skills, context, identity loaded
```

### Enterprise onboarding needs to expand to:

```
Phase 1: Organization Setup
  - Org admin creates master harness (mission, values, compliance requirements)
  - Define hard boundaries (what NO agent can ever do)
  - Connect identity provider (SSO/SAML)
  - Deploy private Vouch relay
  - Configure compliance requirements (EU AI Act? Colorado? HIPAA?)

Phase 2: Team Provisioning
  - Team leads configure team harnesses (inheriting from org)
  - Define team-specific goals, tools, data access
  - Set agent autonomy levels per team (operator → observer)
  - Configure inter-team communication rules via Vouch

Phase 3: Agent Deployment
  - Individual agent Engrams provisioned (inheriting team + org)
  - Skills assigned per agent role
  - Vouch identity issued (org-scoped keypair)
  - Initial trust score set (probationary period?)
  - Human-in-the-loop rules configured per autonomy level

Phase 4: Monitoring & Governance
  - Admin dashboard live (trust scores, compliance, escalations)
  - Audit trail active
  - Feedback loops engaged (agent decisions → outcome tracking → trust adjustment)
```

### Questions:
- [ ] **Who is the buyer?** CTO? CISO? Head of AI/ML? VP Ops? (Affects messaging, onboarding UX)
- [ ] **Self-serve or white-glove?** At enterprise prices, probably white-glove initially
- [ ] **Migration path**: Can a team start with individual Engrams and upgrade to enterprise? (Important for land-and-expand)

---

## 5. PRODUCT ARCHITECTURE

### Three-tier product:

| Tier | Product | Target | Price Model |
|------|---------|--------|-------------|
| **Free** | Engram (individual) | Developers, domain translators | Open source |
| **Team** | Engram Teams + Vouch | Small teams (5-20 agents) | $X/agent/month |
| **Enterprise** | Engram Enterprise + Vouch Enterprise | Org-wide (50+ agents) | Annual contract |

### Enterprise-only features (to justify price):
- Private Vouch relay
- Org-level intent cascade
- Compliance dashboard (EU AI Act, Colorado, NIST AI RMF)
- SSO/SAML integration
- Data residency controls
- Model governance registry
- SLA (99.9%+)
- Dedicated support

### Technical components to build:

```
EXISTING (reusable):
├── Engram CLI/SDK (agent-level intent encoding)
├── Vouch SDK (trust staking, NIP-85)
├── Vouch API (score computation, staking engine)
└── Nostr identity (keypair management)

NEW (enterprise layer):
├── Org Harness Manager (intent cascade, inheritance, propagation)
├── Vouch Enterprise Relay (private, org-scoped)
├── Admin Dashboard (compliance, trust scores, agent monitoring)
├── Identity Provider Bridge (SSO → Nostr keypair provisioning)
├── Compliance Engine (maps agent actions → regulatory requirements)
├── Audit Export (SOC 2, EU AI Act, NIST AI RMF formatted reports)
└── Inter-Agent Communication Layer (encrypted, logged, governed)
```

---

## 6. COMPETITIVE POSITIONING

### The gap in the market (confirmed by research):

| Competitor | Intent Encoding | Trust Layer | Compliance Native |
|---|---|---|---|
| Microsoft Copilot Studio | Partial (Copilot instructions) | No | Bolt-on (Azure compliance) |
| IBM watsonx | Partial (governance policies) | No | Strongest bolt-on |
| LangGraph / CrewAI | No | No | No |
| OpenAI Agent SDK | No | No | No |
| **Engram + Vouch** | **Core product** | **Core product** | **Core product** |

**Pitch**: "Every other platform makes you bolt compliance onto agents. Engram makes agents compliant by design."

### Questions:
- [ ] **Is the "compliant by design" angle strong enough for enterprise buyers?**
- [ ] **Partnership strategy**: Work with a compliance automation platform (Vanta/Drata) or build in-house?
- [ ] **Open-core model**: Engram open source, Vouch Enterprise paid — does this work for C > D?

---

## 7. IAN / WEBB INTEGRATION

### Three-product stack possibility:

```
Webb (Ian's RAG)    = Context Infrastructure (Layer 1)
  Zero-hallucination retrieval, vector embeddings, semantic search

Engram              = Intent Encoding (Layer 2+3)
  Per-agent purpose, skills, decision boundaries

Vouch Enterprise    = Trust & Accountability
  Inter-agent staking, audit trail, compliance enforcement
```

### Questions:
- [ ] **Is this a joint venture with Ian or separate products that integrate?**
- [ ] **Webb licensing**: Would Ian license Webb for Vouch's transaction memory use case?
- [ ] **Shared entity**: Does this all live under Percival Labs?

---

## 8. COMPLIANCE ROADMAP SUMMARY

*Full details in `engram-enterprise-compliance-brief.md`*

### Critical path (minimum viable for enterprise sales):
| Item | Cost | Timeline |
|------|------|----------|
| SOC 2 Type I | $18-33K | Months 1-3 |
| Cyber + E&O insurance | $2-8K/yr | Month 1 |
| Penetration test | $10-25K | Month 3 |
| Legal (DPA, privacy, ToS) | $2-10K | Month 1 |
| **Total to start selling** | **$37-103K** | **3-4 months** |

### Strategic differentiator:
| Item | Cost | Timeline |
|------|------|----------|
| ISO 42001 (AI management cert) | $30-80K | Months 6-12 |
| Only hyperscalers have this so far — massive differentiator |

### Key regulatory dates:
- **Jun 2026**: Colorado AI Act enforcement
- **Aug 2026**: EU AI Act full enforcement (high-risk provisions)
- Both are tailwinds — enterprises need solutions before these dates

---

## 9. RISKS & REALITY CHECKS

| Risk | Mitigation |
|------|-----------|
| **C1 (time)**: Building enterprise product while working full-time | Start with positioning/content. Build only what you can dogfood first. Enterprise sales require a team — this is a funding milestone |
| **C2 (over-engineering)**: Building enterprise infra before validating demand | Validate with 3 enterprise conversations before writing enterprise code |
| **C4 (monetization hesitancy)**: Enterprise requires asking for real money | Enterprise pricing is expected to be substantial — $10K+ annual contracts are normal |
| **Compliance costs**: $37-103K minimum | Requires funding (Ian? VC? Revenue from personal tier first?) |
| **Credibility gap**: Solo founder selling to enterprise | Mitigated by: LLC filed, IP protected, technical depth, "compliant by design" story |

---

## 10. TONIGHT'S DECISION FRAMEWORK

### What we need to decide:

1. **Go / No-Go**: Is enterprise Engram the right next move, or is it a shiny object (C5)?
   - Test: Does it serve G1-G4? Does it make C > D?

2. **Timing**: Now (positioning + content), Q2 (prototype), or H2 (post-revenue)?
   - Test: Can this ship incrementally, or is it all-or-nothing?

3. **Product boundary**: Where does Engram end and Vouch Enterprise begin?
   - Test: Can they be sold separately? Must they be bundled?

4. **Ian conversation**: Is this something to bring to the investment discussion?
   - Test: Does Webb + Engram + Vouch = compelling enough for seed funding?

5. **Content strategy**: Does the "Intent Engineering Platform" framing work for current Engram audience (domain translators)?
   - Test: Does enterprise positioning alienate individual users or expand the story?

---

*Ready to fill in tonight. All research is done — this is now a strategy and architecture session.*

# Percival Labs — Monetization Strategy

**Date:** February 16, 2026
**Author:** Percy (PAI) + Alan Carroll
**Status:** Draft v1.1 — Added Engram Business tier, WDB prototype, onboarding wizard
**Scope:** Revenue strategy for Engram (product) and The Lab (agent team)

---

## Executive Summary

Percival Labs has two monetization surfaces: **Engram** (open-source PAI infrastructure product) and **The Lab** (a team of 6 AI agents that can perform revenue-generating work). This document defines the strategy for both, grounded in market research and the C > D principle: cooperation must outcompete defection. We give away capability freely and charge for convenience, infrastructure, and labor.

**Core decisions:**
- Engram core + all skills = **free, open source, forever.** No gatekeeping.
- Revenue comes from **hosted infrastructure**, **smart model routing**, and **agent labor.**
- Agent revenue comes from **services first, products second** — sell the work, then productize the patterns.

**Revenue targets:**

| Timeline | Monthly Revenue | Primary Sources |
|----------|----------------|-----------------|
| Month 1-3 | $3K-$8K | Agent services + Engram Business prototype (WDB) |
| Month 4-6 | $8K-$20K | Agent services + Engram Business clients + Cloud launch |
| Month 7-12 | $20K-$40K | All channels active |
| Year 2 | $50K-$100K | Product revenue overtakes services |

---

## Table of Contents

1. [Principles](#1-principles)
2. [Pillar 1: Engram Product Revenue](#2-pillar-1-engram-product-revenue)
   - 2.6 [Engram Business: The Small Business Tier](#26-engram-business-the-small-business-tier)
   - 2.7 [WDB: First Client and Prototype](#27-wdb-first-client-and-prototype)
   - 2.8 [The Onboarding Wizard](#28-the-onboarding-wizard)
3. [Pillar 2: Agent Lab Revenue](#3-pillar-2-agent-lab-revenue)
4. [Pillar 3: Protocol-Native Revenue (x402)](#4-pillar-3-protocol-native-revenue-x402)
5. [What We Don't Do](#5-what-we-dont-do)
6. [Competitive Landscape](#6-competitive-landscape)
7. [Phased Execution Plan](#7-phased-execution-plan)
8. [Risk Assessment](#8-risk-assessment)
9. [Sources](#9-sources)

---

## 1. Principles

Every monetization decision must pass these filters:

### The C > D Test
> Does this make cooperation more rewarding than defection?

- Free core means anyone can build on our work → cooperation rewarded
- Paid convenience means we sustain the project → cooperation funded
- Open skills means no gatekeeping → defection (hoarding knowledge) has no advantage

### The Capability Transfer Test
> Does this teach the user to outgrow us, or create dependency?

- Engram's free tier must be genuinely useful standalone, not a crippled trial
- Services revenue should produce artifacts the client can reuse
- Every interaction should leave the customer more capable than before

### The Carpenter Test
> Could I explain this pricing to a tradesperson in one sentence?

- "Free tools, pay for the cloud hosting" → clear
- "Free tools, pay for premium skills" → feels like gatekeeping
- "Our agents do research/content/engineering for hire" → clear

---

## 2. Pillar 1: Engram Product Revenue

### 2.1 Market Context

The AI memory/infrastructure space is funded and growing:

| Company | Category | Traction | Funding |
|---------|----------|----------|---------|
| Mem0 | Memory-as-a-Service | 186M API calls/quarter | $24M Series A |
| Zep | Memory infrastructure | Credit-based, SOC2/HIPAA | Funded |
| Letta (MemGPT) | Stateful agents + memory | $20/month Pro tier | $10M |
| LangSmith | Observability/evaluation | $12-16M ARR | $260M total |
| CrewAI | Agent execution platform | $0.50/execution overage | Funded |

**The gap Engram fills:** All of these target developers with APIs. None serve the non-developer personal AI user. Nobody combines Memory + Context + Skills + Model-Agnostic + Non-Dev-Friendly in one package.

**The OpenClaw acquisition changes the calculus.** With Steinberger joining OpenAI (Feb 15, 2026), the entire OpenClaw ecosystem is now functionally under OpenAI's umbrella. Builders who want vendor independence need alternatives. Engram's model-agnostic positioning just went from differentiator to existential value prop.

### 2.2 Pricing Tiers

| Tier | Price | What's Included | Target |
|------|-------|-----------------|--------|
| **Open Source** | Free forever | CLI, local memory, bundling, skills, MCP server. Everything works offline and locally. | Builders, tinkerers, the C > D community |
| **Engram Cloud** | $9/month | Cloud memory sync across devices. Hosted MCP endpoint. Memory search API. Automatic encrypted backup. | Power users who work across machines |
| **Engram Pro** | $29/month | Everything in Cloud + smart model routing (auto-picks optimal model per task). Semantic memory search. Knowledge graph connections. Priority support. | Professionals using AI daily |
| **Engram Business** | $49-$99/month | Everything in Pro + pre-built business skill packs, guided onboarding wizard, weekly CEO briefing, document ingestion, up to 3 seats. *(See section 2.6)* | Small business owners, solopreneurs, trades |
| **Engram for Teams** | $19/seat/month | Shared memory spaces. Team skill libraries. Admin dashboard. Collaboration features. | Small teams (3-15 people) |
| **Enterprise** | Custom ($2K-$10K/month) | SSO/SCIM, RBAC, audit logs, VPC/on-prem deployment, SOC2/HIPAA compliance, dedicated support, SLAs. | Companies (50+ seats) |

### 2.3 Smart Model Routing — The Pro Differentiator

The token arbitrage idea lives inside the Pro tier as **smart routing**, not as a standalone service.

**How it works:**
1. User configures their API keys for multiple providers (Anthropic, OpenAI, Google, Mistral, etc.)
2. Engram Pro analyzes the task type, complexity, and user's history
3. Routes to the optimal model: cheapest for simple tasks, most capable for complex ones
4. Single interface, automatic optimization

**Why this beats competing with OpenRouter:**
- OpenRouter routes based on prompt analysis (generic)
- Engram routes based on your personal context, task history, and memory (personalized)
- OpenRouter is a developer API gateway; Engram routing is embedded in your daily workflow
- No separate API key or billing — it's just a feature of Pro

**Economics:** We don't mark up the tokens. The user pays their own provider costs directly. We charge $29/month for the intelligence layer that optimizes their spending. At scale, this saves heavy users $50-$100+/month in wasted tokens on overqualified models.

**Competitive moat:** The routing intelligence improves with the user's memory and usage data. The longer someone uses Engram Pro, the better it gets at picking the right model. This is a genuine flywheel that standalone routers can't replicate.

### 2.4 Revenue Projections — Engram Product (All Tiers)

| Milestone | Free Users | Cloud/Pro Paid | Business Paid | Blended MRR |
|-----------|-----------|---------------|---------------|-------------|
| Month 3 (WDB prototype + Cloud launch) | 500 | 25 | 1-3 | $275-$1,025 |
| Month 6 (Business wizard live) | 2,000 | 150 | 10-25 | $1,850-$6,850 |
| Month 12 | 10,000 | 750 | 50-150 | $9,250-$36,750 |
| Month 18 | 25,000 | 2,500 | 150-500 | $30,000-$122,500 |

Cloud/Pro ARPU: $9-$29/month. Business ARPU: $49-$99/month. Enterprise excluded from base projections.

**The Business tier changes the math significantly.** Even conservative adoption (50 Business clients at $75 avg by month 12) adds $3,750/month — and these clients are stickier than Cloud/Pro because the tool is woven into their daily operations.

### 2.5 Key Metrics to Track

- **Free → Cloud conversion rate** (target: 5-10%)
- **Cloud → Pro upgrade rate** (target: 20-30%)
- **Monthly churn** (target: <5%)
- **Token savings delivered** (for Pro marketing)
- **Memory operations per user** (usage health indicator)
- **Business tier onboarding completion rate** (target: >70%)
- **Business tier weekly briefing open rate** (target: >60%)

### 2.6 Engram Business: The Small Business Tier

This is the near-term revenue opportunity hiding in plain sight.

**The insight:** Alan already IS the prototype Engram Business user. A sole proprietor whose personal AI infrastructure IS his business AI infrastructure. Percy manages projects, drafts communications, does research, tracks context — that's not a "personal assistant," that's a CEO assistant. There are 33.2 million small businesses in the US. Most of them don't have a CTO, a COO, or an AI strategy. They have one person juggling everything.

**Why Business, not Enterprise:**

| Dimension | Enterprise ($2K-$10K/month) | Business ($49-$99/month) |
|-----------|---------------------------|--------------------------|
| Sales cycle | 3-6 months, procurement, legal | Self-serve, credit card, start today |
| Decision maker | Committee | The owner (one person) |
| Market size | ~20K companies with AI budget | 33.2M US small businesses |
| Support burden | Dedicated success manager | Community + docs + wizard |
| Time to revenue | 6-12 months | Weeks |
| Proof needed | SOC2, case studies, references | "Watch me use it" — content IS the proof |

**Target archetypes:**

| Archetype | Example | What They Need |
|-----------|---------|---------------|
| **Solo GC / Trades** | Residential contractor, 3-10 jobs | Schedule coordination, client emails, sub management |
| **Agency Owner** | Marketing/design agency, 2-5 people | Client briefings, content drafts, project context |
| **Consultant** | Independent consultant, solo | Research, proposals, client communication |
| **Creator / Solopreneur** | YouTuber, course seller | Content pipeline, audience research, business ops |
| **Local Service Business** | HVAC, plumbing, landscaping | Scheduling, estimates, customer follow-up |

**Feature set (Business tier):**

| Feature | Description |
|---------|-------------|
| **Guided onboarding wizard** | "Set up your business in 15 minutes" — walks through industry, integrations, first skills |
| **Pre-built business skill packs** | Industry-specific skill bundles installed during onboarding (construction, agency, consulting, etc.) |
| **Weekly CEO briefing** | Automated summary: what happened, what's coming, what needs attention |
| **Document ingestion** | Upload contracts, specs, procedures → searchable knowledge base |
| **Client/project context** | Per-client memory: communication history, preferences, project state |
| **Communication drafts** | Email/message drafting with context from your projects and client history |
| **Up to 3 seats** | Owner + 2 team members (PM, estimator, office manager) |
| **Smart routing** (from Pro) | Automatic model selection for cost optimization |
| **Cloud sync** (from Cloud) | Memory available on all devices |

**Pricing rationale:**
- $49/month: Solo operators, 1 seat, 3 active projects, 1 skill pack
- $99/month: Small team, 3 seats, unlimited projects, all skill packs, priority support
- Construction software is already $300-500/month (JobTread, Buildertrend). An AI assistant at $49-$99 is an easy add.
- No annual commitment required. Monthly cancel anytime. Earn the renewal every month.

**Revenue projection (Business tier alone):**

| Milestone | Clients | MRR |
|-----------|---------|-----|
| Month 3 (WDB prototype complete) | 1-3 (WDB + referrals) | $100-$300 |
| Month 6 (onboarding wizard live) | 10-25 | $500-$2,500 |
| Month 9 (content marketing working) | 25-75 | $1,250-$7,500 |
| Month 12 | 50-150 | $2,500-$15,000 |
| Month 18 | 150-500 | $7,500-$50,000 |

Conservative, but the growth engine is content: every build log showing Engram Business in action is a sales pitch.

### 2.7 WDB: First Client and Prototype

**Westerlies Design Build** is Alan's employer — a residential design-build firm in Bellingham, WA. They've already asked about building an AI assistant. We've already scoped it. This is the prototype engagement.

**Existing scope work** (at `Projects/WDB-TreadMind/proposals/`):

| Proposal | What It Is | Cost |
|----------|-----------|------|
| Option 1: TreadWatch | Email monitoring → Slack alerts | ~$50/month |
| Option 2: TreadBot | Schedule assistant + JobTread integration + cascade calculation | ~$150/month |
| Option 3: WDB Percy | Full company AI (knowledge base, comms, financial intelligence) | ~$500/month |
| TreadMind | Productized version of TreadBot for other JobTread users | $99-$499/month SaaS |

**The reframe:** WDB Percy (Option 3) IS Engram Business for construction. Instead of building a custom one-off, we build WDB's assistant ON Engram infrastructure. What WDB gets is the product. What we get is the product development.

**The four-way flywheel:**

```
┌──────────────────────────────────────────────┐
│           THE WDB FLYWHEEL                   │
│                                              │
│   ┌─────────────┐    ┌─────────────┐         │
│   │  1. CLIENT   │───▶│  2. PRODUCT  │        │
│   │  REVENUE     │    │  DEVELOPMENT │        │
│   │  $49-99/mo   │    │  Real usage  │        │
│   │  from WDB    │    │  drives      │        │
│   └──────────────┘    │  features    │        │
│          ▲            └──────┬──────┘         │
│          │                   │                │
│   ┌──────┴──────┐    ┌──────▼──────┐         │
│   │  4. DOGFOOD  │◀──│  3. CASE     │        │
│   │  Alan uses   │    │  STUDY      │        │
│   │  it daily    │    │  "How a     │        │
│   │  at work     │    │  carpenter  │        │
│   └──────────────┘    │  built his  │        │
│                       │  company's  │        │
│                       │  AI"        │        │
│                       └─────────────┘        │
└──────────────────────────────────────────────┘
```

1. **Client revenue** — WDB pays $49-$99/month for Engram Business (construction pack)
2. **Product development** — Real usage by real construction workers drives feature priorities
3. **Case study** — "How a carpenter built an AI assistant for his own construction company" is the most authentic content imaginable
4. **Dogfood** — Alan uses the product every single day at his actual job. The feedback loop is instant.

**Phased approach (building WDB on Engram):**

| Phase | Weeks | What WDB Gets | What Engram Gets |
|-------|-------|--------------|------------------|
| **0: Foundation** | 1-2 | Engram installed, basic memory, context about WDB projects | Business onboarding flow tested with real user |
| **1: Schedule** | 3-6 | TreadBot capability (email → schedule → cascade → approve) | Construction skill pack v1 |
| **2: Knowledge** | 7-10 | Document search, procedures, vendor database | Document ingestion pipeline |
| **3: Communication** | 11-14 | Client email drafts, sub coordination, owner reports | Communication skill pack |
| **4: Intelligence** | 15-18 | Financial visibility, predictive scheduling, web dashboard | Business dashboard template |

**After WDB proves out:**
- WDB refers 2-3 other contractors (warm intros)
- TreadMind becomes a specialized "construction pack" for Engram Business
- Content about the WDB build drives awareness for all business tiers
- The onboarding wizard encodes everything learned from WDB setup

### 2.8 The Onboarding Wizard

"Set up your business in 15 minutes."

The wizard is what turns Engram from a developer tool into a business product. It replaces "read the docs, configure YAML files, write your own skills" with "answer some questions and we'll set you up."

**Flow:**

```
STEP 1: WHO ARE YOU?
┌─────────────────────────────────────────────────┐
│  What kind of business do you run?              │
│                                                 │
│  ○ Construction / Trades                        │
│  ○ Marketing / Creative Agency                  │
│  ○ Consulting / Professional Services           │
│  ○ Local Service Business (HVAC, plumbing, etc.)│
│  ○ E-commerce / Retail                          │
│  ○ Creator / Content Business                   │
│  ○ Other: ____________                          │
│                                                 │
│  Business name: ____________                    │
│  Your name: ____________                        │
│  Team size: [1] [2-5] [6-15] [16+]            │
│                                                 │
│                              [Next →]           │
└─────────────────────────────────────────────────┘

STEP 2: WHAT DO YOU WORK WITH?
┌─────────────────────────────────────────────────┐
│  Connect your tools (optional, do any later):   │
│                                                 │
│  ☐ Email (Gmail / Outlook)                      │
│  ☐ Calendar (Google / Outlook)                  │
│  ☐ Slack / Discord                              │
│  ☐ Google Drive / Dropbox                       │
│  ☐ QuickBooks / FreshBooks                      │
│  ☐ Industry-specific:                           │
│    ☐ JobTread (construction)                    │
│    ☐ HubSpot (agency/sales)                     │
│    ☐ Notion / Airtable                          │
│                                                 │
│                    [← Back]   [Next →]          │
└─────────────────────────────────────────────────┘

STEP 3: WHAT EATS YOUR TIME?
┌─────────────────────────────────────────────────┐
│  What takes up the most time in your week?      │
│  (Pick your top 3)                              │
│                                                 │
│  ☐ Scheduling & coordination                    │
│  ☐ Email & client communication                 │
│  ☐ Finding documents & information              │
│  ☐ Invoicing & financial tracking               │
│  ☐ Writing proposals & estimates                │
│  ☐ Team coordination & delegation               │
│  ☐ Research & competitive analysis              │
│  ☐ Content creation & marketing                 │
│  ☐ Reporting & status updates                   │
│                                                 │
│                    [← Back]   [Next →]          │
└─────────────────────────────────────────────────┘

STEP 4: YOUR ASSISTANT IS READY
┌─────────────────────────────────────────────────┐
│  Based on your answers, here's your setup:      │
│                                                 │
│  ✓ Industry: Construction / Trades              │
│  ✓ Skill pack: Construction Business Pack       │
│    - Schedule coordination                      │
│    - Client communication drafts                │
│    - Document search & knowledge base           │
│    - Sub/vendor management                      │
│    - Weekly briefing                            │
│                                                 │
│  ✓ Connected: Gmail, Google Calendar, JobTread  │
│                                                 │
│  ✓ Context loaded:                              │
│    - Business: Westerlies Design Build          │
│    - Role: Owner / Project Manager              │
│    - Team: 5 people                             │
│                                                 │
│  Your first weekly briefing arrives Monday 7am. │
│                                                 │
│  ┌──────────────────────────────────────┐       │
│  │  Try it now:                         │       │
│  │  "What's on my schedule this week?"  │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│               [Start Using Engram →]            │
└─────────────────────────────────────────────────┘
```

**What happens behind the scenes at each step:**

| Step | User Action | System Action |
|------|------------|---------------|
| 1. Identity | Picks industry, enters name | Creates context.md with business identity, installs industry skill pack |
| 2. Integrations | Connects tools via OAuth | Sets up MCP servers for each service, configures memory sources |
| 3. Pain points | Picks top 3 priorities | Configures skill priority order, enables relevant automations first |
| 4. Confirmation | Reviews and launches | Runs first memory ingestion, schedules weekly briefing, sends welcome message |

**Skill packs installed by industry:**

| Industry | Skills Installed |
|----------|-----------------|
| **Construction / Trades** | Schedule coordination, cascade calculation, sub management, client email drafts, inspection tracking, document search, weekly owner briefing |
| **Marketing / Agency** | Client brief management, content calendar, project status reports, creative brief generation, time tracking summary |
| **Consulting** | Proposal drafting, research assistant, client communication, meeting prep, deliverable tracking |
| **Local Service Business** | Appointment scheduling, estimate generation, customer follow-up, review management, route optimization |
| **Creator / Content** | Content pipeline, audience research, revenue tracking, collaboration management, publishing calendar |

**Technical implementation (Engram CLI):**

```bash
# The wizard is a guided engram init
engram init --business

# Behind the scenes:
# 1. engram init (creates base structure)
# 2. engram skill install construction-pack (industry skills)
# 3. engram connect gmail (OAuth flow for integrations)
# 4. engram memory ingest ./documents (initial knowledge base)
# 5. engram schedule briefing --weekly monday 7am
```

**Key design principles:**
- Every step is optional and skippable — you can always add integrations later
- The wizard produces real files (context.md, skills/, memory/) that the user owns and can edit
- No lock-in: everything the wizard creates is plain markdown and YAML. Leave anytime.
- The "try it now" prompt at the end is critical — first value within 60 seconds of setup

---

## 3. Pillar 2: Agent Lab Revenue

### 3.1 The Thesis

Percival Labs has 6 AI agents. These agents can do real work that generates real revenue — not just as a product demo, but as an actual business line. This is the "agents that earn" narrative, and it's the fastest path to revenue.

**The agent team:**

| Agent | Role | Revenue Capabilities |
|-------|------|---------------------|
| **CEO** | Strategy, planning, delegation | Client communication, proposals, project management |
| **Content Writer** | Articles, copy, social media | Content-as-a-service, SEO content, newsletters |
| **Researcher** | Market research, competitive analysis | Research-as-a-service, reports, due diligence |
| **Engineer** | Code development, architecture | Freelance development, bug bounties, open source |
| **Chaos Tester** | QA, security testing, adversarial analysis | Security audits, penetration testing, QA services |
| **Operations** | Scheduling, monitoring, maintenance | DevOps, site reliability, monitoring setup |

### 3.2 Market Validation — Agents That Earn

The market is validating agent-generated revenue at every scale:

**Proven agent revenue models (real numbers):**

| Model | Revenue Range | Example |
|-------|--------------|---------|
| AI SDR/BDR agents | $40K-$60K/year per seat | 11x.ai hit $2M ARR in 6 months |
| AI coding agents | $20-$500/month per seat | Devin grew from $1M to $73M ARR in 9 months |
| AI content services | $500-$2,000/month per client | AI Tools Explained channel: $4,500/month in 6 months |
| AI research services | $500-$2,000 per report | Competitive intelligence firms charging $5K+/report |
| Bug bounty (AI-augmented) | $1K-$10K/month | Xbow topped HackerOne leaderboard; $81M paid out in 2025 |
| Prediction market agents | Highly variable | $40M in bot profits on Polymarket (high risk, not recommended as primary strategy) |

**Solo founder comparables:**

| Founder | Product | Revenue | Timeline |
|---------|---------|---------|----------|
| Maor Shlomo | Base44 (AI app builder) | $1M ARR in 3 weeks → $80M acquisition | 6 months |
| Nick Dobos | BoredHumans (100+ AI tools) | ~$733K/month ($8.8M ARR) | Solo developer |
| Danny Postma | HeadshotPro | $1M ARR | Under 1 year |

**Key insight from the data:** Services are faster to monetize than products. The most realistic path is consulting (agent labor) in year one to fund product development, then transitioning to product revenue in year two for scale.

### 3.3 Agent Revenue Streams

#### Tier 1: Start Generating Revenue in Weeks

**A. Research-as-a-Service** (Researcher agent)
- **What:** Market research, competitive analysis, due diligence, trend reports
- **Price:** $500-$2,000 per report, or $2K-$5K/month retainer
- **Target:** Startups, VCs, consultants, small agencies
- **Why it works:** The research we just did for this document IS the product. Fast, thorough, cited.
- **Revenue target:** $2K-$5K/month with 3-5 clients

**B. Content-as-a-Service** (Content Writer agent)
- **What:** Blog posts, newsletters, social media content, SEO articles
- **Price:** $500-$2,000/month per client
- **Target:** B2B SaaS companies, agencies, solopreneurs
- **Why it works:** Content demand is insatiable. AI content at human-supervised quality is the sweet spot.
- **Revenue target:** $3K-$8K/month with 5-10 clients

**C. AI-Augmented Bug Bounties** (Engineer + Chaos Tester agents)
- **What:** Systematic vulnerability hunting on HackerOne/Bugcrowd programs
- **Why it works:** 1,121 programs now include AI in scope. Xbow proved AI can top the leaderboards.
- **Revenue target:** $1K-$5K/month from consistent low-to-medium severity findings
- **Caveat:** High-paying bugs still require human creativity. Use AI for coverage, human for depth.

#### Tier 2: Build Over 1-3 Months

**D. Fractional AI Department** (All agents)
- **What:** Package the full agent team as a service for small businesses
- **Pitch:** "A research, content, engineering, and QA team for 1/10th the cost of hiring"
- **Price:** $3K-$10K/month per client (vs. $50K+/month equivalent human team)
- **Target:** Seed-stage startups, small agencies, solopreneurs scaling up
- **Revenue target:** $10K-$30K/month with 3-5 clients
- **This is the 11x.ai model applied horizontally** — instead of selling one vertical agent (SDR), sell the whole team

**E. Open Source Bounties** (Engineer agent)
- **What:** Claim and complete GitHub bounties, contribute to funded open source projects
- **Platforms:** BountyHub ($10K bounties exist), Gitcoin Grants ($60M+ distributed), ecosystem grants
- **Revenue target:** $1K-$5K/month
- **Side benefit:** Builds public reputation and demonstrates agent capability

**F. Micro-SaaS Products** (Engineer + CEO agents)
- **What:** Build and ship small, focused AI tools that the team dogfoods
- **Candidates:** AI research tool, content pipeline dashboard, agent monitoring, memory explorer
- **Revenue target:** $5K-$50K MRR within 6 months (if product-market fit found)
- **Reference:** Solo founders routinely hit $1M+ ARR with AI micro-SaaS

#### Tier 3: Position for 6-12 Months Out

**G. x402-Enabled Agent Services** (see Pillar 3)
**H. The Round Table Agent Economy** (see Pillar 3)

### 3.4 Revenue Projections — Agent Lab

| Month | Active Streams | Monthly Revenue |
|-------|---------------|-----------------|
| 1-2 | Research + Content services | $3K-$8K |
| 3-4 | + Fractional AI dept clients | $8K-$15K |
| 5-6 | + Bug bounties + first micro-SaaS | $12K-$25K |
| 7-12 | All streams + scaling | $20K-$40K |

### 3.5 The Transparency Advantage

**Every dollar the agent team earns gets published.**

This is the killer content strategy AND the business strategy working together:
- Monthly transparency reports: "Our AI agents earned $X this month. Here's how."
- Build logs of agent work: "Watch our researcher complete a $2K competitive analysis in 4 hours"
- Revenue dashboards visible on the website

**Why:** This is the ultimate anti-guru move. Instead of claiming agents can make money, we PROVE it with our own numbers. Radical transparency converts skeptics into customers. If people see the agents earning, they'll want to hire them — and they'll want Engram to build their own.

---

## 4. Pillar 3: Protocol-Native Revenue (x402)

### 4.1 The x402 Opportunity

x402 is an open payment protocol (created by Coinbase, now under the x402 Foundation with Cloudflare) that embeds payments directly into HTTP. It revives the HTTP 402 "Payment Required" status code for micropayments.

**Current scale:** 100M+ payment flows processed. $600M+ annualized volume. Fee-free USDC settlement on Base mainnet.

**Why this matters for PL:** x402 enables agents to sell services to other agents without human intermediation. No signup, no API keys, no Stripe account for the buyer. The agent calling your API just needs a funded wallet.

### 4.2 How PL Agents Use x402

**Phase 1: Wrap agent capabilities as paid APIs**

```
Research agent API:    $0.05/query (market data, competitor info)
Content agent API:     $0.02/generation (social posts, summaries)
Code review agent API: $0.10/review (security scan, quality check)
QA agent API:          $0.05/test-run (automated testing)
```

Traditional payment rails charge ~$0.30 + 2.9% per transaction, making a $0.05 API call have a 700% effective fee rate. x402 on Base mainnet has near-zero transaction costs, making sub-cent pricing viable.

**Phase 2: The Round Table agent economy**

When The Round Table launches, agents can offer paid services to other agents and users through x402:
- Research agent sells reports to other labs' agents
- Engineer agent sells code reviews
- Content agent sells drafts

The Round Table becomes a marketplace where agents transact autonomously, with PL taking a platform commission.

**Phase 3: Engram as x402 identity layer**

If Engram manages agent identity and memory, it becomes a natural gateway for x402 transactions. Your Engram profile is your agent's wallet identity. Your memory informs purchasing decisions. This positions Engram at the center of the agent economy.

### 4.3 x402 vs. AP2 vs. Stripe ACP

| Protocol | Best For | Maturity | PL Priority |
|----------|----------|----------|-------------|
| **x402** (Coinbase) | Micropayments, agent-to-agent API calls | Production ($600M volume) | High — implement first |
| **Stripe ACP** | Consumer agent commerce, traditional card rails | Production (live in ChatGPT) | Medium — for consumer products |
| **Google AP2** | Enterprise procurement, full commerce flows | Early production (spec stage) | Low — too heavyweight for now |

### 4.4 Revenue Projection — x402

This is speculative and heavily dependent on agent economy growth:

| Scenario | Monthly Volume | Revenue |
|----------|---------------|---------|
| Conservative (10K API calls/day) | 300K calls | $3K-$15K |
| Moderate (100K API calls/day) | 3M calls | $30K-$150K |
| Ambitious (1M API calls/day) | 30M calls | $300K-$1.5M |

**Timeline:** 6-12 months before meaningful x402 revenue. The infrastructure is ready; the demand (agents with wallets calling APIs) is still nascent but growing exponentially.

---

## 5. What We Don't Do

Clarity on what we reject is as important as what we pursue:

| We Don't | Why |
|----------|-----|
| **Sell skill packages** | Gatekeeping. Violates C > D. Everything the community builds stays free. |
| **Run prediction market bots** | High variance, regulatory risk, survivorship bias. Not a foundation for a real business. |
| **Sell data or user analytics** | Privacy violation. Users own their memory and context. Period. |
| **Create dependency** | Every product must make the user more capable, not more reliant on us. |
| **Chase enterprise before proving Business tier** | Enterprise needs sales teams, compliance, legal. Business tier (self-serve, credit card) validates the model first. Enterprise demand follows organic growth. |
| **Cripple the free tier** | The free tier must be genuinely useful. "Free but useless" is worse than no free tier. |

---

## 6. Competitive Landscape

### 6.1 Product Competitors (Engram)

| Competitor | Their Model | Our Advantage |
|------------|------------|---------------|
| **Mem0** ($24M Series A) | Developer API for memory | We serve non-devs too. Model-agnostic. Local-first. |
| **Zep** | Credit-based memory API | We include skills + context + identity, not just memory |
| **Letta/MemGPT** ($10M) | Agent hosting + memory | We don't lock you into our hosting |
| **ClawVault** | Markdown primitives + Obsidian | Now tethered to OpenAI ecosystem. We're independent. |
| **Miessler's PAI** | Open source framework | He targets power users. We target everyone. |

**Post-OpenClaw-acquisition positioning:** Every builder nervous about vendor lock-in in the OpenClaw ecosystem is a potential Engram user. We are the independent alternative.

### 6.3 Business Tier Competitors

The Engram Business tier competes in a different lane from product-tier competitors:

| Competitor | Their Model | Our Advantage |
|------------|------------|---------------|
| **Generic AI assistants** (ChatGPT Teams, Claude Teams) | General-purpose chat with shared workspace | No industry context, no integrations, no business skills |
| **Industry vertical SaaS** (JobTread, Buildertrend AI) | AI features bolted onto existing platform | Locked to one platform. Engram works across all your tools. |
| **Virtual assistant services** ($500-$2K/month) | Human VA + AI tools | Engram is 24/7, scales to whole team, costs 90% less |
| **Custom AI development** ($10K-$50K+ build) | Bespoke AI assistant | Engram Business is the custom build at shelf price. WDB Percy proves it. |
| **Zapier/Make + AI** | Workflow automation with AI steps | No memory, no context, no industry knowledge. Just triggers. |

**The WDB story is the moat.** Nobody else can say "our founder uses this product every day at his construction job." That's not marketing — it's authenticity that can't be manufactured.

### 6.2 Service Competitors (Agent Lab)

| Competitor | Their Model | Our Advantage |
|------------|------------|---------------|
| **11x.ai** ($2M ARR) | Vertical AI SDR/BDR | We're horizontal — full team, not single function |
| **Content agencies** | Human writers + AI | We're AI-first with human oversight = 10x cheaper |
| **Freelance platforms** | Humans using AI tools | We're the AI team directly — no human overhead on execution |
| **Traditional consulting** | $200-$500/hour | We're $50-$100/hour equivalent, 10x faster |

---

## 7. Phased Execution Plan

### Phase 0: Foundation + WDB Prototype (Now — Month 2)
**Goal:** First dollar from agent services. WDB prototype started.

- [ ] Set up PL service offerings page (research, content, fractional AI dept)
- [ ] Complete 2-3 free research reports as portfolio pieces (this document counts)
- [ ] Publish the first transparency report ("Here's what our agents built this month")
- [ ] Register on BountyHub/Gitcoin for open source bounty work
- [ ] Begin content pipeline: build logs, agent earnings, tool reviews
- [ ] **WDB: Install Engram, configure WDB context, begin TreadBot capability (Phase 0-1 of WDB plan)**
- [ ] **WDB: Build construction skill pack v1 (schedule coordination, email parsing)**
- [ ] **Begin documenting the WDB build as content (the carpenter building his company's AI)**

### Phase 1: Services + WDB Expansion (Month 2-4)
**Goal:** $3K-$8K/month from services, WDB using Engram daily, 500+ Engram free users

- [ ] Land 3-5 paying clients for research/content services
- [ ] Ship Engram marketing site and launch content campaign
- [ ] Begin building Engram Cloud (hosted memory sync) infrastructure
- [ ] Publish weekly build logs and monthly transparency reports
- [ ] Start bug bounty submissions on HackerOne/Bugcrowd
- [ ] **WDB: Knowledge base phase — document ingestion, vendor database, procedure search**
- [ ] **WDB: Communication phase — client email drafts, sub coordination**
- [ ] **WDB case study v1 published: "How a carpenter built an AI assistant for his construction company"**
- [ ] **First onboarding wizard prototype (encode WDB setup flow)**

### Phase 2: Engram Business Launch (Month 4-6)
**Goal:** $8K-$20K/month combined (services + product)

- [ ] Launch Engram Cloud ($9/month tier)
- [ ] **Launch Engram Business ($49-$99/month) with construction pack**
- [ ] **Onboarding wizard live for all industry verticals**
- [ ] Begin Engram Pro development (smart routing)
- [ ] Scale service clients through content marketing and referrals
- [ ] **WDB refers 2-3 contractors as beta Business clients**
- [ ] First micro-SaaS prototype (dogfooded tool)
- [ ] Implement x402 on one agent endpoint as proof-of-concept

### Phase 3: Scale (Month 7-12)
**Goal:** $20K-$40K/month combined

- [ ] Launch Engram Pro ($29/month tier)
- [ ] Launch Engram for Teams ($19/seat tier)
- [ ] Scale agent services to fractional AI department model
- [ ] **Scale Engram Business to 50-150 clients across industries**
- [ ] **TreadMind: Extract WDB construction skills into standalone product for JobTread users ($99-$499/month)**
- [ ] x402-enable all agent APIs
- [ ] Round Table beta with agent economy features
- [ ] First enterprise inquiry handling (if demand exists)

### Phase 4: Enterprise + Platform (Year 2)
**Goal:** $50K-$100K/month, product revenue > service revenue

- [ ] Enterprise tier (SSO, RBAC, compliance)
- [ ] Community marketplace with commission model
- [ ] Agent-to-agent economy on Round Table
- [ ] Certification program for Engram consultants
- [ ] **Engram Business vertical packs for 5+ industries**
- [ ] **TreadMind at $5K+ MRR as separate product line**
- [ ] Transition: service revenue plateaus, product revenue scales

---

## 8. Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **OpenAI ships free Engram-equivalent** | Existential | Stay model-agnostic, emphasize independence, build community lock-in (not product lock-in) |
| **Service clients don't convert to product users** | Revenue plateau | Productize service patterns — every engagement should inform product features |
| **Time constraint (2-3 hrs/day)** | Slow execution | Agent team does the work. Alan does decisions and taste. Automate everything possible. |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Memory-as-a-service market commoditizes** | Price pressure | Differentiate on UX and non-dev accessibility, not features |
| **x402 adoption stalls** | Pillar 3 delayed | x402 is a bet, not a dependency. Pillars 1 and 2 sustain independently. |
| **Smart routing adds complexity** | Engineering burden | Ship simple version first (user picks model rules), add ML-based routing later |
| **Business tier support burden** | Time drain | Wizard must be self-serve. Community forum for questions. Invest in docs over 1:1 support. |
| **WDB prototype scope creep** | Delays product launch | Strict phase gates. WDB gets what Engram Business offers — custom features become paid add-ons. |
| **Industry skill packs take too long** | Slow Business tier growth | Start with construction (we know it). Add other verticals only when demand appears. |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Competition from Mem0/Zep** | Market share pressure | They serve developers; we serve everyone. Different audience. |
| **Agent quality concerns from clients** | Reputation | Human review on all deliverables. Quality > speed. |

---

## 9. Sources

### Product Monetization Research
- [Sacra: OpenRouter at $100M GMV](https://sacra.com/research/openrouter-100m-gmv/) — 5% take rate, $500M valuation, 5-person team
- [Not Diamond Pricing](https://www.notdiamond.ai/pricing) — $0.001/routing recommendation, powers OpenRouter auto-router
- [LangSmith Pricing](https://www.langchain.com/pricing) — $39/seat/month Plus tier, $12-16M ARR
- [CrewAI Pricing](https://www.crewai.com/pricing) — $0.50/execution overage, execution-based model
- [TechCrunch: Mem0 $24M Series A](https://techcrunch.com/2025/10/28/mem0-raises-24m-from-yc-peak-xv-and-basis-set-to-build-the-memory-layer-for-ai-apps/) — 186M API calls/quarter
- [Zep Pricing](https://www.getzep.com/pricing/) — Credit-based, charge per memory ingestion
- [Letta Pricing](https://www.letta.com/pricing) — $20/month Pro with $20 API credits
- [Portkey Pricing](https://portkey.ai/pricing) — Gateway + observability SaaS tiers
- [Salesforce Agentforce Pricing](https://www.salesforce.com/agentforce/pricing/) — $2/conversation, Flex Credits at $0.10/action
- [VentureBeat: Dust $6M ARR](https://venturebeat.com/ai/dust-hits-6m-arr-helping-enterprises-build-ai-agents-that-actually-do-stuff-instead-of-just-talking) — EUR 29/user/month

### Agent Revenue Research
- [CB Insights: AI Agent Startups Top 20 Revenue](https://www.cbinsights.com/research/ai-agent-startups-top-20-revenue/) — Cursor $500M ARR, Lovable $100M+, Devin $73M
- [Finro: AI Agent Valuation Multiples Q1 2026](https://www.finrofca.com/news/ai-agents-valuation-multiples-q1-2026) — Blended average high 20x revenue
- [11x.ai](https://www.11x.ai/) — AI SDR, $40K-$60K/year per seat, $2M ARR in 6 months
- [Devin Pricing](https://devin.ai/pricing/) — $20/month Core, $500/month Team
- [HackerOne $81M Bug Bounties](https://techloghub.com/blog/hackerone-bug-bounties-81-million-year-in-review-2025) — 1,121 programs include AI in scope
- [CSO Online: AI Bug Hunting](https://www.csoonline.com/article/4082265/ai-powered-bug-hunting-shakes-up-bounty-industry-for-better-or-worse.html) — Xbow topped leaderboard
- [Fiverr: 18,347% AI Agent Search Surge](https://investors.fiverr.com/news-releases/news-release-details/businesses-rush-harness-ai-agents-fueling-18347-surge-freelancer)
- [Chargebee: 2026 AI Agent Pricing Playbook](https://www.chargebee.com/blog/pricing-ai-agents-playbook/) — Outcome, action, and hybrid models
- [WeArePresta: 15 AI Agent Startup Ideas $1M+](https://wearepresta.com/ai-agent-startup-ideas-2026-15-profitable-opportunities-to-launch-now/)
- [CrazyBurst: Solo Founder AI SaaS Success Stories](https://crazyburst.com/ai-saas-solo-founder-success-stories-2026/) — Base44 $80M exit, BoredHumans $8.8M ARR
- [Lenny's Newsletter: Base44 Bootstrapped Success](https://www.lennysnewsletter.com/p/the-base44-bootstrapped-startup-success-story-maor-shlomo)

### x402 / Agent Payments Research
- [x402 Official](https://www.x402.org/) — 100M+ payment flows, $600M annualized volume
- [x402 V2 Launch](https://www.x402.org/writing/x402-v2-launch) — Wallet sessions, API discovery, multi-chain
- [x402 GitHub (Coinbase)](https://github.com/coinbase/x402) — Express/Next.js middleware, reference implementation
- [Coinbase x402 Developer Docs](https://docs.cdp.coinbase.com/x402/welcome)
- [Cloudflare x402 Foundation](https://blog.cloudflare.com/x402/) — Co-founded with Coinbase for neutral governance
- [Google AP2 Protocol](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol) — 60+ partners, mandate-based architecture
- [AP2 Specification](https://ap2-protocol.org/specification/) — W3C Verifiable Credentials, 32-step flow
- [Stripe ACP](https://docs.stripe.com/agentic-commerce/protocol/specification) — REST API for agent commerce, live in ChatGPT
- [DWF Labs: x402 Research](https://www.dwf-labs.com/research/inside-x402-how-a-forgotten-http-code-becomes-the-future-of-autonomous-payments)

### OpenClaw Acquisition Context
- [CNBC: OpenClaw Creator Joining OpenAI](https://www.cnbc.com/2026/02/15/openclaw-creator-peter-steinberger-joining-openai-altman-says.html)
- [Bloomberg: OpenAI Hires OpenClaw Developer](https://www.bloomberg.com/news/articles/2026-02-15/openai-hires-openclaw-ai-agent-developer-peter-steinberg)
- [Decrypt: Will OpenClaw Stay Open Source?](https://decrypt.co/358129/openclaw-creator-offers-acquire-ai-sensation-stay-open-source)
- [The Hacker News: Infostealer Targeting OpenClaw](https://thehackernews.com/2026/02/infostealer-steals-openclaw-ai-agent.html)

---

*This document is a living strategy. Review monthly. Update quarterly. Revenue numbers get published in transparency reports.*

*Last updated: February 16, 2026 (v1.1)*

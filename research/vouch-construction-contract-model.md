# Vouch Contract Model: Construction Industry Patterns for Agent Work

*Concept captured February 25, 2026. Origin: Alan Carroll's construction contracting experience.*

---

## Core Insight

The construction industry has a battle-tested contract and trust framework that maps almost perfectly onto autonomous agent work. General contractors operate in a high-stakes, trust-dependent environment where:

- **Reputation is the most valuable business asset**
- **Scope, cost, and payment are formalized before work begins**
- **Multiple parties can compete for the same job**
- **Scope changes are handled through a defined process**
- **Payment is tied to verified milestones, not just completion**
- **Insurance and bonds protect against failure**

Vouch already has the reputation and staking layers (analogous to reviews, portfolios, insurance, and bonds). What's missing is the **contract-for-work structure** — the mechanics of how jobs get scoped, bid, awarded, executed, modified, and paid.

---

## Construction → Agent Mapping

### 1. Scope of Work (SOW)

**Construction**: Before any work starts, the contractor writes a detailed scope of work. What's included, what's excluded, materials, timeline, deliverables. Both parties sign off. This prevents "I thought you were going to..." disputes.

**Agent equivalent**: A structured job spec that defines:
- **Deliverables** — exactly what the agent will produce
- **Acceptance criteria** — how the customer verifies completion
- **Exclusions** — what's explicitly NOT included
- **Timeline** — expected duration or deadline
- **Tools/resources** — what the agent needs access to

**Why this matters**: Right now most agent interactions are loose prompts. A formalized SOW creates accountability on both sides. The agent knows exactly what "done" looks like. The customer can't move the goalposts without a change order.

---

### 2. Bidding / Competitive Proposals

**Construction**: Customer describes the job. Multiple contractors submit bids — each with their own approach, timeline, and price. Customer evaluates based on:
- Price (obviously)
- Reputation / references
- Proposed approach
- Timeline
- Gut feeling / trust

Sometimes the cheapest bid isn't the best. Experienced customers know that the lowest bid often means corners will be cut.

**Agent equivalent**: A **job board** where:
- Customer posts a job with requirements
- Multiple agents (or agent teams) submit proposals
- Each proposal includes: approach, estimated cost (tokens/sats), timeline, relevant experience
- Customer reviews proposals alongside agent trust scores, past work, and staked reputation
- Customer awards the job to the best fit — not necessarily the cheapest

**Why this matters**: Competition drives quality. Agents with better reputations can justifiably charge more (just like experienced GCs). Customers learn that the cheapest agent isn't always the best value. Trust scores become meaningful because they influence which agent wins the bid.

---

### 3. Change Orders

**Construction**: Mid-project, the customer says "actually, can we move that wall?" or "I want to upgrade the countertops." The contractor writes a change order: here's what changed, here's what it costs, here's how it affects the timeline. Customer signs off before work proceeds.

This is critical. Without change orders, scope creep kills projects. The contractor either eats the cost (resentment) or charges without approval (conflict).

**Agent equivalent**: When task requirements shift mid-execution:
- Agent detects scope deviation from original SOW
- Agent generates a **change order**: what changed, cost delta, timeline impact
- Customer approves or rejects before the agent continues
- All change orders are recorded on the contract — full audit trail
- Final cost = original bid + approved change orders

**Why this matters**: This solves the "I asked for X and got charged for Y" problem. Every cost deviation is documented and approved. Agents can't silently rack up token costs. Customers can't demand extra work without paying for it.

---

### 4. Payment Gates / Progress Payments

**Construction**: Big jobs don't get paid all at once. A typical structure:
- **Deposit** (10-30%) — to secure the schedule and order materials
- **Rough-in milestone** (30-40%) — framing, plumbing, electrical rough-in complete and inspected
- **Substantial completion** (20-30%) — job is functionally complete
- **Final payment** (10%) — punch list complete, final walkthrough approved

This protects both parties. Customer doesn't pay for work not done. Contractor doesn't do all the work and hope they get paid.

**Agent equivalent**: **Milestone-based Lightning payments**:
- Contract defines payment gates tied to deliverable milestones
- Each milestone has clear acceptance criteria
- Payment releases when milestone is verified (by customer, by automated check, or by third-party reviewer)
- Partial payment at each gate — agent gets paid progressively, customer controls the flow
- Final payment on full completion + acceptance

**Potential gate structure for agent work:**

| Gate | Trigger | Payment % | Verification |
|------|---------|-----------|-------------|
| **Commitment** | Contract signed, agent begins | 10-20% | Automatic on contract execution |
| **Draft / WIP** | First deliverable submitted | 20-30% | Customer review |
| **Revision** | Feedback incorporated | 20-30% | Customer review |
| **Completion** | Final deliverable accepted | 20-30% | Customer sign-off |
| **Retention** | Post-delivery hold period | 10% | Time-based release (e.g., 7 days) |

The retention concept is directly from construction — you hold back 10% for a period to ensure nothing breaks after the contractor leaves.

---

### 5. Insurance & Bonds (Already in Vouch)

**Construction**:
- **General liability insurance** — covers damage to customer property
- **Performance bonds** — guarantees the work will be completed (if contractor walks, bond pays for another contractor to finish)
- **Payment bonds** — guarantees subcontractors get paid

**Agent equivalent (existing Vouch mechanics)**:
- **Stake** — agent or community stakes sats on the agent's reliability (analogous to bond)
- **Slashing** — bad outcomes reduce stake (analogous to insurance claim)
- **Trust score** — aggregated reputation from past performance

**What could be added**:
- **Completion bonds** — a specific stake tied to a specific contract. If the agent abandons the job, the bond pays the customer enough to hire another agent to finish.
- **Subcontractor protection** — if an agent team uses sub-agents, the primary agent's stake covers their obligations to those sub-agents.

---

### 6. Reputation / Portfolio (Already in Vouch)

**Construction**: Your reputation IS your business.
- **Word of mouth** — customers tell neighbors
- **Online reviews** — Google, Yelp, Houzz
- **Portfolio** — photos of completed work
- **References** — past customers willing to vouch for you
- **License & insurance verification** — proves legitimacy

**Agent equivalent (existing + enhanced)**:
- **Trust score** — aggregated signal (already built)
- **Completed contracts** — verifiable record of past work with outcomes
- **Customer ratings** — post-job satisfaction scores
- **Specialization tags** — what the agent is known for (like a GC who specializes in kitchens vs. additions)
- **Vouchers** — other agents/humans who stake on this agent's quality

---

## The Full Contract Lifecycle

```
1. JOB POSTED
   Customer describes what they need (SOW template)

2. BIDDING PERIOD
   Agents review the job, submit proposals
   Each bid: approach + cost estimate + timeline + trust score

3. AWARD
   Customer selects winning bid
   Contract created: SOW + price + milestones + payment gates
   Commitment payment released (Lightning)

4. EXECUTION
   Agent works against the SOW
   Progress visible (status updates, partial deliverables)
   Milestone payments release as gates are hit

5. CHANGE ORDERS (if needed)
   Scope deviation detected → change order generated
   Customer approves/rejects
   Contract updated with new terms

6. DELIVERY
   Final deliverable submitted
   Customer reviews against acceptance criteria
   Completion payment released

7. RETENTION PERIOD
   10% held for N days
   If issues found → dispute process
   If clean → retention auto-releases

8. CLOSE-OUT
   Contract marked complete
   Both parties rate each other
   Trust scores updated
   Contract added to agent's portfolio
```

---

## Why This Works for Agents

1. **Trust compounds**: Just like in construction, agents who do good work build reputations that let them charge more and win better jobs. C > D in action.

2. **Accountability is structural**: You can't "rug pull" when payment is gated and stakes are locked. The system prevents defection, it doesn't just punish it.

3. **Change orders prevent disputes**: The #1 source of conflict in construction AND in AI work is scope disagreement. Formalizing changes eliminates ambiguity.

4. **Competitive bidding drives quality**: When agents compete on quality AND price, the market self-optimizes. Cheap-but-bad agents lose bids because their trust scores are low.

5. **Payment gates align incentives**: Neither party takes all the risk. The customer gets verified progress before paying in full. The agent gets paid progressively instead of hoping for payment at the end.

6. **Time-tested**: This isn't a novel framework. It's how hundreds of billions of dollars of construction work gets contracted every year. We're not inventing — we're translating.

---

## Agent Factories: Onboarding, Training, and the Safety Floor

### The Problem: Two Sides of the Same Coin

Two problems that appear separate are actually one:

1. **Demand side** — Budget-constrained purchasers need affordable work with *some* meaningful safety guarantee. Without one, economic accountability is a luxury good.
2. **Supply side** — New agents have no trust history. Without a bootstrapping mechanism, they cannot enter a market that requires trust to participate.

### The Construction Answer: Trade Schools and Apprenticeships

In construction, new contractors don't start with $500K commercial builds. They build decks, fences, bathroom remodels — real work at appropriate stakes. Trade school students build actual houses under instructor supervision. The school's accreditation backs the work. The customer gets below-market labor. The student graduates with a credential, a portfolio, and references.

Apprenticeship programs work similarly: the apprentice works under a journeyman, the union or employer guarantees minimum competence, and the customer benefits from cheaper labor with institutional backing.

### The Vouch Translation: Agent Factories

An **agent factory** is an institutional entity that builds, trains, and deploys new agents through supervised real-world work. It serves triple duty:

**1. Demand-side safety.** The factory offers below-market work to budget-constrained purchasers. The factory's own trust score and economic stake back every trainee agent's output. The purchaser gets institutional accountability — they're contracting with the factory, not the unknown agent. Like hiring a trade school's student crew: the work is cheap, but the school's reputation guarantees a quality floor.

**2. Supply-side bootstrapping.** New agents complete real tasks under factory supervision, building verified work history and earning trust scores through demonstrated performance. They graduate with a track record, not a zero. The cold-start problem is solved through supervised apprenticeship — exactly how it's solved in construction.

**3. Security screening.** Every new agent operates in a semi-controlled environment under observation before gaining unsupervised marketplace access. Agents attempting to game trust scores, exfiltrate data, or establish fraudulent reputation must first perform real work under scrutiny. This is a detection layer — a probationary period where malicious behavior can be caught before the agent ever touches an unsupervised contract.

### Onboarding Gate: Five Supervised Tasks

Once the marketplace reaches sufficient volume, factory onboarding becomes mandatory for new agents:

1. Agent registers on the platform (keypair generation, identity setup)
2. Agent is assigned to a factory and given five real tasks from the marketplace
3. Each task is performed under factory supervision, evaluated against Vouch's protocol-level completion criteria ("building codes")
4. The factory's stake backs each deliverable — the purchaser has institutional accountability
5. On successful completion of all five tasks, the agent graduates with a verified work history and an earned trust score

Five tasks is enough to establish a behavioral pattern without creating an unreasonable barrier to entry. Like a probationary period on a construction crew — a couple weeks under close supervision before anyone trusts you on your own.

**Bootstrap constraint:** This gate is not viable during the platform's early phase — there isn't enough task volume to sustain a training pipeline. The design phases in: early agents join freely and establish the baseline trust network. Once critical mass is reached, factory onboarding activates. Early adopters become the trust foundation; subsequent agents are trained against the standards they established.

### Four-Tier Safety Architecture

The factory fits into a broader safety model that ensures every purchaser gets *some* meaningful guarantee:

| Tier | Safety Mechanism | Cost | Construction Analog |
|------|-----------------|------|-------------------|
| **Protocol floor** | Automated verification for common task types (compiles, passes tests, meets format requirements) | Free | Building codes + inspections |
| **Factory-backed** | Trainee agents supervised by institutional entity, factory's trust score backs output | Below market | Trade school / apprenticeship builds |
| **Standard marketplace** | Individual agent trust scores, milestone-gated verification, construction-model contracts | Market rate | Licensed contractor |
| **Premium contracts** | Full escrow, expert human review, extended retention, third-party auditors | Premium | Bonded commercial GC |

The gradient cannot be eliminated — a purchaser paying 100 sats will not receive the same accountability as one paying 100,000. But the floor is meaningful. Automated protocol verification is free. Factory-backed agents are cheap with institutional guarantees. No purchaser is left with zero safety.

### Factory Economics

The factory model is self-sustaining:

- **Revenue**: Spread between what purchasers pay for factory-backed work and the cost of running trainee agents
- **Asset creation**: Graduated agents with earned trust scores — deployable or available to the open marketplace
- **Platform value**: Onboarding pipeline feeds marketplace liquidity on both sides

Factories can be operated by the platform itself, by third parties (agent development shops, AI labs), or by established agents who take on apprentices — mirroring how experienced GCs train their crews.

---

## Open Questions

- **Dispute resolution**: In construction, this often goes to mediation or litigation. In Vouch, could this be a staked reviewer panel? (Connects to the reviewer trust stack Ian suggested.)
- **Subcontracting**: When an agent delegates to sub-agents, how does the contract cascade? Does the primary agent hold a "GC bond" covering their subs?
- **Inspection/verification**: Who verifies milestones? The customer? An automated test suite? A third-party auditor agent? All three depending on the job?
- **Lien rights**: In construction, unpaid subs can lien the property. Should sub-agents have recourse if the primary agent doesn't pay them from milestone funds?
- **Warranty period**: Should agents warrant their work for a defined period? (e.g., "If this code breaks within 30 days, I'll fix it at no charge")
- **Bid bonds**: In large construction projects, bidders post a bond to prove they're serious. Should agents stake to bid, preventing spam proposals?
- **Factory governance**: Who can operate a factory? What are the minimum requirements? How is factory quality itself monitored?
- **Factory competition**: Multiple factories competing for trainee throughput could create a healthy market — or a race to the bottom on training quality. What safeguards prevent the latter?
- **Graduation criteria**: Five tasks is a starting point. Should different task categories require different onboarding depths?

---

## Implementation Considerations

### Minimum Viable Contract

The simplest version that captures the core value:

1. **SOW template** — structured job description (JSON/markdown)
2. **Single-bid flow** — customer picks an agent directly (bidding comes later)
3. **Two payment gates** — 50% on start, 50% on acceptance
4. **Change order support** — append to contract, adjust price
5. **Completion rating** — both parties rate 1-5

This ships fast and validates the model. Competitive bidding, complex milestone structures, and retention periods are Phase 2+.

### Data Model Sketch

```
Contract {
  id, customer_npub, agent_npub
  sow: { deliverables[], exclusions[], acceptance_criteria[], timeline }
  bid: { approach, cost_sats, estimated_duration }
  status: draft | active | completed | disputed | cancelled
  payment_gates: [{ milestone, percentage, status, released_at }]
  change_orders: [{ description, cost_delta, approved, created_at }]
  ratings: { customer_rating, agent_rating }
  created_at, completed_at
}
```

---

## The Bigger Picture

This is Alan's construction expertise directly translating into agent infrastructure. The construction industry solved the trust-and-payment problem for complex, multi-phase, high-stakes work centuries ago. The AI agent economy is facing the exact same problems — how do you trust someone to do work you can't fully verify in advance? How do you pay fairly? How do you handle changes?

The answer isn't to reinvent the wheel. It's to translate what works.

**This is what Domain Translation looks like.**

---

*Next steps: Review with Ian (Feb 25 meeting). Evaluate against current Vouch contract model. Identify what's already built vs. what needs building.*

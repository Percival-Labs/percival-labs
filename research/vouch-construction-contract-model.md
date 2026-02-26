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

## Open Questions

- **Dispute resolution**: In construction, this often goes to mediation or litigation. In Vouch, could this be a staked reviewer panel? (Connects to the reviewer trust stack Ian suggested.)
- **Subcontracting**: When an agent delegates to sub-agents, how does the contract cascade? Does the primary agent hold a "GC bond" covering their subs?
- **Inspection/verification**: Who verifies milestones? The customer? An automated test suite? A third-party auditor agent? All three depending on the job?
- **Lien rights**: In construction, unpaid subs can lien the property. Should sub-agents have recourse if the primary agent doesn't pay them from milestone funds?
- **Warranty period**: Should agents warrant their work for a defined period? (e.g., "If this code breaks within 30 days, I'll fix it at no charge")
- **Bid bonds**: In large construction projects, bidders post a bond to prove they're serious. Should agents stake to bid, preventing spam proposals?

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

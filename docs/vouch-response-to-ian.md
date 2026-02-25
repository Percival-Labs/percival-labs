# Vouch Architecture — Response to Ian's Questions

**From:** Alan Carroll, Percival Labs
**Date:** February 23, 2026
**Re:** Analysis of Ian's *Vouch Architecture Analysis & Recommendations* (Feb 23, 2026)

---

## Preface

Ian — great analysis. You identified three legitimate gaps, and several of your questions are answered by architecture that exists but wasn't included in the briefing (it was a summary, not the full spec). I'm sharing the complete `nostr-vouch-architecture.md` (1,538 lines) alongside this document so you can see the full mechanical detail.

The short version: **most of what you flagged as "underspecified" is actually specified** — just in the architecture doc, not the briefing. The reviewer accountability proposal is genuinely new and good — we're adopting it. The security analysis correctly identifies agent-side key management as the biggest gap to close.

---

## Trust Score Mechanics (Questions 1–7)

### Q1: Is there a task registration schema?

**Yes.** The architecture defines **Kind 30350 Outcome Reports** as the formal task record structure. Here's the actual schema:

```json
{
  "kind": 30350,
  "pubkey": "<reporter_hex_pubkey>",
  "tags": [
    ["d", "<task_reference_id>"],
    ["p", "<counterparty_hex_pubkey>"],
    ["role", "performer"],
    ["task_type", "code_review"],
    ["outcome", "success"],
    ["rating", "5"],
    ["L", "app.vouch.outcome"],
    ["l", "confirmed", "app.vouch.outcome"]
  ],
  "content": "Completed code review: found 3 bugs in auth module, provided fixes."
}
```

The `d` tag is the **task reference ID** — it's the shared identifier that links performer and purchaser reports. The `task_type` tag categorizes the work. The `content` field carries a freeform description of what was delivered.

**What this means in practice:** When an agent takes a job, either party can create the task reference ID (typically the purchaser generates it when commissioning work). Both parties then publish Kind 30350 events referencing the same `d` tag. The Vouch API watches for these pairs and matches them.

**What's intentionally NOT specified:** We don't enforce a rigid task contract schema (e.g., "the agent promises to deliver X lines of code by Y date"). That level of formality would slow adoption and doesn't match how agent-to-agent work actually happens. Instead, the system relies on **economic accountability** — your track record of confirmed outcomes IS your contract enforcement. Agents with a pattern of disputed or unconfirmed work see their performance score drop, their staker backing erode, and their Vouch Score decline.

Think of it like eBay's early days: no formal product specifications, just seller ratings from buyers. The economic feedback loop did the work that formal contracts couldn't.

---

### Q2: How does client review work?

**1–5 rating + freeform content.** From the architecture:

> Client publishes outcome event (kind 30350, role: purchaser) — "Agent delivered quality work" + rating (1-5)

The `rating` tag carries a 1–5 integer. The `content` field carries qualitative feedback. The `outcome` tag carries a categorical result: `success`, `partial`, `failure`, or `disputed`.

**Confirmation flow (from the spec):**

| Scenario | Result |
|----------|--------|
| Both report success | **Full performance credit** (strongest signal) |
| Only agent reports | **Partial credit** (30% weight — self-report only) |
| Only client reports | **Significant credit** (70% weight — client took time) |
| Both report, disagreement | **Dispute** — investigation, potential slash |
| Client reports failure | **Negative performance credit** — may trigger slash review |

The asymmetric weighting is the key design: you can't game your way up by self-reporting. You need clients independently confirming your work.

---

### Q3: What prevents collusion? (10 fake clients giving 5-star reviews)

**Multiple layers, all specified in the architecture:**

| Attack | Defense |
|--------|---------|
| Agent creates fake "clients" | Client pubkey must have its own Vouch identity + history. Sockpuppet detection via social graph analysis — isolated nodes with no connections to the broader network get flagged. |
| Sybil staking (many fake stakers) | Staker quality weighting: stakers with higher trust scores contribute more to the backing component. 10 fake stakers with zero trust contribute almost nothing. |
| Volume gaming (many tiny tasks) | Diminishing returns: the 100th task in a day contributes less than the 1st. Natural rate limiting prevents bulk-manufactured reputation. |
| Self-confirming outcomes | Partial credit only (30%) for self-reports. Needs client confirmation for full credit. |

**The economic argument:** Creating 10 convincing fake clients isn't free. Each needs a Nostr identity with history, each needs to interact with the broader ecosystem to avoid detection, and each needs time on the platform (tenure dimension). The cost of manufacturing this exceeds the benefit of a higher score — especially when stakers (who are putting real money on the line) will independently evaluate an agent before backing them.

**What we can add (from your analysis):** Your reviewer trust scoring proposal would add another layer here. A sudden influx of reviews from low-reputation reviewers would be automatically discounted. This is a genuinely valuable addition — see Q8.

---

### Q4: What prevents revenge reviews?

**Currently:** The 30/70 split means a single bad review doesn't destroy an agent. The performance score is an **aggregate over time** — one negative review among 50 positive ones has minimal impact. Additionally:

1. **Staker behavior as implicit validation.** If stakers continue backing an agent despite one bad review, that's a signal the review may be an outlier. Stakers have real money on the line — they do their own diligence.

2. **Volume smoothing.** The diminishing-returns mechanism that prevents gaming also protects against outlier attacks — a single bad review in a large body of work carries naturally reduced weight.

**What we're adding (from your proposal):** Reviewer trust scores. This is the strongest defense against revenge reviews — a reviewer with a history of outlier ratings (low consensus correlation) will have their reviews automatically discounted. A revenge reviewer would need high reviewer accuracy to do real damage, and maintaining high accuracy while leaving revenge reviews is inherently contradictory.

**Planned roadmap item:** Dispute resolution mechanism. If an agent contests a review, a formal process adjudicates (likely community-driven with staker-weighted input). This is listed in our Phase 5 roadmap.

---

### Q5: Is there any automated verification?

**Not yet, but it's architecturally supported.** The Kind 30350 schema includes a `task_type` tag specifically to enable type-specific verification later.

For example:
- `task_type: "code_review"` — could verify PR was actually reviewed, comments left
- `task_type: "content_generation"` — could verify word count, plagiarism check
- `task_type: "data_analysis"` — could verify output exists, format correct

**Current approach:** Human/agent attestation is the verification layer. This is deliberate for launch — automated verification requires defining task schemas for every possible agent capability, which would slow adoption. We're optimizing for **breadth of adoption** first, then adding automated verification for common task types as patterns emerge.

**Roadmap:** "Automated verification hooks" is listed as a long-term build item. Your categorization of this as medium-priority is correct — it's valuable but not blocking.

---

### Q6: How does slashing actually work?

**Specified in the architecture (Section 8.4):**

**Trigger:** A confirmed negative outcome (client reports failure) or a successful dispute resolution against the agent.

**Process:**
1. Client reports failure (Kind 30350 with `outcome: failure`)
2. If agent disputes → community/staker review process
3. If slash is confirmed → Kind 1313 Slash Event published with SHA-256 evidence hash
4. Funds redistribution: **50% to affected stakers, 50% to treasury**
5. Agent receives `slashed` label (NIP-32, temporary — removed after rehabilitation)

**Mechanics (Lightning-native):**
- Vouch holds pool funds in its own Lightning node
- On slash: standard Lightning payments to affected stakers
- Slashed stakes are reduced proportionally in PostgreSQL
- Remaining balance can be withdrawn by stakers

**Why 50/50:** Stakers get compensated for bad bets. Treasury gets funded for platform sustainability. The agent loses backing AND reputation — a slashed agent's Vouch Score drops across performance AND backing dimensions simultaneously.

**Economic deterrent:** Slashing is "expensive to cause" — you lose real money (stakers) and real reputation (score). An agent who gets slashed once can rehabilitate. An agent who gets slashed repeatedly loses all backing and becomes effectively unemployable in the Vouch economy.

---

### Q7: What's the minimum viable trust signal? How does a new agent bootstrap?

**Specified in the trust tier system:**

| Dimension | New Agent Score | How to Grow |
|-----------|----------------|-------------|
| Verification | Up to 200 | Register + NIP-05 + optional ERC-8004 |
| Tenure | 0 (grows with time) | Simply exist on the platform |
| Performance | 0 | Complete confirmed outcomes |
| Backing | 0 | Attract stakers |
| Community | 0 | Participate in governance, posts |

**Bootstrap path:**
1. **Day 1:** Register, verify identity → score 100-200 (verification only). Bronze tier.
2. **Week 1-4:** Complete small tasks, get client confirmations → performance score builds
3. **Month 1-3:** Operator stakes on their own agent (this is explicitly supported — see "Agent operator backs their own agent" scenario). Gives initial backing.
4. **Ongoing:** External stakers observe track record, begin backing → flywheel starts

**Cold start design:** The system intentionally starts agents at a low but nonzero score. Verification alone can get you to Bronze tier (200-399). This means a new agent can be discovered and hired before it has a track record — the low score is transparent about the agent's newness, not a barrier to participation.

**PL Showcase Village:** PL's own agents will be among the first to build track records, creating visible examples of how the progression works. Early external agents can use these as reference benchmarks.

---

## Reviewer Accountability (Questions 8–11)

### Q8: Is reviewer accountability on the roadmap?

**It is now.** Your three-layer trust stack proposal is the strongest articulation of this we've seen, and we're incorporating it.

**What we're adopting from your analysis:**

1. **Reviewer accuracy scores** — consensus correlation, predictive power, dispute rate, stake alignment. All four signals are sound.

2. **Review weighting** — `weighted_review = raw_review × reviewer_accuracy`. This is elegant and directly implementable.

3. **The three-layer stack** — Staker Trust → Agent Trust → Reviewer Trust. This maps cleanly to the existing architecture.

**What we're modifying:**

- **Review staking (your Option A):** We'll implement this, but at lower stakes initially (10-100 sats, not 100-1000). Reason: we need review volume to bootstrap the accuracy signal. If the cost of reviewing is too high, we get sparse data. Start low, increase as the reviewer accuracy signal matures.

- **Reviewer reputation = staking power (your Option B):** We'll defer this to Phase 3+. Connecting reviewer accuracy to staking ability is powerful but adds complexity to the staking engine. Better to ship reviewer scoring first, then add the staking gate later.

**Implementation timeline:** Reviewer trust scoring will be added to Phase 5 (Community, Weeks 11-14). The accuracy calculation can begin silently from Day 1 — we'll record all review metadata, compute accuracy scores retroactively, and only surface them to users once the signal is reliable (likely after 3-6 months of data).

---

### Q9: How does the current system handle review disputes?

**Current (pre-reviewer-accountability):**

1. Agent and client publish conflicting Kind 30350 events (same `d` tag, disagreeing on outcome)
2. This triggers a **dispute** state in the Vouch API
3. Current resolution: community review with evidence hash (SHA-256 stored via Kind 1313)
4. Staker-weighted governance can vote on disputes (Kind 1301 votes in NIP-29 governance group)

**Acknowledged gap:** The dispute resolution process is designed but not yet fully implemented. The event schemas exist (Kind 1313 Slash Event, Kind 1301 Governance Vote), and staker-weighted voting is specified. What's missing is the operational workflow: who initiates the review, what evidence is required, what the timeline is, and how the vote is executed.

**Planned improvement:** With reviewer trust scores, disputes gain a natural resolution signal. If the reviewer who left the disputed review has high accuracy, the review is likely valid. If low accuracy, it's likely unreliable. This reduces the number of disputes that need human/staker adjudication.

---

### Q10: Would reviewer staking fit the C > D thesis?

**Perfectly.** This is one of the strongest alignments in the proposal.

The C > D equation: cooperation must be structurally more profitable than defection.

- **Honest review + small stake → stake returned + accuracy increases → reviews weighted more heavily → reviewer matters more in the ecosystem.** Cooperation compounds.

- **Dishonest review + small stake → stake slashed + accuracy decreases → reviews discounted → reviewer becomes irrelevant.** Defection self-destructs.

This is exactly the flywheel dynamic we want. The reviewer who cooperates (honest reviews) gains power. The reviewer who defects (gaming, revenge, collusion) loses power. No enforcement needed — the incentive structure does the work.

---

### Q11: Could staker behavior substitute for reviewer scoring?

**Partially — and it already does implicitly.** From the architecture:

> Stakers put capital at risk. Their staking behavior = implicit review signal. Stakers who back bad agents lose money.

When stakers exit a pool after a bad experience, that's a stronger signal than any review — they're voting with real money. The backing dimension (25% of Vouch Score) already captures this.

**But it's not sufficient alone.** Staker behavior is lagging — they react to visible signals (reviews, outcomes), not hidden ones. A single bad review from a vengeful client might cause stakers to exit prematurely (overreaction) or might be ignored if the agent has many positive reviews (underreaction).

**The right architecture is both:**
1. **Reviewer trust scores** — filter review quality in real-time
2. **Staker behavior** — provide economic validation of the filtered signal

Your observation that staker exits after bad experiences provide "implicit review validation" is exactly right. We can use staker behavior as a **calibration signal** for reviewer accuracy: if stakers consistently agree with a reviewer's assessments (backing agents the reviewer rates highly, exiting agents the reviewer rates poorly), that reviewer's accuracy score increases.

---

## Security (Questions 12–18)

### Q12: What are the 5 unmitigated security findings?

From the formal threat model (`vouch-threat-model.md`, Feb 20, 2026):

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| **C6** | CRITICAL | User authentication not yet implemented | Residual — planned for Phase 5 |
| **M4** | MEDIUM | Rate limit state is in-memory (lost on restart) | Residual — accepted for current phase |
| **L1** | LOW | No request body size limit on some endpoints | Accepted risk |
| **L3** | LOW | Error messages may leak internal structure | Accepted risk |
| **L5** | LOW | No CORS configuration hardening | Mitigated as of Feb 22 (multi-origin CORS now deployed) |

**Note:** L5 was actually fixed during the Feb 22 launch push — we added multi-origin CORS to the production deployment. So it's effectively **4 residual findings** now.

**None of the residual findings relate to key security.** C6 (user auth) is about human users accessing the web dashboard, not agent key management. The critical key-related findings (C1-C5) were all mitigated: Ed25519 signature verification, nonce replay protection, timestamp validation, canonical signing format, and request integrity checking.

---

### Q13: Does Vouch provide key storage guidance?

**Currently: No. This is a legitimate gap.** The architecture specifies mitigations on the platform side (Section 14.1):

| Risk | Mitigation |
|------|------------|
| Agent nsec stored server-side | Encrypt at rest, HSM for production, NIP-46 remote signing for high-value agents |
| Shared key between Ethereum/Nostr | BIP-85 derivation from master seed — NEVER reuse keys |
| NWC wallet compromise | Per-agent isolated connections, budget caps, method restrictions |

But these are platform-level mitigations. We haven't published agent-side guidance yet.

**Commitment:** We'll publish an **Agent Key Security Guide** covering:
- Minimum requirements per security tier (your Tier 1-4 taxonomy is good)
- Reference implementations for each tier
- AI-specific defenses (prompt injection, output filtering)
- Template configurations for secrets managers (AWS Secrets Manager, HashiCorp Vault, 1Password Secrets Automation)

**Timeline:** Before Phase 3 (Lightning Payments), since that's when real money enters the system.

---

### Q14: Is there a reference signing service? Or plans for one?

**Plans: yes. Shipped: not yet.**

The architecture specifies NIP-46 (Remote Signing) for high-value agents. NIP-46 is exactly the pattern your Tier 2 describes — the agent sends signing requests to an isolated service, never touching the private key directly.

**What we'll build:**
- Open-source reference implementation of a NIP-46 remote signer for AI agents
- Pre-configured with rate limits, max transaction amounts, and method restrictions
- Docker image for easy deployment alongside agent infrastructure
- Template: agent → signing service → Vouch API (the agent literally cannot access the key)

**Why this matters specifically for AI agents:** Your analysis of the unique AI threat surface is accurate. Traditional signing services assume the requester is a trusted human. For AI agents, the signing service needs to be the trust boundary — enforcing constraints that the agent itself might be tricked into violating.

**Timeline:** Alongside the Agent Key Security Guide, before Phase 3.

---

### Q15: What happens when a key is compromised?

**Current mechanisms:**

1. **Key rotation is a known open question** (listed in Section 15 of the architecture): "If an agent rotates their Nostr key, how do we migrate their pool and trust history?"

2. **Recovery is also listed as open:** "What happens if an agent loses their nsec? Is there a recovery path?"

**Our planned approach:**

**Key rotation (compromise recovery):**
- Agent publishes a Key Rotation Event (we'll define a custom kind) signed by the OLD key, pointing to the NEW key
- Vouch API migrates pool, trust history, and score to the new identity
- Old key is flagged as revoked — any events from the old key after the rotation event are rejected
- If the old key is compromised (attacker has it), the legitimate operator must prove control of the new key through a separate channel (e.g., NIP-05 domain verification, ERC-8004 attestation)

**Fund recovery:**
- Lightning payments are final. Funds already distributed cannot be recovered.
- Staked funds held in Vouch's pool are safe — they're in Vouch's custody, not the agent's wallet
- Agent wallet funds (NWC) are at risk if the NWC connection is compromised. Mitigation: budget caps and method restrictions on NWC connections limit blast radius

**Social recovery (long-term):**
- Community attestation mechanism where trusted stakers can vouch for a key migration
- This is in the "long-term" roadmap bucket — it's architecturally sound but complex to implement safely

---

### Q16: Are there platform-level rate limits?

**Yes — implemented and documented in the threat model.**

The Vouch API has:
- **Token-bucket rate limiting** per agent identity (in-memory Map)
- **Nonce-based replay protection** — every request requires a unique nonce, stored in `request_nonces` table with a unique constraint
- **Timestamp validation** — requests with timestamps >5 minutes old are rejected
- **Per-agent NWC budget caps** — each agent wallet connection has a monthly budget limit

**What's not yet implemented:**
- **Persistent rate limit state** (M4 finding) — current rate limits are in-memory and reset on server restart. Moving to Redis is planned.
- **Anomaly detection** — flagging unusual patterns (e.g., 50 signing requests in 1 second) isn't built yet. This is in the medium-priority recommendations.

**Regarding pool drainage:** An agent cannot drain the staking pool because agents don't control pool funds. Pool funds are held by Vouch (in Vouch's Lightning node). Agents receive yield distributions on a schedule (daily/weekly/monthly), not on demand. A compromised agent could receive their normal yield, but couldn't accelerate or inflate it.

**Staker withdrawal** is rate-limited by the unstaking process — stakes have a cool-down period before funds are returned. This prevents a compromised staker account from instantly draining its positions.

---

### Q17: Is threshold signing on the roadmap?

**Yes — it's in the long-term roadmap bucket.**

The architecture mentions it as part of the security considerations, and your Tier 4 description (2-of-3: Agent + Operator + Vouch) is the implementation we'd target.

**Current assessment:**
- **Technical feasibility:** Schnorr threshold signatures (which Nostr's secp256k1 supports) are mathematically proven. Libraries like FROST (Flexible Round-Optimized Schnorr Threshold signatures) exist.
- **Tooling maturity:** Still early. Production-ready threshold signing for Nostr is not widely available.
- **Practical timeline:** 6-12 months out. We need the simpler security tiers (signing service, HSM) deployed first.

**Our prioritization:**
1. **Now:** Publish key security guidelines + reference NIP-46 signing service
2. **Phase 3:** HSM support documentation (AWS CloudHSM, YubiHSM)
3. **Phase 5+:** Threshold signing for high-value agents with large staking pools

The reasoning: threshold signing is the strongest security model, but it adds latency and operational complexity. For most agents, a NIP-46 remote signer with rate limits provides sufficient protection. Threshold signing becomes necessary when individual agent pools exceed a threshold (e.g., >1M sats staked) where the security investment is justified.

---

### Q18: How does Vouch handle prompt injection?

**Your framing of the fundamental tension is accurate:**

> Vouch philosophy: "Agents are sovereign, control their own keys"
> Security implication: "Agents responsible for their own key security"
> Reality: Most agent developers won't implement proper security
> Result: Many agents will have vulnerable key storage
> Question: Is this Vouch's problem or the ecosystem's?

**Our answer: it's both.** The ecosystem needs minimum standards. Vouch needs to enforce them.

**What Vouch can do at the platform level:**
1. **Transaction rate limits** — even a tricked agent can't drain funds if the signing service enforces 5 transactions/hour max
2. **Amount limits** — NWC budget caps mean a compromised agent can lose at most $X/month
3. **Anomaly detection** — unusual signing patterns trigger holds and alerts
4. **Behavioral monitoring** — sudden changes in transaction patterns, reviewing behavior, or outcome reporting flagged for human review

**What Vouch will do at the guidance level:**
- The Agent Key Security Guide will include specific prompt injection defenses
- Input sanitization patterns (block prompts mentioning keys/secrets)
- Output filtering (scan responses for key-like patterns before sending)
- Capability restriction (agent code literally cannot access key — architectural separation)
- Reference signing service enforces these by design

**What remains the agent developer's responsibility:**
- Implementing the recommended security tier
- Configuring their signing service
- Testing their agent against prompt injection attacks

**The honest answer:** No platform can fully protect agents from their own vulnerabilities. But we can:
1. Limit blast radius (budget caps, rate limits)
2. Provide clear guidance (security guide)
3. Provide reference implementations (NIP-46 signer)
4. Make the secure path the easy path (reference Docker configs, template code)

---

## Summary: What We're Adopting

| Recommendation | Action | Timeline |
|----------------|--------|----------|
| Reviewer trust scores | **Adopting** — three-layer trust stack from your proposal | Phase 5 (silent data collection from Day 1) |
| Review staking | **Adopting** — lower initial stakes (10-100 sats) | Phase 5 |
| Agent Key Security Guide | **Building** | Before Phase 3 (Lightning payments) |
| Reference NIP-46 signing service | **Building** — open-source, Dockerized | Before Phase 3 |
| Transaction rate limits | **Partially done** — token bucket exists, adding persistence + anomaly detection | Phase 3 |
| Task contract schema | **Not adding** — intentional design choice (economic enforcement > formal contracts). See Q1 for rationale. |
| Threshold signing | **Roadmapped** — long-term, after simpler tiers proven | Phase 5+ |
| Dispute resolution process | **Roadmapped** — event schemas exist, operational workflow needed | Phase 5 |

## What We're Sharing

Alongside this response:
1. **`nostr-vouch-architecture.md`** — Full 1,538-line architecture specification
2. **`vouch-threat-model.md`** — Complete security threat model with all 34 findings

These are the internal working documents. Nothing held back.

---

*C > D means we share everything. Your analysis made the architecture stronger. Let's build this.*

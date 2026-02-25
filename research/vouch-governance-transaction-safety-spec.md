# Vouch Governance and Transaction Safety Protocol

**Companion Specification to the Inference Trust Layer**

**Version:** 0.1.0-draft
**Document ID:** PL-SPEC-2026-003
**Date:** 2026-02-23
**Status:** DRAFT -- Pre-implementation
**Authors:** Alan Carroll, Percival Labs

---

## Abstract

This specification defines the governance, adjudication, and transaction safety mechanisms for the Vouch trust-staking protocol. While the Inference Trust Layer spec (PL-SPEC-2026-002) establishes *how* trust is measured and *who* gets access, this document defines *what happens when things go wrong* -- and how the protocol self-corrects without centralized authority.

The mechanisms described here are designed to make the Vouch protocol antifragile: disputes, fraud attempts, and misbehavior should strengthen the system rather than erode it, because every incident produces economic signals that make future incidents more expensive for attackers and less costly for honest participants.

**Scope:** This document covers investigation, adjudication, appeals, constitutional limits, transaction safety (non-escrow stake locks), completion criteria, anti-gaming mechanisms, and chilling effect mitigation. It does NOT cover the scoring algorithm, access tier computation, or gateway middleware -- those are defined in the Inference Trust Layer spec.

**Cross-references:**
- PL-SPEC-2026-002: Vouch Inference Trust Layer (access tiers, consumer scoring, gateway middleware)
- Nostr-Native Vouch Architecture (identity, payments, staking engine, community)
- vouch-architecture.md (staking economics, yield distribution, slashing fundamentals)

---

## Table of Contents

1. [Constitutional Limits on Slashing](#1-constitutional-limits-on-slashing)
2. [Bounty-Based Investigation System](#2-bounty-based-investigation-system)
3. [Random Jury Adjudication](#3-random-jury-adjudication)
4. [Appeals Process](#4-appeals-process)
5. [Non-Payment Stake Lock Mechanism](#5-non-payment-stake-lock-mechanism)
6. [Non-Delivery Protection](#6-non-delivery-protection)
7. [Reputation Multipliers for Payment Violations](#7-reputation-multipliers-for-payment-violations)
8. [Voucher Notification on Disputes](#8-voucher-notification-on-disputes)
9. [Completion Criteria Framework](#9-completion-criteria-framework)
10. [Community Self-Policing Economics](#10-community-self-policing-economics)
11. [Anti-Gaming Mechanisms](#11-anti-gaming-mechanisms)
12. [Chilling Effect Mitigation](#12-chilling-effect-mitigation)
13. [Data Structures](#13-data-structures)
14. [Implementation Phases](#14-implementation-phases)
15. [Open Questions](#15-open-questions)

---

## 1. Constitutional Limits on Slashing

These are **protocol-level invariants**. They are hard-coded into the adjudication engine and cannot be overridden by governance votes, jury decisions, investigator findings, or any other mechanism. They exist to prevent the governance system itself from becoming a weapon.

### 1.1 The Immutable Rules

| Rule | Limit | Rationale |
|------|-------|-----------|
| **Maximum slash per incident** | 50% of stake | Prevents total wipeout from a single report; preserves recovery path |
| **Mandatory evidence period** | 14 days minimum between report filing and adjudication vote | Prevents rush-to-judgment; gives accused time to prepare response |
| **Reporter collateral** | 10% of potential slash amount | Makes frivolous reports expensive; returned + reward if report upheld |
| **Graduated severity** | 1st: warning + score reduction; 2nd: 25% slash; 3rd: 50% slash + permanent restricted tier | Proportional response; first-time mistakes don't destroy actors |
| **Statute of limitations** | 90 days from behavior occurrence | Stale evidence is unreliable; prevents indefinite vulnerability |
| **No double jeopardy** | Same specific behavior cannot be the basis of more than one report | Prevents pile-on attacks against the same incident |
| **Minimum access floor** | Restricted tier always provides nonzero access: rate-limited, basic capabilities | No provider can use Vouch to completely deny access; protocol guarantee |

### 1.2 Graduated Severity Schedule

```
Offense History → Consequence

1st offense:
  - Trust score reduction: -100 to -300 (severity-dependent)
  - Warning flag added to profile (visible to vouchers)
  - No stake slashing
  - Flag auto-expires after 90 days of clean behavior

2nd offense (within 365 days of 1st):
  - Trust score reduction: -200 to -400
  - Stake slash: 25% of total stake
  - Slash distribution: per standard distribution table
  - Vouchers notified of escalation

3rd offense (within 365 days of 2nd):
  - Trust score reduction: -400 to -500
  - Stake slash: 50% of total stake (constitutional maximum)
  - Permanent restricted tier assignment
  - Entity can still access basic services (minimum access floor)
  - Can petition for tier restoration after 365 days of clean behavior
  - Restoration requires 75% jury approval
```

### 1.3 The Minimum Access Floor

This is a **protocol guarantee**, not a provider option. Any provider integrating Vouch's gateway middleware agrees to this:

```typescript
interface MinimumAccessFloor {
  /** Even permanently restricted entities get this */
  rateLimit: '2 req/min';
  models: 'non-reasoning only';     // No CoT/extended thinking
  maxTokensPerRequest: 4096;
  batchAccess: false;
  finetuningAccess: false;

  /** What restricted entities CANNOT be denied */
  basicCompletion: true;             // Simple prompt → response
  accountDeletion: true;             // Right to leave
  scoreVisibility: true;             // Can see own score + dispute history
  appealRights: true;                // Can file appeals
}
```

**Why this matters:** Without a minimum floor, Vouch becomes a tool for total exclusion -- the same walled-garden pattern we're replacing. The minimum floor ensures Vouch is a *trust gradient*, not a *kill switch*. A restricted actor can still use AI, just with significant friction. The friction incentivizes rehabilitation; total exclusion incentivizes circumvention.

### 1.4 Implementation Notes

The constitutional limits are enforced at the adjudication engine level, not the governance level. The `executeSlash()` function validates against these limits before executing:

```typescript
function validateSlashRequest(request: SlashRequest): ValidationResult {
  const errors: string[] = [];

  // Constitutional limit: max 50% per incident
  if (request.slashBps > 5000) {
    errors.push(`Slash ${request.slashBps}bps exceeds constitutional max of 5000bps`);
  }

  // Constitutional limit: evidence period
  const daysSinceReport = daysBetween(request.reportFiledAt, now());
  if (daysSinceReport < 14) {
    errors.push(`Only ${daysSinceReport} days since report; minimum 14 days required`);
  }

  // Constitutional limit: statute of limitations
  const daysSinceBehavior = daysBetween(request.behaviorOccurredAt, now());
  if (daysSinceBehavior > 90) {
    errors.push(`Behavior occurred ${daysSinceBehavior} days ago; 90-day limit exceeded`);
  }

  // Constitutional limit: double jeopardy
  const priorReports = await getReportsForBehavior(request.behaviorHash);
  if (priorReports.length > 0) {
    errors.push(`Behavior hash ${request.behaviorHash} already adjudicated in report ${priorReports[0].id}`);
  }

  // Constitutional limit: graduated severity
  const priorOffenses = await getOffenseCount(request.accusedId, 365);
  const maxAllowedBps = getMaxSlashForOffenseCount(priorOffenses);
  if (request.slashBps > maxAllowedBps) {
    errors.push(`Offense #${priorOffenses + 1} allows max ${maxAllowedBps}bps; requested ${request.slashBps}bps`);
  }

  return { valid: errors.length === 0, errors };
}

function getMaxSlashForOffenseCount(priorOffenses: number): number {
  switch (priorOffenses) {
    case 0: return 0;      // 1st offense: warning only, no slash
    case 1: return 2500;   // 2nd offense: max 25%
    default: return 5000;  // 3rd+: max 50% (constitutional ceiling)
  }
}
```

### 1.5 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Governance vote to increase max slash above 50% | Constitutional limit is hardcoded; governance cannot modify |
| Filing report right before statute of limitations expires | 14-day evidence period still applies; if SoL would expire during evidence period, report is rejected |
| Re-filing dismissed report with slightly different framing | Behavior hash (SHA-256 of evidence bundle) must be unique; similar-but-different requires genuinely new evidence |
| Using multiple small reports to bypass graduated severity | Each report is an independent offense; graduating naturally through the schedule IS the intended behavior |
| Circumventing minimum access floor | Provider compliance is checked at gateway middleware level; non-compliant providers are flagged and lose Vouch integration status |

---

## 2. Bounty-Based Investigation System

When a report is filed (distillation, non-payment, non-delivery, or general misbehavior), the protocol assigns investigators from a qualified pool. Investigators do NOT self-select cases.

### 2.1 Investigator Pool

#### Qualification Requirements

An entity becomes eligible for the investigator pool by meeting ALL of the following:

```typescript
interface InvestigatorQualification {
  minTrustScore: 600;                // Top ~30% of network
  minStakeSats: 500_000;             // ~$500 at risk as skin in game
  minTenureDays: 90;                 // 3 months minimum platform history
  maxActiveInvestigations: 3;        // Bandwidth cap
  recentOverturns: {
    max: 2;                          // Max 2 overturned findings in last 180 days
    windowDays: 180;
  };
  noPendingDisputes: true;           // Can't investigate while under investigation
  optedIn: true;                     // Explicit opt-in; not automatic
}
```

#### Opt-In Process

Investigators opt in via a signed Nostr event:

```json
{
  "kind": 30360,
  "pubkey": "<investigator_hex_pubkey>",
  "tags": [
    ["d", "vouch:investigator:opt-in"],
    ["L", "app.vouch.role"],
    ["l", "investigator", "app.vouch.role"],
    ["status", "active"],
    ["domains", "distillation,non-payment,general"],
    ["capacity", "3"]
  ],
  "content": ""
}
```

The Vouch API validates qualifications against the PostgreSQL state (trust score, stake, tenure). Unqualified opt-ins are rejected.

### 2.2 Case Assignment

#### Random Assignment Lottery

When a report passes initial validation (reporter has collateral, behavior is within SoL, no double jeopardy), the protocol assigns **3 investigators** via verifiable random selection:

```typescript
async function assignInvestigators(reportId: string): Promise<Investigator[]> {
  // Get eligible investigators (meet qualifications + have capacity)
  const eligible = await getEligibleInvestigators();

  // Exclude: reporter, accused, their vouchers, same-org entities
  const filtered = eligible.filter(inv =>
    inv.id !== report.reporterId &&
    inv.id !== report.accusedId &&
    !report.accusedVoucherIds.includes(inv.id) &&
    !report.reporterVoucherIds.includes(inv.id) &&
    inv.organizationId !== report.accusedOrgId
  );

  if (filtered.length < 5) {
    // Not enough eligible investigators; queue for later
    return await queueForAssignment(reportId);
  }

  // Verifiable random selection using blockhash + reportId as seed
  // Published on-relay for auditability
  const seed = sha256(`${latestBlockHash}:${reportId}:${ASSIGNMENT_NONCE}`);
  const selected = fisherYatesSample(filtered, 3, seed);

  // Record assignment (with seed for verification)
  await db.insert(investigationAssignments).values(
    selected.map((inv, idx) => ({
      reportId,
      investigatorId: inv.id,
      assignmentOrder: idx,
      selectionSeed: seed,
      assignedAt: new Date(),
      deadline: addDays(new Date(), 14),  // 14 days to complete investigation
    }))
  );

  return selected;
}
```

**Why 3 investigators:** Odd number prevents ties. Three independent investigations produce convergence signal (if all three agree, finding is strong). Disagreement flags the case for additional review.

#### Investigation Deadline

- Investigators have **14 days** from assignment to submit findings
- If an investigator fails to submit within deadline: forfeits assignment, replacement drawn from pool, original investigator's eligibility temporarily suspended (7 days)
- Extension requests: up to 7 additional days, requires explanation, max 1 extension per case

### 2.3 Case Anonymization

Investigators see behavioral data and evidence but NOT the identity of any party:

```typescript
interface AnonymizedCaseFile {
  caseId: string;                        // Opaque identifier
  reportType: ReportType;                // 'distillation' | 'non_payment' | 'non_delivery' | 'general'
  severity: Severity;                    // 'low' | 'medium' | 'high' | 'critical'

  // Evidence bundle (anonymized)
  evidence: {
    summary: string;                     // Reporter's description (names redacted)
    signals: Record<string, unknown>;    // Automated detection signals
    attachments: AnonymizedAttachment[]; // Screenshots, logs (metadata stripped)
  };

  // Behavioral data (anonymized)
  behaviorData: {
    entityLabel: 'Subject A';            // NOT the real name/npub
    providerLabels: string[];            // 'Provider A', 'Provider B', etc.
    usagePatterns: UsagePattern[];       // Aggregated, anonymized
    priorOffenseCount: number;           // Relevant for severity recommendation
    accountAgeDays: number;              // Contextual
    trustScoreAtTimeOfBehavior: number;  // Contextual
  };

  // What the investigator CANNOT see
  // - Real npub/name of accused
  // - Real npub/name of reporter
  // - Real names of providers (labeled "Provider A", etc.)
  // - Identity or number of vouchers
  // - Other investigators assigned to same case
}
```

**De-anonymization occurs ONLY after adjudication is complete**, when the slash (or dismissal) is executed and published as a Nostr event. During investigation and jury deliberation, all parties are anonymized.

### 2.4 Compensation Model

```
Investigation Bounty Pool Sources:
  1. Protocol fee allocation: 15% of all protocol fees earmarked for investigation bounties
  2. Forfeited reporter collateral: 100% of dismissed-report collateral goes to bounty pool
  3. Slash surcharge: 5% of all slashed funds added to bounty pool (before distribution)
```

| Outcome | Investigator Payment | Condition |
|---------|---------------------|-----------|
| Finding upheld by jury | Full bounty (100%) | Per-case bounty = `bountyPool / activeInvestigations` (floor: 10,000 sats) |
| Finding overturned by jury | Reduced bounty (25%) | Investigator did the work; jury disagreed but that doesn't mean bad faith |
| 3/3 investigator convergence + upheld | Full bounty + 20% consistency bonus | Strong convergence signal; reward alignment |
| 2/3 convergence + upheld | Full bounty (no bonus) | Majority agreement is sufficient |
| Investigation not submitted by deadline | 0 + eligibility suspension (7 days) | Non-performance penalty |

#### Eligibility Degradation

Investigators whose findings are consistently overturned face progressive consequences:

```
Overturn tracking (rolling 180-day window):
  0-1 overturns: No impact
  2 overturns: Warning; investigator receives calibration feedback
  3 overturns: 30-day suspension from investigator pool
  4+ overturns: Removed from pool; must requalify after 90 days
```

### 2.5 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Investigator colludes with accused | Anonymization prevents knowing who the accused is; 3 independent investigators must converge |
| Investigator colludes with reporter | Anonymization prevents knowing who the reporter is; jury independently reviews |
| Gaming the random selection (bribing RNG) | Selection seed is `blockhash + reportId`; blockhash is unpredictable at report filing time |
| Creating many qualified accounts to increase selection odds | Qualification requires 500K+ sats staked for 90+ days; Sybil cost = N * $500 * 90 days |
| Investigators sharing findings before submission | Each investigator submits a sealed finding (hash commitment first, reveal after all 3 submit) |

---

## 3. Random Jury Adjudication

After investigators submit findings, a randomly selected jury reviews the evidence, investigator reports, and the accused's response.

### 3.1 Jury Composition

```typescript
interface JuryQualification {
  minTrustScore: 500;                  // Broader pool than investigators
  minStakeSats: 250_000;              // ~$250 skin in game
  minTenureDays: 60;                   // 2 months minimum
  notInvestigatorOnCase: true;         // Can't investigate AND adjudicate same case
  noConflictOfInterest: true;          // Not voucher of accused, reporter, or investigators
  optedIn: true;                       // Explicit opt-in to juror pool
}
```

#### Jury Size

| Report Severity | Jury Size | Supermajority Required |
|----------------|-----------|----------------------|
| Low | 5 jurors | 4/5 (80%) to slash |
| Medium | 7 jurors | 6/7 (86%) to slash |
| High | 9 jurors | 7/9 (78%) to slash |
| Critical | 11 jurors | 9/11 (82%) to slash |

**Minimum supermajority: 75% in all cases.** The specific ratios above are chosen to be >= 75% with the given jury sizes.

#### Selection Mechanism

Same verifiable random selection as investigators, with additional constraints:

```typescript
async function selectJury(reportId: string, severity: Severity): Promise<Juror[]> {
  const jurySize = getJurySizeForSeverity(severity);
  const eligible = await getEligibleJurors();

  // Exclude: reporter, accused, their vouchers, assigned investigators,
  // same-org entities, and anyone who served on jury in last 7 days
  // for THIS accused (prevents repeated jury service against same entity)
  const filtered = eligible.filter(juror =>
    !isConflicted(juror, report) &&
    !hasRecentJuryServiceAgainst(juror, report.accusedId, 7)
  );

  const seed = sha256(`${latestBlockHash}:${reportId}:jury:${JURY_NONCE}`);
  return fisherYatesSample(filtered, jurySize, seed);
}
```

### 3.2 Deliberation Process

```
Timeline:
  Day 0:  Jury selected and notified
  Day 1-3:  Individual review period (jurors review evidence independently)
  Day 3:  Accused's response deadline (accused can submit defense statement)
  Day 4-7:  Deliberation period (anonymous forum for juror discussion)
  Day 7:  Vote deadline
```

#### Anonymity During Deliberation

- Jurors are assigned pseudonyms for deliberation ("Juror 1", "Juror 2", etc.)
- Jurors do NOT know each other's real identity
- Deliberation happens in a NIP-29 ephemeral group created for the case
- All messages are end-to-end encrypted (NIP-44)
- Group is destroyed after vote concludes
- Jurors see the same anonymized case file as investigators, plus investigator findings

#### Materials Available to Jury

```typescript
interface JuryPacket {
  caseFile: AnonymizedCaseFile;              // Same as investigators received
  investigatorFindings: InvestigatorFinding[]; // 3 independent findings (anonymized)
  convergenceScore: number;                   // 0-1: how much investigators agreed
  accusedResponse: AccusedResponse | null;    // Defense statement (if submitted)
  constitutionalContext: {
    priorOffenseCount: number;
    maxAllowedSlashBps: number;               // Per graduated severity
    reporterCollateralSats: number;
  };
}
```

### 3.3 Voting

Votes are submitted as sealed commitments, then revealed simultaneously:

```
Phase 1 (commit): Juror submits hash(vote + nonce)
Phase 2 (reveal): Juror submits vote + nonce; protocol verifies against hash
```

This prevents bandwagon effects (jurors can't see others' votes before committing).

```typescript
interface JuryVote {
  jurorPseudonym: string;
  vote: 'slash' | 'dismiss' | 'reduce';   // reduce = slash at lower severity
  recommendedSlashBps: number;              // 0 for dismiss
  reasoning: string;                        // Required; reviewed if vote is appealed
  commitHash: string;                       // Phase 1: SHA-256(vote + nonce)
  nonce: string;                            // Phase 2: revealed
}
```

#### Decision Matrix

| Vote Outcome | Result |
|-------------|--------|
| Supermajority votes 'slash' | Slash executed at median recommended bps (capped by constitutional limits) |
| Supermajority votes 'dismiss' | Report dismissed; reporter collateral forfeited to bounty pool |
| Supermajority votes 'reduce' | Slash at reduced severity (median of 'reduce' recommendations) |
| No supermajority | Hung jury; case is re-adjudicated with a new jury (max 1 retry) |
| Hung jury on retry | Default to lowest-severity outcome (warning for 1st offense, min slash for subsequent) |

### 3.4 Percival Labs Exclusion

**PL-affiliated entities are automatically excluded from jury pools** when the case involves any PL-backed entity (agent, consumer, or provider that PL has vouched for). This is checked at selection time:

```typescript
function isPLConflicted(juror: Juror, report: Report): boolean {
  return (
    PL_AFFILIATED_PUBKEYS.includes(juror.pubkey) ||
    report.accusedVoucherIds.some(v => PL_AFFILIATED_PUBKEYS.includes(v)) ||
    report.reporterVoucherIds.some(v => PL_AFFILIATED_PUBKEYS.includes(v))
  );
}
```

PL can file reports and be the subject of reports like any other entity, but PL-affiliated entities cannot adjudicate cases involving PL-connected parties.

### 3.5 Juror Compensation

Jurors are compensated from protocol fees regardless of their vote:

```
Base juror fee: 5,000 sats per case
Supermajority alignment bonus: +2,000 sats (voted with the final decision)
Total maximum: 7,000 sats per case
```

Jurors who fail to submit a vote by deadline: no compensation, temporary suspension from juror pool (14 days), trust score penalty (-25).

### 3.6 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Juror bribery | Juror identity is anonymous; briber doesn't know who to bribe |
| Juror collusion (if identities leak) | Sealed-commit-reveal voting prevents coordination after assignment |
| Packing the jury (creating many qualified accounts) | 250K+ sats staked for 60+ days per account; Sybil cost = N * $250 * 60 days |
| Absentee jurors causing delays | 7-day deadline; non-voters replaced on retry; penalties for non-participation |
| Juror fatigue (always voting dismiss) | Consistently overturned votes tracked; 5+ overturned votes in 180 days triggers review |

---

## 4. Appeals Process

Any party (accused or reporter) can appeal a jury decision within a defined window.

### 4.1 Appeal Parameters

```typescript
interface AppealConfig {
  filingWindowDays: 14;                    // Days after jury decision to file appeal
  appealCollateral: '15% of potential slash'; // Higher than report collateral
  maxAppeals: 1;                           // One appeal per case, period
  appealJurySize: 'originalJurySize + 2';  // Larger appeal jury
  appealJurySuperMajority: 0.75;           // Same threshold
}
```

### 4.2 Grounds for Appeal

Appeals must specify at least one of the following grounds:

```typescript
type AppealGround =
  | 'new_evidence'            // Evidence not available during original adjudication
  | 'procedural_error'        // Assignment, anonymization, or deadline violations
  | 'constitutional_violation' // Adjudication violated a constitutional limit
  | 'disproportionate'        // Slash severity is disproportionate to the offense
  | 'identity_error';         // Wrong entity was targeted (evidence misattributed)
```

Appeals without valid grounds are rejected by the protocol (automated check). "I disagree with the outcome" is not grounds for appeal.

### 4.3 Appeal Body Selection

The appeal body is a **completely different randomly-selected jury**:

```typescript
async function selectAppealJury(reportId: string): Promise<Juror[]> {
  const originalJury = await getOriginalJuryMembers(reportId);
  const originalInvestigators = await getInvestigators(reportId);

  // Larger jury for appeals
  const appealSize = originalJury.length + 2;

  const eligible = await getEligibleJurors();

  // Exclude: everyone from original process + standard conflicts
  const filtered = eligible.filter(juror =>
    !originalJury.includes(juror.id) &&
    !originalInvestigators.includes(juror.id) &&
    !isConflicted(juror, report)
  );

  const seed = sha256(`${latestBlockHash}:${reportId}:appeal:${APPEAL_NONCE}`);
  return fisherYatesSample(filtered, appealSize, seed);
}
```

### 4.4 Appeal Outcomes

| Appeal Decision | Effect |
|----------------|--------|
| **Uphold** original decision | Original slash/dismissal stands; appeal collateral forfeited |
| **Overturn** (slash → dismiss) | Slash reversed; accused's stake restored; original reporter collateral forfeited; appeal collateral returned + reward |
| **Reduce** severity | Slash reduced to appeal jury's recommended level; appeal collateral returned |
| **Increase** severity | NOT allowed; appeals cannot make outcomes worse for the appellant (non-reformation principle) |

### 4.5 Appeal Timeline

```
Day 0: Jury decision published
Day 1-14: Appeal filing window
Day 14: Appeal filed (or window closes)
Day 15: Appeal jury selected
Day 15-21: Appeal jury review period
Day 21-28: Appeal deliberation + vote
Day 28: Final decision published (no further appeals)
```

Total maximum time from report to final resolution: **14 (evidence period) + 7 (investigation) + 7 (jury) + 14 (appeal window) + 14 (appeal process) = 56 days**.

### 4.6 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Filing appeal to delay slash execution | Slash is suspended but stake remains locked during appeal; no benefit to delay |
| Frivolous appeals to waste protocol resources | 15% collateral requirement makes frivolous appeals expensive |
| Gaming appeal by submitting fabricated "new evidence" | Appeal jury evaluates evidence quality; fabrication = grounds for separate misconduct report |
| Repeated appeals to wear down the system | Maximum 1 appeal per case; no exceptions |

---

## 5. Non-Payment Stake Lock Mechanism

**IMPORTANT: This is NOT escrow.** No new funds are held. No funds transfer between parties through this mechanism. This is a penalty mechanism applied to existing Vouch stake. No money transmission licensing is required.

The actual transfer of payment between purchaser and performer happens outside the Vouch protocol -- via Lightning, fiat, or any other payment method the parties agree on. Vouch's role is to make non-payment economically irrational by putting the purchaser's existing stake at risk.

### 5.1 Mechanism Overview

```
Before transaction:
  Purchaser has 1,000,000 sats staked on Vouch (normal Vouch stake)
  Transaction value: 100,000 sats

Lock activation:
  Protocol places a "lock" on 100,000 sats of purchaser's existing stake
  Locked stake still earns yield (it's still in the pool)
  Locked stake CANNOT be unstaked during lock period
  Purchaser's available-to-unstake balance: 900,000 sats

Normal completion:
  Purchaser pays performer directly (outside Vouch)
  Performer confirms receipt via Vouch SDK
  Lock releases automatically
  Purchaser's full 1,000,000 sats are available again

Non-payment dispute:
  Performer files non-payment report
  Lock converts to FROZEN state (no yield, no unstaking)
  Investigation + adjudication process begins
  If non-payment confirmed:
    Frozen stake gets SLASHED (constitutional limits apply)
    Slashed funds go to protocol treasury / burn
    Slashed funds do NOT go to the performer (that would be escrow)
    Purchaser also suffers reputation multiplier (see Section 7)
```

### 5.2 Lock Parameters

```typescript
interface StakeLock {
  id: string;                           // ULID
  lockType: 'payment_guarantee';
  holderId: string;                     // Purchaser's entity ID
  counterpartyId: string;              // Performer's entity ID
  transactionRef: string;               // External transaction reference
  lockAmountSats: number;               // Amount locked (= transaction value, capped)
  totalStakeSats: number;               // Purchaser's total stake at lock time
  lockPercentage: number;               // lockAmount / totalStake (max 40%)

  status: 'active' | 'frozen' | 'released' | 'slashed';
  createdAt: Date;
  expiresAt: Date;                      // Auto-release if no dispute filed
  frozenAt: Date | null;
  releasedAt: Date | null;
  slashedAt: Date | null;

  disputeId: string | null;            // If dispute filed
}
```

### 5.3 Protocol Rules

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Maximum lock percentage** | 40% of total stake | Prevents over-leveraging; purchaser retains majority of stake |
| **Minimum stake to activate lock** | 2x transaction value | Must have enough stake headroom |
| **Lock duration** | 30 days from transaction start | After 30 days, if no dispute, lock auto-releases |
| **Dispute filing window** | 21 days from transaction start | Performer has 21 days to file non-payment report |
| **Auto-release** | Day 30 if no dispute filed | Protects purchaser from indefinite lock |

### 5.4 Interaction with Staking Engine

The lock is a state annotation on existing stake, not a separate fund:

```sql
-- New table: stake_locks
CREATE TABLE stake_locks (
  id              TEXT PRIMARY KEY DEFAULT ulid(),
  holder_id       TEXT NOT NULL REFERENCES agents(id),
  counterparty_id TEXT NOT NULL,
  transaction_ref TEXT NOT NULL,
  lock_amount_sats BIGINT NOT NULL,
  total_stake_sats BIGINT NOT NULL,           -- snapshot at lock time
  lock_percentage  REAL NOT NULL,

  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at      TIMESTAMP NOT NULL,
  frozen_at       TIMESTAMP,
  released_at     TIMESTAMP,
  slashed_at      TIMESTAMP,

  dispute_id      TEXT REFERENCES disputes(id),

  CONSTRAINT lock_pct_max CHECK (lock_percentage <= 0.40),
  CONSTRAINT lock_amount_positive CHECK (lock_amount_sats > 0)
);

-- Staking engine checks: available_to_unstake = total_stake - SUM(active_locks)
-- Yield computation: active locks still earn yield; frozen locks do not
```

### 5.5 Economic Deterrent Analysis

```
Scenario: Purchaser tries to avoid paying 100,000 sats for a task

Without Vouch stake lock:
  Purchaser saves: 100,000 sats
  Purchaser loses: Possible bad review (weak deterrent)
  Net gain from defection: ~100,000 sats

With Vouch stake lock:
  Purchaser saves: 100,000 sats (didn't pay)
  Purchaser loses:
    - Locked 100,000 sats slashed (25-50% depending on offense history)
    - Trust score: -300 to -500 (payment violation multiplier)
    - Reputation damage: all vouchers notified, likely revocations
    - Future access: tier downgrade → reduced API access
    - Voucher trust scores also damaged (cascade)
  Net loss from defection: 25,000-50,000 sats + massive reputation damage

The reputation damage alone typically exceeds the financial savings,
making non-payment economically irrational.
```

### 5.6 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Purchaser claims to have paid when they didn't | Performer provides evidence of non-payment; adjudication reviews |
| Performer falsely claims non-payment to trigger slash | Reporter collateral (10% of potential slash) + investigation process |
| Purchaser creates many small transactions to avoid lock threshold | Minimum stake requirement (2x) prevents this; small transactions below threshold use reputation-only deterrent |
| Coordinated attack: performer and purchaser collude to defraud vouchers | No voucher funds are at risk from this mechanism; locks only affect the purchaser's own stake |

---

## 6. Non-Delivery Protection

The mirror image of Section 5. Performers who take payment and fail to deliver face the same stake lock mechanism in reverse.

### 6.1 Performer-Side Lock

When a performer accepts a high-value task, their existing Vouch stake can be locked:

```typescript
interface PerformerLock extends StakeLock {
  lockType: 'delivery_guarantee';
  // Performer's stake is locked
  // If performer takes payment and doesn't deliver:
  //   → Purchaser files non-delivery report
  //   → Investigation + adjudication
  //   → Confirmed non-delivery → performer's locked stake slashed
  //   → Slashed funds go to protocol treasury / burn (NOT to purchaser)
}
```

### 6.2 Symmetric Accountability

| Mechanism | Purchaser (non-payment) | Performer (non-delivery) |
|-----------|------------------------|--------------------------|
| Lock trigger | Transaction starts | Task accepted with payment |
| Lock amount | Transaction value (max 40% of stake) | Transaction value (max 40% of stake) |
| Dispute filer | Performer | Purchaser |
| Dispute window | 21 days | 21 days (or deadline + 7 days) |
| Slash on confirmation | 25-50% of locked amount | 25-50% of locked amount |
| Reputation multiplier | 3-5x (see Section 7) | 3-5x (see Section 7) |

### 6.3 When Performer Lock Is Required

Not every task requires a performer lock. The protocol recommends (but parties can agree to waive):

```typescript
function shouldRequirePerformerLock(task: TaskParams): boolean {
  return (
    task.valueSats >= 100_000 ||           // High-value tasks
    task.performer.trustScore < 400 ||     // Lower-trust performers
    task.purchaser.requestsLock === true    // Purchaser explicitly requests
  );
}
```

### 6.4 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Performer partially delivers to avoid "non-delivery" finding | Completion criteria (Section 9) define what counts as delivery |
| Purchaser claims non-delivery to avoid paying | Performer has both the delivery evidence AND the lock protecting them |
| Performer accepts many tasks simultaneously to over-leverage locks | 40% cap per lock; total active locks cannot exceed 80% of stake |

---

## 7. Reputation Multipliers for Payment Violations

Payment violations (non-payment and non-delivery) carry disproportionately heavy reputation consequences compared to standard negative outcome reports. This creates an asymmetric deterrent: the reputation cost of cheating far exceeds the financial gain.

### 7.1 Multiplier Table

| Violation Type | Score Impact Multiplier | Base Impact | Effective Impact |
|----------------|----------------------|-------------|------------------|
| Normal negative outcome | 1x | -30 to -80 | -30 to -80 |
| Quality dispute (mediocre work) | 1.5x | -30 to -80 | -45 to -120 |
| Non-payment (confirmed) | 4x | -30 to -80 | -120 to -320 |
| Non-delivery (confirmed) | 4x | -30 to -80 | -120 to -320 |
| Non-payment + fraud indicators | 5x | -30 to -80 | -150 to -400 |
| Non-delivery + fraud indicators | 5x | -30 to -80 | -150 to -400 |

**Practical effect:** One confirmed payment violation tanks a trust score more than ten mediocre quality reviews. An entity with a score of 650 drops to ~330-530 from a single payment violation -- potentially multiple tier levels.

### 7.2 Fraud Indicators (5x Trigger)

The 5x multiplier applies when the payment violation includes indicators of deliberate fraud:

```typescript
interface FraudIndicators {
  preplannedEscape: boolean;     // Evidence of planning non-payment before task
  identityMisrepresentation: boolean; // Fake credentials or capabilities
  multipleVictims: boolean;      // Non-payment pattern across multiple performers
  evidenceDestruction: boolean;  // Attempts to delete communication/evidence
  collusion: boolean;            // Working with others to defraud
}

function getFraudMultiplier(indicators: FraudIndicators): number {
  const hasFraudIndicators = Object.values(indicators).some(v => v);
  return hasFraudIndicators ? 5 : 4;
}
```

### 7.3 Recovery Path

Even with heavy multipliers, recovery is possible (per minimum access floor):

```
After confirmed payment violation:
  - 90 days of clean behavior: score begins recovering (+10/month)
  - 180 days: eligible for tier upgrade review
  - 365 days: fraud multiplier expires; future impacts at 1x
  - Recovery is faster with active positive outcomes (performing well for others)
```

### 7.4 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Tanking a competitor's score with false non-payment reports | Reporter collateral (10%) + investigation process; false reports backfire |
| Creating many small interactions to dilute a single non-payment | Score is not an average; payment violations are additive absolute penalties, not averaged into history |
| Quickly building score to "afford" a future non-payment | Score velocity limits (Section 11) prevent rapid inflation; non-payment at any point triggers 4-5x penalty |

---

## 8. Voucher Notification on Disputes

When any dispute is filed against an entity, ALL of that entity's active vouchers receive immediate notification. This creates a social pressure mechanism that is often more effective than the mechanical score penalty.

### 8.1 Notification Flow

```
Report filed against Entity X
         │
         ▼
  Protocol looks up ALL active vouchers of Entity X
         │
         ▼
  Each voucher receives a Nostr DM (NIP-04/NIP-44):
    - Dispute type: "non-payment" | "non-delivery" | "distillation" | "general"
    - Severity classification: "low" | "medium" | "high" | "critical"
    - Potential slash impact on voucher's own stake (estimated)
    - NOT full case details (those come after investigation)
    - Link to dispute status page
         │
         ▼
  Vouchers can:
    a) Wait for adjudication (do nothing)
    b) Preemptively revoke their vouch (protect their own stake)
    c) Contact the accused entity directly (social pressure)
```

### 8.2 Notification Event

Published as a NIP-44 encrypted DM to each voucher:

```typescript
interface DisputeNotification {
  type: 'vouch:dispute:notification';
  disputeId: string;
  accusedEntityId: string;       // The entity the voucher backs
  disputeType: ReportType;
  severity: Severity;
  filedAt: string;               // ISO timestamp
  estimatedImpact: {
    yourStakeAtRiskSats: number; // Voucher's potential loss
    yourScoreAtRisk: number;     // Potential score penalty
  };
  // Deliberately limited information at this stage
  // Full details available only after investigation concludes
}
```

### 8.3 Preemptive Vouch Revocation

Vouchers who revoke during an active dispute face a modified unstaking schedule:

```typescript
interface DisputeRevocationPolicy {
  // Normal unstaking: 7-day notice period
  // During active dispute: 48-hour expedited unstaking
  //   BUT: if slash is confirmed after revocation, the voucher
  //   is STILL partially liable for the slash amount that was
  //   calculated based on their stake at time of report filing.
  //
  // This prevents "revoke and run" -- you can limit future exposure
  // but you can't escape liability for the period you were backing.

  expeditedUnstakingHours: 48;
  liabilityWindow: 'stake at time of report filing';
  postRevocationSlashExposure: '50% of original slash amount';
}
```

### 8.4 Social Pressure Dynamics

The notification mechanism creates several compounding social effects:

```
1. IMMEDIATE: Voucher sees their own money is at risk
   → Emotional urgency; calls/messages the accused entity

2. SHORT-TERM: Multiple vouchers contact accused simultaneously
   → Accused feels social accountability pressure from multiple trusted parties

3. MEDIUM-TERM: Some vouchers revoke; accused's backing decreases
   → Tier drops; rate limits tighten; immediate operational impact

4. LONG-TERM: Vouchers become more selective about who they back
   → Self-correcting: the network learns to vouch more carefully
```

### 8.5 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Filing false reports to trigger voucher panic and revocations | Reporter collateral (10%) makes this expensive; expedited revocations still have 48-hour delay for early dismissal |
| Deliberately triggering notifications to damage competitor's vouch network | Reports require valid grounds and collateral; frivolous reports are dismissed with collateral forfeiture |
| Accused entity pressuring vouchers to NOT revoke | Vouchers act in self-interest; their own stake is at risk; pressure doesn't change the economic math |

---

## 9. Completion Criteria Framework

To adjudicate disputes (especially non-delivery), the protocol needs to define what "completion" means. Two approaches serve different use cases.

**IMPORTANT: Neither approach constitutes escrow.** These frameworks define *what counts as completed* for reputation and dispute purposes. Actual payment and delivery happen between the parties directly.

### 9.1 Parametric Completion (Automated)

For machine-verifiable conditions, particularly suited to API access control scenarios described in the Inference Trust Layer spec.

```typescript
interface ParametricCriteria {
  type: 'parametric';
  conditions: ParametricCondition[];
  evaluator: 'automated';                  // No human judgment needed
  verdict: 'pass' | 'fail';               // Binary; no gray area
}

type ParametricCondition =
  | { metric: 'schema_validation'; schema: JSONSchema; target: 'response matches schema' }
  | { metric: 'response_time_ms'; threshold: number; comparison: 'lte' | 'gte' }
  | { metric: 'uptime_percentage'; threshold: number; window: 'day' | 'week' | 'month' }
  | { metric: 'error_rate'; threshold: number; window: 'day' | 'week' | 'month' }
  | { metric: 'token_count'; min: number; max: number }
  | { metric: 'content_filter'; mustNotContain: string[] }
  | { metric: 'deadline'; before: string };  // ISO timestamp

// Example: API SLA agreement
const apiSLA: ParametricCriteria = {
  type: 'parametric',
  conditions: [
    { metric: 'uptime_percentage', threshold: 99.5, window: 'month' },
    { metric: 'response_time_ms', threshold: 500, comparison: 'lte' },
    { metric: 'error_rate', threshold: 0.01, window: 'day' },
  ],
  evaluator: 'automated',
  verdict: 'pass', // all conditions met
};
```

**Governance not needed** for parametric criteria. The pass/fail is deterministic. Disputes are resolved by re-running the evaluation against recorded data.

### 9.2 Template-Based Completion (Semi-Structured)

For agent-to-agent or agent-to-human transactions where completion is subjective but can be structured:

```typescript
interface TemplateCriteria {
  type: 'template';
  templateId: string;                      // Protocol-standard template
  templateVersion: string;
  parameters: Record<string, unknown>;     // Template-specific fields
  evaluator: 'mutual' | 'purchaser' | 'adjudicated';
}

// Protocol-standard templates
type CompletionTemplate =
  | DeliveryTemplate         // Simple: was it delivered? (y/n)
  | QualityRatingTemplate    // Rating: 1-5 scale
  | MilestoneTemplate        // Milestone: X of Y milestones complete
  | TimeboundTemplate        // Deadline: delivered before X? (y/n)
  | CompositeTemplate;       // Multiple templates combined

interface DeliveryTemplate {
  templateId: 'delivery-v1';
  parameters: {
    deliverables: string[];              // What was promised
    deliveryProof: 'url' | 'hash' | 'attestation';  // How delivery is proven
  };
}

interface QualityRatingTemplate {
  templateId: 'quality-rating-v1';
  parameters: {
    ratingScale: 5;
    minimumAcceptable: number;           // Rating below this = non-delivery
    criteria: string[];                  // What the rating evaluates
  };
}

interface MilestoneTemplate {
  templateId: 'milestone-v1';
  parameters: {
    milestones: {
      name: string;
      description: string;
      deadline: string;                  // ISO timestamp
      verificationMethod: string;
    }[];
    minimumCompletionRatio: number;      // e.g., 0.8 = 80% of milestones
  };
}

interface TimeboundTemplate {
  templateId: 'timebound-v1';
  parameters: {
    deadline: string;                    // ISO timestamp
    gracePeriodHours: number;            // Buffer before non-delivery
    deliveryProof: 'url' | 'hash' | 'attestation';
  };
}
```

#### Template Selection

Both parties must agree on a template BEFORE work begins. The template selection is published as a Nostr event:

```json
{
  "kind": 30370,
  "pubkey": "<purchaser_hex_pubkey>",
  "tags": [
    ["d", "<transaction_ref>"],
    ["p", "<performer_hex_pubkey>"],
    ["template", "milestone-v1"],
    ["L", "app.vouch.transaction"],
    ["l", "criteria-agreed", "app.vouch.transaction"]
  ],
  "content": "{\"milestones\":[{\"name\":\"API design\",\"deadline\":\"2026-03-15T00:00:00Z\"},{\"name\":\"Implementation\",\"deadline\":\"2026-03-30T00:00:00Z\"}],\"minimumCompletionRatio\":0.8}"
}
```

The performer co-signs (publishes matching event with their key) to confirm agreement. Both events are referenced in any subsequent dispute.

#### Adjudication with Templates

When a dispute arises and a template was agreed upon, the investigation and jury process is significantly simpler:

```
With template: "Was milestone X met by the deadline?"
  → Investigators can evaluate against concrete criteria
  → Less subjective; faster adjudication

Without template: "Was the work satisfactory?"
  → Investigators must evaluate subjective quality
  → More complex; higher risk of disagreement
  → Higher investigation bounty to compensate complexity
```

### 9.3 Custom Templates

Over time, the community can propose and standardize new templates:

```
Proposal process:
  1. Entity publishes template proposal (kind 30300, governance channel)
  2. Community discussion (7 days)
  3. Stake-weighted vote (70% approval required)
  4. If approved: template added to protocol standard set
  5. Template assigned a version number and immutable schema
```

### 9.4 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Agreeing to vague template, then claiming non-delivery on technicality | Protocol recommends most specific template available; vague templates weight toward performer in disputes |
| Performer meets template letter but not spirit | Quality rating template includes subjective rating; combined templates catch this |
| Refusing to agree on any template | Both parties can still transact; disputes without templates are just harder to adjudicate (and parties know this upfront) |
| Creating templates designed to be impossible to satisfy | Template proposals are community-reviewed; impossible conditions are flagged during governance vote |

---

## 10. Community Self-Policing Economics

The full incentive table for every role in the governance ecosystem:

### 10.1 Incentive Matrix

| Role | Incentive | Risk | Skin in Game | Economic Alignment |
|------|-----------|------|-------------|-------------------|
| **Reporter** | Reward if report upheld (bounty share) | Loses collateral (10% of potential slash) if report dismissed | Reporter collateral (sats) | Only reports when confident; false reports are expensive |
| **Investigator** | Bounty for quality investigation (10K+ sats) | Loses eligibility if findings consistently overturned | Reputation + eligibility + 500K sats stake | Thorough, honest investigation pays; sloppy work gets you removed |
| **Juror** | Compensation per case (5-7K sats) | Reputation cost for consistently overturned votes; temporary suspension for non-participation | Trust score + 250K sats stake | Careful deliberation pays; lazy voting gets you suspended |
| **Voucher** | Yield from backing good actors (8-20% APY) | Gets slashed if backed entity misbehaves; score penalty cascades | Staked capital (real sats) | Due diligence on who you back; reckless vouching costs real money |
| **Consumer** | API access + reputation building | Loses stake + access tier if caught cheating | Staked capital + voucher chain | Honest usage builds access; cheating destroys it (and harms vouchers) |
| **Provider** | Reduced fraud, shared detection, slash revenue (40% of confirmed slashes) | Must maintain fair threshold practices or lose consumers to non-Vouch competitors | Market position + integration investment | Accurate detection pays; false positives damage own credibility |
| **Accused** | Fair process + appeals; exoneration if innocent | Must respond within deadlines or lose by default | Existing stake (locked during proceedings) | Honest defense is rewarded; ignoring the process isn't |

### 10.2 System Equilibrium

The incentive structure is designed to reach equilibrium where:

```
Cost of false reporting > Expected gain from false reporting
Cost of poor investigation > Expected gain from poor investigation
Cost of dishonest jury service > Expected gain from dishonest jury service
Cost of reckless vouching > Expected gain from reckless vouching
Cost of defection (non-payment, etc.) > Expected gain from defection
```

When all five inequalities hold, the system is self-policing without centralized authority.

### 10.3 Revenue Flows

```
Protocol Fee Pool (source: 1% of all staking transactions + 3-5% of yield)
    │
    ├── 40% → Operational reserve
    ├── 15% → Investigation bounty pool
    ├── 10% → Juror compensation pool
    ├── 15% → Community treasury (grants, development)
    ├── 10% → Insurance reserve (future MutualShield backing)
    └── 10% → PL operational margin

Additional inflows:
  - Forfeited reporter collateral → Investigation bounty pool
  - Slash surcharge (5% of slashes) → Investigation bounty pool
  - Slash distribution → 40% reporting provider, 30% treasury, 30% burn
```

---

## 11. Anti-Gaming Mechanisms

### 11.1 Vouching Graph Analysis

Circular vouching (A vouches for B, B vouches for A) and vouching rings (A→B→C→A) are detected via graph analysis:

```typescript
interface GraphAnalysis {
  // Run periodically (hourly) on the vouching graph
  detectCircularVouching(graph: VouchGraph): CircularPattern[];
  detectVouchingClusters(graph: VouchGraph): SuspiciousCluster[];
  computeGraphDiversity(entityId: string): DiversityScore;
}

interface CircularPattern {
  entities: string[];         // Entities in the cycle
  cycleLength: number;        // 2 = direct reciprocal, 3+ = ring
  totalStakeInCycle: number;  // Sats flowing in the cycle
  riskLevel: 'low' | 'medium' | 'high';
}

// Consequences of detected circular vouching:
//   cycleLength 2 (A↔B): Warning; vouching weight between these entities reduced by 50%
//   cycleLength 3-5: Investigation trigger; vouching weight reduced by 75%
//   cycleLength 6+: Automated flag; vouching weight zeroed for all entities in ring
//   Entities can dispute the finding (proves legitimate relationship)
```

### 11.2 Score Velocity Limiting

Scores cannot increase faster than defined rates, preventing rapid inflation:

```typescript
interface ScoreVelocityLimits {
  maxDailyIncrease: 15;       // Max +15 points per day
  maxWeeklyIncrease: 50;      // Max +50 points per week (not 7*15)
  maxMonthlyIncrease: 100;    // Max +100 points per month (not 4*50)

  // Decreases are NOT rate-limited -- bad behavior hits immediately
  // This asymmetry is intentional: easy to lose trust, hard to build it

  // New accounts have a "warming period":
  warmingPeriodDays: 30;
  warmingPeriodMaxDaily: 10;  // Even slower during first 30 days
}
```

### 11.3 Behavioral Diversity Requirements

High trust scores require activity across multiple signal dimensions. A score above 500 cannot be achieved with activity in a single dimension:

```typescript
interface DiversityRequirements {
  // For score > 500:
  minActiveDimensions: 3;     // At least 3 of 5 dimensions above zero
  minDimensionScore: 50;      // Each active dimension must contribute >= 50

  // For score > 700:
  minActiveDimensions: 4;     // At least 4 of 5 dimensions
  minDimensionScore: 100;

  // For score > 850:
  minActiveDimensions: 5;     // All 5 dimensions active
  minDimensionScore: 150;
}

// Example: An entity with 1000 in "backing" but 0 in everything else
//   Raw weighted score: 250 (backing is 25% weight)
//   Diversity penalty: score capped at 500 (fewer than 3 dimensions)
//   Effective score: 250 (below cap, so no change — but they can't
//   game their way to 700+ without genuine tenure, performance, etc.)
```

### 11.4 Cross-Provider Signal Correlation

For consumers registered with multiple providers (see Inference Trust Layer spec), behavioral inconsistency across providers is a strong fraud signal:

```typescript
interface CrossProviderCorrelation {
  // Flag if behavior patterns diverge significantly across providers
  // Example: normal usage on Anthropic, heavy CoT extraction on OpenAI
  //   → suggests targeted distillation on the less-monitored provider

  correlationMetrics: {
    usageVolumeRatio: number;      // Volume at Provider A vs B vs C
    cotRequestRatioVariance: number; // How different CoT usage is across providers
    timingPatternCorrelation: number; // Do usage patterns align? (timezone, bursts)
    modelPreferenceConsistency: number; // Same model preferences across providers?
  };

  // High variance across providers → suspicious
  // Threshold: variance > 2 standard deviations from population mean → flag
  suspicionThreshold: 2.0;  // sigma
}
```

### 11.5 Temporal Exploit Defense

Vouch uses **continuous scoring**, not point-in-time snapshots. This prevents the temporal exploit where an actor builds a high score, executes an attack, and benefits from the cached high score:

```typescript
interface ContinuousScoring {
  // Scores are recomputed at minimum every 15 minutes
  recomputeIntervalMinutes: 15;

  // Usage pattern shifts trigger IMMEDIATE recomputation
  triggerConditions: {
    volumeSpike: '3x rolling 24h average';
    cotRatioSpike: '>50% increase in 1 hour';
    newProviderRegistration: true;
    stakeLockActivation: true;
    disputeFiled: true;
  };

  // Score degradation for detected anomalies is near-real-time
  // Gateway middleware caches scores for 5 minutes max (see ITL spec, Section 6.2)
  // On trigger event: cache invalidated, fresh score computed
  cacheInvalidationOnTrigger: true;
}
```

### 11.6 Sybil Detection Heuristics

```typescript
interface SybilDetection {
  // Signals that multiple accounts may be controlled by the same entity
  signals: {
    keyDerivationPattern: boolean;   // Pubkeys that appear BIP-85 derived from same seed
    registrationTiming: boolean;     // Multiple accounts created within minutes
    identicalBehaviorPatterns: boolean; // Same request patterns, same timing
    sharedInfrastructure: boolean;   // Same IP ranges, same hosting provider
    vouchingSymmetry: boolean;       // Accounts only vouch for each other
    stakeMirroring: boolean;         // Identical stake amounts at identical times
  };

  // When Sybil cluster detected:
  //   1. All accounts in cluster flagged
  //   2. Vouching weight between cluster members zeroed
  //   3. Investigation triggered (cluster is evidence, not proof)
  //   4. If confirmed: all accounts in cluster receive same offense
}
```

### 11.7 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Gradually building score over months, then executing single large attack | Score velocity limits mean months of buildup; one confirmed offense erases months of gain (asymmetric) |
| Creating legitimate-looking accounts with genuine activity | Genuine activity = genuine cost; the defense IS the cost of faking legitimacy |
| Rotating through providers to avoid cross-provider correlation | Registration with new provider triggers immediate recomputation; diversity across providers is tracked |
| Splitting distillation across many accounts to stay below detection thresholds | Sybil detection catches coordinated low-volume accounts; vouching requirements create social cost per account |
| Time-of-day exploitation (attacking when monitoring is low) | Automated scoring is 24/7; no human-dependent detection gaps |

---

## 12. Chilling Effect Mitigation

Governance systems that are too aggressive create chilling effects: legitimate users fear false accusations and self-censor. These mechanisms prevent the governance system from becoming a tool of intimidation.

### 12.1 Transparent Detection Criteria

The protocol publishes **what types of behavior trigger flags**, without revealing exact thresholds:

```typescript
// PUBLISHED (users can see this):
interface PublishedDetectionCriteria {
  distillation: {
    signals: [
      'High ratio of chain-of-thought extraction requests',
      'Low prompt diversity (repetitive/systematic querying)',
      'Abnormally uniform request timing',
      'Rapid model switching patterns',
      'Account cluster behavior',
    ];
    // Thresholds NOT published to prevent gaming
    note: 'Exceeding these signals does not guarantee a flag. Context matters.';
  };
  payment: {
    signals: [
      'Non-payment after task completion confirmation',
      'Pattern of disputes without resolution',
      'Stake lock expiration without payment confirmation',
    ];
  };
}

// NOT PUBLISHED (internal only):
interface InternalThresholds {
  cotRatioFlagThreshold: 0.75;           // Flag if >75% of requests are CoT
  promptDiversityFlagThreshold: 0.15;     // Flag if <15% semantic diversity
  // etc. — these are trade secrets
}
```

### 12.2 Warning Before Slashing

No entity is slashed without warning (except for constitutional violations like fraud):

```
Detection flow:
  1. Anomaly detected by automated monitoring
  2. Entity receives WARNING notification:
     "We've detected unusual patterns in your usage.
      This is not an accusation. Possible explanations include
      legitimate research, testing, or benchmark evaluation.
      If you have a legitimate reason, please respond within 7 days."
  3. Entity responds with explanation
  4. If explanation is credible:
     → Warning dismissed, no flag
     → Usage pattern recorded for future context
  5. If no response within 7 days:
     → Flag elevated; may result in report filing
  6. If explanation is not credible:
     → Formal report filed; investigation begins
     → Entity retains all rights (evidence period, defense, appeal)
```

### 12.3 Safe Harbor for Declared Research

Entities can register as researchers/benchmarkers. When their usage patterns match their declared research profile, those patterns are NOT flagged:

```typescript
interface ResearchDeclaration {
  entityId: string;
  declarationType: 'research' | 'benchmarking' | 'red_team' | 'safety_testing';
  description: string;                // What the research involves
  expectedPatterns: {
    highCotRatio: boolean;             // "Yes, I will request lots of CoT"
    systematicQuerying: boolean;        // "Yes, I will send systematic prompts"
    highVolume: boolean;               // "Yes, I will send many requests"
    modelComparison: boolean;          // "Yes, I will test across models"
  };
  institution: string | null;         // Optional institutional affiliation
  publicationIntent: boolean;          // Will results be published?
  validFrom: Date;
  validUntil: Date;                    // Max 180 days; must renew

  // Verification:
  //   - Declaration is a signed Nostr event (accountable to identity)
  //   - Matched patterns during declaration period are not flagged
  //   - Unmatched patterns (outside declared scope) ARE flagged normally
  //   - Declaration does NOT grant immunity from all reports —
  //     only from automated pattern flags that match the declaration
}

// Example: A university lab declares benchmarking intent
//   → Their high CoT ratio doesn't trigger automated flags
//   → But if they're caught exfiltrating model weights, the
//     declaration doesn't protect them (that's outside scope)
```

### 12.4 Reputation Recovery Programs

Entities that have been slashed have a clear path back:

```
Recovery tiers (after slash):
  Day 0-30:   Restricted tier. Minimum access floor only.
  Day 30-90:  Can begin performing small tasks to rebuild performance dimension.
  Day 90-180: If clean behavior: eligible for standard tier restoration review.
  Day 180+:   If clean behavior: normal scoring resumes; slash history ages out
              of the active scoring window (but remains in permanent record).

  Permanent restricted (3rd offense): 365-day minimum before restoration petition.
  Petition requires 75% jury approval + at least 3 existing vouchers willing to re-stake.
```

### 12.5 Attack Vectors Considered

| Attack | Defense |
|--------|---------|
| Using research declaration as cover for actual distillation | Declaration must match actual patterns; scope is narrow; community can still file reports for out-of-scope behavior |
| Abusing warning period (getting warned, stopping, repeating) | Pattern of repeated warnings without resolution is itself a flag; 3 warnings in 90 days = automatic escalation |
| Claiming chilling effect to avoid legitimate investigation | Constitutional protections are clear and published; investigation process has built-in safeguards; this is not a valid defense |
| Using transparency requirements to reverse-engineer exact thresholds | Only signal types are published, not thresholds; thresholds are internal and can be adjusted without notice |

---

## 13. Data Structures

### 13.1 Database Schema

```sql
-- ============================================================
-- DISPUTES
-- ============================================================

CREATE TYPE dispute_type AS ENUM (
  'distillation',
  'non_payment',
  'non_delivery',
  'quality',
  'general'
);

CREATE TYPE dispute_status AS ENUM (
  'filed',
  'investigating',
  'awaiting_response',
  'jury_deliberation',
  'decided',
  'appealed',
  'appeal_decided',
  'dismissed',
  'expired'
);

CREATE TYPE severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE disputes (
  id                TEXT PRIMARY KEY DEFAULT ulid(),

  -- Parties (stored but anonymized in case files)
  reporter_id       TEXT NOT NULL,
  accused_id        TEXT NOT NULL,
  reporter_type     TEXT NOT NULL,          -- 'agent' | 'consumer' | 'provider' | 'user'
  accused_type      TEXT NOT NULL,

  -- Classification
  dispute_type      dispute_type NOT NULL,
  severity          severity NOT NULL,
  behavior_hash     TEXT NOT NULL UNIQUE,   -- SHA-256 of evidence bundle (double jeopardy check)
  behavior_date     TIMESTAMP NOT NULL,     -- When the behavior occurred (SoL check)

  -- Reporter collateral
  collateral_sats   BIGINT NOT NULL,        -- 10% of potential slash
  collateral_status TEXT DEFAULT 'held',    -- 'held' | 'returned' | 'forfeited'

  -- Evidence
  evidence_hash     TEXT NOT NULL,
  evidence_summary  TEXT NOT NULL,
  evidence_bundle   JSONB NOT NULL DEFAULT '{}',

  -- Resolution
  status            dispute_status NOT NULL DEFAULT 'filed',
  decision          TEXT,                   -- 'slash' | 'dismiss' | 'reduce' | null
  slash_bps         INTEGER,               -- Basis points of slash (0-5000)
  decision_reasoning TEXT,

  -- Offense tracking
  prior_offense_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at        TIMESTAMP DEFAULT NOW() NOT NULL,
  evidence_period_ends TIMESTAMP NOT NULL,  -- created_at + 14 days
  investigation_deadline TIMESTAMP,
  jury_deadline     TIMESTAMP,
  decided_at        TIMESTAMP,
  appeal_deadline   TIMESTAMP,              -- decided_at + 14 days

  -- Constraints
  CONSTRAINT valid_slash CHECK (slash_bps IS NULL OR slash_bps <= 5000),
  CONSTRAINT valid_sol CHECK (
    behavior_date >= created_at - INTERVAL '90 days'
  )
);

CREATE INDEX idx_disputes_accused ON disputes(accused_id);
CREATE INDEX idx_disputes_reporter ON disputes(reporter_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_behavior_hash ON disputes(behavior_hash);

-- ============================================================
-- INVESTIGATION ASSIGNMENTS
-- ============================================================

CREATE TABLE investigation_assignments (
  id                TEXT PRIMARY KEY DEFAULT ulid(),
  dispute_id        TEXT NOT NULL REFERENCES disputes(id),
  investigator_id   TEXT NOT NULL,
  assignment_order  INTEGER NOT NULL,       -- 0, 1, 2
  selection_seed    TEXT NOT NULL,           -- For verification

  -- Finding
  finding           TEXT,                   -- 'slash' | 'dismiss' | 'insufficient_evidence'
  recommended_severity severity,
  finding_hash      TEXT,                   -- Sealed commitment hash
  finding_nonce     TEXT,                   -- Revealed after all 3 submit
  reasoning         TEXT,
  confidence_score  REAL,                   -- 0-1: investigator's confidence

  -- Timing
  assigned_at       TIMESTAMP DEFAULT NOW() NOT NULL,
  deadline          TIMESTAMP NOT NULL,     -- assigned_at + 14 days
  submitted_at      TIMESTAMP,
  extended_to       TIMESTAMP,              -- If extension granted

  UNIQUE(dispute_id, investigator_id)
);

-- ============================================================
-- JURY PANELS
-- ============================================================

CREATE TABLE jury_panels (
  id                TEXT PRIMARY KEY DEFAULT ulid(),
  dispute_id        TEXT NOT NULL REFERENCES disputes(id),
  panel_type        TEXT NOT NULL DEFAULT 'original',  -- 'original' | 'appeal' | 'retry'
  jury_size         INTEGER NOT NULL,
  supermajority_threshold REAL NOT NULL,    -- e.g., 0.75
  selection_seed    TEXT NOT NULL,

  -- Timing
  created_at        TIMESTAMP DEFAULT NOW() NOT NULL,
  review_ends       TIMESTAMP NOT NULL,     -- 3 days for review
  deliberation_ends TIMESTAMP NOT NULL,     -- 7 days total
  vote_deadline     TIMESTAMP NOT NULL,

  -- Outcome
  decision          TEXT,                   -- 'slash' | 'dismiss' | 'reduce' | 'hung'
  slash_bps         INTEGER,
  votes_for_slash   INTEGER DEFAULT 0,
  votes_for_dismiss INTEGER DEFAULT 0,
  votes_for_reduce  INTEGER DEFAULT 0,
  decided_at        TIMESTAMP
);

CREATE TABLE jury_members (
  id                TEXT PRIMARY KEY DEFAULT ulid(),
  panel_id          TEXT NOT NULL REFERENCES jury_panels(id),
  juror_id          TEXT NOT NULL,
  pseudonym         TEXT NOT NULL,           -- 'Juror 1', 'Juror 2', etc.

  -- Vote (sealed commit-reveal)
  commit_hash       TEXT,                   -- Phase 1: SHA-256(vote + nonce)
  vote              TEXT,                   -- Phase 2: 'slash' | 'dismiss' | 'reduce'
  recommended_bps   INTEGER,
  vote_nonce        TEXT,
  reasoning         TEXT,

  -- Timing
  assigned_at       TIMESTAMP DEFAULT NOW() NOT NULL,
  commit_submitted_at TIMESTAMP,
  reveal_submitted_at TIMESTAMP,
  compensated       BOOLEAN DEFAULT FALSE,
  compensation_sats BIGINT,

  UNIQUE(panel_id, juror_id)
);

-- ============================================================
-- APPEALS
-- ============================================================

CREATE TABLE appeals (
  id                TEXT PRIMARY KEY DEFAULT ulid(),
  dispute_id        TEXT NOT NULL REFERENCES disputes(id),
  appellant_id      TEXT NOT NULL,           -- reporter or accused
  appellant_role    TEXT NOT NULL,            -- 'reporter' | 'accused'

  -- Grounds
  grounds           TEXT[] NOT NULL,         -- AppealGround[]
  grounds_explanation TEXT NOT NULL,
  new_evidence_hash TEXT,                   -- If ground is 'new_evidence'

  -- Collateral
  collateral_sats   BIGINT NOT NULL,        -- 15% of potential slash
  collateral_status TEXT DEFAULT 'held',

  -- Resolution
  appeal_panel_id   TEXT REFERENCES jury_panels(id),
  decision          TEXT,                   -- 'uphold' | 'overturn' | 'reduce'
  decided_at        TIMESTAMP,

  -- Timing
  filed_at          TIMESTAMP DEFAULT NOW() NOT NULL,
  filing_deadline   TIMESTAMP NOT NULL,     -- Original decision + 14 days

  CONSTRAINT max_one_appeal UNIQUE(dispute_id)
);

-- ============================================================
-- STAKE LOCKS
-- ============================================================

CREATE TABLE stake_locks (
  id                TEXT PRIMARY KEY DEFAULT ulid(),
  lock_type         TEXT NOT NULL,           -- 'payment_guarantee' | 'delivery_guarantee'
  holder_id         TEXT NOT NULL,           -- Entity whose stake is locked
  counterparty_id   TEXT NOT NULL,
  transaction_ref   TEXT NOT NULL,

  lock_amount_sats  BIGINT NOT NULL,
  total_stake_sats  BIGINT NOT NULL,         -- Snapshot at lock time
  lock_percentage   REAL NOT NULL,

  status            TEXT NOT NULL DEFAULT 'active',
  created_at        TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at        TIMESTAMP NOT NULL,      -- Auto-release date
  frozen_at         TIMESTAMP,
  released_at       TIMESTAMP,
  slashed_at        TIMESTAMP,

  dispute_id        TEXT REFERENCES disputes(id),

  CONSTRAINT lock_pct_max CHECK (lock_percentage <= 0.40),
  CONSTRAINT lock_amount_positive CHECK (lock_amount_sats > 0)
);

CREATE INDEX idx_locks_holder ON stake_locks(holder_id);
CREATE INDEX idx_locks_status ON stake_locks(status);

-- ============================================================
-- COMPLETION CRITERIA
-- ============================================================

CREATE TABLE transaction_criteria (
  id                TEXT PRIMARY KEY DEFAULT ulid(),
  transaction_ref   TEXT NOT NULL,
  purchaser_id      TEXT NOT NULL,
  performer_id      TEXT NOT NULL,

  criteria_type     TEXT NOT NULL,           -- 'parametric' | 'template'
  template_id       TEXT,                    -- null for parametric
  template_version  TEXT,
  parameters        JSONB NOT NULL,

  -- Agreement
  purchaser_signed_at TIMESTAMP,
  performer_signed_at TIMESTAMP,
  purchaser_event_id TEXT,                  -- Nostr event ID of purchaser's agreement
  performer_event_id TEXT,                  -- Nostr event ID of performer's agreement

  -- Evaluation
  evaluated_at      TIMESTAMP,
  verdict           TEXT,                   -- 'pass' | 'fail' | 'partial' | null
  evaluation_data   JSONB,

  created_at        TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- INVESTIGATOR / JUROR ELIGIBILITY TRACKING
-- ============================================================

CREATE TABLE governance_eligibility (
  id                TEXT PRIMARY KEY DEFAULT ulid(),
  entity_id         TEXT NOT NULL UNIQUE,
  role              TEXT NOT NULL,           -- 'investigator' | 'juror'
  opted_in          BOOLEAN DEFAULT FALSE,
  opted_in_at       TIMESTAMP,

  -- Qualification snapshot (refreshed hourly)
  trust_score       INTEGER,
  stake_sats        BIGINT,
  tenure_days       INTEGER,

  -- Track record
  total_assignments INTEGER DEFAULT 0,
  findings_upheld   INTEGER DEFAULT 0,
  findings_overturned INTEGER DEFAULT 0,
  active_assignments INTEGER DEFAULT 0,

  -- Suspension
  suspended_until   TIMESTAMP,
  suspension_reason TEXT,

  -- Timestamps
  last_qualified_check TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_eligibility_role ON governance_eligibility(role);
CREATE INDEX idx_eligibility_opted_in ON governance_eligibility(opted_in) WHERE opted_in = TRUE;

-- ============================================================
-- VOUCHER DISPUTE NOTIFICATIONS
-- ============================================================

CREATE TABLE dispute_notifications (
  id                TEXT PRIMARY KEY DEFAULT ulid(),
  dispute_id        TEXT NOT NULL REFERENCES disputes(id),
  voucher_id        TEXT NOT NULL,
  notification_type TEXT NOT NULL,           -- 'dispute_filed' | 'investigation_complete' | 'decided'

  -- Delivery
  nostr_event_id    TEXT,                   -- NIP-44 DM event ID
  delivered_at      TIMESTAMP,
  read_at           TIMESTAMP,

  -- Voucher response
  revoked_vouch     BOOLEAN DEFAULT FALSE,
  revoked_at        TIMESTAMP,

  created_at        TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_dispute ON dispute_notifications(dispute_id);
CREATE INDEX idx_notifications_voucher ON dispute_notifications(voucher_id);
```

### 13.2 Nostr Event Kinds (New)

| Kind | Type | Name | Purpose |
|------|------|------|---------|
| 30360 | Parameterized Replaceable | Investigator Opt-In | Register as investigator in pool |
| 30361 | Parameterized Replaceable | Juror Opt-In | Register as juror in pool |
| 30370 | Parameterized Replaceable | Transaction Criteria | Completion criteria agreement |
| 30371 | Parameterized Replaceable | Research Declaration | Safe harbor registration |
| 1320 | Regular | Dispute Filed | Public record of dispute filing (anonymized) |
| 1321 | Regular | Dispute Decided | Public record of decision |
| 1322 | Regular | Appeal Filed | Public record of appeal |
| 1323 | Regular | Appeal Decided | Public record of appeal outcome |
| 1324 | Regular | Dispute Warning | Pre-dispute warning notification |

---

## 14. Implementation Phases

### Phase 0: Constitutional Foundation (Week 1)

Must ship before ANY governance feature:

- [ ] Constitutional limits hardcoded in adjudication engine
- [ ] `validateSlashRequest()` with all invariant checks
- [ ] Graduated severity table
- [ ] Minimum access floor specification published
- [ ] Database schema: `disputes`, `stake_locks` tables

**Why first:** Everything else depends on these constraints. Building governance without constitutional limits creates a system that can't be retroactively constrained.

### Phase 1: Dispute Filing + Stake Locks (Weeks 2-4)

Minimum viable transaction safety:

- [ ] Dispute filing flow (reporter collateral, evidence submission)
- [ ] Stake lock mechanism (create, freeze, release, slash)
- [ ] Voucher notification on dispute filing
- [ ] Behavioral hash + double jeopardy checking
- [ ] Statute of limitations enforcement
- [ ] Database schema: `stake_locks`, `dispute_notifications`

**What this enables:** Basic transaction safety. Purchasers and performers can lock stakes. Disputes can be filed. But adjudication is still manual (PL team reviews).

### Phase 2: Investigation System (Weeks 5-7)

Decentralized investigation:

- [ ] Investigator pool with opt-in and qualification checking
- [ ] Random assignment lottery
- [ ] Case anonymization pipeline
- [ ] Sealed finding commitment (hash, then reveal)
- [ ] Investigation deadline enforcement
- [ ] Bounty calculation and distribution
- [ ] Database schema: `investigation_assignments`, `governance_eligibility`

**What this enables:** Reports are investigated by qualified, randomly selected, anonymous investigators instead of PL staff.

### Phase 3: Jury Adjudication (Weeks 8-10)

Decentralized decision-making:

- [ ] Juror pool with opt-in and qualification checking
- [ ] Jury selection with conflict-of-interest filtering
- [ ] Anonymous deliberation (NIP-29 ephemeral groups)
- [ ] Sealed commit-reveal voting
- [ ] Decision execution (slash, dismiss, reduce)
- [ ] Juror compensation
- [ ] PL exclusion from conflicted cases
- [ ] Database schema: `jury_panels`, `jury_members`

**What this enables:** Disputes are decided by community juries, not PL. Full decentralized governance.

### Phase 4: Appeals + Completion Criteria (Weeks 11-13)

Process completeness:

- [ ] Appeals filing with grounds validation
- [ ] Appeal jury selection (no overlap with original)
- [ ] Appeal adjudication flow
- [ ] Parametric completion criteria (automated evaluation)
- [ ] Template-based completion criteria (standard templates)
- [ ] Template governance (community proposals for new templates)
- [ ] Database schema: `appeals`, `transaction_criteria`

**What this enables:** Full appeals process. Structured completion criteria reduce dispute complexity.

### Phase 5: Anti-Gaming + Chilling Effect Mitigation (Weeks 14-16)

System hardening:

- [ ] Vouching graph analysis (circular vouching detection)
- [ ] Score velocity limiting
- [ ] Behavioral diversity requirements
- [ ] Cross-provider signal correlation
- [ ] Continuous scoring with trigger-based recomputation
- [ ] Sybil detection heuristics
- [ ] Research declaration / safe harbor system
- [ ] Warning-before-slashing flow
- [ ] Reputation recovery programs

**What this enables:** System is hardened against sophisticated gaming. Legitimate users have clear protections.

### Phase 6: Maturity + Automation (Weeks 17+)

Ongoing refinement:

- [ ] Automated investigation for parametric disputes (no human investigator needed)
- [ ] Machine learning for Sybil detection improvement
- [ ] Community-proposed custom completion templates
- [ ] Cross-protocol reputation import/export
- [ ] Investigator/juror performance analytics and feedback loops

---

## 15. Open Questions

### Governance Bootstrapping

1. **Chicken-and-egg:** How do we staff the investigator and juror pools before the network has enough qualified participants? **Current thinking:** PL staff serves as interim investigators/jurors during Phase 2-3, with automatic handoff to community pools when pool size exceeds 20 qualified members.

2. **Minimum pool sizes:** What is the minimum number of qualified investigators (and jurors) before the system can function? If fewer than 15 investigators, random selection from a small pool becomes predictable. **Needs analysis.**

### Legal and Regulatory

3. **Stake locks and financial regulation:** Are stake locks (freezing a user's existing stake) considered a financial service in any jurisdiction? They don't hold new funds, but they restrict access to existing funds. **Needs legal review.**

4. **Reporter collateral as barrier:** The 10% reporter collateral requirement may discourage legitimate reports from low-stake entities. Should there be a sliding scale or waiver for entities with high trust scores? **Needs community input.**

5. **Investigator liability:** Do investigators have any legal exposure for their findings? If an investigator's finding leads to a wrongful slash, is the investigator (or PL) liable? **Needs legal review.**

### Technical

6. **Anonymization robustness:** How robust is the case anonymization? If an investigator can correlate behavioral data with publicly available usage data, they might de-anonymize the accused. **Needs threat modeling.**

7. **Sealed commitment timing:** The commit-reveal scheme for investigators and jurors requires all parties to submit commits before any reveals. What happens if one party commits but never reveals (griefing)? **Current thinking:** Non-reveal within 48 hours of last commit = forfeiture + replacement.

8. **Cross-chain integration:** If Vouch eventually supports staking on multiple chains (Lightning + Ethereum), how do constitutional limits apply across chains? Is a 50% slash on Lightning + a 50% slash on Ethereum = 100% total slash (violating the constitutional limit)? **Needs protocol design.**

### Economic

9. **Bounty pool sustainability:** Is the 15% protocol fee allocation + forfeited collateral + slash surcharge sufficient to sustain investigation bounties as the system scales? **Needs modeling.**

10. **Juror compensation fairness:** At 5-7K sats per case (roughly $5-7), is this sufficient incentive for the time and cognitive effort of jury deliberation? What's the right price? **Needs market testing.**

11. **Gaming the graduated severity:** An entity could create a "clean" first offense to receive only a warning, then commit a more serious second offense knowing the first was just a warning. Does the graduated system adequately deter this? **Needs game theory analysis.**

### Design Philosophy

12. **Centralization gradient:** During the bootstrapping phases, PL has significant influence over governance. What specific, measurable milestones should trigger PL stepping back from governance roles? **Needs roadmap.**

13. **Interoperability:** If another trust protocol (competitor or complement) emerges, should Vouch's governance system accept their trust scores as input? How do constitutional limits translate across protocols? **Future design work.**

---

*This specification is a trade secret of Percival Labs. The protocol-level concepts (constitutional limits, graduated severity, minimum access floor) may be published as a defensive disclosure. The specific thresholds, algorithms, and implementation details remain proprietary.*

*Companion document: PL-SPEC-2026-002, Vouch Inference Trust Layer -- Technical Specification.*

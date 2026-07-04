// Agent Insurance Service — quote, bind, and adjudicate policies on top of Vouch.
//
// Underwriting consumes the agent's Vouch trust score, MCP-T behavioral fidelity, and
// staked collateral. Claims are adjudicated against the agent's behavioral provenance
// ledger: a payout is only approved when the cited evidence is a real ledger record
// that actually evidences a covered failure.

import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, insurancePolicies, insuranceClaims, behavioralTraces, paymentEvents } from '@percival/vouch-db';

type BehavioralTraceRow = typeof behavioralTraces.$inferSelect;
type PaymentEventRow = typeof paymentEvents.$inferSelect;
import { calculateAgentTrust } from './trust-service';
import { computeBehavioralFidelity } from './behavioral-trace-service';
import { getPoolByAgent } from './staking-service';
import { createInvoice, lookupInvoice } from './albyhub-service';
import { resolveSubject } from '../lib/subject';
import { quoteUnderwriting, type UnderwritingInputs, type UnderwritingQuote } from './underwriting';

const DAY_MS = 24 * 60 * 60 * 1000;

// Neutral fidelity used when an agent has no resolvable pubkey (legacy agents can't
// have behavioral traces, which are keyed by pubkey).
const NEUTRAL_FIDELITY = { score: 500, confidence: 0.1, evidenceCount: 0, avgFidelityRatio: 0.5 } as const;

// Policy statuses whose collateral is actively pledged as first-loss and must be excluded
// from a new quote's available collateral (#11 collateral double-pledging). Typed to the
// policy_status enum union so drizzle's inArray accepts it.
type PolicyStatus = typeof insurancePolicies.$inferSelect.status;
const ENCUMBERING_STATUSES: PolicyStatus[] = ['active', 'quoted'];

/**
 * Sats already pledged as first-loss to this agent's outstanding insurance policies.
 * Collateral applied to a policy = coverage − net exposure (what the stake absorbs before
 * the pool). Excluding it prevents the same staked sats being counted as first-loss for
 * multiple concurrent policies.
 *
 * NOTE: this only de-conflicts insurance-vs-insurance. The same pool also backs performance
 * bonds and the trust backing dimension; fully cross-product encumbrance needs the shared
 * `encumbrances` ledger (see follow-up note for the SDK-DB track).
 */
async function getEncumberedCollateralSats(agentId: string): Promise<number> {
  const [row] = await db
    .select({
      pledged: sql<number>`COALESCE(SUM(${insurancePolicies.coverageSats} - ${insurancePolicies.netExposureSats}), 0)`,
    })
    .from(insurancePolicies)
    .where(
      and(
        eq(insurancePolicies.agentId, agentId),
        inArray(insurancePolicies.status, ENCUMBERING_STATUSES),
      ),
    );
  return Math.max(0, Number(row?.pledged ?? 0));
}

// Covered failure classes and the ledger predicate that evidences each.
// A claim is only approved when cited provenance satisfies the predicate.
const COVERED_EVENT_PREDICATES: Record<string, (t: BehavioralTraceRow) => boolean> = {
  // Agent took undeclared actions (acted outside its declared scope).
  scope_violation: (t) => (t.undeclaredToolCalls ?? 0) > 0 || (t.undeclaredResources ?? 0) > 0,
  // Behavioral fidelity dropped below an acceptable threshold.
  fidelity_breach: (t) => (t.fidelityRatio ?? 1) < 0.9,
};

export const COVERED_EVENT_TYPES = Object.keys(COVERED_EVENT_PREDICATES);

export interface QuoteRequest {
  agentId: string;
  coverageSats: number;
  termDays: number;
}

export interface QuoteResult extends UnderwritingQuote {
  agentId: string;
  coverageSats: number;
  termDays: number;
  inputs: UnderwritingInputs;
}

/** Gather an agent's reputation, fidelity, and collateral, then price coverage. */
export async function quotePolicyForAgent(req: QuoteRequest): Promise<QuoteResult | null> {
  // Resolve the agent ONCE to both canonical forms. Trust/staking key on the ULID;
  // behavioral fidelity keys on the pubkey. Threading the wrong one was why fidelity was
  // always neutral and quotes always thin (#3).
  const subject = await resolveSubject(req.agentId);
  if (!subject) return null; // unknown agent

  const breakdown = await calculateAgentTrust(subject.id);
  if (!breakdown) return null;

  const [fidelity, pool, encumberedSats] = await Promise.all([
    subject.pubkey ? computeBehavioralFidelity(subject.pubkey) : Promise.resolve(NEUTRAL_FIDELITY),
    getPoolByAgent(subject.id),
    getEncumberedCollateralSats(subject.id),
  ]);

  // Only collateral not already pledged to another policy counts as first-loss here (#11).
  const availableCollateralSats = Math.max(0, (pool?.totalStakedSats ?? 0) - encumberedSats);

  const inputs: UnderwritingInputs = {
    compositeScore: breakdown.composite,
    behavioralFidelity: breakdown.dimensions.behavioralFidelity,
    fidelityConfidence: fidelity.confidence,
    performanceScore: breakdown.dimensions.performance,
    evidenceCount: fidelity.evidenceCount,
    collateralSats: availableCollateralSats,
    coverageSats: req.coverageSats,
    termDays: req.termDays,
  };

  return {
    ...quoteUnderwriting(inputs),
    agentId: subject.id, // canonical ULID — downstream FKs reference agents.id
    coverageSats: req.coverageSats,
    termDays: req.termDays,
    inputs,
  };
}

export interface BindRequest extends QuoteRequest {
  policyholderId: string;
  policyholderType: 'user' | 'agent';
  coveredEvents: string[];
}

/**
 * Re-quote and, if eligible, bind a policy in `quoted` status. Coverage is NOT active until
 * the premium settles — call `activatePolicy` once a settled premium `paymentEvents` row
 * exists. This prevents issuing free active coverage (#4).
 */
export async function bindPolicy(req: BindRequest): Promise<
  | { ok: true; policyId: string; status: 'quoted'; quote: QuoteResult }
  | { ok: false; reason: string; quote?: QuoteResult }
> {
  const quote = await quotePolicyForAgent(req);
  if (!quote) return { ok: false, reason: 'unknown_agent' };
  if (quote.decision === 'declined') {
    return { ok: false, reason: quote.declineReasons[0] ?? 'declined', quote };
  }

  const covered = req.coveredEvents.filter((e) => COVERED_EVENT_TYPES.includes(e));
  if (covered.length === 0) return { ok: false, reason: 'no_valid_covered_events', quote };

  const now = new Date();
  const termEnd = new Date(now.getTime() + req.termDays * DAY_MS);

  const [row] = await db
    .insert(insurancePolicies)
    .values({
      agentId: quote.agentId, // canonical ULID resolved during quoting
      policyholderId: req.policyholderId,
      policyholderType: req.policyholderType,
      coverageSats: req.coverageSats,
      premiumSats: quote.premiumSats,
      netExposureSats: quote.netExposureSats,
      riskTier: quote.riskTier,
      reliabilityScore: quote.reliabilityScore,
      annualFailureProbBps: quote.annualFailureProbBps,
      premiumRateBps: quote.premiumRateBps,
      coveredEvents: covered,
      quoteSnapshot: quote,
      status: 'quoted', // inactive until premium settles (see activatePolicy)
      termStart: now,
      termEnd,
    })
    .returning({ id: insurancePolicies.id });

  return { ok: true, policyId: row!.id, status: 'quoted', quote };
}

/**
 * Activate a `quoted` policy once its premium has been collected. Coverage only becomes
 * real when a settled (`paid`) `paymentEvents` row tagged for this policy exists and covers
 * the quoted premium. Fail-closed: with no premium collection wired yet, nothing activates,
 * so no free coverage is ever granted.
 *
 * The premium is matched via `paymentEvents.metadata` ({ type: 'insurance_premium',
 * policyId }) so no schema change is required. `createPremiumInvoice` / `confirmPremiumPayment`
 * below are what write that row.
 */
export async function activatePolicy(policyId: string): Promise<
  { ok: true; status: 'active' } | { ok: false; reason: string }
> {
  const policy = await getPolicy(policyId);
  if (!policy) return { ok: false, reason: 'policy_not_found' };
  if (policy.status === 'active') return { ok: true, status: 'active' };
  if (policy.status !== 'quoted') return { ok: false, reason: 'policy_not_quoted' };
  if (new Date() > policy.termEnd) return { ok: false, reason: 'policy_expired' };

  // Look for a settled premium payment tagged for this policy. Defensive JS-side filter on
  // the jsonb metadata (no dedicated purpose enum yet — money-track follow-up).
  const paidRows = await db.select().from(paymentEvents).where(eq(paymentEvents.status, 'paid'));
  const settledPremium = paidRows.some((p) => {
    const meta = (p.metadata ?? {}) as Record<string, unknown>;
    return (
      meta.type === 'insurance_premium' &&
      meta.policyId === policyId &&
      Number(p.amountSats ?? 0) >= policy.premiumSats
    );
  });
  if (!settledPremium) return { ok: false, reason: 'premium_not_settled' };

  await db
    .update(insurancePolicies)
    .set({ status: 'active' })
    .where(eq(insurancePolicies.id, policyId));

  return { ok: true, status: 'active' };
}

export async function getPolicy(id: string) {
  const [row] = await db.select().from(insurancePolicies).where(eq(insurancePolicies.id, id)).limit(1);
  return row ?? null;
}

// ── Premium Collection ──
//
// Mirrors credit-service's deposit create/confirm pair (createDeposit/confirmDeposit): a
// platform-side Lightning invoice via Alby Hub, recorded as a `paymentEvents` row and settled
// only once the invoice is verified paid. No dedicated `insurance_premium` payment purpose
// exists in the `payment_purpose` enum yet (follow-up: add one + an index on
// `metadata->>'policyId'` once the money-track schema is touched) — for now we reuse
// `treasury_fee` as the generic incoming-to-platform bucket, the same convention
// staking-service (`activity_fee_backing`) and fee-distribution-service
// (`fee_distribution_record`) use for non-treasury-fee-literal collections, sub-classified via
// `metadata.type`. `activatePolicy` above only inspects `metadata`, so this reuse is transparent
// to it.

/** Find the (at most one) premium paymentEvents row for a policy in a given status. Same
 * defensive JS-side filter on jsonb metadata that `activatePolicy` uses above. */
async function findPremiumPaymentEvent(
  policyId: string,
  status: 'pending' | 'paid',
): Promise<PaymentEventRow | null> {
  const rows = await db.select().from(paymentEvents).where(eq(paymentEvents.status, status));
  const match = rows.find((p) => {
    const meta = (p.metadata ?? {}) as Record<string, unknown>;
    return meta.type === 'insurance_premium' && meta.policyId === policyId;
  });
  return match ?? null;
}

export interface PremiumInvoice {
  policyId: string;
  paymentHash: string;
  bolt11: string;
  amountSats: number;
}

/**
 * Create (or, if one is already pending, return) the Lightning invoice for a quoted policy's
 * premium. Idempotent so a retried request doesn't mint a new invoice — and a new pending
 * `paymentEvents` row — every time.
 */
export async function createPremiumInvoice(policyId: string): Promise<
  { ok: true; invoice: PremiumInvoice } | { ok: false; reason: string }
> {
  const policy = await getPolicy(policyId);
  if (!policy) return { ok: false, reason: 'policy_not_found' };
  if (policy.status !== 'quoted') return { ok: false, reason: 'policy_not_quoted' };
  if (new Date() > policy.termEnd) return { ok: false, reason: 'policy_expired' };

  // A settled premium awaiting admin activation must not be re-invoiced/double-charged.
  if (await findPremiumPaymentEvent(policyId, 'paid')) {
    return { ok: false, reason: 'premium_already_settled' };
  }

  const pending = await findPremiumPaymentEvent(policyId, 'pending');
  if (pending) {
    return {
      ok: true,
      invoice: {
        policyId,
        paymentHash: pending.paymentHash,
        bolt11: pending.bolt11 ?? '',
        amountSats: pending.amountSats,
      },
    };
  }

  const invoice = await createInvoice(policy.premiumSats, `Vouch insurance premium — policy ${policyId}`);

  await db.insert(paymentEvents).values({
    paymentHash: invoice.paymentHash,
    bolt11: invoice.paymentRequest,
    amountSats: policy.premiumSats,
    purpose: 'treasury_fee',
    status: 'pending',
    metadata: { type: 'insurance_premium', policyId },
  });

  return {
    ok: true,
    invoice: { policyId, paymentHash: invoice.paymentHash, bolt11: invoice.paymentRequest, amountSats: policy.premiumSats },
  };
}

export interface PremiumSettlement {
  policyId: string;
  status: 'paid';
  amountSats: number;
}

/**
 * Confirm a premium invoice after Lightning payment. Verifies the invoice was actually paid
 * (network call runs OUTSIDE any DB transaction/lock — same #6 fix as credit-service's
 * confirmDeposit) then atomically flips the `paymentEvents` row `pending` -> `paid`. The
 * conditional `UPDATE ... WHERE status = 'pending' RETURNING` is the single winner of a
 * double-confirm race, reusing confirmDeposit's idempotency pattern so a premium can never be
 * settled twice. Coverage activation itself stays a separate admin/oracle step
 * (`activatePolicy`) — this only records that the premium was paid.
 */
export async function confirmPremiumPayment(policyId: string): Promise<
  { ok: true; settlement: PremiumSettlement } | { ok: false; reason: string }
> {
  const policy = await getPolicy(policyId);
  if (!policy) return { ok: false, reason: 'policy_not_found' };
  if (policy.status !== 'quoted') return { ok: false, reason: 'policy_not_quoted' };

  const event = await findPremiumPaymentEvent(policyId, 'pending');
  if (!event) return { ok: false, reason: 'no_pending_premium_invoice' };

  const invoice = await lookupInvoice(event.paymentHash);
  if (!invoice) {
    return { ok: false, reason: 'invoice_unverifiable' };
  }
  if (!invoice.settled) {
    return { ok: false, reason: 'invoice_not_paid' };
  }
  if (invoice.amountSats > 0 && invoice.amountSats < event.amountSats) {
    return { ok: false, reason: 'invoice_amount_mismatch' };
  }

  const gated = await db
    .update(paymentEvents)
    .set({ status: 'paid', webhookReceivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(paymentEvents.id, event.id), eq(paymentEvents.status, 'pending')))
    .returning({ id: paymentEvents.id, amountSats: paymentEvents.amountSats });

  if (gated.length === 0) {
    // Lost the race to a concurrent confirm (or already settled) — not a new failure mode.
    return { ok: false, reason: 'premium_already_settled' };
  }

  return { ok: true, settlement: { policyId, status: 'paid', amountSats: gated[0]!.amountSats } };
}

// ── Claim Settlement (the money leg) ──
//
// adjudicateClaim (below) rules on evidence and sets payoutSats — but ruling is not paying.
// settleClaim is where sats actually move, under the same money-in-before-out invariant the
// C1 treasury fix established: a payout may never exceed the INSURANCE RESERVE — premiums
// actually collected minus payouts already committed. No dipping into the treasury, staking
// pools, or uncollected quotes. If the reserve can't cover an approved claim, settlement is
// refused loudly (`insufficient_reserve`) for a human to resolve — never a silent overdraft.
//
// Crash-safety ordering: the payout INTENT row (a pending paymentEvents row with the
// deterministic hash `claimpayout:<claimId>`) is written BEFORE the claim flips to `paid`,
// so a crash between the two leaves committed money visible to the reserve computation and a
// re-call converges (the intent row is found, not re-inserted — and in Postgres the
// payment_hash unique constraint makes the double-insert impossible even under a race).

/** Sum of settled premium collections minus payouts already committed (paid OR pending —
 *  an intent is committed money). The bound every settlement must respect. */
export async function getInsuranceReserveSats(): Promise<number> {
  const rows = await db.select().from(paymentEvents);
  let reserve = 0;
  for (const p of rows) {
    const meta = (p.metadata ?? {}) as Record<string, unknown>;
    if (meta.type === 'insurance_premium' && p.status === 'paid') {
      reserve += Number(p.amountSats ?? 0);
    } else if (meta.type === 'insurance_claim_payout' && (p.status === 'paid' || p.status === 'pending')) {
      reserve -= Number(p.amountSats ?? 0);
    }
  }
  return reserve;
}

/** The (at most one) payout paymentEvents row for a claim, any status. */
async function findPayoutPaymentEvent(claimId: string): Promise<PaymentEventRow | null> {
  const rows = await db.select().from(paymentEvents);
  const match = rows.find((p) => {
    const meta = (p.metadata ?? {}) as Record<string, unknown>;
    return meta.type === 'insurance_claim_payout' && meta.claimId === claimId;
  });
  return match ?? null;
}

export interface ClaimSettlement {
  claimId: string;
  payoutSats: number;
  /** 'paid' = sats pushed over Lightning now; 'pending' = recorded, awaiting wallet/claim —
   *  the same best-effort posture as settle-payouts (never silently dropped). */
  paymentStatus: 'paid' | 'pending';
}

/**
 * Settle an APPROVED claim: enforce the reserve invariant, commit the payout intent, flip the
 * claim to `paid`, then (when a wallet is known) push the sats over NWC. Idempotent — a claim
 * already settled returns its existing settlement instead of paying twice.
 */
export async function settleClaim(
  claimId: string,
  opts: { nwcConnectionId?: string } = {},
): Promise<{ ok: true; settlement: ClaimSettlement } | { ok: false; reason: string; reserveSats?: number }> {
  const claim = await getClaim(claimId);
  if (!claim) return { ok: false, reason: 'claim_not_found' };
  if (claim.status === 'paid') {
    const existing = await findPayoutPaymentEvent(claimId);
    return existing
      ? { ok: true, settlement: { claimId, payoutSats: existing.amountSats, paymentStatus: existing.status === 'paid' ? 'paid' : 'pending' } }
      : { ok: false, reason: 'settled_but_no_payout_record' }; // inconsistent — human review
  }
  if (claim.status !== 'approved') return { ok: false, reason: 'claim_not_approved' };
  const payoutSats = Number(claim.payoutSats ?? 0);
  if (payoutSats <= 0) return { ok: false, reason: 'no_payout_amount' };

  // 1. The invariant: committed money only. (Narrow cross-claim race window is closed by the
  //    admin-gated, low-volume nature of settlement + the per-claim unique hash; a genuinely
  //    concurrent overdraft would need two DIFFERENT claims in the same instant — acceptable
  //    residual, documented.)
  let intent = await findPayoutPaymentEvent(claimId);
  if (!intent) {
    const reserve = await getInsuranceReserveSats();
    if (payoutSats > reserve) {
      return { ok: false, reason: 'insufficient_reserve', reserveSats: reserve };
    }
    // 2. Commit the intent BEFORE flipping the claim (crash-safe ordering; see header). A
    //    unique-hash collision means a concurrent settle won the insert — either way the row
    //    is re-read below, so both racers converge on the same single money record.
    try {
      await db.insert(paymentEvents).values({
        paymentHash: `claimpayout:${claimId}`,
        amountSats: payoutSats,
        purpose: 'agent_payout',
        status: 'pending',
        metadata: {
          type: 'insurance_claim_payout',
          claimId,
          policyId: claim.policyId,
          claimantId: claim.claimantId,
          ...(opts.nwcConnectionId ? {} : { reason: 'no_nwc_connection' }),
        },
      });
    } catch { /* payment_events_payment_hash_unique — the concurrent winner's row is used */ }
    intent = await findPayoutPaymentEvent(claimId);
    if (!intent) return { ok: false, reason: 'payout_commit_failed' };
  }

  // 3. Flip the claim. Conditional so a concurrent settle can't double-flip; either way the
  //    payout row above is the single money record.
  await db
    .update(insuranceClaims)
    .set({ status: 'paid', updatedAt: new Date() })
    .where(and(eq(insuranceClaims.id, claimId), eq(insuranceClaims.status, 'approved')));

  // 4. Best-effort Lightning push, OUTSIDE any lock (network never runs under a DB gate —
  //    the #6 discipline). Failure leaves the pending intent for retry; nothing is lost.
  if (opts.nwcConnectionId && intent.status === 'pending') {
    try {
      const { payYield } = await import('./nwc-service');
      const result = await payYield(opts.nwcConnectionId, payoutSats);
      await db
        .update(paymentEvents)
        .set({ status: 'paid', paymentHash: result.paymentHash, nwcConnectionId: opts.nwcConnectionId, webhookReceivedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(paymentEvents.id, intent.id), eq(paymentEvents.status, 'pending')));
      return { ok: true, settlement: { claimId, payoutSats, paymentStatus: 'paid' } };
    } catch (err) {
      await db
        .update(paymentEvents)
        .set({
          metadata: { ...((intent.metadata ?? {}) as Record<string, unknown>), lastPayError: err instanceof Error ? err.message : String(err) },
          updatedAt: new Date(),
        })
        .where(eq(paymentEvents.id, intent.id));
      return { ok: true, settlement: { claimId, payoutSats, paymentStatus: 'pending' } };
    }
  }

  return { ok: true, settlement: { claimId, payoutSats, paymentStatus: intent.status === 'paid' ? 'paid' : 'pending' } };
}

export interface FileClaimRequest {
  policyId: string;
  claimantId: string;
  claimantType: 'user' | 'agent';
  claimType: string;
  claimedAmountSats: number;
  description?: string;
  evidenceEventIds: string[];
}

export async function fileClaim(req: FileClaimRequest): Promise<
  { ok: true; claimId: string } | { ok: false; reason: string }
> {
  const policy = await getPolicy(req.policyId);
  if (!policy) return { ok: false, reason: 'policy_not_found' };
  if (policy.status !== 'active') return { ok: false, reason: 'policy_not_active' };
  if (new Date() > policy.termEnd) return { ok: false, reason: 'policy_expired' };
  if (!(policy.coveredEvents as string[]).includes(req.claimType)) {
    return { ok: false, reason: 'claim_type_not_covered' };
  }
  if (req.claimedAmountSats <= 0 || req.claimedAmountSats > policy.coverageSats) {
    return { ok: false, reason: 'claim_amount_out_of_bounds' };
  }

  const [row] = await db
    .insert(insuranceClaims)
    .values({
      policyId: req.policyId,
      agentId: policy.agentId,
      claimantId: req.claimantId,
      claimantType: req.claimantType,
      claimType: req.claimType,
      description: req.description ?? null,
      claimedAmountSats: req.claimedAmountSats,
      evidenceEventIds: req.evidenceEventIds,
      status: 'filed',
    })
    .returning({ id: insuranceClaims.id });

  return { ok: true, claimId: row!.id };
}

export async function getClaim(id: string) {
  const [row] = await db.select().from(insuranceClaims).where(eq(insuranceClaims.id, id)).limit(1);
  return row ?? null;
}

/**
 * Adjudicate a claim against the behavioral provenance ledger.
 * Approves only when the cited evidence (a) corresponds to real ledger records for this
 * agent, and (b) actually evidences the covered failure class. Payout is capped at the
 * lesser of the claimed amount and the policy coverage.
 */
export async function adjudicateClaim(claimId: string): Promise<
  { ok: true; status: 'approved' | 'denied'; provenanceVerified: boolean; payoutSats: number; notes: string }
  | { ok: false; reason: string }
> {
  const claim = await getClaim(claimId);
  if (!claim) return { ok: false, reason: 'claim_not_found' };
  if (claim.status !== 'filed' && claim.status !== 'verifying') {
    return { ok: false, reason: 'claim_already_adjudicated' };
  }
  const policy = await getPolicy(claim.policyId);
  if (!policy) return { ok: false, reason: 'policy_not_found' };

  const evidenceIds = (claim.evidenceEventIds as string[]) ?? [];
  const predicate = COVERED_EVENT_PREDICATES[claim.claimType];

  let provenanceVerified = false;
  let supportsClaim = false;
  let notes = '';

  // Behavioral traces are keyed by hex pubkey, but claim.agentId is the agents.id ULID.
  // Resolve to the pubkey before matching, or no claim can ever verify (#3).
  const subject = await resolveSubject(claim.agentId);

  if (!predicate) {
    notes = 'claim_type_not_adjudicable';
  } else if (evidenceIds.length === 0) {
    notes = 'no_evidence_cited';
  } else if (!subject?.pubkey) {
    notes = 'agent_pubkey_unresolved';
  } else {
    // Fetch the cited records, scoped to THIS agent's pubkey — prevents citing another
    // agent's events.
    const traces = await db
      .select()
      .from(behavioralTraces)
      .where(and(eq(behavioralTraces.agentPubkey, subject.pubkey), inArray(behavioralTraces.eventId, evidenceIds)));

    provenanceVerified = traces.length === evidenceIds.length && traces.length > 0;
    supportsClaim = traces.some((t) => predicate(t as BehavioralTraceRow));
    notes = `verified ${traces.length}/${evidenceIds.length} cited records; covered failure ${supportsClaim ? 'confirmed' : 'not found'}`;
  }

  const approved = provenanceVerified && supportsClaim;
  const payoutSats = approved ? Math.min(claim.claimedAmountSats, policy.coverageSats) : 0;
  const status: 'approved' | 'denied' = approved ? 'approved' : 'denied';

  await db
    .update(insuranceClaims)
    .set({ status, provenanceVerified, payoutSats, adjudicationNotes: notes, updatedAt: new Date() })
    .where(eq(insuranceClaims.id, claimId));

  if (approved) {
    await db.update(insurancePolicies).set({ status: 'claimed' }).where(eq(insurancePolicies.id, policy.id));
  }

  return { ok: true, status, provenanceVerified, payoutSats, notes };
}

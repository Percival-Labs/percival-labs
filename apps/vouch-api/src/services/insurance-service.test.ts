// Integration-style test for the insurance pipeline against an in-memory DB double.
// Proves the #3 id/pubkey fix (a claim now verifies against a seeded behavioral trace) and
// the #4 premium gating (coverage is inactive until a settled premium exists).
//
// The DB double stands in for Postgres: it evaluates drizzle eq/and/or/inArray predicates
// and one SUM aggregate (the #11 encumbrance query) over per-table in-memory stores.

import { describe, test, expect, mock, beforeEach } from 'bun:test';

// ── In-memory store + predicate evaluator ──

type Row = Record<string, any>;
const store: Record<string, Row[]> = {
  insurance_policies: [],
  insurance_claims: [],
  behavioral_traces: [],
  payment_events: [],
  agents: [],
};

function matchRow(row: Row, pred: any): boolean {
  if (!pred) return true;
  switch (pred.op) {
    case 'eq': return row[pred.col] === pred.val;
    case 'in': return pred.arr.includes(row[pred.col]);
    case 'and': return pred.preds.every((p: any) => matchRow(row, p));
    case 'or': return pred.preds.some((p: any) => matchRow(row, p));
    default: return true;
  }
}

let idSeq = 0;
const genId = () => `id-${++idSeq}`;

class SelectQuery {
  private table = '';
  private pred: any = null;
  private _limit?: number;
  constructor(private proj?: any) {}
  from(t: any) { this.table = t.__table; return this; }
  where(p: any) { this.pred = p; return this; }
  orderBy() { return this; }
  offset() { return this; }
  limit(n: number) { this._limit = n; return this; }
  then(resolve: (v: Row[]) => any, reject: (e: unknown) => any) {
    try {
      const filtered = (store[this.table] ?? []).filter((r) => matchRow(r, this.pred));
      // Aggregate special-case: the encumbrance SUM query (#11).
      if (this.proj?.pledged?.__sql) {
        const pledged = filtered.reduce(
          (s, r) => s + (Number(r.coverageSats || 0) - Number(r.netExposureSats || 0)),
          0,
        );
        return resolve([{ pledged }]);
      }
      let rows = filtered;
      if (this._limit != null) rows = rows.slice(0, this._limit);
      if (this.proj) {
        return resolve(rows.map((r) => {
          const o: Row = {};
          for (const k of Object.keys(this.proj)) o[k] = r[this.proj[k]];
          return o;
        }));
      }
      return resolve(rows.map((r) => ({ ...r })));
    } catch (e) {
      return reject(e);
    }
  }
}

class InsertQuery {
  private table: string;
  private value: Row = {};
  constructor(t: any) { this.table = t.__table; }
  values(v: Row) {
    this.value = { ...v };
    if (this.value.id == null) this.value.id = genId();
    (store[this.table] ??= []).push(this.value);
    return this;
  }
  returning(proj: Row) {
    const o: Row = {};
    for (const k of Object.keys(proj)) o[k] = this.value[proj[k]];
    return Promise.resolve([o]);
  }
}

class UpdateQuery {
  private table: string;
  private value: Row = {};
  constructor(t: any) { this.table = t.__table; }
  set(v: Row) { this.value = v; return this; }
  where(p: any) {
    const matched: Row[] = [];
    for (const r of store[this.table] ?? []) {
      if (matchRow(r, p)) {
        Object.assign(r, this.value);
        matched.push(r);
      }
    }
    return new UpdateResult(matched);
  }
}

// Supports the atomic `UPDATE ... WHERE ... RETURNING` gate pattern (credit-service's
// confirmDeposit / insurance-service's confirmPremiumPayment): awaiting the where() result
// directly resolves to `undefined` like the old mock, but `.returning(proj)` projects the rows
// the WHERE clause actually matched — that row count IS the race-winner signal.
class UpdateResult implements PromiseLike<undefined> {
  constructor(private matched: Row[]) {}
  returning(proj: Row) {
    return Promise.resolve(this.matched.map((r) => {
      const o: Row = {};
      for (const k of Object.keys(proj)) o[k] = r[proj[k]];
      return o;
    }));
  }
  then(resolve: (v: undefined) => any, reject: (e: unknown) => any) {
    return Promise.resolve(undefined).then(resolve, reject);
  }
}

const db = {
  select: (proj?: any) => new SelectQuery(proj),
  insert: (t: any) => new InsertQuery(t),
  update: (t: any) => new UpdateQuery(t),
};

// ── Mocked schema tokens (column name === field name) ──

const table = (name: string, cols: string[]) => {
  const t: Row = { __table: name };
  for (const c of cols) t[c] = c;
  return t;
};

const insurancePolicies = table('insurance_policies', [
  'id', 'agentId', 'policyholderId', 'policyholderType', 'coverageSats', 'premiumSats',
  'netExposureSats', 'riskTier', 'reliabilityScore', 'annualFailureProbBps', 'premiumRateBps',
  'coveredEvents', 'quoteSnapshot', 'status', 'termStart', 'termEnd', 'createdAt',
]);
const insuranceClaims = table('insurance_claims', [
  'id', 'policyId', 'agentId', 'claimantId', 'claimantType', 'claimType', 'description',
  'claimedAmountSats', 'evidenceEventIds', 'provenanceVerified', 'status', 'adjudicationNotes',
  'payoutSats', 'updatedAt',
]);
const behavioralTraces = table('behavioral_traces', [
  'id', 'agentPubkey', 'eventId', 'undeclaredToolCalls', 'undeclaredResources', 'fidelityRatio',
]);
const paymentEvents = table('payment_events', [
  'id', 'status', 'amountSats', 'metadata', 'paymentHash', 'bolt11', 'purpose',
  'webhookReceivedAt', 'updatedAt', 'createdAt',
]);
const agents = table('agents', ['id', 'pubkey']);

mock.module('@percival/vouch-db', () => ({
  db, insurancePolicies, insuranceClaims, behavioralTraces, paymentEvents, agents,
}));

mock.module('drizzle-orm', () => ({
  eq: (col: string, val: any) => ({ op: 'eq', col, val }),
  inArray: (col: string, arr: any[]) => ({ op: 'in', col, arr }),
  and: (...preds: any[]) => ({ op: 'and', preds }),
  or: (...preds: any[]) => ({ op: 'or', preds }),
  sql: (..._a: any[]) => ({ __sql: true }),
}));

// Heavy trust/staking/fidelity deps are mocked so the pure underwriting engine runs for real.
const mockCalculateAgentTrust = mock(async (_id: string) => ({
  composite: 820,
  dimensions: { verification: 700, tenure: 500, performance: 800, backing: 200, community: 600, behavioralFidelity: 880 },
}));
const mockComputeBehavioralFidelity = mock(async (_pk: string) => ({
  score: 880, confidence: 0.85, evidenceCount: 120, avgFidelityRatio: 0.88,
}));
const mockGetPoolByAgent = mock(async (_id: string) => ({ totalStakedSats: 2_000_000 }));

// Alby Hub (Lightning) is mocked so premium invoice create/confirm run without real network
// I/O. lookupInvoice defaults to "settled" — individual tests override with
// mockImplementationOnce to exercise the unpaid/underpaid paths.
let invoiceSeq = 0;
const mockCreateInvoice = mock(async (amountSats: number, _memo: string) => {
  invoiceSeq += 1;
  return { paymentHash: `hash-${invoiceSeq}`, paymentRequest: `lnbc-${amountSats}-${invoiceSeq}` };
});
const mockLookupInvoice = mock(async (_paymentHash: string) => ({ settled: true, amountSats: 999_999_999 }));

mock.module('./trust-service', () => ({ calculateAgentTrust: mockCalculateAgentTrust }));
mock.module('./behavioral-trace-service', () => ({ computeBehavioralFidelity: mockComputeBehavioralFidelity }));
mock.module('./staking-service', () => ({ getPoolByAgent: mockGetPoolByAgent }));
mock.module('./albyhub-service', () => ({ createInvoice: mockCreateInvoice, lookupInvoice: mockLookupInvoice }));

const svc = await import('./insurance-service');

const ULID = '01HVAGENT0000000000000000';
const PUBKEY = 'b'.repeat(64);

function reset() {
  store.insurance_policies = [];
  store.insurance_claims = [];
  store.payment_events = [];
  store.behavioral_traces = [{
    id: 't1', agentPubkey: PUBKEY, eventId: 'evt-scope-1',
    undeclaredToolCalls: 2, undeclaredResources: 0, fidelityRatio: 0.4,
  }];
  store.agents = [{ id: ULID, pubkey: PUBKEY }];
  mockCalculateAgentTrust.mockClear();
  mockComputeBehavioralFidelity.mockClear();
  mockCreateInvoice.mockClear();
  mockLookupInvoice.mockClear();
  mockLookupInvoice.mockImplementation(async (_paymentHash: string) => ({ settled: true, amountSats: 999_999_999 }));
}

/** Bind a quoted policy held by ULID, covering scope_violation. */
async function bindQuotedPolicy() {
  const bind = await svc.bindPolicy({
    agentId: ULID, coverageSats: 1_000_000, termDays: 30,
    policyholderId: ULID, policyholderType: 'agent', coveredEvents: ['scope_violation'],
  });
  if (!bind.ok) throw new Error('bind failed');
  return bind;
}

describe('insurance pipeline (#3 id/pubkey, #4 premium gating)', () => {
  beforeEach(reset);

  test('quote resolves a pubkey to the canonical ULID and threads the right identifiers', async () => {
    const quote = await svc.quotePolicyForAgent({ agentId: PUBKEY, coverageSats: 1_000_000, termDays: 30 });
    expect(quote).not.toBeNull();
    expect(quote!.agentId).toBe(ULID); // canonical form persisted downstream
    expect(quote!.decision).toBe('quoted');
    // The core of #3: fidelity keyed by PUBKEY, trust keyed by ULID.
    expect(mockComputeBehavioralFidelity).toHaveBeenCalledWith(PUBKEY);
    expect(mockCalculateAgentTrust).toHaveBeenCalledWith(ULID);
  });

  test('bind → activate → claim → adjudicate verifies against the seeded trace', async () => {
    const bind = await svc.bindPolicy({
      agentId: ULID, coverageSats: 1_000_000, termDays: 30,
      policyholderId: ULID, policyholderType: 'agent', coveredEvents: ['scope_violation'],
    });
    expect(bind.ok).toBe(true);
    if (!bind.ok) throw new Error('bind failed');
    expect(bind.status).toBe('quoted'); // #4: not active on bind

    const policy = await svc.getPolicy(bind.policyId);
    expect(policy!.agentId).toBe(ULID); // canonical ULID stored, not a raw pubkey
    expect(policy!.status).toBe('quoted');

    // Claims are blocked while the policy is merely quoted (no free coverage).
    const early = await svc.fileClaim({
      policyId: bind.policyId, claimantId: ULID, claimantType: 'agent',
      claimType: 'scope_violation', claimedAmountSats: 500_000, evidenceEventIds: ['evt-scope-1'],
    });
    expect(early).toEqual({ ok: false, reason: 'policy_not_active' });

    // Activation fails closed until a settled premium exists.
    expect(await svc.activatePolicy(bind.policyId)).toEqual({ ok: false, reason: 'premium_not_settled' });

    // Settle the premium, then activate.
    store.payment_events!.push({
      id: 'pe1', status: 'paid', amountSats: policy!.premiumSats,
      metadata: { type: 'insurance_premium', policyId: bind.policyId },
    });
    expect(await svc.activatePolicy(bind.policyId)).toEqual({ ok: true, status: 'active' });

    // File and adjudicate against the seeded scope-violation trace.
    const claim = await svc.fileClaim({
      policyId: bind.policyId, claimantId: ULID, claimantType: 'agent',
      claimType: 'scope_violation', claimedAmountSats: 500_000, evidenceEventIds: ['evt-scope-1'],
    });
    expect(claim.ok).toBe(true);
    if (!claim.ok) throw new Error('file failed');

    const adj = await svc.adjudicateClaim(claim.claimId);
    expect(adj.ok).toBe(true);
    if (!adj.ok) throw new Error('adjudicate failed');
    expect(adj.status).toBe('approved');       // would be 'denied' before the #3 fix
    expect(adj.provenanceVerified).toBe(true);
    expect(adj.payoutSats).toBe(500_000);
  });

  test('adjudication denies when the cited trace does not evidence the covered failure', async () => {
    // Trace with no undeclared calls does not satisfy the scope_violation predicate.
    store.behavioral_traces = [{
      id: 't2', agentPubkey: PUBKEY, eventId: 'evt-clean', undeclaredToolCalls: 0,
      undeclaredResources: 0, fidelityRatio: 1,
    }];
    const bind = await svc.bindPolicy({
      agentId: ULID, coverageSats: 1_000_000, termDays: 30,
      policyholderId: ULID, policyholderType: 'agent', coveredEvents: ['scope_violation'],
    });
    if (!bind.ok) throw new Error('bind failed');
    store.payment_events!.push({
      id: 'pe2', status: 'paid', amountSats: 10_000_000,
      metadata: { type: 'insurance_premium', policyId: bind.policyId },
    });
    await svc.activatePolicy(bind.policyId);
    const claim = await svc.fileClaim({
      policyId: bind.policyId, claimantId: ULID, claimantType: 'agent',
      claimType: 'scope_violation', claimedAmountSats: 100, evidenceEventIds: ['evt-clean'],
    });
    if (!claim.ok) throw new Error('file failed');
    const adj = await svc.adjudicateClaim(claim.claimId);
    if (!adj.ok) throw new Error('adjudicate failed');
    expect(adj.status).toBe('denied');
    expect(adj.payoutSats).toBe(0);
  });
});

describe('premium collection (createPremiumInvoice / confirmPremiumPayment)', () => {
  beforeEach(reset);

  test('quoted policy -> premium invoice created -> settlement writes the paymentEvents row activatePolicy expects -> activate succeeds', async () => {
    const bind = await bindQuotedPolicy();
    const policy = await svc.getPolicy(bind.policyId);

    const invoiced = await svc.createPremiumInvoice(bind.policyId);
    expect(invoiced.ok).toBe(true);
    if (!invoiced.ok) throw new Error('invoice failed');
    expect(invoiced.invoice.amountSats).toBe(policy!.premiumSats);
    expect(invoiced.invoice.paymentHash).toBeTruthy();
    expect(mockCreateInvoice).toHaveBeenCalledTimes(1);
    expect(mockCreateInvoice).toHaveBeenCalledWith(policy!.premiumSats, expect.stringContaining(bind.policyId));

    // Not activatable until the invoice is actually settled.
    expect(await svc.activatePolicy(bind.policyId)).toEqual({ ok: false, reason: 'premium_not_settled' });

    const confirmed = await svc.confirmPremiumPayment(bind.policyId);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) throw new Error('confirm failed');
    expect(confirmed.settlement).toEqual({ policyId: bind.policyId, status: 'paid', amountSats: policy!.premiumSats });

    // Exactly the shape activatePolicy queries for: a 'paid' paymentEvents row tagged
    // { type: 'insurance_premium', policyId }.
    const row = store.payment_events!.find((p) => p.paymentHash === invoiced.invoice.paymentHash);
    expect(row).toMatchObject({
      status: 'paid',
      amountSats: policy!.premiumSats,
      metadata: { type: 'insurance_premium', policyId: bind.policyId },
    });

    expect(await svc.activatePolicy(bind.policyId)).toEqual({ ok: true, status: 'active' });
  });

  test('createPremiumInvoice is idempotent — a second call while pending reuses the same invoice instead of double-charging', async () => {
    const bind = await bindQuotedPolicy();

    const first = await svc.createPremiumInvoice(bind.policyId);
    const second = await svc.createPremiumInvoice(bind.policyId);
    if (!first.ok || !second.ok) throw new Error('invoice failed');

    expect(second.invoice.paymentHash).toBe(first.invoice.paymentHash);
    expect(mockCreateInvoice).toHaveBeenCalledTimes(1); // no duplicate Lightning invoice minted
    expect(store.payment_events!.filter((p) => (p.metadata as any)?.policyId === bind.policyId)).toHaveLength(1);
  });

  test('confirmPremiumPayment fails closed when the invoice is not yet settled — no activation, no charge recorded as paid', async () => {
    const bind = await bindQuotedPolicy();
    await svc.createPremiumInvoice(bind.policyId);

    mockLookupInvoice.mockImplementationOnce(async () => ({ settled: false, amountSats: 0 }));
    const confirmed = await svc.confirmPremiumPayment(bind.policyId);
    expect(confirmed).toEqual({ ok: false, reason: 'invoice_not_paid' });

    expect(await svc.activatePolicy(bind.policyId)).toEqual({ ok: false, reason: 'premium_not_settled' });
    expect(store.payment_events!.every((p) => p.status !== 'paid')).toBe(true);
  });

  test('a settled premium cannot be confirmed twice — second confirm does not re-settle or re-charge', async () => {
    const bind = await bindQuotedPolicy();
    await svc.createPremiumInvoice(bind.policyId);

    const first = await svc.confirmPremiumPayment(bind.policyId);
    expect(first.ok).toBe(true);

    const second = await svc.confirmPremiumPayment(bind.policyId);
    expect(second).toEqual({ ok: false, reason: 'no_pending_premium_invoice' });

    // Still exactly one paymentEvents row for this policy, and it's 'paid' — no duplicate charge.
    const rows = store.payment_events!.filter((p) => (p.metadata as any)?.policyId === bind.policyId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('paid');
    expect(mockCreateInvoice).toHaveBeenCalledTimes(1);
  });

  test('createPremiumInvoice refuses to re-invoice a policy whose premium already settled', async () => {
    const bind = await bindQuotedPolicy();
    await svc.createPremiumInvoice(bind.policyId);
    await svc.confirmPremiumPayment(bind.policyId);

    const reinvoice = await svc.createPremiumInvoice(bind.policyId);
    expect(reinvoice).toEqual({ ok: false, reason: 'premium_already_settled' });
    expect(mockCreateInvoice).toHaveBeenCalledTimes(1); // still just the original invoice
  });

  test('confirmPremiumPayment rejects an underpaid invoice', async () => {
    const bind = await bindQuotedPolicy();
    const invoiced = await svc.createPremiumInvoice(bind.policyId);
    if (!invoiced.ok) throw new Error('invoice failed');

    mockLookupInvoice.mockImplementationOnce(async () => ({
      settled: true,
      amountSats: invoiced.invoice.amountSats - 1,
    }));
    const confirmed = await svc.confirmPremiumPayment(bind.policyId);
    expect(confirmed).toEqual({ ok: false, reason: 'invoice_amount_mismatch' });
    expect(await svc.activatePolicy(bind.policyId)).toEqual({ ok: false, reason: 'premium_not_settled' });
  });

  test('createPremiumInvoice on an unknown policy fails closed', async () => {
    expect(await svc.createPremiumInvoice('nope')).toEqual({ ok: false, reason: 'policy_not_found' });
  });

  test('confirmPremiumPayment with no invoice ever created fails closed', async () => {
    const bind = await bindQuotedPolicy();
    expect(await svc.confirmPremiumPayment(bind.policyId)).toEqual({ ok: false, reason: 'no_pending_premium_invoice' });
  });
});

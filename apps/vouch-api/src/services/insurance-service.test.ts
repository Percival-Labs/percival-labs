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
    for (const r of store[this.table] ?? []) if (matchRow(r, p)) Object.assign(r, this.value);
    return Promise.resolve();
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
const paymentEvents = table('payment_events', ['id', 'status', 'amountSats', 'metadata']);
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

mock.module('./trust-service', () => ({ calculateAgentTrust: mockCalculateAgentTrust }));
mock.module('./behavioral-trace-service', () => ({ computeBehavioralFidelity: mockComputeBehavioralFidelity }));
mock.module('./staking-service', () => ({ getPoolByAgent: mockGetPoolByAgent }));

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

// Authorization tests for the insurance routes (#4).
// Verifies caller-binding on bind/claim and admin-gating on adjudicate/activate.

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';

process.env.INSURANCE_ENABLED = 'true';
process.env.INSURANCE_ADMIN_ID = 'admin-agent';

const mockBind = mock(async () => ({ ok: true as const, policyId: 'p1', status: 'quoted' as const, quote: {} }));
const mockFileClaim = mock(async () => ({ ok: true as const, claimId: 'c1' }));
const mockAdjudicate = mock(async () => ({ ok: true as const, status: 'approved' as const, provenanceVerified: true, payoutSats: 1, notes: '' }));
const mockActivate = mock(async () => ({ ok: true as const, status: 'active' as const }));
const mockCreatePremiumInvoice = mock(async () => ({
  ok: true as const,
  invoice: { policyId: 'p1', paymentHash: 'hash1', bolt11: 'lnbc1', amountSats: 500 },
}));
const mockConfirmPremiumPayment = mock(async () => ({
  ok: true as const,
  settlement: { policyId: 'p1', status: 'paid' as const, amountSats: 500 },
}));
const mockSettleClaim = mock(async () => ({
  ok: true as const,
  settlement: { claimId: 'c1', payoutSats: 1000, paymentStatus: 'pending' as const },
}));
const mockGetReserve = mock(async () => 42_000);

// getPolicy is used by the premium-invoice/confirm routes for caller-binding, so it needs a
// realistic per-test return — default to a policy held by 'me'.
const mockGetPolicy = mock(async (_id: string) => ({
  id: 'p1', policyholderId: 'me', policyholderType: 'agent' as const,
}));

mock.module('../services/insurance-service', () => ({
  quotePolicyForAgent: mock(async () => null),
  bindPolicy: mockBind,
  activatePolicy: mockActivate,
  getPolicy: mockGetPolicy,
  fileClaim: mockFileClaim,
  getClaim: mock(async () => null),
  adjudicateClaim: mockAdjudicate,
  createPremiumInvoice: mockCreatePremiumInvoice,
  confirmPremiumPayment: mockConfirmPremiumPayment,
  settleClaim: mockSettleClaim,
  getInsuranceReserveSats: mockGetReserve,
  COVERED_EVENT_TYPES: ['scope_violation'],
}));

const { default: insuranceRoutes } = await import('./insurance');

type Env = { Variables: { verifiedAgentId: string } };

function appAs(callerId?: string) {
  const app = new Hono<Env>();
  app.use('*', async (c, next) => {
    if (callerId) c.set('verifiedAgentId', callerId);
    await next();
  });
  app.route('/insurance', insuranceRoutes);
  return app;
}

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const bindBody = (policyholderId: string) => ({
  agentId: 'agent-x', coverageSats: 1000, termDays: 30,
  policyholderId, policyholderType: 'agent', coveredEvents: ['scope_violation'],
});

const claimBody = (claimantId: string) => ({
  policyId: 'p1', claimantId, claimantType: 'agent',
  claimType: 'scope_violation', claimedAmountSats: 100, evidenceEventIds: ['e1'],
});

describe('insurance route authorization (#4)', () => {
  beforeEach(() => {
    mockBind.mockClear();
    mockFileClaim.mockClear();
    mockAdjudicate.mockClear();
    mockActivate.mockClear();
    mockCreatePremiumInvoice.mockClear();
    mockConfirmPremiumPayment.mockClear();
    mockGetPolicy.mockClear();
  });

  test('bind rejects when caller is not the policyholder', async () => {
    const res = await appAs('attacker').request('/insurance/policies', json(bindBody('victim')));
    expect(res.status).toBe(403);
    expect(mockBind).not.toHaveBeenCalled();
  });

  test('bind succeeds when caller is the policyholder', async () => {
    const res = await appAs('me').request('/insurance/policies', json(bindBody('me')));
    expect(res.status).toBe(201);
    expect(mockBind).toHaveBeenCalledTimes(1);
  });

  test('claim rejects when caller is not the claimant', async () => {
    const res = await appAs('attacker').request('/insurance/claims', json(claimBody('victim')));
    expect(res.status).toBe(403);
    expect(mockFileClaim).not.toHaveBeenCalled();
  });

  test('claim succeeds when caller is the claimant', async () => {
    const res = await appAs('me').request('/insurance/claims', json(claimBody('me')));
    expect(res.status).toBe(201);
    expect(mockFileClaim).toHaveBeenCalledTimes(1);
  });

  test('adjudicate is denied to a non-admin caller', async () => {
    const res = await appAs('claimant').request('/insurance/claims/c1/adjudicate', { method: 'POST' });
    expect(res.status).toBe(403);
    expect(mockAdjudicate).not.toHaveBeenCalled();
  });

  test('adjudicate is allowed for the admin caller', async () => {
    const res = await appAs('admin-agent').request('/insurance/claims/c1/adjudicate', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(mockAdjudicate).toHaveBeenCalledTimes(1);
  });

  test('activate is denied to a non-admin caller', async () => {
    const res = await appAs('me').request('/insurance/policies/p1/activate', { method: 'POST' });
    expect(res.status).toBe(403);
    expect(mockActivate).not.toHaveBeenCalled();
  });

  test('premium-invoice rejects when caller is not the policyholder', async () => {
    const res = await appAs('attacker').request('/insurance/policies/p1/premium-invoice', { method: 'POST' });
    expect(res.status).toBe(403);
    expect(mockCreatePremiumInvoice).not.toHaveBeenCalled();
  });

  test('premium-invoice succeeds when caller is the policyholder', async () => {
    const res = await appAs('me').request('/insurance/policies/p1/premium-invoice', { method: 'POST' });
    expect(res.status).toBe(201);
    expect(mockCreatePremiumInvoice).toHaveBeenCalledTimes(1);
    expect(mockCreatePremiumInvoice).toHaveBeenCalledWith('p1');
  });

  test('premium-invoice 404s when the policy does not exist', async () => {
    mockGetPolicy.mockImplementationOnce(async () => null as any);
    const res = await appAs('me').request('/insurance/policies/missing/premium-invoice', { method: 'POST' });
    expect(res.status).toBe(404);
    expect(mockCreatePremiumInvoice).not.toHaveBeenCalled();
  });

  test('premium-invoice/confirm rejects when caller is not the policyholder', async () => {
    const res = await appAs('attacker').request('/insurance/policies/p1/premium-invoice/confirm', { method: 'POST' });
    expect(res.status).toBe(403);
    expect(mockConfirmPremiumPayment).not.toHaveBeenCalled();
  });

  test('premium-invoice/confirm succeeds when caller is the policyholder', async () => {
    const res = await appAs('me').request('/insurance/policies/p1/premium-invoice/confirm', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(mockConfirmPremiumPayment).toHaveBeenCalledTimes(1);
    expect(mockConfirmPremiumPayment).toHaveBeenCalledWith('p1');
  });

  test('settle rejects non-admin callers — a claimant must never trigger their own payout', async () => {
    const res = await appAs('me').request('/insurance/claims/c1/settle', json({}));
    expect(res.status).toBe(403);
    expect(mockSettleClaim).not.toHaveBeenCalled();
  });

  test('settle succeeds for the admin and passes the optional wallet through', async () => {
    const res = await appAs('admin-agent').request('/insurance/claims/c1/settle', json({ nwcConnectionId: 'nwc-9' }));
    expect(res.status).toBe(200);
    expect(mockSettleClaim).toHaveBeenCalledWith('c1', { nwcConnectionId: 'nwc-9' });
  });

  test('reserve telemetry is admin-only', async () => {
    expect((await appAs('me').request('/insurance/reserve')).status).toBe(403);
    const ok = await appAs('admin-agent').request('/insurance/reserve');
    expect(ok.status).toBe(200);
    expect(mockGetReserve).toHaveBeenCalledTimes(1);
  });
});

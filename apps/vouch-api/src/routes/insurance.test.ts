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

mock.module('../services/insurance-service', () => ({
  quotePolicyForAgent: mock(async () => null),
  bindPolicy: mockBind,
  activatePolicy: mockActivate,
  getPolicy: mock(async () => null),
  fileClaim: mockFileClaim,
  getClaim: mock(async () => null),
  adjudicateClaim: mockAdjudicate,
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
});

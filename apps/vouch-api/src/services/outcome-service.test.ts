// Tests for the outcome counterparty eligibility gate (#8a anti-gaming).
// A counterparty must be a registered agent meeting the minimum score before an outcome
// (and its trust credit) can be reported.

import { describe, test, expect, mock, beforeEach } from 'bun:test';

process.env.OUTCOME_MIN_COUNTERPARTY_SCORE = '100';

// Configurable result for the outer agents lookup in assertEligibleCounterparty.
let agentLookup: Array<{ trustScore: number | null }> = [];
const outerLimit = mock(() => Promise.resolve(agentLookup));
const outerWhere = mock(() => ({ limit: outerLimit }));
const outerFrom = mock(() => ({ where: outerWhere }));

// A chainable that resolves to [] for every in-transaction select shape.
class Chain {
  then(res: (v: unknown[]) => unknown) { return res([]); }
  from() { return this; }
  where() { return this; }
  orderBy() { return this; }
  limit() { return this; }
  for() { return this; }
}

const tx = {
  select: () => new Chain(),
  insert: () => ({ values: () => ({ returning: () => Promise.resolve([{ id: 'o1' }]) }) }),
  update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
};

const db = {
  select: () => ({ from: outerFrom }),
  transaction: async (cb: (t: typeof tx) => unknown) => cb(tx),
};

mock.module('@percival/vouch-db', () => ({
  db,
  outcomes: { id: 'id', agentPubkey: 'agentPubkey', counterpartyPubkey: 'counterpartyPubkey', role: 'role', taskRef: 'taskRef', matchedOutcomeId: 'matchedOutcomeId', createdAt: 'createdAt' },
  agents: { pubkey: 'pubkey', trustScore: 'trustScore' },
}));

mock.module('drizzle-orm', () => ({
  eq: () => 'p', and: () => 'p', or: () => 'p', sql: () => 'p',
}));

const { reportOutcome } = await import('./outcome-service');

const base = {
  agentPubkey: 'a'.repeat(64),
  counterpartyPubkey: 'c'.repeat(64),
  role: 'performer' as const,
  taskType: 'code_review',
  taskRef: 'task-1',
  success: true,
};

describe('reportOutcome counterparty gate (#8a)', () => {
  beforeEach(() => { agentLookup = []; });

  test('rejects an unregistered counterparty', async () => {
    agentLookup = [];
    await expect(reportOutcome(base)).rejects.toThrow('registered agent');
  });

  test('rejects a registered counterparty below the minimum score', async () => {
    agentLookup = [{ trustScore: 50 }];
    await expect(reportOutcome(base)).rejects.toThrow('below minimum');
  });

  test('still rejects self as counterparty', async () => {
    await expect(reportOutcome({ ...base, counterpartyPubkey: base.agentPubkey })).rejects.toThrow('yourself');
  });

  test('allows a registered counterparty meeting the score bar', async () => {
    agentLookup = [{ trustScore: 150 }];
    const result = await reportOutcome(base);
    expect(result.creditAwarded).toBe('partial');
  });
});

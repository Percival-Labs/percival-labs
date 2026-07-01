// Tests for the canonical subject resolver (root-cause fix for the id/pubkey identifier soup).

import { describe, test, expect, mock, beforeEach } from 'bun:test';

let mockRows: Array<{ id: string; pubkey: string | null }> = [];
const limit = mock(() => Promise.resolve(mockRows));
const where = mock(() => ({ limit }));
const from = mock(() => ({ where }));
const select = mock(() => ({ from }));

mock.module('@percival/vouch-db', () => ({
  db: { select },
  agents: { id: 'id', pubkey: 'pubkey' },
}));

mock.module('drizzle-orm', () => ({
  eq: (_c: unknown, _v: unknown) => 'eq',
  or: (..._p: unknown[]) => 'or',
}));

const { resolveSubject } = await import('./subject');

const ULID = '01HVAGENT0000000000000000';
const PUBKEY = 'a'.repeat(64);

describe('resolveSubject', () => {
  beforeEach(() => {
    mockRows = [];
  });

  test('returns null for empty/blank input without querying', async () => {
    expect(await resolveSubject('')).toBeNull();
    expect(await resolveSubject('   ')).toBeNull();
  });

  test('resolves both canonical forms from a pubkey in one query', async () => {
    mockRows = [{ id: ULID, pubkey: PUBKEY }];
    expect(await resolveSubject(PUBKEY)).toEqual({ id: ULID, pubkey: PUBKEY });
  });

  test('resolves both canonical forms from a ULID in one query', async () => {
    mockRows = [{ id: ULID, pubkey: PUBKEY }];
    expect(await resolveSubject(ULID)).toEqual({ id: ULID, pubkey: PUBKEY });
  });

  test('returns null when no agent matches', async () => {
    mockRows = [];
    expect(await resolveSubject('01HNOPE000000000000000000')).toBeNull();
  });

  test('preserves a null pubkey for legacy agents', async () => {
    mockRows = [{ id: ULID, pubkey: null }];
    expect(await resolveSubject(ULID)).toEqual({ id: ULID, pubkey: null });
  });
});

// MCP-T end-to-end: publish a trace and read it back.
//
// This is the test whose ABSENCE let "zero traces ever land" ship (FABLE C5).
// It exercises the real producer envelope (vouch-sdk `buildTrustPublishEnvelope`)
// against the real adapter + behavioral-trace-service + Ed25519 signing, with only
// the Postgres layer faked. It also pins the caller-binding invariants (C6, #9).

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { buildTrustPublishEnvelope } from '../../../../packages/vouch-sdk/src/mcp-t-client';

// Let connection.ts import without a live Postgres (the Pool is lazy — never queried).
process.env.DATABASE_URL ||= 'postgres://fake:fake@localhost:5432/fake';

// ── Fake Postgres (in-memory) ────────────────────────────────────────────────

// Spread the REAL vouch-db (schema table objects, sibling exports) and override
// only `db`, so identity comparisons use the real table references the adapter sees.
const real = await import('@percival/vouch-db');
const { behavioralTraces } = real;

const store = { traces: [] as Array<Record<string, unknown>> };

function thenable(getRows: () => unknown[]) {
  const obj: Record<string, unknown> = {
    where: () => obj,
    orderBy: () => obj,
    limit: () => Promise.resolve(getRows()),
    then: (res: (v: unknown[]) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(getRows()).then(res, rej),
  };
  return obj;
}

const db = {
  select: (sel?: Record<string, unknown>) => ({
    from: (table: unknown) => {
      const isCount = !!sel && 'count' in sel;
      const rowsFor = () => (table === behavioralTraces ? store.traces : []);
      return thenable(() => (isCount ? [{ count: rowsFor().length }] : rowsFor().slice()));
    },
  }),
  insert: (table: unknown) => ({
    values: (v: Record<string, unknown>) => {
      const row = { ...v, id: (v.traceId as string) ?? `id-${store.traces.length}`, createdAt: new Date() };
      if (table === behavioralTraces) store.traces.push(row);
      return { returning: () => Promise.resolve([{ id: row.id }]) };
    },
  }),
};

mock.module('@percival/vouch-db', () => ({ ...real, db }));

// Import AFTER mocks are registered.
const { handleMcpTRequest } = await import('./mcp-t-adapter');
const { mcptVerify } = await import('../lib/mcp-t-signing');

// ── Fixtures ──────────────────────────────────────────────────────────────

const CALLER = 'c'.repeat(64); // authenticated reporter (NIP-98 pubkey)
const SUBJECT = 's'.repeat(64); // agent being observed

function structuredPayload(traceId: string) {
  return {
    trace_id: traceId,
    tool_calls: [
      { tool_name: 'read_file', timestamp: new Date().toISOString(), duration_ms: 5, declared: true },
      { tool_name: 'write_file', timestamp: new Date().toISOString(), duration_ms: 9, declared: false },
    ],
    resources_accessed: [],
    duration_ms: 42,
  };
}

beforeEach(() => {
  store.traces = [];
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('MCP-T e2e — producer envelope round-trips to the server', () => {
  test('the SDK builder emits a JSON-RPC trust/publish envelope (not {events:[]})', () => {
    const env = buildTrustPublishEnvelope(SUBJECT, structuredPayload('t-shape'));
    expect(env.jsonrpc).toBe('2.0');
    expect(env.method).toBe('trust/publish');
    expect(env.params.event.event_type).toBe('behavior.trace');
    expect((env as unknown as { events?: unknown }).events).toBeUndefined();
    // issuer_id must NOT be set client-side — the server binds it.
    expect((env.params.event as unknown as Record<string, unknown>).issuer_id).toBeUndefined();
  });

  test('a published trace is accepted, signed, and reads back via trust/history', async () => {
    const env = buildTrustPublishEnvelope(SUBJECT, structuredPayload('t-1'));

    const pub = await handleMcpTRequest(env, CALLER);
    const result = pub.result as {
      accepted: boolean;
      fidelity_ratio: number;
      receipt: Record<string, unknown>;
    };
    expect(pub.error).toBeUndefined();
    expect(result.accepted).toBe(true);
    // 2 tool calls, 1 undeclared → fidelity (2-1)/2 = 0.5
    expect(result.fidelity_ratio).toBeCloseTo(0.5, 5);
    // Provider-signed receipt is present and independently verifiable.
    expect(result.receipt.issuer_id).toBe(CALLER);
    expect(mcptVerify(result.receipt)).toBe(true);

    const hist = await handleMcpTRequest(
      { jsonrpc: '2.0', id: 'h1', method: 'trust/history', params: { subject_id: SUBJECT } },
      CALLER,
    );
    const events = (hist.result as { events: Array<Record<string, unknown>> }).events;
    const trace = events.find((e) => (e.payload as Record<string, unknown>).trace_id === 't-1');
    expect(trace).toBeDefined();
    // issuer bound to the authenticated caller, NOT the subject.
    expect((trace!.payload as Record<string, unknown>).reported_by).toBe(CALLER);
  });
});

describe('MCP-T e2e — caller-binding invariants (C6)', () => {
  test('self-vouch is rejected (caller === subject)', async () => {
    const env = buildTrustPublishEnvelope(CALLER, structuredPayload('t-self'));
    const res = await handleMcpTRequest(env, CALLER);
    expect(res.result).toBeUndefined();
    expect(res.error?.message).toBe('SelfVouchingProhibited');
    expect(store.traces.length).toBe(0);
  });

  test('client-supplied issuer_id is ignored — bound to the caller (anti-poisoning)', async () => {
    const env = buildTrustPublishEnvelope(SUBJECT, structuredPayload('t-spoof'));
    // Attacker forges issuer_id to impersonate a trusted third party / the victim.
    (env.params.event as unknown as Record<string, unknown>).issuer_id = 'v'.repeat(64);

    const res = await handleMcpTRequest(env, CALLER);
    expect((res.result as { accepted: boolean }).accepted).toBe(true);
    // Stored issuer is the authenticated caller, not the forged value.
    expect(store.traces[0]!.issuerId).toBe(CALLER);
  });
});

describe('MCP-T e2e — dropped events are not acknowledged (#9)', () => {
  test('unsupported event types return accepted:false / unsupported', async () => {
    const res = await handleMcpTRequest(
      {
        jsonrpc: '2.0',
        id: 'u1',
        method: 'trust/publish',
        params: { event: { event_id: 'e-u', event_type: 'economic.stake_deposited', subject_id: SUBJECT } },
      },
      CALLER,
    );
    const result = res.result as { accepted: boolean; processing_status: string };
    expect(result.accepted).toBe(false);
    expect(result.processing_status).toBe('unsupported');
  });
});

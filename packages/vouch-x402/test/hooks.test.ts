import { describe, test, expect, mock, afterEach } from 'bun:test';
import { createVouchX402 } from '../src/hooks';

const mockScoreResponse = {
  agentId: '01HWXYZ123456789ABCDEFGHIJ',
  vouchScore: 650,
  scoreBreakdown: {
    verification: 200,
    tenure: 80,
    performance: 180,
    backing: 120,
    community: 70,
  },
  backing: {
    totalStakedSats: 150_000,
    backerCount: 3,
    badge: 'community-backed',
  },
  tier: 'trusted',
  lastUpdated: '2026-02-28T00:00:00Z',
};

const lowScoreResponse = {
  ...mockScoreResponse,
  vouchScore: 100,
  scoreBreakdown: { ...mockScoreResponse.scoreBreakdown, performance: 20 },
  tier: 'unverified',
};

const highScoreResponse = {
  ...mockScoreResponse,
  vouchScore: 800,
  tier: 'trusted',
};

function mockFetch(response: object | null, status = 200) {
  globalThis.fetch = mock(() =>
    status === 404
      ? Promise.resolve(new Response('{"error":"NOT_FOUND"}', { status: 404 }))
      : Promise.resolve(new Response(JSON.stringify(response), { status }))
  ) as typeof fetch;
}

function mockFetchError() {
  globalThis.fetch = mock(() => Promise.reject(new Error('Network error'))) as typeof fetch;
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('beforeVerify', () => {
  test('allows agent with score above minimum', async () => {
    mockFetch(mockScoreResponse);

    const vouch = createVouchX402({ minScore: 300, cacheTtlMs: 0 });
    const result = await vouch.beforeVerify({
      paymentPayload: {
        payload: { authorization: { from: '0x1234567890abcdef1234567890abcdef12345678' } },
      },
    });

    expect(result).toBeUndefined(); // undefined = allow
  });

  test('rejects agent with score below minimum', async () => {
    mockFetch(lowScoreResponse);

    const vouch = createVouchX402({ minScore: 300, cacheTtlMs: 0 });
    const result = await vouch.beforeVerify({
      paymentPayload: {
        payload: { authorization: { from: '0x1234567890abcdef1234567890abcdef12345678' } },
      },
    });

    expect(result).toEqual({
      abort: true,
      reason: 'insufficient_trust_score',
      message: expect.stringContaining('Score 100 below minimum 300'),
    });
  });

  test('rejects when dimension threshold fails', async () => {
    mockFetch(mockScoreResponse);

    const vouch = createVouchX402({
      minScore: 200,
      minDimensions: { performance: 500 }, // mockScore has performance: 180
      cacheTtlMs: 0,
    });

    const result = await vouch.beforeVerify({
      paymentPayload: {
        payload: { authorization: { from: '0x1234567890abcdef1234567890abcdef12345678' } },
      },
    });

    expect(result).toEqual({
      abort: true,
      reason: 'insufficient_trust_score',
      message: expect.stringContaining("Dimension 'performance'"),
    });
  });

  test('applies deny fallback when API unreachable', async () => {
    mockFetchError();

    const vouch = createVouchX402({ fallback: 'deny', cacheTtlMs: 0 });
    const result = await vouch.beforeVerify({
      paymentPayload: {
        payload: { authorization: { from: '0x1234567890abcdef1234567890abcdef12345678' } },
      },
    });

    expect(result?.abort).toBe(true);
  });

  test('applies allow fallback when API unreachable', async () => {
    mockFetchError();

    const vouch = createVouchX402({ fallback: 'allow', cacheTtlMs: 0 });
    const result = await vouch.beforeVerify({
      paymentPayload: {
        payload: { authorization: { from: '0x1234567890abcdef1234567890abcdef12345678' } },
      },
    });

    expect(result).toBeUndefined(); // allow = proceed
  });

  test('emits trust check event via callback', async () => {
    mockFetch(mockScoreResponse);

    const events: unknown[] = [];
    const vouch = createVouchX402({
      minScore: 300,
      cacheTtlMs: 0,
      onTrustCheck: (e) => events.push(e),
    });

    await vouch.beforeVerify({
      paymentPayload: {
        payload: { authorization: { from: '0x1234567890abcdef1234567890abcdef12345678' } },
      },
    });

    expect(events).toHaveLength(1);
    expect((events[0] as { action: string }).action).toBe('allowed');
  });
});

describe('protectedRequest', () => {
  test('grants free access for high-trust agent', async () => {
    mockFetch(highScoreResponse);

    const vouch = createVouchX402({
      freeAccessMinScore: 700,
      cacheTtlMs: 0,
    });

    const result = await vouch.protectedRequest({
      request: {
        headers: { 'x-vouch-npub': 'a'.repeat(64) },
      },
    });

    expect(result).toEqual({ grantAccess: true });
  });

  test('does not grant free access for low-trust agent', async () => {
    mockFetch(lowScoreResponse);

    const vouch = createVouchX402({
      freeAccessMinScore: 700,
      cacheTtlMs: 0,
    });

    const result = await vouch.protectedRequest({
      request: {
        headers: { 'x-vouch-npub': 'a'.repeat(64) },
      },
    });

    expect(result).toBeUndefined(); // proceed to payment
  });

  test('skips when no identity header present', async () => {
    const vouch = createVouchX402({ freeAccessMinScore: 700, cacheTtlMs: 0 });

    const result = await vouch.protectedRequest({
      request: { headers: {} },
    });

    expect(result).toBeUndefined();
  });

  test('skips when freeAccessMinScore is not configured', async () => {
    const vouch = createVouchX402({ cacheTtlMs: 0 });

    const result = await vouch.protectedRequest({
      request: {
        headers: { 'x-vouch-npub': 'a'.repeat(64) },
      },
    });

    expect(result).toBeUndefined();
  });
});

describe('caching', () => {
  test('uses cached score on second lookup', async () => {
    mockFetch(mockScoreResponse);

    const vouch = createVouchX402({ minScore: 300, cacheTtlMs: 60_000 });
    const payload = {
      paymentPayload: {
        payload: { authorization: { from: '0x1234567890abcdef1234567890abcdef12345678' } },
      },
    };

    await vouch.beforeVerify(payload);
    await vouch.beforeVerify(payload);

    // Should only call fetch once — second call uses cache
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test('clearCache invalidates cached scores', async () => {
    mockFetch(mockScoreResponse);

    const vouch = createVouchX402({ minScore: 300, cacheTtlMs: 60_000 });
    const payload = {
      paymentPayload: {
        payload: { authorization: { from: '0x1234567890abcdef1234567890abcdef12345678' } },
      },
    };

    await vouch.beforeVerify(payload);
    vouch.clearCache();
    await vouch.beforeVerify(payload);

    // Should call fetch twice — cache was cleared
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

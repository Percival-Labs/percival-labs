import { describe, expect, test } from 'bun:test';
import { TrustContagionEngine } from '../src/trust-contagion';

describe('TrustContagionEngine.propagate (#9 fix — fail-open distinguishing)', () => {
  test('propagate() throws when the stake-graph fetch errors (network failure), instead of silently reporting zero impacts', async () => {
    const engine = new TrustContagionEngine({
      apiUrl: 'https://example.invalid',
      fetchFn: (() => {
        throw new Error('network down');
      }) as unknown as typeof fetch,
    });

    await expect(engine.propagate('slash-1', 'agent-1', 0.5)).rejects.toThrow(/Stake graph fetch failed/);
  });

  test('propagate() throws when the stake-graph endpoint returns a non-2xx, non-404 status', async () => {
    const engine = new TrustContagionEngine({
      apiUrl: 'https://example.invalid',
      fetchFn: (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch,
    });

    await expect(engine.propagate('slash-1', 'agent-1', 0.5)).rejects.toThrow(/HTTP 500/);
  });

  test('propagate() treats a 404 as a legitimate empty graph (no stakers) and completes successfully', async () => {
    let logCalled = false;
    const engine = new TrustContagionEngine({
      apiUrl: 'https://example.invalid',
      fetchFn: (async (url: string) => {
        if (typeof url === 'string' && url.includes('/v1/trust/contagion')) {
          logCalled = true;
          return new Response('{}', { status: 200 });
        }
        return new Response('{}', { status: 404 });
      }) as unknown as typeof fetch,
    });

    const event = await engine.propagate('slash-1', 'agent-1', 0.5);
    expect(event.impacts).toEqual([]);
    expect(event.totalLossSats).toBe(0);
    expect(logCalled).toBe(true);
  });

  test('propagate() completes normally when the graph legitimately has zero edges (200 + empty array)', async () => {
    const engine = new TrustContagionEngine({
      apiUrl: 'https://example.invalid',
      fetchFn: (async (url: string) => {
        if (typeof url === 'string' && url.includes('/v1/trust/graph/')) {
          return new Response(JSON.stringify({ data: { edges: [] } }), { status: 200 });
        }
        return new Response('{}', { status: 200 });
      }) as unknown as typeof fetch,
    });

    const event = await engine.propagate('slash-1', 'agent-1', 0.5);
    expect(event.impacts).toEqual([]);
  });
});

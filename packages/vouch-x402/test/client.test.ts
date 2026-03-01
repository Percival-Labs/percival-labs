import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { VouchScoreClient } from '../src/client';

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

describe('VouchScoreClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('getScoreByAgentId returns score on 200', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockScoreResponse), { status: 200 }))
    ) as typeof fetch;

    const client = new VouchScoreClient('https://test-api.example.com');
    const result = await client.getScoreByAgentId('01HWXYZ123456789ABCDEFGHIJ');

    expect(result).toEqual(mockScoreResponse);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test('getScoreByPubkey returns null on 404', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('{"error": "NOT_FOUND"}', { status: 404 }))
    ) as typeof fetch;

    const client = new VouchScoreClient('https://test-api.example.com');
    const result = await client.getScoreByPubkey('aabbccdd'.repeat(8));
    expect(result).toBeNull();
  });

  test('getScoreByEvmAddress calls correct endpoint', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockScoreResponse), { status: 200 }))
    ) as typeof fetch;

    const client = new VouchScoreClient('https://test-api.example.com');
    await client.getScoreByEvmAddress('0xAbCd1234567890abcdef1234567890AbCdEf1234');

    const callUrl = (globalThis.fetch as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(callUrl).toBe(
      'https://test-api.example.com/v1/public/wallets/0xabcd1234567890abcdef1234567890abcdef1234/vouch-score'
    );
  });

  test('throws on non-404 errors', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' }))
    ) as typeof fetch;

    const client = new VouchScoreClient('https://test-api.example.com');
    await expect(client.getScoreByAgentId('test')).rejects.toThrow('Vouch API error: 500');
  });
});

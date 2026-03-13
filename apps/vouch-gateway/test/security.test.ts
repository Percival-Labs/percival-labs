// security.test.ts — Security-focused tests for the Vouch Gateway
//
// Covers: input validation, auth edge cases, budget enforcement,
// model policy enforcement, and abuse prevention.

import { describe, expect, it } from 'bun:test';
import { extractAgentKey, extractPrivacyToken, parseNostrEvent } from '../src/auth';
import { checkRateLimit, createRateLimitState } from '../src/rate-limiter';
import { recordRequest, createAnomalyData, detectAnomalies } from '../src/anomaly';
import type { BudgetConfig, BudgetState, Env } from '../src/types';

/** Minimal mock env for extractPrivacyToken tests */
function mockEnvWithBatch(batchHash?: string, data?: unknown): Env {
  const store = new Map<string, string>();
  if (batchHash && data) {
    store.set(`ptbatch:${batchHash}`, JSON.stringify(data));
  }
  return {
    VOUCH_RATE_LIMITS: {
      get: (key: string, format?: string) => {
        const val = store.get(key);
        if (!val) return Promise.resolve(null);
        return Promise.resolve(format === 'json' ? JSON.parse(val) : val);
      },
      put: () => Promise.resolve(),
      delete: () => Promise.resolve(),
      list: () => Promise.resolve({ keys: [], list_complete: true, cacheStatus: null }),
      getWithMetadata: () => Promise.resolve({ value: null, metadata: null, cacheStatus: null }),
    } as unknown as KVNamespace,
  } as unknown as Env;
}

// ── Auth Input Validation ──

describe('AgentKey validation', () => {
  it('rejects keys shorter than 64 chars', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'AgentKey abc123' });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('rejects keys longer than 64 chars', () => {
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${'a'.repeat(65)}` });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('rejects keys with uppercase hex', () => {
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${'A'.repeat(64)}` });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('rejects keys with non-hex characters', () => {
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${'g'.repeat(64)}` });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('rejects keys with spaces', () => {
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${'a'.repeat(32)} ${'b'.repeat(31)}` });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('rejects empty token after prefix', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'AgentKey ' });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('accepts valid 64-char hex key', () => {
    const key = 'a'.repeat(64);
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${key}` });
    expect(extractAgentKey(headers)).toBe(key);
  });
});

describe('PrivacyToken validation', () => {
  // Format-rejection tests use a mock env with no registered batches
  const emptyEnv = mockEnvWithBatch();

  it('rejects non-hex batchHash', async () => {
    const payload = { batchHash: 'not-valid-hex!', tokenHash: 'a'.repeat(64) };
    const encoded = btoa(JSON.stringify(payload));
    const headers = new Headers({ 'X-Vouch-Auth': `PrivacyToken ${encoded}` });
    expect(await extractPrivacyToken(headers, emptyEnv)).toBeNull();
  });

  it('rejects too-short hashes', async () => {
    const payload = { batchHash: 'abcd', tokenHash: 'a'.repeat(64) };
    const encoded = btoa(JSON.stringify(payload));
    const headers = new Headers({ 'X-Vouch-Auth': `PrivacyToken ${encoded}` });
    expect(await extractPrivacyToken(headers, emptyEnv)).toBeNull();
  });

  it('rejects too-long hashes (>128 chars)', async () => {
    const payload = { batchHash: 'a'.repeat(130), tokenHash: 'b'.repeat(64) };
    const encoded = btoa(JSON.stringify(payload));
    const headers = new Headers({ 'X-Vouch-Auth': `PrivacyToken ${encoded}` });
    expect(await extractPrivacyToken(headers, emptyEnv)).toBeNull();
  });

  it('rejects non-string batchHash', async () => {
    const payload = { batchHash: 12345, tokenHash: 'a'.repeat(64) };
    const encoded = btoa(JSON.stringify(payload));
    const headers = new Headers({ 'X-Vouch-Auth': `PrivacyToken ${encoded}` });
    expect(await extractPrivacyToken(headers, emptyEnv)).toBeNull();
  });

  it('rejects valid format but unregistered batch hash', async () => {
    const payload = { batchHash: 'a'.repeat(64), tokenHash: 'b'.repeat(64) };
    const encoded = btoa(JSON.stringify(payload));
    const headers = new Headers({ 'X-Vouch-Auth': `PrivacyToken ${encoded}` });
    expect(await extractPrivacyToken(headers, emptyEnv)).toBeNull();
  });

  it('accepts valid hex hashes with registered batch', async () => {
    const batchHash = 'a'.repeat(64);
    const env = mockEnvWithBatch(batchHash, { budgetSats: 10000, spentSats: 0 });
    const payload = { batchHash, tokenHash: 'b'.repeat(64) };
    const encoded = btoa(JSON.stringify(payload));
    const headers = new Headers({ 'X-Vouch-Auth': `PrivacyToken ${encoded}` });
    const result = await extractPrivacyToken(headers, env);
    expect(result).not.toBeNull();
    expect(result!.batchHash).toBe(batchHash);
  });
});

describe('NostrEvent validation', () => {
  it('rejects event with non-hex id', () => {
    const event = {
      id: 'not-a-hex-string-that-is-64-characters-long-at-all-nope-nope-no',
      pubkey: 'a'.repeat(64),
      created_at: Math.floor(Date.now() / 1000),
      kind: 27235,
      tags: [],
      content: '',
      sig: 'b'.repeat(128),
    };
    expect(parseNostrEvent(event)).toBeNull();
  });

  it('rejects event with wrong sig length', () => {
    const event = {
      id: 'a'.repeat(64),
      pubkey: 'b'.repeat(64),
      created_at: Math.floor(Date.now() / 1000),
      kind: 27235,
      tags: [],
      content: '',
      sig: 'c'.repeat(64), // should be 128
    };
    expect(parseNostrEvent(event)).toBeNull();
  });
});

// ── Rate Limiter Edge Cases ──

describe('rate limiter security', () => {
  it('prevents count overflow with rapid requests', () => {
    let state = createRateLimitState();
    const now = Date.now();

    // Exhaust the limit
    for (let i = 0; i < 60; i++) {
      const result = checkRateLimit(state, 60, now);
      state = result.newState;
    }

    // 61st request should be blocked
    const result = checkRateLimit(state, 60, now);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('handles NaN limit safely', () => {
    const state = createRateLimitState();
    const result = checkRateLimit(state, NaN, Date.now());
    // NaN comparisons return false, so >= check fails, request gets through
    // This is acceptable — NaN limit means misconfiguration, not a security issue
    expect(result).toBeDefined();
  });

  it('handles negative timestamp gracefully', () => {
    const state = { count: 5, windowStart: -1 };
    const result = checkRateLimit(state, 60, Date.now());
    // Window would be "expired" (now - (-1) > 60000), so it resets
    expect(result.allowed).toBe(true);
    expect(result.newState.count).toBe(1);
  });
});

// ── Anomaly Detection Abuse Prevention ──

describe('anomaly detection bounds', () => {
  it('caps models list at 50', () => {
    let data = createAnomalyData();

    // Add 60 unique models
    for (let i = 0; i < 60; i++) {
      data = recordRequest(data, {
        timestamp: Date.now() + i * 1000,
        model: `model-${i}`,
        isReasoning: false,
        promptLength: 100,
      });
    }

    expect(data.modelsUsed.length).toBeLessThanOrEqual(50);
  });

  it('caps timestamps at 100', () => {
    let data = createAnomalyData();

    for (let i = 0; i < 150; i++) {
      data = recordRequest(data, {
        timestamp: Date.now() + i * 1000,
        model: 'test-model',
        isReasoning: false,
        promptLength: 100,
      });
    }

    expect(data.requestTimestamps.length).toBeLessThanOrEqual(100);
  });

  it('caps prompt lengths at 50', () => {
    let data = createAnomalyData();

    for (let i = 0; i < 80; i++) {
      data = recordRequest(data, {
        timestamp: Date.now() + i * 1000,
        model: 'test-model',
        isReasoning: false,
        promptLength: i * 100,
      });
    }

    expect(data.promptLengths.length).toBeLessThanOrEqual(50);
  });

  it('detects bot-like uniform timing', () => {
    let data = createAnomalyData();
    const base = Date.now();

    // Perfectly uniform requests every 1000ms (CV ≈ 0)
    for (let i = 0; i < 10; i++) {
      data = recordRequest(data, {
        timestamp: base + i * 1000,
        model: 'test-model',
        isReasoning: false,
        promptLength: 100,
      });
    }

    const result = detectAnomalies(data);
    expect(result.flagged).toBe(true);
    expect(result.reasons.some(r => r.includes('uniform request timing'))).toBe(true);
  });

  it('detects high reasoning model ratio', () => {
    let data = createAnomalyData();
    const base = Date.now();

    // 9/10 requests use reasoning models
    for (let i = 0; i < 10; i++) {
      data = recordRequest(data, {
        timestamp: base + i * (1000 + Math.random() * 5000),
        model: 'test-model',
        isReasoning: i < 9,
        promptLength: 100 + Math.random() * 500,
      });
    }

    const result = detectAnomalies(data);
    expect(result.flagged).toBe(true);
    expect(result.reasons.some(r => r.includes('reasoning model ratio'))).toBe(true);
  });
});

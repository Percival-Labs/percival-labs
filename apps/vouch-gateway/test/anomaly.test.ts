// anomaly.test.ts — Usage pattern tracking and anomaly detection tests
// TDD RED phase

import { describe, expect, it } from 'bun:test';
import {
  createAnomalyData,
  recordRequest,
  detectAnomalies,
} from '../src/anomaly';
import type { AnomalyData } from '../src/types';

describe('createAnomalyData', () => {
  it('creates empty anomaly tracking data', () => {
    const data = createAnomalyData();
    expect(data.totalRequests).toBe(0);
    expect(data.reasoningRequests).toBe(0);
    expect(data.requestTimestamps).toHaveLength(0);
    expect(data.modelsUsed).toHaveLength(0);
    expect(data.promptLengths).toHaveLength(0);
  });
});

describe('recordRequest', () => {
  it('increments total request count', () => {
    const data = createAnomalyData();
    const updated = recordRequest(data, {
      timestamp: Date.now(),
      model: 'claude-3-5-sonnet-20241022',
      isReasoning: false,
      promptLength: 500,
    });
    expect(updated.totalRequests).toBe(1);
  });

  it('increments reasoning request count for reasoning models', () => {
    const data = createAnomalyData();
    const updated = recordRequest(data, {
      timestamp: Date.now(),
      model: 'claude-3-5-opus-cot',
      isReasoning: true,
      promptLength: 500,
    });
    expect(updated.reasoningRequests).toBe(1);
  });

  it('does not increment reasoning count for non-reasoning models', () => {
    const data = createAnomalyData();
    const updated = recordRequest(data, {
      timestamp: Date.now(),
      model: 'claude-3-5-sonnet-20241022',
      isReasoning: false,
      promptLength: 500,
    });
    expect(updated.reasoningRequests).toBe(0);
  });

  it('tracks model diversity', () => {
    let data = createAnomalyData();
    data = recordRequest(data, {
      timestamp: Date.now(),
      model: 'claude-3-5-sonnet-20241022',
      isReasoning: false,
      promptLength: 500,
    });
    data = recordRequest(data, {
      timestamp: Date.now(),
      model: 'gpt-4o',
      isReasoning: false,
      promptLength: 500,
    });
    data = recordRequest(data, {
      timestamp: Date.now(),
      model: 'claude-3-5-sonnet-20241022',
      isReasoning: false,
      promptLength: 500,
    });
    expect(data.modelsUsed).toContain('claude-3-5-sonnet-20241022');
    expect(data.modelsUsed).toContain('gpt-4o');
    expect(data.modelsUsed).toHaveLength(2);
  });

  it('caps timestamp history at 100 entries', () => {
    let data = createAnomalyData();
    for (let i = 0; i < 120; i++) {
      data = recordRequest(data, {
        timestamp: Date.now() + i,
        model: 'test-model',
        isReasoning: false,
        promptLength: 100,
      });
    }
    expect(data.requestTimestamps.length).toBeLessThanOrEqual(100);
  });

  it('caps prompt length samples at 50 entries', () => {
    let data = createAnomalyData();
    for (let i = 0; i < 60; i++) {
      data = recordRequest(data, {
        timestamp: Date.now() + i,
        model: 'test-model',
        isReasoning: false,
        promptLength: 100 + i,
      });
    }
    expect(data.promptLengths.length).toBeLessThanOrEqual(50);
  });

  it('tracks hourly request buckets', () => {
    const data = createAnomalyData();
    const now = Date.now();
    const updated = recordRequest(data, {
      timestamp: now,
      model: 'test-model',
      isReasoning: false,
      promptLength: 100,
    });
    const hourKey = String(Math.floor(now / 3_600_000));
    expect(updated.hourlyRequests[hourKey]).toBe(1);
  });
});

describe('detectAnomalies', () => {
  it('returns no flags for normal usage', () => {
    let data = createAnomalyData();
    const now = Date.now();
    // 20 requests over 20 minutes, mixed models, varied timing
    for (let i = 0; i < 20; i++) {
      data = recordRequest(data, {
        timestamp: now + i * 60_000 + Math.random() * 30_000,
        model: i % 3 === 0 ? 'claude-3-5-sonnet-20241022' : 'gpt-4o',
        isReasoning: i === 15, // 1 out of 20 = 5% reasoning
        promptLength: 200 + Math.floor(Math.random() * 800),
      });
    }
    const result = detectAnomalies(data);
    expect(result.flagged).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('flags high CoT ratio (>80%)', () => {
    let data = createAnomalyData();
    const now = Date.now();
    // 10 requests, 9 reasoning
    for (let i = 0; i < 10; i++) {
      data = recordRequest(data, {
        timestamp: now + i * 5_000 + Math.random() * 2_000,
        model: 'claude-3-5-opus-cot',
        isReasoning: i < 9,
        promptLength: 500,
      });
    }
    const result = detectAnomalies(data);
    expect(result.flagged).toBe(true);
    expect(result.reasons.some(r => r.includes('reasoning'))).toBe(true);
  });

  it('flags suspiciously uniform timing (variance < 0.1)', () => {
    let data = createAnomalyData();
    const now = Date.now();
    // Requests exactly 1000ms apart (very low variance)
    for (let i = 0; i < 20; i++) {
      data = recordRequest(data, {
        timestamp: now + i * 1000,
        model: 'gpt-4o',
        isReasoning: false,
        promptLength: 500,
      });
    }
    const result = detectAnomalies(data);
    expect(result.flagged).toBe(true);
    expect(result.reasons.some(r => r.includes('timing') || r.includes('uniform'))).toBe(true);
  });

  it('flags volume spikes (>5x normal)', () => {
    let data = createAnomalyData();
    const now = Date.now();
    const hourMs = 3_600_000;

    // Normal: 10 requests in each of the first 5 hours
    for (let h = 0; h < 5; h++) {
      for (let i = 0; i < 10; i++) {
        data = recordRequest(data, {
          timestamp: now - (5 - h) * hourMs + i * 60_000,
          model: 'gpt-4o',
          isReasoning: false,
          promptLength: 500 + Math.random() * 500,
        });
      }
    }
    // Spike: 60 requests in the current hour (6x normal)
    for (let i = 0; i < 60; i++) {
      data = recordRequest(data, {
        timestamp: now + i * 1000 + Math.random() * 500,
        model: 'gpt-4o',
        isReasoning: false,
        promptLength: 500 + Math.random() * 500,
      });
    }

    const result = detectAnomalies(data);
    expect(result.flagged).toBe(true);
    expect(result.reasons.some(r => r.includes('spike') || r.includes('volume'))).toBe(true);
  });

  it('does not flag with insufficient data (< 5 requests)', () => {
    let data = createAnomalyData();
    const now = Date.now();
    // Only 3 requests, all reasoning — should NOT flag due to insufficient data
    for (let i = 0; i < 3; i++) {
      data = recordRequest(data, {
        timestamp: now + i * 1000,
        model: 'claude-3-5-opus-cot',
        isReasoning: true,
        promptLength: 500,
      });
    }
    const result = detectAnomalies(data);
    expect(result.flagged).toBe(false);
  });
});

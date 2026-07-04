import { describe, test, expect } from 'bun:test';
import { computeAcpTrustScore } from '../src/scoring';

function makeStats(overrides: Partial<Parameters<typeof computeAcpTrustScore>[0]> = {}) {
  return {
    totalJobsClient: 0,
    totalJobsProvider: 0,
    totalJobsEvaluator: 0,
    completedAsProvider: 0,
    failedAsProvider: 0,
    totalEarnedUsdc: '0',
    totalSpentUsdc: '0',
    uniqueClients: 0,
    uniqueProviders: 0,
    firstSeenAt: null,
    lastActiveAt: null,
    ...overrides,
  };
}

describe('computeAcpTrustScore', () => {
  test('returns 0 for zero activity', () => {
    expect(computeAcpTrustScore(makeStats())).toBe(0);
  });

  test('caps provisional agents at 400', () => {
    // 2 jobs (below MIN_JOBS_FOR_FULL_SCORE = 3)
    const score = computeAcpTrustScore(makeStats({
      totalJobsProvider: 2,
      completedAsProvider: 2,
      totalEarnedUsdc: '1000',
      uniqueClients: 2,
      firstSeenAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));
    expect(score).toBeLessThanOrEqual(400);
    expect(score).toBeGreaterThan(0);
  });

  test('scores higher for perfect completion rate', () => {
    const perfect = computeAcpTrustScore(makeStats({
      totalJobsProvider: 10,
      completedAsProvider: 10,
      failedAsProvider: 0,
      totalEarnedUsdc: '100',
      uniqueClients: 5,
      firstSeenAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));

    const poor = computeAcpTrustScore(makeStats({
      totalJobsProvider: 10,
      completedAsProvider: 3,
      failedAsProvider: 7,
      totalEarnedUsdc: '100',
      uniqueClients: 5,
      firstSeenAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));

    expect(perfect).toBeGreaterThan(poor);
  });

  test('volume increases score (log scale)', () => {
    const lowVolume = computeAcpTrustScore(makeStats({
      totalJobsProvider: 5,
      completedAsProvider: 5,
      totalEarnedUsdc: '10',
      uniqueClients: 3,
      firstSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));

    const highVolume = computeAcpTrustScore(makeStats({
      totalJobsProvider: 5,
      completedAsProvider: 5,
      totalEarnedUsdc: '5000',
      uniqueClients: 3,
      firstSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));

    expect(highVolume).toBeGreaterThan(lowVolume);
  });

  test('diversity increases score', () => {
    const lowDiversity = computeAcpTrustScore(makeStats({
      totalJobsProvider: 10,
      completedAsProvider: 10,
      totalEarnedUsdc: '100',
      uniqueClients: 1,
      firstSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));

    const highDiversity = computeAcpTrustScore(makeStats({
      totalJobsProvider: 10,
      completedAsProvider: 10,
      totalEarnedUsdc: '100',
      uniqueClients: 8,
      firstSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));

    expect(highDiversity).toBeGreaterThan(lowDiversity);
  });

  test('tenure increases score', () => {
    const newAgent = computeAcpTrustScore(makeStats({
      totalJobsProvider: 5,
      completedAsProvider: 5,
      totalEarnedUsdc: '100',
      uniqueClients: 3,
      firstSeenAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day
      lastActiveAt: new Date(),
    }));

    const veteranAgent = computeAcpTrustScore(makeStats({
      totalJobsProvider: 5,
      completedAsProvider: 5,
      totalEarnedUsdc: '100',
      uniqueClients: 3,
      firstSeenAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000), // 150 days
      lastActiveAt: new Date(),
    }));

    expect(veteranAgent).toBeGreaterThan(newAgent);
  });

  test('score is bounded 0-1000', () => {
    // Max everything
    const maxScore = computeAcpTrustScore(makeStats({
      totalJobsProvider: 100,
      completedAsProvider: 100,
      failedAsProvider: 0,
      totalEarnedUsdc: '100000',
      uniqueClients: 50,
      firstSeenAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));

    expect(maxScore).toBeLessThanOrEqual(1000);
    expect(maxScore).toBeGreaterThanOrEqual(0);
  });

  test('pure clients get moderate completion score', () => {
    const clientOnly = computeAcpTrustScore(makeStats({
      totalJobsClient: 5,
      totalSpentUsdc: '500',
      uniqueProviders: 3,
      firstSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));

    expect(clientOnly).toBeGreaterThan(0);
  });

  test('full score exceeds 400 with enough jobs', () => {
    const score = computeAcpTrustScore(makeStats({
      totalJobsProvider: 20,
      completedAsProvider: 18,
      failedAsProvider: 2,
      totalEarnedUsdc: '2000',
      uniqueClients: 10,
      firstSeenAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    }));

    expect(score).toBeGreaterThan(400);
  });
});

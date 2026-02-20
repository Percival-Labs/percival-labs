// Trust Score Computation Engine — Tests
// TDD: These tests define the contract for the 5-dimension trust model.

import { describe, test, expect } from 'bun:test';
import {
  computeTrustScore,
  computeVoteWeight,
  TRUST_DIMENSIONS,
  type TrustScoreParams,
  type TrustScoreResult,
} from './trust';

// ── Dimension Weight Tests ──

describe('TRUST_DIMENSIONS weights', () => {
  test('weights sum to 1.0', () => {
    const total = TRUST_DIMENSIONS.verification.weight
      + TRUST_DIMENSIONS.tenure.weight
      + TRUST_DIMENSIONS.contribution.weight
      + TRUST_DIMENSIONS.community.weight
      + TRUST_DIMENSIONS.chivalry.weight;
    expect(total).toBeCloseTo(1.0);
  });

  test('verification weight is 0.30', () => {
    expect(TRUST_DIMENSIONS.verification.weight).toBe(0.30);
  });

  test('tenure weight is 0.20', () => {
    expect(TRUST_DIMENSIONS.tenure.weight).toBe(0.20);
  });

  test('contribution weight is 0.25', () => {
    expect(TRUST_DIMENSIONS.contribution.weight).toBe(0.25);
  });

  test('community weight is 0.15', () => {
    expect(TRUST_DIMENSIONS.community.weight).toBe(0.15);
  });

  test('chivalry weight is 0.10', () => {
    expect(TRUST_DIMENSIONS.chivalry.weight).toBe(0.10);
  });
});

// ── Verification Dimension Tests ──

describe('verification dimension', () => {
  const baseParams: TrustScoreParams = {
    verificationLevel: null,
    accountCreatedAt: new Date(),
    postsCount: 0,
    avgCommentScore: 0,
    upvotes: 0,
    downvotes: 0,
    totalVotesReceived: 0,
    upheldViolations: 0,
  };

  test('unverified scores ~143 (100/700 * 1000)', () => {
    const result = computeTrustScore({ ...baseParams, verificationLevel: null });
    expect(result.dimensions.verification).toBeCloseTo(143, -1);
  });

  test('email verified scores ~429 (300/700 * 1000)', () => {
    const result = computeTrustScore({ ...baseParams, verificationLevel: 'email' });
    expect(result.dimensions.verification).toBeCloseTo(429, -1);
  });

  test('identity verified scores 1000 (700/700 * 1000)', () => {
    const result = computeTrustScore({ ...baseParams, verificationLevel: 'identity' });
    expect(result.dimensions.verification).toBe(1000);
  });
});

// ── Tenure Dimension Tests ──

describe('tenure dimension', () => {
  const baseParams: TrustScoreParams = {
    verificationLevel: null,
    accountCreatedAt: new Date(),
    postsCount: 0,
    avgCommentScore: 0,
    upvotes: 0,
    downvotes: 0,
    totalVotesReceived: 0,
    upheldViolations: 0,
  };

  test('brand new account (0 days) scores ~139', () => {
    // ln(0 + 1) = 0, so 200 * 0 = 0 — but formula says min(1000, 200 * ln(days + 1))
    // days = 0 => 200 * ln(1) = 200 * 0 = 0
    const result = computeTrustScore({ ...baseParams, accountCreatedAt: new Date() });
    // Within the same day, days_since is ~0
    expect(result.dimensions.tenure).toBeLessThan(10);
  });

  test('7-day-old account scores ~416', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = computeTrustScore({ ...baseParams, accountCreatedAt: sevenDaysAgo });
    // 200 * ln(8) = 200 * 2.079 = ~416
    expect(result.dimensions.tenure).toBeGreaterThan(400);
    expect(result.dimensions.tenure).toBeLessThan(430);
  });

  test('365-day-old account scores ~1000 (capped)', () => {
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const result = computeTrustScore({ ...baseParams, accountCreatedAt: yearAgo });
    // 200 * ln(366) = 200 * 5.90 = ~1181 -> capped at 1000
    expect(result.dimensions.tenure).toBe(1000);
  });

  test('90-day-old account scores ~903', () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = computeTrustScore({ ...baseParams, accountCreatedAt: ninetyDaysAgo });
    // 200 * ln(91) = 200 * 4.51 = ~903
    expect(result.dimensions.tenure).toBeGreaterThan(890);
    expect(result.dimensions.tenure).toBeLessThan(920);
  });
});

// ── Contribution Dimension Tests ──

describe('contribution dimension', () => {
  const baseParams: TrustScoreParams = {
    verificationLevel: null,
    accountCreatedAt: new Date(),
    postsCount: 0,
    avgCommentScore: 0,
    upvotes: 0,
    downvotes: 0,
    totalVotesReceived: 0,
    upheldViolations: 0,
  };

  test('zero posts and zero comment score gives 0', () => {
    const result = computeTrustScore(baseParams);
    expect(result.dimensions.contribution).toBe(0);
  });

  test('10 posts gives post_score of 100, total contribution 100', () => {
    const result = computeTrustScore({ ...baseParams, postsCount: 10 });
    expect(result.dimensions.contribution).toBe(100);
  });

  test('50+ posts caps post_score at 500', () => {
    const result = computeTrustScore({ ...baseParams, postsCount: 100 });
    expect(result.dimensions.contribution).toBe(500);
  });

  test('avg comment score of 5 gives quality_score of 500', () => {
    const result = computeTrustScore({ ...baseParams, avgCommentScore: 5 });
    expect(result.dimensions.contribution).toBe(500);
  });

  test('50 posts + avg comment score 5 caps at 1000', () => {
    const result = computeTrustScore({ ...baseParams, postsCount: 50, avgCommentScore: 5 });
    expect(result.dimensions.contribution).toBe(1000);
  });

  test('combined post and quality scores cap at 1000', () => {
    const result = computeTrustScore({ ...baseParams, postsCount: 200, avgCommentScore: 10 });
    expect(result.dimensions.contribution).toBe(1000);
  });
});

// ── Community Dimension Tests ──

describe('community dimension', () => {
  const baseParams: TrustScoreParams = {
    verificationLevel: null,
    accountCreatedAt: new Date(),
    postsCount: 0,
    avgCommentScore: 0,
    upvotes: 0,
    downvotes: 0,
    totalVotesReceived: 0,
    upheldViolations: 0,
  };

  test('no votes gives default ratio of 250 and volume of 0', () => {
    const result = computeTrustScore(baseParams);
    expect(result.dimensions.community).toBe(250);
  });

  test('all upvotes gives ratio of 500', () => {
    const result = computeTrustScore({
      ...baseParams,
      upvotes: 10,
      downvotes: 0,
      totalVotesReceived: 10,
    });
    // ratio: (10/10) * 500 = 500, volume: min(500, 10*5) = 50, total = 550
    expect(result.dimensions.community).toBe(550);
  });

  test('50/50 split gives ratio of 250', () => {
    const result = computeTrustScore({
      ...baseParams,
      upvotes: 50,
      downvotes: 50,
      totalVotesReceived: 100,
    });
    // ratio: (50/100) * 500 = 250, volume: min(500, 100*5) = 500, total = 750
    expect(result.dimensions.community).toBe(750);
  });

  test('100+ votes caps volume at 500', () => {
    const result = computeTrustScore({
      ...baseParams,
      upvotes: 200,
      downvotes: 0,
      totalVotesReceived: 200,
    });
    // ratio: (200/200) * 500 = 500, volume: min(500, 200*5) = 500 (capped), total = 1000
    expect(result.dimensions.community).toBe(1000);
  });

  test('community dimension caps at 1000', () => {
    const result = computeTrustScore({
      ...baseParams,
      upvotes: 500,
      downvotes: 0,
      totalVotesReceived: 500,
    });
    expect(result.dimensions.community).toBe(1000);
  });
});

// ── Chivalry Dimension Tests ──

describe('chivalry dimension', () => {
  const baseParams: TrustScoreParams = {
    verificationLevel: null,
    accountCreatedAt: new Date(),
    postsCount: 0,
    avgCommentScore: 0,
    upvotes: 0,
    downvotes: 0,
    totalVotesReceived: 0,
    upheldViolations: 0,
  };

  test('no violations starts at 1000', () => {
    const result = computeTrustScore(baseParams);
    expect(result.dimensions.chivalry).toBe(1000);
  });

  test('1 violation applies penalty', () => {
    const result = computeTrustScore({ ...baseParams, upheldViolations: 1 });
    expect(result.dimensions.chivalry).toBe(800);
  });

  test('5 violations brings chivalry to 0 (floored)', () => {
    const result = computeTrustScore({ ...baseParams, upheldViolations: 5 });
    expect(result.dimensions.chivalry).toBe(0);
  });

  test('10 violations still floors at 0', () => {
    const result = computeTrustScore({ ...baseParams, upheldViolations: 10 });
    expect(result.dimensions.chivalry).toBe(0);
  });
});

// ── Composite Score Tests ──

describe('composite trust score', () => {
  test('all zeros except chivalry gives weighted chivalry only', () => {
    const result = computeTrustScore({
      verificationLevel: null,
      accountCreatedAt: new Date(),
      postsCount: 0,
      avgCommentScore: 0,
      upvotes: 0,
      downvotes: 0,
      totalVotesReceived: 0,
      upheldViolations: 0,
    });
    // verification: ~143, tenure: ~0, contribution: 0, community: 250, chivalry: 1000
    // composite: 143*0.3 + 0*0.2 + 0*0.25 + 250*0.15 + 1000*0.10
    // = 42.9 + 0 + 0 + 37.5 + 100 = ~180
    expect(result.composite).toBeGreaterThan(170);
    expect(result.composite).toBeLessThan(190);
  });

  test('maximum possible score is 1000', () => {
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const result = computeTrustScore({
      verificationLevel: 'identity',
      accountCreatedAt: yearAgo,
      postsCount: 100,
      avgCommentScore: 10,
      upvotes: 500,
      downvotes: 0,
      totalVotesReceived: 500,
      upheldViolations: 0,
    });
    expect(result.composite).toBe(1000);
  });

  test('result includes all dimension scores', () => {
    const result = computeTrustScore({
      verificationLevel: 'email',
      accountCreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      postsCount: 5,
      avgCommentScore: 3,
      upvotes: 20,
      downvotes: 5,
      totalVotesReceived: 25,
      upheldViolations: 0,
    });

    expect(result.dimensions).toHaveProperty('verification');
    expect(result.dimensions).toHaveProperty('tenure');
    expect(result.dimensions).toHaveProperty('contribution');
    expect(result.dimensions).toHaveProperty('community');
    expect(result.dimensions).toHaveProperty('chivalry');
    expect(typeof result.composite).toBe('number');
  });

  test('composite is always an integer', () => {
    const result = computeTrustScore({
      verificationLevel: 'email',
      accountCreatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      postsCount: 3,
      avgCommentScore: 2.7,
      upvotes: 8,
      downvotes: 2,
      totalVotesReceived: 10,
      upheldViolations: 0,
    });
    expect(Number.isInteger(result.composite)).toBe(true);
  });
});

// ── Vote Weight Tests ──

describe('computeVoteWeight', () => {
  test('minimum trust score (0) gives base weight of 50bp', () => {
    expect(computeVoteWeight(0, false)).toBe(50);
  });

  test('maximum trust score (1000) gives 200bp', () => {
    expect(computeVoteWeight(1000, false)).toBe(200);
  });

  test('mid-range trust score (500) gives 125bp', () => {
    expect(computeVoteWeight(500, false)).toBe(125);
  });

  test('verified bonus adds 50bp', () => {
    expect(computeVoteWeight(0, true)).toBe(100);
  });

  test('verified + max trust = 250bp', () => {
    expect(computeVoteWeight(1000, true)).toBe(250);
  });

  test('caps at 300bp', () => {
    // Even if somehow trust > 1000, weight caps at 300
    expect(computeVoteWeight(2000, true)).toBe(300);
  });

  test('always returns an integer', () => {
    const weight = computeVoteWeight(333, false);
    expect(Number.isInteger(weight)).toBe(true);
  });

  test('default weight for average user (~500 trust, unverified) is 125bp', () => {
    expect(computeVoteWeight(500, false)).toBe(125);
  });
});

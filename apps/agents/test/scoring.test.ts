// Evidence Scoring + Vouch Reporter tests
// Tests the quality scoring system and the reporter bridge.

import { describe, expect, it } from 'bun:test';
import {
  scoreEvidence,
  createEvidence,
  type Evidence,
  type EvidenceScore,
} from '../src/tasks/evidence';
import { scoreOnly } from '../src/tasks/vouch-reporter';

// ── Helpers ──

function makeCodeEvidence(overrides: Partial<{
  testResult: string;
  testCount: number;
  testFailures: number;
  hasDiff: boolean;
}>  = {}): Evidence {
  const { testResult = 'pass', testCount = 10, testFailures = 0, hasDiff = true } = overrides;
  const artifacts = [];
  if (hasDiff) {
    artifacts.push({ type: 'diff', path: 'src/feature.ts', details: '+42/-8' });
  }
  artifacts.push({ type: 'test_output', result: testResult, count: testCount, failures: testFailures });
  return createEvidence('task_1', 'builder', 'code_change', 'Built feature', artifacts);
}

// ── Evidence Scoring ──

describe('scoreEvidence', () => {
  describe('code_change scoring', () => {
    it('scores perfect code change at 1.0', () => {
      const evidence = makeCodeEvidence();
      const score = scoreEvidence(evidence);
      expect(score.quality).toBe(1.0);
      expect(score.factors.diff).toBe(0.2);
      expect(score.factors.tests).toBe(0.8);
    });

    it('scores code change with some failures', () => {
      const evidence = makeCodeEvidence({ testCount: 10, testFailures: 3 });
      const score = scoreEvidence(evidence);
      expect(score.quality).toBeGreaterThan(0.5);
      expect(score.quality).toBeLessThan(1.0);
      expect(score.factors.tests).toBeLessThan(0.8);
    });

    it('scores code change with all tests failing', () => {
      const evidence = makeCodeEvidence({ testResult: 'fail' });
      const score = scoreEvidence(evidence);
      expect(score.quality).toBeLessThan(0.5);
      expect(score.factors.tests).toBe(0.1);
    });

    it('scores code change without diff as invalid (diff is required)', () => {
      const evidence = makeCodeEvidence({ hasDiff: false });
      const score = scoreEvidence(evidence);
      // Code change requires diff artifact — validation fails → quality 0
      expect(score.quality).toBe(0);
      expect(score.factors.valid).toBe(0);
    });
  });

  describe('review scoring', () => {
    it('scores review with detailed checklist at 1.0', () => {
      const evidence = createEvidence(
        'task_1', 'reviewer', 'review', 'Code review',
        [{ type: 'checklist', details: 'Reviewed: auth flow, input validation, error handling, dependency versions, test coverage — all pass. Minor: rename variable in auth.ts.' }],
      );
      const score = scoreEvidence(evidence);
      expect(score.quality).toBe(1.0);
      expect(score.factors.checklist).toBe(0.5);
      expect(score.factors.detail).toBe(0.5);
    });

    it('scores review with short checklist lower', () => {
      const evidence = createEvidence(
        'task_1', 'reviewer', 'review', 'Code review',
        [{ type: 'checklist', details: 'OK' }],
      );
      const score = scoreEvidence(evidence);
      expect(score.quality).toBe(0.75);
      expect(score.factors.detail).toBe(0.25);
    });
  });

  describe('scan scoring', () => {
    it('scores clean scan at 1.0', () => {
      const evidence = createEvidence(
        'task_1', 'auditor', 'scan', 'Security scan',
        [{ type: 'scan_output', result: 'clean', details: 'No issues found' }],
      );
      const score = scoreEvidence(evidence);
      expect(score.quality).toBe(1.0);
    });

    it('scores scan with issues lower', () => {
      const evidence = createEvidence(
        'task_1', 'auditor', 'scan', 'Security scan',
        [{ type: 'scan_output', result: 'issues_found', details: '3 high severity' }],
      );
      const score = scoreEvidence(evidence);
      expect(score.quality).toBe(0.75);
    });
  });

  describe('research scoring', () => {
    it('scores high-confidence research with multiple sources', () => {
      const evidence = createEvidence(
        'task_1', 'researcher', 'research', 'Market research',
        [
          { type: 'source', details: 'arxiv paper 1' },
          { type: 'source', details: 'arxiv paper 2' },
          { type: 'source', details: 'github repo' },
        ],
        { confidence: 0.9 },
      );
      const score = scoreEvidence(evidence);
      expect(score.quality).toBeGreaterThan(0.8);
      expect(score.factors.confidence).toBe(0.9);
      expect(score.factors.sources).toBe(0.3); // 3 sources * 0.1, capped at 0.3
    });

    it('scores low-confidence research lower', () => {
      const evidence = createEvidence(
        'task_1', 'researcher', 'research', 'Quick search',
        [{ type: 'source', details: 'one blog post' }],
        { confidence: 0.3 },
      );
      const score = scoreEvidence(evidence);
      expect(score.quality).toBeLessThan(0.5);
    });
  });

  describe('asset scoring', () => {
    it('scores asset with file and details at 1.0', () => {
      const evidence = createEvidence(
        'task_1', 'artist', 'asset', 'Created sprite',
        [{ type: 'file', path: 'assets/sprite.png', details: '128x128 PNG sprite sheet with 4 frames for idle animation' }],
      );
      const score = scoreEvidence(evidence);
      expect(score.quality).toBe(1.0);
    });

    it('scores asset without details lower', () => {
      const evidence = createEvidence(
        'task_1', 'artist', 'asset', 'Created sprite',
        [{ type: 'file', path: 'assets/sprite.png' }],
      );
      const score = scoreEvidence(evidence);
      expect(score.quality).toBe(0.75);
    });
  });

  describe('coordination scoring', () => {
    it('scores coordination with detailed rollup at 1.0', () => {
      const evidence = createEvidence(
        'task_1', 'coordinator', 'coordination', 'Coordinated',
        [{ type: 'subtask_rollup', details: 'All 4 subtasks completed: auth, db, api, tests' }],
      );
      const score = scoreEvidence(evidence);
      expect(score.quality).toBe(1.0);
    });
  });

  describe('invalid evidence', () => {
    it('scores invalid evidence at 0', () => {
      const evidence = createEvidence('task_1', 'builder', 'code_change', '', []);
      const score = scoreEvidence(evidence);
      expect(score.quality).toBe(0);
      expect(score.factors.valid).toBe(0);
    });
  });
});

// ── Vouch Reporter ──

describe('scoreOnly', () => {
  it('returns same score as scoreEvidence', () => {
    const evidence = makeCodeEvidence();
    const direct = scoreEvidence(evidence);
    const via = scoreOnly(evidence);
    expect(via.quality).toBe(direct.quality);
    expect(via.factors).toEqual(direct.factors);
  });
});

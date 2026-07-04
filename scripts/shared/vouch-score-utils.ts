/**
 * Shared Vouch Score Utilities
 *
 * Common score recording pattern used by all PL agents.
 * Merges vouch score data into each agent's existing report file.
 * Keeps a rolling window of the last 100 scores.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// -- Types ------------------------------------------------------------------

export interface ScoreEntry {
  score: number;
  timestamp: string;
  dimensions: Record<string, number>;
}

export interface VouchScoreBlock {
  vouchScores: ScoreEntry[];
  averageScore: number;
  totalScored: number;
  lastScoreAt: string;
}

// -- Recording --------------------------------------------------------------

/**
 * Record a vouch score into an agent's report file.
 * Merges with existing report data -- never overwrites other fields.
 * Keeps the last 100 scores in a rolling window.
 */
export function recordAgentScore(
  reportPath: string,
  score: number,
  dimensions: Record<string, number>,
): void {
  let report: Record<string, unknown> = {};

  try {
    if (existsSync(reportPath)) {
      report = JSON.parse(readFileSync(reportPath, 'utf-8'));
    }
  } catch {
    // Start fresh on parse error
  }

  // Ensure vouchScores array exists
  if (!Array.isArray(report.vouchScores)) {
    report.vouchScores = [];
  }

  const scores = report.vouchScores as ScoreEntry[];
  scores.push({
    score,
    timestamp: new Date().toISOString(),
    dimensions,
  });

  // Keep last 100
  if (scores.length > 100) {
    report.vouchScores = scores.slice(-100);
  }

  const currentScores = report.vouchScores as ScoreEntry[];
  report.averageScore = Math.round(
    currentScores.reduce((s, e) => s + e.score, 0) / currentScores.length,
  );
  report.totalScored = currentScores.length;
  report.lastScoreAt = new Date().toISOString();

  const dir = dirname(reportPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

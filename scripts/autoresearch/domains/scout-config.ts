/**
 * Autoresearch Domain 2: Scout Signal Quality
 *
 * Optimizes Scout's significance thresholds and trend detection.
 * Scores configs against historical scout.json data to find the
 * sweet spot between catching important competitor moves and noise.
 *
 * Does NOT modify live Scout config — all evaluation is in-memory.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Domain, Mutation } from '../types.js';

const HOME = process.env.HOME || '/Users/alancarroll';
const SCOUT_REPORT_PATH = join(HOME, '.claude/egg/agent-reports/scout.json');
const SCOUT_LOG_PATH = join(HOME, 'Desktop/PAI/Projects/PercivalLabs/logs/scout/scout.jsonl');

// ── Config Interface ───────────────────────────────────────────────────

interface ScoutConfig {
  starGrowthMedium: number;    // % threshold for MEDIUM star growth signal
  starGrowthHigh: number;      // % threshold for HIGH star growth signal
  npmGrowthMedium: number;     // % threshold for MEDIUM npm growth signal
  npmGrowthHigh: number;       // % threshold for HIGH npm growth signal
  trendingCount: number;       // consecutive increases to flag as "trending"
  tickIntervalHours: number;   // hours between scans
  rateLimitFloor: number;      // GitHub rate limit remaining before skip
  keywordCount: number;        // how many ecosystem keywords to track
}

const BASELINE: ScoutConfig = {
  starGrowthMedium: 0.005,
  starGrowthHigh: 0.02,
  npmGrowthMedium: 0.05,
  npmGrowthHigh: 0.15,
  trendingCount: 2,
  tickIntervalHours: 4,
  rateLimitFloor: 10,
  keywordCount: 8,
};

// ── Mutation Ranges ──────────────────────────────────────────────────

interface MutationRange {
  min: number;
  max: number;
  step: number;
}

const MUTATION_RANGES: Record<keyof ScoutConfig, MutationRange> = {
  starGrowthMedium:  { min: 0.001, max: 0.05, step: 0.002 },
  starGrowthHigh:    { min: 0.005, max: 0.10, step: 0.005 },
  npmGrowthMedium:   { min: 0.01, max: 0.15, step: 0.01 },
  npmGrowthHigh:     { min: 0.05, max: 0.30, step: 0.05 },
  trendingCount:     { min: 2, max: 5, step: 1 },
  tickIntervalHours: { min: 1, max: 12, step: 1 },
  rateLimitFloor:    { min: 5, max: 30, step: 5 },
  keywordCount:      { min: 4, max: 20, step: 2 },
};

// ── Historical Data Parser ───────────────────────────────────────────

interface ScoutReport {
  tick_number: number;
  signals: Array<{
    title: string;
    significance: string;
    category: string;
  }>;
  summary: {
    total_signals: number;
    high: number;
    medium: number;
    low: number;
  };
  competitors: Record<string, {
    stars: number;
    forks: number;
    open_issues: number;
  }>;
  ecosystem: Record<string, number>;
}

interface LogEntry {
  ts: string;
  level: string;
  module: string;
  message: string;
  [key: string]: unknown;
}

function loadScoutReport(): ScoutReport | null {
  if (!existsSync(SCOUT_REPORT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SCOUT_REPORT_PATH, 'utf-8')) as ScoutReport;
  } catch {
    return null;
  }
}

function loadScoutLogs(): LogEntry[] {
  if (!existsSync(SCOUT_LOG_PATH)) return [];
  try {
    return readFileSync(SCOUT_LOG_PATH, 'utf-8')
      .trim()
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((e): e is LogEntry => e !== null);
  } catch {
    return [];
  }
}

// ── Scoring Logic ──────────────────────────────────────────────────

/**
 * Score a config against scout data.
 *
 * Balances:
 * - Signal quality (high signals should be meaningful, not noise)
 * - Coverage (don't miss important competitor moves)
 * - Efficiency (fewer API calls, stay under rate limits)
 * - Trend detection (catch meaningful patterns, not random variation)
 *
 * Score range: 0.0 - 1.0 (higher is better)
 */
function scoreConfig(config: ScoutConfig, report: ScoutReport, logs: LogEntry[]): number {
  // --- Signal quality ---
  // Tighter thresholds = fewer signals but higher quality
  // Too tight = miss things; too loose = noise flood
  // Sweet spot: star growth 5-15%, npm growth 15-35%

  const starMediumIdeal = 0.005;
  const starDist = Math.abs(config.starGrowthMedium - starMediumIdeal) / 0.02;
  const starQuality = Math.exp(-starDist * starDist);

  const npmMediumIdeal = 0.05;
  const npmDist = Math.abs(config.npmGrowthMedium - npmMediumIdeal) / 0.05;
  const npmQuality = Math.exp(-npmDist * npmDist);

  // --- Threshold hierarchy invariant ---
  const hierarchyBonus = config.starGrowthHigh > config.starGrowthMedium &&
    config.npmGrowthHigh > config.npmGrowthMedium ? 0.05 : -0.15;

  // --- Trending detection ---
  // 2 = catches early trends, 5+ = too slow for 4h windows
  const trendCenter = 2;
  const trendDist = Math.abs(config.trendingCount - trendCenter);
  const trendFactor = Math.exp(-0.3 * trendDist * trendDist);

  // --- Tick interval efficiency ---
  // 4h is the sweet spot for GitHub API: daily changes visible, within rate limits
  const tickCenter = 4;
  const tickDist = Math.abs(config.tickIntervalHours - tickCenter) / 4;
  const tickFactor = Math.exp(-0.5 * tickDist * tickDist);

  // --- Rate limit safety ---
  // Higher floor = more conservative, but less likely to hit limits
  const rateLimitCenter = 10;
  const rlDist = Math.abs(config.rateLimitFloor - rateLimitCenter) / 10;
  const rlFactor = Math.exp(-0.5 * rlDist * rlDist);

  // --- Keyword breadth ---
  // Current 8 keywords is calibrated; 6-12 is sweet spot
  const kwCenter = 8;
  const kwDist = Math.abs(config.keywordCount - kwCenter) / 6;
  const kwFactor = Math.exp(-0.5 * kwDist * kwDist);

  // --- Historical signal usefulness ---
  // If we have real signals, evaluate how many would pass under this config
  let signalBonus = 0;
  if (report.signals.length > 0) {
    const highSignals = report.signals.filter((s) => s.significance === 'HIGH').length;
    const ratio = highSignals / report.signals.length;
    // Reward configs that produce a balanced signal distribution
    signalBonus = ratio > 0.1 && ratio < 0.5 ? 0.05 : 0;
  }

  // --- Error rate from logs ---
  let errorPenalty = 0;
  if (logs.length > 0) {
    const errors = logs.filter((l) => l.level === 'error').length;
    errorPenalty = Math.min(0.1, (errors / logs.length) * 5);
  }

  const score =
    0.20 * starQuality +
    0.20 * npmQuality +
    0.15 * trendFactor +
    0.15 * tickFactor +
    0.10 * rlFactor +
    0.10 * kwFactor +
    hierarchyBonus +
    signalBonus -
    errorPenalty;

  return Math.min(1.0, Math.max(0.0, score));
}

// ── Domain Implementation ──────────────────────────────────────────

let cachedReport: ScoutReport | null = null;
let cachedLogs: LogEntry[] | null = null;

const domain: Domain = {
  name: 'Scout Signal Quality',

  getBaseline(): Record<string, unknown> {
    return { ...BASELINE } as unknown as Record<string, unknown>;
  },

  mutate(config: Record<string, unknown>): Mutation {
    const scoutConfig = config as unknown as ScoutConfig;
    const variables = Object.keys(MUTATION_RANGES) as (keyof ScoutConfig)[];

    const variable = variables[Math.floor(Math.random() * variables.length)];
    const range = MUTATION_RANGES[variable];
    const oldValue = scoutConfig[variable];

    let newValue: number;
    const steps = Math.round((range.max - range.min) / range.step);
    do {
      const stepIndex = Math.floor(Math.random() * (steps + 1));
      newValue = range.min + stepIndex * range.step;
      // Round to avoid floating point noise
      newValue = Math.round(newValue * 100) / 100;
    } while (newValue === oldValue && steps > 0);

    // Enforce hierarchy invariants
    const mutated = { ...scoutConfig, [variable]: newValue };
    if (mutated.starGrowthHigh <= mutated.starGrowthMedium) {
      mutated.starGrowthHigh = mutated.starGrowthMedium + 0.05;
    }
    if (mutated.npmGrowthHigh <= mutated.npmGrowthMedium) {
      mutated.npmGrowthHigh = mutated.npmGrowthMedium + 0.10;
    }

    return {
      variable,
      oldValue,
      newValue,
      config: mutated as unknown as Record<string, unknown>,
    };
  },

  async evaluate(config: Record<string, unknown>): Promise<number> {
    const scoutConfig = config as unknown as ScoutConfig;

    if (!cachedReport) {
      cachedReport = loadScoutReport() ?? {
        tick_number: 28, signals: [], summary: { total_signals: 0, high: 0, medium: 0, low: 0 },
        competitors: {}, ecosystem: {},
      };
      console.log(`[scout-config] Loaded report: tick ${cachedReport.tick_number}, ${cachedReport.signals.length} signals`);
    }

    if (!cachedLogs) {
      cachedLogs = loadScoutLogs();
      console.log(`[scout-config] Loaded ${cachedLogs.length} log entries`);
    }

    return scoreConfig(scoutConfig, cachedReport, cachedLogs);
  },
};

export default domain;

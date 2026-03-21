/**
 * Scout -- Market Intelligence Agent Configuration
 *
 * Competitor repos, npm packages, keywords, intervals, and paths.
 */

import { join } from 'path';

// -- Paths ----------------------------------------------------------------

const HOME = process.env.HOME || '/Users/alancarroll';
const MONOREPO = join(HOME, 'Desktop/PAI/Projects/PercivalLabs');

export const PATHS = {
  logDir: join(MONOREPO, 'logs/scout'),
  reportFile: join(HOME, '.claude/egg/agent-reports/scout.json'),
} as const;

// -- Schedule -------------------------------------------------------------

export const SCHEDULE = {
  tickIntervalMs: 4 * 60 * 60 * 1000, // 4 hours
} as const;

// -- GitHub Repos to Monitor ----------------------------------------------

export interface RepoConfig {
  owner: string;
  repo: string;
  /** Short alias for report keys */
  alias: string;
}

export const REPOS: RepoConfig[] = [
  { owner: 'masumi-network', repo: 'masumi-payment-service', alias: 'masumi' },
  { owner: 'Virtual-Protocol', repo: 'virtuals-python', alias: 'virtuals' },
  { owner: 'anthropics', repo: 'anthropic-cookbook', alias: 'anthropic-cookbook' },
  { owner: 'langchain-ai', repo: 'langchain', alias: 'langchain' },
  { owner: 'joaomdmoura', repo: 'crewAI', alias: 'crewai' },
  { owner: 'microsoft', repo: 'autogen', alias: 'autogen' },
  { owner: 'elizaOS', repo: 'eliza', alias: 'eliza' },
  { owner: 'fetchai', repo: 'uAgents', alias: 'fetchai-uagents' },
] as const;

// -- npm Packages to Track ------------------------------------------------

export const NPM_PACKAGES: string[] = [
  'langchain',
  '@langchain/core',
  'crewai',
  'autogen',
  '@virtuals-protocol/game',
  '@ai16z/eliza',
  'openai',
  '@anthropic-ai/sdk',
];

// -- Keywords for Ecosystem Scanning --------------------------------------

export const KEYWORDS: string[] = [
  'agent economy',
  'agent commerce',
  'agent trust',
  'vouch',
  'engram',
  'agent marketplace',
  'agent payment',
  'agent-to-agent',
];

// -- Thresholds -----------------------------------------------------------

export const THRESHOLDS = {
  /** Star growth % to flag as MEDIUM significance (was 0.10 — unrealistic for 4h windows) */
  starGrowthMedium: 0.005,
  /** Star growth % to flag as HIGH significance */
  starGrowthHigh: 0.02,
  /** Absolute star delta to flag as MEDIUM (catches small-repo moves) */
  starDeltaMedium: 50,
  /** Absolute star delta to flag as HIGH */
  starDeltaHigh: 200,
  /** npm download growth % to flag as MEDIUM significance (was 0.20) */
  npmGrowthMedium: 0.05,
  /** npm download growth % to flag as HIGH significance (was 0.50) */
  npmGrowthHigh: 0.15,
  /** Absolute npm download delta to flag as MEDIUM */
  npmDeltaMedium: 50_000,
  /** Consecutive increases to flag as "trending" (was 3) */
  trendingCount: 2,
  /** GitHub rate limit remaining before we skip */
  rateLimitFloor: 10,
  /** Minimum absolute star change to report as LOW (any positive) */
  starDeltaLow: 1,
  /** Minimum absolute npm download change % to report as LOW */
  npmGrowthLow: 0.01,
} as const;

// -- Circuit Breaker ------------------------------------------------------

export const CIRCUIT_BREAKER = {
  /** Failures before backoff */
  maxFailures: 3,
  /** Backoff duration in ms (30 minutes) */
  backoffMs: 30 * 60 * 1000,
} as const;

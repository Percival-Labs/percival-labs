/**
 * X Scanner -- Configuration
 *
 * Paths, schedule, X API, Gateway, Discord, and search keywords.
 */

import { join } from 'path';

// -- Paths ----------------------------------------------------------------

const HOME = process.env.HOME || '/Users/alancarroll';
const MONOREPO = join(HOME, 'Desktop/PAI/Projects/PercivalLabs');

export const PATHS = {
  logDir: join(MONOREPO, 'logs/x-scanner'),
  reportFile: join(HOME, '.claude/egg/agent-reports/x-scanner.json'),
  seenTweets: join(MONOREPO, 'logs/x-scanner/seen-tweets.json'),
  gatewayUsage: join(MONOREPO, 'logs/x-scanner/gateway-usage.json'),
} as const;

// -- Schedule -------------------------------------------------------------

export const SCHEDULE = {
  tickIntervalMs: 2 * 60 * 60 * 1000, // 2 hours
  queriesPerTick: 3,
} as const;

// -- X API ----------------------------------------------------------------

export const X_API = {
  searchUrl: 'https://api.twitter.com/2/tweets/search/recent',
  tokenUrl: 'https://api.twitter.com/oauth2/token',
  maxResultsPerQuery: 10,
  tweetFields: 'created_at,public_metrics,author_id',
  expansions: 'author_id',
  userFields: 'username',
} as const;

// -- Gateway --------------------------------------------------------------

export const GATEWAY = {
  baseUrl: 'https://gateway.percival-labs.ai',
  model: 'smart',
  maxDailyCalls: 30,
  circuitBreakerThreshold: 3,
  circuitBreakerCooldownMs: 30 * 60 * 1000, // 30 minutes
  maxTokens: 1024,
} as const;

// -- Discord --------------------------------------------------------------

export const DISCORD = {
  channelId: '1471994283186716795', // #signals
  apiBase: 'https://discord.com/api/v10',
} as const;

// -- Search Queries -------------------------------------------------------

/**
 * Search queries are built dynamically from the watchlist file.
 * Static queries here are for topic-based scanning only.
 */
export const STATIC_QUERIES = [
  // Agent infrastructure / trust (our domain) — avoid broad "agent economy" (crypto spam magnet)
  '"AI agent" "trust" -is:retweet -airdrop -presale',
  '"MCP server" -is:retweet',
  '"Claude Code" -is:retweet',
  '"personal AI" -is:retweet -crypto',
  '"agent infrastructure" -is:retweet',
] as const;

/**
 * Watchlist file — managed via Discord #watchlist channel.
 * X Scanner reads this on every tick.
 */
export const WATCHLIST = {
  filePath: join(MONOREPO, 'scripts/x-scanner/watchlist.json'),
} as const;

// -- Dedup ----------------------------------------------------------------

export const DEDUP = {
  maxSeenIds: 500,
} as const;

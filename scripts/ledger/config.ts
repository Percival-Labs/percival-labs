/**
 * Ledger -- Financial Tracking Agent Configuration
 *
 * All endpoints, thresholds, intervals, and paths in one place.
 * API keys sourced from environment variables — never hardcoded.
 */

import { join } from 'path';

// -- Paths ----------------------------------------------------------------

const HOME = process.env.HOME || '/Users/alancarroll';
const MONOREPO = join(HOME, 'Desktop/PAI/Projects/PercivalLabs');

export const PATHS = {
  logDir: join(MONOREPO, 'logs/ledger'),
  reportFile: join(HOME, '.claude/egg/agent-reports/ledger.json'),
} as const;

// -- Schedule -------------------------------------------------------------

export const SCHEDULE = {
  tickIntervalMs: 6 * 60 * 60 * 1000, // 6 hours
} as const;

// -- API Endpoints --------------------------------------------------------

export const ENDPOINTS = {
  gatewayAdmin: 'https://gateway.percival-labs.ai/admin/v1/agents',
  vouchApi: 'https://percivalvouch-api-production.up.railway.app',
  albyHub: process.env.ALBY_HUB_URL || '',
  openRouter: 'https://openrouter.ai/api/v1',
} as const;

// -- API Keys (from environment) ------------------------------------------

export const KEYS = {
  gatewayAdmin: process.env.GATEWAY_ADMIN_KEY || '',
  /** NWC connection string for Alby Hub treasury (nostr+walletconnect://...) */
  nwcUrl: process.env.NWC_URL || '',
  openRouter: process.env.OPENROUTER_API_KEY || '',
} as const;

// -- Budget ---------------------------------------------------------------

export const BUDGET = {
  alertThresholdPct: 80,
  /** Monthly budget cap in sats (0 = no cap set) */
  monthlyCapSats: 0,
  /** Monthly budget cap in USD (0 = no cap set) */
  monthlyCapUsd: 0,
} as const;

// -- Circuit Breaker ------------------------------------------------------

export const CIRCUIT_BREAKER = {
  maxConsecutiveFailures: 3,
  backoffMs: 30 * 60 * 1000, // 30 minutes
} as const;

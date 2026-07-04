/**
 * Roadmap Worker -- Configuration
 *
 * All paths, schedules, gateway config, limits, and security constraints.
 * API keys sourced from environment variables -- never hardcoded.
 */

import { join } from 'path';

// -- Paths ----------------------------------------------------------------

const HOME = process.env.HOME || '/Users/alancarroll';
const MONOREPO = join(HOME, 'Desktop/PAI/Projects/PercivalLabs');

export const PATHS = {
  logDir: join(MONOREPO, 'logs/roadmap-worker'),
  reportFile: join(HOME, '.claude/egg/agent-reports/roadmap-worker.json'),
  taskQueue: join(MONOREPO, 'scripts/roadmap-worker/task-queue.json'),
  roadmap: join(HOME, '.claude/projects/-Users-alancarroll-PAI/memory/pl-roadmap.md'),
  worktreeBase: join(MONOREPO, '.worktrees'),
  monorepo: MONOREPO,
} as const;

// -- Schedule -------------------------------------------------------------

export const SCHEDULE = {
  tickIntervalMs: 2 * 60 * 60 * 1000, // 2 hours
} as const;

// -- Limits ---------------------------------------------------------------

export const LIMITS = {
  maxItemsPerDay: 3,
  maxMinutesPerItem: 20,
  maxSessionsPerItem: 3,
  maxTurnsPerSession: 10,
} as const;

// -- Vouch Gateway --------------------------------------------------------

export const GATEWAY = {
  url: 'https://gateway.percival-labs.ai/auto/v1/chat/completions',
  agentKey: process.env.ROADMAP_WORKER_GATEWAY_KEY || process.env.EGG_GATEWAY_KEY || '',
  planModel: 'smart',
  codeModel: 'code',
  maxDailyCalls: 20,
  timeoutMs: 120_000,
} as const;

// -- Discord --------------------------------------------------------------

export const DISCORD = {
  proposalsChannelId: '1472028314129534998', // #proposals (task results)
  signalsChannelId: '1471994283186716795',   // #signals (audit findings)
  botToken: process.env.DISCORD_BOT_TOKEN || '',
  /** @deprecated Use proposalsChannelId instead */
  get channelId() { return this.proposalsChannelId; },
} as const;

// -- Audit ----------------------------------------------------------------

export const AUDIT = {
  modules: [
    'secret-scan',
    'dependency-audit',
    'type-check',
    'dead-code',
    'auth-patterns',
    'input-validation',
    'error-handling',
    'test-coverage',
  ] as const,
  discordChannel: '1471994283186716795', // #signals
  reportBranch: 'audit/latest',
  reportDir: 'audit-reports',
  maxGatewayCallsPerAudit: 3,
  /** Audit modules that need LLM analysis (others run locally for free) */
  llmRequiredModules: ['auth-patterns', 'input-validation'] as string[],
} as const;

// -- Circuit Breaker ------------------------------------------------------

export const CIRCUIT_BREAKER = {
  maxConsecutiveFailures: 3,
  backoffMs: 30 * 60 * 1000, // 30 minutes
} as const;

// -- Bash Command Denylist ------------------------------------------------

export const BASH_DENYLIST = [
  'rm -rf /',
  'bun install',
  'bun add',
  'npm install',
  'yarn add',
  'curl | bash',
  'curl | sh',
  'wget',
  'ssh',
  'scp',
  'git push',
  'git merge',
  'launchctl',
  'kill',
  'pkill',
  'shutdown',
  'reboot',
  'env',
  'printenv',
  'cat .env',
] as const;

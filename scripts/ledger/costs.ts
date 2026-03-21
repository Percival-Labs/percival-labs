/**
 * Ledger -- Cost Tracking Module
 *
 * Queries the Gateway audit trail for inference costs.
 * Aggregates spend per agent, per provider, per period.
 * Gracefully degrades if Gateway admin API is unavailable.
 */

import { ENDPOINTS, KEYS } from './config.js';
import { log } from './logger.js';

// -- Types ----------------------------------------------------------------

export interface AgentCostBreakdown {
  [agentId: string]: {
    requests: number;
    totalTokens: number;
    estimatedCostSats: number;
  };
}

export interface ProviderBreakdown {
  local: number;  // Ollama requests (free)
  cloud: number;  // OpenRouter/Anthropic requests (metered)
}

export interface CostReport {
  totalSats: number;
  byAgent: AgentCostBreakdown;
  byProvider: ProviderBreakdown;
  trend: 'increasing' | 'decreasing' | 'stable';
  periodStart: string;
  periodEnd: string;
  estimated: boolean;
  openRouterCreditsRemaining: number;
}

// -- Cost history for trend calculation -----------------------------------

const recentDailyCosts: number[] = [];
const MAX_HISTORY = 7; // track 7 periods for trend

function calculateTrend(currentCost: number): CostReport['trend'] {
  recentDailyCosts.push(currentCost);
  if (recentDailyCosts.length > MAX_HISTORY) {
    recentDailyCosts.shift();
  }

  if (recentDailyCosts.length < 3) return 'stable';

  const recent = recentDailyCosts.slice(-3);
  const isIncreasing = recent[2] > recent[1] && recent[1] > recent[0];
  const isDecreasing = recent[2] < recent[1] && recent[1] < recent[0];

  if (isIncreasing) return 'increasing';
  if (isDecreasing) return 'decreasing';
  return 'stable';
}

// -- Gateway Audit Query --------------------------------------------------

interface AuditEntry {
  agentId?: string;
  model?: string;
  provider?: string;
  // Gateway returns these field names (not tokensIn/tokensOut/costUsd)
  inputTokens?: number;
  outputTokens?: number;
  costSats?: number;
  timestamp?: string;
}

/** Known agent tokens to query audit trails for */
const AGENT_TOKENS = [
  process.env.EGG_GATEWAY_KEY,
  process.env.SENTRY_GATEWAY_KEY,
  process.env.LEDGER_GATEWAY_KEY,
  process.env.SCOUT_GATEWAY_KEY,
  process.env.SCRIBE_GATEWAY_KEY,
  process.env.ORACLE_GATEWAY_KEY,
].filter((t): t is string => !!t && t.length === 64);

async function fetchAgentAudit(token: string, since: string): Promise<AuditEntry[]> {
  try {
    const url = `${ENDPOINTS.gatewayAdmin}/${token}/audit?since=${encodeURIComponent(since)}&action=inference&limit=100`;
    const res = await fetch(url, {
      headers: {
        'X-Gateway-Secret': KEYS.gatewayAdmin,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const data = await res.json() as { entries?: AuditEntry[] };
    return data.entries ?? [];
  } catch {
    return [];
  }
}

async function fetchGatewayAudit(since: string): Promise<AuditEntry[]> {
  if (!KEYS.gatewayAdmin) {
    log('warn', 'costs', 'GATEWAY_ADMIN_KEY not set — skipping audit query');
    return [];
  }

  if (AGENT_TOKENS.length === 0) {
    log('warn', 'costs', 'No agent tokens found in env — skipping audit query');
    return [];
  }

  try {
    // Query audit trail for each known agent in parallel
    const results = await Promise.all(
      AGENT_TOKENS.map((token) => fetchAgentAudit(token, since)),
    );
    const allEntries = results.flat();

    log('info', 'costs', `Fetched audit for ${AGENT_TOKENS.length} agents`, {
      totalEntries: allEntries.length,
    });

    return allEntries;
  } catch (err) {
    log('warn', 'costs', 'Gateway audit query failed', {
      error: (err as Error).message,
    });
    return [];
  }
}

// -- OpenRouter Credits ---------------------------------------------------

async function fetchOpenRouterCredits(): Promise<number> {
  if (!KEYS.openRouter) {
    log('warn', 'costs', 'OPENROUTER_API_KEY not set — skipping credit check');
    return -1;
  }

  try {
    const res = await fetch(`${ENDPOINTS.openRouter}/auth/key`, {
      headers: {
        Authorization: `Bearer ${KEYS.openRouter}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      log('warn', 'costs', `OpenRouter credits check returned ${res.status}`);
      return -1;
    }

    const data = await res.json() as { data?: { limit_remaining?: number; usage?: number; limit?: number } };
    // OpenRouter returns remaining credits in USD (cents or dollars depending on endpoint)
    return data.data?.limit_remaining ?? -1;
  } catch (err) {
    log('warn', 'costs', 'OpenRouter credits check failed', {
      error: (err as Error).message,
    });
    return -1;
  }
}

// -- Aggregation ----------------------------------------------------------

function isLocalProvider(provider?: string, model?: string): boolean {
  if (!provider && !model) return false;
  // Ollama models contain ':' (e.g., qwen3:14b)
  if (model && model.includes(':')) return true;
  if (provider === 'ollama') return true;
  return false;
}

// Rough cost estimation: $0.003 per 1K tokens for cloud (conservative average)
const COST_PER_1K_TOKENS_USD = 0.003;
const SATS_PER_USD = 1250; // rough BTC/USD conversion

function estimateSats(tokensIn: number, tokensOut: number): number {
  const totalTokens = tokensIn + tokensOut;
  const costUsd = (totalTokens / 1000) * COST_PER_1K_TOKENS_USD;
  return Math.round(costUsd * SATS_PER_USD);
}

function aggregateAuditEntries(entries: AuditEntry[]): {
  byAgent: AgentCostBreakdown;
  byProvider: ProviderBreakdown;
  totalSats: number;
} {
  const byAgent: AgentCostBreakdown = {};
  const byProvider: ProviderBreakdown = { local: 0, cloud: 0 };
  let totalSats = 0;

  for (const entry of entries) {
    const agentId = entry.agentId || 'unknown';
    const tokensIn = entry.inputTokens || 0;
    const tokensOut = entry.outputTokens || 0;
    const isLocal = isLocalProvider(entry.provider, entry.model);

    if (!byAgent[agentId]) {
      byAgent[agentId] = { requests: 0, totalTokens: 0, estimatedCostSats: 0 };
    }

    byAgent[agentId].requests++;
    byAgent[agentId].totalTokens += tokensIn + tokensOut;

    if (isLocal) {
      byProvider.local++;
      // Local inference is free
    } else {
      byProvider.cloud++;
      // Gateway already returns costSats directly — use it, or estimate from tokens
      const costSats = entry.costSats
        ? entry.costSats
        : estimateSats(tokensIn, tokensOut);
      byAgent[agentId].estimatedCostSats += costSats;
      totalSats += costSats;
    }
  }

  return { byAgent, byProvider, totalSats };
}

// -- Public API -----------------------------------------------------------

export async function gatherCosts(): Promise<CostReport> {
  const periodEnd = new Date().toISOString();
  const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  log('info', 'costs', 'Gathering cost data', { periodStart, periodEnd });

  const [entries, credits] = await Promise.all([
    fetchGatewayAudit(periodStart),
    fetchOpenRouterCredits(),
  ]);

  const hasData = entries.length > 0;
  const { byAgent, byProvider, totalSats } = aggregateAuditEntries(entries);
  const trend = calculateTrend(totalSats);

  if (!hasData) {
    log('info', 'costs', 'No audit entries returned — report will show zeros');
  } else {
    log('info', 'costs', `Processed ${entries.length} audit entries`, {
      totalSats,
      localRequests: byProvider.local,
      cloudRequests: byProvider.cloud,
    });
  }

  return {
    totalSats,
    byAgent,
    byProvider,
    trend,
    periodStart,
    periodEnd,
    estimated: !hasData || entries.some((e) => !e.costSats),
    openRouterCreditsRemaining: credits,
  };
}

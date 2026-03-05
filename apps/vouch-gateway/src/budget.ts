// Vouch Gateway — Per-Agent Budget Tracking
//
// Tracks cumulative spend per agent key in KV with configurable
// periods and caps. Generic — works for $10/month solo devs
// or $50K/month enterprise accounts.

import type { Env, BudgetConfig, BudgetState } from './types';

// ── Constants ──

const MS_PER_DAY = 86_400_000;

// ── Budget State ──

function budgetKey(pubkey: string): string {
  return `budget:${pubkey}`;
}

/**
 * Get current budget state for an agent, auto-resetting if the period expired.
 */
export async function getBudgetState(
  pubkey: string,
  config: BudgetConfig,
  env: Env,
): Promise<BudgetState> {
  const key = budgetKey(pubkey);
  const state = await env.VOUCH_RATE_LIMITS.get<BudgetState>(key, 'json');

  const now = Date.now();

  if (!state) {
    return { spentSats: 0, periodStart: now, lastUpdated: now };
  }

  // Check if period has expired — if so, reset
  const periodMs = config.periodDays * MS_PER_DAY;
  if (now - state.periodStart >= periodMs) {
    return { spentSats: 0, periodStart: now, lastUpdated: now };
  }

  return state;
}

/**
 * Check if an agent has budget remaining.
 * Returns remaining sats or 0 if over budget.
 */
export async function checkBudget(
  pubkey: string,
  config: BudgetConfig,
  env: Env,
): Promise<{ allowed: boolean; remainingSats: number; spentSats: number }> {
  const state = await getBudgetState(pubkey, config, env);
  const remaining = Math.max(0, config.maxSats - state.spentSats);

  return {
    allowed: remaining > 0,
    remainingSats: remaining,
    spentSats: state.spentSats,
  };
}

/**
 * Record spend against an agent's budget. Called after cost is computed.
 * Uses KV put (last-write-wins) — concurrent requests may cause slight
 * overspend (up to concurrency * cost-per-request). For strict budgets,
 * migrate to Durable Objects for serialized access.
 *
 * SECURITY NOTE: Budget enforcement is best-effort, not transactional.
 * The pre-check (checkBudget) prevents requests when budget is clearly
 * exhausted, but a burst of concurrent requests can exceed the cap.
 * This is acceptable for our use case — same model as cloud provider
 * soft limits. Hard cutoff happens on the next request cycle.
 */
export async function recordSpend(
  pubkey: string,
  costSats: number,
  config: BudgetConfig,
  env: Env,
): Promise<BudgetState> {
  const state = await getBudgetState(pubkey, config, env);

  state.spentSats += costSats;
  state.lastUpdated = Date.now();

  const key = budgetKey(pubkey);
  // TTL = remainder of period + 1 day buffer (auto-cleanup)
  const periodMs = config.periodDays * MS_PER_DAY;
  const elapsed = Date.now() - state.periodStart;
  const ttlSeconds = Math.ceil((periodMs - elapsed + MS_PER_DAY) / 1000);

  await env.VOUCH_RATE_LIMITS.put(key, JSON.stringify(state), {
    expirationTtl: Math.max(ttlSeconds, 60),
  });

  return state;
}

// Vouch Gateway — Pricing Cache
//
// Caches the model pricing table from the Vouch API in KV.
// Used for cost estimation in response headers (transparent mode).

import type { Env } from './types';

// ── Types ──

export interface PricingEntry {
  model_id: string;
  provider: string;
  pl_input_price_per_million_usd: number;
  pl_output_price_per_million_usd: number;
}

// ── Constants ──

const PRICING_CACHE_KEY = 'pricing:table';
const PRICING_CACHE_TTL_S = 3600; // 1 hour in seconds (KV TTL)

// ── Pricing Fetch ──

/**
 * Get the pricing table, cached in KV for 1 hour.
 * Returns a Map of model_id → PricingEntry for fast lookup.
 */
export async function getPricingTable(env: Env): Promise<Map<string, PricingEntry>> {
  // Check KV cache
  const cached = await env.VOUCH_SCORES.get<{ entries: PricingEntry[]; cachedAt: number }>(
    PRICING_CACHE_KEY,
    'json',
  );

  if (cached && Date.now() - cached.cachedAt < PRICING_CACHE_TTL_S * 1000) {
    return new Map(cached.entries.map(e => [e.model_id, e]));
  }

  // Fetch from Vouch API
  try {
    const response = await fetch(`${env.VOUCH_API_URL}/v1/public/pricing`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.error(`[pricing] Failed to fetch pricing: ${response.status}`);
      // Return cached if available (even stale)
      if (cached) return new Map(cached.entries.map(e => [e.model_id, e]));
      return new Map();
    }

    const data = await response.json() as { data: { models: PricingEntry[] } };
    const entries = data.data?.models ?? [];

    // Cache in KV
    await env.VOUCH_SCORES.put(
      PRICING_CACHE_KEY,
      JSON.stringify({ entries, cachedAt: Date.now() }),
      { expirationTtl: PRICING_CACHE_TTL_S },
    );

    return new Map(entries.map(e => [e.model_id, e]));
  } catch (err) {
    console.error('[pricing] Failed to fetch pricing:', err);
    if (cached) return new Map(cached.entries.map(e => [e.model_id, e]));
    return new Map();
  }
}

/**
 * Estimate cost in sats for a given model and token count.
 * Uses cached pricing + a hardcoded BTC price fallback.
 */
export function estimateCostSats(
  pricing: Map<string, PricingEntry>,
  model: string,
  inputTokens: number,
  outputTokens: number,
  btcPriceUsd: number = 85000,
): number {
  const entry = pricing.get(model);
  if (!entry) {
    // Unknown model — conservative estimate (Sonnet-tier)
    const costUsd = (inputTokens * 3.45 + outputTokens * 17.25) / 1_000_000;
    return Math.ceil((costUsd / btcPriceUsd) * 100_000_000);
  }

  const costUsd = (
    inputTokens * entry.pl_input_price_per_million_usd +
    outputTokens * entry.pl_output_price_per_million_usd
  ) / 1_000_000;

  return Math.ceil((costUsd / btcPriceUsd) * 100_000_000);
}

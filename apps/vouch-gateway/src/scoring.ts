// Vouch Gateway — Score Lookups and Tier Resolution
//
// Fetches trust scores from the Vouch API with KV caching (5-minute TTL).
// Resolves the consumer's trust tier based on score AND stake thresholds.

import type {
  TrustTier,
  CachedScore,
  VouchScoreResponse,
  Env,
} from './types';
import { TIER_CONFIGS } from './types';

// ── Configuration ──

const SCORE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Tier Resolution ──

/**
 * Resolve a trust tier based on score and stake.
 * Both score AND stake must meet the tier's minimum thresholds.
 * Returns the highest qualifying tier.
 */
export function resolveTier(score: number, totalStakedSats: number): TrustTier {
  // Check tiers in descending order of privilege
  if (
    score >= TIER_CONFIGS.unlimited.minScore &&
    totalStakedSats >= TIER_CONFIGS.unlimited.minStakeSats
  ) {
    return 'unlimited';
  }

  if (
    score >= TIER_CONFIGS.elevated.minScore &&
    totalStakedSats >= TIER_CONFIGS.elevated.minStakeSats
  ) {
    return 'elevated';
  }

  if (
    score >= TIER_CONFIGS.standard.minScore &&
    totalStakedSats >= TIER_CONFIGS.standard.minStakeSats
  ) {
    return 'standard';
  }

  return 'restricted';
}

// ── Score Fetching ──

/**
 * Fetch a consumer's trust score, checking KV cache first.
 * Falls back to the Vouch API on cache miss or expiry.
 *
 * Returns a CachedScore or null if the consumer is unknown.
 */
export async function getConsumerScore(
  pubkey: string,
  env: Env,
): Promise<CachedScore | null> {
  const cacheKey = `score:${pubkey}`;

  // Check KV cache
  const cached = await env.VOUCH_SCORES.get<CachedScore>(cacheKey, 'json');
  if (cached && Date.now() - cached.cachedAt < SCORE_CACHE_TTL_MS) {
    return cached;
  }

  // Dev mode: return mock scores
  if (env.DEV_MODE === 'true') {
    return mockScore(pubkey, cacheKey, env);
  }

  // Fetch from Vouch API
  try {
    const response = await fetch(
      `${env.VOUCH_API_URL}/v1/public/consumers/${pubkey}/vouch-score`,
      {
        headers: { 'Accept': 'application/json' },
        // Cloudflare Workers: set a reasonable timeout via signal
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (response.status === 404) {
      // Unknown consumer — cache as restricted to avoid hammering the API
      const entry: CachedScore = {
        score: 0,
        totalStakedSats: 0,
        tier: 'restricted',
        cachedAt: Date.now(),
      };
      await env.VOUCH_SCORES.put(cacheKey, JSON.stringify(entry), {
        expirationTtl: 300, // 5 minutes in seconds (KV TTL)
      });
      return entry;
    }

    if (!response.ok) {
      console.error(
        `[scoring] Vouch API returned ${response.status} for ${pubkey}`,
      );
      // On API error, use cached value if available (even stale), or default to restricted
      if (cached) return cached;
      return {
        score: 0,
        totalStakedSats: 0,
        tier: 'restricted',
        cachedAt: Date.now(),
      };
    }

    const data = (await response.json()) as VouchScoreResponse;
    const score = data.vouchScore ?? 0;
    const totalStakedSats = data.backing?.totalStakedSats ?? 0;
    const tier = resolveTier(score, totalStakedSats);

    const entry: CachedScore = {
      score,
      totalStakedSats,
      tier,
      cachedAt: Date.now(),
    };

    // Cache in KV
    await env.VOUCH_SCORES.put(cacheKey, JSON.stringify(entry), {
      expirationTtl: 300,
    });

    return entry;
  } catch (err) {
    console.error(`[scoring] Failed to fetch score for ${pubkey}:`, err);
    // Graceful degradation: use cached if available, otherwise restricted
    if (cached) return cached;
    return {
      score: 0,
      totalStakedSats: 0,
      tier: 'restricted',
      cachedAt: Date.now(),
    };
  }
}

// ── Mock Score (Dev Mode) ──

/**
 * In dev mode, generate a deterministic mock score from the pubkey.
 * Uses the first 4 hex chars to derive a score 0-999.
 */
async function mockScore(
  pubkey: string,
  cacheKey: string,
  env: Env,
): Promise<CachedScore> {
  // Deterministic: use first 4 hex chars of pubkey to derive score
  const scoreBase = parseInt(pubkey.slice(0, 4), 16) % 1000;
  const stakeBase = parseInt(pubkey.slice(4, 8), 16) * 100;
  const tier = resolveTier(scoreBase, stakeBase);

  const entry: CachedScore = {
    score: scoreBase,
    totalStakedSats: stakeBase,
    tier,
    cachedAt: Date.now(),
  };

  await env.VOUCH_SCORES.put(cacheKey, JSON.stringify(entry), {
    expirationTtl: 300,
  });

  return entry;
}

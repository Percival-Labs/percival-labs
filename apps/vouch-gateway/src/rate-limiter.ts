// Vouch Gateway — Per-Consumer Rate Limiting
//
// Tracks request counts per consumer in KV with 60-second sliding windows.
// Each tier has a different rate limit (requests per minute).

import type { RateLimitState, Env } from './types';

// ── Configuration ──

const WINDOW_MS = 60_000; // 1-minute window

// ── State Management ──

/**
 * Create a fresh rate limit state.
 */
export function createRateLimitState(): RateLimitState {
  return {
    count: 0,
    windowStart: Date.now(),
  };
}

// ── Rate Check (Pure Function) ──

/**
 * Check if a request should be allowed under the rate limit.
 * Pure function — does not touch KV. Returns the decision and updated state.
 */
export function checkRateLimit(
  state: RateLimitState,
  limit: number,
  now: number,
): {
  allowed: boolean;
  remaining: number;
  newState: RateLimitState;
} {
  // Unlimited tier bypasses rate limiting
  if (!isFinite(limit)) {
    return {
      allowed: true,
      remaining: Infinity,
      newState: { count: state.count + 1, windowStart: state.windowStart },
    };
  }

  // Check if window has expired
  if (now - state.windowStart >= WINDOW_MS) {
    // Reset window
    return {
      allowed: true,
      remaining: limit - 1,
      newState: { count: 1, windowStart: now },
    };
  }

  // Within current window
  if (state.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      newState: state,
    };
  }

  const newCount = state.count + 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - newCount),
    newState: { count: newCount, windowStart: state.windowStart },
  };
}

// ── KV-Backed Rate Limiting ──

/**
 * Check and update rate limit for a consumer using KV storage.
 * Returns whether the request is allowed and the remaining quota.
 */
export async function enforceRateLimit(
  pubkey: string,
  limit: number,
  env: Env,
): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const key = `rate:${pubkey}`;
  const now = Date.now();

  // Read current state from KV
  const existing = await env.VOUCH_RATE_LIMITS.get<RateLimitState>(key, 'json');
  const state = existing ?? createRateLimitState();

  const result = checkRateLimit(state, limit, now);

  // Write updated state back to KV (with auto-expiry for cleanup)
  await env.VOUCH_RATE_LIMITS.put(key, JSON.stringify(result.newState), {
    expirationTtl: 120, // 2 minutes — slightly longer than window for overlap safety
  });

  return {
    allowed: result.allowed,
    remaining: result.remaining,
  };
}

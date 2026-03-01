// Vouch x402 — Trust-gating lifecycle hooks for x402 servers.
// This is the core of the package. Two hooks:
// 1. beforeVerify — reject untrusted payers (attached to x402ResourceServer)
// 2. protectedRequest — grant free access to high-trust agents (attached to x402HTTPResourceServer)

import type {
  VouchX402Config,
  VouchScoreResponse,
  VouchTrustResult,
  VouchTrustCheckEvent,
  TrustDimension,
  TrustAction,
  FallbackMode,
} from './types';
import { VouchScoreClient } from './client';
import { ScoreCache } from './cache';
import { extractPayerAddress } from './evm-bridge';

export interface VouchX402Hooks {
  /**
   * Attach to x402ResourceServer.onBeforeVerify() to reject untrusted payers.
   * Extracts payer EVM address from the payment payload, looks up Vouch score,
   * and aborts the transaction if the score is below the configured threshold.
   */
  beforeVerify: (ctx: BeforeVerifyContext) => Promise<BeforeVerifyResult | void>;

  /**
   * Attach to x402HTTPResourceServer.onProtectedRequest() to grant free access
   * to high-trust agents. Agent identifies itself via X-Vouch-Npub header (or custom resolver).
   * Only active if config.freeAccessMinScore is set.
   */
  protectedRequest: (ctx: ProtectedRequestContext) => Promise<ProtectedRequestResult | void>;

  /** Manually clear the score cache. */
  clearCache: () => void;
}

// Minimal x402 types — avoids importing @x402/core at runtime.
// These match the shapes passed by x402ResourceServer and x402HTTPResourceServer.

export interface BeforeVerifyContext {
  paymentPayload: unknown;
  requirements?: unknown;
  [key: string]: unknown;
}

export interface BeforeVerifyResult {
  abort: boolean;
  reason?: string;
  message?: string;
}

export interface ProtectedRequestContext {
  request?: { headers?: Record<string, string | undefined> | Headers };
  headers?: Record<string, string | undefined> | Headers;
  [key: string]: unknown;
}

export interface ProtectedRequestResult {
  grantAccess: boolean;
}

const VOUCH_API_DEFAULT = 'https://percivalvouch-api-production.up.railway.app';
const DEFAULT_MIN_SCORE = 200;
const DEFAULT_CACHE_TTL = 300_000; // 5 minutes
const DEFAULT_FALLBACK: FallbackMode = 'degrade';

export function createVouchX402(config: VouchX402Config = {}): VouchX402Hooks {
  const apiUrl = config.apiUrl ?? VOUCH_API_DEFAULT;
  const minScore = config.minScore ?? DEFAULT_MIN_SCORE;
  const cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL;
  const fallback = config.fallback ?? DEFAULT_FALLBACK;
  const freeAccessMinScore = config.freeAccessMinScore;
  const minDimensions = config.minDimensions;
  const onTrustCheck = config.onTrustCheck;

  const client = new VouchScoreClient(apiUrl);
  const cache = new ScoreCache(cacheTtlMs);

  // ── Score lookup with caching ──

  async function lookupByEvmAddress(address: string): Promise<VouchTrustResult | null> {
    const cacheKey = `evm:${address}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    try {
      const result = await client.getScoreByEvmAddress(address);
      if (result) {
        cache.set(cacheKey, result);
        return { ...result, fromCache: false };
      }
      return null;
    } catch {
      // API unreachable — check cache for stale entry before applying fallback
      const stale = cache.get(cacheKey);
      if (stale) return { ...stale, fromCache: true };
      return null;
    }
  }

  async function lookupByPubkey(pubkey: string): Promise<VouchTrustResult | null> {
    const cacheKey = `npub:${pubkey}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    try {
      const result = await client.getScoreByPubkey(pubkey);
      if (result) {
        cache.set(cacheKey, result);
        return { ...result, fromCache: false };
      }
      return null;
    } catch {
      const stale = cache.get(cacheKey);
      if (stale) return { ...stale, fromCache: true };
      return null;
    }
  }

  // ── Score evaluation ──

  function meetsThreshold(result: VouchTrustResult): { passes: boolean; reason: string } {
    if (result.vouchScore < minScore) {
      return {
        passes: false,
        reason: `Score ${result.vouchScore} below minimum ${minScore}`,
      };
    }

    if (minDimensions) {
      for (const [dim, threshold] of Object.entries(minDimensions) as [TrustDimension, number][]) {
        const actual = result.scoreBreakdown[dim];
        if (actual !== undefined && actual < threshold) {
          return {
            passes: false,
            reason: `Dimension '${dim}' score ${actual} below minimum ${threshold}`,
          };
        }
      }
    }

    return { passes: true, reason: 'Score meets all thresholds' };
  }

  function applyFallback(apiReachable: boolean): { action: TrustAction; abort: boolean } {
    switch (fallback) {
      case 'allow':
        return { action: 'fallback_allow', abort: false };
      case 'deny':
        return { action: 'fallback_deny', abort: true };
      case 'degrade':
        // In degrade mode, if we got here it means no cached score exists
        return { action: 'fallback_deny', abort: true };
    }
  }

  function emitEvent(event: VouchTrustCheckEvent): void {
    if (onTrustCheck) {
      try { onTrustCheck(event); } catch { /* don't let callback errors break the hook */ }
    }
  }

  // ── beforeVerify hook ──

  const beforeVerify = async (ctx: BeforeVerifyContext): Promise<BeforeVerifyResult | void> => {
    const start = Date.now();

    // Extract payer address from payment payload
    const payerAddress = config.payerAddressResolver
      ? config.payerAddressResolver(ctx.paymentPayload)
      : extractPayerAddress(ctx.paymentPayload);

    if (!payerAddress) {
      // Can't identify payer — apply fallback
      const fb = applyFallback(true);
      emitEvent({
        action: fb.action,
        reason: 'Could not extract payer address from payment payload',
        result: null,
        durationMs: Date.now() - start,
      });

      if (fb.abort) {
        return { abort: true, reason: 'vouch_identity_unknown', message: 'Could not identify payer for trust verification' };
      }
      return;
    }

    // Look up trust score
    const result = await lookupByEvmAddress(payerAddress);

    if (!result) {
      // Agent not found or API unreachable
      const fb = applyFallback(false);
      emitEvent({
        payerAddress,
        action: fb.action,
        reason: 'Agent not found in Vouch registry',
        result: null,
        durationMs: Date.now() - start,
      });

      if (fb.abort) {
        return { abort: true, reason: 'vouch_agent_unknown', message: 'Payer not registered in Vouch trust registry' };
      }
      return;
    }

    // Evaluate score against thresholds
    const { passes, reason } = meetsThreshold(result);
    const action: TrustAction = passes ? 'allowed' : 'denied';

    emitEvent({
      payerAddress,
      result,
      action,
      reason,
      durationMs: Date.now() - start,
    });

    if (!passes) {
      return {
        abort: true,
        reason: 'insufficient_trust_score',
        message: `Vouch trust check failed: ${reason}`,
      };
    }

    // Score passes — allow transaction to proceed
    return;
  };

  // ── protectedRequest hook ──

  const protectedRequest = async (ctx: ProtectedRequestContext): Promise<ProtectedRequestResult | void> => {
    // If free access is not configured, skip entirely
    if (freeAccessMinScore === undefined) return;

    const start = Date.now();

    // Extract agent identity from headers
    const headers = extractHeaders(ctx);
    const pubkey = config.identityResolver
      ? await config.identityResolver(headers)
      : headers['x-vouch-npub'] ?? null;

    if (!pubkey) return; // No identity header — proceed to payment flow

    // Validate hex pubkey format
    if (!/^[0-9a-fA-F]{64}$/.test(pubkey)) return;

    const result = await lookupByPubkey(pubkey);
    if (!result) return; // Unknown agent — proceed to payment flow

    const qualifies = result.vouchScore >= freeAccessMinScore;
    const action: TrustAction = qualifies ? 'free_access' : 'allowed';

    emitEvent({
      nostrPubkey: pubkey,
      result,
      action,
      reason: qualifies
        ? `Score ${result.vouchScore} qualifies for free access (min: ${freeAccessMinScore})`
        : `Score ${result.vouchScore} below free access threshold ${freeAccessMinScore}`,
      durationMs: Date.now() - start,
    });

    if (qualifies) {
      return { grantAccess: true };
    }

    // Below free-access threshold but above minimum — proceed to normal payment
    return;
  };

  return {
    beforeVerify,
    protectedRequest,
    clearCache: () => cache.clear(),
  };
}

// ── Helpers ──

function extractHeaders(ctx: ProtectedRequestContext): Record<string, string | undefined> {
  // Handle both Hono-style (ctx.request.headers) and Express-style (ctx.headers)
  const rawHeaders = ctx.request?.headers ?? ctx.headers;

  if (!rawHeaders) return {};

  // If it's a Headers instance (Web API), convert to plain object
  if (typeof (rawHeaders as Headers).get === 'function') {
    const h: Record<string, string | undefined> = {};
    (rawHeaders as Headers).forEach((value, key) => {
      h[key.toLowerCase()] = value;
    });
    return h;
  }

  // Plain object — normalize keys to lowercase
  const h: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawHeaders)) {
    h[key.toLowerCase()] = value;
  }
  return h;
}

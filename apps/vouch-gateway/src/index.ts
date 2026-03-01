// Vouch Gateway — Cloudflare Worker Entry Point
//
// Per-token inference proxy with dual auth and usage metering.
//
// Request flow:
// 1. Extract auth identity: NIP-98 (transparent) or Privacy Token (private)
// 2. Look up consumer trust score (cached in KV) — for rate limits, NOT model gating
// 3. Enforce per-consumer rate limits
// 4. Strip identity headers, forward to upstream provider
// 5. Count tokens from response, compute cost
// 6. Report usage to Vouch API (async) for billing
// 7. Return response with Vouch headers (cost/model info in transparent mode)

import type { Env, TrustTier } from './types';
import { TIER_CONFIGS } from './types';
import {
  resolveAuthIdentity,
  validateNip98Structure,
  verifyNostrEvent,
} from './auth';
import { getConsumerScore } from './scoring';
import { enforceRateLimit } from './rate-limiter';
import { trackRequest } from './anomaly';
import type { RequestRecord } from './anomaly';
import {
  getProviderConfig,
  getUpstreamPath,
  getUpstreamUrl,
  getProviderApiKey,
  extractModelFromRequest,
  isReasoningModel,
} from './providers';
import { extractTokenCounts, reportUsage } from './metering';
import { getPricingTable, estimateCostSats } from './pricing';

// ── Worker Export ──

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/') {
      return jsonResponse({
        status: 'ok',
        service: 'vouch-gateway',
        version: '0.2.0',
        providers: (env.SUPPORTED_PROVIDERS ?? 'anthropic,openai,openrouter').split(','),
        authModes: ['transparent', 'private'],
      });
    }

    // Discovery endpoint — returns gateway capabilities
    if (url.pathname === '/.well-known/vouch-gateway') {
      return jsonResponse({
        version: '0.2.0',
        protocol: 'vouch-nip-98',
        providers: (env.SUPPORTED_PROVIDERS ?? 'anthropic,openai,openrouter').split(','),
        tiers: Object.entries(TIER_CONFIGS).map(([name, config]) => ({
          name,
          minScore: config.minScore,
          rateLimit: isFinite(config.rateLimit) ? config.rateLimit : null,
          models: 'all', // No model gating — all models available to all tiers
        })),
        auth: {
          transparent: {
            header: 'X-Vouch-Auth',
            format: 'Nostr <base64 NIP-98 event>',
          },
          private: {
            header: 'X-Vouch-Auth',
            format: 'PrivacyToken <base64 JSON>',
          },
        },
        billing: {
          model: 'per-token',
          transparent: 'credit-balance',
          private: 'prepaid-batch',
        },
      });
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(env, request.headers.get('Origin') ?? undefined);
    }

    // Safety: prevent DEV_MODE in production
    if (env.DEV_MODE === 'true' && env.ENVIRONMENT === 'production') {
      console.error('[FATAL] DEV_MODE=true in production environment');
      return errorResponse(500, 'CONFIG_ERROR', 'Service misconfigured');
    }

    // ── 0. Request Body Size Limit ──

    const contentLength = parseInt(request.headers.get('Content-Length') ?? '0', 10);
    const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB — generous for large prompts
    if (contentLength > MAX_BODY_BYTES) {
      return errorResponse(413, 'PAYLOAD_TOO_LARGE', `Request body exceeds ${MAX_BODY_BYTES / (1024 * 1024)} MB limit`);
    }

    // ── 1. Resolve Provider ──

    const provider = getProviderConfig(url.pathname);
    if (!provider) {
      return errorResponse(404, 'UNKNOWN_PROVIDER', `No provider found for path: ${url.pathname}. Use /{provider}/... (e.g., /anthropic/v1/messages)`);
    }

    const supportedProviders = (env.SUPPORTED_PROVIDERS ?? 'anthropic,openai,openrouter')
      .split(',')
      .map((p) => p.trim().toLowerCase());
    if (!supportedProviders.includes(provider.id)) {
      return errorResponse(403, 'PROVIDER_DISABLED', `Provider "${provider.id}" is not enabled on this gateway`);
    }

    // ── 2. Extract Identity (Dual Auth) ──

    const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { identity, nostrEvent } = resolveAuthIdentity(request.headers, clientIp);

    let tier: TrustTier = 'restricted';
    let score = 0;
    let totalStakedSats = 0;

    if (identity.mode === 'transparent' && nostrEvent) {
      // Validate NIP-98 structure
      const structErr = validateNip98Structure(
        nostrEvent,
        request.method,
        url.pathname,
      );
      if (structErr) {
        return errorResponse(401, 'INVALID_AUTH', `NIP-98 validation failed: ${structErr}`);
      }

      // Verify signature (skip in dev mode)
      if (env.DEV_MODE !== 'true') {
        const sigValid = await verifyNostrEvent(nostrEvent);
        if (!sigValid) {
          return errorResponse(401, 'INVALID_SIGNATURE', 'Schnorr signature verification failed');
        }
      }

      // Replay protection — MUST be synchronous to prevent race conditions.
      // Two concurrent requests with the same NIP-98 event ID must not both succeed.
      const replayKey = `replay:${nostrEvent.id}`;
      const seen = await env.VOUCH_RATE_LIMITS.get(replayKey);
      if (seen) {
        return errorResponse(401, 'REPLAY_DETECTED', 'NIP-98 event already used');
      }
      await env.VOUCH_RATE_LIMITS.put(replayKey, '1', { expirationTtl: 120 });

      // Look up trust score (for rate limits only, NOT model gating)
      const scoreData = await getConsumerScore(identity.pubkey, env);
      if (scoreData) {
        score = scoreData.score;
        totalStakedSats = scoreData.totalStakedSats;
        tier = scoreData.tier;
      }
    } else if (identity.mode === 'private') {
      // Private mode — use standard tier rate limits (trust is in the prepaid batch)
      tier = 'standard';
    } else if (identity.mode === 'anonymous') {
      // Anonymous users cannot use inference — they must authenticate.
      // This prevents unauthorized consumption of API credits.
      return errorResponse(401, 'AUTH_REQUIRED', 'Authentication required. Provide NIP-98 or PrivacyToken in X-Vouch-Auth header.');
    }

    const tierConfig = TIER_CONFIGS[tier];

    // ── 3. Rate Limiting ──

    const rateResult = await enforceRateLimit(identity.pubkey, tierConfig.rateLimit, env);
    if (!rateResult.allowed) {
      return errorResponse(
        429,
        'RATE_LIMITED',
        `Rate limit exceeded. Limit: ${tierConfig.rateLimit} req/min.`,
        {
          'X-Vouch-Tier': tier,
          'X-Vouch-Rate-Remaining': '0',
          'Retry-After': '60',
        },
      );
    }

    // ── 4. Parse Body and Extract Model ──

    let requestBody: unknown = null;
    let bodyText: string | null = null;
    let model: string | null = null;

    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        bodyText = await request.text();
        requestBody = JSON.parse(bodyText);
        model = extractModelFromRequest(requestBody);
      } catch {
        // Non-JSON body or parse error — forward as-is
      }
    }

    // No model gating — all models available to all tiers
    // UX is #1 priority: best model for the task, period.

    // ── 5. Forward to Upstream Provider ──

    const upstreamBase = getUpstreamUrl(provider, env);
    const upstreamPath = getUpstreamPath(url.pathname);
    const upstreamUrl = `${upstreamBase}${upstreamPath}${url.search}`;

    // Build upstream headers — strip identity, inject provider auth
    const upstreamHeaders = new Headers();

    // Copy safe headers only (strip identity headers for privacy)
    const forwardHeaders = [
      'content-type',
      'accept',
      'anthropic-version',
      'anthropic-beta',
      'x-stainless-arch',
      'x-stainless-lang',
      'x-stainless-os',
      'x-stainless-package-version',
      'x-stainless-runtime',
      'x-stainless-runtime-version',
    ];

    for (const name of forwardHeaders) {
      const value = request.headers.get(name);
      if (value) upstreamHeaders.set(name, value);
    }

    // NEVER forward identity headers to providers
    // X-Forwarded-For, User-Agent, cookies, X-Vouch-Auth — all stripped

    // Set provider API key
    const apiKey = getProviderApiKey(provider, env);
    if (!apiKey) {
      return errorResponse(503, 'PROVIDER_NOT_CONFIGURED', `Provider "${provider.id}" API key not configured`);
    }

    if (provider.id === 'anthropic') {
      upstreamHeaders.set('x-api-key', apiKey);
    } else {
      // OpenAI and OpenRouter both use Bearer auth
      upstreamHeaders.set('Authorization', `Bearer ${apiKey}`);
    }

    // OpenRouter: add site/app headers for attribution
    if (provider.id === 'openrouter') {
      upstreamHeaders.set('HTTP-Referer', 'https://percival-labs.ai');
      upstreamHeaders.set('X-Title', 'Percival Labs Gateway');
    }

    const upstreamRequest: RequestInit = {
      method: request.method,
      headers: upstreamHeaders,
    };

    if (bodyText !== null) {
      upstreamRequest.body = bodyText;
    } else if (request.method === 'POST' || request.method === 'PUT') {
      upstreamRequest.body = request.body;
    }

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(upstreamUrl, upstreamRequest);
    } catch (err) {
      console.error(`[gateway] Upstream request failed for ${provider.id}:`, err);
      return errorResponse(502, 'UPSTREAM_ERROR', `Failed to reach ${provider.id} upstream`);
    }

    // ── 6. Count Tokens + Compute Cost ──

    // Clone the response so we can read the body for token counts
    // while still streaming the original to the client
    let tokenCounts = { inputTokens: 0, outputTokens: 0 };
    let costSats = 0;
    let responseBodyForClient: ReadableStream | ArrayBuffer | string | null = upstreamResponse.body;

    // Only count tokens for successful JSON responses (not streaming)
    const contentType = upstreamResponse.headers.get('content-type') ?? '';
    if (upstreamResponse.ok && contentType.includes('application/json') && model) {
      try {
        const responseText = await upstreamResponse.text();
        const responseJson = JSON.parse(responseText);
        tokenCounts = extractTokenCounts(responseJson, provider.id);

        // Compute estimated cost
        const pricing = await getPricingTable(env);
        costSats = estimateCostSats(pricing, model, tokenCounts.inputTokens, tokenCounts.outputTokens);

        responseBodyForClient = responseText;
      } catch {
        // If we can't parse, just pass through
        responseBodyForClient = upstreamResponse.body;
      }
    }

    // ── 7. Report Usage (Async, Non-Blocking) ──

    if (model && (tokenCounts.inputTokens > 0 || tokenCounts.outputTokens > 0)) {
      ctx.waitUntil(
        reportUsage({
          userNpub: identity.mode === 'transparent' ? identity.pubkey : undefined,
          batchHash: identity.mode === 'private' ? identity.batchHash : undefined,
          tokenHash: identity.mode === 'private' ? identity.tokenHash : undefined,
          model,
          provider: provider.id,
          inputTokens: tokenCounts.inputTokens,
          outputTokens: tokenCounts.outputTokens,
        }, env).catch((err) => {
          console.error('[metering] Usage report failed:', err);
        }),
      );
    }

    // ── 8. Anomaly Detection (Async, Non-Blocking) ──

    if (model) {
      const promptLength = estimatePromptLength(requestBody);
      const anomalyRecord: RequestRecord = {
        timestamp: Date.now(),
        model,
        isReasoning: isReasoningModel(model, provider),
        promptLength,
      };

      ctx.waitUntil(
        trackRequest(identity.pubkey, anomalyRecord, env).then((result) => {
          if (result.flagged) {
            console.warn(
              `[anomaly] Consumer ${identity.pubkey.slice(0, 16)}... flagged:`,
              result.reasons.join('; '),
            );
          }
        }).catch((err) => {
          console.error('[anomaly] Failed to track request:', err);
        }),
      );
    }

    // ── 9. Return Response with Vouch Headers ──

    // For error responses, build clean headers instead of forwarding upstream provider headers.
    // This prevents leaking provider-specific headers (x-request-id, server versions, etc).
    let responseHeaders: Headers;
    if (!upstreamResponse.ok) {
      responseHeaders = new Headers({
        'Content-Type': upstreamResponse.headers.get('Content-Type') ?? 'application/json',
      });
    } else {
      responseHeaders = new Headers(upstreamResponse.headers);
    }

    // Always add privacy mode header
    responseHeaders.set('X-Vouch-Privacy', identity.mode);
    responseHeaders.set('X-Vouch-Tier', tier);
    responseHeaders.set(
      'X-Vouch-Rate-Remaining',
      isFinite(rateResult.remaining) ? String(rateResult.remaining) : 'unlimited',
    );

    // Transparent mode: full visibility into model, cost, tokens
    if (identity.mode === 'transparent') {
      responseHeaders.set('X-Vouch-Score', String(score));
      if (model) responseHeaders.set('X-Vouch-Model', model);
      responseHeaders.set('X-Vouch-Provider', provider.id);
      if (costSats > 0) responseHeaders.set('X-Vouch-Cost-Sats', String(costSats));
      if (tokenCounts.inputTokens > 0) {
        responseHeaders.set('X-Vouch-Input-Tokens', String(tokenCounts.inputTokens));
        responseHeaders.set('X-Vouch-Output-Tokens', String(tokenCounts.outputTokens));
      }
    }
    // Private mode: minimal headers (no identity, no per-request cost)

    // CORS headers
    const allowedOrigins = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const requestOrigin = request.headers.get('Origin') ?? '';
    if (allowedOrigins.length > 0 && allowedOrigins.includes(requestOrigin)) {
      responseHeaders.set('Access-Control-Allow-Origin', requestOrigin);
    } else if (allowedOrigins.length === 0) {
      responseHeaders.delete('Access-Control-Allow-Origin');
    }

    return new Response(responseBodyForClient, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};

// ── Helpers ──

function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  extraHeaders?: Record<string, string>,
): Response {
  return jsonResponse(
    { error: { code, message } },
    status,
    extraHeaders,
  );
}

function corsResponse(env?: Env, requestOrigin?: string): Response {
  const allowedOrigins = (env?.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = (requestOrigin && allowedOrigins.includes(requestOrigin)) ? requestOrigin : '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Vouch-Auth, Authorization, x-api-key, anthropic-version, anthropic-beta',
    'Access-Control-Max-Age': '86400',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(null, { status: 204, headers });
}

/**
 * Estimate prompt length from a request body.
 * Sums the length of all message content strings.
 */
function estimatePromptLength(body: unknown): number {
  if (typeof body !== 'object' || body === null) return 0;
  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj.messages)) return 0;

  let totalLength = 0;
  for (const msg of obj.messages) {
    if (typeof msg === 'object' && msg !== null) {
      const m = msg as Record<string, unknown>;
      if (typeof m.content === 'string') {
        totalLength += m.content.length;
      } else if (Array.isArray(m.content)) {
        for (const block of m.content) {
          if (typeof block === 'object' && block !== null) {
            const b = block as Record<string, unknown>;
            if (typeof b.text === 'string') {
              totalLength += b.text.length;
            }
          }
        }
      }
    }
  }

  if (typeof obj.system === 'string') {
    totalLength += obj.system.length;
  }

  return totalLength;
}

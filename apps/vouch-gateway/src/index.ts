// Vouch Gateway — Cloudflare Worker Entry Point
//
// Trust-tiered proxy for AI provider APIs using the Vouch protocol.
//
// Request flow:
// 1. Extract Vouch identity from X-Vouch-Auth header
// 2. Look up consumer trust score (cached in KV)
// 3. Resolve trust tier and enforce rate limits
// 4. Validate model access for the consumer's tier
// 5. Forward request to upstream provider
// 6. Track usage patterns asynchronously (anomaly detection)
// 7. Return response with Vouch headers

import type { Env, TrustTier } from './types';
import { TIER_CONFIGS } from './types';
import { extractNostrAuth, validateNip98Structure, verifyNostrEvent } from './auth';
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
  isModelAllowed,
  isReasoningModel,
} from './providers';

// ── Worker Export ──

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/') {
      return jsonResponse({
        status: 'ok',
        service: 'vouch-gateway',
        version: '0.1.0',
        providers: (env.SUPPORTED_PROVIDERS ?? 'anthropic,openai').split(','),
      });
    }

    // Discovery endpoint — returns gateway capabilities
    if (url.pathname === '/.well-known/vouch-gateway') {
      return jsonResponse({
        version: '0.1.0',
        protocol: 'vouch-nip-98',
        providers: (env.SUPPORTED_PROVIDERS ?? 'anthropic,openai').split(','),
        tiers: Object.entries(TIER_CONFIGS).map(([name, config]) => ({
          name,
          minScore: config.minScore,
          rateLimit: isFinite(config.rateLimit) ? config.rateLimit : null,
          models: config.allowedModels,
        })),
        auth: {
          header: 'X-Vouch-Auth',
          format: 'Nostr <base64 NIP-98 event>',
          eventKind: 27235,
        },
      });
    }

    // Only POST/GET/PUT/DELETE to provider paths
    if (request.method === 'OPTIONS') {
      return corsResponse(env, request.headers.get('Origin') ?? undefined);
    }

    // Safety: prevent DEV_MODE in production
    if (env.DEV_MODE === 'true' && env.ENVIRONMENT === 'production') {
      console.error('[FATAL] DEV_MODE=true in production environment');
      return errorResponse(500, 'CONFIG_ERROR', 'Service misconfigured');
    }

    // ── 1. Resolve Provider ──

    const provider = getProviderConfig(url.pathname);
    if (!provider) {
      return errorResponse(404, 'UNKNOWN_PROVIDER', `No provider found for path: ${url.pathname}. Use /{provider}/... (e.g., /anthropic/v1/messages)`);
    }

    // Check if provider is in the supported list
    const supportedProviders = (env.SUPPORTED_PROVIDERS ?? 'anthropic,openai')
      .split(',')
      .map((p) => p.trim().toLowerCase());
    if (!supportedProviders.includes(provider.id)) {
      return errorResponse(403, 'PROVIDER_DISABLED', `Provider "${provider.id}" is not enabled on this gateway`);
    }

    // ── 2. Extract Identity ──

    const nostrEvent = extractNostrAuth(request.headers);
    let pubkey: string;
    let tier: TrustTier = 'restricted';
    let score = 0;
    let totalStakedSats = 0;

    if (nostrEvent) {
      // Validate NIP-98 structure
      const structErr = validateNip98Structure(
        nostrEvent,
        request.method,
        url.pathname,
      );
      if (structErr) {
        return errorResponse(401, 'INVALID_AUTH', `NIP-98 validation failed: ${structErr}`);
      }

      // Skip signature verification in dev mode for easier testing
      if (env.DEV_MODE !== 'true') {
        const sigValid = await verifyNostrEvent(nostrEvent);
        if (!sigValid) {
          return errorResponse(401, 'INVALID_SIGNATURE', 'Schnorr signature verification failed');
        }
      }

      // Check for replay (event ID already used)
      const replayKey = `replay:${nostrEvent.id}`;
      const seen = await env.VOUCH_RATE_LIMITS.get(replayKey);
      if (seen) {
        return errorResponse(401, 'REPLAY_DETECTED', 'NIP-98 event already used');
      }
      // Mark as seen (120s TTL > 60s timestamp window)
      ctx.waitUntil(
        env.VOUCH_RATE_LIMITS.put(replayKey, '1', { expirationTtl: 120 })
      );

      pubkey = nostrEvent.pubkey;

      // ── 3. Look Up Trust Score ──
      const scoreData = await getConsumerScore(pubkey, env);
      if (scoreData) {
        score = scoreData.score;
        totalStakedSats = scoreData.totalStakedSats;
        tier = scoreData.tier;
      }
    } else {
      // No Vouch header — anonymous/restricted access
      pubkey = `anon:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`;
    }

    const tierConfig = TIER_CONFIGS[tier];

    // ── 4. Rate Limiting ──

    const rateResult = await enforceRateLimit(pubkey, tierConfig.rateLimit, env);
    if (!rateResult.allowed) {
      return errorResponse(
        429,
        'RATE_LIMITED',
        `Rate limit exceeded for tier "${tier}". Limit: ${tierConfig.rateLimit} req/min.`,
        {
          'X-Vouch-Score': String(score),
          'X-Vouch-Tier': tier,
          'X-Vouch-Rate-Remaining': '0',
          'Retry-After': '60',
        },
      );
    }

    // ── 5. Parse Body and Validate Model Access ──

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

    if (model && !isModelAllowed(model, tier, provider)) {
      const tierDescription = tier === 'restricted'
        ? 'basic models only'
        : tier === 'standard'
          ? 'all models except reasoning/CoT'
          : 'all models including reasoning';

      return errorResponse(
        403,
        'MODEL_DENIED',
        `Model "${model}" is not available at tier "${tier}" (${tierDescription}). Increase your Vouch score and stake to access higher tiers.`,
        {
          'X-Vouch-Score': String(score),
          'X-Vouch-Tier': tier,
          'X-Vouch-Rate-Remaining': String(rateResult.remaining),
        },
      );
    }

    // ── 6. Forward to Upstream Provider ──

    const upstreamBase = getUpstreamUrl(provider, env);
    const upstreamPath = getUpstreamPath(url.pathname);
    const upstreamUrl = `${upstreamBase}${upstreamPath}${url.search}`;

    // Build upstream headers — forward most headers, replace auth
    const upstreamHeaders = new Headers();

    // Copy safe headers from the original request
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
      'user-agent',
    ];

    for (const name of forwardHeaders) {
      const value = request.headers.get(name);
      if (value) upstreamHeaders.set(name, value);
    }

    // Set provider API key
    const apiKey = getProviderApiKey(provider, env);
    if (!apiKey) {
      return errorResponse(503, 'PROVIDER_NOT_CONFIGURED', `Provider "${provider.id}" API key not configured`);
    }

    if (provider.id === 'anthropic') {
      upstreamHeaders.set('x-api-key', apiKey);
    } else if (provider.id === 'openai') {
      upstreamHeaders.set('Authorization', `Bearer ${apiKey}`);
    }

    // Forward the request
    const upstreamRequest: RequestInit = {
      method: request.method,
      headers: upstreamHeaders,
    };

    // Attach body for POST/PUT
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

    // ── 7. Anomaly Detection (Async, Non-Blocking) ──

    if (model) {
      const promptLength = estimatePromptLength(requestBody);
      const anomalyRecord: RequestRecord = {
        timestamp: Date.now(),
        model,
        isReasoning: isReasoningModel(model, provider),
        promptLength,
      };

      // Use waitUntil to avoid blocking the response
      ctx.waitUntil(
        trackRequest(pubkey, anomalyRecord, env).then((result) => {
          if (result.flagged) {
            console.warn(
              `[anomaly] Consumer ${pubkey.slice(0, 16)}... flagged:`,
              result.reasons.join('; '),
            );
            // Future: write flag to KV for scoring module to pick up
          }
        }).catch((err) => {
          console.error('[anomaly] Failed to track request:', err);
        }),
      );
    }

    // ── 8. Return Response with Vouch Headers ──

    const responseHeaders = new Headers(upstreamResponse.headers);

    // Add Vouch headers
    responseHeaders.set('X-Vouch-Score', String(score));
    responseHeaders.set('X-Vouch-Tier', tier);
    responseHeaders.set(
      'X-Vouch-Rate-Remaining',
      isFinite(rateResult.remaining) ? String(rateResult.remaining) : 'unlimited',
    );

    // CORS headers — restrict to configured origins (no wildcard with API key proxying)
    const allowedOrigins = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const requestOrigin = request.headers.get('Origin') ?? '';
    if (allowedOrigins.length > 0 && allowedOrigins.includes(requestOrigin)) {
      responseHeaders.set('Access-Control-Allow-Origin', requestOrigin);
    } else if (allowedOrigins.length === 0) {
      // No origins configured — default to no CORS (safe default)
      responseHeaders.delete('Access-Control-Allow-Origin');
    }

    return new Response(upstreamResponse.body, {
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

  // Both Anthropic and OpenAI use `messages` array
  if (!Array.isArray(obj.messages)) return 0;

  let totalLength = 0;
  for (const msg of obj.messages) {
    if (typeof msg === 'object' && msg !== null) {
      const m = msg as Record<string, unknown>;
      if (typeof m.content === 'string') {
        totalLength += m.content.length;
      } else if (Array.isArray(m.content)) {
        // Anthropic content blocks
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

  // Include system prompt if present
  if (typeof obj.system === 'string') {
    totalLength += obj.system.length;
  }

  return totalLength;
}

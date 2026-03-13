// Vouch Gateway v0.6.0 — Cloudflare Worker Entry Point
//
// Enterprise-grade inference proxy with trust-tiered access, per-agent
// model policies, budget caps, structured audit logging, and self-service APIs.
//
// Request flow:
//  0. Body size limit
//  1. Resolve provider (explicit path or /auto/ model-based routing)
//  2. Extract auth identity (NIP-98 / PrivacyToken / AgentKey)
//  3. Rate limiting (per-consumer, tier-based)
//  4. Parse body → extract model → auto-route resolution
// 4c. Agent model policy enforcement (allowlist check)
// 4d. Budget pre-check (reject if over cap)
//  5. Forward to upstream provider (stripped headers, injected auth)
//  6. Count tokens, compute cost, record budget spend
//  7. Report usage to Vouch API (async)
//  8. Anomaly detection (async)
//  9. Return response with Vouch headers
// 10. Emit structured audit log
//
// Additional APIs:
//  /admin/v1/*  — Platform management (GATEWAY_SECRET auth)
//  /agent/v1/*  — Agent self-service (AgentKey auth)

import type { Env, TrustTier, AgentKeyEntry } from './types';
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
  resolveProviderForModel,
} from './providers';
import type { ProviderConfig } from './types';
import { extractTokenCounts, reportUsage } from './metering';
import { reportToStripeMeter } from './stripe-meter';
import { getPricingTable, estimateCostSats } from './pricing';
import { checkBudget, recordSpend } from './budget';
import type { BudgetConfig } from './types';
import { handleAdminRoute } from './admin';
import { handleAgentRoute } from './agent-api';
import { emitAuditLog, storeAuditEntry, startTimer } from './audit';
import type { AuditAction } from './audit';

// ── Worker Export ──

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const elapsed = startTimer();

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/') {
      return jsonResponse({
        status: 'ok',
        service: 'vouch-gateway',
        version: '0.6.0',
        providers: (env.SUPPORTED_PROVIDERS ?? 'anthropic,openai,openrouter').split(','),
        autoRoute: true,
        authModes: ['transparent', 'private', 'agent-key'],
        capabilities: ['fast', 'code', 'smart', 'reasoning'],
        features: ['model-policies', 'budget-caps', 'admin-api', 'agent-self-service', 'audit-trail', 'capability-routing', 'local-inference'],
      });
    }

    // Discovery endpoint — returns gateway capabilities
    if (url.pathname === '/.well-known/vouch-gateway') {
      return jsonResponse({
        version: '0.6.0',
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
          'agent-key': {
            header: 'X-Vouch-Auth',
            format: 'AgentKey <64-char hex token>',
          },
        },
        billing: {
          model: 'per-token',
          transparent: 'credit-balance',
          private: 'prepaid-batch',
        },
      });
    }

    // Safety: prevent DEV_MODE in production — MUST run before any route dispatch
    // to ensure admin/agent routes also respect this guard.
    if (env.DEV_MODE === 'true' && env.ENVIRONMENT === 'production') {
      console.error('[FATAL] DEV_MODE=true in production environment');
      return errorResponse(500, 'CONFIG_ERROR', 'Service misconfigured');
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(env, request.headers.get('Origin') ?? undefined);
    }

    // ── Admin API ──
    // Handles /admin/v1/* routes for agent key management.
    // Authenticated via GATEWAY_SECRET header.
    if (url.pathname.startsWith('/admin/')) {
      const adminResponse = await handleAdminRoute(request, url.pathname, env);
      if (adminResponse) return adminResponse;
    }

    // ── Agent Self-Service API ──
    // Handles /agent/v1/* routes (budget, usage, models).
    // Authenticated via AgentKey header.
    if (url.pathname.startsWith('/agent/')) {
      // Extract AgentKey from header
      const authHeader = request.headers.get('X-Vouch-Auth') ?? '';
      const agentKeyMatch = authHeader.match(/^AgentKey\s+([a-f0-9]{64})$/i);
      if (!agentKeyMatch) {
        return errorResponse(401, 'AUTH_REQUIRED', 'AgentKey authentication required for /agent/* endpoints');
      }
      const token = agentKeyMatch[1]!;
      const raw = await env.VOUCH_AGENT_KEYS.get(`agentkey:${token}`);
      if (!raw) {
        return errorResponse(401, 'INVALID_AGENT_KEY', 'Agent key not found');
      }
      const entry = JSON.parse(raw) as AgentKeyEntry;
      const agentResponse = await handleAgentRoute(request, url.pathname, entry, env);
      if (agentResponse) return agentResponse;
      return errorResponse(404, 'NOT_FOUND', `Unknown agent endpoint: ${url.pathname}`);
    }

    // ── 0. Request Body Size Limit ──

    const contentLength = parseInt(request.headers.get('Content-Length') ?? '0', 10);
    const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB — generous for large prompts
    if (contentLength > MAX_BODY_BYTES) {
      return errorResponse(413, 'PAYLOAD_TOO_LARGE', `Request body exceeds ${MAX_BODY_BYTES / (1024 * 1024)} MB limit`);
    }

    // ── 1. Resolve Provider ──

    const providerOrAuto = getProviderConfig(url.pathname);
    if (!providerOrAuto) {
      return errorResponse(404, 'UNKNOWN_PROVIDER', `No provider found for path: ${url.pathname}. Use /{provider}/... (e.g., /anthropic/v1/messages) or /auto/... for auto-routing`);
    }

    // Auto-routing is resolved after body parsing (needs model name).
    // For explicit providers, validate they're enabled.
    let provider: ProviderConfig | null = null;
    let autoRoute: { upstreamModel: string; format: 'anthropic' | 'openai' } | null = null;
    const isAutoRoute = providerOrAuto === 'auto';

    if (!isAutoRoute) {
      provider = providerOrAuto;
      const supportedProviders = (env.SUPPORTED_PROVIDERS ?? 'anthropic,openai,openrouter')
        .split(',')
        .map((p) => p.trim().toLowerCase());
      if (!supportedProviders.includes(provider.id)) {
        return errorResponse(403, 'PROVIDER_DISABLED', `Provider "${provider.id}" is not enabled on this gateway`);
      }
    }

    // ── 2. Extract Identity (Dual Auth) ──

    const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { identity, nostrEvent, agentKeyToken } = await resolveAuthIdentity(request.headers, clientIp, env);

    let tier: TrustTier = 'restricted';
    let score = 0;
    let totalStakedSats = 0;
    let agentKeyEntry: AgentKeyEntry | null = null;

    if (identity.mode === 'transparent' && nostrEvent) {
      // Validate NIP-98 structure
      const structErr = validateNip98Structure(
        nostrEvent,
        request.method,
        url.pathname,
        env.ENVIRONMENT,
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
    } else if (identity.mode === 'agent-key' && agentKeyToken) {
      // Agent key mode — long-lived token mapped to agent pubkey
      const kvKey = `agentkey:${agentKeyToken}`;
      const entry = await env.VOUCH_AGENT_KEYS.get<AgentKeyEntry>(kvKey, 'json');

      if (!entry || typeof entry.pubkey !== 'string' || typeof entry.agentId !== 'string') {
        const failEntry = { timestamp: new Date().toISOString(), action: 'auth:failed' as const, authMode: 'agent-key', pubkey: '', status: 401, reason: 'Agent key not found or revoked', durationMs: elapsed() };
        emitAuditLog(failEntry);
        ctx.waitUntil(storeAuditEntry(failEntry, env).catch(() => {}));
        return errorResponse(401, 'INVALID_AGENT_KEY', 'Agent key not found or revoked');
      }

      // Store entry for model policy + budget enforcement later
      agentKeyEntry = entry;

      // Resolve identity to the agent's pubkey
      identity.pubkey = entry.pubkey;

      // AgentKeys default to 'standard' tier — agents should work out of the box.
      // Entry can override with a specific tier. Vouch score lookup is secondary.
      tier = entry.tier ?? 'standard';

      // Also try Vouch score — if agent has a pubkey, it may upgrade the tier
      const scoreData = identity.pubkey
        ? await getConsumerScore(identity.pubkey, env)
        : null;
      if (scoreData) {
        score = scoreData.score;
        totalStakedSats = scoreData.totalStakedSats;
        // Use whichever tier is higher: entry override or score-based
        const scoreTier = scoreData.tier;
        const tierRank: Record<string, number> = { restricted: 0, standard: 1, elevated: 2, unlimited: 3 };
        if ((tierRank[scoreTier] ?? 0) > (tierRank[tier] ?? 0)) {
          tier = scoreTier;
        }
      }
    } else if (identity.mode === 'private') {
      // Private mode — use standard tier rate limits (trust is in the prepaid batch)
      tier = 'standard';
    } else if (identity.mode === 'anonymous') {
      // Anonymous users cannot use inference — they must authenticate.
      // This prevents unauthorized consumption of API credits.
      const anonEntry = { timestamp: new Date().toISOString(), action: 'auth:failed' as const, authMode: 'anonymous', pubkey: identity.pubkey, status: 401, reason: 'No authentication provided', durationMs: elapsed() };
      emitAuditLog(anonEntry);
      ctx.waitUntil(storeAuditEntry(anonEntry, env).catch(() => {}));
      return errorResponse(401, 'AUTH_REQUIRED', 'Authentication required. Provide NIP-98 or PrivacyToken in X-Vouch-Auth header.');
    }

    const tierConfig = TIER_CONFIGS[tier];

    // ── 3. Rate Limiting ──

    const rateResult = await enforceRateLimit(identity.pubkey, tierConfig.rateLimit, env);
    if (!rateResult.allowed) {
      const rateEntry = { timestamp: new Date().toISOString(), action: 'rate:limited' as const, authMode: identity.mode, pubkey: identity.pubkey, status: 429, tier, reason: `Limit ${tierConfig.rateLimit} req/min`, durationMs: elapsed() };
      emitAuditLog(rateEntry);
      ctx.waitUntil(storeAuditEntry(rateEntry, env).catch(() => {}));
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

    // ── 4b. Resolve Auto-Route (if /auto/ path) ──

    if (isAutoRoute) {
      if (!model) {
        return errorResponse(400, 'MODEL_REQUIRED', 'Auto-routing requires a "model" field in the request body');
      }

      const resolved = resolveProviderForModel(model, env);
      if (!resolved) {
        return errorResponse(404, 'NO_PROVIDER', `No available provider for model: ${model}`);
      }

      provider = resolved.provider;
      autoRoute = { upstreamModel: resolved.upstreamModel, format: resolved.format };

      // Rewrite model name in the request body if needed
      if (resolved.upstreamModel !== model && requestBody && bodyText) {
        (requestBody as Record<string, unknown>).model = resolved.upstreamModel;
        bodyText = JSON.stringify(requestBody);
      }
    }

    if (!provider) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Provider resolution failed');
    }

    // ── 4c. Agent Model Policy ──
    // If the agent key has a model allowlist, enforce it.
    // Also apply default model if request didn't specify one.

    if (agentKeyEntry) {
      // Apply default model if none specified
      if (!model && agentKeyEntry.defaultModel && requestBody) {
        model = agentKeyEntry.defaultModel;
        (requestBody as Record<string, unknown>).model = model;
        bodyText = JSON.stringify(requestBody);
      }

      // Enforce model allowlist (filter out empty entries from misconfigured KV data)
      const allowedModels = agentKeyEntry.models?.filter(m => m.length > 0);
      if (model && allowedModels && allowedModels.length > 0) {
        // Check both exact match and bare-name match (e.g., "claude-sonnet-4" matches "anthropic/claude-sonnet-4")
        const bareModel = model.includes('/') ? model.split('/').pop()! : model;
        const allowed = allowedModels.some(m => {
          const bareAllowed = m.includes('/') ? m.split('/').pop()! : m;
          return m === model || bareAllowed === bareModel;
        });

        if (!allowed) {
          const modelEntry = { timestamp: new Date().toISOString(), action: 'model:blocked' as const, authMode: identity.mode, pubkey: identity.pubkey, agentId: agentKeyEntry.agentId, model, status: 403, reason: `Not in allowlist: ${allowedModels.join(', ')}`, durationMs: elapsed() };
          emitAuditLog(modelEntry);
          ctx.waitUntil(storeAuditEntry(modelEntry, env).catch(() => {}));
          return errorResponse(403, 'MODEL_NOT_ALLOWED',
            `Model "${model}" is not in this agent's allowed models. Allowed: ${allowedModels.join(', ')}`);
        }
      }
    }

    // ── 4d. Budget Pre-Check ──
    // Reject early if agent is already over budget (saves upstream call costs).

    if (agentKeyEntry?.budget &&
        typeof agentKeyEntry.budget.maxSats === 'number' && agentKeyEntry.budget.maxSats > 0 &&
        typeof agentKeyEntry.budget.periodDays === 'number' && agentKeyEntry.budget.periodDays > 0) {
      const budgetResult = await checkBudget(identity.pubkey, agentKeyEntry.budget, env);
      if (!budgetResult.allowed) {
        const periodDays = agentKeyEntry.budget.periodDays;
        const periodLabel = periodDays === 30 ? 'monthly' : periodDays === 7 ? 'weekly' : `${periodDays}-day`;
        const budgetEntry = { timestamp: new Date().toISOString(), action: 'budget:exceeded' as const, authMode: identity.mode, pubkey: identity.pubkey, agentId: agentKeyEntry.agentId, model: model ?? undefined, status: 402, costSats: budgetResult.spentSats, reason: `${budgetResult.spentSats}/${agentKeyEntry.budget.maxSats} sats (${periodLabel})`, durationMs: elapsed() };
        emitAuditLog(budgetEntry);
        ctx.waitUntil(storeAuditEntry(budgetEntry, env).catch(() => {}));
        return errorResponse(402, 'BUDGET_EXCEEDED',
          `Agent budget exhausted. ${budgetResult.spentSats} / ${agentKeyEntry.budget.maxSats} sats spent this ${periodLabel} period.`,
          {
            'X-Vouch-Budget-Spent': String(budgetResult.spentSats),
            'X-Vouch-Budget-Max': String(agentKeyEntry.budget.maxSats),
            'X-Vouch-Budget-Remaining': '0',
          },
        );
      }
    }

    // ── 5. Forward to Upstream Provider ──

    let upstreamPath: string;
    if (isAutoRoute) {
      // For auto-routing, determine the correct API path based on provider
      if (provider.id === 'anthropic') {
        upstreamPath = '/v1/messages';
      } else if (provider.id === 'ollama') {
        upstreamPath = '/v1/chat/completions';
      } else {
        upstreamPath = '/v1/chat/completions';
      }
    } else {
      upstreamPath = getUpstreamPath(url.pathname);
    }

    const upstreamBase = getUpstreamUrl(provider, env);
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

    // Set provider API key (Ollama doesn't need one)
    if (provider.id !== 'ollama') {
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

    // ── 6b. Record Budget Spend ──

    if (agentKeyEntry?.budget && costSats > 0 &&
        agentKeyEntry.budget.maxSats > 0 && agentKeyEntry.budget.periodDays > 0) {
      ctx.waitUntil(
        recordSpend(identity.pubkey, costSats, agentKeyEntry.budget, env).catch((err) => {
          console.error('[budget] Failed to record spend:', err);
        }),
      );
    }

    // ── 7. Report Usage (Async, Non-Blocking) ──

    if (model && (tokenCounts.inputTokens > 0 || tokenCounts.outputTokens > 0)) {
      ctx.waitUntil(
        reportUsage({
          userNpub: (identity.mode === 'transparent' || identity.mode === 'agent-key') ? identity.pubkey : undefined,
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

    // ── 7b. Stripe Meter Billing (Async, Non-Blocking) ──

    if (model && agentKeyEntry?.stripeCustomerId &&
        (tokenCounts.inputTokens > 0 || tokenCounts.outputTokens > 0)) {
      ctx.waitUntil(
        reportToStripeMeter(env, {
          stripeCustomerId: agentKeyEntry.stripeCustomerId,
          model,
          inputTokens: tokenCounts.inputTokens,
          outputTokens: tokenCounts.outputTokens,
        }).catch((err) => {
          console.error('[stripe-meter] Meter event failed:', err);
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

    // Transparent/AgentKey mode: full visibility into model, cost, tokens
    if (identity.mode === 'transparent' || identity.mode === 'agent-key') {
      responseHeaders.set('X-Vouch-Score', String(score));
      if (model) responseHeaders.set('X-Vouch-Model', model);
      responseHeaders.set('X-Vouch-Provider', provider.id);
      if (costSats > 0) responseHeaders.set('X-Vouch-Cost-Sats', String(costSats));
      if (tokenCounts.inputTokens > 0) {
        responseHeaders.set('X-Vouch-Input-Tokens', String(tokenCounts.inputTokens));
        responseHeaders.set('X-Vouch-Output-Tokens', String(tokenCounts.outputTokens));
      }
      // Budget visibility — agents can self-monitor spend
      if (agentKeyEntry?.budget) {
        responseHeaders.set('X-Vouch-Budget-Max', String(agentKeyEntry.budget.maxSats));
        // Approximate remaining (actual state is async-updated)
        if (costSats > 0) {
          responseHeaders.set('X-Vouch-Budget-Cost', String(costSats));
        }
      }
    }
    // Private mode: minimal headers (no identity, no per-request cost)

    // CORS headers — token-based auth (AgentKey/NIP-98) so origin doesn't matter for security
    const allowedOrigins = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const requestOrigin = request.headers.get('Origin') ?? '';
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      responseHeaders.set('Access-Control-Allow-Origin', requestOrigin);
    } else {
      responseHeaders.set('Access-Control-Allow-Origin', '*');
    }

    // ── 10. Audit Log ──

    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'inference' as const,
      authMode: identity.mode,
      pubkey: identity.pubkey,
      agentId: agentKeyEntry?.agentId,
      model: model ?? undefined,
      provider: provider.id,
      status: upstreamResponse.status,
      inputTokens: tokenCounts.inputTokens || undefined,
      outputTokens: tokenCounts.outputTokens || undefined,
      costSats: costSats || undefined,
      tier,
      durationMs: elapsed(),
    };

    emitAuditLog(auditEntry);
    ctx.waitUntil(
      storeAuditEntry(auditEntry, env).catch((err) => {
        console.error('[audit] Failed to store audit entry:', err);
      }),
    );

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
    'Access-Control-Allow-Origin': '*',
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
  // If request origin is in the allowlist, reflect it. Otherwise default to '*'
  // because Gateway auth is token-based (AgentKey/NIP-98), not cookie-based,
  // so CORS origin restrictions don't add meaningful security.
  const origin = (requestOrigin && allowedOrigins.includes(requestOrigin))
    ? requestOrigin
    : '*';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Vouch-Auth, Authorization, x-api-key, anthropic-version, anthropic-beta',
    'Access-Control-Max-Age': '86400',
  };
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
  // Cap iteration to prevent CPU abuse from pathological payloads
  const maxMessages = Math.min(obj.messages.length, 1000);
  for (let mi = 0; mi < maxMessages; mi++) {
    const msg = obj.messages[mi];
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

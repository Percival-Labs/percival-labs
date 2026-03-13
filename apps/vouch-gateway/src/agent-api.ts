// Vouch Gateway — Agent Self-Service API
//
// Endpoints agents call to query their own status, usage, and policies.
// Auth: AgentKey header — agents can only see their own data.
//
// Routes (all under /agent/v1/):
//   GET /agent/v1/me           — Agent's own key entry (models, tier, budget config)
//   GET /agent/v1/me/budget    — Current budget spend and remaining
//   GET /agent/v1/me/usage     — Recent usage summary (from anomaly data)
//   GET /agent/v1/me/audit     — Agent's own audit trail (query: ?action=inference&since=ISO&limit=50)
//   GET /agent/v1/models       — List of models available to this agent

import type { Env, AgentKeyEntry, BudgetState, AnomalyData } from './types';
import { getAuditHistory } from './audit';
import type { AuditAction } from './audit';

// ── Route Handler ──

export async function handleAgentRoute(
  request: Request,
  path: string,
  agentKeyEntry: AgentKeyEntry | null,
  env: Env,
): Promise<Response | null> {
  if (!path.startsWith('/agent/v1/')) return null;
  if (request.method !== 'GET') return null;

  if (!agentKeyEntry) {
    return jsonResponse({
      error: { code: 'AGENT_AUTH_REQUIRED', message: 'Agent self-service API requires AgentKey authentication' },
    }, 401);
  }

  const subPath = path.slice('/agent/v1'.length);

  switch (subPath) {
    case '/me':
      return handleMe(agentKeyEntry);
    case '/me/budget':
      return handleMyBudget(agentKeyEntry, env);
    case '/me/usage':
      return handleMyUsage(agentKeyEntry, env);
    case '/me/audit':
      return handleMyAudit(agentKeyEntry, request, env);
    case '/models':
      return handleMyModels(agentKeyEntry, env);
    default:
      return jsonResponse({
        error: { code: 'NOT_FOUND', message: `Unknown agent route: ${subPath}` },
      }, 404);
  }
}

// ── Handlers ──

function handleMe(entry: AgentKeyEntry): Response {
  return jsonResponse({
    agentId: entry.agentId,
    name: entry.name,
    tier: entry.tier ?? 'standard',
    models: entry.models ?? 'all',
    defaultModel: entry.defaultModel ?? null,
    hasBudget: !!entry.budget,
    budgetConfig: entry.budget ?? null,
    createdAt: entry.createdAt,
  });
}

async function handleMyBudget(entry: AgentKeyEntry, env: Env): Promise<Response> {
  if (!entry.budget) {
    return jsonResponse({
      hasBudget: false,
      message: 'No budget configured — unlimited spend allowed',
    });
  }

  const MS_PER_DAY = 86_400_000;
  const now = Date.now();
  const periodMs = entry.budget.periodDays * MS_PER_DAY;

  const budgetState = await env.VOUCH_RATE_LIMITS.get<BudgetState>(`budget:${entry.pubkey}`, 'json');

  let spentSats = 0;
  let periodStart = now;

  if (budgetState && now - budgetState.periodStart < periodMs) {
    spentSats = budgetState.spentSats;
    periodStart = budgetState.periodStart;
  }

  const remaining = Math.max(0, entry.budget.maxSats - spentSats);
  const percentUsed = entry.budget.maxSats > 0
    ? Math.round((spentSats / entry.budget.maxSats) * 100)
    : 0;

  return jsonResponse({
    hasBudget: true,
    maxSats: entry.budget.maxSats,
    periodDays: entry.budget.periodDays,
    spentSats,
    remainingSats: remaining,
    percentUsed,
    periodStart: new Date(periodStart).toISOString(),
    periodEnds: new Date(periodStart + periodMs).toISOString(),
    // Actionable signal: warn when >80% used
    warning: percentUsed >= 80 ? `Budget ${percentUsed}% used — ${remaining} sats remaining` : null,
  });
}

async function handleMyUsage(entry: AgentKeyEntry, env: Env): Promise<Response> {
  const anomalyData = await env.VOUCH_ANOMALY.get<AnomalyData>(`anomaly:${entry.pubkey}`, 'json');

  if (!anomalyData) {
    return jsonResponse({
      totalRequests: 0,
      modelsUsed: [],
      message: 'No usage data yet',
    });
  }

  // Compute hourly breakdown for the last 24h
  const hourKeys = Object.keys(anomalyData.hourlyRequests).sort();
  const hourlyBreakdown = hourKeys.map(k => ({
    hour: new Date(parseInt(k) * 3_600_000).toISOString(),
    requests: anomalyData.hourlyRequests[k],
  }));

  // Average prompt length
  const avgPromptLength = anomalyData.promptLengths.length > 0
    ? Math.round(anomalyData.promptLengths.reduce((a, b) => a + b, 0) / anomalyData.promptLengths.length)
    : 0;

  return jsonResponse({
    totalRequests: anomalyData.totalRequests,
    reasoningRequests: anomalyData.reasoningRequests,
    modelsUsed: anomalyData.modelsUsed,
    avgPromptLength,
    windowStart: new Date(anomalyData.windowStart).toISOString(),
    hourlyBreakdown,
  });
}

async function handleMyAudit(entry: AgentKeyEntry, request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const rawAction = url.searchParams.get('action');
  const validActions: AuditAction[] = ['inference', 'admin:list', 'admin:get', 'admin:create', 'admin:update', 'admin:delete', 'agent:query', 'auth:failed', 'rate:limited', 'budget:exceeded', 'model:blocked', 'anomaly:flagged'];
  const action = rawAction && validActions.includes(rawAction as AuditAction) ? rawAction as AuditAction : undefined;
  const since = url.searchParams.get('since');
  const rawLimit = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50;

  const entries = await getAuditHistory(entry.pubkey, env, {
    action,
    since: since ?? undefined,
    limit: Math.min(limit, 200),
  });

  return jsonResponse({
    agentId: entry.agentId,
    count: entries.length,
    entries,
  });
}

async function handleMyModels(entry: AgentKeyEntry, env: Env): Promise<Response> {
  // If agent has a model allowlist, return it.
  // Otherwise, return available providers as guidance.
  const providers = (env.SUPPORTED_PROVIDERS ?? 'anthropic,openai,openrouter').split(',').map(p => p.trim());

  if (entry.models && entry.models.length > 0) {
    return jsonResponse({
      policy: 'allowlist',
      allowedModels: entry.models,
      defaultModel: entry.defaultModel ?? entry.models[0],
      providers,
    });
  }

  return jsonResponse({
    policy: 'unrestricted',
    allowedModels: 'all',
    defaultModel: entry.defaultModel ?? null,
    providers,
    hint: 'Use /auto/v1/chat/completions with any model name for auto-routing',
  });
}

// ── Helpers ──

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

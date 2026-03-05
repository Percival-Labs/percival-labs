// Vouch Gateway — Admin API
//
// Authenticated management endpoints for agent keys and budget queries.
// Auth: GATEWAY_SECRET header — only the platform operator can manage keys.
//
// Routes (all under /admin/v1/):
//   GET    /admin/v1/agents                — List all agent keys (paginated via prefix scan)
//   GET    /admin/v1/agents/:token         — Get a specific agent key entry
//   PUT    /admin/v1/agents/:token         — Create or update an agent key
//   DELETE /admin/v1/agents/:token         — Revoke an agent key
//   GET    /admin/v1/agents/:token/budget  — Get current budget spend for an agent

import type { Env, AgentKeyEntry, BudgetState, BudgetConfig } from './types';

// ── Auth ──

function validateAdminAuth(request: Request, env: Env): boolean {
  const secret = env.GATEWAY_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('X-Gateway-Secret');
  if (!authHeader) return false;

  // Constant-time comparison to prevent timing attacks
  if (authHeader.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < secret.length; i++) {
    mismatch |= authHeader.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}

// ── Route Handler ──

export async function handleAdminRoute(
  request: Request,
  path: string,
  env: Env,
): Promise<Response | null> {
  // Only handle /admin/v1/ routes
  if (!path.startsWith('/admin/v1/')) return null;

  // Auth check — all admin routes require GATEWAY_SECRET
  if (!validateAdminAuth(request, env)) {
    return jsonResponse({ error: { code: 'ADMIN_AUTH_REQUIRED', message: 'Invalid or missing X-Gateway-Secret header' } }, 401);
  }

  const subPath = path.slice('/admin/v1'.length); // e.g., /agents, /agents/:token, /agents/:token/budget

  // GET /admin/v1/agents — List agent keys
  if (subPath === '/agents' && request.method === 'GET') {
    return handleListAgents(env);
  }

  // Match /agents/:token and /agents/:token/budget
  const agentMatch = subPath.match(/^\/agents\/([0-9a-f]{64})(\/budget)?$/);
  if (agentMatch) {
    const token = agentMatch[1]!;
    const isBudget = !!agentMatch[2];

    if (isBudget && request.method === 'GET') {
      return handleGetBudget(token, env);
    }

    switch (request.method) {
      case 'GET':
        return handleGetAgent(token, env);
      case 'PUT':
        return handlePutAgent(token, request, env);
      case 'DELETE':
        return handleDeleteAgent(token, env);
    }
  }

  return jsonResponse({ error: { code: 'NOT_FOUND', message: `Unknown admin route: ${request.method} ${subPath}` } }, 404);
}

// ── Handlers ──

async function handleListAgents(env: Env): Promise<Response> {
  // KV list with prefix scan — returns all agent keys
  // Note: KV list has a 1000-key limit per call. For now, sufficient.
  const list = await env.VOUCH_AGENT_KEYS.list({ prefix: 'agentkey:' });

  const agents: Array<{ token: string; entry: AgentKeyEntry | null }> = [];
  for (const key of list.keys) {
    const token = key.name.slice('agentkey:'.length);
    const entry = await env.VOUCH_AGENT_KEYS.get<AgentKeyEntry>(key.name, 'json');
    agents.push({ token: maskToken(token), entry });
  }

  return jsonResponse({ agents, count: agents.length });
}

async function handleGetAgent(token: string, env: Env): Promise<Response> {
  const entry = await env.VOUCH_AGENT_KEYS.get<AgentKeyEntry>(`agentkey:${token}`, 'json');
  if (!entry) {
    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Agent key not found' } }, 404);
  }

  return jsonResponse({ token: maskToken(token), entry });
}

async function handlePutAgent(token: string, request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } }, 400);
  }

  if (typeof body !== 'object' || body === null) {
    return jsonResponse({ error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' } }, 400);
  }

  const obj = body as Record<string, unknown>;

  // Validate required fields
  if (typeof obj.pubkey !== 'string' || !/^[0-9a-f]{64}$/.test(obj.pubkey)) {
    return jsonResponse({ error: { code: 'INVALID_FIELD', message: 'pubkey must be a 64-char hex string' } }, 400);
  }
  if (typeof obj.agentId !== 'string' || obj.agentId.length === 0 || obj.agentId.length > 128) {
    return jsonResponse({ error: { code: 'INVALID_FIELD', message: 'agentId must be a non-empty string (max 128 chars)' } }, 400);
  }
  if (typeof obj.name !== 'string' || obj.name.length === 0 || obj.name.length > 256) {
    return jsonResponse({ error: { code: 'INVALID_FIELD', message: 'name must be a non-empty string (max 256 chars)' } }, 400);
  }

  // Validate optional fields
  const validTiers = ['restricted', 'standard', 'elevated', 'unlimited'];
  if (obj.tier !== undefined && (typeof obj.tier !== 'string' || !validTiers.includes(obj.tier))) {
    return jsonResponse({ error: { code: 'INVALID_FIELD', message: `tier must be one of: ${validTiers.join(', ')}` } }, 400);
  }

  if (obj.models !== undefined) {
    if (!Array.isArray(obj.models) || !obj.models.every((m: unknown) => typeof m === 'string')) {
      return jsonResponse({ error: { code: 'INVALID_FIELD', message: 'models must be an array of strings' } }, 400);
    }
    if (obj.models.length > 100) {
      return jsonResponse({ error: { code: 'INVALID_FIELD', message: 'models array cannot exceed 100 entries' } }, 400);
    }
  }

  if (obj.defaultModel !== undefined && typeof obj.defaultModel !== 'string') {
    return jsonResponse({ error: { code: 'INVALID_FIELD', message: 'defaultModel must be a string' } }, 400);
  }

  if (obj.budget !== undefined) {
    const budget = obj.budget as Record<string, unknown>;
    if (typeof budget !== 'object' || budget === null) {
      return jsonResponse({ error: { code: 'INVALID_FIELD', message: 'budget must be an object with maxSats and periodDays' } }, 400);
    }
    if (typeof budget.maxSats !== 'number' || budget.maxSats <= 0 || !Number.isFinite(budget.maxSats)) {
      return jsonResponse({ error: { code: 'INVALID_FIELD', message: 'budget.maxSats must be a positive number' } }, 400);
    }
    if (typeof budget.periodDays !== 'number' || budget.periodDays <= 0 || !Number.isInteger(budget.periodDays) || budget.periodDays > 365) {
      return jsonResponse({ error: { code: 'INVALID_FIELD', message: 'budget.periodDays must be a positive integer (max 365)' } }, 400);
    }
  }

  // Build the entry
  const entry: AgentKeyEntry = {
    pubkey: obj.pubkey as string,
    agentId: obj.agentId as string,
    name: obj.name as string,
    createdAt: (typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString()),
  };

  if (obj.tier) entry.tier = obj.tier as AgentKeyEntry['tier'];
  if (obj.models) entry.models = obj.models as string[];
  if (obj.defaultModel) entry.defaultModel = obj.defaultModel as string;
  if (obj.budget) entry.budget = obj.budget as BudgetConfig;

  await env.VOUCH_AGENT_KEYS.put(`agentkey:${token}`, JSON.stringify(entry));

  return jsonResponse({ ok: true, token: maskToken(token), entry }, 200);
}

async function handleDeleteAgent(token: string, env: Env): Promise<Response> {
  const existing = await env.VOUCH_AGENT_KEYS.get(`agentkey:${token}`);
  if (!existing) {
    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Agent key not found' } }, 404);
  }

  await env.VOUCH_AGENT_KEYS.delete(`agentkey:${token}`);

  // Also clean up budget state
  const entry = JSON.parse(existing) as AgentKeyEntry;
  if (entry.pubkey) {
    await env.VOUCH_RATE_LIMITS.delete(`budget:${entry.pubkey}`);
  }

  return jsonResponse({ ok: true, deleted: maskToken(token) });
}

async function handleGetBudget(token: string, env: Env): Promise<Response> {
  const entry = await env.VOUCH_AGENT_KEYS.get<AgentKeyEntry>(`agentkey:${token}`, 'json');
  if (!entry) {
    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Agent key not found' } }, 404);
  }

  if (!entry.budget) {
    return jsonResponse({
      agent: entry.agentId,
      budget: null,
      message: 'No budget configured for this agent (unlimited spend)',
    });
  }

  // Fetch current spend state
  const budgetState = await env.VOUCH_RATE_LIMITS.get<BudgetState>(`budget:${entry.pubkey}`, 'json');

  const MS_PER_DAY = 86_400_000;
  const now = Date.now();
  const periodMs = entry.budget.periodDays * MS_PER_DAY;

  // Check if period has expired
  let currentSpent = 0;
  let periodStart = now;
  let periodEnds = now + periodMs;

  if (budgetState && now - budgetState.periodStart < periodMs) {
    currentSpent = budgetState.spentSats;
    periodStart = budgetState.periodStart;
    periodEnds = budgetState.periodStart + periodMs;
  }

  const remaining = Math.max(0, entry.budget.maxSats - currentSpent);
  const percentUsed = entry.budget.maxSats > 0
    ? Math.round((currentSpent / entry.budget.maxSats) * 100)
    : 0;

  return jsonResponse({
    agent: entry.agentId,
    budget: {
      maxSats: entry.budget.maxSats,
      periodDays: entry.budget.periodDays,
      spentSats: currentSpent,
      remainingSats: remaining,
      percentUsed,
      periodStart: new Date(periodStart).toISOString(),
      periodEnds: new Date(periodEnds).toISOString(),
      lastUpdated: budgetState?.lastUpdated
        ? new Date(budgetState.lastUpdated).toISOString()
        : null,
    },
  });
}

// ── Helpers ──

/** Mask a token for display — show first 8 and last 4 chars */
function maskToken(token: string): string {
  if (token.length <= 12) return token;
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Trust score routes — view, refresh trust breakdowns, contagion, regime detection

import { Hono } from 'hono';
import { success, error } from '../lib/response';
import type { AppEnv } from '../middleware/verify-signature';
import {
  calculateUserTrust,
  calculateAgentTrust,
  refreshTrustScore,
} from '../services/trust-service';
import {
  getStakeGraph,
  getContagionHistory,
  getRegimeAlerts,
  getExposure,
  getLatestBom,
  runSecurityScan,
} from '../services/trust-contagion-service';
import type { ToolDefinition } from '../services/trust-contagion-service';

const TRUST_CONTAGION_ENABLED = process.env.TRUST_CONTAGION_ENABLED === 'true';

const app = new Hono<AppEnv>();

// ── GET /users/:id — Trust score breakdown for a user ──
app.get('/users/:id', async (c) => {
  const userId = c.req.param('id');
  try {
    const breakdown = await calculateUserTrust(userId);
    if (!breakdown) return error(c, 404, 'NOT_FOUND', 'User not found');
    return success(c, breakdown);
  } catch (err) {
    console.error(`[api] GET /v1/trust/users/${userId} error:`, err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to compute trust score');
  }
});

// ── GET /agents/:id — Trust score breakdown for an agent ──
app.get('/agents/:id', async (c) => {
  const agentId = c.req.param('id');
  try {
    const breakdown = await calculateAgentTrust(agentId);
    if (!breakdown) return error(c, 404, 'NOT_FOUND', 'Agent not found');
    return success(c, breakdown);
  } catch (err) {
    console.error(`[api] GET /v1/trust/agents/${agentId} error:`, err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to compute trust score');
  }
});

// ── POST /refresh/:id — Recalculate and persist trust score (self only) ──
app.post('/refresh/:id', async (c) => {
  const subjectId = c.req.param('id');
  const callerId = c.get('verifiedAgentId');
  if (callerId !== subjectId) {
    return error(c, 403, 'FORBIDDEN', 'Agents can only refresh their own trust score');
  }
  try {
    const body = await c.req.json<{ subject_type: 'user' | 'agent' }>();
    if (!body.subject_type || (body.subject_type !== 'user' && body.subject_type !== 'agent')) {
      return error(c, 400, 'VALIDATION_ERROR', 'subject_type must be "user" or "agent"', [
        { field: 'subject_type', issue: 'must be "user" or "agent"' },
      ]);
    }
    const breakdown = await refreshTrustScore(subjectId, body.subject_type);
    if (!breakdown) {
      return error(c, 404, 'NOT_FOUND', `${body.subject_type === 'user' ? 'User' : 'Agent'} not found`);
    }
    return success(c, breakdown);
  } catch (err) {
    console.error(`[api] POST /v1/trust/refresh/${subjectId} error:`, err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to refresh trust score');
  }
});

// ── Trust Contagion & Regime Detection Endpoints ──
// Feature flag: TRUST_CONTAGION_ENABLED

// ── GET /graph/:agentId — Stake graph neighborhood ──
app.get('/graph/:agentId', async (c) => {
  if (!TRUST_CONTAGION_ENABLED) {
    return error(c, 404, 'FEATURE_DISABLED', 'Trust contagion endpoints are not enabled');
  }
  const agentId = c.req.param('agentId');
  try {
    const graph = await getStakeGraph(agentId);
    if (!graph) return error(c, 404, 'NOT_FOUND', 'Agent not found');
    return success(c, graph);
  } catch (err) {
    console.error(`[api] GET /v1/trust/graph/${agentId} error:`, err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get stake graph');
  }
});

// ── GET /contagion/:agentId — Contagion event history ──
app.get('/contagion/:agentId', async (c) => {
  if (!TRUST_CONTAGION_ENABLED) {
    return error(c, 404, 'FEATURE_DISABLED', 'Trust contagion endpoints are not enabled');
  }
  const agentId = c.req.param('agentId');
  const limit = Math.min(100, parseInt(c.req.query('limit') || '20', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);
  try {
    const history = await getContagionHistory(agentId, limit, offset);
    return success(c, history);
  } catch (err) {
    console.error(`[api] GET /v1/trust/contagion/${agentId} error:`, err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get contagion history');
  }
});

// ── GET /regime/:agentId — Regime detection status ──
app.get('/regime/:agentId', async (c) => {
  if (!TRUST_CONTAGION_ENABLED) {
    return error(c, 404, 'FEATURE_DISABLED', 'Trust contagion endpoints are not enabled');
  }
  const agentId = c.req.param('agentId');
  const resolvedParam = c.req.query('resolved');
  const resolved = resolvedParam === undefined ? undefined : resolvedParam === 'true';
  const limit = Math.min(50, parseInt(c.req.query('limit') || '10', 10));
  try {
    const alerts = await getRegimeAlerts(agentId, resolved, limit);
    return success(c, alerts);
  } catch (err) {
    console.error(`[api] GET /v1/trust/regime/${agentId} error:`, err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get regime alerts');
  }
});

// ── GET /exposure — Authenticated user's contagion exposure ──
app.get('/exposure', async (c) => {
  if (!TRUST_CONTAGION_ENABLED) {
    return error(c, 404, 'FEATURE_DISABLED', 'Trust contagion endpoints are not enabled');
  }
  const userId = c.get('userId' as never) as string | undefined;
  if (!userId) {
    return error(c, 401, 'AUTH_REQUIRED', 'Authentication required to view exposure');
  }
  try {
    const exposure = await getExposure(userId);
    return success(c, exposure);
  } catch (err) {
    console.error('[api] GET /v1/trust/exposure error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get exposure');
  }
});

// ── GET /bom/:agentId — Latest AI-BOM snapshot ──
app.get('/bom/:agentId', async (c) => {
  if (!TRUST_CONTAGION_ENABLED) {
    return error(c, 404, 'FEATURE_DISABLED', 'Trust contagion endpoints are not enabled');
  }
  const agentId = c.req.param('agentId');
  const sessionId = c.req.query('sessionId') || undefined;
  try {
    const bom = await getLatestBom(agentId, sessionId);
    if (!bom) return error(c, 404, 'NOT_FOUND', 'No BOM snapshot found for this agent');
    return success(c, bom);
  } catch (err) {
    console.error(`[api] GET /v1/trust/bom/${agentId} error:`, err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get BOM snapshot');
  }
});

// ── POST /scan — Security scan of MCP server config ──
app.post('/scan', async (c) => {
  if (!TRUST_CONTAGION_ENABLED) {
    return error(c, 404, 'FEATURE_DISABLED', 'Trust contagion endpoints are not enabled');
  }
  const callerId = c.get('verifiedAgentId');
  if (!callerId) {
    return error(c, 401, 'AUTH_REQUIRED', 'Authentication required to run security scans');
  }
  try {
    const body = await c.req.json<{ serverName?: string; tools?: ToolDefinition[] }>();
    if (!body.serverName || typeof body.serverName !== 'string') {
      return error(c, 400, 'VALIDATION_ERROR', 'serverName is required');
    }
    if (!Array.isArray(body.tools) || body.tools.length === 0) {
      return error(c, 400, 'VALIDATION_ERROR', 'tools array is required and must not be empty');
    }
    const result = await runSecurityScan(body.serverName, body.tools);
    return success(c, result);
  } catch (err) {
    console.error('[api] POST /v1/trust/scan error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to run security scan');
  }
});

export default app;

// Agent routes — registration, profile management
// POST /v1/agents/register does NOT require signature auth
// All other /v1/agents/* endpoints require it

import { Hono } from 'hono';
import { db, agents, agentKeys } from '@percival/vouch-db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { success, paginated, error } from '../lib/response';

const app = new Hono();

// ── POST /register — Register a new agent ──
// This is the ONLY endpoint that doesn't require signature auth.
app.post('/register', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      publicKey: string;
      modelFamily?: string;
      description?: string;
    }>();

    if (!body.name || !body.publicKey) {
      return error(c, 400, 'VALIDATION_ERROR', 'Missing required fields: name, publicKey', [
        ...(!body.name ? [{ field: 'name', issue: 'required' }] : []),
        ...(!body.publicKey ? [{ field: 'publicKey', issue: 'required' }] : []),
      ]);
    }

    // Validate public key format (base64-encoded Ed25519 key = 44 chars)
    const keyBuffer = Buffer.from(body.publicKey, 'base64');
    if (keyBuffer.length !== 32) {
      return error(c, 400, 'VALIDATION_ERROR', 'Invalid Ed25519 public key (expected 32 bytes base64-encoded)', [
        { field: 'publicKey', issue: 'invalid_format' },
      ]);
    }

    // Compute key fingerprint (SHA-256 of raw public key bytes)
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyBuffer);
    const keyFingerprint = Buffer.from(hashBuffer).toString('hex');

    // Check for duplicate key
    const existingKey = await db.select().from(agentKeys).where(
      eq(agentKeys.keyFingerprint, keyFingerprint),
    ).limit(1);

    if (existingKey.length > 0) {
      return error(c, 409, 'DUPLICATE_KEY', 'An agent with this public key already exists');
    }

    // Insert agent
    const [agent] = await db.insert(agents).values({
      name: body.name,
      modelFamily: body.modelFamily || null,
      description: body.description || '',
    }).returning();

    // Insert the public key
    await db.insert(agentKeys).values({
      agentId: agent.id,
      publicKey: body.publicKey,
      keyFingerprint,
    });

    return success(c, {
      agent_id: agent.id,
      name: agent.name,
      model_family: agent.modelFamily,
      description: agent.description,
      verified: agent.verified,
      trust_score: agent.trustScore,
      key_fingerprint: keyFingerprint,
      created_at: agent.createdAt.toISOString(),
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api] POST /v1/agents/register error:', message);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to register agent');
  }
});

// ── GET /me — Agent's own profile ──
app.get('/me', async (c) => {
  const agentId = c.req.header('X-Agent-Id');
  if (!agentId) {
    return error(c, 401, 'UNAUTHORIZED', 'X-Agent-Id header required');
  }

  try {
    const agent = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    if (agent.length === 0) {
      return error(c, 404, 'NOT_FOUND', 'Agent not found');
    }

    const keys = await db.select().from(agentKeys).where(
      and(eq(agentKeys.agentId, agentId), eq(agentKeys.isActive, true)),
    );

    return success(c, {
      id: agent[0].id,
      name: agent[0].name,
      model_family: agent[0].modelFamily,
      description: agent[0].description,
      verified: agent[0].verified,
      trust_score: agent[0].trustScore,
      rate_limit_tier: agent[0].rateLimitTier,
      created_at: agent[0].createdAt.toISOString(),
      last_active_at: agent[0].lastActiveAt?.toISOString() || null,
      keys: keys.map((k) => ({
        fingerprint: k.keyFingerprint,
        created_at: k.createdAt.toISOString(),
        is_active: k.isActive,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api] GET /v1/agents/me error:', message);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to fetch agent profile');
  }
});

// ── PATCH /me — Update agent profile ──
app.patch('/me', async (c) => {
  const agentId = c.req.header('X-Agent-Id');
  if (!agentId) {
    return error(c, 401, 'UNAUTHORIZED', 'X-Agent-Id header required');
  }

  try {
    const body = await c.req.json<{
      name?: string;
      description?: string;
      avatarUrl?: string;
    }>();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;

    if (Object.keys(updates).length === 0) {
      return error(c, 400, 'VALIDATION_ERROR', 'No fields to update');
    }

    const [updated] = await db.update(agents)
      .set(updates)
      .where(eq(agents.id, agentId))
      .returning();

    if (!updated) {
      return error(c, 404, 'NOT_FOUND', 'Agent not found');
    }

    return success(c, {
      id: updated.id,
      name: updated.name,
      model_family: updated.modelFamily,
      description: updated.description,
      verified: updated.verified,
      trust_score: updated.trustScore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api] PATCH /v1/agents/me error:', message);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to update agent profile');
  }
});

// ── GET / — List all agents (paginated) ──
app.get('/', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '25', 10), 100);
  const page = Math.max(parseInt(c.req.query('page') || '1', 10), 1);
  const offset = (page - 1) * limit;

  try {
    const [rows, countResult] = await Promise.all([
      db.select()
        .from(agents)
        .orderBy(desc(agents.trustScore))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(agents),
    ]);

    const total = Number(countResult[0].count);

    return paginated(c, rows.map((a) => ({
      id: a.id,
      name: a.name,
      model_family: a.modelFamily,
      description: a.description,
      verified: a.verified,
      trust_score: a.trustScore,
      created_at: a.createdAt.toISOString(),
    })), {
      page,
      limit,
      total,
      has_more: offset + limit < total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api] GET /v1/agents error:', message);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to list agents');
  }
});

// ── GET /:id — View any agent's public profile ──
app.get('/:id', async (c) => {
  const agentId = c.req.param('id');

  try {
    const agent = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    if (agent.length === 0) {
      return error(c, 404, 'NOT_FOUND', 'Agent not found');
    }

    return success(c, {
      id: agent[0].id,
      name: agent[0].name,
      model_family: agent[0].modelFamily,
      description: agent[0].description,
      verified: agent[0].verified,
      trust_score: agent[0].trustScore,
      created_at: agent[0].createdAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api] GET /v1/agents/${agentId} error:`, message);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to fetch agent profile');
  }
});

export default app;

// Vouch — Staking API Routes

import { Hono } from 'hono';
import { success, paginated, error } from '../lib/response';
import {
  createPool,
  getPoolByAgent,
  getPoolSummary,
  listPools,
  stake,
  requestUnstake,
  withdraw,
  getStakerPositions,
  recordActivityFee,
  distributeYield,
  slashPool,
  computeBackingComponent,
} from '../services/staking-service';
import { getVoterWeight } from '../services/trust-service';

const app = new Hono();

// ── Pool Routes ──

/** GET /pools — List active staking pools */
app.get('/pools', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = Math.min(50, parseInt(c.req.query('limit') || '25', 10));
    const result = await listPools(page, limit);
    return paginated(c, result.data, result.meta);
  } catch (err) {
    console.error('[vouch-api] GET /pools error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to list pools');
  }
});

/** GET /pools/:id — Pool detail */
app.get('/pools/:id', async (c) => {
  try {
    const pool = await getPoolSummary(c.req.param('id'));
    if (!pool) return error(c, 404, 'NOT_FOUND', 'Pool not found');
    return success(c, pool);
  } catch (err) {
    console.error('[vouch-api] GET /pools/:id error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get pool');
  }
});

/** GET /pools/agent/:agentId — Pool by agent */
app.get('/pools/agent/:agentId', async (c) => {
  try {
    const pool = await getPoolByAgent(c.req.param('agentId'));
    if (!pool) return error(c, 404, 'NOT_FOUND', 'No pool for this agent');
    return success(c, pool);
  } catch (err) {
    console.error('[vouch-api] GET /pools/agent/:id error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get pool');
  }
});

/** POST /pools — Create staking pool for an agent */
app.post('/pools', async (c) => {
  try {
    const body = await c.req.json<{ agent_id: string; activity_fee_rate_bps?: number }>();

    if (!body.agent_id) {
      return error(c, 400, 'VALIDATION_ERROR', 'agent_id is required');
    }

    // Check if pool already exists
    const existing = await getPoolByAgent(body.agent_id);
    if (existing) {
      return error(c, 409, 'CONFLICT', 'Pool already exists for this agent');
    }

    const poolId = await createPool(body.agent_id, body.activity_fee_rate_bps);
    const pool = await getPoolSummary(poolId);
    return success(c, pool, 201);
  } catch (err) {
    console.error('[vouch-api] POST /pools error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to create pool');
  }
});

// ── Staking Routes ──

/** POST /pools/:id/stake — Stake funds to back an agent */
app.post('/pools/:id/stake', async (c) => {
  try {
    const poolId = c.req.param('id');
    const body = await c.req.json<{
      staker_id: string;
      staker_type: 'user' | 'agent';
      amount_cents: number;
    }>();

    if (!body.staker_id || !body.staker_type || !body.amount_cents) {
      return error(c, 400, 'VALIDATION_ERROR', 'staker_id, staker_type, and amount_cents required');
    }

    if (body.amount_cents < 1000) { // $10 minimum
      return error(c, 400, 'VALIDATION_ERROR', 'Minimum stake is $10 (1000 cents)');
    }

    // Get staker trust score for snapshot
    const stakerTrust = await getVoterWeight(body.staker_id, body.staker_type);

    const result = await stake(poolId, body.staker_id, body.staker_type, body.amount_cents, stakerTrust);
    return success(c, result, 201);
  } catch (err) {
    console.error('[vouch-api] POST /pools/:id/stake error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to stake');
  }
});

/** POST /stakes/:id/unstake — Request unstake (begins notice period) */
app.post('/stakes/:id/unstake', async (c) => {
  try {
    const stakeId = c.req.param('id');
    const body = await c.req.json<{ staker_id: string }>();

    if (!body.staker_id) {
      return error(c, 400, 'VALIDATION_ERROR', 'staker_id is required');
    }

    const result = await requestUnstake(stakeId, body.staker_id);
    return success(c, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      return error(c, 404, 'NOT_FOUND', msg);
    }
    console.error('[vouch-api] POST /stakes/:id/unstake error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to unstake');
  }
});

/** POST /stakes/:id/withdraw — Complete withdrawal after notice period */
app.post('/stakes/:id/withdraw', async (c) => {
  try {
    const stakeId = c.req.param('id');
    const body = await c.req.json<{ staker_id: string }>();

    if (!body.staker_id) {
      return error(c, 400, 'VALIDATION_ERROR', 'staker_id is required');
    }

    const amountCents = await withdraw(stakeId, body.staker_id);
    return success(c, { stakeId, withdrawn_cents: amountCents });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found') || msg.includes('Cannot withdraw')) {
      return error(c, 400, 'BAD_REQUEST', msg);
    }
    console.error('[vouch-api] POST /stakes/:id/withdraw error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to withdraw');
  }
});

/** GET /stakers/:id/positions — Get all staking positions for a staker */
app.get('/stakers/:id/positions', async (c) => {
  try {
    const stakerId = c.req.param('id');
    const stakerType = (c.req.query('type') || 'user') as 'user' | 'agent';
    const positions = await getStakerPositions(stakerId, stakerType);
    return success(c, positions);
  } catch (err) {
    console.error('[vouch-api] GET /stakers/:id/positions error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get positions');
  }
});

// ── Activity Fee Routes ──

/** POST /fees — Record an activity fee from agent revenue */
app.post('/fees', async (c) => {
  try {
    const body = await c.req.json<{
      agent_id: string;
      action_type: string;
      gross_revenue_cents: number;
    }>();

    if (!body.agent_id || !body.action_type || !body.gross_revenue_cents) {
      return error(c, 400, 'VALIDATION_ERROR', 'agent_id, action_type, and gross_revenue_cents required');
    }

    const feeCents = await recordActivityFee(body.agent_id, body.action_type, body.gross_revenue_cents);
    return success(c, { fee_cents: feeCents }, 201);
  } catch (err) {
    console.error('[vouch-api] POST /fees error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to record fee');
  }
});

// ── Yield Distribution Routes ──

/** POST /pools/:id/distribute — Trigger yield distribution for a pool */
app.post('/pools/:id/distribute', async (c) => {
  try {
    const poolId = c.req.param('id');
    const body = await c.req.json<{ period_start: string; period_end: string }>();

    if (!body.period_start || !body.period_end) {
      return error(c, 400, 'VALIDATION_ERROR', 'period_start and period_end required');
    }

    const result = await distributeYield(
      poolId,
      new Date(body.period_start),
      new Date(body.period_end),
    );

    if (!result) {
      return success(c, { message: 'No fees to distribute for this period' });
    }

    return success(c, result, 201);
  } catch (err) {
    console.error('[vouch-api] POST /pools/:id/distribute error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to distribute yield');
  }
});

// ── Vouch Score Routes ──

/** GET /vouch-score/:id — Get backing component for an agent's Vouch score */
app.get('/vouch-score/:id', async (c) => {
  try {
    const agentId = c.req.param('id');
    const backingComponent = await computeBackingComponent(agentId, 'agent');
    return success(c, { agent_id: agentId, backing_component: backingComponent });
  } catch (err) {
    console.error('[vouch-api] GET /vouch-score/:id error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to compute vouch score');
  }
});

export default app;

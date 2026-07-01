// Agent Insurance API Routes — quote, bind, activate, claim, adjudicate.
//
// Ships DISABLED behind INSURANCE_ENABLED. Amounts are in sats.
// Authorization (#4): bind/claim are caller-bound (verifiedAgentId must equal the
// policyholder/claimant); activate/adjudicate are admin/oracle-gated via INSURANCE_ADMIN_ID.
// Coverage binds as `quoted` and only activates once a settled premium exists.
// STILL REQUIRED before the flag flips: wiring the premium invoice/settlement that writes the
// `insurance_premium` paymentEvents row activatePolicy checks for (money-track follow-up).

import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { success, error } from '../lib/response';
import type { AppEnv } from '../middleware/verify-signature';
import {
  quotePolicyForAgent,
  bindPolicy,
  activatePolicy,
  getPolicy,
  fileClaim,
  getClaim,
  adjudicateClaim,
  COVERED_EVENT_TYPES,
} from '../services/insurance-service';

const INSURANCE_ENABLED = process.env.INSURANCE_ENABLED === 'true';

const app = new Hono<AppEnv>();

/**
 * Adjudication and activation are privileged (oracle/admin) operations: a claimant must
 * never adjudicate their own claim, and coverage must not be self-activated. Gated on the
 * admin agent's id. Fail-closed: if INSURANCE_ADMIN_ID is unset, all privileged ops deny.
 */
function callerIsAdmin(c: Context<AppEnv>): boolean {
  const adminId = process.env.INSURANCE_ADMIN_ID;
  const callerId = c.get('verifiedAgentId');
  return Boolean(adminId && callerId && callerId === adminId);
}

// Feature flag gate — checked first, before any handler logic runs.
app.use('*', async (c, next) => {
  if (!INSURANCE_ENABLED) {
    return c.json({ error: { code: 'NOT_ENABLED', message: 'Insurance layer is not enabled' } }, 501);
  }
  return next();
});

const partyType = z.enum(['user', 'agent']);

const QuoteSchema = z.object({
  agentId: z.string().min(1),
  coverageSats: z.number().int().positive(),
  termDays: z.number().int().positive().max(365),
});

const BindSchema = QuoteSchema.extend({
  policyholderId: z.string().min(1),
  policyholderType: partyType,
  coveredEvents: z.array(z.string()).min(1),
});

const ClaimSchema = z.object({
  policyId: z.string().min(1),
  claimantId: z.string().min(1),
  claimantType: partyType,
  claimType: z.string().min(1),
  claimedAmountSats: z.number().int().positive(),
  description: z.string().max(2000).optional(),
  evidenceEventIds: z.array(z.string().min(1)).min(1),
});

/** GET /covered-events — discovery of insurable failure classes */
app.get('/covered-events', (c) => success(c, { covered_events: COVERED_EVENT_TYPES }));

/** POST /quote — price coverage for an agent (read-only, no state change) */
app.post('/quote', async (c) => {
  try {
    const parsed = QuoteSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return error(c, 400, 'INVALID_PARAMS', parsed.error.errors[0]?.message ?? 'Invalid body');
    const quote = await quotePolicyForAgent(parsed.data);
    if (!quote) return error(c, 404, 'NOT_FOUND', 'No trust data for agent');
    return success(c, quote);
  } catch (err) {
    console.error('[vouch-api] POST /insurance/quote error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to quote');
  }
});

/** POST /policies — bind a policy (quoted until premium settles) */
app.post('/policies', async (c) => {
  try {
    const parsed = BindSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return error(c, 400, 'INVALID_PARAMS', parsed.error.errors[0]?.message ?? 'Invalid body');
    // Caller may only bind a policy they themselves hold. Prevents binding coverage in
    // someone else's name (#4). Callers authenticate as agents (verifiedAgentId = ULID).
    const callerId = c.get('verifiedAgentId');
    if (!callerId) return error(c, 401, 'AUTH_REQUIRED', 'Authentication required');
    if (parsed.data.policyholderType !== 'agent' || parsed.data.policyholderId !== callerId) {
      return error(c, 403, 'FORBIDDEN', 'Caller must be the policyholder');
    }
    const result = await bindPolicy(parsed.data);
    if (!result.ok) return c.json({ error: { code: 'CANNOT_BIND', message: result.reason }, quote: result.quote }, 422);
    return success(c, { policy_id: result.policyId, status: result.status, quote: result.quote }, 201);
  } catch (err) {
    console.error('[vouch-api] POST /insurance/policies error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to bind policy');
  }
});

/** POST /policies/:id/activate — admin/oracle: activate coverage once premium settles */
app.post('/policies/:id/activate', async (c) => {
  try {
    if (!callerIsAdmin(c)) return error(c, 403, 'FORBIDDEN', 'Activation requires admin access');
    const result = await activatePolicy(c.req.param('id'));
    if (!result.ok) return error(c, 422, 'CANNOT_ACTIVATE', result.reason);
    return success(c, result);
  } catch (err) {
    console.error('[vouch-api] POST /insurance/policies/:id/activate error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to activate policy');
  }
});

/** GET /policies/:id */
app.get('/policies/:id', async (c) => {
  try {
    const policy = await getPolicy(c.req.param('id'));
    if (!policy) return error(c, 404, 'NOT_FOUND', 'Policy not found');
    return success(c, policy);
  } catch (err) {
    console.error('[vouch-api] GET /insurance/policies/:id error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get policy');
  }
});

/** POST /claims — file a claim against a policy */
app.post('/claims', async (c) => {
  try {
    const parsed = ClaimSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return error(c, 400, 'INVALID_PARAMS', parsed.error.errors[0]?.message ?? 'Invalid body');
    // Caller may only file claims as themselves (#4).
    const callerId = c.get('verifiedAgentId');
    if (!callerId) return error(c, 401, 'AUTH_REQUIRED', 'Authentication required');
    if (parsed.data.claimantType !== 'agent' || parsed.data.claimantId !== callerId) {
      return error(c, 403, 'FORBIDDEN', 'Caller must be the claimant');
    }
    const result = await fileClaim(parsed.data);
    if (!result.ok) return error(c, 422, 'CANNOT_FILE', result.reason);
    return success(c, { claim_id: result.claimId }, 201);
  } catch (err) {
    console.error('[vouch-api] POST /insurance/claims error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to file claim');
  }
});

/** GET /claims/:id */
app.get('/claims/:id', async (c) => {
  try {
    const claim = await getClaim(c.req.param('id'));
    if (!claim) return error(c, 404, 'NOT_FOUND', 'Claim not found');
    return success(c, claim);
  } catch (err) {
    console.error('[vouch-api] GET /insurance/claims/:id error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to get claim');
  }
});

/** POST /claims/:id/adjudicate — admin/oracle: verify against provenance and approve/deny */
app.post('/claims/:id/adjudicate', async (c) => {
  try {
    // Adjudication is an oracle/admin action — a claimant must never adjudicate their own
    // claim (#4).
    if (!callerIsAdmin(c)) return error(c, 403, 'FORBIDDEN', 'Adjudication requires admin access');
    const result = await adjudicateClaim(c.req.param('id'));
    if (!result.ok) return error(c, 422, 'CANNOT_ADJUDICATE', result.reason);
    return success(c, result);
  } catch (err) {
    console.error('[vouch-api] POST /insurance/claims/:id/adjudicate error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to adjudicate claim');
  }
});

export default app;

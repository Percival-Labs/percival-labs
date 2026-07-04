// Agent Insurance API Routes — quote, bind, activate, claim, adjudicate.
//
// Ships DISABLED behind INSURANCE_ENABLED. Amounts are in sats.
// Authorization (#4): bind/claim/premium-invoice/premium-invoice-confirm are caller-bound
// (verifiedAgentId must equal the policyholder/claimant); activate/adjudicate are admin/oracle-
// gated via INSURANCE_ADMIN_ID.
// Coverage binds as `quoted`, collects its premium via premium-invoice + premium-invoice/confirm,
// and only activates (a separate admin/oracle call) once that premium has settled.

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
  settleClaim,
  getInsuranceReserveSats,
  createPremiumInvoice,
  confirmPremiumPayment,
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

/**
 * POST /policies/:id/premium-invoice — policyholder: create (or re-fetch the still-pending)
 * Lightning invoice for the quoted premium.
 */
app.post('/policies/:id/premium-invoice', async (c) => {
  try {
    const callerId = c.get('verifiedAgentId');
    if (!callerId) return error(c, 401, 'AUTH_REQUIRED', 'Authentication required');
    const policyId = c.req.param('id');
    const policy = await getPolicy(policyId);
    if (!policy) return error(c, 404, 'NOT_FOUND', 'Policy not found');
    // Same caller-binding rule as bind/claim (#4): only the policyholder may invoice their own premium.
    if (policy.policyholderType !== 'agent' || policy.policyholderId !== callerId) {
      return error(c, 403, 'FORBIDDEN', 'Caller must be the policyholder');
    }
    const result = await createPremiumInvoice(policyId);
    if (!result.ok) return error(c, 422, 'CANNOT_INVOICE', result.reason);
    return success(c, {
      policy_id: result.invoice.policyId,
      payment_hash: result.invoice.paymentHash,
      bolt11: result.invoice.bolt11,
      amount_sats: result.invoice.amountSats,
    }, 201);
  } catch (err) {
    console.error('[vouch-api] POST /insurance/policies/:id/premium-invoice error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to create premium invoice');
  }
});

/**
 * POST /policies/:id/premium-invoice/confirm — policyholder: confirm the premium invoice was
 * paid. Does NOT activate coverage — that stays a separate admin/oracle call to `activate`.
 */
app.post('/policies/:id/premium-invoice/confirm', async (c) => {
  try {
    const callerId = c.get('verifiedAgentId');
    if (!callerId) return error(c, 401, 'AUTH_REQUIRED', 'Authentication required');
    const policyId = c.req.param('id');
    const policy = await getPolicy(policyId);
    if (!policy) return error(c, 404, 'NOT_FOUND', 'Policy not found');
    if (policy.policyholderType !== 'agent' || policy.policyholderId !== callerId) {
      return error(c, 403, 'FORBIDDEN', 'Caller must be the policyholder');
    }
    const result = await confirmPremiumPayment(policyId);
    if (!result.ok) return error(c, 422, 'CANNOT_CONFIRM', result.reason);
    return success(c, {
      policy_id: result.settlement.policyId,
      status: result.settlement.status,
      amount_sats: result.settlement.amountSats,
    });
  } catch (err) {
    console.error('[vouch-api] POST /insurance/policies/:id/premium-invoice/confirm error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to confirm premium payment');
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

const SettleSchema = z.object({
  nwcConnectionId: z.string().min(1).optional(),
});

/**
 * POST /claims/:id/settle — admin/oracle: move the money for an APPROVED claim.
 * Adjudication ruled; this pays — bounded by the insurance reserve (collected premiums minus
 * payouts already committed), never the treasury or staked collateral. Same admin gate as
 * adjudicate: a claimant must never trigger their own payout.
 */
app.post('/claims/:id/settle', async (c) => {
  try {
    if (!callerIsAdmin(c)) return error(c, 403, 'FORBIDDEN', 'Settlement requires admin access');
    const parsed = SettleSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return error(c, 400, 'INVALID_PARAMS', parsed.error.errors[0]?.message ?? 'Invalid body');
    const result = await settleClaim(c.req.param('id'), parsed.data);
    if (!result.ok) {
      return error(c, 422, 'CANNOT_SETTLE', result.reason + (result.reserveSats !== undefined ? ` (reserve: ${result.reserveSats} sats)` : ''));
    }
    return success(c, {
      claim_id: result.settlement.claimId,
      payout_sats: result.settlement.payoutSats,
      payment_status: result.settlement.paymentStatus,
    });
  } catch (err) {
    console.error('[vouch-api] POST /insurance/claims/:id/settle error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to settle claim');
  }
});

/** GET /reserve — the insurance reserve position (admin: money telemetry, not public data) */
app.get('/reserve', async (c) => {
  try {
    if (!callerIsAdmin(c)) return error(c, 403, 'FORBIDDEN', 'Reserve telemetry requires admin access');
    return success(c, { reserve_sats: await getInsuranceReserveSats() });
  } catch (err) {
    console.error('[vouch-api] GET /insurance/reserve error:', err);
    return error(c, 500, 'INTERNAL_ERROR', 'Failed to compute reserve');
  }
});

export default app;

// Webhook Routes — receives payment notifications from LNbits.
// Mounted BEFORE auth middleware (webhooks use HMAC-SHA256 signature, not Ed25519/NIP-98).

import { Hono } from 'hono';
import { finalizeStake } from '../services/staking-service';

const WEBHOOK_SECRET = process.env.LNBITS_WEBHOOK_SECRET || '';

/**
 * Verify HMAC-SHA256 signature of webhook payload.
 * LNbits sends the signature in the X-Webhook-Signature header.
 * Format: sha256=<hex-encoded-hmac>
 */
async function verifyWebhookSignature(body: string, signatureHeader: string | undefined): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.error('[webhook] LNBITS_WEBHOOK_SECRET not configured — rejecting all webhooks');
    return false;
  }
  if (!signatureHeader) return false;

  // Accept both "sha256=<hex>" and raw "<hex>" formats
  const providedHex = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  if (!providedHex || providedHex.length === 0) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expectedHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (expectedHex.length !== providedHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ providedHex.charCodeAt(i);
  }
  return mismatch === 0;
}

const app = new Hono();

/**
 * POST /v1/webhooks/lnbits/stake-confirmed
 * Called by LNbits when a stake invoice is paid.
 * Auth: HMAC-SHA256 signature in X-Webhook-Signature header.
 * Idempotent: returns 200 on success, 500 on error (so LNbits retries).
 */
app.post('/lnbits/stake-confirmed', async (c) => {
  // Read raw body for signature verification
  const rawBody = await c.req.text();
  const signatureHeader = c.req.header('X-Webhook-Signature');

  // Also accept legacy query param during migration (log warning)
  const querySecret = c.req.query('secret');
  let authenticated = false;

  if (signatureHeader) {
    authenticated = await verifyWebhookSignature(rawBody, signatureHeader);
  } else if (querySecret && WEBHOOK_SECRET && querySecret === WEBHOOK_SECRET) {
    // Legacy: accept query param but log deprecation warning
    console.warn('[webhook] DEPRECATED: Webhook using query param secret — migrate to X-Webhook-Signature header');
    authenticated = true;
  }

  if (!authenticated) {
    console.warn('[webhook] Rejected: invalid or missing webhook signature');
    return c.json({ status: 'rejected', reason: 'invalid_signature' }, 401);
  }

  try {
    let body: {
      payment_hash?: string;
      checking_id?: string;
      amount?: number;
      memo?: string;
    };

    try {
      body = JSON.parse(rawBody);
    } catch {
      console.warn('[webhook] Invalid JSON payload');
      return c.json({ status: 'error', reason: 'invalid_json' }, 400);
    }

    const paymentHash = body.payment_hash || body.checking_id;
    if (!paymentHash) {
      console.warn('[webhook] Missing payment_hash in webhook payload');
      return c.json({ status: 'ok', processed: false, reason: 'missing_payment_hash' }, 200);
    }

    console.log(`[webhook] Stake payment confirmed: ${paymentHash}`);

    const result = await finalizeStake(paymentHash);

    if (result) {
      console.log(`[webhook] Stake finalized: stakeId=${result.stakeId}, net=${result.netStakedSats} sats`);
      return c.json({ status: 'ok', processed: true, stake_id: result.stakeId }, 200);
    }

    // Already processed or unknown — still return 200 (idempotent)
    console.log(`[webhook] Payment hash not found or already processed: ${paymentHash}`);
    return c.json({ status: 'ok', processed: false, reason: 'already_processed_or_unknown' }, 200);
  } catch (err) {
    // S10 fix: return 500 so LNbits retries on transient errors
    console.error('[webhook] Error processing stake confirmation:', err);
    return c.json({ status: 'error', message: 'internal_error' }, 500);
  }
});

export default app;

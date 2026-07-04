// Vouch Gateway — x402 Payment Required Support
//
// Adds HTTP 402 payment flow as a 4th auth mode in the Gateway pipeline.
// Agents with a USDC wallet on Base can pay per inference request.
// High-trust agents (by EVM address) get discounts or free access.
//
// Flow:
//  1. No auth + no X-Payment → 402 with payment requirements
//  2. X-Payment present → verify via facilitator → extract payer address
//  3. Lookup Vouch trust score by EVM address → apply tier/discount
//  4. Continue to existing pipeline
//
// Uses the x402 protocol: https://x402.org
// Payment verification delegated to facilitator (Coinbase/custom).

import type { Env } from './types';

// ── Types ──

export interface X402PaymentResult {
  valid: boolean;
  payerAddress: string;
  amountUsdc: number;
  txHash: string;
  error?: string;
}

export interface X402PaymentRequirements {
  scheme: 'exact';
  network: 'base';
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
}

// ── Detection ──

/**
 * Check if the request contains an x402 payment header.
 */
export function hasX402Payment(request: Request): boolean {
  return request.headers.has('X-Payment');
}

/**
 * Check if x402 is enabled on this gateway.
 */
export function isX402Enabled(env: Env): boolean {
  return env.X402_ENABLED === 'true' && !!env.X402_PAYTO_ADDRESS;
}

// ── Price Estimation ──

// Default per-request price in USDC (micro-dollars → 6 decimals)
// These are conservative estimates; actual pricing from pricing.ts is more precise
const MODEL_PRICES_USDC: Record<string, number> = {
  // Anthropic
  'claude-sonnet-4-20250514': 0.05,
  'claude-sonnet-4': 0.05,
  'claude-haiku-4-5-20251001': 0.01,
  'claude-haiku-3-5': 0.01,
  'claude-opus-4-6': 0.15,
  // OpenAI
  'gpt-4o': 0.04,
  'gpt-4o-mini': 0.005,
  'o3': 0.15,
  'o3-mini': 0.02,
  // Default
  '_default': 0.05,
};

/**
 * Estimate inference cost in USDC for a given model.
 * Returns a string with 6 decimal places (USDC precision).
 */
export function estimateInferenceCostUsdc(model?: string): string {
  const price = (model ? MODEL_PRICES_USDC[model] : undefined) ?? MODEL_PRICES_USDC['_default']!;
  return price.toFixed(6);
}

// ── 402 Response Builder ──

/**
 * Build an HTTP 402 Payment Required response with x402 headers.
 * Includes payment requirements per the x402 spec.
 */
export function buildPaymentRequired(
  costUsdc: string,
  env: Env,
  resourceUrl: string,
): Response {
  const requirements: X402PaymentRequirements = {
    scheme: 'exact',
    network: 'base',
    maxAmountRequired: costUsdc,
    resource: resourceUrl,
    description: 'Vouch Gateway inference request',
    mimeType: 'application/json',
    payTo: env.X402_PAYTO_ADDRESS!,
    maxTimeoutSeconds: 60,
    asset: 'USDC',
  };

  const body = {
    error: {
      code: 'PAYMENT_REQUIRED',
      message: 'Payment required for inference. Include X-Payment header with x402 payment proof.',
    },
    accepts: [requirements],
    x402Version: 1,
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Payment-Required': JSON.stringify(requirements),
    },
  });
}

// ── Payment Verification ──

/**
 * Verify an x402 payment by calling the facilitator service.
 * The facilitator checks on-chain that the payment was made to our address.
 *
 * Rejects payments if no facilitator is configured (on-chain verification is mandatory).
 */
export async function verifyX402Payment(
  request: Request,
  env: Env,
): Promise<X402PaymentResult> {
  const paymentHeader = request.headers.get('X-Payment');
  if (!paymentHeader) {
    return { valid: false, payerAddress: '', amountUsdc: 0, txHash: '', error: 'Missing X-Payment header' };
  }

  // Parse the payment proof (base64 JSON or raw JSON)
  let paymentProof: Record<string, unknown>;
  try {
    // Try base64 first, then raw JSON
    let decoded: string;
    try {
      decoded = atob(paymentHeader);
    } catch {
      decoded = paymentHeader;
    }
    paymentProof = JSON.parse(decoded);
  } catch {
    return { valid: false, payerAddress: '', amountUsdc: 0, txHash: '', error: 'Invalid X-Payment format' };
  }

  // Strict field names only — reject ambiguous payloads to prevent spoofing
  const txHash = typeof paymentProof.txHash === 'string' ? paymentProof.txHash : '';
  const payerAddress = typeof paymentProof.payerAddress === 'string' ? paymentProof.payerAddress : '';

  if (!txHash || !payerAddress) {
    return { valid: false, payerAddress: '', amountUsdc: 0, txHash: '', error: 'Missing txHash or payerAddress in payment proof' };
  }

  // Validate EVM address format (checksummed or lowercase)
  if (!/^0x[0-9a-fA-F]{40}$/.test(payerAddress)) {
    return { valid: false, payerAddress, amountUsdc: 0, txHash, error: 'Invalid EVM address format' };
  }

  // Validate txHash format (0x + 64 hex chars)
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { valid: false, payerAddress, amountUsdc: 0, txHash, error: 'Invalid transaction hash format' };
  }

  // Replay protection — check if txHash already used
  const replayKey = `x402:tx:${txHash}`;
  const seen = await env.VOUCH_RATE_LIMITS.get(replayKey);
  if (seen) {
    return { valid: false, payerAddress, amountUsdc: 0, txHash, error: 'Transaction already used (replay)' };
  }

  // Verify via facilitator if configured
  if (env.X402_FACILITATOR_URL) {
    try {
      const verifyResponse = await fetch(`${env.X402_FACILITATOR_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: paymentProof,
          payTo: env.X402_PAYTO_ADDRESS,
          network: 'base',
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!verifyResponse.ok) {
        const err = await verifyResponse.text().catch(() => 'Unknown error');
        return { valid: false, payerAddress, amountUsdc: 0, txHash, error: `Facilitator rejected: ${err}` };
      }

      const result = await verifyResponse.json() as { valid: boolean; amount?: string };
      if (!result.valid) {
        return { valid: false, payerAddress, amountUsdc: 0, txHash, error: 'Payment verification failed' };
      }

      const amountUsdc = parseFloat(result.amount ?? '0');

      // Store txHash for replay protection (24h TTL)
      await env.VOUCH_RATE_LIMITS.put(replayKey, JSON.stringify({
        payerAddress,
        amountUsdc,
        verifiedAt: Date.now(),
      }), { expirationTtl: 86400 });

      return { valid: true, payerAddress, amountUsdc, txHash };
    } catch (err) {
      return { valid: false, payerAddress, amountUsdc: 0, txHash, error: `Facilitator error: ${err}` };
    }
  }

  // No facilitator configured — reject payment.
  // On-chain verification is mandatory; accepting unverified proofs
  // would allow attackers to fabricate payments.
  return { valid: false, payerAddress, amountUsdc: 0, txHash, error: 'Payment facilitator not configured — cannot verify payment on-chain' };
}

// ── Trust Discount ──

/**
 * Calculate the discounted price based on Vouch trust score.
 * - Score >= X402_MIN_TRUST_FREE → free access (returns "0.000000")
 * - Score > 0 → apply discount (default 20% = 2000 bps)
 * - Score = 0 → full price
 */
export function applyTrustDiscount(
  basePriceUsdc: string,
  score: number,
  env: Env,
): string {
  const minTrustFree = parseInt(env.X402_MIN_TRUST_FREE ?? '800', 10);
  const discountBps = parseInt(env.X402_TRUST_DISCOUNT_BPS ?? '2000', 10);

  if (score >= minTrustFree) {
    return '0.000000';
  }

  if (score > 0 && discountBps > 0) {
    const base = parseFloat(basePriceUsdc);
    const discounted = base * (1 - discountBps / 10000);
    return Math.max(0, discounted).toFixed(6);
  }

  return basePriceUsdc;
}

// Vouch Gateway — Stripe Meter Billing
//
// Reports token usage to Stripe's Billing Meter API for agents
// with a stripeCustomerId. Called async via ctx.waitUntil().

import type { Env } from './types';

export interface StripeMeterData {
  stripeCustomerId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Report token usage to Stripe Billing Meters.
 * Sends two meter events: one for input tokens, one for output tokens.
 * Only called when the AgentKey entry has a stripeCustomerId.
 *
 * Errors are logged but never thrown — this is fire-and-forget.
 */
export async function reportToStripeMeter(env: Env, data: StripeMeterData): Promise<void> {
  if (!env.STRIPE_API_KEY) {
    console.warn('[stripe-meter] STRIPE_API_KEY not set — skipping meter report');
    return;
  }

  if (data.inputTokens === 0 && data.outputTokens === 0) {
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000); // Stripe expects Unix seconds

  const events: Array<{
    meterId: string;
    value: number;
    label: string;
  }> = [];

  if (data.inputTokens > 0 && env.STRIPE_METER_INPUT_ID) {
    events.push({
      meterId: env.STRIPE_METER_INPUT_ID,
      value: data.inputTokens,
      label: 'input_tokens',
    });
  }

  if (data.outputTokens > 0 && env.STRIPE_METER_OUTPUT_ID) {
    events.push({
      meterId: env.STRIPE_METER_OUTPUT_ID,
      value: data.outputTokens,
      label: 'output_tokens',
    });
  }

  for (const event of events) {
    try {
      const body = new URLSearchParams({
        'event_name': event.meterId,
        'timestamp': String(timestamp),
        'payload[stripe_customer_id]': data.stripeCustomerId,
        'payload[value]': String(event.value),
        'payload[model]': data.model,
      });

      const response = await fetch('https://api.stripe.com/v1/billing/meter_events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.STRIPE_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error(`[stripe-meter] ${event.label} report failed (${response.status}):`, text);
      }
    } catch (err) {
      console.error(`[stripe-meter] Failed to report ${event.label}:`, err);
    }
  }
}

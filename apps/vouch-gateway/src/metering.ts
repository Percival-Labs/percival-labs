// Vouch Gateway — Usage Metering
//
// Counts tokens from provider responses, computes cost in sats,
// and reports usage to the Vouch API asynchronously.

import type { Env } from './types';

// ── Types ──

export interface UsageRecord {
  userNpub?: string;       // hex pubkey for transparent mode
  batchHash?: string;      // batch ID for private mode
  tokenHash?: string;      // spent token hash
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
}

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
}

// ── Token Counting ──

/**
 * Extract token counts from a provider's response body.
 * Both Anthropic and OpenAI include usage info in their responses.
 */
export function extractTokenCounts(responseBody: unknown, provider: string): TokenCounts {
  if (typeof responseBody !== 'object' || responseBody === null) {
    return { inputTokens: 0, outputTokens: 0 };
  }

  const obj = responseBody as Record<string, unknown>;

  if (provider === 'anthropic') {
    // Anthropic format: { usage: { input_tokens, output_tokens } }
    const usage = obj.usage as Record<string, unknown> | undefined;
    if (usage) {
      return {
        inputTokens: typeof usage.input_tokens === 'number' ? usage.input_tokens : 0,
        outputTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : 0,
      };
    }
  }

  if (provider === 'openai' || provider === 'openrouter') {
    // OpenAI format: { usage: { prompt_tokens, completion_tokens } }
    const usage = obj.usage as Record<string, unknown> | undefined;
    if (usage) {
      return {
        inputTokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0,
        outputTokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0,
      };
    }
  }

  return { inputTokens: 0, outputTokens: 0 };
}

// ── Usage Reporting ──

/**
 * Report usage to the Vouch API (async, non-blocking).
 * Called via ctx.waitUntil() to avoid blocking the response.
 */
export async function reportUsage(record: UsageRecord, env: Env): Promise<void> {
  const gatewaySecret = env.GATEWAY_SECRET;
  if (!gatewaySecret) {
    console.warn('[metering] GATEWAY_SECRET not set — skipping usage report');
    return;
  }

  // Skip if no tokens counted (e.g., error response from provider)
  if (record.inputTokens === 0 && record.outputTokens === 0) {
    return;
  }

  try {
    const response = await fetch(`${env.VOUCH_API_URL}/v1/inference/usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Secret': gatewaySecret,
      },
      body: JSON.stringify({
        user_npub: record.userNpub || undefined,
        batch_hash: record.batchHash || undefined,
        token_hash: record.tokenHash || undefined,
        model: record.model,
        provider: record.provider,
        input_tokens: record.inputTokens,
        output_tokens: record.outputTokens,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(`[metering] Usage report failed (${response.status}):`, text);
    }
  } catch (err) {
    console.error('[metering] Failed to report usage:', err);
  }
}

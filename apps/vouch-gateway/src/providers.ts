// Vouch Gateway — Provider Configuration and Routing
//
// Maps URL paths to upstream AI provider APIs.
// Controls model access per trust tier.

import type { ProviderConfig, ProviderId, TrustTier, Env } from './types';
import { TIER_CONFIGS } from './types';

// ── Provider Definitions ──

export const PROVIDER_CONFIGS: Record<ProviderId, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    upstream: 'https://api.anthropic.com',
    apiKeyHeader: 'x-api-key',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    basicModels: [
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307',
      'claude-instant-1.2',
    ],
    reasoningModels: [
      'claude-3-7-sonnet-thinking',
      'claude-3-5-opus-cot',
    ],
  },
  openai: {
    id: 'openai',
    upstream: 'https://api.openai.com',
    apiKeyHeader: 'Authorization',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    basicModels: [
      'gpt-4o-mini',
      'gpt-3.5-turbo',
    ],
    reasoningModels: [
      'o1',
      'o1-preview',
      'o1-mini',
      'o3-mini',
    ],
  },
} as const;

// ── Path-Based Provider Resolution ──

/**
 * Resolve a provider config from the request URL path.
 * Expects paths like: /anthropic/v1/messages or /openai/v1/chat/completions
 * Returns null if the path doesn't match a known provider.
 */
export function getProviderConfig(path: string): ProviderConfig | null {
  // Extract provider segment: first path component after /
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const providerSegment = segments[0]!.toLowerCase();

  if (providerSegment in PROVIDER_CONFIGS) {
    return PROVIDER_CONFIGS[providerSegment as ProviderId];
  }

  return null;
}

/**
 * Get the upstream path by stripping the provider prefix.
 * /anthropic/v1/messages -> /v1/messages
 */
export function getUpstreamPath(path: string): string {
  const firstSlash = path.indexOf('/', 1);
  if (firstSlash === -1) return '/';
  return path.slice(firstSlash);
}

/**
 * Get the upstream URL for a provider, using env vars for runtime override.
 */
export function getUpstreamUrl(provider: ProviderConfig, env: Env): string {
  switch (provider.id) {
    case 'anthropic':
      return env.ANTHROPIC_UPSTREAM || provider.upstream;
    case 'openai':
      return env.OPENAI_UPSTREAM || provider.upstream;
    default:
      return provider.upstream;
  }
}

/**
 * Get the API key for a provider from env secrets.
 */
export function getProviderApiKey(provider: ProviderConfig, env: Env): string | undefined {
  switch (provider.id) {
    case 'anthropic':
      return env.ANTHROPIC_API_KEY;
    case 'openai':
      return env.OPENAI_API_KEY;
    default:
      return undefined;
  }
}

// ── Model Access Control ──

/**
 * Check if a model is allowed for the given trust tier.
 *
 * Access rules:
 * - restricted: only explicitly listed basic models
 * - standard: all models EXCEPT reasoning models
 * - elevated/unlimited: all models including reasoning
 */
export function isModelAllowed(
  model: string,
  tier: TrustTier,
  provider: ProviderConfig,
): boolean {
  const tierConfig = TIER_CONFIGS[tier];

  switch (tierConfig.allowedModels) {
    case 'basic':
      // Restricted: only explicitly listed basic models
      return provider.basicModels.includes(model);

    case 'all':
      // Standard: everything except reasoning models
      return !provider.reasoningModels.includes(model);

    case 'all+reasoning':
      // Elevated/Unlimited: all models
      return true;

    default:
      return false;
  }
}

/**
 * Check if a model is a reasoning/CoT model for anomaly tracking purposes.
 */
export function isReasoningModel(model: string, provider: ProviderConfig): boolean {
  return provider.reasoningModels.includes(model);
}

// ── Request Body Model Extraction ──

/**
 * Extract the model name from a parsed request body.
 * Works for both Anthropic and OpenAI request formats
 * (both use `model` as the field name).
 */
export function extractModelFromRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const obj = body as Record<string, unknown>;
  if (typeof obj.model !== 'string') return null;
  return obj.model;
}

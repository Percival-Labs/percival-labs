// Vouch Gateway — Provider Configuration and Routing
//
// Maps URL paths to upstream AI provider APIs.
// Supports explicit routing (/anthropic/...) and auto-routing (/auto/...)
// which resolves the best provider for a given model.
//
// No model gating — all models available to all tiers (UX is #1 priority).
// Reasoning model tracking kept for anomaly detection only.

import type { ProviderConfig, ProviderId, Env } from './types';

// ── Provider Definitions ──

export const PROVIDER_CONFIGS: Record<ProviderId, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    upstream: 'https://api.anthropic.com',
    apiKeyHeader: 'x-api-key',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
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
    reasoningModels: [
      'o1',
      'o1-preview',
      'o1-mini',
      'o3-mini',
    ],
  },
  openrouter: {
    id: 'openrouter',
    upstream: 'https://openrouter.ai/api',
    apiKeyHeader: 'Authorization',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    reasoningModels: [],
  },
} as const;

// ── Model-to-Provider Mapping (for auto-routing) ──

/**
 * Resolve which provider should handle a given model.
 * Models with explicit provider prefix (anthropic/claude-sonnet-4) get
 * routed to OpenRouter (which handles the prefix).
 * Bare model names get matched to their native provider.
 *
 * Priority: native provider if available, OpenRouter as universal fallback.
 */
export function resolveProviderForModel(model: string, env: Env): {
  provider: ProviderConfig;
  upstreamModel: string;
  format: 'anthropic' | 'openai';
} | null {
  // Models with explicit provider prefix (e.g., anthropic/claude-sonnet-4) are
  // OpenRouter's model naming convention. Always route to OpenRouter.
  // The agent can use bare names (claude-sonnet-4) to go direct to a provider.
  if (model.includes('/')) {
    if (getProviderApiKey(PROVIDER_CONFIGS.openrouter, env)) {
      return {
        provider: PROVIDER_CONFIGS.openrouter,
        upstreamModel: model,
        format: 'openai',
      };
    }
    return null;
  }

  // Bare Claude models → try Anthropic direct, fall back to OpenRouter
  if (model.startsWith('claude')) {
    if (getProviderApiKey(PROVIDER_CONFIGS.anthropic, env)) {
      return {
        provider: PROVIDER_CONFIGS.anthropic,
        upstreamModel: model,
        format: 'anthropic',
      };
    }
    if (getProviderApiKey(PROVIDER_CONFIGS.openrouter, env)) {
      return {
        provider: PROVIDER_CONFIGS.openrouter,
        upstreamModel: `anthropic/${model}`,
        format: 'openai',
      };
    }
  }

  // Bare GPT/o1/o3 models → try OpenAI direct, fall back to OpenRouter
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) {
    if (getProviderApiKey(PROVIDER_CONFIGS.openai, env)) {
      return {
        provider: PROVIDER_CONFIGS.openai,
        upstreamModel: model,
        format: 'openai',
      };
    }
    if (getProviderApiKey(PROVIDER_CONFIGS.openrouter, env)) {
      return {
        provider: PROVIDER_CONFIGS.openrouter,
        upstreamModel: `openai/${model}`,
        format: 'openai',
      };
    }
  }

  // Everything else → OpenRouter
  if (getProviderApiKey(PROVIDER_CONFIGS.openrouter, env)) {
    return {
      provider: PROVIDER_CONFIGS.openrouter,
      upstreamModel: model,
      format: 'openai',
    };
  }

  return null;
}

// ── Path-Based Provider Resolution ──

/**
 * Resolve a provider config from the request URL path.
 * Supports:
 *   /anthropic/v1/messages — explicit Anthropic
 *   /openai/v1/chat/completions — explicit OpenAI
 *   /openrouter/v1/chat/completions — explicit OpenRouter
 *   /auto/... — auto-route based on model in request body
 *
 * Returns null if the path doesn't match a known provider.
 * Returns 'auto' string for auto-routing (caller must resolve via model).
 */
export function getProviderConfig(path: string): ProviderConfig | 'auto' | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const providerSegment = segments[0]!.toLowerCase();

  if (providerSegment === 'auto') return 'auto';

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
    case 'openrouter':
      return env.OPENROUTER_UPSTREAM || provider.upstream;
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
    case 'openrouter':
      return env.OPENROUTER_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Check if a model is a reasoning/CoT model (for anomaly tracking only).
 * NOT used for access control — all models available to all tiers.
 */
export function isReasoningModel(model: string, provider: ProviderConfig): boolean {
  return provider.reasoningModels.includes(model);
}

/**
 * Extract the model name from a parsed request body.
 * Works for Anthropic, OpenAI, and OpenRouter (all use `model` field).
 */
export function extractModelFromRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const obj = body as Record<string, unknown>;
  if (typeof obj.model !== 'string') return null;
  return obj.model;
}

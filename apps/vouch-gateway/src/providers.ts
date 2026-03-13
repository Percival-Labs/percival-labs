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
  ollama: {
    id: 'ollama',
    upstream: 'https://ollama.percival-labs.ai',
    apiKeyHeader: '',     // no auth needed
    apiKeyEnvVar: '',     // no API key
    reasoningModels: [],
  },
} as const;

// ── Capability-Level Routing ──
// Agents request a capability level instead of a specific model.
// Gateway picks the best model for the task at the lowest cost.

export type CapabilityLevel = 'fast' | 'code' | 'smart' | 'reasoning';

interface CapabilityRoute {
  model: string;
  provider: ProviderId;
  format: 'anthropic' | 'openai';
}

const CAPABILITY_ROUTES: Record<CapabilityLevel, CapabilityRoute> = {
  fast: { model: 'google/gemini-3-flash-preview', provider: 'openrouter', format: 'openai' },
  code: { model: 'anthropic/claude-sonnet-4.6', provider: 'openrouter', format: 'openai' },
  smart: { model: 'anthropic/claude-sonnet-4.6', provider: 'openrouter', format: 'openai' },
  reasoning: { model: 'anthropic/claude-opus-4.6', provider: 'openrouter', format: 'openai' },
};

/**
 * Check if a model name is a capability alias (fast, smart, reasoning, code).
 * Returns the resolved route or null if not a capability alias.
 */
export function resolveCapability(model: string): CapabilityRoute | null {
  const level = model.toLowerCase() as CapabilityLevel;
  return CAPABILITY_ROUTES[level] ?? null;
}

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
  // ── Capability aliases (fast, smart, reasoning, code) ──
  const capability = resolveCapability(model);
  if (capability) {
    const config = PROVIDER_CONFIGS[capability.provider];
    // For Ollama, check that upstream is configured
    if (capability.provider === 'ollama') {
      if (!isOllamaAvailable(env)) return null;
      return { provider: config, upstreamModel: capability.model, format: capability.format };
    }
    // For cloud providers, check API key
    if (!getProviderApiKey(config, env)) return null;
    return { provider: config, upstreamModel: capability.model, format: capability.format };
  }

  // ── Ollama models (contain ':' like qwen3:14b) ──
  if (model.includes(':') && isOllamaAvailable(env)) {
    return {
      provider: PROVIDER_CONFIGS.ollama,
      upstreamModel: model,
      format: 'openai',
    };
  }

  // Models with explicit provider prefix (e.g., anthropic/claude-sonnet-4) are
  // OpenRouter's model naming convention. Always route to OpenRouter.
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
    return PROVIDER_CONFIGS[providerSegment as keyof typeof PROVIDER_CONFIGS];
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
    case 'ollama':
      return env.OLLAMA_UPSTREAM || provider.upstream;
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
    case 'ollama':
      // Ollama doesn't need an API key — return a sentinel so routing doesn't skip it
      return isOllamaAvailable(env) ? 'ollama-local' : undefined;
    default:
      return undefined;
  }
}

/**
 * Check if Ollama is available (upstream configured).
 */
function isOllamaAvailable(env: Env): boolean {
  return !!(env.OLLAMA_UPSTREAM || PROVIDER_CONFIGS.ollama.upstream);
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

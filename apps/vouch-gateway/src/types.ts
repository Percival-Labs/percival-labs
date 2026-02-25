// Vouch Gateway — Shared Types
// All type definitions for the gateway worker.

/** Trust tier names, ordered by privilege level */
export type TrustTier = 'restricted' | 'standard' | 'elevated' | 'unlimited';

/** Tier configuration: thresholds, rate limits, and model access */
export interface TierConfig {
  readonly minScore: number;
  readonly minStakeSats: number;
  readonly rateLimit: number; // requests per minute
  readonly allowedModels: 'basic' | 'all' | 'all+reasoning';
}

/** Full tier configuration map */
export const TIER_CONFIGS: Record<TrustTier, TierConfig> = {
  restricted: {
    minScore: 0,
    minStakeSats: 0,
    rateLimit: 10,
    allowedModels: 'basic',
  },
  standard: {
    minScore: 200,
    minStakeSats: 100_000, // ~$100 in sats
    rateLimit: 60,
    allowedModels: 'all',
  },
  elevated: {
    minScore: 500,
    minStakeSats: 1_000_000, // ~$1K in sats
    rateLimit: 300,
    allowedModels: 'all+reasoning',
  },
  unlimited: {
    minScore: 700,
    minStakeSats: 10_000_000, // ~$10K in sats
    rateLimit: Infinity,
    allowedModels: 'all+reasoning',
  },
} as const;

/** Supported AI provider identifiers */
export type ProviderId = 'anthropic' | 'openai';

/** Provider routing configuration */
export interface ProviderConfig {
  readonly id: ProviderId;
  readonly upstream: string;
  readonly apiKeyHeader: string;
  readonly apiKeyEnvVar: string;
  /** Models considered "basic" — available at restricted tier */
  readonly basicModels: readonly string[];
  /** Models that require elevated+ tier (reasoning/CoT) */
  readonly reasoningModels: readonly string[];
}

/** Vouch score response from the Vouch API */
export interface VouchScoreResponse {
  agentId: string;
  vouchScore: number;
  scoreBreakdown: {
    verification: number;
    tenure: number;
    performance: number;
    backing: number;
    community: number;
  };
  backing: {
    totalStakedSats: number;
    backerCount: number;
    badge: string;
  };
  tier: string;
  lastUpdated: string;
}

/** Cached score entry stored in KV */
export interface CachedScore {
  score: number;
  totalStakedSats: number;
  tier: TrustTier;
  cachedAt: number; // epoch ms
}

/** Rate limit state stored in KV */
export interface RateLimitState {
  count: number;
  windowStart: number; // epoch ms
}

/** Anomaly tracking data stored in KV (rolling 24h) */
export interface AnomalyData {
  /** Request counts per hour bucket (keyed by hour timestamp) */
  hourlyRequests: Record<string, number>;
  /** Count of reasoning/CoT model requests */
  reasoningRequests: number;
  /** Total requests in tracking window */
  totalRequests: number;
  /** Request timestamps for variance calculation (last 100) */
  requestTimestamps: number[];
  /** Models used (set-like, stored as array) */
  modelsUsed: string[];
  /** Prompt length samples (last 50) */
  promptLengths: number[];
  /** Window start timestamp */
  windowStart: number;
}

/** Anomaly detection result */
export interface AnomalyResult {
  flagged: boolean;
  reasons: string[];
}

/** Nostr event structure per NIP-01 */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/** Gateway environment bindings for Cloudflare Worker */
export interface Env {
  // KV Namespaces
  VOUCH_SCORES: KVNamespace;
  VOUCH_RATE_LIMITS: KVNamespace;
  VOUCH_ANOMALY: KVNamespace;

  // Configuration
  VOUCH_API_URL: string;
  SUPPORTED_PROVIDERS: string; // comma-separated

  // Provider upstreams
  ANTHROPIC_UPSTREAM: string;
  OPENAI_UPSTREAM: string;

  // Provider API keys (secrets)
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;

  // Dev mode
  DEV_MODE?: string; // "true" to use mock scores

  // Environment identifier (prevents DEV_MODE in production)
  ENVIRONMENT?: string;
}

/** Parsed request context built during auth */
export interface RequestContext {
  pubkey: string;
  score: number;
  totalStakedSats: number;
  tier: TrustTier;
  tierConfig: TierConfig;
  provider: ProviderConfig;
  rateRemaining: number;
}

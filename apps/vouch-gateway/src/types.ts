// Vouch Gateway — Shared Types
// All type definitions for the gateway worker.

/** Trust tier names, ordered by privilege level */
export type TrustTier = 'restricted' | 'standard' | 'elevated' | 'unlimited';

/** Tier configuration: thresholds and rate limits. No model gating — all models available to all tiers. */
export interface TierConfig {
  readonly minScore: number;
  readonly minStakeSats: number;
  readonly rateLimit: number; // requests per minute
}

/** Full tier configuration map — rate limits only, no model restrictions */
export const TIER_CONFIGS: Record<TrustTier, TierConfig> = {
  restricted: {
    minScore: 0,
    minStakeSats: 0,
    rateLimit: 10,
  },
  standard: {
    minScore: 200,
    minStakeSats: 100_000, // ~$100 in sats
    rateLimit: 60,
  },
  elevated: {
    minScore: 500,
    minStakeSats: 1_000_000, // ~$1K in sats
    rateLimit: 300,
  },
  unlimited: {
    minScore: 700,
    minStakeSats: 10_000_000, // ~$10K in sats
    rateLimit: Infinity,
  },
} as const;

/** Supported AI provider identifiers */
export type ProviderId = 'anthropic' | 'openai' | 'openrouter' | 'ollama';

/** Provider routing configuration */
export interface ProviderConfig {
  readonly id: ProviderId;
  readonly upstream: string;
  readonly apiKeyHeader: string;
  readonly apiKeyEnvVar: string;
  /** Models that require elevated+ tier for anomaly tracking purposes */
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

/** Auth mode — how the request was authenticated */
export type AuthMode = 'transparent' | 'private' | 'agent-key' | 'anonymous';

/** Authenticated identity extracted from request headers */
export interface AuthIdentity {
  mode: AuthMode;
  /** Hex pubkey (transparent mode) or anon IP identifier */
  pubkey: string;
  /** Batch hash (private mode only) */
  batchHash?: string;
  /** Token hash for tracking (private mode only) */
  tokenHash?: string;
}

/** Agent key entry stored in VOUCH_AGENT_KEYS KV */
export interface AgentKeyEntry {
  pubkey: string;      // hex pubkey of the agent
  agentId: string;     // human-readable agent identifier
  name: string;        // display name
  createdAt: string;   // ISO 8601 timestamp
  tier?: TrustTier;    // override tier (default: 'standard' — agents should work out of the box)
  models?: string[];   // allowed models (empty/undefined = all)
  defaultModel?: string; // fallback model when request doesn't specify one
  budget?: BudgetConfig; // spending cap (undefined = unlimited)
  stripeCustomerId?: string;     // Stripe customer ID for meter billing
  stripeSubscriptionId?: string; // Stripe subscription ID (for reference)
  billingMode?: 'lightning' | 'stripe' | 'credits'; // billing method (default: lightning)
}

/** Per-agent budget configuration */
export interface BudgetConfig {
  maxSats: number;     // max spend per period (in sats)
  periodDays: number;  // budget reset period (e.g., 30 for monthly, 7 for weekly)
}

/** Budget spend state tracked in KV */
export interface BudgetState {
  spentSats: number;   // total spent in current period
  periodStart: number; // epoch ms when current period started
  lastUpdated: number; // epoch ms of last update
}

/** Gateway environment bindings for Cloudflare Worker */
export interface Env {
  // KV Namespaces
  VOUCH_SCORES: KVNamespace;
  VOUCH_RATE_LIMITS: KVNamespace;
  VOUCH_ANOMALY: KVNamespace;
  VOUCH_AGENT_KEYS: KVNamespace;

  // Configuration
  VOUCH_API_URL: string;
  SUPPORTED_PROVIDERS: string; // comma-separated

  // Provider upstreams
  ANTHROPIC_UPSTREAM: string;
  OPENAI_UPSTREAM: string;
  OPENROUTER_UPSTREAM?: string;
  OLLAMA_UPSTREAM?: string;

  // Provider API keys (secrets)
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  OPENROUTER_API_KEY?: string;

  // Gateway secret for usage reporting to Vouch API
  GATEWAY_SECRET?: string;

  // Stripe Billing Meters (set STRIPE_API_KEY via `wrangler secret put`)
  STRIPE_API_KEY?: string;
  STRIPE_METER_INPUT_ID?: string;
  STRIPE_METER_OUTPUT_ID?: string;

  // CORS — comma-separated allowed origins (no wildcard when proxying API keys)
  ALLOWED_ORIGINS?: string;

  // Dev mode
  DEV_MODE?: string; // "true" to use mock scores

  // Environment identifier (prevents DEV_MODE in production)
  ENVIRONMENT?: string;
}

/** Parsed request context built during auth */
export interface RequestContext {
  identity: AuthIdentity;
  score: number;
  totalStakedSats: number;
  tier: TrustTier;
  tierConfig: TierConfig;
  provider: ProviderConfig;
  rateRemaining: number;
}

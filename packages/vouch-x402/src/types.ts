// Vouch x402 Trust Middleware — Types
// Zero dependency type definitions for the trust-gating lifecycle hooks.

export type TrustDimension = 'verification' | 'tenure' | 'performance' | 'backing' | 'community';
export type FallbackMode = 'allow' | 'deny' | 'degrade';
export type TrustAction = 'allowed' | 'denied' | 'free_access' | 'fallback_allow' | 'fallback_deny';
export type Badge = 'unbacked' | 'emerging' | 'community-backed' | 'institutional-grade';
export type Tier = 'unverified' | 'established' | 'trusted' | 'verified';

export interface VouchX402Config {
  /** Vouch API base URL. Defaults to production Railway deployment. */
  apiUrl?: string;

  /** Minimum composite trust score (0-1000) to allow transactions. Default: 200 */
  minScore?: number;

  /**
   * Minimum score per dimension (optional). Only checked dimensions that are specified.
   * Example: { performance: 300, backing: 100 }
   */
  minDimensions?: Partial<Record<TrustDimension, number>>;

  /** Cache TTL in milliseconds. Default: 300_000 (5 minutes). 0 to disable. */
  cacheTtlMs?: number;

  /**
   * Behavior when Vouch API is unreachable.
   * - 'allow': let the transaction through (optimistic)
   * - 'deny': reject the transaction (pessimistic)
   * - 'degrade': allow if agent has a cached score, deny if completely unknown
   * Default: 'degrade'
   */
  fallback?: FallbackMode;

  /**
   * Minimum composite score for free access (onProtectedRequest hook).
   * Agents scoring at or above this bypass payment entirely.
   * Default: undefined (disabled — all agents must pay)
   */
  freeAccessMinScore?: number;

  /**
   * Custom resolver for extracting agent identity from HTTP request headers.
   * Used by onProtectedRequest to identify the agent before payment.
   * Should return a Nostr hex pubkey (64 chars) or null.
   * Default: reads X-Vouch-Npub header.
   */
  identityResolver?: (headers: Record<string, string | undefined>) => string | null | Promise<string | null>;

  /**
   * Custom resolver for extracting EVM payer address from payment payload.
   * Override if using a non-standard payment scheme.
   * Default: extracts from authorization.from or permit2Authorization.from
   */
  payerAddressResolver?: (payload: unknown) => string | null;

  /** Called when a trust check is performed. Useful for logging/metrics. */
  onTrustCheck?: (event: VouchTrustCheckEvent) => void;
}

export interface VouchScoreResponse {
  agentId: string;
  vouchScore: number;
  scoreBreakdown: Record<TrustDimension, number>;
  backing: {
    totalStakedSats: number;
    backerCount: number;
    badge: Badge;
  };
  tier: Tier;
  lastUpdated: string;
}

export interface VouchTrustResult extends VouchScoreResponse {
  fromCache: boolean;
}

export interface VouchTrustCheckEvent {
  payerAddress?: string;
  nostrPubkey?: string;
  result: VouchTrustResult | null;
  action: TrustAction;
  reason: string;
  durationMs: number;
}

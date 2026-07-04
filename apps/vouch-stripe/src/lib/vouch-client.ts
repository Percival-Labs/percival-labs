/**
 * Vouch Bridge API client for the Stripe App.
 * Communicates with the Vouch Bridge API at /v1/stripe/* endpoints.
 * All requests include a Stripe App signature for backend verification.
 */

import fetchStripeSignature from '@stripe/ui-extension-sdk/signature';

const VOUCH_API = 'https://percivalvouch-api-production.up.railway.app';

// ── Signed Fetch Helpers ──

/**
 * Make a signed GET request to the Bridge API.
 * Includes Stripe-Signature header for backend verification.
 */
async function signedGet(path: string, params?: URLSearchParams): Promise<Response> {
  const url = params ? `${VOUCH_API}${path}?${params}` : `${VOUCH_API}${path}`;
  const signature = await fetchStripeSignature();
  return fetch(url, {
    headers: {
      'Stripe-Signature': signature,
    },
  });
}

/**
 * Make a signed POST/PUT request to the Bridge API.
 */
async function signedRequest(
  method: 'POST' | 'PUT',
  path: string,
  body: Record<string, any>,
): Promise<Response> {
  const signature = await fetchStripeSignature();
  return fetch(`${VOUCH_API}${path}`, {
    method,
    headers: {
      'Stripe-Signature': signature,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

// ── Types ──

export interface DimensionScore {
  value: number;
  confidence: number;
}

export interface TrustScore {
  agent_id: string;
  composite: number | null;
  tier: 'unscored' | 'unranked' | 'bronze' | 'silver' | 'gold' | 'diamond';
  confidence: number;
  dimensions: Record<string, DimensionScore> | null;
  trend: {
    direction: 'up' | 'down' | 'stable';
    delta_30d: number;
    history: Array<{ date: string; composite: number }>;
  } | null;
  domain: string;
  domain_match: boolean;
  validity: {
    issued_at: string;
    expires_at: string;
  };
}

export interface LinkResult {
  link_id: string;
  stripe_customer_id: string;
  vouch_agent_id: string;
  current_score: number | null;
  linked_at: string;
}

export interface AssessmentResult {
  assessment_id: string;
  agent_id: string;
  score: number | null;
  tier: string;
  meets_threshold: boolean;
  recommendation: 'proceed' | 'review' | 'block';
  risk_factors?: string[];
  domain: string;
  assessed_at: string;
}

export interface AssessmentHistoryItem {
  assessment_id: string;
  payment_intent_id: string;
  agent_id: string;
  score: number | null;
  tier: string;
  threshold: number;
  threshold_met: boolean;
  recommendation: string;
  amount_cents: number | null;
  currency: string | null;
  assessed_at: string;
}

export interface AnalyticsReport {
  period: { start: string; end: string };
  total_agent_transactions: number;
  total_disputes: number;
  overall_dispute_rate: number;
  score_bands: Array<{
    range: string;
    tier: string;
    transactions: number;
    disputes: number;
    dispute_rate: number;
    avg_dispute_amount: number;
  }>;
  insight: string;
}

export interface InstallationSettings {
  threshold: number;
  domain: string;
  flagUnscored: boolean;
}

export interface LinkedAgentItem {
  link_id: string;
  stripe_customer_id: string;
  vouch_agent_id: string;
  label: string | null;
  score: number | null;
  linked_at: string;
}

export interface TrustPolicy {
  minScore: number;
  maxSpendPerDay: number;
  requireBacked: boolean;
  dimensionMins?: Partial<Record<string, number>>;
}

// Default trust tiers for Issuing card limits
export const DEFAULT_POLICIES: Record<string, TrustPolicy> = {
  diamond: { minScore: 850, maxSpendPerDay: 10000, requireBacked: false },
  gold: { minScore: 700, maxSpendPerDay: 5000, requireBacked: false },
  silver: { minScore: 400, maxSpendPerDay: 500, requireBacked: false },
  bronze: { minScore: 200, maxSpendPerDay: 50, requireBacked: false },
  unranked: { minScore: 0, maxSpendPerDay: 0, requireBacked: false },
};

// ── Tier Helpers ──

export function scoreTier(score: number | null): TrustScore['tier'] {
  if (score === null) return 'unscored';
  if (score >= 850) return 'diamond';
  if (score >= 700) return 'gold';
  if (score >= 400) return 'silver';
  if (score >= 200) return 'bronze';
  return 'unranked';
}

export function tierColor(tier: string): string {
  switch (tier) {
    case 'diamond': return '#60a5fa'; // blue
    case 'gold': return '#fbbf24';     // amber
    case 'silver': return '#9ca3af';   // gray
    case 'bronze': return '#f97316';   // orange
    case 'unranked': return '#ef4444'; // red
    default: return '#6b7280';
  }
}

// ── API Client Methods ──

/**
 * Look up trust score for a Stripe customer.
 */
export async function fetchTrustScore(
  stripeCustomerId: string,
  stripeAccountId: string,
  domain?: string,
): Promise<TrustScore | null> {
  try {
    const params = new URLSearchParams({
      stripe_account_id: stripeAccountId,
    });
    if (domain) params.set('domain', domain);

    const res = await signedGet(`/v1/stripe/score/${stripeCustomerId}`, params);
    if (!res.ok) return null;

    const json = await res.json() as { data: TrustScore };
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Fetch trust score by agent ID directly (public endpoint fallback).
 */
export async function fetchTrustScoreByAgent(identifier: string): Promise<TrustScore | null> {
  try {
    // Both hex pubkeys and npub identifiers are accepted — server handles conversion
    const res = await fetch(`${VOUCH_API}/v1/sdk/agents/${encodeURIComponent(identifier)}/score`);
    if (!res.ok) return null;

    const json = await res.json() as { data: any };
    const d = json.data;
    const evidenceCount = d.performance?.total_outcomes || 0;

    return {
      agent_id: identifier,
      composite: d.score,
      tier: scoreTier(d.score),
      confidence: Math.min(1, evidenceCount / 50),
      dimensions: {
        verification: { value: d.dimensions?.verification || 0, confidence: 0.9 },
        tenure: { value: d.dimensions?.tenure || 0, confidence: 0.85 },
        performance: { value: d.dimensions?.performance || 0, confidence: 0.7 },
        commitment: { value: d.dimensions?.commitment || 0, confidence: 0.8 },
        community: { value: d.dimensions?.community || 0, confidence: 0.65 },
        consistency: { value: d.dimensions?.consistency || 0, confidence: 0.75 },
      },
      trend: null,
      domain: 'financial',
      domain_match: true,
      validity: {
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Link a Stripe customer to a Vouch agent.
 */
export async function linkAgent(
  stripeAccountId: string,
  stripeCustomerId: string,
  vouchAgentId: string,
  label?: string,
): Promise<LinkResult | null> {
  try {
    const res = await signedRequest('POST', '/v1/stripe/link-agent', {
      stripe_account_id: stripeAccountId,
      stripe_customer_id: stripeCustomerId,
      vouch_agent_id: vouchAgentId,
      label,
    });

    if (!res.ok) return null;
    const json = await res.json() as { data: LinkResult };
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Assess a transaction.
 */
export async function assessTransaction(
  stripeAccountId: string,
  vouchAgentId: string,
  paymentIntentId: string,
  amount: number,
  currency: string,
  threshold?: number,
): Promise<AssessmentResult | null> {
  try {
    const res = await signedRequest('POST', '/v1/stripe/assess', {
      stripe_account_id: stripeAccountId,
      vouch_agent_id: vouchAgentId,
      payment_intent_id: paymentIntentId,
      amount,
      currency,
      threshold,
    });

    if (!res.ok) return null;
    const json = await res.json() as { data: AssessmentResult };
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Get assessment history.
 */
export async function fetchAssessmentHistory(
  stripeAccountId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<AssessmentHistoryItem[]> {
  try {
    const params = new URLSearchParams({
      stripe_account_id: stripeAccountId,
      limit: String(limit),
      offset: String(offset),
    });

    const res = await signedGet('/v1/stripe/assessments', params);
    if (!res.ok) return [];

    const json = await res.json() as { data: AssessmentHistoryItem[] };
    return json.data;
  } catch {
    return [];
  }
}

/**
 * Get analytics report.
 */
export async function fetchAnalytics(
  stripeAccountId: string,
  periodStart?: string,
  periodEnd?: string,
): Promise<AnalyticsReport | null> {
  try {
    const params = new URLSearchParams({
      stripe_account_id: stripeAccountId,
    });
    if (periodStart) params.set('period_start', periodStart);
    if (periodEnd) params.set('period_end', periodEnd);

    const res = await signedGet('/v1/stripe/analytics', params);
    if (!res.ok) return null;

    const json = await res.json() as { data: AnalyticsReport };
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Load installation settings.
 */
export async function loadSettings(
  stripeAccountId: string,
): Promise<InstallationSettings> {
  try {
    const params = new URLSearchParams({ stripe_account_id: stripeAccountId });
    const res = await signedGet('/v1/stripe/settings', params);
    if (!res.ok) return { threshold: 400, domain: 'financial', flagUnscored: true };

    const json = await res.json() as { data: InstallationSettings };
    return json.data;
  } catch {
    return { threshold: 400, domain: 'financial', flagUnscored: true };
  }
}

/**
 * Save installation settings.
 */
export async function saveSettings(
  stripeAccountId: string,
  settings: Partial<InstallationSettings>,
): Promise<InstallationSettings | null> {
  try {
    const res = await signedRequest('PUT', '/v1/stripe/settings', {
      stripe_account_id: stripeAccountId,
      ...settings,
    });

    if (!res.ok) return null;
    const json = await res.json() as { data: InstallationSettings };
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Get linked agents for an installation.
 */
export async function fetchLinkedAgents(
  stripeAccountId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<LinkedAgentItem[]> {
  try {
    const params = new URLSearchParams({
      stripe_account_id: stripeAccountId,
      limit: String(limit),
      offset: String(offset),
    });

    const res = await signedGet('/v1/stripe/linked-agents', params);
    if (!res.ok) return [];

    const json = await res.json() as { data: LinkedAgentItem[] };
    return json.data;
  } catch {
    return [];
  }
}

/**
 * Determine recommended spending limit based on trust score.
 */
export function recommendedSpendLimit(
  score: { composite: number | null; tier: string; confidence: number },
  policies: Record<string, TrustPolicy> = DEFAULT_POLICIES,
): { limit: number; tier: string; reason: string } {
  const policy = policies[score.tier];
  if (!policy || score.composite === null) {
    return { limit: 0, tier: score.tier, reason: 'No policy defined for tier' };
  }

  const confidenceMultiplier = Math.max(0.1, score.confidence);
  const adjustedLimit = Math.floor(policy.maxSpendPerDay * confidenceMultiplier);

  return {
    limit: adjustedLimit,
    tier: score.tier,
    reason: `${score.tier} tier (${score.composite}/1000), confidence ${(score.confidence * 100).toFixed(0)}%`,
  };
}

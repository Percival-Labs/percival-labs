// Trust Gate — MCP-T Score-Based Tool Access Control
// Queries MCP-T for an agent's trust score, maps to a tier, and gates tool access.
// Degrades gracefully: if MCP-T is unreachable, falls back to the identity's declared tier.

import type { AgentIdentity, TrustTier } from '../identity/loader';

// ── Tier Definitions ──

const TRUST_TIERS: TrustTier[] = ['observer', 'contributor', 'operator', 'trusted'];

// Tool access matrix — each tier inherits all tools from lower tiers
const TIER_TOOLS: Record<TrustTier, string[]> = {
  observer: ['read_file', 'list_directory', 'search_files', 'scrape_feed', 'scrape_hackernews', 'scrape_reddit', 'scrape_github_trending', 'scrape_producthunt', 'search_x_posts'],
  contributor: ['write_file', 'create_branch', 'open_pr', 'post_social_draft', 'submit_tool_proposal'],
  operator: ['merge_pr', 'deploy_preview', 'post_social_direct'],
  trusted: ['deploy_production'],
};

// Tools that ALWAYS require human approval — no tier unlocks these
const HUMAN_GATED_TOOLS = new Set([
  'manage_dns',
  'stripe_api',
  'post_personal_account',
]);

// ── Config ──

const MCP_T_ENDPOINT = process.env.MCP_T_ENDPOINT || 'http://localhost:3601/mcp-t/v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const QUERY_TIMEOUT_MS = 5000;

// ── Score Cache ──

interface CachedScore {
  score: number;
  tier: TrustTier;
  fetchedAt: number;
}

const scoreCache = new Map<string, CachedScore>();

// ── Public API ──

/**
 * Map a numeric trust score to a tier name.
 */
export function scoreToTier(score: number): TrustTier {
  if (score >= 800) return 'trusted';
  if (score >= 500) return 'operator';
  if (score >= 200) return 'contributor';
  return 'observer';
}

/**
 * Get all tools accessible at a given tier (cumulative from lower tiers).
 */
export function getToolsForTier(tier: TrustTier): string[] {
  const tools: string[] = [];
  for (const t of TRUST_TIERS) {
    tools.push(...TIER_TOOLS[t]);
    if (t === tier) break;
  }
  return tools;
}

/**
 * Check if a tool requires human approval regardless of tier.
 */
export function isHumanGated(toolName: string): boolean {
  return HUMAN_GATED_TOOLS.has(toolName);
}

// Every tool the tier system knows about (union of all tier tools).
const ALL_TIERED_TOOLS = new Set(TRUST_TIERS.flatMap((t) => TIER_TOOLS[t]));

/**
 * Whether the trust gate governs this tool. Only human-gated tools and tools
 * that appear in the tier matrix are governed; unknown tools are out of scope
 * and MUST NOT be blocked (blocking them would break legitimate capabilities).
 */
export function isGatedTool(toolName: string): boolean {
  return HUMAN_GATED_TOOLS.has(toolName) || ALL_TIERED_TOOLS.has(toolName);
}

/**
 * Synchronous, pre-resolved authorization decision for a tool at a known tier.
 * Used by the blocking pre-execution gate (the tier is resolved once, before
 * the agent runs, so the tool callback can decide without an async round-trip).
 */
export function isToolAllowedAtTier(tier: TrustTier, toolName: string): boolean {
  if (!isGatedTool(toolName)) return true; // ungoverned tool
  if (isHumanGated(toolName)) return false; // never auto-approved
  return getToolsForTier(tier).includes(toolName);
}

/**
 * Check whether an agent can use a specific tool.
 * Queries MCP-T for live score, falls back to identity tier on failure.
 * Caches scores for 5 minutes.
 */
export async function canUseTool(
  agentId: string,
  toolName: string,
  fallbackTier: TrustTier = 'observer',
): Promise<boolean> {
  // Human-gated tools are never auto-approved
  if (isHumanGated(toolName)) {
    return false;
  }

  const tier = await resolveAgentTier(agentId, fallbackTier);
  const allowedTools = getToolsForTier(tier);
  return allowedTools.includes(toolName);
}

/**
 * Resolve an agent's current trust tier.
 * Queries MCP-T with caching, falls back to declared tier on error.
 */
export async function resolveAgentTier(
  agentId: string,
  fallbackTier: TrustTier = 'observer',
): Promise<TrustTier> {
  // Check cache first
  const cached = scoreCache.get(agentId);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.tier;
  }

  // Query MCP-T
  try {
    const score = await queryMcpTScore(agentId);
    const tier = scoreToTier(score);

    // Cache the result
    scoreCache.set(agentId, {
      score,
      tier,
      fetchedAt: Date.now(),
    });

    return tier;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[trust-gate] MCP-T query failed for "${agentId}" (using fallback tier "${fallbackTier}"): ${msg}`);
    return fallbackTier;
  }
}

/**
 * Clear the score cache (useful for testing or forced refresh).
 */
export function clearScoreCache(): void {
  scoreCache.clear();
}

// ── Internal ──

/**
 * Query MCP-T /query endpoint for an agent's current trust score.
 */
async function queryMcpTScore(agentId: string): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    // FIX #3: send the canonical JSON-RPC `trust/query` envelope. The old flat
    // `{subject, dimension}` body was rejected (-32600) and always parsed to 0,
    // silently pinning every agent to the observer tier.
    const res = await fetch(`${MCP_T_ENDPOINT}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'trust-gate',
        method: 'trust/query',
        params: { subject_id: agentId },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`MCP-T query ${res.status}`);
    }

    const data = (await res.json()) as {
      error?: { code: number; message: string };
      result?: { trust_score?: { score?: { composite?: number } } };
    };
    if (data.error) {
      throw new Error(`MCP-T query error ${data.error.code}: ${data.error.message}`);
    }
    const composite = data.result?.trust_score?.score?.composite;
    return typeof composite === 'number' ? composite : 0;
  } finally {
    clearTimeout(timeout);
  }
}

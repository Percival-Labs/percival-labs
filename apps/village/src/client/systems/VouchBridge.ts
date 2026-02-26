/**
 * VouchBridge.ts — Fetches agent trust scores from the Vouch API.
 *
 * Caches scores for 5 minutes. Falls back gracefully if Vouch API is unreachable.
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedScore {
  score: number;
  fetchedAt: number;
}

/**
 * Maps agent village IDs to Vouch npubs.
 * Update this as agents are registered on the Vouch network.
 */
const AGENT_NPUB_MAP: Record<string, string> = {
  // percy's npub from the first registered agent
  percy: 'npub1x8glnkcq80d55sxuqk0dnplwvvx4m7r43gam3ncs23847w7uzczqt5t96a',
};

export class VouchBridge {
  private cache = new Map<string, CachedScore>();
  private baseUrl: string;

  constructor(baseUrl = 'https://percivalvouch-api-production.up.railway.app') {
    this.baseUrl = baseUrl;
  }

  /** Get trust score for an agent. Returns null if unavailable. */
  async getScore(agentId: string): Promise<number | null> {
    // Check cache
    const cached = this.cache.get(agentId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.score;
    }

    // Resolve npub
    const npub = AGENT_NPUB_MAP[agentId];
    if (!npub) return null;

    try {
      const res = await fetch(`${this.baseUrl}/v1/public/agents/${npub}/vouch-score`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;

      const data = await res.json();
      const score = typeof data.score === 'number' ? data.score : null;

      if (score !== null) {
        this.cache.set(agentId, { score, fetchedAt: Date.now() });
      }
      return score;
    } catch {
      // API unreachable — return stale cache if available, otherwise null
      return cached?.score ?? null;
    }
  }

  /** Clear the score cache. */
  clearCache(): void {
    this.cache.clear();
  }
}

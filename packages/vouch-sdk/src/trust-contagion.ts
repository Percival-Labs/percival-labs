/**
 * Trust Contagion — Economic trust contagion and 3-layer regime detection.
 *
 * FEATURE_TRUST_CONTAGION_ENABLED = "false"
 *
 * This module provides:
 * - TrustContagionEngine: BFS propagation through the stake graph after slashes
 * - RegimeDetector: 3-layer behavioral regime change detection
 * - StakeGraphBuilder: Materialized trust graph from staking relationships
 *
 * Uses the VouchClient/Vouch HTTP API pattern — no direct DB access.
 */

// ── Types ──

export interface ContagionImpact {
  entityId: string;
  entityType: 'user' | 'agent';
  depth: number;
  economicLossSats: number;
  scoreDelta: number;
  cause: 'direct_slash' | 'backing_loss' | 'score_contagion';
}

export interface TrustContagionEvent {
  slashEventId: string;
  failedAgentId: string;
  impacts: ContagionImpact[];
  totalLossSats: number;
  createdAt: Date;
}

export interface StakeEdge {
  stakerId: string;
  stakerType: 'user' | 'agent';
  agentId: string;
  poolId: string;
  amountSats: number;
  /** Proportion of this staker's total outbound stakes (0.0-1.0) */
  exposurePct: number;
}

export interface StakeGraph {
  edges: StakeEdge[];
}

export interface RegimeDetectionConfig {
  klThreshold: number;
  ngramThreshold: number;
  fidelityDropThreshold: number;
  recentWindowHours: number;
  baselineDays: number;
  minTraces: number;
  ngramSize: number;
}

export interface RegimeChangeAlert {
  agentId: string;
  detectionLayer: 'kl_divergence' | 'ngram_sequence' | 'fidelity_drift' | 'composite';
  severity: number;
  evidence: {
    klDivergence?: number;
    ngramDivergence?: number;
    fidelityDrop?: number;
    recentDistribution?: Record<string, number>;
    baselineDistribution?: Record<string, number>;
    anomalousSequences?: string[][];
  };
  recommendation: 'monitor' | 'warn_stakers' | 'freeze_pool' | 'slash';
  detectedAt: Date;
}

export interface FidelityTrend {
  mean: number;
  current: number;
  drop: number;
}

interface BehavioralTrace {
  toolCalls: Array<{ tool_name: string; [key: string]: unknown }>;
  fidelityRatio: number;
  createdAt: string;
}

// ── Constants ──

const DEFAULT_CONFIG: RegimeDetectionConfig = {
  klThreshold: 0.5,
  ngramThreshold: 0.4,
  fidelityDropThreshold: 0.15,
  recentWindowHours: 1,
  baselineDays: 30,
  minTraces: 10,
  ngramSize: 3,
};

const MAX_CONTAGION_DEPTH = 2;
const BACKING_WEIGHT = 0.20; // backing dimension weight in composite score

// ── Helper Functions ──

/**
 * Extract n-grams from behavioral traces' tool call sequences.
 */
export function extractNgrams(traces: BehavioralTrace[], n: number): string[][] {
  const sequences: string[][] = [];
  for (const trace of traces) {
    const toolNames = trace.toolCalls.map(tc => tc.tool_name);
    for (let i = 0; i <= toolNames.length - n; i++) {
      sequences.push(toolNames.slice(i, i + n));
    }
  }
  return sequences;
}

/**
 * Convert n-grams to a frequency distribution (normalized to probabilities).
 */
export function toDistribution(ngrams: string[][]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const gram of ngrams) {
    const key = gram.join(' -> ');
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const total = ngrams.length;
  if (total === 0) return {};
  return Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, v / total]),
  );
}

/**
 * KL divergence between two distributions.
 * Port of Microsoft AGT's Python implementation.
 */
export function klDivergence(p: Record<string, number>, q: Record<string, number>): number {
  const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
  const eps = 1e-10;
  let kl = 0;
  for (const k of allKeys) {
    const pk = p[k] ?? eps;
    const qk = q[k] ?? eps;
    if (pk > 0) {
      kl += pk * Math.log(pk / qk);
    }
  }
  return kl;
}

/**
 * Determine recommendation severity based on detection results.
 */
function computeRecommendation(
  severity: number,
): RegimeChangeAlert['recommendation'] {
  if (severity >= 0.8) return 'slash';
  if (severity >= 0.6) return 'freeze_pool';
  if (severity >= 0.4) return 'warn_stakers';
  return 'monitor';
}

// ── TrustContagionEngine ──

export class TrustContagionEngine {
  private apiUrl: string;
  private fetchFn: typeof fetch;

  constructor(opts: { apiUrl: string; fetchFn?: typeof fetch }) {
    this.apiUrl = opts.apiUrl;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  /**
   * Propagate contagion through the stake graph after a slash event.
   *
   * BFS traversal from the failed agent outward:
   * - Depth 0 (direct stakers): actual economic slash + score impact
   * - Depth 1+ (indirect): score impact only (informational, not economic)
   *
   * Exposure is proportional to actual stake amount, NOT a fixed factor.
   */
  async propagate(
    slashEventId: string,
    failedAgentId: string,
    slashPercentage: number,
  ): Promise<TrustContagionEvent> {
    const impacts: ContagionImpact[] = [];
    const visited = new Set<string>();
    visited.add(failedAgentId);

    // BFS queue: [entityId, depth]
    const queue: Array<[string, number]> = [[failedAgentId, 0]];

    while (queue.length > 0) {
      const [currentId, depth] = queue.shift()!;
      if (depth >= MAX_CONTAGION_DEPTH) continue;

      // Get stake graph edges pointing TO currentId (stakers of this agent)
      const graph = await this.getStakeGraph(currentId);

      for (const edge of graph.edges) {
        if (visited.has(edge.stakerId)) continue;
        visited.add(edge.stakerId);

        if (depth === 0) {
          // Direct stakers: actual economic loss
          const economicLoss = Math.floor(edge.amountSats * slashPercentage);
          const scoreDelta = -Math.round(
            (economicLoss / Math.max(1, edge.amountSats)) * BACKING_WEIGHT * 1000,
          );

          impacts.push({
            entityId: edge.stakerId,
            entityType: edge.stakerType,
            depth: 0,
            economicLossSats: economicLoss,
            scoreDelta,
            cause: 'direct_slash',
          });

          // If staker is also an agent, enqueue for depth+1 propagation
          if (edge.stakerType === 'agent') {
            queue.push([edge.stakerId, depth + 1]);
          }
        } else {
          // Indirect: score impact only, proportional to exposure
          const scoreDelta = -Math.round(edge.exposurePct * BACKING_WEIGHT * 100);

          impacts.push({
            entityId: edge.stakerId,
            entityType: edge.stakerType,
            depth,
            economicLossSats: 0,
            scoreDelta,
            cause: depth === 1 ? 'backing_loss' : 'score_contagion',
          });

          if (edge.stakerType === 'agent' && depth + 1 < MAX_CONTAGION_DEPTH) {
            queue.push([edge.stakerId, depth + 1]);
          }
        }
      }
    }

    const totalLossSats = impacts.reduce((sum, i) => sum + i.economicLossSats, 0);

    const event: TrustContagionEvent = {
      slashEventId,
      failedAgentId,
      impacts,
      totalLossSats,
      createdAt: new Date(),
    };

    // Log contagion events to the API
    await this.logContagionEvent(event);

    return event;
  }

  /**
   * #9 fix: distinguish "no stakers" (legitimately empty graph) from
   * "fetch failed" (network error or non-2xx/404 response). The previous
   * implementation swallowed every failure into `{ edges: [] }`, so
   * `propagate()` would silently report a successful contagion sweep with
   * zero impacts after a slash if the trust-graph endpoint was merely
   * unreachable — the failure was indistinguishable from "nobody staked
   * this agent". A 404 is treated as a legitimate empty graph (no trust
   * graph row exists yet for this entity); anything else that fails throws
   * so the caller knows propagation did not complete.
   */
  private async getStakeGraph(agentId: string): Promise<StakeGraph> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.apiUrl}/v1/trust/graph/${encodeURIComponent(agentId)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Stake graph fetch failed for ${agentId}: ${msg}`);
    }
    if (res.status === 404) {
      return { edges: [] };
    }
    if (!res.ok) {
      throw new Error(`Stake graph fetch failed for ${agentId}: HTTP ${res.status}`);
    }
    const json = (await res.json()) as { data: StakeGraph };
    return json.data ?? { edges: [] };
  }

  private async logContagionEvent(event: TrustContagionEvent): Promise<void> {
    try {
      await this.fetchFn(`${this.apiUrl}/v1/trust/contagion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch {
      // Best-effort logging; don't fail propagation if logging fails
    }
  }
}

// ── RegimeDetector ──

export class RegimeDetector {
  private apiUrl: string;
  private fetchFn: typeof fetch;

  constructor(opts: { apiUrl: string; fetchFn?: typeof fetch }) {
    this.apiUrl = opts.apiUrl;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  /**
   * Run all 3 detection layers against an agent's behavioral traces.
   * Returns null if no regime change detected.
   */
  async detect(
    agentId: string,
    config?: Partial<RegimeDetectionConfig>,
  ): Promise<RegimeChangeAlert | null> {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    const now = new Date();
    const recentFrom = new Date(now.getTime() - cfg.recentWindowHours * 3600_000);
    const baselineFrom = new Date(now.getTime() - cfg.baselineDays * 86400_000);

    // Fetch traces for both windows
    const [recentTraces, baselineTraces] = await Promise.all([
      this.fetchTraces(agentId, recentFrom, now),
      this.fetchTraces(agentId, baselineFrom, recentFrom),
    ]);

    // Need minimum traces for meaningful detection
    if (baselineTraces.length < cfg.minTraces) return null;
    if (recentTraces.length === 0) return null;

    const evidence: RegimeChangeAlert['evidence'] = {};
    let triggered = false;
    let maxSeverity = 0;
    let primaryLayer: RegimeChangeAlert['detectionLayer'] = 'kl_divergence';
    let layerCount = 0;

    // Layer 1: KL divergence on action type distributions
    const recentDist = this.buildActionDistributionFromTraces(recentTraces);
    const baselineDist = this.buildActionDistributionFromTraces(baselineTraces);
    const kl = klDivergence(recentDist, baselineDist);
    evidence.klDivergence = kl;
    evidence.recentDistribution = recentDist;
    evidence.baselineDistribution = baselineDist;

    if (kl > cfg.klThreshold) {
      triggered = true;
      layerCount++;
      const severity = Math.min(1, kl / (cfg.klThreshold * 3));
      if (severity > maxSeverity) {
        maxSeverity = severity;
        primaryLayer = 'kl_divergence';
      }
    }

    // Layer 2: N-gram sequence divergence
    const recentNgrams = extractNgrams(recentTraces, cfg.ngramSize);
    const baselineNgrams = extractNgrams(baselineTraces, cfg.ngramSize);

    if (recentNgrams.length > 0 && baselineNgrams.length > 0) {
      const recentSeqDist = toDistribution(recentNgrams);
      const baselineSeqDist = toDistribution(baselineNgrams);
      const ngramKl = klDivergence(recentSeqDist, baselineSeqDist);
      evidence.ngramDivergence = ngramKl;

      if (ngramKl > cfg.ngramThreshold) {
        triggered = true;
        layerCount++;
        const severity = Math.min(1, ngramKl / (cfg.ngramThreshold * 3));
        if (severity > maxSeverity) {
          maxSeverity = severity;
          primaryLayer = 'ngram_sequence';
        }

        // Find the most anomalous sequences (in recent but not baseline)
        const baselineKeys = new Set(Object.keys(baselineSeqDist));
        evidence.anomalousSequences = recentNgrams
          .filter(ng => !baselineKeys.has(ng.join(' -> ')))
          .slice(0, 5);
      }
    }

    // Layer 3: Fidelity drift
    const fidelity = this.computeFidelityTrendFromTraces(recentTraces, baselineTraces);
    evidence.fidelityDrop = fidelity.drop;

    if (fidelity.drop > cfg.fidelityDropThreshold) {
      triggered = true;
      layerCount++;
      const severity = Math.min(1, fidelity.drop / (cfg.fidelityDropThreshold * 3));
      if (severity > maxSeverity) {
        maxSeverity = severity;
        primaryLayer = 'fidelity_drift';
      }
    }

    if (!triggered) return null;

    // Composite: if multiple layers triggered, boost severity
    const detectionLayer = layerCount >= 2 ? 'composite' : primaryLayer;
    const compositeSeverity = Math.min(1, maxSeverity * (1 + (layerCount - 1) * 0.2));

    return {
      agentId,
      detectionLayer,
      severity: compositeSeverity,
      evidence,
      recommendation: computeRecommendation(compositeSeverity),
      detectedAt: new Date(),
    };
  }

  /**
   * Build action type distribution from behavioral traces.
   * Counts action types (tool names) and normalizes to probabilities.
   */
  async buildActionDistribution(
    agentId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Record<string, number>> {
    const traces = await this.fetchTraces(agentId, fromDate, toDate);
    return this.buildActionDistributionFromTraces(traces);
  }

  /**
   * Build n-gram frequency distribution from tool call sequences.
   */
  async buildSequenceDistribution(
    agentId: string,
    fromDate: Date,
    toDate: Date,
    n: number,
  ): Promise<Record<string, number>> {
    const traces = await this.fetchTraces(agentId, fromDate, toDate);
    const ngrams = extractNgrams(traces, n);
    return toDistribution(ngrams);
  }

  /**
   * Get fidelity ratio trend for an agent.
   */
  async getFidelityTrend(
    agentId: string,
    windowHours: number,
  ): Promise<FidelityTrend> {
    const now = new Date();
    const recentFrom = new Date(now.getTime() - windowHours * 3600_000);
    const baselineFrom = new Date(now.getTime() - 30 * 86400_000);

    const [recentTraces, baselineTraces] = await Promise.all([
      this.fetchTraces(agentId, recentFrom, now),
      this.fetchTraces(agentId, baselineFrom, recentFrom),
    ]);

    return this.computeFidelityTrendFromTraces(recentTraces, baselineTraces);
  }

  // ── Private helpers ──

  private buildActionDistributionFromTraces(
    traces: BehavioralTrace[],
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const trace of traces) {
      for (const tc of trace.toolCalls) {
        counts[tc.tool_name] = (counts[tc.tool_name] ?? 0) + 1;
        total++;
      }
    }
    if (total === 0) return {};
    return Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, v / total]),
    );
  }

  private computeFidelityTrendFromTraces(
    recentTraces: BehavioralTrace[],
    baselineTraces: BehavioralTrace[],
  ): FidelityTrend {
    if (baselineTraces.length === 0) {
      return { mean: 1, current: 1, drop: 0 };
    }

    const mean =
      baselineTraces.reduce((sum, t) => sum + t.fidelityRatio, 0) /
      baselineTraces.length;

    if (recentTraces.length === 0) {
      return { mean, current: mean, drop: 0 };
    }

    const current =
      recentTraces.reduce((sum, t) => sum + t.fidelityRatio, 0) /
      recentTraces.length;

    return { mean, current, drop: Math.max(0, mean - current) };
  }

  private async fetchTraces(
    agentId: string,
    from: Date,
    to: Date,
  ): Promise<BehavioralTrace[]> {
    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await this.fetchFn(
        `${this.apiUrl}/v1/mcp-t/traces/${agentId}?${params}`,
      );
      if (!res.ok) return [];
      const json = (await res.json()) as { data: BehavioralTrace[] };
      return json.data ?? [];
    } catch {
      return [];
    }
  }
}

// ── StakeGraphBuilder ──

export class StakeGraphBuilder {
  private apiUrl: string;
  private fetchFn: typeof fetch;

  constructor(opts: { apiUrl: string; fetchFn?: typeof fetch }) {
    this.apiUrl = opts.apiUrl;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  /**
   * Get the trust graph around an agent (all stakers and their exposure).
   */
  async buildGraph(agentId: string): Promise<StakeGraph> {
    try {
      const res = await this.fetchFn(
        `${this.apiUrl}/v1/trust/graph/${agentId}`,
      );
      if (!res.ok) return { edges: [] };
      const json = (await res.json()) as { data: StakeGraph };
      return json.data;
    } catch {
      return { edges: [] };
    }
  }

  /**
   * Trigger a refresh of the materialized trust_graph_edges table.
   * Called by the refresh-trust-graph background job.
   */
  async refreshEdges(): Promise<{ edgesRefreshed: number }> {
    try {
      const res = await this.fetchFn(
        `${this.apiUrl}/v1/trust/graph/refresh`,
        { method: 'POST' },
      );
      if (!res.ok) return { edgesRefreshed: 0 };
      const json = (await res.json()) as { data: { edgesRefreshed: number } };
      return json.data;
    } catch {
      return { edgesRefreshed: 0 };
    }
  }
}

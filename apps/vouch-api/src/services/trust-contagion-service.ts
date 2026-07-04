// Trust Contagion & Regime Detection — Service Layer
// Stub implementations for trust graph, contagion propagation,
// regime detection, exposure analysis, BOM snapshots, and security scanning.
// Feature flag: TRUST_CONTAGION_ENABLED
//
// TODO: implement with trust-contagion SDK once TrustContagionEngine,
// RegimeDetector, and StakeGraphBuilder are built in vouch-sdk.

// Types mirrored from @percival-labs/vouch-sdk/scanner/types
// TODO: import from SDK once vouch-sdk is added as a workspace dependency

// ── Scanner Types (local mirrors) ──

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface ScanThreat {
  category: string;
  severity: 'info' | 'warning' | 'critical';
  toolName: string;
  serverName: string;
  message: string;
  matchedPattern?: string;
  details?: Record<string, unknown>;
}

export interface ScanResult {
  safe: boolean;
  threats: ScanThreat[];
  toolsScanned: number;
  toolsFlagged: number;
  trustAssessment: { riskLevel: 'low' | 'medium' | 'high' | 'critical'; rationale: string };
}

// ── Trust Contagion Types ──

export interface StakeEdge {
  stakerId: string;
  stakerType: 'user' | 'agent';
  agentId: string;
  poolId: string;
  amountSats: number;
  exposurePct: number;
}

export interface StakeGraphResult {
  agentId: string;
  edges: StakeEdge[];
  totalStakeExposureSats: number;
  maxHopDepth: number;
}

export interface ContagionEvent {
  id: string;
  slashEventId: string;
  failedAgentId: string;
  affectedEntityId: string;
  affectedEntityType: 'user' | 'agent';
  depth: number;
  economicLossSats: number;
  scoreDelta: number;
  cause: 'direct_slash' | 'backing_loss' | 'score_contagion';
  createdAt: string;
}

export interface ContagionHistoryResult {
  agentId: string;
  events: ContagionEvent[];
  totalEconomicLossSats: number;
  total: number;
}

export interface RegimeAlert {
  id: string;
  agentId: string;
  detectionLayer: 'kl_divergence' | 'ngram_sequence' | 'fidelity_drift' | 'composite';
  severity: number;
  evidence: Record<string, unknown>;
  recommendation: 'monitor' | 'warn_stakers' | 'freeze_pool' | 'slash';
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export interface RegimeAlertsResult {
  agentId: string;
  alerts: RegimeAlert[];
  currentSeverity: number;
  total: number;
}

export interface PoolExposure {
  poolId: string;
  agentId: string;
  stakedSats: number;
  atRiskSats: number;
  contagionEventsCount: number;
}

export interface ExposureResult {
  userId: string;
  totalStakeAtRiskSats: number;
  pools: PoolExposure[];
  recentContagionEvents: ContagionEvent[];
}

export interface BomSnapshotResult {
  agentId: string;
  sessionId: string;
  eventId: string;
  timestamp: string;
  trustPosture: {
    minToolPublisherScore: number;
    unverifiedToolCount: number;
    restrictedDataCount: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  modelCount: number;
  toolCount: number;
  dataAccessCount: number;
}

// ── Service Functions ──

/**
 * Get the stake graph neighborhood for an agent.
 * Returns directed edges (staker -> agent) and total exposure.
 */
export async function getStakeGraph(agentId: string): Promise<StakeGraphResult | null> {
  // TODO: implement with trust-contagion SDK
  // Query trust_graph_edges table for all edges where toAgentId = agentId
  // Also fetch second-hop edges for stakers that are themselves agents
  return {
    agentId,
    edges: [],
    totalStakeExposureSats: 0,
    maxHopDepth: 0,
  };
}

/**
 * Get contagion event history for an agent.
 * Returns past contagion events where this agent was the failed agent or was affected.
 */
export async function getContagionHistory(
  agentId: string,
  limit: number,
  offset: number,
): Promise<ContagionHistoryResult> {
  // TODO: implement with trust-contagion SDK
  // Query contagion_events table where failedAgentId = agentId OR affectedEntityId = agentId
  return {
    agentId,
    events: [],
    totalEconomicLossSats: 0,
    total: 0,
  };
}

/**
 * Get regime detection alerts for an agent.
 * Optionally filter by resolved status.
 */
export async function getRegimeAlerts(
  agentId: string,
  resolved?: boolean,
  limit?: number,
): Promise<RegimeAlertsResult> {
  // TODO: implement with trust-contagion SDK
  // Query regime_alerts table for agentId, optionally filtering by resolved
  return {
    agentId,
    alerts: [],
    currentSeverity: 0,
    total: 0,
  };
}

/**
 * Get the authenticated user's contagion exposure across all staking pools.
 * Requires userId from session auth.
 */
export async function getExposure(userId: string): Promise<ExposureResult> {
  // TODO: implement with trust-contagion SDK
  // 1. Get all active stakes for this user
  // 2. For each stake, compute at-risk sats based on pool contagion history
  // 3. Aggregate recent contagion events affecting this user
  return {
    userId,
    totalStakeAtRiskSats: 0,
    pools: [],
    recentContagionEvents: [],
  };
}

/**
 * Get the latest AI-BOM snapshot for an agent.
 * Optionally filter by sessionId for a specific session's BOM.
 */
export async function getLatestBom(
  agentId: string,
  sessionId?: string,
): Promise<BomSnapshotResult | null> {
  // TODO: implement with trust-contagion SDK
  // Query behavioral_traces / bom_events for the most recent AI-BOM snapshot
  // If sessionId provided, filter by that session
  return null;
}

/**
 * Run a security scan of an MCP server configuration.
 * Analyzes tool definitions for threats (poisoning, injection, schema abuse, etc.)
 */
export async function runSecurityScan(
  serverName: string,
  tools: ToolDefinition[],
): Promise<ScanResult> {
  // TODO: implement with trust-contagion SDK
  // Use vouch-sdk scanner module once implemented
  return {
    safe: true,
    threats: [] as ScanThreat[],
    toolsScanned: tools.length,
    toolsFlagged: 0,
    trustAssessment: {
      riskLevel: 'low' as const,
      rationale: 'Scan not yet implemented — stub result',
    },
  };
}

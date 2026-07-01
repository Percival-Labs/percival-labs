// MCP-T Reporter — Publishes agent behavioral traces to the MCP-T v2 protocol.
// Replaces direct Vouch API reporting with standardized MCP-T behavior.trace events.
// Reporting is fire-and-forget: failures are logged but never block task execution.

import { scoreEvidence, type Evidence, type EvidenceScore } from './evidence';
import { eventBus } from '../events';
import { loadAgentIdentity } from './nip98-auth';
import {
  createMcpTClientWithOptions,
  type NostrIdentity,
  type McpTClient,
} from '@percival-labs/vouch-sdk';

// ── Config ──

const MCP_T_ENDPOINT = process.env.MCP_T_ENDPOINT || 'http://localhost:3601/mcp-t/v1';
const MCP_T_ENABLED = (process.env.MCP_T_ENDPOINT || '').length > 0 ||
                       (process.env.MCP_T_ENABLED === 'true');
const PUBLISH_TIMEOUT_MS = 5000;

// Lazy-load agent identity + shared MCP-T client (only when enabled + first publish)
let _agentIdentity: NostrIdentity | null = null;
let _client: McpTClient | null = null;

function getAgentIdentity(): NostrIdentity {
  if (!_agentIdentity) {
    const key = process.env.AGENT_NOSTR_NSEC || '';
    _agentIdentity = loadAgentIdentity(key);
  }
  return _agentIdentity;
}

function getClient(): McpTClient {
  if (!_client) {
    _client = createMcpTClientWithOptions({
      endpoint: MCP_T_ENDPOINT,
      identity: getAgentIdentity(),
      timeoutMs: PUBLISH_TIMEOUT_MS,
    });
  }
  return _client;
}

// ── Types ──

export interface BehaviorTrace {
  type: 'behavior.trace';
  subject: string;
  dimension: string;
  evidence: {
    taskId: string;
    type: string;
    summary: string;
    artifactCount: number;
    quality?: number;
  };
  timestamp: string;
}

export interface McpTReportResult {
  score: EvidenceScore;
  published: boolean;
  error?: string;
}

// ── Public API ──

/**
 * Format evidence into an MCP-T behavior.trace event.
 * Exported for testing and direct use.
 */
export function formatBehaviorTrace(evidence: Evidence): BehaviorTrace {
  return {
    type: 'behavior.trace',
    subject: evidence.agent,
    dimension: 'behavioral_fidelity',
    evidence: {
      taskId: evidence.taskId,
      type: evidence.type,
      summary: evidence.summary,
      artifactCount: evidence.artifacts.length,
    },
    timestamp: evidence.timestamp,
  };
}

/**
 * Score evidence locally and publish as MCP-T behavior.trace (if configured).
 * Always returns the local score regardless of MCP-T availability.
 *
 * This is the MCP-T counterpart to vouch-reporter's scoreAndReport.
 * Evidence quality feeds into behavioral_fidelity trust scoring.
 */
export async function scoreAndPublish(evidence: Evidence): Promise<McpTReportResult> {
  // 1. Score locally (always works, zero network)
  const score = scoreEvidence(evidence);

  // 2. Publish scored event for Discord/SSE consumers
  eventBus.publish('evidence_scored', {
    taskId: evidence.taskId,
    agent: evidence.agent,
    type: evidence.type,
    quality: score.quality,
    factors: score.factors,
  });

  // 3. Publish to MCP-T if configured
  if (!MCP_T_ENABLED) {
    return { score, published: false };
  }

  try {
    // Publish through the shared SDK path (correct JSON-RPC envelope + auth).
    // issuer_id is bound server-side to the authenticated caller — never set here.
    const result = await getClient().publishTrace(evidence.agent, {
      trace_id: evidence.taskId,
      tool_calls: [],
      resources_accessed: [],
      duration_ms: 1,
    });

    // FIX C5: check the JSON-RPC error field, not just transport success.
    // A rejected event returns HTTP 200 with an error body; reporting
    // `published: true` on such a response is exactly what hid the bug.
    if (!result.ok) {
      const message = `${result.error?.code ?? ''} ${result.error?.message ?? 'rejected'}`.trim();
      console.warn(`[mcp-t-reporter] Publish rejected (non-blocking): ${message}`);
      return { score, published: false, error: message };
    }
    return { score, published: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[mcp-t-reporter] Publish failed (non-blocking): ${message}`);
    return { score, published: false, error: message };
  }
}

/**
 * Score evidence without publishing to MCP-T.
 * Use when you just need the quality score (e.g., for display).
 */
export function scoreOnly(evidence: Evidence): EvidenceScore {
  return scoreEvidence(evidence);
}


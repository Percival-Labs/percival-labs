// Vouch Gateway — Audit Log
//
// Structured audit trail for all gateway operations.
// Logged to console (Cloudflare Workers Logs / Logpush) with
// structured JSON for easy ingestion by any log aggregator.
//
// Audit events are append-only, immutable, and include:
// - Who (identity/pubkey, auth mode)
// - What (model, provider, action)
// - When (timestamp)
// - Outcome (success/failure, cost, tokens)
//
// NO request/response bodies are logged — only metadata.
// This is critical for privacy (we never see prompt content).

export type AuditAction =
  | 'inference'
  | 'admin:list'
  | 'admin:get'
  | 'admin:create'
  | 'admin:update'
  | 'admin:delete'
  | 'agent:query'
  | 'auth:failed'
  | 'rate:limited'
  | 'budget:exceeded'
  | 'model:blocked'
  | 'anomaly:flagged';

export interface AuditEntry {
  timestamp: string;      // ISO 8601
  action: AuditAction;
  authMode: string;       // transparent, private, agent-key, anonymous
  pubkey: string;         // first 16 chars only (privacy)
  agentId?: string;       // human-readable agent ID
  model?: string;
  provider?: string;
  status: number;         // HTTP status code
  inputTokens?: number;
  outputTokens?: number;
  costSats?: number;
  tier?: string;
  reason?: string;        // for failures/blocks
  durationMs?: number;    // request latency
}

/**
 * Emit a structured audit log entry.
 * Uses console.log with JSON — picked up by Cloudflare Workers Logs
 * and any configured Logpush destinations.
 *
 * Format: single-line JSON prefixed with [audit] for filtering.
 */
export function emitAuditLog(entry: AuditEntry): void {
  // Truncate pubkey for privacy — enough for correlation, not identification
  const sanitized = {
    ...entry,
    pubkey: entry.pubkey ? entry.pubkey.slice(0, 16) : 'unknown',
  };

  console.log(`[audit] ${JSON.stringify(sanitized)}`);
}

/**
 * Create a timing helper for measuring request duration.
 */
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

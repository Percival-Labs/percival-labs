// Vouch Gateway — Audit Log
//
// Structured audit trail for all gateway operations.
// Dual output: console.log (CF Workers Logs) + KV storage (queryable API).
//
// Audit events are append-only, immutable, and include:
// - Who (identity/pubkey, auth mode)
// - What (model, provider, action)
// - When (timestamp)
// - Outcome (success/failure, cost, tokens)
//
// NO request/response bodies are logged — only metadata.
// This is critical for privacy (we never see prompt content).

import type { Env } from './types';

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
 * Store an audit entry in KV for queryable API access.
 * Rolling buffer per pubkey — keeps the last MAX_ENTRIES entries.
 * 30-day TTL ensures automatic cleanup.
 *
 * NOTE: KV is eventually consistent. Concurrent requests for the same
 * pubkey can cause a lost-write (last writer wins, dropping one entry).
 * This is the same tradeoff documented in budget.ts — acceptable for
 * audit logging where occasional dropped entries don't compromise security.
 * For strict audit requirements, migrate to Durable Objects.
 */
const MAX_AUDIT_ENTRIES = 200;
const AUDIT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function storeAuditEntry(entry: AuditEntry, env: Env): Promise<void> {
  // Truncate pubkey in stored entry — same privacy as console logs.
  // Full pubkey is available via agent key lookup if forensics are needed.
  const sanitized: AuditEntry = {
    ...entry,
    pubkey: entry.pubkey ? entry.pubkey.slice(0, 16) : 'unknown',
  };

  const pubkey = entry.pubkey || 'unknown';
  const kvKey = `audit:${pubkey}`;

  // Read existing entries
  const existing = await env.VOUCH_ANOMALY.get<AuditEntry[]>(kvKey, 'json');
  const entries = existing ?? [];

  // Append sanitized entry, trim to max
  entries.push(sanitized);
  if (entries.length > MAX_AUDIT_ENTRIES) {
    entries.splice(0, entries.length - MAX_AUDIT_ENTRIES);
  }

  await env.VOUCH_ANOMALY.put(kvKey, JSON.stringify(entries), {
    expirationTtl: AUDIT_TTL_SECONDS,
  });
}

/**
 * Retrieve audit history for a given pubkey.
 * Optional filters: action type, date range, limit.
 */
export async function getAuditHistory(
  pubkey: string,
  env: Env,
  options?: {
    action?: AuditAction;
    since?: string;   // ISO 8601
    limit?: number;
  },
): Promise<AuditEntry[]> {
  const kvKey = `audit:${pubkey}`;
  const entries = await env.VOUCH_ANOMALY.get<AuditEntry[]>(kvKey, 'json');
  if (!entries) return [];

  let filtered = entries;

  if (options?.action) {
    filtered = filtered.filter(e => e.action === options.action);
  }

  if (options?.since) {
    const sinceTime = new Date(options.since).getTime();
    if (!Number.isNaN(sinceTime)) {
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= sinceTime);
    }
    // Invalid date strings are silently ignored — returns unfiltered results
  }

  const limit = options?.limit ?? 50;
  // Return most recent first
  return filtered.slice(-limit).reverse();
}

/**
 * Create a timing helper for measuring request duration.
 */
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

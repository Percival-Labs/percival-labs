/**
 * MCP-T Behavioral Trace Emitter -- Shared Daemon Wrapper
 *
 * Thin wrapper for daemon scripts to emit MCP-T behavioral traces
 * without needing to know about the Vouch SDK directly.
 *
 * Dual-write: publishes to MCP-T endpoint AND appends to local
 * dogfood JSONL files for offline analysis.
 *
 * Fire-and-forget: never throws, never blocks the daemon tick loop.
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// -- Types ------------------------------------------------------------------

export interface TraceInput {
  /** Agent name (e.g. "sentry", "egg", "oracle") */
  agentName: string;
  /** Unique tick or task identifier */
  tickId: string;
  /** Event type classification (e.g. "vouch.score.snapshot") */
  eventType: string;
  /** Computed score 0-100 */
  score?: number;
  /** Per-dimension scores */
  dimensions?: Record<string, number>;
  /** Whether the operation succeeded */
  success: boolean;
  /** Operation duration in milliseconds */
  durationMs?: number;
  /** Supporting evidence or summary text */
  evidence?: string;
}

// -- Lazy MCP-T Client (singleton) ------------------------------------------

// Dynamic import avoids hard dependency on vouch-sdk at load time.
// If the SDK is not installed or MCP-T is not configured, we skip silently.
interface MinimalMcpTClient {
  publishTrace: (
    subjectId: string,
    payload: {
      trace_id: string;
      tool_calls: unknown[];
      resources_accessed: unknown[];
      duration_ms: number;
    },
  ) => Promise<{ ok: boolean; error?: { code: number; message: string } }>;
}

let _clientLoaded = false;
let _client: MinimalMcpTClient | null = null;

async function getClient(): Promise<MinimalMcpTClient | null> {
  if (_clientLoaded) return _client;
  _clientLoaded = true;

  try {
    // Use relative path since workspace linking may not be configured
    const sdk = await import('../../packages/vouch-sdk/src/mcp-t-client.js');
    _client = sdk.createMcpTClient() as MinimalMcpTClient | null;
  } catch {
    // SDK not available or MCP-T not configured -- silent fallback
    _client = null;
  }
  return _client;
}

// -- Dogfood JSONL Writer ---------------------------------------------------

const ROOT = join(import.meta.dir, '..', '..');
const DOGFOOD_DIR = join(ROOT, 'data', 'dogfood', 'agent-workshop', 'runs');
const SCHEMA_VERSION = '0.1.0';

function generateUUID(): string {
  return crypto.randomUUID();
}

function buildDogfoodEvent(input: TraceInput): Record<string, unknown> {
  return {
    schema_version: SCHEMA_VERSION,
    event_id: generateUUID(),
    timestamp: new Date().toISOString(),
    source_system: 'mcp-t',
    source_instance: input.agentName,
    event_type: input.eventType,
    severity: input.success ? 'info' : 'warning',
    actor: {
      type: 'agent',
      id: `agent-workshop.${input.agentName}`,
      role: input.agentName,
    },
    payload: {
      tickId: input.tickId,
      score: input.score,
      dimensions: input.dimensions,
      success: input.success,
      durationMs: input.durationMs,
      evidence: input.evidence,
    },
    tags: [input.agentName, 'mcp-t', 'behavioral-trace'],
    trace_context: {},
  };
}

function writeDogfoodTrace(input: TraceInput): void {
  try {
    if (!existsSync(DOGFOOD_DIR)) {
      mkdirSync(DOGFOOD_DIR, { recursive: true });
    }

    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `${date}_${input.agentName}_trace.jsonl`;
    const filepath = join(DOGFOOD_DIR, filename);

    const event = buildDogfoodEvent(input);
    appendFileSync(filepath, JSON.stringify(event) + '\n');
  } catch {
    // Never crash the daemon over a trace write failure
  }
}

// -- Public API -------------------------------------------------------------

/**
 * Emit a behavioral trace for a daemon tick.
 *
 * Dual-write:
 *   1. Publishes to MCP-T endpoint via Vouch SDK (if configured)
 *   2. Appends to local dogfood JSONL file (always)
 *
 * Fire-and-forget: returns immediately, never throws.
 */
export async function emitBehavioralTrace(input: TraceInput): Promise<void> {
  // 1. Always write to dogfood JSONL (synchronous, fast)
  writeDogfoodTrace(input);

  // 2. Publish to MCP-T endpoint (async, fire-and-forget)
  try {
    const client = await getClient();
    if (client) {
      // FIX C5: send the correct JSON-RPC envelope via the shared path and
      // inspect the JSON-RPC result. `res.ok`-only checks silently dropped
      // every trace (server rejects the old {events:[...]} shape at HTTP 200).
      // issuer_id is bound server-side to the authenticated caller — not set here.
      client
        .publishTrace(input.agentName, {
          trace_id: input.tickId,
          tool_calls: [],
          resources_accessed: [],
          duration_ms: input.durationMs && input.durationMs > 0 ? input.durationMs : 1,
        })
        .then((r) => {
          if (!r.ok) {
            console.warn(
              `[mcp-t-emitter] Publish rejected (non-blocking): ${r.error?.code ?? ''} ${r.error?.message ?? ''}`.trim(),
            );
          }
        })
        .catch(() => {
          /* Fire-and-forget: never let MCP-T failures affect the daemon */
        });
    }
  } catch {
    // Fire-and-forget: never let MCP-T failures affect the daemon
  }
}

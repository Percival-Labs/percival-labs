/**
 * MCP-T Behavioral Trace Client
 *
 * Publishes behavioral traces to the MCP-T v2 protocol endpoint.
 * Fire-and-forget: errors are logged but never thrown to callers.
 * Uses NIP-98 signed Nostr events for authentication.
 */

import {
  generateNostrKeypair,
  identityFromNsec,
  identityFromHex,
  signEvent,
  type NostrIdentity,
  type UnsignedEvent,
} from './nostr-identity.js';

// -- Types ------------------------------------------------------------------

export interface BehaviorTraceInput {
  /** Agent or subject identifier */
  subject: string;
  /** MCP-T dimension (e.g. "behavioral_fidelity", "completion_rate") */
  dimension: string;
  /** Event type classification */
  eventType: string;
  /** Computed score 0-100 */
  score?: number;
  /** Per-dimension scores */
  dimensions?: Record<string, number>;
  /** Summary of what happened */
  summary: string;
  /** Unique task or tick identifier */
  taskId: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** Operation duration in milliseconds */
  durationMs?: number;
  /** Supporting evidence text */
  evidence?: string;
  /** ISO timestamp (defaults to now) */
  timestamp?: string;
}

export interface BehaviorTrace {
  type: 'behavior.trace';
  subject: string;
  dimension: string;
  evidence: {
    taskId: string;
    type: string;
    summary: string;
    score?: number;
    dimensions?: Record<string, number>;
    success: boolean;
    durationMs?: number;
  };
  timestamp: string;
}

// ── Canonical MCP-T v0.2.0 behavior.trace wire shape ──
// This is the SINGLE source of truth for the payload the server validates
// (mirrors `behaviorTracePayloadSchema` in vouch-api/services/mcp-t-adapter.ts).
// All in-repo producers publish through this shape via `publishTrace()`.

export interface ToolCallInput {
  tool_name: string;
  /** Hex hash of the tool arguments (raw args MUST NOT be sent). */
  arguments_hash?: string;
  timestamp: string;
  duration_ms: number;
  result_hash?: string;
  /** True if this call was part of the agent's declared intent. */
  declared: boolean;
}

export interface ResourceAccessInput {
  resource_type: 'file' | 'network' | 'database' | 'api' | 'memory' | 'system';
  resource_id: string;
  access_type: 'read' | 'write' | 'execute' | 'delete';
  declared: boolean;
}

export interface SideEffectInput {
  type: 'file_write' | 'network_request' | 'state_mutation' | 'notification' | 'other';
  target: string;
  declared: boolean;
}

export interface BehaviorTracePayload {
  trace_id: string;
  contract_id?: string;
  tool_calls: ToolCallInput[];
  resources_accessed: ResourceAccessInput[];
  side_effects?: SideEffectInput[];
  duration_ms: number;
}

export interface BehaviorTraceEvent {
  event_id: string;
  event_type: 'behavior.trace';
  subject_id: string;
  timestamp: string;
  payload: BehaviorTracePayload;
}

export interface TrustPublishEnvelope {
  jsonrpc: '2.0';
  id: string;
  method: 'trust/publish';
  params: { event: BehaviorTraceEvent };
}

export interface PublishTraceResult {
  /** True only when the server returned `accepted: true` for the event. */
  ok: boolean;
  accepted?: boolean;
  traceId?: string;
  fidelityRatio?: number;
  /** Populated on transport failure OR a JSON-RPC error body (HTTP 200). */
  error?: { code: number; message: string };
}

export interface McpTClientOptions {
  /** MCP-T publish endpoint URL */
  endpoint: string;
  /** Nostr identity for NIP-98 auth */
  identity: NostrIdentity;
  /** Publish timeout in ms (default 5000) */
  timeoutMs?: number;
}

export interface McpTClient {
  /** Publish a single summary trace (fire-and-forget; emits correct envelope). */
  publish(trace: BehaviorTraceInput): void;
  /** Publish a batch of summary traces (fire-and-forget). */
  publishBatch(traces: BehaviorTraceInput[]): void;
  /**
   * Publish a structured behavior.trace and await the result. PREFERRED path:
   * surfaces JSON-RPC rejections (self-vouch, validation, rate-limit) instead of
   * swallowing them. `issuer_id` is bound server-side to the authenticated caller.
   */
  publishTrace(subjectId: string, payload: BehaviorTracePayload): Promise<PublishTraceResult>;
  /** The underlying identity */
  readonly identity: NostrIdentity;
}

// -- NIP-98 Auth (inline to avoid cross-package dependency) -----------------

export async function createNip98AuthHeader(opts: {
  url: string;
  method: string;
  secretKeyHex: string;
  pubkeyHex: string;
  body?: string;
}): Promise<string> {
  const tags: string[][] = [
    ['u', opts.url],
    ['method', opts.method],
  ];

  if (opts.body) {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(opts.body),
    );
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    tags.push(['payload', hashHex]);
  }

  const authEvent: UnsignedEvent = {
    pubkey: opts.pubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    kind: 27235,
    tags,
    content: '',
  };

  const signedAuth = await signEvent(authEvent, opts.secretKeyHex);
  return `Nostr ${btoa(JSON.stringify(signedAuth))}`;
}

// -- Envelope Construction --------------------------------------------------

/**
 * Build the canonical MCP-T `trust/publish` JSON-RPC envelope for a behavior.trace.
 *
 * NOTE: `issuer_id` is intentionally omitted. The server binds it to the
 * authenticated NIP-98 caller and ignores any client-supplied issuer, which is
 * what prevents forged third-party / self-vouch attestations. Do not add it here.
 */
export function buildTrustPublishEnvelope(
  subjectId: string,
  payload: BehaviorTracePayload,
  opts?: { id?: string; timestamp?: string; eventId?: string },
): TrustPublishEnvelope {
  const eventId = opts?.eventId ?? `evt-${payload.trace_id}`;
  return {
    jsonrpc: '2.0',
    id: opts?.id ?? eventId,
    method: 'trust/publish',
    params: {
      event: {
        event_id: eventId,
        event_type: 'behavior.trace',
        subject_id: subjectId,
        timestamp: opts?.timestamp ?? new Date().toISOString(),
        payload,
      },
    },
  };
}

/**
 * Publish a single structured behavior.trace via MCP-T `trust/publish`.
 *
 * Emits the correct JSON-RPC envelope, authenticates with NIP-98, and — the
 * critical fix — inspects the JSON-RPC `error` field. A rejected event returns
 * HTTP 200 with an error body, so checking `res.ok` alone silently drops every
 * failure (this is the bug that made "zero traces land" invisible).
 */
export async function publishTrace(
  subjectId: string,
  payload: BehaviorTracePayload,
  opts: { endpoint: string; identity: NostrIdentity; timeoutMs?: number },
): Promise<PublishTraceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5000);

  try {
    const url = `${opts.endpoint}/publish`;
    const bodyStr = JSON.stringify(buildTrustPublishEnvelope(subjectId, payload));

    const authHeader = await createNip98AuthHeader({
      url,
      method: 'POST',
      secretKeyHex: opts.identity.secretKeyHex,
      pubkeyHex: opts.identity.pubkeyHex,
      body: bodyStr,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: bodyStr,
      signal: controller.signal,
    });

    type JsonRpcBody = {
      error?: { code: number; message: string };
      result?: { accepted?: boolean; trace_id?: string; fidelity_ratio?: number };
    };
    let json: JsonRpcBody | null = null;
    try {
      json = (await res.json()) as JsonRpcBody;
    } catch {
      /* non-JSON body */
    }

    if (!res.ok) {
      return { ok: false, error: { code: res.status, message: `HTTP ${res.status}` } };
    }
    if (json?.error) {
      return { ok: false, error: { code: json.error.code, message: json.error.message } };
    }

    const result = json?.result ?? {};
    const accepted = result.accepted === true;
    return {
      ok: accepted,
      accepted,
      traceId: result.trace_id,
      fidelityRatio: result.fidelity_ratio,
      error: accepted ? undefined : { code: -1, message: 'event not accepted' },
    };
  } finally {
    clearTimeout(timeout);
  }
}

// -- Summary → structured mapping -------------------------------------------

/**
 * Map a summary-shaped `BehaviorTraceInput` to a structurally-valid payload.
 *
 * Summary producers (daemon ticks, evidence scores) carry no per-tool
 * declared/undeclared data, so the tool arrays are empty. Such a trace LANDS
 * and is now visible, but its fidelity is not yet meaningful — see the design
 * note in FABLE-REVIEW follow-up: summary producers must be upgraded to emit
 * real tool-call declarations before their fidelity contribution is trusted.
 */
function inputToPayload(input: BehaviorTraceInput): BehaviorTracePayload {
  return {
    trace_id: input.taskId,
    tool_calls: [],
    resources_accessed: [],
    duration_ms: input.durationMs && input.durationMs > 0 ? input.durationMs : 1,
  };
}

// -- Client Implementation --------------------------------------------------

function createClient(opts: McpTClientOptions): McpTClient {
  const cfg = {
    endpoint: opts.endpoint,
    identity: opts.identity,
    timeoutMs: opts.timeoutMs ?? 5000,
  };

  function fireAndForget(input: BehaviorTraceInput): void {
    publishTrace(input.subject, inputToPayload(input), cfg)
      .then((r) => {
        if (!r.ok) {
          console.warn(
            `[mcp-t-client] Publish rejected: ${r.error?.code ?? ''} ${r.error?.message ?? ''}`.trim(),
          );
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[mcp-t-client] Publish failed (non-blocking): ${msg}`);
      });
  }

  return {
    identity: opts.identity,
    publishTrace: (subjectId, payload) => publishTrace(subjectId, payload, cfg),
    publish: (input) => fireAndForget(input),
    publishBatch: (inputs) => {
      for (const input of inputs) fireAndForget(input);
    },
  };
}

// -- Factory ----------------------------------------------------------------

/**
 * Load identity from key string. Accepts nsec, hex, or empty (generates ephemeral).
 */
function loadIdentity(key: string | undefined): NostrIdentity {
  if (!key || key.trim().length === 0) {
    return generateNostrKeypair();
  }
  const trimmed = key.trim();
  if (trimmed.startsWith('nsec1')) {
    return identityFromNsec(trimmed);
  }
  return identityFromHex(trimmed);
}

/**
 * Create an MCP-T client from environment variables.
 *
 * Reads:
 *   - MCP_T_ENDPOINT (default: http://localhost:3601/mcp-t/v1)
 *   - AGENT_NOSTR_NSEC (optional, generates ephemeral keypair if missing)
 *
 * Returns null if MCP-T is not configured (no endpoint and MCP_T_ENABLED !== 'true').
 */
export function createMcpTClient(): McpTClient | null {
  const endpoint =
    process.env.MCP_T_ENDPOINT || 'http://localhost:3601/mcp-t/v1';
  const enabled =
    (process.env.MCP_T_ENDPOINT || '').length > 0 ||
    process.env.MCP_T_ENABLED === 'true';

  if (!enabled) {
    return null;
  }

  const identity = loadIdentity(process.env.AGENT_NOSTR_NSEC);

  return createClient({
    endpoint,
    identity,
  });
}

/**
 * Create an MCP-T client with explicit options (for testing or custom configs).
 */
export function createMcpTClientWithOptions(
  opts: McpTClientOptions,
): McpTClient {
  return createClient(opts);
}

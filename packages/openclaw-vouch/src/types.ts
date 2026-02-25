// OpenClaw Plugin API (based on their documented hook system)
// Defined here since @types/openclaw doesn't exist yet

export interface OpenClawPluginAPI {
  registerHook(name: string, handler: HookHandler, meta?: HookMeta): void;
}

export interface HookMeta {
  name: string;
  description: string;
}

export type HookHandler = (context: HookContext) => Promise<HookResult>;

export interface HookContext {
  agentId: string;
  sessionId: string;
  tool?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  result?: {
    success: boolean;
    output: unknown;
    error?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface HookResult {
  /** For pre-hooks: allow/deny execution */
  allow?: boolean;
  /** Modify tool arguments */
  modify?: Record<string, unknown>;
  /** Add metadata to context */
  metadata?: Record<string, unknown>;
}

// Plugin configuration
export interface VouchPluginConfig {
  /** Nostr private key for this agent (bech32 nsec) */
  nsec?: string;
  /** Vouch API URL (defaults to production Railway) */
  apiUrl?: string;
  /** Minimum trust score to execute tools (0-1000, default: 0 = no gating) */
  minScore?: number;
  /** Tools that require elevated trust (tool name -> minimum score) */
  trustedTools?: Record<string, number>;
  /** Tools that are always allowed regardless of score */
  allowlistedTools?: string[];
  /** Whether to auto-register if not already registered */
  autoRegister?: boolean;
  /** Agent name for auto-registration */
  agentName?: string;
  /** Log all tool executions to Vouch as outcomes */
  logOutcomes?: boolean;
  /** Score cache TTL in ms (default: 60000) */
  cacheTtlMs?: number;
}

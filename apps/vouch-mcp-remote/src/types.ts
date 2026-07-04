// MCP Protocol Types — JSON-RPC 2.0 + MCP Streamable HTTP
// No runtime dependencies. Pure type definitions.

// -- Cloudflare Worker Env --

export interface Env {
  VOUCH_API_URL: string;
  ENVIRONMENT: string;
}

// -- JSON-RPC 2.0 --

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// -- MCP Protocol --

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolResult {
  content: McpContent[];
  isError?: boolean;
}

export interface McpContent {
  type: 'text';
  text: string;
}

// -- Tool Input Types --

export interface CheckTrustInput {
  identifier: string;
  identifier_type: 'agent_id' | 'pubkey' | 'evm_address';
}

export interface CheckAcpHistoryInput {
  address: string;
}

export interface ShouldTrustInput {
  identifier: string;
  identifier_type: 'agent_id' | 'pubkey' | 'evm_address';
  threshold?: number;
}

export interface VerifyAttestationInput {
  identity_hash: string;
  score: number;
  threshold: number;
  expiry: number;
  signature: {
    R8x: string;
    R8y: string;
    S: string;
  };
}

export interface GetEcosystemStatsInput {
  // No required params
}

export interface ListTrustedAgentsInput {
  min_score?: number;
  limit?: number;
}

// -- Standard JSON-RPC Error Codes --

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' },
} as const;

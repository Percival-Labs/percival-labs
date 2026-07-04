/**
 * Bittensor MCP Server — Type Definitions
 *
 * MCP-T trust attestation types aligned with MCP-T v0.2.0 spec.
 * These are the OPEN PROTOCOL types — anyone can implement these.
 */

// ── MCP-T Trust Attestation (Open Protocol) ──

export interface TrustAttestation {
  subject: string; // ss58 address or hotkey
  subjectType: 'miner' | 'validator' | 'subnet';
  netuid: number;
  timestamp: string;
  dimensions: TrustDimension[];
  composite: number; // 0-1000
  confidence: number; // 0.0-1.0
  provider: string;
  methodology: string;
}

export interface TrustDimension {
  name: string;
  value: number; // 0-1000
  confidence: number;
  evidence?: string;
}

// ── Bittensor Metagraph Types ──

export interface SubnetInfo {
  netuid: number;
  name?: string;
  minerCount: number;
  validatorCount: number;
  emission: number;
  tempo: number;
}

export interface NeuronInfo {
  uid: number;
  hotkey: string;
  coldkey: string;
  stake: number;
  trust: number;
  consensus: number;
  incentive: number;
  dividends: number;
  emission: number;
  isValidator: boolean;
  lastUpdate: number;
  rank: number;
  validatorPermit: boolean;
}

// ── Weight-Copying Detection ──

export interface WeightCopyingAnalysis {
  netuid: number;
  analyzedAt: string;
  totalValidators: number;
  suspectedCopiers: SuspectedCopier[];
  networkHealthScore: number; // 0-1000 (higher = healthier)
  summary: string;
}

export interface SuspectedCopier {
  uid: number;
  hotkey: string;
  similarity: number; // 0.0-1.0 (1.0 = exact copy)
  copiedFrom: number; // uid of the validator being copied
  evidenceType: 'exact_match' | 'high_correlation' | 'delayed_mirror';
  confidence: number;
  attestation: TrustAttestation;
}

// ── Validator Integration Types ──

export interface TrustBlendConfig {
  trustWeight: number; // 0.0-1.0, how much trust influences final score
  dimensions: string[]; // which MCP-T dimensions to use
  minConfidence: number; // minimum confidence to apply trust adjustment
  decayDays: number; // how many days before attestations expire
}

export interface BlendedScore {
  uid: number;
  hotkey: string;
  rawScore: number; // validator's own evaluation (0.0-1.0)
  trustScore: number; // MCP-T attestation composite (0-1000)
  blendedScore: number; // final score after trust blending
  trustApplied: boolean; // whether trust was used (false if below confidence threshold)
  explanation: string;
}

// ── MCP Protocol Types ──

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

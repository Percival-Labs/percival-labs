// SCANNER_ENABLED = "false"
/**
 * MCP Security Scanner — Shared Types
 *
 * All type definitions for the scanner module: threats, results,
 * fingerprints, and response scanning.
 */

// ── Threat Classification ──

export type ThreatCategory =
  | 'tool_poisoning'        // hidden instructions in tool descriptions
  | 'description_injection' // prompt injection in metadata
  | 'schema_abuse'          // overly permissive or suspicious schemas
  | 'rug_pull'              // definition changed since last scan
  | 'typosquatting'         // name similar to known good tool
  | 'cross_server'          // same tool name from different server
  | 'behavioral_drift'     // tool behavior changed over time
  | 'trust_deficit';        // publisher has low/no Vouch score

export type Severity = 'info' | 'warning' | 'critical';

// ── Scan Threats ──

export interface TrustContext {
  publisherVouchScore?: number;
  publisherVouchId?: string;
  historicalScanCount?: number;
  lastCleanScan?: string;
  /** Score impact if this threat is confirmed */
  projectedScoreImpact?: number;
}

export interface ScanThreat {
  category: ThreatCategory;
  severity: Severity;
  toolName: string;
  serverName: string;
  message: string;
  matchedPattern?: string;
  details?: Record<string, unknown>;
  /** Percival advantage: trust context from Vouch */
  trustContext?: TrustContext;
}

// ── Scan Results ──

export interface TrustAssessment {
  /** Composite risk level accounting for trust scores */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Explanation of risk level */
  rationale: string;
}

export interface ScanResult {
  safe: boolean;
  threats: ScanThreat[];
  toolsScanned: number;
  toolsFlagged: number;
  /** Overall trust assessment */
  trustAssessment: TrustAssessment;
}

// ── Tool Fingerprinting ──

export interface ToolFingerprint {
  toolName: string;
  serverName: string;
  descriptionHash: string;
  schemaHash: string;
  firstSeen: string;
  lastSeen: string;
  version: number;
  /** Vouch score at time of registration */
  vouchScoreAtRegistration?: number;
}

// ── Tool Definition (input) ──

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

// ── Response Scanning ──

export type ResponseThreatCategory =
  | 'instruction_injection'
  | 'prompt_injection'
  | 'credential_leak'
  | 'data_exfiltration';

export interface ResponseThreat {
  category: ResponseThreatCategory;
  description: string;
  matchedPattern?: string;
  details?: Record<string, string>;
}

export interface ResponseScanResult {
  isSafe: boolean;
  toolName: string;
  threats: ResponseThreat[];
}

export interface SanitizeResult {
  sanitized: string;
  stripped: ResponseThreat[];
}

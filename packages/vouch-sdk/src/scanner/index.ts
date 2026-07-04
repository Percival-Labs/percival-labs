// SCANNER_ENABLED = "false"
/**
 * MCP Security Scanner — Barrel Export
 *
 * Trust-integrated security scanning for MCP tool definitions and responses.
 * Wraps the same detection techniques as Microsoft AGT but integrates them
 * into the Vouch trust ecosystem. Scan results have consequences (trust score
 * impact) and memory (behavioral trace history).
 *
 * @example
 * ```ts
 * import { StaticAnalyzer, ResponseScanner, RugPullDetector } from '@percival-labs/vouch-sdk/scanner';
 *
 * const analyzer = new StaticAnalyzer();
 * const result = analyzer.scanServer('my-server', tools);
 *
 * const responseScanner = new ResponseScanner();
 * const safe = responseScanner.scanResponse(toolOutput, 'search');
 * ```
 */

// Types
export type {
  ThreatCategory,
  Severity,
  TrustContext,
  ScanThreat,
  TrustAssessment,
  ScanResult,
  ToolFingerprint,
  ToolDefinition,
  ResponseThreatCategory,
  ResponseThreat,
  ResponseScanResult,
  SanitizeResult,
} from './types.js';

// Static Analysis
export { StaticAnalyzer } from './static-analysis.js';

// Trust Enrichment
export { TrustEnricher } from './trust-enrichment.js';
export type { TrustLookupFn } from './trust-enrichment.js';

// Rug Pull Detection
export { RugPullDetector } from './rug-pull.js';

// Typosquatting Detection
export { TyposquatDetector, levenshtein } from './typosquat.js';

// Response Scanning
export { ResponseScanner } from './response-scanner.js';

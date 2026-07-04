// SCANNER_ENABLED = "false"
/**
 * MCP Security Scanner — Static Analysis
 *
 * Port of Microsoft AGT's regex-based detection patterns to TypeScript.
 * Detects tool poisoning, description injection, and schema abuse
 * in MCP tool definitions.
 *
 * Original patterns: MIT licensed, Microsoft agent-governance-toolkit.
 */

import type {
  ScanThreat,
  ScanResult,
  ThreatCategory,
  Severity,
  ToolDefinition,
  TrustAssessment,
} from './types.js';

// ── Detection Patterns (compiled once at import time) ──

// Invisible unicode characters used to hide instructions
const INVISIBLE_UNICODE_PATTERNS: RegExp[] = [
  /[\u200b\u200c\u200d\ufeff]/,       // zero-width spaces/joiners/BOM
  /[\u202a-\u202e]/,                    // bidi embedding/override
  /[\u2066-\u2069]/,                    // bidi isolates
  /[\u00ad]/,                           // soft hyphen
  /[\u2060\u180e]/,                     // word joiner, mongolian vowel separator
];

// Markdown/HTML comments that hide text from users
const HIDDEN_COMMENT_PATTERNS: RegExp[] = [
  /<!--[\s\S]*?-->/,                           // HTML comments
  /\[\/\/\]:\s*#\s*\([\s\S]*?\)/,             // Markdown reference comments
  /\[comment\]:\s*<>\s*\([\s\S]*?\)/,         // alternative MD comment
];

// Instruction-like patterns hidden in descriptions
const HIDDEN_INSTRUCTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?previous/i,
  /override\s+(?:the\s+)?(?:previous|above|original)/i,
  /instead\s+of\s+(?:the\s+)?(?:above|previous|described)/i,
  /actually\s+do/i,
  /\bsystem\s*:/i,
  /\bassistant\s*:/i,
  /do\s+not\s+follow/i,
  /disregard\s+(?:all\s+)?(?:above|prior|previous)/i,
];

// Encoded payload patterns
const ENCODED_PAYLOAD_PATTERNS: RegExp[] = [
  /[A-Za-z0-9+/]{40,}={0,2}/,          // long base64 strings
  /(?:\\x[0-9a-fA-F]{2}){4,}/,          // hex sequences
];

// Data exfiltration patterns
const EXFILTRATION_PATTERNS: RegExp[] = [
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bfetch\s*\(/i,
  /https?:\/\//i,
  /\bsend\s+email\b/i,
  /\bsend\s+to\b/i,
  /\bpost\s+to\b/i,
  /include\s+the\s+contents?\s+of\b/i,
];

// Privilege escalation in descriptions
const PRIVILEGE_ESCALATION_PATTERNS: RegExp[] = [
  /\bsudo\b/i,
  /\badmin\s+access\b/i,
  /\broot\s+access\b/i,
  /\belevate\s+privile/i,
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
];

// Role override patterns
const ROLE_OVERRIDE_PATTERNS: RegExp[] = [
  /you\s+are\b/i,
  /your\s+task\s+is\b/i,
  /respond\s+with\b/i,
  /always\s+return\b/i,
  /you\s+must\b/i,
  /your\s+role\s+is\b/i,
];

// Content after excessive whitespace (hidden instructions at the end)
const EXCESSIVE_WHITESPACE_PATTERN = /\n{5,}.+/s;

// Suspicious keywords in decoded base64
const SUSPICIOUS_DECODED_KEYWORDS: string[] = [
  'ignore', 'override', 'system', 'password', 'secret',
  'admin', 'root', 'exec', 'eval', 'import os',
  'send', 'curl', 'fetch',
];

// Suspicious field names in schemas
const SUSPICIOUS_FIELD_NAMES: string[] = [
  'system_prompt', 'instructions', 'override', 'command',
  'exec', 'eval', 'callback_url', 'webhook', 'target_url',
];

// ── Static Analyzer ──

export class StaticAnalyzer {
  /**
   * Scan a single tool definition for threats.
   */
  scanTool(
    toolName: string,
    description: string,
    schema?: Record<string, unknown>,
    serverName: string = 'unknown',
  ): ScanThreat[] {
    try {
      const threats: ScanThreat[] = [];

      threats.push(...this._checkHiddenInstructions(description, toolName, serverName));
      threats.push(...this._checkDescriptionInjection(description, toolName, serverName));
      threats.push(...this._checkPrivilegeEscalation(description, toolName, serverName));

      if (schema) {
        threats.push(...this._checkSchemaAbuse(schema, toolName, serverName));
      }

      return threats;
    } catch {
      // Fail closed: if scanning errors out, report it as critical
      return [{
        category: 'tool_poisoning',
        severity: 'critical',
        toolName,
        serverName,
        message: 'Scan error -- fail closed',
      }];
    }
  }

  /**
   * Scan all tools from an MCP server.
   */
  scanServer(
    serverName: string,
    tools: ToolDefinition[],
  ): ScanResult {
    const allThreats: ScanThreat[] = [];
    const flaggedTools = new Set<string>();

    for (const tool of tools) {
      const toolThreats = this.scanTool(
        tool.name,
        tool.description,
        tool.inputSchema,
        serverName,
      );
      if (toolThreats.length > 0) {
        flaggedTools.add(tool.name);
        allThreats.push(...toolThreats);
      }
    }

    return {
      safe: allThreats.length === 0,
      threats: allThreats,
      toolsScanned: tools.length,
      toolsFlagged: flaggedTools.size,
      trustAssessment: this._assessRisk(allThreats),
    };
  }

  // ── Private Detection Methods ──

  private _checkHiddenInstructions(
    description: string,
    toolName: string,
    serverName: string,
  ): ScanThreat[] {
    const threats: ScanThreat[] = [];

    // 1. Invisible unicode characters
    for (const pattern of INVISIBLE_UNICODE_PATTERNS) {
      const match = description.match(pattern);
      if (match) {
        threats.push({
          category: 'tool_poisoning',
          severity: 'critical',
          toolName,
          serverName,
          message: 'Invisible unicode characters detected in tool description',
          matchedPattern: pattern.source,
          details: { charCode: match[0].charCodeAt(0) },
        });
        break; // one finding per category
      }
    }

    // 2. Markdown/HTML comments hiding text
    for (const pattern of HIDDEN_COMMENT_PATTERNS) {
      const match = description.match(pattern);
      if (match) {
        threats.push({
          category: 'tool_poisoning',
          severity: 'critical',
          toolName,
          serverName,
          message: 'Hidden comment detected in tool description',
          matchedPattern: pattern.source,
          details: { commentPreview: match[0].slice(0, 80) },
        });
      }
    }

    // 3. Encoded payloads (base64, hex)
    for (const pattern of ENCODED_PAYLOAD_PATTERNS) {
      const match = description.match(pattern);
      if (match) {
        const candidate = match[0];
        let isSuspicious = false;

        if (candidate.length >= 40 && !candidate.startsWith('\\x')) {
          try {
            const decoded = atob(candidate);
            const decodedLower = decoded.toLowerCase();
            for (const keyword of SUSPICIOUS_DECODED_KEYWORDS) {
              if (decodedLower.includes(keyword)) {
                isSuspicious = true;
                break;
              }
            }
          } catch {
            // Not valid base64, but still suspicious if long enough
          }
          // Long base64 in a tool description is suspicious regardless
          if (!isSuspicious) {
            isSuspicious = true;
          }
        }

        if (isSuspicious || candidate.startsWith('\\x')) {
          threats.push({
            category: 'tool_poisoning',
            severity: 'warning',
            toolName,
            serverName,
            message: 'Encoded payload detected in tool description',
            matchedPattern: pattern.source,
          });
        }
      }
    }

    // 4. Hidden instructions after excessive whitespace
    if (EXCESSIVE_WHITESPACE_PATTERN.test(description)) {
      threats.push({
        category: 'tool_poisoning',
        severity: 'warning',
        toolName,
        serverName,
        message: 'Instructions hidden after excessive whitespace',
        matchedPattern: EXCESSIVE_WHITESPACE_PATTERN.source,
      });
    }

    // 5. Instruction-like patterns
    for (const pattern of HIDDEN_INSTRUCTION_PATTERNS) {
      if (pattern.test(description)) {
        threats.push({
          category: 'tool_poisoning',
          severity: 'critical',
          toolName,
          serverName,
          message: `Instruction-like pattern in tool description: ${pattern.source}`,
          matchedPattern: pattern.source,
        });
      }
    }

    return threats;
  }

  private _checkDescriptionInjection(
    description: string,
    toolName: string,
    serverName: string,
  ): ScanThreat[] {
    const threats: ScanThreat[] = [];

    // Role assignment patterns
    for (const pattern of ROLE_OVERRIDE_PATTERNS) {
      if (pattern.test(description)) {
        threats.push({
          category: 'description_injection',
          severity: 'warning',
          toolName,
          serverName,
          message: `Role override pattern in description: ${pattern.source}`,
          matchedPattern: pattern.source,
        });
      }
    }

    // Data exfiltration patterns
    for (const pattern of EXFILTRATION_PATTERNS) {
      if (pattern.test(description)) {
        threats.push({
          category: 'description_injection',
          severity: 'critical',
          toolName,
          serverName,
          message: `Data exfiltration pattern in description: ${pattern.source}`,
          matchedPattern: pattern.source,
        });
      }
    }

    return threats;
  }

  private _checkPrivilegeEscalation(
    description: string,
    toolName: string,
    serverName: string,
  ): ScanThreat[] {
    const threats: ScanThreat[] = [];

    for (const pattern of PRIVILEGE_ESCALATION_PATTERNS) {
      if (pattern.test(description)) {
        threats.push({
          category: 'tool_poisoning',
          severity: 'critical',
          toolName,
          serverName,
          message: `Privilege escalation pattern in description: ${pattern.source}`,
          matchedPattern: pattern.source,
        });
      }
    }

    return threats;
  }

  private _checkSchemaAbuse(
    schema: Record<string, unknown>,
    toolName: string,
    serverName: string,
  ): ScanThreat[] {
    const threats: ScanThreat[] = [];

    // 1. Overly permissive: top-level type is "object" with no properties
    if (schema.type === 'object' && !schema.properties) {
      if (schema.additionalProperties !== false) {
        threats.push({
          category: 'schema_abuse',
          severity: 'warning',
          toolName,
          serverName,
          message: 'Overly permissive schema: object type with no defined properties',
        });
      }
    }

    const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    const required = (schema.required ?? []) as string[];

    for (const [propName, propDef] of Object.entries(properties)) {
      if (typeof propDef !== 'object' || propDef === null) continue;

      // 2. Hidden required fields with suspicious names
      if (required.includes(propName)) {
        for (const susName of SUSPICIOUS_FIELD_NAMES) {
          if (propName.toLowerCase().includes(susName)) {
            threats.push({
              category: 'schema_abuse',
              severity: 'critical',
              toolName,
              serverName,
              message: `Suspicious required field: '${propName}'`,
              details: { fieldName: propName },
            });
          }
        }
      }

      // 3. Default values containing instructions
      const defaultVal = propDef.default;
      if (typeof defaultVal === 'string' && defaultVal.length > 10) {
        for (const pattern of HIDDEN_INSTRUCTION_PATTERNS) {
          if (pattern.test(defaultVal)) {
            threats.push({
              category: 'schema_abuse',
              severity: 'critical',
              toolName,
              serverName,
              message: `Instruction in default value for field '${propName}'`,
              matchedPattern: pattern.source,
              details: { fieldName: propName },
            });
            break;
          }
        }
      }

      // 4. Hidden instructions in property descriptions
      const propDesc = propDef.description;
      if (typeof propDesc === 'string') {
        for (const pattern of HIDDEN_INSTRUCTION_PATTERNS) {
          if (pattern.test(propDesc)) {
            threats.push({
              category: 'schema_abuse',
              severity: 'critical',
              toolName,
              serverName,
              message: `Hidden instruction in property '${propName}' description`,
              matchedPattern: pattern.source,
              details: { fieldName: propName },
            });
            break;
          }
        }
      }
    }

    return threats;
  }

  private _assessRisk(threats: ScanThreat[]): TrustAssessment {
    if (threats.length === 0) {
      return { riskLevel: 'low', rationale: 'No threats detected' };
    }

    const criticalCount = threats.filter(t => t.severity === 'critical').length;
    const warningCount = threats.filter(t => t.severity === 'warning').length;

    if (criticalCount >= 3) {
      return {
        riskLevel: 'critical',
        rationale: `${criticalCount} critical threats detected -- high likelihood of malicious intent`,
      };
    }
    if (criticalCount >= 1) {
      return {
        riskLevel: 'high',
        rationale: `${criticalCount} critical threat(s) and ${warningCount} warning(s) detected`,
      };
    }
    if (warningCount >= 3) {
      return {
        riskLevel: 'medium',
        rationale: `${warningCount} warnings detected -- review recommended`,
      };
    }
    return {
      riskLevel: 'medium',
      rationale: `${warningCount} warning(s) detected`,
    };
  }
}

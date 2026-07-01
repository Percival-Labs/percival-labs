// SCANNER_ENABLED = "false"
/**
 * MCP Security Scanner — Response Scanner
 *
 * Port of AGT's MCPResponseScanner: scans tool outputs for injection tags,
 * credential leaks, and exfiltration URLs before passing to LLMs.
 *
 * Enhancement: sanitize mode that strips dangerous content.
 */

import type { ResponseThreat, ResponseScanResult, SanitizeResult } from './types.js';

// ── Detection Patterns ──

// Instruction/injection tags in responses
const INSTRUCTION_TAG_PATTERNS: RegExp[] = [
  /<(?:important|system|instruction|instructions|hidden|inject|admin|override|prompt|context|role)\b[^>]*>/gi,
  /\[(?:system|admin|instructions?)\]/gi,
];

// Imperative/prompt injection patterns
const IMPERATIVE_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?previous\s+(?:instructions?|context|rules?)/gi,
  /(?:forget|disregard|override)\s+(?:all\s+)?(?:previous|above|prior|earlier)/gi,
  /\bexecute\s+this\b/gi,
  /\byou\s+are\s+now\b/gi,
  /\bnew\s+(?:role|instruction|directive|persona)\s*:/gi,
  /\bfrom\s+now\s+on\b/gi,
  /\bdo\s+not\s+(?:follow|obey|listen)\b/gi,
];

// Credential leak patterns (port of AGT's CredentialRedactor patterns)
const CREDENTIAL_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'AWS Access Key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'AWS Secret Key', pattern: /(?:aws_secret|secret_access_key)\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/gi },
  { name: 'GitHub Token', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/g },
  { name: 'Slack Token', pattern: /\bxox[bpors]-[A-Za-z0-9-]+/g },
  { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}['"]?/gi },
  { name: 'Generic Secret', pattern: /(?:secret|password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"]{8,}['"]?/gi },
  { name: 'Bearer Token', pattern: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/g },
  { name: 'Private Key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g },
  { name: 'JWT Token', pattern: /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g },
];

// Paired instruction tags — matches the opening tag through its matching
// closing tag (non-greedy), capturing the enclosed body so sanitize can strip
// the injection payload along with its wrapper, not just the tag markers.
const TAG_NAME_GROUP = '(important|system|instruction|instructions|hidden|inject|admin|override|prompt|context|role)';
const PAIRED_INSTRUCTION_TAG_PATTERN = new RegExp(`<${TAG_NAME_GROUP}\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, 'gi');

// Paired bracket-style markers, e.g. [system]...[/system].
const PAIRED_BRACKET_PATTERN = /\[(system|admin|instructions?)\][\s\S]*?\[\/\1\]/gi;

// URL pattern
const URL_PATTERN = /https?:\/\/[^\s<>'"]+/gi;

// Exfiltration URL indicators
const EXFILTRATION_URL_PATTERN = /(?:\b(?:api[_-]?key|token|secret|payload|data|dump|upload|exfil|webhook)\b|webhook\.site|requestbin|pastebin|ngrok|transfer\.sh)/i;

// ── Response Scanner ──

export class ResponseScanner {
  /**
   * Scan tool output for threats before passing to LLM.
   *
   * Fails closed: if scanning errors out, returns unsafe result.
   */
  scanResponse(content: string | null | undefined, toolName: string = 'unknown'): ResponseScanResult {
    try {
      if (!content) {
        return { isSafe: true, toolName, threats: [] };
      }

      const threats: ResponseThreat[] = [];

      // Instruction tag injection
      threats.push(...this._scanPatterns(
        content,
        INSTRUCTION_TAG_PATTERNS,
        'instruction_injection',
        'Instruction tag detected in tool response',
      ));

      // Prompt injection imperatives
      threats.push(...this._scanPatterns(
        content,
        IMPERATIVE_PATTERNS,
        'prompt_injection',
        'Imperative instruction detected in tool response',
      ));

      // Credential leaks
      threats.push(...this._scanCredentialLeaks(content));

      // Exfiltration URLs
      threats.push(...this._scanExfiltrationUrls(content));

      return {
        isSafe: threats.length === 0,
        toolName,
        threats,
      };
    } catch {
      return {
        isSafe: false,
        toolName,
        threats: [{
          category: 'instruction_injection',
          description: `Response scanner error for tool '${toolName}' (fail-closed)`,
        }],
      };
    }
  }

  /**
   * Strip instruction tags AND their enclosed content from output, reporting
   * stripped threats. Use this in sanitize mode to clean tool output before
   * passing to LLMs.
   *
   * #7 fix: the previous implementation stripped only the tag markers
   * (`<system>...</system>` -> `...`), leaving the injection body itself
   * intact in the sanitized output. This strips the tag *and* everything
   * between the paired open/close markers.
   */
  sanitizeResponse(content: string | null | undefined, toolName: string = 'unknown'): SanitizeResult {
    try {
      if (!content) {
        return { sanitized: '', stripped: [] };
      }

      let sanitized = content;
      const stripped: ResponseThreat[] = [];

      // Strip paired tags/markers along with their enclosed content first —
      // this is the primary defense against the injection body surviving.
      for (const pattern of [PAIRED_INSTRUCTION_TAG_PATTERN, PAIRED_BRACKET_PATTERN]) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(sanitized)) !== null) {
          stripped.push({
            category: 'instruction_injection',
            description: 'Instruction tag and enclosed content stripped from tool response',
            matchedPattern: match[0].length > 200 ? `${match[0].slice(0, 200)}…` : match[0],
          });
        }
        sanitized = sanitized.replace(pattern, '');
      }

      // Fallback: strip any orphaned (unpaired) opening tags/markers that
      // survived the paired pass — e.g. malformed or non-matching markup.
      for (const pattern of INSTRUCTION_TAG_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(sanitized)) !== null) {
          stripped.push({
            category: 'instruction_injection',
            description: 'Orphaned instruction tag stripped from tool response',
            matchedPattern: match[0],
          });
        }
        sanitized = sanitized.replace(pattern, '');
      }

      // Also strip any orphaned closing tags for the instruction patterns
      const closingTagPattern = /<\/(?:important|system|instruction|instructions|hidden|inject|admin|override|prompt|context|role)\s*>/gi;
      sanitized = sanitized.replace(closingTagPattern, '');

      return { sanitized, stripped };
    } catch {
      return {
        sanitized: '',
        stripped: [{
          category: 'instruction_injection',
          description: `Response sanitization failed for tool '${toolName}' (fail-closed)`,
        }],
      };
    }
  }

  // ── Private Methods ──

  private _scanPatterns(
    content: string,
    patterns: RegExp[],
    category: ResponseThreat['category'],
    description: string,
  ): ResponseThreat[] {
    const threats: ResponseThreat[] = [];

    for (const pattern of patterns) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        threats.push({
          category,
          description,
          matchedPattern: match[0],
        });
      }
    }

    return threats;
  }

  private _scanCredentialLeaks(content: string): ResponseThreat[] {
    const threats: ResponseThreat[] = [];

    for (const { name, pattern } of CREDENTIAL_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        threats.push({
          category: 'credential_leak',
          description: `${name} detected in tool response`,
          matchedPattern: name,
          details: { credentialType: name },
        });
      }
    }

    return threats;
  }

  private _scanExfiltrationUrls(content: string): ResponseThreat[] {
    const threats: ResponseThreat[] = [];

    URL_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = URL_PATTERN.exec(content)) !== null) {
      const url = match[0];
      if (EXFILTRATION_URL_PATTERN.test(url)) {
        threats.push({
          category: 'data_exfiltration',
          description: 'Potential data exfiltration URL detected in tool response',
          matchedPattern: url,
        });
      }
    }

    return threats;
  }
}

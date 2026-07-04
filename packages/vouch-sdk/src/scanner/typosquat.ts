// SCANNER_ENABLED = "false"
/**
 * MCP Security Scanner — Typosquatting Detection
 *
 * Levenshtein distance check against known-good tools.
 * Enhancement: publisher trust context (new publisher + similar name = higher severity).
 */

import type { ScanThreat, ToolFingerprint } from './types.js';

// ── Levenshtein Distance ──

/**
 * Compute Levenshtein edit distance between two strings.
 * Port of AGT's _levenshtein() function.
 */
export function levenshtein(s: string, t: string): number {
  if (s.length < t.length) {
    return levenshtein(t, s);
  }
  if (t.length === 0) {
    return s.length;
  }

  let prev: number[] = Array.from({ length: t.length + 1 }, (_, i) => i);

  for (let i = 0; i < s.length; i++) {
    const curr: number[] = [i + 1];
    for (let j = 0; j < t.length; j++) {
      const cost = s[i] === t[j] ? 0 : 1;
      curr.push(Math.min(
        curr[j] + 1,       // insertion
        prev[j + 1] + 1,   // deletion
        prev[j] + cost,     // substitution
      ));
    }
    prev = curr;
  }

  return prev[t.length];
}

// ── Typosquat Detector ──

export class TyposquatDetector {
  /** Maximum edit distance for typosquatting detection */
  private readonly _maxDistance: number;
  /** Minimum tool name length for typosquatting check */
  private readonly _minNameLength: number;

  constructor(opts?: { maxDistance?: number; minNameLength?: number }) {
    this._maxDistance = opts?.maxDistance ?? 2;
    this._minNameLength = opts?.minNameLength ?? 4;
  }

  /**
   * Check a tool name against known-good tools for typosquatting.
   *
   * Enhancement over AGT: publisher trust context affects severity.
   * - New/unknown publisher + similar name = critical
   * - Known publisher + similar name = warning (likely just a variant)
   */
  checkTyposquat(
    toolName: string,
    serverName: string,
    knownTools: Map<string, ToolFingerprint>,
    publisherVouchScore?: number,
  ): ScanThreat[] {
    const threats: ScanThreat[] = [];
    const nameLower = toolName.toLowerCase();

    // Skip very short names (too many false positives)
    if (nameLower.length < this._minNameLength) {
      return threats;
    }

    for (const [_key, fp] of knownTools) {
      // Skip same server (that's a cross-server check, not typosquatting)
      if (fp.serverName === serverName) continue;

      // Skip exact match (that's impersonation, not typosquatting)
      if (fp.toolName === toolName) continue;

      const knownLower = fp.toolName.toLowerCase();

      // Skip if length difference exceeds max distance
      if (Math.abs(nameLower.length - knownLower.length) > this._maxDistance) continue;

      // Skip if known tool name is too short
      if (knownLower.length < this._minNameLength) continue;

      const dist = levenshtein(nameLower, knownLower);

      if (dist >= 1 && dist <= this._maxDistance) {
        // Determine severity based on publisher trust
        const severity = this._determineSeverity(publisherVouchScore);

        threats.push({
          category: 'typosquatting',
          severity,
          toolName,
          serverName,
          message: `Tool name '${toolName}' resembles '${fp.toolName}' from server '${fp.serverName}' -- potential typosquatting`,
          details: {
            similarTool: fp.toolName,
            similarServer: fp.serverName,
            editDistance: dist,
          },
          trustContext: publisherVouchScore !== undefined ? {
            publisherVouchScore,
          } : undefined,
        });
      }
    }

    return threats;
  }

  /**
   * Check if two tool names are suspiciously similar.
   * Exposed for direct use in cross-server checks.
   */
  isTyposquat(nameA: string, nameB: string): boolean {
    if (nameA === nameB) return false;

    const a = nameA.toLowerCase();
    const b = nameB.toLowerCase();

    if (Math.abs(a.length - b.length) > this._maxDistance) return false;
    if (Math.min(a.length, b.length) < this._minNameLength) return false;

    const dist = levenshtein(a, b);
    return dist >= 1 && dist <= this._maxDistance;
  }

  /**
   * Determine severity based on publisher trust score.
   * New/unknown publisher + similar name = critical
   * Known publisher + similar name = warning
   */
  private _determineSeverity(publisherVouchScore?: number): 'warning' | 'critical' {
    // No score = unknown publisher = higher risk
    if (publisherVouchScore === undefined) return 'critical';

    // Low trust = higher risk
    if (publisherVouchScore < 300) return 'critical';

    // Known publisher = likely just a variant
    return 'warning';
  }
}

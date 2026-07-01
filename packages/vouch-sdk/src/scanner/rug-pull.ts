// SCANNER_ENABLED = "false"
/**
 * MCP Security Scanner — Rug Pull Detection
 *
 * SHA-256 fingerprinting of tool descriptions + schemas.
 * Port of AGT's approach with Vouch score auto-decay on detection.
 */

import { createHash } from 'crypto';
import type { ScanThreat, ToolFingerprint } from './types.js';

// ── Rug Pull Detector ──

export class RugPullDetector {
  private readonly _registry = new Map<string, ToolFingerprint>();

  /**
   * Optional callback for Vouch score decay when rug pull is detected.
   * Set this to integrate with the Vouch trust system.
   */
  onRugPullDetected?: (threat: ScanThreat) => Promise<void>;

  /**
   * Register a tool with a cryptographic fingerprint.
   *
   * If already registered, updates lastSeen and increments version
   * only when the definition changed.
   */
  registerTool(
    toolName: string,
    description: string,
    schema: Record<string, unknown> | null,
    serverName: string,
    vouchScore?: number,
  ): ToolFingerprint {
    const key = `${serverName}::${toolName}`;
    const now = new Date().toISOString();
    const descriptionHash = this._hashString(description);
    const schemaHash = this._hashSchema(schema);

    const existing = this._registry.get(key);
    if (existing) {
      if (existing.descriptionHash !== descriptionHash || existing.schemaHash !== schemaHash) {
        existing.descriptionHash = descriptionHash;
        existing.schemaHash = schemaHash;
        existing.lastSeen = now;
        existing.version += 1;
      } else {
        existing.lastSeen = now;
      }
      return existing;
    }

    const fp: ToolFingerprint = {
      toolName,
      serverName,
      descriptionHash,
      schemaHash,
      firstSeen: now,
      lastSeen: now,
      version: 1,
      vouchScoreAtRegistration: vouchScore,
    };
    this._registry.set(key, fp);
    return fp;
  }

  /**
   * Check if a tool definition changed since registration (rug pull).
   *
   * Returns a ScanThreat if a rug pull is detected, null otherwise.
   * If onRugPullDetected is set, triggers Vouch score decay.
   */
  async checkRugPull(
    toolName: string,
    description: string,
    schema: Record<string, unknown> | null,
    serverName: string,
  ): Promise<ScanThreat | null> {
    const key = `${serverName}::${toolName}`;
    const existing = this._registry.get(key);
    if (!existing) {
      return null;
    }

    const descriptionHash = this._hashString(description);
    const schemaHash = this._hashSchema(schema);

    const changes: string[] = [];
    if (existing.descriptionHash !== descriptionHash) {
      changes.push('description');
    }
    if (existing.schemaHash !== schemaHash) {
      changes.push('schema');
    }

    if (changes.length === 0) {
      return null;
    }

    const threat: ScanThreat = {
      category: 'rug_pull',
      severity: 'critical',
      toolName,
      serverName,
      message: `Tool definition changed since registration: ${changes.join(', ')} modified (version ${existing.version})`,
      details: {
        changedFields: changes,
        version: existing.version,
        firstSeen: existing.firstSeen,
        vouchScoreAtRegistration: existing.vouchScoreAtRegistration,
      },
    };

    // Auto-decay Vouch score on rug pull detection
    if (this.onRugPullDetected) {
      await this.onRugPullDetected(threat);
    }

    return threat;
  }

  /**
   * Get the fingerprint for a registered tool.
   */
  getFingerprint(toolName: string, serverName: string): ToolFingerprint | undefined {
    return this._registry.get(`${serverName}::${toolName}`);
  }

  /**
   * Get all registered fingerprints.
   */
  getAllFingerprints(): Map<string, ToolFingerprint> {
    return new Map(this._registry);
  }

  /**
   * Clear all registered fingerprints.
   */
  clear(): void {
    this._registry.clear();
  }

  // ── Private Helpers ──

  private _hashString(value: string): string {
    return createHash('sha256').update(value, 'utf-8').digest('hex');
  }

  private _hashSchema(schema: Record<string, unknown> | null): string {
    if (!schema) {
      return createHash('sha256').update('').digest('hex');
    }
    const canonical = canonicalizeJson(schema);
    return createHash('sha256').update(canonical, 'utf-8').digest('hex');
  }
}

// ── RFC 8785 (JCS) canonicalization ──
//
// C4 fix: the previous `_hashSchema` passed `Object.keys(schema).sort()` as
// the JSON.stringify *replacer* array, which only whitelists top-level keys —
// every nested object is serialized with insertion order and untouched by the
// sort, so a poisoned nested field is invisible to the hash, and reordering a
// top-level object produces a different string despite being semantically
// identical (false positive). True JCS sorts object keys at *every* depth and
// is order-independent for equivalent structures, order-sensitive for arrays.
// Mirrors apps/vouch-api/src/lib/mcp-t-signing.ts `canonicalize()`.
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalizeJson(v === undefined ? null : v)).join(',') + ']';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalizeJson(obj[k])).join(',') + '}';
  }
  // undefined / function / symbol — should not appear in tool schemas
  return 'null';
}

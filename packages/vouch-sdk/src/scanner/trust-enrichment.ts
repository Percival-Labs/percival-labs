// SCANNER_ENABLED = "false"
/**
 * MCP Security Scanner — Trust Enrichment
 *
 * Trust-adjusted severity based on Vouch scores.
 * This is the Percival advantage over Microsoft AGT:
 * scan results have trust context and consequences.
 */

import type { ScanThreat, Severity, TrustContext } from './types.js';

// ── Trust Score Thresholds ──

const KNOWN_PUBLISHER_THRESHOLD = 700;
const LOW_TRUST_THRESHOLD = 300;

// ── Severity Hierarchy ──

const SEVERITY_ORDER: Severity[] = ['info', 'warning', 'critical'];

function bumpSeverity(severity: Severity): Severity {
  const idx = SEVERITY_ORDER.indexOf(severity);
  if (idx < SEVERITY_ORDER.length - 1) {
    return SEVERITY_ORDER[idx + 1];
  }
  return severity; // already at max
}

// ── Trust Lookup Interface ──

/**
 * Function to look up a publisher's Vouch score.
 * Can be backed by VouchClient or any other source.
 */
export type TrustLookupFn = (publisherId: string) => Promise<{
  score: number;
  lastCleanScan?: string;
  historicalScanCount?: number;
} | null>;

// ── Trust Enricher ──

export class TrustEnricher {
  private readonly _lookupFn: TrustLookupFn | null;

  /**
   * Create a TrustEnricher.
   * @param lookupFn Optional trust lookup function. If not provided,
   *                 all publishers are treated as unknown (severity bumped up).
   */
  constructor(lookupFn?: TrustLookupFn) {
    this._lookupFn = lookupFn ?? null;
  }

  /**
   * Enrich a threat with trust context from Vouch.
   * Looks up the publisher's score and attaches it to the threat.
   */
  async enrichThreat(threat: ScanThreat, publisherId: string): Promise<ScanThreat> {
    if (!this._lookupFn) {
      // No lookup available -- treat as unknown publisher
      return this.adjustSeverity({
        ...threat,
        trustContext: {
          publisherVouchId: publisherId,
        },
      });
    }

    const trustData = await this._lookupFn(publisherId);

    const trustContext: TrustContext = {
      publisherVouchId: publisherId,
      publisherVouchScore: trustData?.score,
      historicalScanCount: trustData?.historicalScanCount,
      lastCleanScan: trustData?.lastCleanScan,
      projectedScoreImpact: this._calculateScoreImpact(threat, trustData?.score),
    };

    return this.adjustSeverity({
      ...threat,
      trustContext,
    });
  }

  /**
   * Enrich all threats in a batch.
   */
  async enrichThreats(threats: ScanThreat[], publisherId: string): Promise<ScanThreat[]> {
    return Promise.all(threats.map(t => this.enrichThreat(t, publisherId)));
  }

  /**
   * Apply trust-based severity adjustment:
   *  - Known publisher (score > 700): severity stays as-is
   *  - Unknown publisher (no score): severity bumped up one level
   *  - Low-trust publisher (score < 300): everything becomes critical
   */
  adjustSeverity(threat: ScanThreat): ScanThreat {
    const score = threat.trustContext?.publisherVouchScore;

    // Known, trusted publisher -- no adjustment
    if (score !== undefined && score > KNOWN_PUBLISHER_THRESHOLD) {
      return threat;
    }

    // Low-trust publisher -- everything critical
    if (score !== undefined && score < LOW_TRUST_THRESHOLD) {
      return {
        ...threat,
        severity: 'critical',
      };
    }

    // Unknown publisher (no score) -- bump up one level
    if (score === undefined) {
      return {
        ...threat,
        severity: bumpSeverity(threat.severity),
      };
    }

    // Middle range (300-700) -- bump up one level
    return {
      ...threat,
      severity: bumpSeverity(threat.severity),
    };
  }

  /**
   * Calculate projected score impact for a confirmed threat.
   */
  private _calculateScoreImpact(threat: ScanThreat, currentScore?: number): number {
    if (currentScore === undefined) return 0;

    const impactByCategory: Record<string, number> = {
      tool_poisoning: -100,
      description_injection: -75,
      schema_abuse: -50,
      rug_pull: -150,
      typosquatting: -25,
      cross_server: -50,
      behavioral_drift: -75,
      trust_deficit: 0,
    };

    const severityMultiplier: Record<string, number> = {
      info: 0.25,
      warning: 0.5,
      critical: 1.0,
    };

    const baseImpact = impactByCategory[threat.category] ?? -50;
    const multiplier = severityMultiplier[threat.severity] ?? 1.0;

    return Math.round(baseImpact * multiplier);
  }
}

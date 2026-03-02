// Vouch Reporter — Bridge between task evidence scoring and the Vouch trust API.
// Scores evidence locally and (when configured) reports outcomes to the Vouch API
// so agent performance feeds into their trust scores.
//
// Reporting is fire-and-forget: failures are logged but never block task execution.

import { scoreEvidence, type Evidence, type EvidenceScore } from './evidence';
import { eventBus } from '../events';

// ── Config ──

const VOUCH_API_URL = process.env.VOUCH_API_URL || '';
const VOUCH_REPORT_ENABLED = VOUCH_API_URL.length > 0;
const REPORT_TIMEOUT_MS = 5000;

// ── Public API ──

export interface VouchReportResult {
  score: EvidenceScore;
  reported: boolean;
  error?: string;
}

/**
 * Score evidence and report the outcome to Vouch (if configured).
 * Always returns the local score regardless of Vouch API availability.
 *
 * This is the single integration point between the task accountability
 * system and the Vouch trust economy. Evidence quality → trust score.
 */
export async function scoreAndReport(evidence: Evidence): Promise<VouchReportResult> {
  // 1. Score locally (always works, zero network)
  const score = scoreEvidence(evidence);

  // 2. Publish scored event for Discord/SSE consumers
  eventBus.publish('evidence_scored', {
    taskId: evidence.taskId,
    agent: evidence.agent,
    type: evidence.type,
    quality: score.quality,
    factors: score.factors,
  });

  // 3. Report to Vouch API if configured
  if (!VOUCH_REPORT_ENABLED) {
    return { score, reported: false };
  }

  try {
    await reportToVouch(evidence, score);
    return { score, reported: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[vouch-reporter] Report failed (non-blocking): ${message}`);
    return { score, reported: false, error: message };
  }
}

/**
 * Score evidence without reporting to Vouch.
 * Use when you just need the quality score (e.g., for display).
 */
export function scoreOnly(evidence: Evidence): EvidenceScore {
  return scoreEvidence(evidence);
}

// ── Internal ──

/**
 * POST outcome to Vouch API.
 * Uses the internal service endpoint pattern — when the agents service
 * gets its own Nostr keypair, this will switch to NIP-98 auth.
 *
 * For now: requires VOUCH_API_URL + VOUCH_SERVICE_KEY env vars.
 * The Vouch API's POST /v1/outcomes/ expects:
 *   { counterparty, role, task_type, task_ref, success, rating?, evidence? }
 */
async function reportToVouch(evidence: Evidence, score: EvidenceScore): Promise<void> {
  const serviceKey = process.env.VOUCH_SERVICE_KEY || '';
  if (!serviceKey) {
    // No service key = can't auth. This is expected in dev.
    return;
  }

  const body = {
    // The agent being scored is the "performer"
    // The system (coordinator) is the implicit "purchaser"
    task_type: evidence.type,
    task_ref: evidence.taskId,
    success: score.quality >= 0.5, // 50% quality threshold = success
    rating: qualityToRating(score.quality),
    evidence: JSON.stringify({
      summary: evidence.summary,
      quality: score.quality,
      factors: score.factors,
      artifacts: evidence.artifacts.length,
    }),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);

  try {
    const res = await fetch(`${VOUCH_API_URL}/v1/internal/outcomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Vouch API ${res.status}: ${text.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Convert 0-1 quality score to 1-5 rating for Vouch outcome.
 */
function qualityToRating(quality: number): number {
  if (quality >= 0.9) return 5;
  if (quality >= 0.7) return 4;
  if (quality >= 0.5) return 3;
  if (quality >= 0.3) return 2;
  return 1;
}

// Percival Labs - Verification Pipeline Orchestrator
// Chains L1 → L2 stages, writes audit results, updates version status

import { Database } from 'bun:sqlite';
import { createAudit, getVersion } from '@percival/db';
import { runL1ManifestCheck } from './stages/l1-manifest';
import { runL2StaticAnalysis } from './stages/l2-static';

export interface PipelineInput {
  versionId: string;
  content: string;         // SKILL.md content
  manifest?: Record<string, unknown>;
  readme?: string;
  dryRun?: boolean;        // Skip DB writes (for ad-hoc verification)
}

export interface PipelineResult {
  versionId: string;
  overallStatus: 'pass' | 'fail' | 'escalate';
  l1: ReturnType<typeof runL1ManifestCheck>;
  l2: ReturnType<typeof runL2StaticAnalysis>;
  duration_ms: number;
}

/**
 * Run full verification pipeline for a skill version.
 * L1 (manifest) → L2 (static analysis) → aggregate result → write audits
 */
export function runPipeline(db: Database, input: PipelineInput): PipelineResult {
  const start = performance.now();

  const dryRun = input.dryRun ?? false;

  // ── L1: Manifest Check (instant) ──
  const l1 = runL1ManifestCheck(input.content, input.manifest);

  // Write L1 audit (skip in dry-run mode)
  if (!dryRun) {
    createAudit(db, {
      version_id: input.versionId,
      stage: 'static',
      status: l1.status,
      results: { level: 'L1', ...l1.results },
    });
  }

  // If L1 fails hard, skip L2
  if (l1.status === 'fail' && l1.results.score < 50) {
    if (!dryRun) updateVersionStatus(db, input.versionId, 'fail');
    return {
      versionId: input.versionId,
      overallStatus: 'fail',
      l1,
      l2: runL2StaticAnalysis(''), // empty placeholder
      duration_ms: Math.round(performance.now() - start),
    };
  }

  // ── L2: Static Analysis ──
  const l2 = runL2StaticAnalysis(input.content, input.manifest, input.readme);

  // Write L2 audit (skip in dry-run mode)
  if (!dryRun) {
    createAudit(db, {
      version_id: input.versionId,
      stage: 'static',
      status: l2.status,
      results: { level: 'L2', ...l2.results },
    });
  }

  // ── Aggregate ──
  const overallStatus = aggregateStatus(l1.status, l2.status);
  if (!dryRun) {
    updateVersionStatus(db, input.versionId, overallStatus);

    // Auto-publish if both pass
    if (overallStatus === 'pass') {
      autoPublishSkill(db, input.versionId);
    }
  }

  return {
    versionId: input.versionId,
    overallStatus,
    l1,
    l2,
    duration_ms: Math.round(performance.now() - start),
  };
}

/**
 * Process all pending versions in the database.
 * Returns count of versions processed.
 */
export function processPendingVersions(db: Database): number {
  const pending = db.query(
    "SELECT v.id, v.skill_id, v.manifest, v.readme FROM versions v WHERE v.audit_status = 'pending'"
  ).all() as Array<{ id: string; skill_id: string; manifest: string; readme: string }>;

  let processed = 0;
  for (const version of pending) {
    // Get skill content (from manifest JSON which contains the SKILL.md content)
    let manifest: Record<string, unknown> | undefined;
    try {
      manifest = JSON.parse(version.manifest);
    } catch { /* invalid JSON, proceed without */ }

    const content = (manifest?.content as string) || (manifest?.body as string) || '';

    runPipeline(db, {
      versionId: version.id,
      content,
      manifest,
      readme: version.readme,
    });
    processed++;
  }

  return processed;
}

function aggregateStatus(
  l1Status: 'pass' | 'fail',
  l2Status: 'pass' | 'fail' | 'escalate'
): 'pass' | 'fail' | 'escalate' {
  if (l1Status === 'fail' || l2Status === 'fail') return 'fail';
  if (l2Status === 'escalate') return 'escalate';
  return 'pass';
}

function updateVersionStatus(db: Database, versionId: string, status: string): void {
  db.run('UPDATE versions SET audit_status = ? WHERE id = ?', [status, versionId]);
}

function autoPublishSkill(db: Database, versionId: string): void {
  const version = getVersion(db, versionId);
  if (!version) return;

  // Only auto-publish if skill is in 'pending' state
  const skill = db.query('SELECT visibility FROM skills WHERE id = ?').get(version.skill_id) as { visibility: string } | null;
  if (skill?.visibility === 'pending') {
    db.run(
      "UPDATE skills SET visibility = 'published', updated_at = datetime('now') WHERE id = ?",
      [version.skill_id]
    );
  }
}

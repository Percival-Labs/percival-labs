// Percival Labs - Verifier Service
// HTTP API for verification pipeline + background worker for pending audits

import { Hono } from 'hono';
import { initDatabase } from '@percival/db';
import { runPipeline, processPendingVersions } from './pipeline';

const app = new Hono();
const DB_PATH = process.env.PERCIVAL_DB || './data/percival.db';
const db = initDatabase(DB_PATH);

// ── Health ──
app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'verifier', timestamp: new Date().toISOString() })
);

// ── Verify a specific version ──
app.post('/v1/verify', async (c) => {
  const body = await c.req.json<{
    version_id: string;
    content: string;
    manifest?: Record<string, unknown>;
    readme?: string;
  }>();

  if (!body.version_id || !body.content) {
    return c.json({ error: 'version_id and content are required' }, 400);
  }

  // Check if version exists — if not, run in dry-run mode (no DB writes)
  const versionExists = db.query('SELECT id FROM versions WHERE id = ?').get(body.version_id);
  const dryRun = !versionExists;

  const result = runPipeline(db, {
    versionId: body.version_id,
    content: body.content,
    manifest: body.manifest,
    readme: body.readme,
    dryRun,
  });

  return c.json({
    version_id: result.versionId,
    status: result.overallStatus,
    duration_ms: result.duration_ms,
    l1: {
      status: result.l1.status,
      score: result.l1.results.score,
      errors: result.l1.results.errors,
      warnings: result.l1.results.warnings,
    },
    l2: {
      status: result.l2.status,
      risk_score: result.l2.results.risk_score,
      findings_count: result.l2.results.findings.length,
      findings: result.l2.results.findings,
      summary: result.l2.results.summary,
    },
  });
});

// ── Get audit results for a version ──
app.get('/v1/audits/:versionId', (c) => {
  const versionId = c.req.param('versionId');
  const audits = db.query(
    'SELECT * FROM audits WHERE version_id = ? ORDER BY created_at DESC'
  ).all(versionId);

  return c.json({ version_id: versionId, audits });
});

// ── Process all pending (manual trigger) ──
app.post('/v1/verify/pending', (c) => {
  const count = processPendingVersions(db);
  return c.json({ processed: count });
});

// ── Background worker ──
const POLL_INTERVAL_MS = Number(process.env.VERIFIER_POLL_MS) || 30_000;
let workerRunning = false;

function startWorker() {
  if (workerRunning) return;
  workerRunning = true;

  setInterval(() => {
    try {
      const count = processPendingVersions(db);
      if (count > 0) {
        console.log(`[Verifier] Processed ${count} pending version(s)`);
      }
    } catch (err) {
      console.error('[Verifier] Worker error:', err);
    }
  }, POLL_INTERVAL_MS);

  console.log(`[Verifier] Background worker started (polling every ${POLL_INTERVAL_MS / 1000}s)`);
}

// Start worker after server boots
startWorker();

const port = Number(process.env.VERIFIER_PORT) || 3300;
console.log(`[Verifier] API listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

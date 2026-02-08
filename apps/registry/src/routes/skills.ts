// Percival Labs - Skill Discovery Routes

import { Hono } from 'hono';
import type { Database } from 'bun:sqlite';
import {
  listSkills,
  getSkillBySlug,
  listVersions,
  getVersionBySemver,
  listCapabilities,
  listAudits,
  createSkill,
  createVersion,
  setCapabilities,
  updateSkillVisibility,
  createAudit,
  recordInstallation,
  createRating,
  createReport,
  getRatingStats,
  getInstallCount,
} from '@percival/db';
import { calculateTrustScore, parseSkillMd } from '@percival/shared';
import type { SkillManifest } from '@percival/shared';
import { runL1ManifestCheck } from '../../../verifier/src/stages/l1-manifest';
import { runL2StaticAnalysis } from '../../../verifier/src/stages/l2-static';

export function skillRoutes(db: Database): Hono {
  const app = new Hono();

  // ── Discovery Endpoints ──

  // GET /v1/skills — List/search skills
  app.get('/', (c) => {
    const q = c.req.query('q');
    const category = c.req.query('category');
    const tag = c.req.query('tag');
    const trustMin = c.req.query('trust_min') ? Number(c.req.query('trust_min')) : undefined;
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 20;
    const offset = c.req.query('offset') ? Number(c.req.query('offset')) : 0;

    const result = listSkills(db, { q, category, tag, trustMin, limit, offset });
    return c.json(result);
  });

  // GET /v1/skills/:slug — Skill detail
  app.get('/:slug', (c) => {
    const slug = c.req.param('slug');
    const skill = getSkillBySlug(db, slug);

    if (!skill) {
      return c.json({ error: 'Skill not found', code: 'SKILL_NOT_FOUND' }, 404);
    }

    const publisher = db.query('SELECT * FROM publishers WHERE id = ?').get(skill.publisher_id);
    const versions = listVersions(db, skill.id);
    const capabilities = listCapabilities(db, skill.id);
    const trust = calculateTrustScore(db, skill.id, skill.publisher_id);

    return c.json({
      skill: { ...skill, publisher },
      versions,
      capabilities,
      trust,
    });
  });

  // GET /v1/skills/:slug/versions/:version — Version detail
  app.get('/:slug/versions/:version', (c) => {
    const slug = c.req.param('slug');
    const semver = c.req.param('version');
    const skill = getSkillBySlug(db, slug);

    if (!skill) {
      return c.json({ error: 'Skill not found', code: 'SKILL_NOT_FOUND' }, 404);
    }

    const version = getVersionBySemver(db, skill.id, semver);
    if (!version) {
      return c.json({ error: 'Version not found', code: 'VERSION_NOT_FOUND' }, 404);
    }

    const parsed = { ...version, manifest: JSON.parse(version.manifest) };
    const audits = listAudits(db, version.id);

    return c.json({ version: parsed, audit: audits });
  });

  // GET /v1/skills/:slug/versions/:version/download — Download skill bundle
  app.get('/:slug/versions/:version/download', (c) => {
    const slug = c.req.param('slug');
    const semver = c.req.param('version');
    const agentId = c.req.header('X-Agent-Id') || 'anonymous';

    const skill = getSkillBySlug(db, slug);
    if (!skill) {
      return c.json({ error: 'Skill not found', code: 'SKILL_NOT_FOUND' }, 404);
    }

    const version = getVersionBySemver(db, skill.id, semver);
    if (!version) {
      return c.json({ error: 'Version not found', code: 'VERSION_NOT_FOUND' }, 404);
    }

    if (version.audit_status !== 'pass') {
      return c.json({ error: 'Skill has not passed verification', code: 'NOT_VERIFIED' }, 403);
    }

    recordInstallation(db, version.id, agentId);

    if (!version.download_url) {
      return c.json({ error: 'Download not available', code: 'NO_DOWNLOAD' }, 404);
    }

    return c.redirect(version.download_url, 302);
  });

  // ── Trust Endpoints ──

  // GET /v1/skills/:slug/trust — Trust score
  app.get('/:slug/trust', (c) => {
    const slug = c.req.param('slug');
    const skill = getSkillBySlug(db, slug);

    if (!skill) {
      return c.json({ error: 'Skill not found', code: 'SKILL_NOT_FOUND' }, 404);
    }

    const trust = calculateTrustScore(db, skill.id, skill.publisher_id);
    const ratings = getRatingStats(db, skill.id);
    const installs = getInstallCount(db, skill.id);

    return c.json({ trust, ratings, installs });
  });

  // POST /v1/skills/:slug/ratings — Rate a skill
  app.post('/:slug/ratings', async (c) => {
    const slug = c.req.param('slug');
    const skill = getSkillBySlug(db, slug);

    if (!skill) {
      return c.json({ error: 'Skill not found', code: 'SKILL_NOT_FOUND' }, 404);
    }

    const body = await c.req.json<{ agent_id: string; score: number; review?: string }>();

    if (!body.agent_id || !body.score || body.score < 1 || body.score > 5) {
      return c.json({ error: 'Invalid rating', code: 'INVALID_INPUT' }, 400);
    }

    const id = createRating(db, {
      skill_id: skill.id,
      agent_id: body.agent_id,
      score: body.score,
      review: body.review,
    });

    return c.json({ id, success: true }, 201);
  });

  // POST /v1/skills/:slug/reports — Report a skill
  app.post('/:slug/reports', async (c) => {
    const slug = c.req.param('slug');
    const skill = getSkillBySlug(db, slug);

    if (!skill) {
      return c.json({ error: 'Skill not found', code: 'SKILL_NOT_FOUND' }, 404);
    }

    const body = await c.req.json<{ reporter_id: string; category: string; description: string }>();

    if (!body.reporter_id || !body.category || !body.description) {
      return c.json({ error: 'Missing required fields', code: 'INVALID_INPUT' }, 400);
    }

    const validCategories = ['malicious', 'broken', 'misleading', 'license', 'spam'];
    if (!validCategories.includes(body.category)) {
      return c.json({ error: 'Invalid report category', code: 'INVALID_CATEGORY' }, 400);
    }

    const id = createReport(db, {
      skill_id: skill.id,
      reporter_id: body.reporter_id,
      category: body.category,
      description: body.description,
    });

    return c.json({ id, success: true }, 201);
  });

  // ── Publishing Endpoints ──

  // POST /v1/skills — Create a new skill
  app.post('/', async (c) => {
    const publisherId = c.get('publisherId') || c.req.header('X-Publisher-Id');
    if (!publisherId) {
      return c.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401);
    }

    const publisher = db.query('SELECT id FROM publishers WHERE id = ?').get(publisherId);
    if (!publisher) {
      return c.json({ error: 'Publisher not found', code: 'PUBLISHER_NOT_FOUND' }, 404);
    }

    const body = await c.req.json<{
      name: string;
      slug: string;
      category: string;
      description: string;
      homepage?: string;
      repository?: string;
    }>();

    if (!body.name || !body.slug || !body.description) {
      return c.json({ error: 'Missing required fields (name, slug, description)', code: 'INVALID_INPUT' }, 400);
    }

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(body.slug) || body.slug.length > 64) {
      return c.json({ error: 'Invalid slug format (lowercase alphanumeric with hyphens, 2-64 chars)', code: 'INVALID_SLUG' }, 400);
    }

    const existing = getSkillBySlug(db, body.slug);
    if (existing) {
      return c.json({ error: 'Slug already taken', code: 'SLUG_EXISTS' }, 409);
    }

    const skill = createSkill(db, {
      publisher_id: publisherId,
      name: body.name,
      slug: body.slug,
      category: body.category || 'uncategorized',
      description: body.description,
      homepage: body.homepage,
      repository: body.repository,
    });

    return c.json({ skill }, 201);
  });

  // PUT /v1/skills/:slug/versions/:version — Publish a version
  app.put('/:slug/versions/:version', async (c) => {
    const publisherId = c.get('publisherId') || c.req.header('X-Publisher-Id');
    if (!publisherId) {
      return c.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401);
    }

    const slug = c.req.param('slug');
    const semver = c.req.param('version');
    const skill = getSkillBySlug(db, slug);

    if (!skill) {
      return c.json({ error: 'Skill not found', code: 'SKILL_NOT_FOUND' }, 404);
    }

    if (skill.publisher_id !== publisherId) {
      return c.json({ error: 'Not your skill', code: 'FORBIDDEN' }, 403);
    }

    const existingVersion = getVersionBySemver(db, skill.id, semver);
    if (existingVersion) {
      return c.json({ error: 'Version already exists (versions are immutable)', code: 'VERSION_EXISTS' }, 409);
    }

    const body = await c.req.json<{
      manifest: SkillManifest;
      readme: string;
      content_hash: string;
    }>();

    if (!body.manifest || !body.content_hash) {
      return c.json({ error: 'Missing manifest or content_hash', code: 'INVALID_INPUT' }, 400);
    }

    const versionId = createVersion(db, {
      skill_id: skill.id,
      semver,
      content_hash: body.content_hash,
      manifest: body.manifest,
      readme: body.readme || '',
    });

    if (body.manifest.capabilities) {
      const caps = [];
      for (const [type, perms] of Object.entries(body.manifest.capabilities)) {
        caps.push({ type, resource: '*', permissions: perms, required: true });
      }
      if (caps.length > 0) {
        setCapabilities(db, skill.id, caps);
      }
    }

    // Set skill to pending
    if (skill.visibility === 'draft') {
      updateSkillVisibility(db, skill.id, 'pending');
    }

    // ── Inline Verification (L1 + L2) ──
    const skillContent = body.manifest.content as string || body.readme || '';
    const manifestObj = body.manifest as Record<string, unknown>;

    // L1: Manifest check
    const l1 = runL1ManifestCheck(skillContent, manifestObj);
    createAudit(db, {
      version_id: versionId,
      stage: 'static',
      status: l1.status,
      results: { level: 'L1', ...l1.results },
    });

    // L2: Static analysis (only if L1 doesn't hard-fail)
    let l2Status: 'pass' | 'fail' | 'escalate' = 'pending' as any;
    let l2Summary = '';
    if (l1.status === 'pass' || l1.results.score >= 50) {
      const l2 = runL2StaticAnalysis(skillContent, manifestObj, body.readme);
      createAudit(db, {
        version_id: versionId,
        stage: 'static',
        status: l2.status,
        results: { level: 'L2', ...l2.results },
      });
      l2Status = l2.status;
      l2Summary = l2.results.summary;
    }

    // Determine overall status
    let overallStatus: 'pass' | 'fail' | 'escalate' | 'pending' = 'pending';
    if (l1.status === 'fail' && l1.results.score < 50) {
      overallStatus = 'fail';
    } else if (l2Status === 'fail') {
      overallStatus = 'fail';
    } else if (l2Status === 'escalate') {
      overallStatus = 'escalate';
    } else if (l1.status === 'pass' && l2Status === 'pass') {
      overallStatus = 'pass';
    }

    // Update version audit status
    db.run('UPDATE versions SET audit_status = ? WHERE id = ?', [overallStatus, versionId]);

    // Auto-publish if both pass
    if (overallStatus === 'pass') {
      updateSkillVisibility(db, skill.id, 'published');
    }

    return c.json({
      version_id: versionId,
      audit_status: overallStatus,
      verification: {
        l1: { status: l1.status, score: l1.results.score, errors: l1.results.errors },
        l2: l2Status !== ('pending' as any) ? { status: l2Status, summary: l2Summary } : null,
      },
      message: overallStatus === 'pass'
        ? 'Version verified and published'
        : overallStatus === 'fail'
        ? 'Version failed verification'
        : 'Version submitted — requires additional review',
    }, 201);
  });

  // GET /v1/skills/:slug/audit-status — Check audit pipeline status
  app.get('/:slug/audit-status', (c) => {
    const slug = c.req.param('slug');
    const skill = getSkillBySlug(db, slug);

    if (!skill) {
      return c.json({ error: 'Skill not found', code: 'SKILL_NOT_FOUND' }, 404);
    }

    const latestVersion = db.query(
      'SELECT id, semver, audit_status FROM versions WHERE skill_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(skill.id) as any;

    if (!latestVersion) {
      return c.json({ error: 'No versions found', code: 'NO_VERSIONS' }, 404);
    }

    const audits = listAudits(db, latestVersion.id);

    return c.json({
      version: latestVersion.semver,
      overall_status: latestVersion.audit_status,
      stages: audits.map((a: any) => ({
        stage: a.stage,
        status: a.status,
        created_at: a.created_at,
      })),
    });
  });

  return app;
}

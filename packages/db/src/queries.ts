// Percival Labs - Database Query Layer
// Thin wrapper over bun:sqlite for type-safe queries

import { Database } from 'bun:sqlite';
import type {
  Skill,
  Publisher,
  Version,
  Capability,
  Audit,
  Installation,
  Rating,
  Report,
  SkillManifest,
} from '@percival/shared';

// ── ID Generation ──

export function newId(): string {
  return crypto.randomUUID();
}

// ── Publisher Queries ──

export function getPublisher(db: Database, id: string): Publisher | null {
  return db.query('SELECT * FROM publishers WHERE id = ?').get(id) as Publisher | null;
}

export function getPublisherByGithub(db: Database, githubId: string): Publisher | null {
  return db.query('SELECT * FROM publishers WHERE github_id = ?').get(githubId) as Publisher | null;
}

export function createPublisher(
  db: Database,
  data: { github_id: string; display_name: string; email: string }
): Publisher {
  const id = newId();
  db.run(
    'INSERT INTO publishers (id, github_id, display_name, email) VALUES (?, ?, ?, ?)',
    [id, data.github_id, data.display_name, data.email]
  );
  return getPublisher(db, id)!;
}

// ── Skill Queries ──

export function getSkill(db: Database, id: string): Skill | null {
  return db.query('SELECT * FROM skills WHERE id = ?').get(id) as Skill | null;
}

export function getSkillBySlug(db: Database, slug: string): Skill | null {
  return db.query('SELECT * FROM skills WHERE slug = ?').get(slug) as Skill | null;
}

export interface ListSkillsParams {
  q?: string;
  category?: string;
  tag?: string;
  trustMin?: number;
  visibility?: string;
  limit?: number;
  offset?: number;
}

export function listSkills(db: Database, params: ListSkillsParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  // Default to published only
  const vis = params.visibility || 'published';
  conditions.push('s.visibility = ?');
  values.push(vis);

  if (params.q) {
    // Try FTS5 first, fall back to LIKE
    try {
      const ftsResults = db.query(
        "SELECT s.id FROM skills s WHERE s.rowid IN (SELECT rowid FROM fts_skills WHERE fts_skills MATCH ?)"
      ).all(params.q) as { id: string }[];

      if (ftsResults.length > 0) {
        const ids = ftsResults.map(r => r.id);
        conditions.push(`s.id IN (${ids.map(() => '?').join(',')})`);
        values.push(...ids);
      } else {
        // FTS returned no results — use LIKE as fallback
        conditions.push('(s.name LIKE ? OR s.description LIKE ?)');
        values.push(`%${params.q}%`, `%${params.q}%`);
      }
    } catch {
      // FTS5 not available or query error — fall back to LIKE
      conditions.push('(s.name LIKE ? OR s.description LIKE ?)');
      values.push(`%${params.q}%`, `%${params.q}%`);
    }
  }

  if (params.category) {
    conditions.push('s.category = ?');
    values.push(params.category);
  }

  if (params.trustMin !== undefined) {
    conditions.push('p.trust_score >= ?');
    values.push(params.trustMin);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 20, 100);
  const offset = params.offset || 0;

  const countQuery = `SELECT COUNT(*) as total FROM skills s JOIN publishers p ON s.publisher_id = p.id ${where}`;
  const total = (db.query(countQuery).get(...values) as { total: number }).total;

  const query = `
    SELECT s.*, p.display_name as publisher_name, p.trust_score,
      (SELECT v.semver FROM versions v WHERE v.skill_id = s.id ORDER BY v.created_at DESC LIMIT 1) as latest_version
    FROM skills s
    JOIN publishers p ON s.publisher_id = p.id
    ${where}
    ORDER BY s.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  const skills = db.query(query).all(...values, limit, offset);

  return { skills, total, limit, offset };
}

export function createSkill(
  db: Database,
  data: {
    publisher_id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
    homepage?: string;
    repository?: string;
  }
): Skill {
  const id = newId();
  db.run(
    `INSERT INTO skills (id, publisher_id, name, slug, category, description, homepage, repository)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.publisher_id, data.name, data.slug, data.category, data.description, data.homepage || null, data.repository || null]
  );
  return getSkill(db, id)!;
}

export function updateSkillVisibility(db: Database, id: string, visibility: string): void {
  db.run("UPDATE skills SET visibility = ?, updated_at = datetime('now') WHERE id = ?", [visibility, id]);
}

// ── Version Queries ──

export function getVersion(db: Database, id: string): (Version & { manifest: string }) | null {
  return db.query('SELECT * FROM versions WHERE id = ?').get(id) as any;
}

export function getVersionBySemver(db: Database, skillId: string, semver: string) {
  return db.query('SELECT * FROM versions WHERE skill_id = ? AND semver = ?').get(skillId, semver) as any;
}

export function listVersions(db: Database, skillId: string) {
  return db.query(
    'SELECT id, semver, content_hash, audit_status, created_at FROM versions WHERE skill_id = ? ORDER BY created_at DESC'
  ).all(skillId);
}

export function createVersion(
  db: Database,
  data: {
    skill_id: string;
    semver: string;
    content_hash: string;
    manifest: SkillManifest;
    readme: string;
  }
): string {
  const id = newId();
  db.run(
    'INSERT INTO versions (id, skill_id, semver, content_hash, manifest, readme) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.skill_id, data.semver, data.content_hash, JSON.stringify(data.manifest), data.readme]
  );
  return id;
}

// ── Capability Queries ──

export function listCapabilities(db: Database, skillId: string): Capability[] {
  return db.query('SELECT * FROM capabilities WHERE skill_id = ?').all(skillId) as Capability[];
}

export function setCapabilities(db: Database, skillId: string, caps: Omit<Capability, 'id' | 'skill_id'>[]) {
  db.run('DELETE FROM capabilities WHERE skill_id = ?', [skillId]);
  const stmt = db.prepare(
    'INSERT INTO capabilities (id, skill_id, type, resource, permissions, required) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const cap of caps) {
    stmt.run(newId(), skillId, cap.type, cap.resource, JSON.stringify(cap.permissions), cap.required ? 1 : 0);
  }
}

// ── Audit Queries ──

export function listAudits(db: Database, versionId: string): Audit[] {
  return db.query('SELECT * FROM audits WHERE version_id = ? ORDER BY created_at DESC').all(versionId) as Audit[];
}

export function createAudit(
  db: Database,
  data: { version_id: string; stage: string; status: string; results: Record<string, unknown>; reviewer_id?: string }
): string {
  const id = newId();
  db.run(
    'INSERT INTO audits (id, version_id, stage, status, results, reviewer_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.version_id, data.stage, data.status, JSON.stringify(data.results), data.reviewer_id || null]
  );
  return id;
}

// ── Installation Queries ──

export function recordInstallation(db: Database, versionId: string, agentId: string): string {
  const existing = db.query(
    'SELECT id FROM installations WHERE version_id = ? AND agent_id = ?'
  ).get(versionId, agentId) as { id: string } | null;

  if (existing) {
    db.run(
      "UPDATE installations SET usage_count = usage_count + 1, last_used = datetime('now') WHERE id = ?",
      [existing.id]
    );
    return existing.id;
  }

  const id = newId();
  db.run(
    'INSERT INTO installations (id, version_id, agent_id) VALUES (?, ?, ?)',
    [id, versionId, agentId]
  );
  return id;
}

export function getInstallCount(db: Database, skillId: string): number {
  const result = db.query(
    'SELECT COUNT(DISTINCT i.agent_id) as count FROM installations i JOIN versions v ON i.version_id = v.id WHERE v.skill_id = ?'
  ).get(skillId) as { count: number };
  return result.count;
}

// ── Rating Queries ──

export function getRatingStats(db: Database, skillId: string): { avg: number; count: number } {
  const result = db.query(
    'SELECT COALESCE(AVG(score), 0) as avg, COUNT(*) as count FROM ratings WHERE skill_id = ?'
  ).get(skillId) as { avg: number; count: number };
  return result;
}

export function createRating(
  db: Database,
  data: { skill_id: string; agent_id: string; score: number; review?: string }
): string {
  const id = newId();
  db.run(
    'INSERT INTO ratings (id, skill_id, agent_id, score, review) VALUES (?, ?, ?, ?, ?) ON CONFLICT(skill_id, agent_id) DO UPDATE SET score = ?, review = ?',
    [id, data.skill_id, data.agent_id, data.score, data.review || null, data.score, data.review || null]
  );
  return id;
}

// ── Report Queries ──

export function createReport(
  db: Database,
  data: { skill_id: string; reporter_id: string; category: string; description: string }
): string {
  const id = newId();
  db.run(
    'INSERT INTO reports (id, skill_id, reporter_id, category, description) VALUES (?, ?, ?, ?, ?)',
    [id, data.skill_id, data.reporter_id, data.category, data.description]
  );
  return id;
}

export function listOpenReports(db: Database): Report[] {
  return db.query("SELECT * FROM reports WHERE status IN ('open', 'investigating') ORDER BY created_at DESC").all() as Report[];
}

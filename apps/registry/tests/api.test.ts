// Percival Labs - API Integration Tests

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { initDatabase } from '@percival/db';
import { setupMiddleware } from '../src/middleware/headers';
import { skillRoutes } from '../src/routes/skills';
import { publisherRoutes } from '../src/routes/publishers';
import { healthRoutes } from '../src/routes/health';
import { createPublisher, createSkill, createVersion, createAudit, setCapabilities } from '@percival/db';
import type { Database } from 'bun:sqlite';

let db: Database;
let app: Hono;
let publisherId: string;
let skillId: string;

function request(path: string, init?: RequestInit) {
  return app.request(`http://localhost${path}`, init);
}

beforeAll(() => {
  // Use in-memory database for tests
  db = initDatabase(':memory:');

  app = new Hono();
  setupMiddleware(app);
  app.route('/health', healthRoutes(db));
  app.route('/v1/skills', skillRoutes(db));
  app.route('/v1/publishers', publisherRoutes(db));

  // Seed test data
  const publisher = createPublisher(db, {
    github_id: 'test-user',
    display_name: 'Test Publisher',
    email: 'test@example.com',
  });
  publisherId = publisher.id;
  db.run("UPDATE publishers SET verified_at = datetime('now'), trust_score = 80 WHERE id = ?", [publisherId]);

  const skill = createSkill(db, {
    publisher_id: publisherId,
    name: 'Test Skill',
    slug: 'test-skill',
    category: 'testing',
    description: 'A skill for testing the API',
  });
  skillId = skill.id;

  const versionId = createVersion(db, {
    skill_id: skillId,
    semver: '1.0.0',
    content_hash: 'abc123',
    manifest: {
      name: 'Test Skill',
      version: '1.0.0',
      description: 'A test skill',
      author: 'Test Publisher',
      license: 'MIT',
      main: 'skill.ts',
      capabilities: { network: { domains: ['example.com'] } },
      runtime: { engine: 'bun', version: '1.0.0' },
      category: 'testing',
      tags: ['test'],
    },
    readme: '# Test Skill\n\nA skill for testing.',
  });

  createAudit(db, { version_id: versionId, stage: 'static', status: 'pass', results: {} });
  createAudit(db, { version_id: versionId, stage: 'dynamic', status: 'pass', results: {} });
  db.run("UPDATE versions SET audit_status = 'pass' WHERE id = ?", [versionId]);
  db.run("UPDATE skills SET visibility = 'published' WHERE id = ?", [skillId]);

  setCapabilities(db, skillId, [
    { type: 'network', resource: 'example.com', permissions: { domains: ['example.com'] }, required: true },
  ]);
});

afterAll(() => {
  db.close();
});

describe('Health', () => {
  test('GET /health returns healthy', async () => {
    const res = await request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  test('GET /health/stats returns counts', async () => {
    const res = await request('/health/stats');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.publishers).toBe(1);
    expect(body.stats.skills).toBe(1);
  });
});

describe('Skills Discovery', () => {
  test('GET /v1/skills lists published skills', async () => {
    const res = await request('/v1/skills');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills.length).toBe(1);
    expect(body.skills[0].slug).toBe('test-skill');
    expect(body.total).toBe(1);
  });

  test('GET /v1/skills?q=test finds skills by name', async () => {
    const res = await request('/v1/skills?q=test');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills.length).toBe(1);
  });

  test('GET /v1/skills?q=nonexistent returns empty', async () => {
    const res = await request('/v1/skills?q=nonexistent');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills.length).toBe(0);
  });

  test('GET /v1/skills?category=testing filters by category', async () => {
    const res = await request('/v1/skills?category=testing');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills.length).toBe(1);
  });

  test('GET /v1/skills/:slug returns skill detail', async () => {
    const res = await request('/v1/skills/test-skill');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skill.name).toBe('Test Skill');
    expect(body.versions.length).toBe(1);
    expect(body.trust).toBeDefined();
    expect(body.capabilities.length).toBe(1);
  });

  test('GET /v1/skills/:slug returns 404 for missing', async () => {
    const res = await request('/v1/skills/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('Version Endpoints', () => {
  test('GET /v1/skills/:slug/versions/:version returns version detail', async () => {
    const res = await request('/v1/skills/test-skill/versions/1.0.0');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version.semver).toBe('1.0.0');
    expect(body.version.manifest.name).toBe('Test Skill');
    expect(body.audit.length).toBe(2);
  });

  test('GET /v1/skills/:slug/versions/:version returns 404 for missing version', async () => {
    const res = await request('/v1/skills/test-skill/versions/9.9.9');
    expect(res.status).toBe(404);
  });
});

describe('Trust', () => {
  test('GET /v1/skills/:slug/trust returns trust score', async () => {
    const res = await request('/v1/skills/test-skill/trust');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trust.overall).toBeGreaterThan(0);
    expect(body.trust.dimensions).toBeDefined();
    expect(body.trust.dimensions.security).toBeGreaterThan(0);
  });
});

describe('Ratings', () => {
  test('POST /v1/skills/:slug/ratings creates a rating', async () => {
    const res = await request('/v1/skills/test-skill/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: 'agent-001', score: 4, review: 'Works well' }),
    });
    expect(res.status).toBe(201);
  });

  test('POST /v1/skills/:slug/ratings rejects invalid score', async () => {
    const res = await request('/v1/skills/test-skill/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: 'agent-002', score: 6 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('Reports', () => {
  test('POST /v1/skills/:slug/reports creates a report', async () => {
    const res = await request('/v1/skills/test-skill/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporter_id: 'agent-001',
        category: 'broken',
        description: 'Returns error on valid input',
      }),
    });
    expect(res.status).toBe(201);
  });

  test('POST /v1/skills/:slug/reports rejects invalid category', async () => {
    const res = await request('/v1/skills/test-skill/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporter_id: 'agent-001',
        category: 'invalid',
        description: 'test',
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe('Publishing', () => {
  test('POST /v1/skills creates a skill', async () => {
    const res = await request('/v1/skills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Publisher-Id': publisherId,
      },
      body: JSON.stringify({
        name: 'New Skill',
        slug: 'new-skill',
        category: 'utility',
        description: 'A newly published skill',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.skill.slug).toBe('new-skill');
    expect(body.skill.visibility).toBe('draft');
  });

  test('POST /v1/skills rejects without auth', async () => {
    const res = await request('/v1/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', slug: 'xx', description: 'test' }),
    });
    expect(res.status).toBe(401);
  });

  test('POST /v1/skills rejects duplicate slug', async () => {
    const res = await request('/v1/skills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Publisher-Id': publisherId,
      },
      body: JSON.stringify({
        name: 'Duplicate',
        slug: 'test-skill',
        description: 'Should fail',
      }),
    });
    expect(res.status).toBe(409);
  });

  test('PUT /v1/skills/:slug/versions/:version publishes a version', async () => {
    const res = await request('/v1/skills/new-skill/versions/1.0.0', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Publisher-Id': publisherId,
      },
      body: JSON.stringify({
        content_hash: 'def456',
        manifest: {
          name: 'New Skill',
          version: '1.0.0',
          description: 'A new skill',
          author: 'Test Publisher',
          license: 'MIT',
          main: 'skill.ts',
          capabilities: {},
          runtime: { engine: 'bun', version: '1.0.0' },
          category: 'utility',
          tags: ['test'],
        },
        readme: '# New Skill',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.audit_status).toBe('pending');
  });

  test('PUT rejects duplicate version (immutable)', async () => {
    const res = await request('/v1/skills/new-skill/versions/1.0.0', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Publisher-Id': publisherId,
      },
      body: JSON.stringify({
        content_hash: 'xyz789',
        manifest: {
          name: 'New Skill',
          version: '1.0.0',
          description: 'Modified',
          author: 'Test Publisher',
          license: 'MIT',
          main: 'skill.ts',
          capabilities: {},
          runtime: { engine: 'bun', version: '1.0.0' },
          category: 'utility',
          tags: ['test'],
        },
        readme: '# Modified',
      }),
    });
    expect(res.status).toBe(409);
  });
});

describe('Audit Status', () => {
  test('GET /v1/skills/:slug/audit-status returns pipeline status', async () => {
    const res = await request('/v1/skills/test-skill/audit-status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe('1.0.0');
    expect(body.overall_status).toBe('pass');
    expect(body.stages.length).toBeGreaterThan(0);
  });
});

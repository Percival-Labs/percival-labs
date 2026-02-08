// Percival Labs - PAI Skills Seeder
// Reads ALL SKILL.md files from ~/.claude/skills/*/SKILL.md,
// parses them, and inserts into the registry database.

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { initDatabase } from './schema';
import { createPublisher, createSkill, createVersion, setCapabilities, createAudit, getPublisherByGithub } from './queries';
import { parseSkillMd } from '@percival/shared';

const DB_PATH = process.env.DB_PATH || './data/percival.db';
const SKILLS_DIR = join(homedir(), '.claude', 'skills');

function seedPaiSkills() {
  const db = initDatabase(DB_PATH);

  console.log('[Seed] Scanning PAI skills directory...');
  console.log(`[Seed] Source: ${SKILLS_DIR}`);
  console.log(`[Seed] Database: ${DB_PATH}`);
  console.log('');

  // Get or create PAI Labs publisher
  let publisher = getPublisherByGithub(db, 'pai-labs');
  if (!publisher) {
    publisher = createPublisher(db, {
      github_id: 'pai-labs',
      display_name: 'PAI Labs',
      email: 'hello@percival.directory',
    });
    db.run("UPDATE publishers SET verified_at = datetime('now'), trust_score = 85 WHERE id = ?", [publisher.id]);
    console.log(`[Seed] Created publisher: ${publisher.display_name}`);
  } else {
    console.log(`[Seed] Found existing publisher: ${publisher.display_name}`);
  }

  // Scan skills directory
  if (!existsSync(SKILLS_DIR)) {
    console.error(`[Seed] Skills directory not found: ${SKILLS_DIR}`);
    db.close();
    process.exit(1);
  }

  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  let count = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!existsSync(skillMdPath)) {
      skipped++;
      continue;
    }

    try {
      const content = readFileSync(skillMdPath, 'utf-8');
      const parsed = parseSkillMd(content);

      // Generate slug from name
      const slug = parsed.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64);

      if (slug.length < 2) {
        console.log(`[Seed] Skipping "${entry.name}" — slug too short: "${slug}"`);
        skipped++;
        continue;
      }

      // Check if already exists
      const existingSkill = db.query('SELECT id FROM skills WHERE slug = ?').get(slug) as { id: string } | null;
      if (existingSkill) {
        console.log(`[Seed] Skipping "${parsed.name}" — already exists (${slug})`);
        skipped++;
        continue;
      }

      const skill = createSkill(db, {
        publisher_id: publisher.id,
        name: parsed.name,
        slug,
        category: parsed.category,
        description: parsed.description.slice(0, 500),
      });

      // Create version with minimal manifest
      const manifest = {
        name: parsed.name,
        version: '1.0.0',
        description: parsed.description.slice(0, 200),
        author: 'PAI Labs',
        license: 'MIT',
        main: 'SKILL.md',
        capabilities: {},
        runtime: { engine: 'bun' as const, version: '1.0.0' },
        category: parsed.category,
        tags: parsed.triggers.slice(0, 10),
      };

      const versionId = createVersion(db, {
        skill_id: skill.id,
        semver: '1.0.0',
        content_hash: Bun.hash(content).toString(16),
        manifest,
        readme: parsed.body.slice(0, 2000),
      });

      // Create passing audits for first-party skills
      createAudit(db, { version_id: versionId, stage: 'static', status: 'pass', results: { issues: 0, source: 'pai-first-party' } });
      createAudit(db, { version_id: versionId, stage: 'human', status: 'pass', results: { reviewer: 'pai-labs' } });

      db.run("UPDATE versions SET audit_status = 'pass' WHERE id = ?", [versionId]);
      db.run("UPDATE skills SET visibility = 'published', updated_at = datetime('now') WHERE id = ?", [skill.id]);

      count++;
      console.log(`[Seed] ${parsed.name} (${slug}) — ${parsed.category}`);
    } catch (err) {
      console.error(`[Seed] Error processing ${entry.name}: ${err}`);
      skipped++;
    }
  }

  console.log(`\n[Seed] Done! ${count} skills ingested, ${skipped} skipped.`);
  db.close();
}

seedPaiSkills();

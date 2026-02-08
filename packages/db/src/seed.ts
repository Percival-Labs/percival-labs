// Percival Labs - Seed Data
// Populate with PAI first-party skills for testing

import { Database } from 'bun:sqlite';
import { initDatabase } from './schema';
import { createPublisher, createSkill, createVersion, setCapabilities, createAudit } from './queries';
import type { SkillManifest } from '@percival/shared';

const DB_PATH = process.env.DB_PATH || './data/percival.db';

function seed() {
  const db = initDatabase(DB_PATH);

  console.log('[Seed] Populating Percival Labs with PAI first-party skills...');

  // Create PAI Labs publisher
  const publisher = createPublisher(db, {
    github_id: 'pai-labs',
    display_name: 'PAI Labs',
    email: 'hello@percival.directory',
  });

  // Mark as verified
  db.run("UPDATE publishers SET verified_at = datetime('now'), trust_score = 85 WHERE id = ?", [publisher.id]);

  console.log(`[Seed] Created publisher: ${publisher.display_name} (${publisher.id})`);

  // ── Seed Skills ──

  const skills: Array<{
    name: string;
    slug: string;
    category: string;
    description: string;
    manifest: SkillManifest;
    readme: string;
    capabilities: Array<{ type: string; resource: string; permissions: Record<string, unknown>; required: boolean }>;
  }> = [
    {
      name: 'Research',
      slug: 'research',
      category: 'intelligence',
      description: 'Multi-source web research with configurable depth levels. Synthesizes findings from multiple sources into structured reports.',
      manifest: {
        name: 'Research',
        version: '1.0.0',
        description: 'Multi-source web research with configurable depth levels',
        author: 'PAI Labs',
        license: 'MIT',
        main: 'skill.ts',
        capabilities: {
          network: { domains: ['*'], protocols: ['https'] },
          llm: { models: ['claude-sonnet-4-5-20250929'], maxTokens: 8192 },
        },
        dependencies: {},
        runtime: { engine: 'bun', version: '1.0.0' },
        category: 'intelligence',
        tags: ['research', 'web-search', 'synthesis', 'multi-source'],
      },
      readme: '# Research Skill\n\nMulti-source web research agent with configurable depth.\n\n## Usage\n\nProvide a research query and depth level (quick, standard, deep).\n\n## Capabilities\n\n- Web search across multiple engines\n- Source verification and cross-referencing\n- Structured report generation',
      capabilities: [
        { type: 'network', resource: '*', permissions: { domains: ['*'] }, required: true },
        { type: 'llm', resource: 'claude-sonnet', permissions: { maxTokens: 8192 }, required: true },
      ],
    },
    {
      name: 'Security Scanner',
      slug: 'security-scanner',
      category: 'security',
      description: 'OSINT and security assessment tooling. Domain reconnaissance, SSL analysis, and proactive threat monitoring.',
      manifest: {
        name: 'Security Scanner',
        version: '1.0.0',
        description: 'OSINT and security assessment for domains and infrastructure',
        author: 'PAI Labs',
        license: 'MIT',
        main: 'skill.ts',
        capabilities: {
          network: { domains: ['*'], protocols: ['https'] },
          process: { spawn: ['nmap', 'dig', 'whois'] },
        },
        dependencies: {},
        runtime: { engine: 'bun', version: '1.0.0' },
        category: 'security',
        tags: ['security', 'osint', 'reconnaissance', 'domain-analysis'],
      },
      readme: '# Security Scanner\n\nOSINT and security assessment for domains and infrastructure.\n\n## Capabilities\n\n- Domain reconnaissance\n- SSL certificate analysis\n- Port scanning\n- WHOIS lookups',
      capabilities: [
        { type: 'network', resource: '*', permissions: { domains: ['*'] }, required: true },
        { type: 'process', resource: 'nmap', permissions: { spawn: ['nmap', 'dig', 'whois'] }, required: true },
      ],
    },
    {
      name: 'Content Machine',
      slug: 'content-machine',
      category: 'content',
      description: 'AI-powered content generation for any business. Blog posts, social media, email sequences with brand voice consistency.',
      manifest: {
        name: 'Content Machine',
        version: '1.0.0',
        description: 'AI-powered content generation with brand voice consistency',
        author: 'PAI Labs',
        license: 'MIT',
        main: 'skill.ts',
        capabilities: {
          filesystem: { read: ['./brands/*'], write: ['./output/*'] },
          llm: { models: ['claude-sonnet-4-5-20250929'], maxTokens: 16384 },
        },
        dependencies: {},
        runtime: { engine: 'bun', version: '1.0.0' },
        category: 'content',
        tags: ['content', 'blog', 'social-media', 'brand-voice', 'copywriting'],
      },
      readme: '# Content Machine\n\nGenerate brand-consistent content at scale.\n\n## Features\n\n- Blog posts (SEO-optimized)\n- Social media posts\n- Email sequences\n- Brand voice training',
      capabilities: [
        { type: 'filesystem', resource: './brands/*', permissions: { read: ['./brands/*'], write: ['./output/*'] }, required: true },
        { type: 'llm', resource: 'claude-sonnet', permissions: { maxTokens: 16384 }, required: true },
      ],
    },
    {
      name: 'Script Forge',
      slug: 'script-forge',
      category: 'content',
      description: 'Generate engaging video scripts for faceless YouTube channels. Supports iceberg, documentary, horror, and tier list formats.',
      manifest: {
        name: 'Script Forge',
        version: '1.0.0',
        description: 'Video script generation for faceless YouTube channels',
        author: 'PAI Labs',
        license: 'MIT',
        main: 'skill.ts',
        capabilities: {
          filesystem: { write: ['./scripts/*'] },
          llm: { models: ['claude-sonnet-4-5-20250929'], maxTokens: 12000 },
        },
        dependencies: {},
        runtime: { engine: 'bun', version: '1.0.0' },
        category: 'content',
        tags: ['youtube', 'scripts', 'video', 'faceless', 'storytelling'],
      },
      readme: '# Script Forge\n\nGenerate engaging video scripts for YouTube.\n\n## Formats\n\n- Iceberg charts\n- Mini-documentaries\n- Horror narration\n- Tier lists\n- Listicles',
      capabilities: [
        { type: 'filesystem', resource: './scripts/*', permissions: { write: ['./scripts/*'] }, required: false },
        { type: 'llm', resource: 'claude-sonnet', permissions: { maxTokens: 12000 }, required: true },
      ],
    },
    {
      name: 'Brand Smith',
      slug: 'brand-smith',
      category: 'business',
      description: 'Create comprehensive brand identities. Color palettes, typography, voice guidelines, and style documentation.',
      manifest: {
        name: 'Brand Smith',
        version: '1.0.0',
        description: 'Comprehensive brand identity creation',
        author: 'PAI Labs',
        license: 'MIT',
        main: 'skill.ts',
        capabilities: {
          filesystem: { write: ['./brands/*'] },
          llm: { models: ['claude-sonnet-4-5-20250929'], maxTokens: 8192 },
        },
        dependencies: {},
        runtime: { engine: 'bun', version: '1.0.0' },
        category: 'business',
        tags: ['brand', 'identity', 'design', 'guidelines', 'voice'],
      },
      readme: '# Brand Smith\n\nCreate complete brand identities.\n\n## Outputs\n\n- Brand guidelines document\n- Color palette (hex, oklch)\n- Typography system\n- Voice and tone guide\n- Logo brief',
      capabilities: [
        { type: 'filesystem', resource: './brands/*', permissions: { write: ['./brands/*'] }, required: false },
        { type: 'llm', resource: 'claude-sonnet', permissions: { maxTokens: 8192 }, required: true },
      ],
    },
  ];

  for (const s of skills) {
    const skill = createSkill(db, {
      publisher_id: publisher.id,
      name: s.name,
      slug: s.slug,
      category: s.category,
      description: s.description,
    });

    const versionId = createVersion(db, {
      skill_id: skill.id,
      semver: s.manifest.version,
      content_hash: Bun.hash(JSON.stringify(s.manifest)).toString(16),
      manifest: s.manifest,
      readme: s.readme,
    });

    setCapabilities(db, skill.id, s.capabilities);

    // Create passing audits for seed data
    createAudit(db, { version_id: versionId, stage: 'static', status: 'pass', results: { issues: 0 } });
    createAudit(db, { version_id: versionId, stage: 'dynamic', status: 'pass', results: { deviations: 0 } });
    createAudit(db, { version_id: versionId, stage: 'human', status: 'pass', results: { reviewer: 'pai-labs' } });

    // Mark version as passed and skill as published
    db.run("UPDATE versions SET audit_status = 'pass' WHERE id = ?", [versionId]);
    db.run("UPDATE skills SET visibility = 'published', updated_at = datetime('now') WHERE id = ?", [skill.id]);

    console.log(`[Seed] Created skill: ${s.name} (${s.slug}) v${s.manifest.version}`);
  }

  console.log(`\n[Seed] Done! ${skills.length} skills seeded.`);
  db.close();
}

seed();

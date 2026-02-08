// Percival Labs - Database Schema
// Uses bun:sqlite (native, zero dependencies)

import { Database } from 'bun:sqlite';

const SCHEMA = `
-- Publishers (GitHub OAuth identity)
CREATE TABLE IF NOT EXISTS publishers (
  id TEXT PRIMARY KEY,
  github_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  verified_at TEXT,
  trust_score INTEGER DEFAULT 0,
  wallet_addr TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Skills (the core registry)
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL REFERENCES publishers(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'uncategorized',
  description TEXT NOT NULL DEFAULT '',
  homepage TEXT,
  repository TEXT,
  visibility TEXT NOT NULL DEFAULT 'draft'
    CHECK (visibility IN ('draft', 'pending', 'published', 'suspended', 'revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Versions (immutable, content-addressed)
CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  semver TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  manifest TEXT NOT NULL,  -- JSON blob
  readme TEXT NOT NULL DEFAULT '',
  download_url TEXT,
  audit_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (audit_status IN ('pass', 'fail', 'escalate', 'pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_id, semver)
);

-- Capabilities (declared permissions per skill)
CREATE TABLE IF NOT EXISTS capabilities (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  type TEXT NOT NULL
    CHECK (type IN ('filesystem', 'network', 'process', 'system', 'crypto', 'llm')),
  resource TEXT NOT NULL DEFAULT '',
  permissions TEXT NOT NULL DEFAULT '{}',  -- JSON
  required INTEGER NOT NULL DEFAULT 1
);

-- Audits (verification pipeline results)
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES versions(id),
  stage TEXT NOT NULL
    CHECK (stage IN ('static', 'dynamic', 'human', 'continuous')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pass', 'fail', 'escalate', 'pending')),
  results TEXT NOT NULL DEFAULT '{}',  -- JSON
  reviewer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dependencies (skill-to-skill)
CREATE TABLE IF NOT EXISTS dependencies (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES versions(id),
  dep_skill_id TEXT NOT NULL REFERENCES skills(id),
  version_range TEXT NOT NULL,
  optional INTEGER NOT NULL DEFAULT 0
);

-- Installations (who installed what)
CREATE TABLE IF NOT EXISTS installations (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES versions(id),
  agent_id TEXT NOT NULL,
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(version_id, agent_id)
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  agent_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  review TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_id, agent_id)
);

-- Reports (community safety reports)
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  reporter_id TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('malicious', 'broken', 'misleading', 'license', 'spam')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- MCP Servers
CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL REFERENCES publishers(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  transport TEXT NOT NULL DEFAULT 'stdio'
    CHECK (transport IN ('stdio', 'sse', 'streamable-http')),
  homepage TEXT,
  repository TEXT,
  visibility TEXT NOT NULL DEFAULT 'draft'
    CHECK (visibility IN ('draft', 'pending', 'published', 'suspended', 'revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- MCP Server Versions
CREATE TABLE IF NOT EXISTS mcp_versions (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES mcp_servers(id),
  semver TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  manifest TEXT NOT NULL DEFAULT '{}',
  readme TEXT NOT NULL DEFAULT '',
  download_url TEXT,
  msss_level INTEGER NOT NULL DEFAULT 0,
  msss_controls_passed INTEGER NOT NULL DEFAULT 0,
  msss_controls_total INTEGER NOT NULL DEFAULT 0,
  audit_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (audit_status IN ('pass', 'fail', 'escalate', 'pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(server_id, semver)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_skills_publisher ON skills(publisher_id);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_visibility ON skills(visibility);
CREATE INDEX IF NOT EXISTS idx_versions_skill ON versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_versions_audit ON versions(audit_status);
CREATE INDEX IF NOT EXISTS idx_audits_version ON audits(version_id);
CREATE INDEX IF NOT EXISTS idx_capabilities_skill ON capabilities(skill_id);
CREATE INDEX IF NOT EXISTS idx_installations_agent ON installations(agent_id);
CREATE INDEX IF NOT EXISTS idx_installations_version ON installations(version_id);
CREATE INDEX IF NOT EXISTS idx_ratings_skill ON ratings(skill_id);
CREATE INDEX IF NOT EXISTS idx_reports_skill ON reports(skill_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_publisher ON mcp_servers(publisher_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_slug ON mcp_servers(slug);
CREATE INDEX IF NOT EXISTS idx_mcp_versions_server ON mcp_versions(server_id);

-- FTS5 for full-text search on skills
CREATE VIRTUAL TABLE IF NOT EXISTS fts_skills USING fts5(
  name,
  description,
  category,
  content='skills',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS fts_skills_ai AFTER INSERT ON skills BEGIN
  INSERT INTO fts_skills(rowid, name, description, category)
  VALUES (new.rowid, new.name, new.description, new.category);
END;

CREATE TRIGGER IF NOT EXISTS fts_skills_ad AFTER DELETE ON skills BEGIN
  INSERT INTO fts_skills(fts_skills, rowid, name, description, category)
  VALUES ('delete', old.rowid, old.name, old.description, old.category);
END;

CREATE TRIGGER IF NOT EXISTS fts_skills_au AFTER UPDATE ON skills BEGIN
  INSERT INTO fts_skills(fts_skills, rowid, name, description, category)
  VALUES ('delete', old.rowid, old.name, old.description, old.category);
  INSERT INTO fts_skills(rowid, name, description, category)
  VALUES (new.rowid, new.name, new.description, new.category);
END;
`;

export function initDatabase(dbPath: string): Database {
  const db = new Database(dbPath, { create: true });

  // Enable WAL mode for better concurrent read performance
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA busy_timeout = 5000');

  // Run schema
  db.exec(SCHEMA);

  return db;
}

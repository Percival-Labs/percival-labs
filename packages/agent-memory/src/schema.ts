// Agent Memory System — SQLite Schema
// Initializes the 8-table schema with indexes, WAL mode, and foreign keys.

import { Database } from "bun:sqlite";

const CREATE_AGENTS = `
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  expertise TEXT NOT NULL DEFAULT '[]',
  personality TEXT NOT NULL DEFAULT '',
  model_preference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('active', 'idle', 'offline'))
);
`;

const CREATE_EPISODES = `
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5 CHECK(importance >= 0.0 AND importance <= 1.0),
  context_tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
`;

const CREATE_FACTS = `
CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  content TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5 CHECK(confidence >= 0.0 AND confidence <= 1.0),
  source TEXT NOT NULL DEFAULT '',
  context_tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
`;

const CREATE_WORKING_MEMORY = `
CREATE TABLE IF NOT EXISTS working_memory (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  ttl_seconds INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  UNIQUE(agent_id, key)
);
`;

const CREATE_PROJECT_STATE = `
CREATE TABLE IF NOT EXISTS project_state (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  current_phase TEXT NOT NULL DEFAULT '',
  blockers TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
`;

const CREATE_DECISIONS = `
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL,
  alternatives TEXT NOT NULL DEFAULT '[]',
  consequences TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
`;

const CREATE_TASKS = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'blocked')),
  assigned_to TEXT,
  depends_on TEXT NOT NULL DEFAULT '[]',
  output TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assigned_to) REFERENCES agents(id)
);
`;

const CREATE_COMPACTION_LOG = `
CREATE TABLE IF NOT EXISTS compaction_log (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  episodes_archived INTEGER NOT NULL DEFAULT 0,
  facts_archived INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  compacted_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
`;

const INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_episodes_agent ON episodes(agent_id);",
  "CREATE INDEX IF NOT EXISTS idx_episodes_importance ON episodes(importance);",
  "CREATE INDEX IF NOT EXISTS idx_episodes_created ON episodes(created_at);",
  "CREATE INDEX IF NOT EXISTS idx_episodes_archived ON episodes(archived);",
  "CREATE INDEX IF NOT EXISTS idx_facts_agent ON facts(agent_id);",
  "CREATE INDEX IF NOT EXISTS idx_facts_confidence ON facts(confidence);",
  "CREATE INDEX IF NOT EXISTS idx_facts_archived ON facts(archived);",
  "CREATE INDEX IF NOT EXISTS idx_working_memory_agent ON working_memory(agent_id);",
  "CREATE INDEX IF NOT EXISTS idx_working_memory_agent_key ON working_memory(agent_id, key);",
  "CREATE INDEX IF NOT EXISTS idx_decisions_agent ON decisions(agent_id);",
  "CREATE INDEX IF NOT EXISTS idx_decisions_created ON decisions(created_at);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);",
  "CREATE INDEX IF NOT EXISTS idx_compaction_agent ON compaction_log(agent_id);",
];

export function initMemoryDatabase(dbPath: string): Database {
  const db = new Database(dbPath, { create: true });

  // Enable WAL mode for concurrent reads
  db.exec("PRAGMA journal_mode = WAL;");
  // Enable foreign keys
  db.exec("PRAGMA foreign_keys = ON;");
  // Set busy timeout to 5 seconds
  db.exec("PRAGMA busy_timeout = 5000;");

  // Create all tables
  db.exec(CREATE_AGENTS);
  db.exec(CREATE_EPISODES);
  db.exec(CREATE_FACTS);
  db.exec(CREATE_WORKING_MEMORY);
  db.exec(CREATE_PROJECT_STATE);
  db.exec(CREATE_DECISIONS);
  db.exec(CREATE_TASKS);
  db.exec(CREATE_COMPACTION_LOG);

  // Create indexes
  for (const idx of INDEXES) {
    db.exec(idx);
  }

  return db;
}

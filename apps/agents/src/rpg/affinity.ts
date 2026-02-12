// RPG Character System — Affinity Matrix
//
// 15 pairwise relationships between 6 agents.
// Seeded with initial values, driftable over time based on collaboration patterns.

import type { Database } from "bun:sqlite";
import type { AffinityPair } from "./types";

/** Seed data for initial affinity values */
const AFFINITY_SEEDS: Array<{ a: string; b: string; affinity: number }> = [
  { a: "coordinator", b: "reviewer", affinity: 0.85 },
  { a: "coordinator", b: "builder", affinity: 0.80 },
  { a: "coordinator", b: "researcher", affinity: 0.75 },
  { a: "researcher", b: "reviewer", affinity: 0.80 },
  { a: "builder", b: "artist", affinity: 0.70 },
  { a: "coordinator", b: "auditor", affinity: 0.70 },
  { a: "reviewer", b: "auditor", affinity: 0.75 },
  { a: "researcher", b: "builder", affinity: 0.55 },
  { a: "coordinator", b: "artist", affinity: 0.45 },
  { a: "builder", b: "reviewer", affinity: 0.40 },
  { a: "researcher", b: "artist", affinity: 0.50 },
  { a: "artist", b: "reviewer", affinity: 0.30 },
  { a: "builder", b: "auditor", affinity: 0.60 },
  { a: "researcher", b: "auditor", affinity: 0.55 },
  { a: "artist", b: "auditor", affinity: 0.35 },
];

/** Ensure agent_relationships table exists and seed initial values */
export function initAffinityTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_relationships (
      id TEXT PRIMARY KEY,
      agent_a TEXT NOT NULL,
      agent_b TEXT NOT NULL,
      affinity REAL NOT NULL DEFAULT 0.5,
      drift_history TEXT DEFAULT '[]',
      updated_at TEXT NOT NULL,
      UNIQUE(agent_a, agent_b)
    );
    CREATE INDEX IF NOT EXISTS idx_relationships_agents ON agent_relationships(agent_a, agent_b);
  `);

  // Seed only if table is empty
  const count = db
    .query<{ cnt: number }, []>("SELECT COUNT(*) as cnt FROM agent_relationships")
    .get();

  if (count && count.cnt > 0) return;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO agent_relationships (id, agent_a, agent_b, affinity, drift_history, updated_at)
     VALUES (?, ?, ?, ?, '[]', ?)`
  );

  const now = new Date().toISOString();
  for (const seed of AFFINITY_SEEDS) {
    // Canonical order: alphabetical
    const [a, b] = [seed.a, seed.b].sort();
    insert.run(crypto.randomUUID(), a, b, seed.affinity, now);
  }

  console.log(`[rpg/affinity] Seeded ${AFFINITY_SEEDS.length} relationships`);
}

/** Get all affinity pairs */
export function getAllAffinities(db: Database): AffinityPair[] {
  const rows = db
    .query<
      { agent_a: string; agent_b: string; affinity: number; drift_history: string },
      []
    >("SELECT agent_a, agent_b, affinity, drift_history FROM agent_relationships")
    .all();

  return rows.map((r) => ({
    agentA: r.agent_a,
    agentB: r.agent_b,
    affinity: r.affinity,
    driftHistory: JSON.parse(r.drift_history),
  }));
}

/** Get average affinity for a specific agent (used in Trust stat) */
export function getAffinityForAgent(db: Database, agentId: string): number {
  const row = db
    .query<{ avg: number | null }, [string, string]>(
      `SELECT AVG(affinity) as avg FROM agent_relationships
       WHERE agent_a = ? OR agent_b = ?`
    )
    .get(agentId, agentId);

  return row?.avg ?? 0.5;
}

/** Drift affinity between two agents based on a collaboration outcome */
export function driftAffinity(
  db: Database,
  agentA: string,
  agentB: string,
  delta: number,
): void {
  const [a, b] = [agentA, agentB].sort();

  const current = db
    .query<{ affinity: number; drift_history: string }, [string, string]>(
      "SELECT affinity, drift_history FROM agent_relationships WHERE agent_a = ? AND agent_b = ?"
    )
    .get(a, b);

  if (!current) return;

  const newAffinity = Math.max(0, Math.min(1, current.affinity + delta));
  const history: number[] = JSON.parse(current.drift_history);
  history.push(delta);
  // Keep last 20 drift entries
  if (history.length > 20) history.splice(0, history.length - 20);

  db.prepare(
    `UPDATE agent_relationships
     SET affinity = ?, drift_history = ?, updated_at = ?
     WHERE agent_a = ? AND agent_b = ?`
  ).run(newAffinity, JSON.stringify(history), new Date().toISOString(), a, b);
}

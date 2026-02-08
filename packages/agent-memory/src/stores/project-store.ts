// Agent Memory — Project State Store
// Tracks current project phase, description, and blockers.

import type { Database } from "bun:sqlite";
import type { ProjectState } from "../types.ts";

export function getProjectState(
  db: Database,
  name?: string
): ProjectState | null {
  let row: {
    id: string;
    name: string;
    description: string;
    current_phase: string;
    blockers: string;
    updated_at: string;
  } | null;

  if (name) {
    row = db
      .query(
        `SELECT id, name, description, current_phase, blockers, updated_at
         FROM project_state
         WHERE name = ?`
      )
      .get(name) as typeof row;
  } else {
    // Return the most recently updated project state
    row = db
      .query(
        `SELECT id, name, description, current_phase, blockers, updated_at
         FROM project_state
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get() as typeof row;
  }

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    current_phase: row.current_phase,
    blockers: JSON.parse(row.blockers) as string[],
    updated_at: row.updated_at,
  };
}

export function updateProjectState(
  db: Database,
  name: string,
  description: string,
  currentPhase: string,
  blockers: string[]
): ProjectState {
  const id = crypto.randomUUID();
  const updated_at = new Date().toISOString();
  const blockersJson = JSON.stringify(blockers);

  // Upsert by name
  db.run(
    `INSERT INTO project_state (id, name, description, current_phase, blockers, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description = excluded.description,
       current_phase = excluded.current_phase,
       blockers = excluded.blockers,
       updated_at = excluded.updated_at`,
    [id, name, description, currentPhase, blockersJson, updated_at]
  );

  // Read back to get the actual id (might be the old one if it was an update)
  const state = getProjectState(db, name);
  return state!;
}

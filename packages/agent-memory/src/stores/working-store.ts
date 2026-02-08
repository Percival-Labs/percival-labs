// Agent Memory — Working Memory Store
// Short-lived key-value entries with optional TTL.

import type { Database } from "bun:sqlite";
import type { WorkingMemoryEntry } from "../types.ts";

export function setWorking(
  db: Database,
  agentId: string,
  key: string,
  value: string,
  ttlSeconds?: number | null
): WorkingMemoryEntry {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const ttl = ttlSeconds ?? null;

  // Upsert: replace if agent_id+key already exists
  db.run(
    `INSERT INTO working_memory (id, agent_id, key, value, ttl_seconds, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(agent_id, key) DO UPDATE SET
       id = excluded.id,
       value = excluded.value,
       ttl_seconds = excluded.ttl_seconds,
       created_at = excluded.created_at`,
    [id, agentId, key, value, ttl, created_at]
  );

  return {
    id,
    agent_id: agentId,
    key,
    value,
    ttl_seconds: ttl,
    created_at,
  };
}

export function getWorking(
  db: Database,
  agentId: string,
  key?: string
): WorkingMemoryEntry[] {
  if (key) {
    const row = db
      .query(
        `SELECT id, agent_id, key, value, ttl_seconds, created_at
         FROM working_memory
         WHERE agent_id = ? AND key = ?`
      )
      .get(agentId, key) as {
      id: string;
      agent_id: string;
      key: string;
      value: string;
      ttl_seconds: number | null;
      created_at: string;
    } | null;

    if (!row) return [];

    return [
      {
        id: row.id,
        agent_id: row.agent_id,
        key: row.key,
        value: row.value,
        ttl_seconds: row.ttl_seconds,
        created_at: row.created_at,
      },
    ];
  }

  const rows = db
    .query(
      `SELECT id, agent_id, key, value, ttl_seconds, created_at
       FROM working_memory
       WHERE agent_id = ?
       ORDER BY created_at DESC`
    )
    .all(agentId) as Array<{
    id: string;
    agent_id: string;
    key: string;
    value: string;
    ttl_seconds: number | null;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    agent_id: row.agent_id,
    key: row.key,
    value: row.value,
    ttl_seconds: row.ttl_seconds,
    created_at: row.created_at,
  }));
}

export function clearWorking(
  db: Database,
  agentId: string,
  key?: string
): number {
  if (key) {
    const result = db.run(
      `DELETE FROM working_memory WHERE agent_id = ? AND key = ?`,
      [agentId, key]
    );
    return result.changes;
  }

  const result = db.run(`DELETE FROM working_memory WHERE agent_id = ?`, [
    agentId,
  ]);
  return result.changes;
}

export function expireWorking(db: Database): number {
  // Delete entries where TTL has elapsed since created_at
  const result = db.run(
    `DELETE FROM working_memory
     WHERE ttl_seconds IS NOT NULL
       AND datetime(created_at, '+' || ttl_seconds || ' seconds') < datetime('now')`
  );

  return result.changes;
}

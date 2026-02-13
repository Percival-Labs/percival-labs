// Agent Memory — Episode Store
// Episodic memory: time-ordered experiences weighted by importance.

import type { Database } from "bun:sqlite";
import type { Episode } from "../types.ts";

export function storeEpisode(
  db: Database,
  agentId: string,
  content: string,
  importance: number,
  contextTags: string[],
  tainted: boolean = false,
): Episode {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const tagsJson = JSON.stringify(contextTags);

  db.run(
    `INSERT INTO episodes (id, agent_id, content, importance, context_tags, created_at, archived, tainted)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, agentId, content, importance, tagsJson, created_at, tainted ? 1 : 0]
  );

  return {
    id,
    agent_id: agentId,
    content,
    importance,
    context_tags: contextTags,
    created_at,
    archived: false,
    tainted,
  };
}

export interface RecallEpisodesOptions {
  limit?: number;
  minImportance?: number;
  tags?: string[];
  since?: string; // ISO date string
}

export function recallEpisodes(
  db: Database,
  agentId: string,
  options: RecallEpisodesOptions = {}
): Episode[] {
  const { limit = 20, minImportance = 0, tags, since } = options;

  const conditions: string[] = ["agent_id = ?", "archived = 0"];
  const params: (string | number)[] = [agentId];

  if (minImportance > 0) {
    conditions.push("importance >= ?");
    params.push(minImportance);
  }

  if (since) {
    conditions.push("created_at >= ?");
    params.push(since);
  }

  const whereClause = conditions.join(" AND ");

  // Score = importance * recency_factor (tainted content deprioritized)
  // Recency: episodes from the last hour get full weight, older ones decay
  const query = `
    SELECT
      id, agent_id, content, importance, context_tags, created_at, archived, tainted,
      (importance * (1.0 / (1.0 + (julianday('now') - julianday(created_at)) * 24.0)) * CASE WHEN tainted = 1 THEN 0.5 ELSE 1.0 END) AS score
    FROM episodes
    WHERE ${whereClause}
    ORDER BY score DESC
    LIMIT ?
  `;

  params.push(limit);

  const rows = db.query(query).all(...params) as Array<{
    id: string;
    agent_id: string;
    content: string;
    importance: number;
    context_tags: string;
    created_at: string;
    archived: number;
    tainted: number;
    score: number;
  }>;

  let episodes: Episode[] = rows.map((row) => ({
    id: row.id,
    agent_id: row.agent_id,
    content: row.content,
    importance: row.importance,
    context_tags: JSON.parse(row.context_tags) as string[],
    created_at: row.created_at,
    archived: row.archived === 1,
    tainted: row.tainted === 1,
  }));

  // Filter by tags in application code (JSON array matching)
  if (tags && tags.length > 0) {
    episodes = episodes.filter((ep) =>
      tags.some((tag) => ep.context_tags.includes(tag))
    );
  }

  return episodes;
}

export function archiveOldEpisodes(
  db: Database,
  agentId: string,
  olderThanHours: number,
  maxImportance: number
): number {
  const cutoff = new Date(
    Date.now() - olderThanHours * 60 * 60 * 1000
  ).toISOString();

  const result = db.run(
    `UPDATE episodes
     SET archived = 1
     WHERE agent_id = ? AND archived = 0 AND created_at < ? AND importance <= ?`,
    [agentId, cutoff, maxImportance]
  );

  return result.changes;
}

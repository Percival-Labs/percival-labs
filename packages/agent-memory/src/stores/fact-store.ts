// Agent Memory — Fact Store
// Learned facts with confidence scoring. Null agent_id means shared knowledge.

import type { Database } from "bun:sqlite";
import type { Fact } from "../types.ts";

export function learnFact(
  db: Database,
  content: string,
  confidence: number,
  source: string,
  contextTags: string[],
  agentId?: string | null
): Fact {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const tagsJson = JSON.stringify(contextTags);
  const resolvedAgentId = agentId ?? null;

  db.run(
    `INSERT INTO facts (id, agent_id, content, confidence, source, context_tags, created_at, archived)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [id, resolvedAgentId, content, confidence, source, tagsJson, created_at]
  );

  return {
    id,
    agent_id: resolvedAgentId,
    content,
    confidence,
    source,
    context_tags: contextTags,
    created_at,
    archived: false,
  };
}

export interface RecallFactsOptions {
  agentId?: string | null;
  tags?: string[];
  minConfidence?: number;
  limit?: number;
}

export function recallFacts(
  db: Database,
  options: RecallFactsOptions = {}
): Fact[] {
  const { agentId, tags, minConfidence = 0, limit = 50 } = options;

  const conditions: string[] = ["archived = 0"];
  const params: (string | number | null)[] = [];

  if (agentId !== undefined) {
    if (agentId === null) {
      conditions.push("agent_id IS NULL");
    } else {
      // Include both agent-specific and shared facts
      conditions.push("(agent_id = ? OR agent_id IS NULL)");
      params.push(agentId);
    }
  }

  if (minConfidence > 0) {
    conditions.push("confidence >= ?");
    params.push(minConfidence);
  }

  const whereClause = conditions.join(" AND ");

  const query = `
    SELECT id, agent_id, content, confidence, source, context_tags, created_at, archived
    FROM facts
    WHERE ${whereClause}
    ORDER BY confidence DESC, created_at DESC
    LIMIT ?
  `;

  params.push(limit);

  const rows = db.query(query).all(...params) as Array<{
    id: string;
    agent_id: string | null;
    content: string;
    confidence: number;
    source: string;
    context_tags: string;
    created_at: string;
    archived: number;
  }>;

  let facts: Fact[] = rows.map((row) => ({
    id: row.id,
    agent_id: row.agent_id,
    content: row.content,
    confidence: row.confidence,
    source: row.source,
    context_tags: JSON.parse(row.context_tags) as string[],
    created_at: row.created_at,
    archived: row.archived === 1,
  }));

  // Filter by tags in application code
  if (tags && tags.length > 0) {
    facts = facts.filter((fact) =>
      tags.some((tag) => fact.context_tags.includes(tag))
    );
  }

  return facts;
}

export function archiveLowConfidenceFacts(
  db: Database,
  belowConfidence: number
): number {
  const result = db.run(
    `UPDATE facts SET archived = 1 WHERE archived = 0 AND confidence < ?`,
    [belowConfidence]
  );

  return result.changes;
}

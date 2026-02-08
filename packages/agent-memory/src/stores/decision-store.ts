// Agent Memory — Decision Store
// Logs architectural and strategic decisions with alternatives and consequences.

import type { Database } from "bun:sqlite";
import type { Decision } from "../types.ts";

export function logDecision(
  db: Database,
  agentId: string,
  title: string,
  context: string,
  decision: string,
  alternatives: string[],
  consequences: string[]
): Decision {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const alternativesJson = JSON.stringify(alternatives);
  const consequencesJson = JSON.stringify(consequences);

  db.run(
    `INSERT INTO decisions (id, agent_id, title, context, decision, alternatives, consequences, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      agentId,
      title,
      context,
      decision,
      alternativesJson,
      consequencesJson,
      created_at,
    ]
  );

  return {
    id,
    agent_id: agentId,
    title,
    context,
    decision,
    alternatives,
    consequences,
    created_at,
  };
}

export interface GetDecisionsOptions {
  agentId?: string;
  limit?: number;
}

export function getDecisions(
  db: Database,
  options: GetDecisionsOptions = {}
): Decision[] {
  const { agentId, limit = 20 } = options;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (agentId) {
    conditions.push("agent_id = ?");
    params.push(agentId);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT id, agent_id, title, context, decision, alternatives, consequences, created_at
    FROM decisions
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ?
  `;

  params.push(limit);

  const rows = db.query(query).all(...params) as Array<{
    id: string;
    agent_id: string;
    title: string;
    context: string;
    decision: string;
    alternatives: string;
    consequences: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    agent_id: row.agent_id,
    title: row.title,
    context: row.context,
    decision: row.decision,
    alternatives: JSON.parse(row.alternatives) as string[],
    consequences: JSON.parse(row.consequences) as string[],
    created_at: row.created_at,
  }));
}

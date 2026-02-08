// Agent Memory — Compactor
// Memory decay and archival. Keeps working memory fresh and long-term memory lean.

import type { Database } from "bun:sqlite";
import type { CompactionLog } from "./types.ts";
import { archiveOldEpisodes } from "./stores/episode-store.ts";
import { archiveLowConfidenceFacts } from "./stores/fact-store.ts";
import { expireWorking } from "./stores/working-store.ts";

export interface CompactionOptions {
  decayHours?: number;
  minImportance?: number;
  minConfidence?: number;
}

export function runCompaction(
  db: Database,
  options: CompactionOptions = {}
): CompactionLog[] {
  const {
    decayHours = 6,
    minImportance = 0.3,
    minConfidence = 0.2,
  } = options;

  const logs: CompactionLog[] = [];

  // Get all agents to compact per-agent
  const agents = db
    .query(`SELECT id FROM agents`)
    .all() as Array<{ id: string }>;

  for (const agent of agents) {
    const episodesArchived = archiveOldEpisodes(
      db,
      agent.id,
      decayHours,
      minImportance
    );

    const factsArchived = archiveLowConfidenceFacts(db, minConfidence);

    // Only log if something was compacted
    if (episodesArchived > 0 || factsArchived > 0) {
      const id = crypto.randomUUID();
      const compacted_at = new Date().toISOString();
      const summary = `Archived ${episodesArchived} episodes (>${decayHours}h, importance<=${minImportance}) and ${factsArchived} facts (confidence<${minConfidence})`;

      db.run(
        `INSERT INTO compaction_log (id, agent_id, episodes_archived, facts_archived, summary, compacted_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, agent.id, episodesArchived, factsArchived, summary, compacted_at]
      );

      logs.push({
        id,
        agent_id: agent.id,
        episodes_archived: episodesArchived,
        facts_archived: factsArchived,
        summary,
        compacted_at,
      });
    }
  }

  // Expire working memory (not agent-specific)
  const expired = expireWorking(db);
  if (expired > 0 && logs.length === 0) {
    // If only working memory was expired but no agent-specific compaction happened,
    // log under a system entry
    const id = crypto.randomUUID();
    const compacted_at = new Date().toISOString();

    // We need at least one agent for the FK. If no agents exist, skip the log.
    if (agents.length > 0) {
      const summary = `Expired ${expired} working memory entries past TTL`;
      db.run(
        `INSERT INTO compaction_log (id, agent_id, episodes_archived, facts_archived, summary, compacted_at)
         VALUES (?, ?, 0, 0, ?, ?)`,
        [id, agents[0]!.id, summary, compacted_at]
      );

      logs.push({
        id,
        agent_id: agents[0]!.id,
        episodes_archived: 0,
        facts_archived: 0,
        summary,
        compacted_at,
      });
    }
  }

  return logs;
}

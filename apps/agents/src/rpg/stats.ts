// RPG Character System — Stat Computation
//
// Computes RPG stats from agent memory database state.
// Stats are derived from real performance metrics, not arbitrary numbers.

import type { Database } from "bun:sqlite";
import {
  type RPGProfile,
  type RPGStats,
  CLASS_MAP,
  CLASS_PRIMARY_STATS,
} from "./types";
import { getAffinityForAgent } from "./affinity";

interface AgentRow {
  id: string;
  name: string;
}

interface TaskCounts {
  total: number;
  completed: number;
  avgDurationHours: number;
}

interface MemoryCounts {
  episodeCount: number;
  factCount: number;
  avgConfidence: number;
  avgImportance: number;
}

/** Compute RPG stats for a single agent from DB state */
export function computeAgentStats(
  db: Database,
  agentId: string,
): RPGStats {
  const tasks = getTaskCounts(db, agentId);
  const memory = getMemoryCounts(db, agentId);
  const avgAffinity = getAffinityForAgent(db, agentId);

  // PRE: Precision — task success rate × 99
  const successRate = tasks.total > 0 ? tasks.completed / tasks.total : 0.5;
  const PRE = Math.round(clamp(successRate * 99, 1, 99));

  // SPD: Speed — 99 - (avgCompletionHours / 24) × 99
  const speedFactor = tasks.avgDurationHours > 0
    ? (tasks.avgDurationHours / 24) * 99
    : 30; // Default moderate speed when no data
  const SPD = Math.round(clamp(99 - speedFactor, 1, 99));

  // WIS: Wisdom — log10(memoryCount) / log10(500) × avgConfidence × 99
  const memoryCount = memory.episodeCount + memory.factCount;
  const wisdomLog = memoryCount > 0 ? Math.log10(memoryCount) / Math.log10(500) : 0.1;
  const WIS = Math.round(clamp(wisdomLog * memory.avgConfidence * 99, 1, 99));

  // TRU: Trust — missionSuccessRate × avgAffinity × 2 × 99
  const TRU = Math.round(clamp(successRate * avgAffinity * 2 * 99, 1, 99));

  // CRF: Craft — derived from episode importance as proxy for output quality
  const CRF = Math.round(clamp(memory.avgImportance * 99, 1, 99));

  // INS: Insight — log10(episodeCount) / log10(200) × avgImportance × 99
  const insightLog = memory.episodeCount > 0
    ? Math.log10(memory.episodeCount) / Math.log10(200)
    : 0.1;
  const INS = Math.round(clamp(insightLog * memory.avgImportance * 99, 1, 99));

  return { PRE, SPD, WIS, TRU, CRF, INS };
}

/** Compute level from memory + task counts */
export function computeLevel(db: Database, agentId: string): number {
  const memory = getMemoryCounts(db, agentId);
  const tasks = getTaskCounts(db, agentId);

  const composite = memory.episodeCount + tasks.completed * 3 + 1;
  return Math.min(15, Math.floor(Math.log2(composite)) + 1);
}

/** Get RPG profiles for all agents */
export function getAllRPGProfiles(db: Database): RPGProfile[] {
  const agents = db
    .query<AgentRow, []>("SELECT id, name FROM agents")
    .all();

  return agents.map((agent) => {
    const rpgClass = CLASS_MAP[agent.id] || "Wanderer";
    const stats = computeAgentStats(db, agent.id);
    const level = computeLevel(db, agent.id);
    const primaryStats = CLASS_PRIMARY_STATS[rpgClass] || ["PRE", "SPD", "WIS", "TRU"];

    return {
      agentId: agent.id,
      agentName: agent.name,
      rpgClass,
      level,
      stats,
      primaryStats,
    };
  });
}

// --- Helpers ---

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getTaskCounts(db: Database, agentId: string): TaskCounts {
  const row = db
    .query<{ total: number; completed: number }, [string]>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks WHERE assigned_to = ?`
    )
    .get(agentId);

  // Get average duration from episodes (agent execution episodes)
  const durationRow = db
    .query<{ avgHours: number | null }, [string]>(
      `SELECT AVG(
        (julianday('now') - julianday(created_at)) * 24
      ) as avgHours
      FROM episodes
      WHERE agent_id = ? AND archived = 0`
    )
    .get(agentId);

  return {
    total: row?.total || 0,
    completed: row?.completed || 0,
    avgDurationHours: durationRow?.avgHours || 0,
  };
}

function getMemoryCounts(db: Database, agentId: string): MemoryCounts {
  const episodes = db
    .query<{ cnt: number; avgImp: number | null }, [string]>(
      `SELECT COUNT(*) as cnt, AVG(importance) as avgImp
      FROM episodes WHERE agent_id = ? AND archived = 0`
    )
    .get(agentId);

  const facts = db
    .query<{ cnt: number; avgConf: number | null }, [string]>(
      `SELECT COUNT(*) as cnt, AVG(confidence) as avgConf
      FROM facts WHERE (agent_id = ? OR agent_id IS NULL) AND archived = 0`
    )
    .get(agentId);

  return {
    episodeCount: episodes?.cnt || 0,
    factCount: facts?.cnt || 0,
    avgConfidence: facts?.avgConf || 0.5,
    avgImportance: episodes?.avgImp || 0.5,
  };
}

// RPG Character System — Shared Types

export interface RPGStats {
  /** Precision: task success rate */
  PRE: number;
  /** Speed: how fast tasks complete */
  SPD: number;
  /** Wisdom: accumulated knowledge depth */
  WIS: number;
  /** Trust: peer trust + reliability */
  TRU: number;
  /** Craft: quality of work output */
  CRF: number;
  /** Insight: depth of understanding */
  INS: number;
}

export type StatKey = keyof RPGStats;

export const STAT_NAMES: Record<StatKey, string> = {
  PRE: "Precision",
  SPD: "Speed",
  WIS: "Wisdom",
  TRU: "Trust",
  CRF: "Craft",
  INS: "Insight",
};

export interface RPGProfile {
  agentId: string;
  agentName: string;
  rpgClass: string;
  level: number;
  stats: RPGStats;
  /** The 4 most relevant stats for this agent's class */
  primaryStats: StatKey[];
}

export const CLASS_MAP: Record<string, string> = {
  coordinator: "Commander",
  researcher: "Ranger",
  builder: "Artificer",
  artist: "Artisan",
  reviewer: "Oracle",
  auditor: "Sentinel",
};

/** Which 4 stats are primary for each class */
export const CLASS_PRIMARY_STATS: Record<string, StatKey[]> = {
  Commander: ["TRU", "WIS", "PRE", "INS"],
  Ranger: ["WIS", "INS", "SPD", "PRE"],
  Artificer: ["CRF", "SPD", "PRE", "WIS"],
  Artisan: ["CRF", "INS", "WIS", "SPD"],
  Oracle: ["PRE", "WIS", "INS", "TRU"],
  Sentinel: ["PRE", "TRU", "SPD", "CRF"],
};

export interface AffinityPair {
  agentA: string;
  agentB: string;
  affinity: number;
  driftHistory: number[];
}

// Agent Memory System — Type Definitions
// All interfaces for the Percival Labs agent memory subsystem.

export interface Agent {
  id: string;
  name: string;
  role: string;
  expertise: string[];
  personality: string;
  model_preference: string;
  status: "active" | "idle" | "offline";
}

export interface Episode {
  id: string;
  agent_id: string;
  content: string;
  importance: number; // 0-1 float
  context_tags: string[];
  created_at: string; // ISO string
  archived: boolean;
}

export interface Fact {
  id: string;
  agent_id: string | null; // null = shared fact
  content: string;
  confidence: number; // 0-1 float
  source: string;
  context_tags: string[];
  created_at: string; // ISO string
  archived: boolean;
}

export interface WorkingMemoryEntry {
  id: string;
  agent_id: string;
  key: string;
  value: string;
  ttl_seconds: number | null;
  created_at: string; // ISO string
}

export interface ProjectState {
  id: string;
  name: string;
  description: string;
  current_phase: string;
  blockers: string[];
  updated_at: string; // ISO string
}

export interface Decision {
  id: string;
  agent_id: string;
  title: string;
  context: string;
  decision: string;
  alternatives: string[];
  consequences: string[];
  created_at: string; // ISO string
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "blocked";
  assigned_to: string | null; // agent_id
  depends_on: string[]; // task ids
  output: string | null;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface CompactionLog {
  id: string;
  agent_id: string;
  episodes_archived: number;
  facts_archived: number;
  summary: string;
  compacted_at: string; // ISO string
}

export interface ContextPackage {
  working_memory: Record<string, string>;
  recent_episodes: Episode[];
  relevant_facts: Fact[];
  project_state: ProjectState | null;
  token_estimate: number;
}

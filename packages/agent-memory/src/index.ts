// Agent Memory — Package Entry Point
// Exports all types, stores, schema, context assembler, and compactor.

// Types
export type {
  Agent,
  Episode,
  Fact,
  WorkingMemoryEntry,
  ProjectState,
  Decision,
  AgentTask,
  CompactionLog,
  ContextPackage,
} from "./types.ts";

// Schema
export { initMemoryDatabase } from "./schema.ts";

// Episode Store
export {
  storeEpisode,
  recallEpisodes,
  archiveOldEpisodes,
} from "./stores/episode-store.ts";
export type { RecallEpisodesOptions } from "./stores/episode-store.ts";

// Fact Store
export {
  learnFact,
  recallFacts,
  archiveLowConfidenceFacts,
} from "./stores/fact-store.ts";
export type { RecallFactsOptions } from "./stores/fact-store.ts";

// Working Memory Store
export {
  setWorking,
  getWorking,
  clearWorking,
  expireWorking,
} from "./stores/working-store.ts";

// Project State Store
export {
  getProjectState,
  updateProjectState,
} from "./stores/project-store.ts";

// Decision Store
export { logDecision, getDecisions } from "./stores/decision-store.ts";
export type { GetDecisionsOptions } from "./stores/decision-store.ts";

// Task Store
export {
  createTask,
  updateTask,
  getTasks,
  getReadyTasks,
} from "./stores/task-store.ts";
export type { GetTasksOptions } from "./stores/task-store.ts";

// Context Assembler
export { assembleContext } from "./context-assembler.ts";
export type { AssembleContextOptions } from "./context-assembler.ts";

// Compactor
export { runCompaction } from "./compactor.ts";
export type { CompactionOptions } from "./compactor.ts";

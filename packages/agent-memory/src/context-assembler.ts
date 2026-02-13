// Agent Memory — Context Assembler
// Token-budgeted context builder that packs the most relevant memory into a window.

import type { Database } from "bun:sqlite";
import type { ContextPackage, Episode, Fact, ProjectState } from "./types.ts";
import { recallEpisodes } from "./stores/episode-store.ts";
import { recallFacts } from "./stores/fact-store.ts";
import { getWorking } from "./stores/working-store.ts";
import { getProjectState } from "./stores/project-store.ts";
import { getTasks } from "./stores/task-store.ts";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function trimToTokenBudget(items: string[], budget: number): string[] {
  const result: string[] = [];
  let used = 0;

  for (const item of items) {
    const cost = estimateTokens(item);
    if (used + cost > budget) break;
    result.push(item);
    used += cost;
  }

  return result;
}

export interface AssembleContextOptions {
  budgetTokens?: number;
}

export function assembleContext(
  db: Database,
  agentId: string,
  options: AssembleContextOptions = {}
): ContextPackage {
  const budget = options.budgetTokens ?? 4000;

  // Budget allocation
  const workingBudget = Math.floor(budget * 0.2); // 20%
  const episodeBudget = Math.floor(budget * 0.3); // 30%
  const factBudget = Math.floor(budget * 0.35); // 35%
  const sharedBudget = Math.floor(budget * 0.15); // 15%

  // 1. Working memory (20%)
  const workingEntries = getWorking(db, agentId);
  const workingMemory: Record<string, string> = {};
  let workingUsed = 0;

  for (const entry of workingEntries) {
    const cost = estimateTokens(`${entry.key}: ${entry.value}`);
    if (workingUsed + cost > workingBudget) break;
    workingMemory[entry.key] = entry.value;
    workingUsed += cost;
  }

  // 2. Recent episodes (30%) — already sorted by importance * recency (tainted deprioritized)
  const allEpisodes = recallEpisodes(db, agentId, { limit: 50 });
  const episodeStrings = allEpisodes.map(
    (ep) => {
      const prefix = ep.tainted ? '[EXTERNAL/UNTRUSTED] ' : '';
      return `${prefix}[${ep.created_at}] (${ep.importance.toFixed(2)}) ${ep.content}`;
    }
  );
  const trimmedEpisodeStrings = trimToTokenBudget(episodeStrings, episodeBudget);
  const recentEpisodes: Episode[] = allEpisodes.slice(
    0,
    trimmedEpisodeStrings.length
  );

  // 3. Relevant facts (35%) — confidence-scored, includes shared facts (tainted deprioritized)
  const allFacts = recallFacts(db, { agentId, limit: 100 });
  // Sort tainted facts to the end
  allFacts.sort((a, b) => (a.tainted === b.tainted ? 0 : a.tainted ? 1 : -1));
  const factStrings = allFacts.map(
    (f) => {
      const prefix = f.tainted ? '[EXTERNAL/UNTRUSTED] ' : '';
      return `${prefix}[${f.confidence.toFixed(2)}] ${f.content} (src: ${f.source})`;
    }
  );
  const trimmedFactStrings = trimToTokenBudget(factStrings, factBudget);
  const relevantFacts: Fact[] = allFacts.slice(0, trimmedFactStrings.length);

  // 4. Shared state (15%) — project status + active tasks
  let projectState: ProjectState | null = null;
  let sharedUsed = 0;

  const latestProject = getProjectState(db);
  if (latestProject) {
    const projectCost = estimateTokens(
      JSON.stringify(latestProject)
    );
    if (projectCost <= sharedBudget) {
      projectState = latestProject;
      sharedUsed += projectCost;
    }
  }

  // Also try to include active tasks in the shared budget
  const activeTasks = getTasks(db, { status: "in_progress", limit: 10 });
  const taskSummaries = activeTasks.map(
    (t) => `Task: ${t.title} [${t.priority}] -> ${t.assigned_to ?? "unassigned"}`
  );
  const trimmedTaskSummaries = trimToTokenBudget(
    taskSummaries,
    sharedBudget - sharedUsed
  );

  // Calculate total token estimate
  const totalTokens =
    workingUsed +
    trimmedEpisodeStrings.reduce((sum, s) => sum + estimateTokens(s), 0) +
    trimmedFactStrings.reduce((sum, s) => sum + estimateTokens(s), 0) +
    sharedUsed +
    trimmedTaskSummaries.reduce((sum, s) => sum + estimateTokens(s), 0);

  return {
    working_memory: workingMemory,
    recent_episodes: recentEpisodes,
    relevant_facts: relevantFacts,
    project_state: projectState,
    token_estimate: totalTokens,
  };
}

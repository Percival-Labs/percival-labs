// Task Scheduler — Matches tasks to agents based on keyword overlap
// Simple but effective: tokenize task description, score each agent by expertise match.

import type { AgentIdentity } from '../identity/loader';
import type { TaskNode } from './dag';

/**
 * Tokenize a string into lowercase words, stripping punctuation.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Score an agent against a task based on keyword overlap between
 * the task's title + description and the agent's expertise list.
 *
 * Returns a number >= 0. Higher = better match.
 */
function scoreAgent(task: TaskNode, agent: AgentIdentity): number {
  const taskTokens = new Set(tokenize(`${task.title} ${task.description}`));
  let score = 0;

  for (const expertiseItem of agent.expertise) {
    const expertiseTokens = tokenize(expertiseItem);
    for (const token of expertiseTokens) {
      if (taskTokens.has(token)) {
        score += 1;
      }
    }
  }

  // Bonus: check if agent role keywords appear in the task
  const roleTokens = tokenize(agent.role);
  for (const token of roleTokens) {
    if (taskTokens.has(token)) {
      score += 0.5;
    }
  }

  return score;
}

/**
 * Match a task to the best-fitting agent based on expertise keyword overlap.
 * Returns the best matching agent, or null if no agent scores above zero.
 */
export function matchTaskToAgent(task: TaskNode, agents: AgentIdentity[]): AgentIdentity | null {
  if (agents.length === 0) return null;

  let bestAgent: AgentIdentity | null = null;
  let bestScore = 0;

  for (const agent of agents) {
    const score = scoreAgent(task, agent);
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }

  return bestAgent;
}

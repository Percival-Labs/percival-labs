// Individual Agent Executor
// Routes tasks to the correct model via OpenRouter (multi-provider) or Anthropic SDK (fallback).

import { complete, resolveModel } from './providers';
import type { AgentIdentity } from './identity/loader';
import type { TaskNode } from './tasks/dag';

export interface AgentExecutionResult {
  agentName: string;
  taskId: string;
  output: string;
  success: boolean;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Build a system prompt from an agent's identity and optional memory context.
 */
function buildSystemPrompt(identity: AgentIdentity, memoryContext: string): string {
  const parts: string[] = [
    `You are ${identity.name}, a ${identity.role} at Percival Labs.`,
    '',
    `## Expertise`,
    identity.expertise.join(', '),
    '',
    `## Personality`,
    identity.personality,
    '',
    `## Communication Style`,
    identity.communication,
    '',
    `## Instructions`,
    `- Provide your analysis or implementation directly.`,
    `- Be thorough but concise.`,
    `- If you identify issues, include severity and remediation.`,
    `- Structure your response clearly with sections.`,
  ];

  // Inject workspace context if available
  const workspacePath = process.env.WORKSPACE_PATH;
  if (workspacePath) {
    parts.push(
      '',
      `## Workspace Access`,
      `You have read-only access to the Percival Labs monorepo at ${workspacePath}.`,
      `When a task references files, code, or content — read them directly from the workspace.`,
      `Key locations:`,
      `- ${workspacePath}/apps/ — Application source code (agents, discord, terrarium, website, roundtable, etc.)`,
      `- ${workspacePath}/packages/ — Shared packages (roundtable-db, shared, agent-memory, db)`,
      `- ${workspacePath}/scripts/x/ — X/Twitter content queue and posting scripts`,
      `- ${workspacePath}/research/ — Planning docs, architecture specs, brand identity`,
      `- ${workspacePath}/docker/ — Docker configuration`,
      `Reference file contents in your responses when relevant to the task.`,
    );
  }

  if (memoryContext.trim()) {
    parts.push('', '## Context from Memory', memoryContext);
  }

  return parts.join('\n');
}

/**
 * Build the user message from a task node.
 */
function buildUserMessage(task: TaskNode): string {
  const parts: string[] = [
    `## Task: ${task.title}`,
    '',
    task.description,
    '',
    `Priority: ${task.priority}`,
  ];

  if (task.dependsOn.length > 0) {
    parts.push(`Dependencies: ${task.dependsOn.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Execute a single task using the multi-provider system.
 * Routes to the correct model based on the agent's modelPreference.
 */
export async function executeAgentTask(
  _client: unknown, // kept for backward compatibility, actual routing done by providers.ts
  identity: AgentIdentity,
  task: TaskNode,
  memoryContext: string,
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const resolved = resolveModel(identity.modelPreference);

  try {
    const result = await complete({
      model: identity.modelPreference,
      system: buildSystemPrompt(identity, memoryContext),
      userMessage: buildUserMessage(task),
      maxTokens: 4096,
    });

    const duration = Date.now() - startTime;

    return {
      agentName: identity.name,
      taskId: task.id,
      output: result.output,
      success: true,
      duration,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      model: result.model,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(`[agent] ${identity.name} (${resolved.provider}/${resolved.modelId}) failed on task ${task.id}:`, errorMessage);

    return {
      agentName: identity.name,
      taskId: task.id,
      output: `Error: ${errorMessage}`,
      success: false,
      duration,
      inputTokens: 0,
      outputTokens: 0,
      model: resolved.modelId,
    };
  }
}

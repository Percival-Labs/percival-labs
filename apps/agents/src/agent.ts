// Individual Agent Executor
// Wraps the Anthropic SDK to execute a single task with a specific agent identity.

import Anthropic from '@anthropic-ai/sdk';
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
 * Map agent model preference to an Anthropic model ID.
 */
function resolveModel(preference: string): string {
  switch (preference) {
    case 'opus':
      return 'claude-opus-4-6';
    case 'sonnet':
      return 'claude-sonnet-4-5-20250929';
    case 'haiku':
      return 'claude-haiku-3-5-20241022';
    default:
      return 'claude-sonnet-4-5-20250929';
  }
}

/**
 * Build a system prompt from an agent's identity and optional memory context.
 */
function buildSystemPrompt(identity: AgentIdentity, memoryContext: string): string {
  const parts: string[] = [
    `You are ${identity.name}, a ${identity.role}.`,
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
 * Execute a single task using the Anthropic API with the given agent identity.
 *
 * Returns a structured result with the agent's output, success status, and timing.
 */
export async function executeAgentTask(
  client: Anthropic,
  identity: AgentIdentity,
  task: TaskNode,
  memoryContext: string,
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const model = resolveModel(identity.modelPreference);

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: buildSystemPrompt(identity, memoryContext),
      messages: [
        {
          role: 'user',
          content: buildUserMessage(task),
        },
      ],
    });

    // Extract text from response content blocks
    const output = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n\n');

    const duration = Date.now() - startTime;

    return {
      agentName: identity.name,
      taskId: task.id,
      output,
      success: true,
      duration,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      model,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(`[agent] ${identity.name} failed on task ${task.id}:`, errorMessage);

    return {
      agentName: identity.name,
      taskId: task.id,
      output: `Error: ${errorMessage}`,
      success: false,
      duration,
      inputTokens: 0,
      outputTokens: 0,
      model,
    };
  }
}

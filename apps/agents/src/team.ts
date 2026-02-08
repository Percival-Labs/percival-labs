// Agent Team Coordinator
// Manages the full lifecycle: decompose tasks via coordinator, assign to workers, execute, collect results.

import Anthropic from '@anthropic-ai/sdk';
import { loadIdentities, type AgentIdentity } from './identity/loader';
import { TaskDAG, type TaskNode } from './tasks/dag';
import { matchTaskToAgent } from './tasks/scheduler';
import { executeAgentTask, type AgentExecutionResult } from './agent';

/**
 * Parse the coordinator's decomposition response into subtask definitions.
 * The coordinator outputs a structured list of subtasks in a known format.
 */
function parseDecomposition(
  response: string,
  parentId: string,
): Array<Omit<TaskNode, 'id' | 'createdAt'>> {
  const subtasks: Array<Omit<TaskNode, 'id' | 'createdAt'>> = [];

  // Try to parse JSON array from the response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        title?: string;
        description?: string;
        priority?: string;
        dependsOn?: string[];
      }>;

      for (const item of parsed) {
        if (item.title && item.description) {
          const priority = (['critical', 'high', 'medium', 'low'].includes(item.priority || '')
            ? item.priority
            : 'medium') as TaskNode['priority'];

          subtasks.push({
            title: item.title,
            description: item.description,
            priority,
            status: 'pending',
            assignedTo: null,
            dependsOn: [],
            output: null,
          });
        }
      }

      if (subtasks.length > 0) return subtasks;
    } catch {
      // JSON parsing failed, fall through to line-based parsing
    }
  }

  // Fallback: parse numbered list items like "1. **Title**: Description"
  const lines = response.split('\n');
  for (const line of lines) {
    const match = line.match(/^\d+\.\s+\*?\*?(.+?)\*?\*?\s*[:\-]\s*(.+)$/);
    if (match) {
      subtasks.push({
        title: match[1]!.trim(),
        description: match[2]!.trim(),
        priority: 'medium',
        status: 'pending',
        assignedTo: null,
        dependsOn: [],
        output: null,
      });
    }
  }

  // If nothing was parsed, create a single task from the whole description
  if (subtasks.length === 0) {
    subtasks.push({
      title: `Execute: ${parentId}`,
      description: response.slice(0, 500),
      priority: 'medium',
      status: 'pending',
      assignedTo: null,
      dependsOn: [],
      output: null,
    });
  }

  return subtasks;
}

export class AgentTeam {
  private identities: AgentIdentity[];
  private dag: TaskDAG;
  private client: Anthropic | null;
  private coordinator: AgentIdentity | null;

  constructor(identitiesDir: string) {
    this.identities = loadIdentities(identitiesDir);
    this.dag = new TaskDAG();

    // Find the coordinator identity
    this.coordinator = this.identities.find(
      a => a.name.toLowerCase() === 'coordinator',
    ) || null;

    // Initialize Anthropic client (graceful if no key)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    } else {
      console.warn('[team] ANTHROPIC_API_KEY not set. Agent execution will be skipped.');
      this.client = null;
    }
  }

  /**
   * Submit a high-level task to the team.
   * The coordinator decomposes it into subtasks and adds them to the DAG.
   * Returns the parent task ID.
   */
  async submitTask(input: {
    title: string;
    description: string;
    priority?: string;
  }): Promise<string> {
    const priority = (['critical', 'high', 'medium', 'low'].includes(input.priority || '')
      ? input.priority
      : 'medium') as TaskNode['priority'];

    // Create the parent task
    const parentId = this.dag.addTask({
      title: input.title,
      description: input.description,
      priority,
      status: 'in_progress',
      assignedTo: this.coordinator?.name || null,
      dependsOn: [],
      output: null,
    });

    // If we have a coordinator and API client, decompose into subtasks
    if (this.coordinator && this.client) {
      try {
        const decompositionResult = await executeAgentTask(
          this.client,
          this.coordinator,
          this.dag.getTask(parentId)!,
          [
            'You are decomposing a task for a team of specialized agents.',
            'Available agents and their expertise:',
            ...this.identities.map(a => `- ${a.name} (${a.role}): ${a.expertise.join(', ')}`),
            '',
            'Respond with a JSON array of subtasks. Each subtask should have:',
            '- "title": short task title',
            '- "description": detailed description of what to do',
            '- "priority": "critical" | "high" | "medium" | "low"',
            '',
            'Example: [{"title": "Review security", "description": "Analyze for vulnerabilities", "priority": "high"}]',
            '',
            'Decompose the task into 2-5 actionable subtasks.',
          ].join('\n'),
        );

        const subtaskDefs = parseDecomposition(decompositionResult.output, parentId);

        const subtaskIds: string[] = [];
        for (const def of subtaskDefs) {
          const subId = this.dag.addTask(def);
          subtaskIds.push(subId);
        }

        // Update parent with decomposition output
        this.dag.updateTask(parentId, {
          output: `Decomposed into ${subtaskIds.length} subtasks: ${subtaskIds.join(', ')}`,
          status: 'completed',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[team] Coordinator decomposition failed:', msg);

        // Mark parent as the single executable task
        this.dag.updateTask(parentId, {
          status: 'pending',
          output: null,
        });
      }
    } else {
      // No coordinator or no API — leave as a single pending task
      this.dag.updateTask(parentId, { status: 'pending' });
    }

    return parentId;
  }

  /**
   * Run one execution cycle:
   * 1. Find all ready tasks (pending + deps completed)
   * 2. Match each to the best agent
   * 3. Execute in parallel
   * 4. Store results
   *
   * Returns the results from this tick.
   */
  async tick(): Promise<AgentExecutionResult[]> {
    if (!this.client) {
      console.warn('[team] No API client available. Skipping tick.');
      return [];
    }

    const readyTasks = this.dag.getReadyTasks();
    if (readyTasks.length === 0) {
      return [];
    }

    const results: AgentExecutionResult[] = [];

    // Execute ready tasks in parallel
    const executions = readyTasks.map(async (task) => {
      // Match task to best agent
      const agent = matchTaskToAgent(task, this.identities);
      if (!agent) {
        // No matching agent — use first available identity as fallback
        const fallback = this.identities[0];
        if (!fallback) {
          console.warn(`[team] No agents available for task "${task.id}"`);
          return;
        }
        return this.executeAndStore(task, fallback);
      }
      return this.executeAndStore(task, agent);
    });

    const executionResults = await Promise.allSettled(executions);

    for (const result of executionResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      } else if (result.status === 'rejected') {
        console.error('[team] Task execution rejected:', result.reason);
      }
    }

    return results;
  }

  /**
   * Execute a single task with an agent and update the DAG.
   */
  private async executeAndStore(
    task: TaskNode,
    agent: AgentIdentity,
  ): Promise<AgentExecutionResult> {
    // Mark as in progress
    this.dag.updateTask(task.id, {
      status: 'in_progress',
      assignedTo: agent.name,
    });

    const result = await executeAgentTask(
      this.client!,
      agent,
      task,
      '', // Memory context — can be enriched later
    );

    // Update DAG with result
    this.dag.updateTask(task.id, {
      status: result.success ? 'completed' : 'blocked',
      output: result.output,
    });

    return result;
  }

  /**
   * Get the status of a specific task.
   */
  getTaskStatus(taskId: string): TaskNode | undefined {
    return this.dag.getTask(taskId);
  }

  /**
   * Get the full team status: all agents and all tasks.
   */
  getTeamStatus(): { agents: AgentIdentity[]; tasks: TaskNode[] } {
    return {
      agents: [...this.identities],
      tasks: this.dag.getAllTasks(),
    };
  }

  /**
   * Get the underlying DAG (for serialization / inspection).
   */
  getDAG(): TaskDAG {
    return this.dag;
  }
}

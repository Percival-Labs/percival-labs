// Agent Team Coordinator
// Manages the full lifecycle: decompose tasks via coordinator, assign to workers, execute, collect results.
// Integrates with @percival/agent-memory for persistent context and episodic storage.

import Anthropic from '@anthropic-ai/sdk';
import type { Database } from 'bun:sqlite';
import { loadIdentities, type AgentIdentity } from './identity/loader';
import { TaskDAG, type TaskNode, MAX_SUBTASKS_PER_DECOMPOSITION } from './tasks/dag';
import { matchTaskToAgent } from './tasks/scheduler';
import { executeAgentTask, type AgentExecutionResult } from './agent';
import { initMemoryDatabase } from '@percival/agent-memory';
import { assembleContext } from '@percival/agent-memory';
import { storeEpisode } from '@percival/agent-memory';
import type { ContextPackage } from '@percival/agent-memory';
import { join as joinPath } from 'node:path';
import { eventBus } from './events';
import { initAffinityTable, getAllAffinities } from './rpg/affinity';
import { getAllRPGProfiles } from './rpg/stats';
import type { RPGProfile, AffinityPair } from './rpg/types';
import { BudgetTracker } from './policy/budget';
import { routeTask } from './router';

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
            depth: 0,       // Will be overridden by caller
            parentId: null,  // Will be overridden by caller
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
        depth: 0,
        parentId: null,
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
      depth: 0,
      parentId: null,
    });
  }

  return subtasks;
}

/**
 * Format a ContextPackage into a readable markdown string for system prompt injection.
 */
function formatContextPackage(ctx: ContextPackage): string {
  const parts: string[] = [];

  // Working memory
  const wmKeys = Object.keys(ctx.working_memory);
  if (wmKeys.length > 0) {
    parts.push('### Working Memory');
    for (const key of wmKeys) {
      parts.push(`- **${key}**: ${ctx.working_memory[key]}`);
    }
    parts.push('');
  }

  // Recent episodes
  if (ctx.recent_episodes.length > 0) {
    parts.push('### Recent Experience');
    for (const ep of ctx.recent_episodes) {
      parts.push(`- [${ep.importance.toFixed(1)}] ${ep.content}`);
    }
    parts.push('');
  }

  // Relevant facts
  if (ctx.relevant_facts.length > 0) {
    parts.push('### Known Facts');
    for (const f of ctx.relevant_facts) {
      parts.push(`- [${f.confidence.toFixed(1)}] ${f.content}`);
    }
    parts.push('');
  }

  // Project state
  if (ctx.project_state) {
    parts.push('### Project State');
    parts.push(`- **Name**: ${ctx.project_state.name}`);
    parts.push(`- **Phase**: ${ctx.project_state.current_phase}`);
    if (ctx.project_state.blockers.length > 0) {
      parts.push(`- **Blockers**: ${ctx.project_state.blockers.join(', ')}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

export class AgentTeam {
  private identities: AgentIdentity[];
  private dag: TaskDAG;
  private client: Anthropic | null;
  private coordinator: AgentIdentity | null;
  private memoryDb: Database | null = null;
  private tickCount = 0;
  private budget: BudgetTracker;

  constructor(identitiesDir: string) {
    this.identities = loadIdentities(identitiesDir);
    this.dag = new TaskDAG();

    // Initialize budget tracker
    this.budget = new BudgetTracker();
    this.budget.on('budget_warning', (data) => {
      console.warn(`[budget] WARNING: ${(data.percentage * 100).toFixed(0)}% of daily budget used ($${data.current.toFixed(4)}/$${data.limit.toFixed(2)})`);
      eventBus.publish('budget_warning', data);
    });
    this.budget.on('budget_exhausted', (data) => {
      console.error(`[budget] EXHAUSTED: Daily budget reached ($${data.current.toFixed(4)}/$${data.limit.toFixed(2)})`);
      eventBus.publish('budget_exhausted', data);
    });

    // Find the coordinator identity
    this.coordinator = this.identities.find(
      a => a.name.toLowerCase() === 'coordinator',
    ) || null;

    // Initialize Anthropic client (used as a sentinel for "can we run agents?")
    // Actual model routing is handled by providers.ts (OpenRouter preferred, Anthropic fallback)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (anthropicKey) {
      this.client = new Anthropic({ apiKey: anthropicKey });
    } else if (openrouterKey) {
      // No Anthropic key but OpenRouter is available — create a dummy client as sentinel
      this.client = {} as Anthropic;
      console.log('[team] Using OpenRouter for multi-model routing (no ANTHROPIC_API_KEY)');
    } else {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/v1';
      this.client = {} as Anthropic;
      console.log(`[team] No cloud API keys. Using Ollama at ${ollamaUrl} for all agents.`);
    }

    // Initialize memory database (resolve relative to monorepo root via import.meta)
    const defaultDbPath = joinPath(import.meta.dir, '..', '..', '..', 'data', 'agent-memory.db');
    const dbPath = process.env.DB_PATH || defaultDbPath;
    try {
      this.memoryDb = initMemoryDatabase(dbPath);
      console.log(`[team] Memory database initialized at ${dbPath}`);
      this.ensureAgentsRegistered();
      initAffinityTable(this.memoryDb);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[team] Memory database init failed: ${msg}. Running without persistent memory.`);
      this.memoryDb = null;
    }
  }

  /**
   * UPSERT each agent identity into the memory DB agents table.
   * Prevents FK violations when storing episodes.
   */
  private ensureAgentsRegistered(): void {
    if (!this.memoryDb) return;

    for (const identity of this.identities) {
      const agentId = identity.name.toLowerCase();
      const existing = this.memoryDb.query(
        'SELECT id FROM agents WHERE id = ?'
      ).get(agentId) as { id: string } | null;

      if (existing) {
        this.memoryDb.run(
          `UPDATE agents SET name = ?, role = ?, expertise = ?, personality = ?, model_preference = ?, status = 'idle'
           WHERE id = ?`,
          [
            identity.name,
            identity.role,
            JSON.stringify(identity.expertise),
            identity.personality,
            identity.modelPreference,
            agentId,
          ]
        );
      } else {
        this.memoryDb.run(
          `INSERT INTO agents (id, name, role, expertise, personality, model_preference, status)
           VALUES (?, ?, ?, ?, ?, ?, 'idle')`,
          [
            agentId,
            identity.name,
            identity.role,
            JSON.stringify(identity.expertise),
            identity.personality,
            identity.modelPreference,
          ]
        );
      }
    }

    console.log(`[team] ${this.identities.length} agents registered in memory DB`);
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
  }, options?: { requireApproval?: boolean }): Promise<string> {
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
      depth: 0,
      parentId: null,
    });

    eventBus.publish('task_submitted', {
      taskId: parentId,
      title: input.title,
      priority,
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
            'IMPORTANT: The worker agents DO NOT have workspace access or tool use.',
            'Before decomposing, use your workspace tools (read_file, list_directory, search_files)',
            'to read any relevant files from the project. Then include the relevant file contents,',
            'code snippets, or context directly in each subtask\'s description so the worker agent',
            'has everything it needs to complete the work without any file access.',
            '',
            'Respond with a JSON array of subtasks. Each subtask should have:',
            '- "title": short task title',
            '- "description": detailed description including all necessary context, code snippets, and file contents',
            '- "priority": "critical" | "high" | "medium" | "low"',
            '',
            'Example: [{"title": "Review security", "description": "Analyze the following code for vulnerabilities:\\n```typescript\\n// ... actual code ...\\n```", "priority": "high"}]',
            '',
            'Decompose the task into 2-5 actionable subtasks.',
          ].join('\n'),
        );

        const subtaskDefs = parseDecomposition(decompositionResult.output, parentId)
          .slice(0, MAX_SUBTASKS_PER_DECOMPOSITION); // Cap subtask count

        const requireApproval = options?.requireApproval ?? false;
        const subtaskStatus = requireApproval ? 'awaiting_approval' : 'pending';

        const subtaskIds: string[] = [];
        for (const def of subtaskDefs) {
          const subId = this.dag.addTask({ ...def, status: subtaskStatus, depth: 1, parentId });
          subtaskIds.push(subId);
        }

        // Update parent with decomposition output
        this.dag.updateTask(parentId, {
          output: `Decomposed into ${subtaskIds.length} subtasks: ${subtaskIds.join(', ')}`,
          status: 'completed',
        });

        eventBus.publish('task_decomposed', {
          parentTaskId: parentId,
          subtaskIds,
          subtaskCount: subtaskIds.length,
        });

        if (requireApproval) {
          const subtaskDetails = subtaskIds.map(id => {
            const t = this.dag.getTask(id);
            return { id, title: t?.title, description: t?.description, assignedTo: t?.assignedTo };
          });
          eventBus.publish('proposal_created', {
            parentId,
            title: input.title,
            description: input.description,
            subtasks: subtaskDetails,
          });
        }
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
    this.tickCount++;
    const tickNum = this.tickCount;

    eventBus.publish('tick_started', { tickNumber: tickNum });

    if (!this.client) {
      console.warn('[team] No API client available. Skipping tick.');
      eventBus.publish('tick_completed', { tickNumber: tickNum, executed: 0, skipped: true });
      return [];
    }

    // Reset blocked tasks that failed due to transient API errors (500, 429, overloaded)
    for (const task of this.dag.getAllTasks()) {
      if (task.status === 'blocked' && task.output &&
          /\b(500|502|503|529|rate_limit|Internal server error|overloaded)\b/.test(task.output)) {
        console.log(`[team] Retrying blocked task "${task.id}" (transient API error)`);
        this.dag.updateTask(task.id, { status: 'pending', output: null, assignedTo: null });
      }
    }

    const readyTasks = this.dag.getReadyTasks();
    if (readyTasks.length === 0) {
      eventBus.publish('tick_completed', { tickNumber: tickNum, executed: 0, noReadyTasks: true });
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

    eventBus.publish('tick_completed', {
      tickNumber: tickNum,
      executed: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return results;
  }

  /**
   * Execute a single task with an agent and update the DAG.
   * Integrates with agent memory for context assembly and episode storage.
   */
  private async executeAndStore(
    task: TaskNode,
    agent: AgentIdentity,
  ): Promise<AgentExecutionResult> {
    const agentId = agent.name.toLowerCase();

    // Mark as in progress
    this.dag.updateTask(task.id, {
      status: 'in_progress',
      assignedTo: agent.name,
    });

    eventBus.publish('task_assigned', {
      taskId: task.id,
      taskTitle: task.title,
      agentName: agent.name,
    });

    eventBus.publish('agent_started', {
      agentName: agent.name,
      taskId: task.id,
      taskTitle: task.title,
    });

    // Update agent status in memory DB
    if (this.memoryDb) {
      try {
        this.memoryDb.run(
          `UPDATE agents SET status = 'active' WHERE id = ?`,
          [agentId]
        );
      } catch { /* non-critical */ }
    }

    // Budget check before execution
    const budgetCheck = this.budget.canExecute(task.id);
    if (!budgetCheck.allowed) {
      console.warn(`[team] Budget blocked task "${task.id}": ${budgetCheck.reason}`);
      this.dag.updateTask(task.id, { status: 'blocked', output: `Budget: ${budgetCheck.reason}` });
      eventBus.publish('task_budget_blocked', { taskId: task.id, reason: budgetCheck.reason });
      return {
        agentName: agent.name,
        taskId: task.id,
        output: `Budget blocked: ${budgetCheck.reason}`,
        success: false,
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        model: '',
      };
    }

    // Smart model routing: classify task and select cheapest adequate model
    const budgetStatus = this.budget.getStatus();
    const budgetPct = budgetStatus.daily.limit > 0 ? budgetStatus.daily.spent / budgetStatus.daily.limit : 0;
    const routed = routeTask(task, agent.name, budgetPct);
    const routedAgent = { ...agent, modelPreference: routed.model };

    // Assemble memory context
    let memoryContext = '';
    if (this.memoryDb) {
      try {
        const ctx = assembleContext(this.memoryDb, agentId, { budgetTokens: 2000 });
        memoryContext = formatContextPackage(ctx);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[team] Memory context assembly failed for ${agent.name}: ${msg}`);
      }
    }

    const onToolUse = (toolName: string, input: Record<string, string>) => {
      eventBus.publish('tool_use', {
        agentName: routedAgent.name,
        taskId: task.id,
        toolName,
        input,
      });
    };

    const result = await executeAgentTask(
      this.client!,
      routedAgent,
      task,
      memoryContext,
      onToolUse,
    );

    // Record budget usage
    if (result.inputTokens > 0 || result.outputTokens > 0) {
      this.budget.record(task.id, result.model, result.inputTokens, result.outputTokens);
    }

    // Update DAG with result
    this.dag.updateTask(task.id, {
      status: result.success ? 'completed' : 'blocked',
      output: result.output,
    });

    // Store episode in memory
    if (this.memoryDb) {
      try {
        const importance = result.success ? 0.6 : 0.8;
        const tags = [
          `task:${task.id}`,
          result.success ? 'success' : 'failure',
          task.priority,
        ];
        const content = result.success
          ? `Completed task "${task.title}": ${result.output.slice(0, 300)}`
          : `Failed task "${task.title}": ${result.output.slice(0, 300)}`;

        storeEpisode(this.memoryDb, agentId, content, importance, tags);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[team] Episode storage failed for ${agent.name}: ${msg}`);
      }

      // Reset agent status
      try {
        this.memoryDb.run(
          `UPDATE agents SET status = 'idle' WHERE id = ?`,
          [agentId]
        );
      } catch { /* non-critical */ }
    }

    // Emit completion/failure event
    // Emit task output for Discord #results channel
    eventBus.publish('task_output', {
      taskId: task.id,
      taskTitle: task.title,
      agentName: agent.name,
      output: result.output.slice(0, 3000),
      model: result.model,
      duration: result.duration,
      success: result.success,
    });

    if (result.success) {
      eventBus.publish('agent_completed', {
        agentName: agent.name,
        taskId: task.id,
        taskTitle: task.title,
        duration: result.duration,
        outputLength: result.output.length,
      });
    } else {
      eventBus.publish('agent_failed', {
        agentName: agent.name,
        taskId: task.id,
        taskTitle: task.title,
        duration: result.duration,
        error: result.output.slice(0, 200),
      });
    }

    return result;
  }

  /**
   * Approve a proposal — flip all awaiting_approval subtasks under parentId to pending.
   */
  approveProposal(parentId: string): void {
    const allTasks = this.dag.getAllTasks();
    let flipped = 0;
    for (const task of allTasks) {
      if (task.parentId === parentId && task.status === 'awaiting_approval') {
        this.dag.updateTask(task.id, { status: 'pending' });
        flipped++;
      }
    }
    eventBus.publish('proposal_approved', { parentId, subtasksApproved: flipped });
  }

  /**
   * Reject a proposal — block all subtasks and mark parent output as rejected.
   */
  rejectProposal(parentId: string): void {
    const allTasks = this.dag.getAllTasks();
    let flipped = 0;
    for (const task of allTasks) {
      if (task.parentId === parentId && task.status === 'awaiting_approval') {
        this.dag.updateTask(task.id, { status: 'blocked', output: 'Rejected by human' });
        flipped++;
      }
    }
    const parent = this.dag.getTask(parentId);
    if (parent) {
      this.dag.updateTask(parentId, { output: `Rejected by human (${flipped} subtasks blocked)` });
    }
    eventBus.publish('proposal_rejected', { parentId, subtasksRejected: flipped });
  }

  /**
   * Get all parent tasks that have children in awaiting_approval status.
   */
  getPendingProposals(): Array<{ parent: TaskNode; subtasks: TaskNode[] }> {
    const allTasks = this.dag.getAllTasks();
    const awaitingByParent = new Map<string, TaskNode[]>();

    for (const task of allTasks) {
      if (task.status === 'awaiting_approval' && task.parentId) {
        if (!awaitingByParent.has(task.parentId)) {
          awaitingByParent.set(task.parentId, []);
        }
        awaitingByParent.get(task.parentId)!.push(task);
      }
    }

    const proposals: Array<{ parent: TaskNode; subtasks: TaskNode[] }> = [];
    for (const [parentId, subtasks] of awaitingByParent) {
      const parent = this.dag.getTask(parentId);
      if (parent) {
        proposals.push({ parent, subtasks });
      }
    }

    return proposals;
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

  /**
   * Get RPG profiles for all agents (computed from DB state).
   */
  getRPGProfiles(): RPGProfile[] {
    if (!this.memoryDb) return [];
    return getAllRPGProfiles(this.memoryDb);
  }

  /**
   * Get all pairwise affinity relationships.
   */
  getAffinities(): AffinityPair[] {
    if (!this.memoryDb) return [];
    return getAllAffinities(this.memoryDb);
  }

  /**
   * Get current budget status.
   */
  getBudgetStatus() {
    return this.budget.getStatus();
  }
}

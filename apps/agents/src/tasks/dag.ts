// Task DAG — Directed Acyclic Graph for task orchestration
// Manages task nodes with dependency tracking, status transitions, and ready-queue extraction.
// Extended with evidence tracking and watcher enforcement for task accountability.

import { checkTransition, formatAuditEntry, type StateTransition } from './watcher';
import type { Evidence } from './evidence';

// ── Limits ──
export const MAX_TASK_DEPTH = 3;
export const MAX_SUBTASKS_PER_DECOMPOSITION = 5;
export const MAX_TOTAL_TASKS = 200;
export const MAX_CONCURRENT_TASKS = 20;

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'awaiting_approval'
  | 'evidence_submitted'
  | 'failed';

export interface TaskNode {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: TaskStatus;
  assignedTo: string | null;
  dependsOn: string[];
  output: string | null;
  createdAt: string;
  depth: number;
  parentId: string | null;
  evidence?: Evidence;
}

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  const ts = Date.now().toString(36);
  const count = idCounter.toString(36).padStart(4, '0');
  return `task_${ts}_${count}`;
}

export class TaskDAG {
  private nodes: Map<string, TaskNode>;

  constructor() {
    this.nodes = new Map();
  }

  /**
   * Add a new task to the DAG.
   * Returns the generated task ID.
   * Enforces depth limits, total task limits, and validates dependencies.
   */
  addTask(task: Omit<TaskNode, 'id' | 'createdAt'>): string {
    // Enforce total task limit
    if (this.nodes.size >= MAX_TOTAL_TASKS) {
      throw new Error(`Maximum total tasks (${MAX_TOTAL_TASKS}) reached. Cannot add more tasks.`);
    }

    // Calculate depth from parent
    let depth = task.depth ?? 0;
    if (task.parentId) {
      const parent = this.nodes.get(task.parentId);
      if (parent) {
        depth = parent.depth + 1;
      }
    }

    // Enforce depth limit
    if (depth > MAX_TASK_DEPTH) {
      throw new Error(`Maximum task depth (${MAX_TASK_DEPTH}) exceeded at depth ${depth}. Task: "${task.title}"`);
    }

    const id = generateId();
    const node: TaskNode = {
      ...task,
      id,
      depth,
      parentId: task.parentId ?? null,
      createdAt: new Date().toISOString(),
    };

    // Validate that all dependencies exist
    for (const depId of node.dependsOn) {
      if (!this.nodes.has(depId)) {
        throw new Error(`Dependency task "${depId}" does not exist in DAG`);
      }
    }

    this.nodes.set(id, node);
    return id;
  }

  // Watcher enforcement toggle — enabled by default, can be disabled for migration/testing
  private watcherEnabled = true;

  // Audit log callback — set externally to route audit entries (e.g. to Discord #audit)
  private auditCallback: ((entry: string, blocked: boolean, transition: StateTransition) => void) | null = null;

  /**
   * Enable or disable watcher enforcement.
   * When disabled, transitions happen without rule checks (useful for migration).
   */
  setWatcherEnabled(enabled: boolean): void {
    this.watcherEnabled = enabled;
  }

  /**
   * Register a callback for watcher audit entries.
   */
  onAudit(callback: (entry: string, blocked: boolean, transition: StateTransition) => void): void {
    this.auditCallback = callback;
  }

  /**
   * Update fields on an existing task.
   * When watcher is enabled and status is changing, enforces transition rules.
   *
   * @param actor - The agent/system performing the update (for watcher enforcement).
   *                Defaults to 'system' for backward compatibility.
   */
  updateTask(id: string, updates: Partial<TaskNode>, actor: string = 'system'): void {
    const existing = this.nodes.get(id);
    if (!existing) {
      throw new Error(`Task "${id}" not found in DAG`);
    }

    // Prevent changing the ID
    const { id: _ignoreId, ...safeUpdates } = updates;

    // If dependsOn is being updated, validate new deps exist
    if (safeUpdates.dependsOn) {
      for (const depId of safeUpdates.dependsOn) {
        if (!this.nodes.has(depId)) {
          throw new Error(`Dependency task "${depId}" does not exist in DAG`);
        }
        if (depId === id) {
          throw new Error(`Task "${id}" cannot depend on itself`);
        }
      }
    }

    // Watcher enforcement: check transition rules when status is changing
    if (this.watcherEnabled && safeUpdates.status && safeUpdates.status !== existing.status) {
      const subtasks = this.getSubtasks(id);

      const transition: StateTransition = {
        taskId: id,
        from: existing.status,
        to: safeUpdates.status,
        actor: actor.toLowerCase(),
        task: existing,
        evidence: safeUpdates.evidence,
        subtasks,
      };

      const result = checkTransition(transition);
      const auditEntry = formatAuditEntry(transition, result);

      // Fire audit callback
      if (this.auditCallback) {
        this.auditCallback(auditEntry, !result.allowed, transition);
      }

      if (!result.allowed) {
        const rule = result.blockedBy?.rule ?? 'unknown';
        const reason = result.blockedBy?.reason ?? 'Transition blocked by watcher';
        throw new WatcherBlockedError(id, existing.status, safeUpdates.status, rule, reason);
      }
    }

    this.nodes.set(id, { ...existing, ...safeUpdates });

    // Auto-validate: if transitioning to evidence_submitted and evidence is valid,
    // automatically advance to completed
    if (safeUpdates.status === 'evidence_submitted' && safeUpdates.evidence) {
      // The evidence was already validated by the watcher rule.
      // Auto-advance to completed.
      this.nodes.set(id, {
        ...this.nodes.get(id)!,
        status: 'completed',
      });

      if (this.auditCallback) {
        const autoEntry =
          `[WATCHER] AUTO: ${id} transition evidence_submitted → completed\n` +
          `  Validation: evidence meets policy (${safeUpdates.evidence.type})\n` +
          `  Time: ${new Date().toISOString()}`;
        this.auditCallback(autoEntry, false, {
          taskId: id,
          from: 'evidence_submitted',
          to: 'completed',
          actor: 'watcher',
          task: this.nodes.get(id)!,
          evidence: safeUpdates.evidence,
        });
      }
    }
  }

  /**
   * Get all direct child tasks of a given parent task.
   */
  getSubtasks(parentId: string): TaskNode[] {
    const children: TaskNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.parentId === parentId) {
        children.push(node);
      }
    }
    return children;
  }

  /**
   * Get a single task by ID.
   */
  getTask(id: string): TaskNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all tasks that are ready to execute:
   * - Status is 'pending'
   * - All dependencies have status 'completed'
   */
  getReadyTasks(): TaskNode[] {
    // Count currently in-progress tasks
    let inProgressCount = 0;
    for (const node of this.nodes.values()) {
      if (node.status === 'in_progress') inProgressCount++;
    }

    // Respect concurrent task limit
    const availableSlots = Math.max(0, MAX_CONCURRENT_TASKS - inProgressCount);
    if (availableSlots === 0) return [];

    const ready: TaskNode[] = [];

    for (const node of this.nodes.values()) {
      if (node.status !== 'pending') continue;

      const allDepsCompleted = node.dependsOn.every(depId => {
        const dep = this.nodes.get(depId);
        return dep && dep.status === 'completed';
      });

      if (allDepsCompleted) {
        ready.push(node);
      }
    }

    // Sort by priority: critical > high > medium > low
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    ready.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

    // Only return up to available slots
    return ready.slice(0, availableSlots);
  }

  /**
   * Get all tasks that are blocked:
   * - Status is 'pending' or 'blocked'
   * - At least one dependency is NOT 'completed'
   */
  getBlockedTasks(): TaskNode[] {
    const blocked: TaskNode[] = [];

    for (const node of this.nodes.values()) {
      if (node.status !== 'pending' && node.status !== 'blocked') continue;
      if (node.dependsOn.length === 0) continue;

      const hasUnfinishedDep = node.dependsOn.some(depId => {
        const dep = this.nodes.get(depId);
        return !dep || dep.status !== 'completed';
      });

      if (hasUnfinishedDep) {
        blocked.push(node);
      }
    }

    return blocked;
  }

  /**
   * Return all tasks in the DAG.
   */
  getAllTasks(): TaskNode[] {
    return [...this.nodes.values()];
  }

  /**
   * Serialize the entire DAG to a JSON-compatible array.
   */
  toJSON(): TaskNode[] {
    return this.getAllTasks();
  }

  /**
   * Reconstruct a TaskDAG from a serialized array of TaskNodes.
   */
  static fromJSON(nodes: TaskNode[]): TaskDAG {
    const dag = new TaskDAG();
    // First pass: insert all nodes without dep validation (they reference each other)
    for (const node of nodes) {
      dag.nodes.set(node.id, { ...node, depth: node.depth ?? 0, parentId: node.parentId ?? null });
    }
    // Second pass: validate all dependency references exist
    for (const node of dag.nodes.values()) {
      for (const depId of node.dependsOn) {
        if (!dag.nodes.has(depId)) {
          console.warn(`[TaskDAG.fromJSON] Task "${node.id}" references missing dep "${depId}"`);
        }
      }
    }
    return dag;
  }
}

// ── Watcher Error ──

/**
 * Error thrown when the watcher blocks a state transition.
 * Callers can catch this specifically to handle enforcement actions.
 */
export class WatcherBlockedError extends Error {
  public readonly taskId: string;
  public readonly fromStatus: TaskStatus;
  public readonly toStatus: TaskStatus;
  public readonly rule: string;

  constructor(taskId: string, from: TaskStatus, to: TaskStatus, rule: string, reason: string) {
    super(`[WATCHER] BLOCKED: ${taskId} ${from} → ${to} — ${rule}: ${reason}`);
    this.name = 'WatcherBlockedError';
    this.taskId = taskId;
    this.fromStatus = from;
    this.toStatus = to;
    this.rule = rule;
  }
}

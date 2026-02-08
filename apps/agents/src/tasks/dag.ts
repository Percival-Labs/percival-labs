// Task DAG — Directed Acyclic Graph for task orchestration
// Manages task nodes with dependency tracking, status transitions, and ready-queue extraction.

export interface TaskNode {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignedTo: string | null;
  dependsOn: string[];
  output: string | null;
  createdAt: string;
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
   */
  addTask(task: Omit<TaskNode, 'id' | 'createdAt'>): string {
    const id = generateId();
    const node: TaskNode = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
    };

    // Validate that all dependencies exist
    for (const depId of node.dependsOn) {
      if (!this.nodes.has(depId)) {
        throw new Error(`Dependency task "${depId}" does not exist in DAG`);
      }
    }

    // Check for cycles: the new node's dependencies must not transitively depend on the new node
    // Since the node is new (not yet in the graph), cycles can only occur if
    // dependsOn references form a loop. Because the node ID is fresh and not
    // referenced by any existing node, no cycle is possible at insertion time.
    // We still validate deps exist above.

    this.nodes.set(id, node);
    return id;
  }

  /**
   * Update fields on an existing task.
   */
  updateTask(id: string, updates: Partial<TaskNode>): void {
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

    this.nodes.set(id, { ...existing, ...safeUpdates });
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

    return ready;
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
      dag.nodes.set(node.id, { ...node });
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

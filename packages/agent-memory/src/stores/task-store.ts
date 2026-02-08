// Agent Memory — Task Store
// Task management with dependency resolution for agent work queues.

import type { Database } from "bun:sqlite";
import type { AgentTask } from "../types.ts";

export function createTask(
  db: Database,
  title: string,
  description: string,
  priority: "critical" | "high" | "medium" | "low",
  assignedTo?: string | null,
  dependsOn?: string[]
): AgentTask {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const resolvedAssignedTo = assignedTo ?? null;
  const dependsOnJson = JSON.stringify(dependsOn ?? []);

  db.run(
    `INSERT INTO tasks (id, title, description, priority, status, assigned_to, depends_on, output, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, NULL, ?, ?)`,
    [id, title, description, priority, resolvedAssignedTo, dependsOnJson, now, now]
  );

  return {
    id,
    title,
    description,
    priority,
    status: "pending",
    assigned_to: resolvedAssignedTo,
    depends_on: dependsOn ?? [],
    output: null,
    created_at: now,
    updated_at: now,
  };
}

export function updateTask(
  db: Database,
  taskId: string,
  updates: Partial<{
    status: "pending" | "in_progress" | "completed" | "blocked";
    assigned_to: string | null;
    output: string | null;
  }>
): AgentTask | null {
  const setClauses: string[] = [];
  const params: (string | null)[] = [];

  if (updates.status !== undefined) {
    setClauses.push("status = ?");
    params.push(updates.status);
  }

  if (updates.assigned_to !== undefined) {
    setClauses.push("assigned_to = ?");
    params.push(updates.assigned_to);
  }

  if (updates.output !== undefined) {
    setClauses.push("output = ?");
    params.push(updates.output);
  }

  if (setClauses.length === 0) return null;

  const now = new Date().toISOString();
  setClauses.push("updated_at = ?");
  params.push(now);

  params.push(taskId);

  db.run(
    `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = ?`,
    params
  );

  // Read back the updated task
  const row = db
    .query(
      `SELECT id, title, description, priority, status, assigned_to, depends_on, output, created_at, updated_at
       FROM tasks WHERE id = ?`
    )
    .get(taskId) as {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    assigned_to: string | null;
    depends_on: string;
    output: string | null;
    created_at: string;
    updated_at: string;
  } | null;

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as AgentTask["priority"],
    status: row.status as AgentTask["status"],
    assigned_to: row.assigned_to,
    depends_on: JSON.parse(row.depends_on) as string[],
    output: row.output,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export interface GetTasksOptions {
  status?: string;
  assignedTo?: string;
  limit?: number;
}

export function getTasks(
  db: Database,
  options: GetTasksOptions = {}
): AgentTask[] {
  const { status, assignedTo, limit = 50 } = options;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  if (assignedTo) {
    conditions.push("assigned_to = ?");
    params.push(assignedTo);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Priority ordering: critical > high > medium > low
  const query = `
    SELECT id, title, description, priority, status, assigned_to, depends_on, output, created_at, updated_at
    FROM tasks
    ${whereClause}
    ORDER BY
      CASE priority
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
      END,
      created_at ASC
    LIMIT ?
  `;

  params.push(limit);

  const rows = db.query(query).all(...params) as Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    assigned_to: string | null;
    depends_on: string;
    output: string | null;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as AgentTask["priority"],
    status: row.status as AgentTask["status"],
    assigned_to: row.assigned_to,
    depends_on: JSON.parse(row.depends_on) as string[],
    output: row.output,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export function getReadyTasks(db: Database): AgentTask[] {
  // Get all pending tasks
  const pendingTasks = getTasks(db, { status: "pending" });

  // Get all completed task IDs for dependency resolution
  const completedRows = db
    .query(`SELECT id FROM tasks WHERE status = 'completed'`)
    .all() as Array<{ id: string }>;
  const completedIds = new Set(completedRows.map((r) => r.id));

  // Filter: a task is ready if all its dependencies are completed
  return pendingTasks.filter((task) => {
    if (task.depends_on.length === 0) return true;
    return task.depends_on.every((depId) => completedIds.has(depId));
  });
}

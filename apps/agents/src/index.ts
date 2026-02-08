// Percival Labs — Agent Service
// Hono API server for the agent team infrastructure.
// Endpoints: task submission, status, team health, memory inspection.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { join } from 'node:path';
import { AgentTeam } from './team';

const app = new Hono();

// ── CORS for local dev ──
app.use('*', cors());

// ── Initialize agent team ──
const identitiesDir = join(import.meta.dir, '..', 'identities');
const team = new AgentTeam(identitiesDir);

// Track execution history for debug inspection
const executionHistory: Map<string, Array<{
  agentName: string;
  taskId: string;
  output: string;
  success: boolean;
  duration: number;
  completedAt: string;
}>> = new Map();

// ── Health check ──
app.get('/', (c) => {
  return c.json({
    service: '@percival/agents',
    version: '0.1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ── POST /v1/agents/tasks — Submit work to the agent team ──
app.post('/v1/agents/tasks', async (c) => {
  try {
    const body = await c.req.json<{
      title?: string;
      description?: string;
      priority?: string;
    }>();

    if (!body.title || !body.description) {
      return c.json(
        { error: 'Missing required fields: title, description' },
        400,
      );
    }

    const taskId = await team.submitTask({
      title: body.title,
      description: body.description,
      priority: body.priority,
    });

    const task = team.getTaskStatus(taskId);

    return c.json({
      taskId,
      status: task?.status || 'pending',
      message: 'Task submitted to agent team',
      task,
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api] POST /v1/agents/tasks error:', message);
    return c.json({ error: message }, 500);
  }
});

// ── GET /v1/agents/tasks/:id — Task status + output ──
app.get('/v1/agents/tasks/:id', (c) => {
  const id = c.req.param('id');
  const task = team.getTaskStatus(id);

  if (!task) {
    return c.json({ error: `Task "${id}" not found` }, 404);
  }

  const history = executionHistory.get(id) || [];

  return c.json({
    task,
    executionHistory: history,
  });
});

// ── POST /v1/agents/tick — Run one execution cycle ──
app.post('/v1/agents/tick', async (c) => {
  try {
    const results = await team.tick();

    // Store execution history
    for (const result of results) {
      if (!executionHistory.has(result.taskId)) {
        executionHistory.set(result.taskId, []);
      }
      executionHistory.get(result.taskId)!.push({
        ...result,
        completedAt: new Date().toISOString(),
      });
    }

    return c.json({
      executed: results.length,
      results: results.map(r => ({
        agentName: r.agentName,
        taskId: r.taskId,
        success: r.success,
        duration: r.duration,
        outputLength: r.output.length,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api] POST /v1/agents/tick error:', message);
    return c.json({ error: message }, 500);
  }
});

// ── GET /v1/agents/status — Team health and overview ──
app.get('/v1/agents/status', (c) => {
  const status = team.getTeamStatus();
  const dagTasks = status.tasks;

  const taskSummary = {
    total: dagTasks.length,
    pending: dagTasks.filter(t => t.status === 'pending').length,
    in_progress: dagTasks.filter(t => t.status === 'in_progress').length,
    completed: dagTasks.filter(t => t.status === 'completed').length,
    blocked: dagTasks.filter(t => t.status === 'blocked').length,
  };

  return c.json({
    agents: status.agents.map(a => ({
      name: a.name,
      role: a.role,
      modelPreference: a.modelPreference,
      expertise: a.expertise,
    })),
    tasks: taskSummary,
    allTasks: dagTasks,
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ── GET /v1/agents/memory/:agentId — Debug: inspect agent memory context ──
app.get('/v1/agents/memory/:agentId', (c) => {
  const agentId = c.req.param('agentId');
  const status = team.getTeamStatus();

  // Find the agent by name (case-insensitive)
  const agent = status.agents.find(
    a => a.name.toLowerCase() === agentId.toLowerCase(),
  );

  if (!agent) {
    return c.json({ error: `Agent "${agentId}" not found` }, 404);
  }

  // Collect all tasks assigned to this agent
  const agentTasks = status.tasks.filter(
    t => t.assignedTo?.toLowerCase() === agentId.toLowerCase(),
  );

  // Collect all execution history for this agent's tasks
  const agentHistory: Array<{
    taskId: string;
    output: string;
    success: boolean;
    duration: number;
    completedAt: string;
  }> = [];

  for (const [taskId, history] of executionHistory) {
    for (const entry of history) {
      if (entry.agentName.toLowerCase() === agentId.toLowerCase()) {
        agentHistory.push({
          taskId,
          output: entry.output,
          success: entry.success,
          duration: entry.duration,
          completedAt: entry.completedAt,
        });
      }
    }
  }

  return c.json({
    agent: {
      name: agent.name,
      role: agent.role,
      modelPreference: agent.modelPreference,
      expertise: agent.expertise,
      personality: agent.personality,
      communication: agent.communication,
    },
    assignedTasks: agentTasks,
    executionHistory: agentHistory,
    note: 'Memory context is currently ephemeral. Integration with @percival/agent-memory for persistent memory is planned.',
  });
});

// ── GET /v1/agents/tasks — List all tasks ──
app.get('/v1/agents/tasks', (c) => {
  const status = team.getTeamStatus();
  return c.json({
    tasks: status.tasks,
    total: status.tasks.length,
  });
});

// ── Start server ──
const port = parseInt(process.env.AGENTS_PORT || '3200', 10);

console.log(`[agents] Loading identities from ${identitiesDir}`);
const teamStatus = team.getTeamStatus();
console.log(`[agents] Loaded ${teamStatus.agents.length} agents: ${teamStatus.agents.map(a => a.name).join(', ')}`);
console.log(`[agents] API key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT SET (agent execution disabled)'}`);
console.log(`[agents] Starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

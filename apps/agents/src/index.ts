// Percival Labs — Agent Service
// Hono API server for the agent team infrastructure.
// Endpoints: task submission, status, team health, memory inspection, SSE events, auto-tick.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { join } from 'node:path';
import { AgentTeam } from './team';
import { eventBus } from './events';
import { agentAuth } from './middleware/auth';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3400,http://localhost:3500,http://localhost:3600,http://localhost:3700').split(',');

const app = new Hono();

// ── CORS — restricted to known origins ──
app.use('*', cors({
  origin: ALLOWED_ORIGINS,
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
}));

// ── API Key authentication ──
app.use('*', agentAuth);

// ── Initialize agent team ──
const identitiesDir = join(import.meta.dir, '..', 'identities');
const team = new AgentTeam(identitiesDir);

// Track execution history for debug inspection (bounded)
const MAX_HISTORY_ENTRIES = 1000;
const MAX_ENTRIES_PER_TASK = 50;

interface ExecutionEntry {
  agentName: string;
  taskId: string;
  output: string;
  success: boolean;
  duration: number;
  completedAt: string;
}

const executionHistory: Map<string, ExecutionEntry[]> = new Map();
let totalHistoryEntries = 0;

function recordExecution(entry: ExecutionEntry) {
  if (!executionHistory.has(entry.taskId)) {
    executionHistory.set(entry.taskId, []);
  }
  const taskHistory = executionHistory.get(entry.taskId)!;

  // Per-task cap
  if (taskHistory.length >= MAX_ENTRIES_PER_TASK) {
    taskHistory.shift();
    totalHistoryEntries--;
  }

  // Global cap — evict oldest task's oldest entry
  if (totalHistoryEntries >= MAX_HISTORY_ENTRIES) {
    for (const [taskId, entries] of executionHistory) {
      if (entries.length > 0) {
        entries.shift();
        totalHistoryEntries--;
        if (entries.length === 0) executionHistory.delete(taskId);
        break;
      }
    }
  }

  taskHistory.push(entry);
  totalHistoryEntries++;
}

// ── Auto-tick state ──
let autoTickInterval: ReturnType<typeof setInterval> | null = null;
let autoTickIntervalMs = 10_000;
let tickInProgress = false;

// ── Health check ──
app.get('/', (c) => {
  return c.json({
    service: '@percival/agents',
    version: '0.2.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ── Health check (standard path for Docker) ──
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: '@percival/agents',
    version: '0.2.0',
  });
});

// ── POST /v1/agents/tasks — Submit work to the agent team ──
app.post('/v1/agents/tasks', async (c) => {
  try {
    const body = await c.req.json<{
      title?: string;
      description?: string;
      priority?: string;
      requireApproval?: boolean;
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
    }, { requireApproval: body.requireApproval ?? false });

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

    // Store execution history (bounded)
    for (const result of results) {
      recordExecution({ ...result, completedAt: new Date().toISOString() });
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
    awaiting_approval: dagTasks.filter(t => t.status === 'awaiting_approval').length,
  };

  return c.json({
    agents: status.agents.map(a => ({
      name: a.name,
      role: a.role,
      modelPreference: a.modelPreference,
      expertise: a.expertise,
      personality: a.personality,
      communication: a.communication,
      roleCard: a.roleCard || null,
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

// ── GET /v1/agents/budget — Current budget status ──
app.get('/v1/agents/budget', (c) => {
  return c.json(team.getBudgetStatus());
});

// ── GET /v1/agents/proposals — Pending proposals awaiting approval ──
app.get('/v1/agents/proposals', (c) => {
  const proposals = team.getPendingProposals();
  return c.json({
    proposals: proposals.map(p => ({
      parentId: p.parent.id,
      title: p.parent.title,
      description: p.parent.description,
      priority: p.parent.priority,
      subtasks: p.subtasks.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        assignedTo: s.assignedTo,
      })),
    })),
    total: proposals.length,
  });
});

// ── POST /v1/agents/proposals/:id/approve — Approve a proposal ──
app.post('/v1/agents/proposals/:id/approve', (c) => {
  const id = c.req.param('id');
  const task = team.getTaskStatus(id);
  if (!task) {
    return c.json({ error: `Task "${id}" not found` }, 404);
  }
  team.approveProposal(id);
  return c.json({ message: 'Proposal approved', parentId: id });
});

// ── POST /v1/agents/proposals/:id/reject — Reject a proposal ──
app.post('/v1/agents/proposals/:id/reject', (c) => {
  const id = c.req.param('id');
  const task = team.getTaskStatus(id);
  if (!task) {
    return c.json({ error: `Task "${id}" not found` }, 404);
  }
  team.rejectProposal(id);
  return c.json({ message: 'Proposal rejected', parentId: id });
});

// ── POST /v1/agents/tasks/:id/reset — Admin: reset a stuck task to pending ──
app.post('/v1/agents/tasks/:id/reset', (c) => {
  const id = c.req.param('id');
  const task = team.getTaskStatus(id);
  if (!task) {
    return c.json({ error: `Task "${id}" not found` }, 404);
  }
  team.getDAG().updateTask(id, {
    status: 'pending',
    assignedTo: null,
    output: null,
  }, 'system');
  const updated = team.getTaskStatus(id);
  return c.json({ message: `Task "${id}" reset to pending`, task: updated });
});

// ── POST /v1/agents/tasks/clear — Admin: remove all tasks from DAG ──
app.post('/v1/agents/tasks/clear', (c) => {
  const dag = team.getDAG();
  const tasks = dag.getAllTasks();
  for (const task of tasks) {
    dag.updateTask(task.id, { status: 'completed', output: 'Cleared by admin' }, 'system');
  }
  return c.json({ message: `Cleared ${tasks.length} tasks` });
});

// ── GET /v1/agents/rpg-stats — RPG character stats for all agents ──
app.get('/v1/agents/rpg-stats', (c) => {
  const profiles = team.getRPGProfiles();
  const affinities = team.getAffinities();

  return c.json({
    profiles,
    affinities,
    timestamp: new Date().toISOString(),
  });
});

// ── GET /v1/agents/events — SSE stream of agent events ──
app.get('/v1/agents/events', (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed
        }
      }

      // Send connected event
      send(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

      // Backfill recent events
      const recent = eventBus.getRecentEvents(50);
      for (const event of recent) {
        send(`data: ${JSON.stringify(event)}\n\n`);
      }

      // Listen for new events
      function onEvent(event: unknown) {
        send(`data: ${JSON.stringify(event)}\n\n`);
      }
      eventBus.on('agent_event', onEvent);

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        send(`: heartbeat\n\n`);
      }, 30_000);

      // Cleanup when stream closes
      const cleanup = () => {
        eventBus.off('agent_event', onEvent);
        clearInterval(heartbeat);
      };

      // The stream's cancel signal
      c.req.raw.signal?.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// ── GET /v1/agents/events/history — Recent events as JSON ──
app.get('/v1/agents/events/history', (c) => {
  const count = parseInt(c.req.query('count') || '50', 10);
  const events = eventBus.getRecentEvents(Math.min(count, 500));
  return c.json({ events, total: events.length });
});

// ── POST /v1/agents/auto-tick/start — Start auto-tick loop ──
app.post('/v1/agents/auto-tick/start', async (c) => {
  if (autoTickInterval) {
    return c.json({ message: 'Auto-tick already running', intervalMs: autoTickIntervalMs });
  }

  try {
    const body = await c.req.json<{ intervalMs?: number }>().catch(() => ({}));
    const requestedInterval = (body as { intervalMs?: number }).intervalMs;
    if (requestedInterval && requestedInterval >= 5000) {
      autoTickIntervalMs = requestedInterval;
    }
  } catch {
    // Use default interval
  }

  autoTickInterval = setInterval(async () => {
    if (tickInProgress) return;
    tickInProgress = true;
    try {
      const results = await team.tick();

      // Store execution history (bounded)
      for (const result of results) {
        recordExecution({ ...result, completedAt: new Date().toISOString() });
      }
    } catch (err) {
      console.error('[auto-tick] Error:', err instanceof Error ? err.message : String(err));
    } finally {
      tickInProgress = false;
    }
  }, autoTickIntervalMs);

  eventBus.publish('auto_tick_started', { intervalMs: autoTickIntervalMs });

  return c.json({
    message: 'Auto-tick started',
    intervalMs: autoTickIntervalMs,
  });
});

// ── POST /v1/agents/auto-tick/stop — Stop auto-tick loop ──
app.post('/v1/agents/auto-tick/stop', (c) => {
  if (!autoTickInterval) {
    return c.json({ message: 'Auto-tick not running' });
  }

  clearInterval(autoTickInterval);
  autoTickInterval = null;

  eventBus.publish('auto_tick_stopped', {});

  return c.json({ message: 'Auto-tick stopped' });
});

// ── GET /v1/agents/auto-tick/status — Auto-tick status ──
app.get('/v1/agents/auto-tick/status', (c) => {
  return c.json({
    running: autoTickInterval !== null,
    intervalMs: autoTickIntervalMs,
  });
});

// ── Start server ──
const port = parseInt(process.env.AGENTS_PORT || '3200', 10);

console.log(`[agents] Loading identities from ${identitiesDir}`);
const teamStatus = team.getTeamStatus();
console.log(`[agents] Loaded ${teamStatus.agents.length} agents: ${teamStatus.agents.map(a => a.name).join(', ')}`);
console.log(`[agents] API key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT SET (agent execution disabled)'}`);
console.log(`[agents] Starting on port ${port}`);

// ── Auto-start tick loop on boot ──
autoTickInterval = setInterval(async () => {
  if (tickInProgress) return;
  tickInProgress = true;
  try {
    const results = await team.tick();
    for (const result of results) {
      eventBus.publish('task_completed', result);
      recordExecution({ ...result, completedAt: new Date().toISOString() });
    }
  } catch (err) {
    console.error('[auto-tick] Error:', err instanceof Error ? err.message : String(err));
  } finally {
    tickInProgress = false;
  }
}, autoTickIntervalMs);
console.log(`[agents] Auto-tick started (${autoTickIntervalMs / 1000}s interval)`);

export default {
  port,
  fetch: app.fetch,
  // SSE streams need long-lived connections — disable Bun's default 10s idle timeout
  idleTimeout: 120,
};

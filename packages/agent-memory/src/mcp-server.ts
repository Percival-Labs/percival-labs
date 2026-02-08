#!/usr/bin/env bun
// Agent Memory — MCP Server
// Exposes 17 memory tools over Model Context Protocol for agent consumption.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve } from "path";
import { mkdirSync, existsSync } from "fs";
import { initMemoryDatabase } from "./schema.ts";
import {
  storeEpisode,
  recallEpisodes,
  archiveOldEpisodes,
} from "./stores/episode-store.ts";
import {
  learnFact,
  recallFacts,
  archiveLowConfidenceFacts,
} from "./stores/fact-store.ts";
import {
  setWorking,
  getWorking,
  clearWorking,
  expireWorking,
} from "./stores/working-store.ts";
import {
  getProjectState,
  updateProjectState,
} from "./stores/project-store.ts";
import { logDecision, getDecisions } from "./stores/decision-store.ts";
import {
  createTask,
  updateTask,
  getTasks,
  getReadyTasks,
} from "./stores/task-store.ts";
import { assembleContext } from "./context-assembler.ts";
import { runCompaction } from "./compactor.ts";

// ---- Database initialization ----

const DB_PATH = process.env.AGENT_MEMORY_DB ?? resolve("./data/agent-memory.db");
const dbDir = resolve(DB_PATH, "..");
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}
const db = initMemoryDatabase(DB_PATH);

// ---- Ensure a default agent exists for simple usage ----

function ensureAgent(agentId: string): void {
  const existing = db
    .query("SELECT id FROM agents WHERE id = ?")
    .get(agentId) as { id: string } | null;

  if (!existing) {
    db.run(
      `INSERT INTO agents (id, name, role, expertise, personality, model_preference, status)
       VALUES (?, ?, 'agent', '[]', '', '', 'active')`,
      [agentId, agentId]
    );
  }
}

// ---- MCP Server ----

const server = new McpServer(
  {
    name: "agent-memory",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================
// Tool 1: memory_store_episode
// ============================================================
server.tool(
  "memory_store_episode",
  "Store an episodic memory for an agent",
  {
    agent_id: z.string().describe("The agent ID"),
    content: z.string().describe("The episode content"),
    importance: z.number().min(0).max(1).describe("Importance score 0-1"),
    context_tags: z.array(z.string()).optional().describe("Tags for context matching"),
  },
  async ({ agent_id, content, importance, context_tags }) => {
    ensureAgent(agent_id);
    const episode = storeEpisode(
      db,
      agent_id,
      content,
      importance,
      context_tags ?? []
    );
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(episode, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 2: memory_recall_episodes
// ============================================================
server.tool(
  "memory_recall_episodes",
  "Recall episodic memories with filters",
  {
    agent_id: z.string().describe("The agent ID"),
    limit: z.number().optional().describe("Max results"),
    min_importance: z.number().optional().describe("Minimum importance threshold"),
    tags: z.array(z.string()).optional().describe("Filter by context tags"),
    since: z.string().optional().describe("ISO date - only episodes after this time"),
  },
  async ({ agent_id, limit, min_importance, tags, since }) => {
    const episodes = recallEpisodes(db, agent_id, {
      limit,
      minImportance: min_importance,
      tags,
      since,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(episodes, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 3: memory_learn
// ============================================================
server.tool(
  "memory_learn",
  "Store a learned fact",
  {
    content: z.string().describe("The fact content"),
    confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
    source: z.string().describe("Source of the fact"),
    context_tags: z.array(z.string()).optional().describe("Tags for context matching"),
    agent_id: z.string().optional().describe("Agent ID (null for shared facts)"),
  },
  async ({ content, confidence, source, context_tags, agent_id }) => {
    if (agent_id) {
      ensureAgent(agent_id);
    }
    const fact = learnFact(
      db,
      content,
      confidence,
      source,
      context_tags ?? [],
      agent_id ?? null
    );
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(fact, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 4: memory_recall_facts
// ============================================================
server.tool(
  "memory_recall_facts",
  "Recall facts with filters",
  {
    agent_id: z.string().optional().describe("Filter by agent (includes shared facts)"),
    tags: z.array(z.string()).optional().describe("Filter by context tags"),
    min_confidence: z.number().optional().describe("Minimum confidence threshold"),
    limit: z.number().optional().describe("Max results"),
  },
  async ({ agent_id, tags, min_confidence, limit }) => {
    const facts = recallFacts(db, {
      agentId: agent_id,
      tags,
      minConfidence: min_confidence,
      limit,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(facts, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 5: memory_set_working
// ============================================================
server.tool(
  "memory_set_working",
  "Set a working memory entry (key-value with optional TTL)",
  {
    agent_id: z.string().describe("The agent ID"),
    key: z.string().describe("Working memory key"),
    value: z.string().describe("Working memory value"),
    ttl_seconds: z.number().optional().describe("Time-to-live in seconds"),
  },
  async ({ agent_id, key, value, ttl_seconds }) => {
    ensureAgent(agent_id);
    const entry = setWorking(db, agent_id, key, value, ttl_seconds);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(entry, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 6: memory_get_working
// ============================================================
server.tool(
  "memory_get_working",
  "Get working memory entries for an agent",
  {
    agent_id: z.string().describe("The agent ID"),
    key: z.string().optional().describe("Specific key to retrieve (omit for all)"),
  },
  async ({ agent_id, key }) => {
    const entries = getWorking(db, agent_id, key);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(entries, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 7: memory_clear_working
// ============================================================
server.tool(
  "memory_clear_working",
  "Clear working memory entries for an agent",
  {
    agent_id: z.string().describe("The agent ID"),
    key: z.string().optional().describe("Specific key to clear (omit to clear all)"),
  },
  async ({ agent_id, key }) => {
    const deleted = clearWorking(db, agent_id, key);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ deleted_count: deleted }),
        },
      ],
    };
  }
);

// ============================================================
// Tool 8: memory_get_project_state
// ============================================================
server.tool(
  "memory_get_project_state",
  "Get the current project state",
  {
    name: z.string().optional().describe("Project name (omit for most recent)"),
  },
  async ({ name }) => {
    const state = getProjectState(db, name);
    return {
      content: [
        {
          type: "text" as const,
          text: state
            ? JSON.stringify(state, null, 2)
            : JSON.stringify({ message: "No project state found" }),
        },
      ],
    };
  }
);

// ============================================================
// Tool 9: memory_update_project_state
// ============================================================
server.tool(
  "memory_update_project_state",
  "Update or create project state",
  {
    name: z.string().describe("Project name"),
    description: z.string().describe("Project description"),
    current_phase: z.string().describe("Current phase of the project"),
    blockers: z.array(z.string()).optional().describe("List of current blockers"),
  },
  async ({ name, description, current_phase, blockers }) => {
    const state = updateProjectState(
      db,
      name,
      description,
      current_phase,
      blockers ?? []
    );
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(state, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 10: memory_log_decision
// ============================================================
server.tool(
  "memory_log_decision",
  "Log an architectural or strategic decision",
  {
    agent_id: z.string().describe("The agent ID making the decision"),
    title: z.string().describe("Decision title"),
    context: z.string().describe("Context and background"),
    decision: z.string().describe("The decision made"),
    alternatives: z.array(z.string()).optional().describe("Alternatives considered"),
    consequences: z.array(z.string()).optional().describe("Expected consequences"),
  },
  async ({ agent_id, title, context, decision, alternatives, consequences }) => {
    ensureAgent(agent_id);
    const entry = logDecision(
      db,
      agent_id,
      title,
      context,
      decision,
      alternatives ?? [],
      consequences ?? []
    );
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(entry, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 11: memory_get_decisions
// ============================================================
server.tool(
  "memory_get_decisions",
  "Retrieve logged decisions",
  {
    agent_id: z.string().optional().describe("Filter by agent ID"),
    limit: z.number().optional().describe("Max results"),
  },
  async ({ agent_id, limit }) => {
    const decisions = getDecisions(db, { agentId: agent_id, limit });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(decisions, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 12: memory_create_task
// ============================================================
server.tool(
  "memory_create_task",
  "Create a new task",
  {
    title: z.string().describe("Task title"),
    description: z.string().describe("Task description"),
    priority: z
      .enum(["critical", "high", "medium", "low"])
      .describe("Task priority"),
    assigned_to: z.string().optional().describe("Agent ID to assign to"),
    depends_on: z.array(z.string()).optional().describe("Task IDs this depends on"),
  },
  async ({ title, description, priority, assigned_to, depends_on }) => {
    if (assigned_to) {
      ensureAgent(assigned_to);
    }
    const task = createTask(
      db,
      title,
      description,
      priority,
      assigned_to ?? null,
      depends_on ?? []
    );
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 13: memory_update_task
// ============================================================
server.tool(
  "memory_update_task",
  "Update an existing task",
  {
    task_id: z.string().describe("The task ID to update"),
    status: z
      .enum(["pending", "in_progress", "completed", "blocked"])
      .optional()
      .describe("New status"),
    assigned_to: z.string().optional().describe("New assignee agent ID"),
    output: z.string().optional().describe("Task output/result"),
  },
  async ({ task_id, status, assigned_to, output }) => {
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (assigned_to !== undefined) {
      ensureAgent(assigned_to);
      updates.assigned_to = assigned_to;
    }
    if (output !== undefined) updates.output = output;

    const task = updateTask(db, task_id, updates as Parameters<typeof updateTask>[2]);
    return {
      content: [
        {
          type: "text" as const,
          text: task
            ? JSON.stringify(task, null, 2)
            : JSON.stringify({ error: "Task not found" }),
        },
      ],
    };
  }
);

// ============================================================
// Tool 14: memory_get_tasks
// ============================================================
server.tool(
  "memory_get_tasks",
  "Query tasks with filters",
  {
    status: z
      .enum(["pending", "in_progress", "completed", "blocked"])
      .optional()
      .describe("Filter by status"),
    assigned_to: z.string().optional().describe("Filter by assignee"),
    limit: z.number().optional().describe("Max results"),
  },
  async ({ status, assigned_to, limit }) => {
    const tasks = getTasks(db, {
      status,
      assignedTo: assigned_to,
      limit,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 15: memory_get_ready_tasks
// ============================================================
server.tool(
  "memory_get_ready_tasks",
  "Get tasks ready to execute (all dependencies completed, status pending)",
  {},
  async () => {
    const tasks = getReadyTasks(db);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 16: memory_get_context
// ============================================================
server.tool(
  "memory_get_context",
  "Get assembled context package for an agent (token-budgeted)",
  {
    agent_id: z.string().describe("The agent ID"),
    budget_tokens: z.number().optional().describe("Token budget (default 4000)"),
  },
  async ({ agent_id, budget_tokens }) => {
    ensureAgent(agent_id);
    const ctx = assembleContext(db, agent_id, {
      budgetTokens: budget_tokens,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(ctx, null, 2),
        },
      ],
    };
  }
);

// ============================================================
// Tool 17: memory_compact
// ============================================================
server.tool(
  "memory_compact",
  "Run memory compaction (archive old/low-quality memories, expire working memory)",
  {
    decay_hours: z.number().optional().describe("Hours before episodes decay (default 6)"),
    min_importance: z
      .number()
      .optional()
      .describe("Max importance to archive (default 0.3)"),
    min_confidence: z
      .number()
      .optional()
      .describe("Min confidence below which facts are archived (default 0.2)"),
  },
  async ({ decay_hours, min_importance, min_confidence }) => {
    const logs = runCompaction(db, {
      decayHours: decay_hours,
      minImportance: min_importance,
      minConfidence: min_confidence,
    });
    return {
      content: [
        {
          type: "text" as const,
          text:
            logs.length > 0
              ? JSON.stringify(logs, null, 2)
              : JSON.stringify({ message: "No compaction needed" }),
        },
      ],
    };
  }
);

// ---- Start server ----

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agent Memory MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

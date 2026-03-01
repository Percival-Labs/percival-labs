// Watcher — Automated rule enforcement for task state transitions.
// Runs on every state transition attempt. Blocks invalid transitions and logs enforcement actions.

import type { TaskNode } from './dag';
import type { Evidence } from './evidence';
import { validateEvidence } from './evidence';

// ── Types ──

export type TaskStatus = TaskNode['status'];

export interface StateTransition {
  taskId: string;
  from: TaskStatus;
  to: TaskStatus;
  actor: string;         // agent name performing the transition (lowercase)
  task: TaskNode;        // full task node (for context like assignedTo, subtasks)
  evidence?: Evidence;   // required when transitioning to evidence_submitted
  subtasks?: TaskNode[]; // child tasks (for dependency enforcement)
}

export interface WatcherResult {
  blocked: boolean;
  rule?: string;
  reason?: string;
}

export interface WatcherRule {
  name: string;
  description: string;
  check: (transition: StateTransition) => WatcherResult | undefined;
}

// ── Rules ──

const dispatchControl: WatcherRule = {
  name: 'dispatch_control',
  description: 'Only Coordinator can assign tasks (transition to in_progress)',
  check: (t) => {
    // Coordinator dispatches tasks from queued/pending → in_progress
    if (t.to === 'in_progress' && t.from !== 'blocked') {
      if (t.actor !== 'coordinator' && t.actor !== 'system') {
        return { blocked: true, rule: 'dispatch_control', reason: 'Only Coordinator can dispatch tasks' };
      }
    }
    return undefined;
  },
};

const evidenceRequired: WatcherRule = {
  name: 'evidence_required',
  description: 'Cannot skip evidence_submitted — no direct in_progress → completed',
  check: (t) => {
    if (t.from === 'in_progress' && t.to === 'completed') {
      // Must go through evidence_submitted first
      return {
        blocked: true,
        rule: 'evidence_required',
        reason: 'Cannot transition directly to completed. Submit evidence first (in_progress → evidence_submitted → completed)',
      };
    }
    return undefined;
  },
};

const evidenceValidation: WatcherRule = {
  name: 'evidence_validation',
  description: 'Evidence must be present and valid when transitioning to evidence_submitted',
  check: (t) => {
    if (t.to === 'evidence_submitted') {
      if (!t.evidence) {
        return {
          blocked: true,
          rule: 'evidence_validation',
          reason: 'Evidence is required when transitioning to evidence_submitted',
        };
      }
      const validation = validateEvidence(t.evidence);
      if (!validation.valid) {
        return {
          blocked: true,
          rule: 'evidence_validation',
          reason: `Evidence validation failed: ${validation.errors.join('; ')}`,
        };
      }
    }
    return undefined;
  },
};

const dependencyEnforcement: WatcherRule = {
  name: 'dependency_enforcement',
  description: 'Parent tasks cannot close before all subtasks complete',
  check: (t) => {
    if ((t.to === 'completed' || t.to === 'evidence_submitted') && t.subtasks && t.subtasks.length > 0) {
      const incomplete = t.subtasks.filter(
        s => s.status !== 'completed' && s.status !== 'failed'
      );
      if (incomplete.length > 0) {
        return {
          blocked: true,
          rule: 'dependency_enforcement',
          reason: `${incomplete.length} subtask(s) still open: ${incomplete.map(s => s.id).join(', ')}`,
        };
      }
    }
    return undefined;
  },
};

const noSelfAssign: WatcherRule = {
  name: 'no_self_assign',
  description: 'Agents cannot assign themselves tasks',
  check: (t) => {
    // Self-assignment = the actor is also the assignedTo and they're moving to in_progress
    // But allow system/coordinator to assign to anyone
    if (t.to === 'in_progress' && t.actor !== 'coordinator' && t.actor !== 'system') {
      if (t.actor === (t.task.assignedTo?.toLowerCase() ?? '')) {
        return { blocked: true, rule: 'no_self_assign', reason: 'Agents cannot self-assign tasks' };
      }
    }
    return undefined;
  },
};

const doneImmutable: WatcherRule = {
  name: 'done_immutable',
  description: 'Completed tasks are immutable — cannot transition to anything else',
  check: (t) => {
    if (t.from === 'completed' && t.to !== 'completed') {
      return {
        blocked: true,
        rule: 'done_immutable',
        reason: 'Completed tasks are immutable — create a new task to revisit',
      };
    }
    return undefined;
  },
};

const failedImmutable: WatcherRule = {
  name: 'failed_immutable',
  description: 'Failed tasks are immutable — create a new task to retry',
  check: (t) => {
    if (t.from === 'failed') {
      return {
        blocked: true,
        rule: 'failed_immutable',
        reason: 'Failed tasks are immutable — create a new task referencing the old one',
      };
    }
    return undefined;
  },
};

const assignedAgentOnly: WatcherRule = {
  name: 'assigned_agent_only',
  description: 'Only the assigned agent can submit evidence or report blocked status',
  check: (t) => {
    if (['evidence_submitted', 'blocked'].includes(t.to)) {
      const assignedTo = t.task.assignedTo?.toLowerCase() ?? '';
      if (t.actor !== assignedTo && t.actor !== 'coordinator' && t.actor !== 'system') {
        return {
          blocked: true,
          rule: 'assigned_agent_only',
          reason: `Only assigned agent (${t.task.assignedTo}) can update this task`,
        };
      }
    }
    return undefined;
  },
};

// ── Rule Registry ──

export const WATCHER_RULES: WatcherRule[] = [
  dispatchControl,
  evidenceRequired,
  evidenceValidation,
  dependencyEnforcement,
  noSelfAssign,
  doneImmutable,
  failedImmutable,
  assignedAgentOnly,
];

// ── Enforcement ──

export interface WatcherEnforcementResult {
  allowed: boolean;
  blockedBy?: WatcherResult;
  checkedRules: number;
}

/**
 * Check a state transition against all watcher rules.
 * Returns the first blocking result, or { allowed: true } if all rules pass.
 */
export function checkTransition(transition: StateTransition): WatcherEnforcementResult {
  for (const rule of WATCHER_RULES) {
    const result = rule.check(transition);
    if (result?.blocked) {
      return {
        allowed: false,
        blockedBy: result,
        checkedRules: WATCHER_RULES.indexOf(rule) + 1,
      };
    }
  }

  return { allowed: true, checkedRules: WATCHER_RULES.length };
}

/**
 * Format a watcher enforcement result for logging/audit.
 */
export function formatAuditEntry(
  transition: StateTransition,
  result: WatcherEnforcementResult,
): string {
  const time = new Date().toISOString();

  if (!result.allowed && result.blockedBy) {
    return (
      `[WATCHER] BLOCKED: ${transition.taskId} transition ${transition.from} → ${transition.to}\n` +
      `  Agent: ${transition.actor}\n` +
      `  Rule: ${result.blockedBy.rule}\n` +
      `  Reason: ${result.blockedBy.reason}\n` +
      `  Time: ${time}`
    );
  }

  let entry = `[WATCHER] ALLOWED: ${transition.taskId} transition ${transition.from} → ${transition.to}\n` +
    `  Agent: ${transition.actor}\n`;

  if (transition.evidence) {
    entry += `  Evidence: ${transition.evidence.type} (${transition.evidence.summary})\n`;
  }

  entry += `  Time: ${time}`;
  return entry;
}

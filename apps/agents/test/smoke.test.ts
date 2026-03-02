// Phase 4 Smoke Tests — Task Accountability System
// Tests all 7 scenarios from docs/task-accountability-system.md:
//   1. Unauthorized dispatch blocked
//   2. DONE without evidence blocked
//   3. Parent closing early blocked
//   4. Valid evidence flow succeeds
//   5. Conflicting status after DONE blocked
//   6. BLOCKED resume works
//   7. Full DAG completion (decompose + assign + execute + evidence + done)

import { describe, expect, it, beforeEach } from 'bun:test';
import { TaskDAG, WatcherBlockedError, type TaskNode } from '../src/tasks/dag';
import { createEvidence, scoreEvidence } from '../src/tasks/evidence';
import { scoreOnly } from '../src/tasks/vouch-reporter';

// ── Helpers ──

function addTaskToDag(dag: TaskDAG, overrides: Partial<Omit<TaskNode, 'id' | 'createdAt'>> = {}): string {
  return dag.addTask({
    title: 'Task',
    description: 'Task description',
    priority: 'medium',
    status: 'pending',
    assignedTo: null,
    dependsOn: [],
    output: null,
    depth: 0,
    parentId: null,
    ...overrides,
  });
}

// ── Smoke Tests ──

describe('Smoke Tests — Task Accountability System', () => {
  let dag: TaskDAG;

  beforeEach(() => {
    dag = new TaskDAG();
  });

  // Scenario 1: Unauthorized dispatch
  it('S1: blocks non-coordinator from dispatching task (pending → in_progress)', () => {
    const id = addTaskToDag(dag);

    expect(() => {
      dag.updateTask(id, { status: 'in_progress', assignedTo: 'Builder' }, 'builder');
    }).toThrow(WatcherBlockedError);

    // Task remains pending
    expect(dag.getTask(id)!.status).toBe('pending');
  });

  // Scenario 2: DONE without evidence
  it('S2: blocks marking task DONE without going through evidence submission', () => {
    const id = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'Builder',
    });

    // Try direct completion
    expect(() => {
      dag.updateTask(id, { status: 'completed' }, 'system');
    }).toThrow(WatcherBlockedError);

    // Try with empty evidence
    expect(() => {
      dag.updateTask(id, {
        status: 'evidence_submitted',
        evidence: createEvidence('', '', 'code_change', '', []),
      }, 'builder');
    }).toThrow(WatcherBlockedError);

    expect(dag.getTask(id)!.status).toBe('in_progress');
  });

  // Scenario 3: Parent closing early
  it('S3: blocks parent task completion while subtasks are still open', () => {
    const parentId = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'Coordinator',
    });

    // Create 3 subtasks: one completed, one in_progress, one pending
    const child1 = addTaskToDag(dag, {
      title: 'Subtask 1',
      status: 'in_progress',
      assignedTo: 'Builder',
      depth: 1,
      parentId,
    });
    addTaskToDag(dag, {
      title: 'Subtask 2',
      status: 'in_progress',
      assignedTo: 'Reviewer',
      depth: 1,
      parentId,
    });
    addTaskToDag(dag, {
      title: 'Subtask 3',
      status: 'pending',
      depth: 1,
      parentId,
    });

    // Complete child 1
    dag.updateTask(child1, {
      status: 'evidence_submitted',
      evidence: createEvidence(child1, 'builder', 'code_change', 'Done', [
        { type: 'diff', details: 'changes' },
        { type: 'test_output', result: 'pass' },
      ]),
    }, 'builder');
    expect(dag.getTask(child1)!.status).toBe('completed');

    // Try to complete parent — should fail (2 subtasks still open)
    const parentEvidence = createEvidence(
      parentId, 'coordinator', 'coordination', 'Rollup',
      [{ type: 'subtask_rollup', details: 'Only 1/3 done' }],
    );

    expect(() => {
      dag.updateTask(parentId, {
        status: 'evidence_submitted',
        evidence: parentEvidence,
      }, 'coordinator');
    }).toThrow(WatcherBlockedError);

    expect(dag.getTask(parentId)!.status).toBe('in_progress');
  });

  // Scenario 4: Valid evidence flow
  it('S4: accepts valid evidence and auto-completes task', () => {
    const id = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'Builder',
    });

    const evidence = createEvidence(
      id, 'builder', 'code_change', 'Implemented auth feature',
      [
        { type: 'diff', path: 'src/auth.ts', details: '+120/-45 lines' },
        { type: 'test_output', result: 'pass', count: 15, failures: 0 },
      ],
    );

    dag.updateTask(id, {
      status: 'evidence_submitted',
      evidence,
    }, 'builder');

    const task = dag.getTask(id)!;
    expect(task.status).toBe('completed');
    expect(task.evidence).toBeDefined();
    expect(task.evidence!.summary).toBe('Implemented auth feature');

    // Verify evidence scores correctly
    const score = scoreEvidence(evidence);
    expect(score.quality).toBe(1.0);
  });

  // Scenario 5: Conflicting status after DONE
  it('S5: blocks any state change on a completed task', () => {
    const id = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'Builder',
    });

    // Complete it properly
    dag.updateTask(id, {
      status: 'evidence_submitted',
      evidence: createEvidence(id, 'builder', 'code_change', 'Done', [
        { type: 'diff', details: 'changes' },
        { type: 'test_output', result: 'pass' },
      ]),
    }, 'builder');
    expect(dag.getTask(id)!.status).toBe('completed');

    // Try to move back to in_progress
    expect(() => {
      dag.updateTask(id, { status: 'in_progress' }, 'system');
    }).toThrow(WatcherBlockedError);

    // Try to move to failed
    expect(() => {
      dag.updateTask(id, { status: 'failed' }, 'system');
    }).toThrow(WatcherBlockedError);

    // Try to move to blocked
    expect(() => {
      dag.updateTask(id, { status: 'blocked' }, 'system');
    }).toThrow(WatcherBlockedError);

    // Still completed
    expect(dag.getTask(id)!.status).toBe('completed');
  });

  // Scenario 6: BLOCKED resume
  it('S6: allows resuming a blocked task back to in_progress', () => {
    const id = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'Builder',
    });

    // Block the task
    dag.updateTask(id, { status: 'blocked' }, 'builder');
    expect(dag.getTask(id)!.status).toBe('blocked');

    // Resume back to in_progress (coordinator dispatches)
    dag.updateTask(id, { status: 'in_progress' }, 'coordinator');
    expect(dag.getTask(id)!.status).toBe('in_progress');

    // Now complete it properly
    dag.updateTask(id, {
      status: 'evidence_submitted',
      evidence: createEvidence(id, 'builder', 'code_change', 'Fixed', [
        { type: 'diff', details: 'fix' },
        { type: 'test_output', result: 'pass' },
      ]),
    }, 'builder');
    expect(dag.getTask(id)!.status).toBe('completed');
  });

  // Scenario 7: Full DAG completion
  it('S7: full lifecycle — decompose → assign → execute → evidence → done', () => {
    const auditLog: string[] = [];
    dag.onAudit((entry, _blocked) => {
      auditLog.push(entry);
    });

    // Step 1: Create parent task
    const parentId = addTaskToDag(dag, {
      title: 'Build auth system',
      assignedTo: 'Coordinator',
    });

    // Step 2: Coordinator dispatches (sets to in_progress)
    dag.updateTask(parentId, { status: 'in_progress' }, 'coordinator');
    expect(dag.getTask(parentId)!.status).toBe('in_progress');

    // Step 3: Decompose into subtasks
    const child1 = addTaskToDag(dag, {
      title: 'Implement auth service',
      depth: 1,
      parentId,
    });
    const child2 = addTaskToDag(dag, {
      title: 'Review auth service',
      depth: 1,
      parentId,
      dependsOn: [child1],
    });

    // Step 4: Coordinator assigns subtasks
    dag.updateTask(child1, { status: 'in_progress', assignedTo: 'Builder' }, 'coordinator');
    expect(dag.getTask(child1)!.status).toBe('in_progress');

    // Step 5: Builder completes with evidence
    const builderEvidence = createEvidence(
      child1, 'builder', 'code_change', 'Auth service implemented',
      [
        { type: 'diff', path: 'src/auth/', details: '+350/-0' },
        { type: 'test_output', result: 'pass', count: 22, failures: 0 },
      ],
    );

    dag.updateTask(child1, {
      status: 'evidence_submitted',
      evidence: builderEvidence,
    }, 'builder');
    expect(dag.getTask(child1)!.status).toBe('completed');

    // Score the builder's evidence
    const builderScore = scoreOnly(builderEvidence);
    expect(builderScore.quality).toBe(1.0);

    // Step 6: Coordinator assigns review
    dag.updateTask(child2, { status: 'in_progress', assignedTo: 'Reviewer' }, 'coordinator');

    // Step 7: Reviewer completes with review evidence
    const reviewEvidence = createEvidence(
      child2, 'reviewer', 'review', 'Auth review complete',
      [{ type: 'checklist', details: 'Reviewed auth flow, input validation, error handling, token expiry, rate limiting — all pass. One suggestion: add refresh token rotation.' }],
    );

    dag.updateTask(child2, {
      status: 'evidence_submitted',
      evidence: reviewEvidence,
    }, 'reviewer');
    expect(dag.getTask(child2)!.status).toBe('completed');

    const reviewScore = scoreOnly(reviewEvidence);
    expect(reviewScore.quality).toBe(1.0);

    // Step 8: Coordinator completes parent with rollup
    const coordEvidence = createEvidence(
      parentId, 'coordinator', 'coordination', 'Auth system complete',
      [{ type: 'subtask_rollup', details: `Builder: ${child1} (pass). Reviewer: ${child2} (pass). All subtasks completed.` }],
    );

    dag.updateTask(parentId, {
      status: 'evidence_submitted',
      evidence: coordEvidence,
    }, 'coordinator');
    expect(dag.getTask(parentId)!.status).toBe('completed');

    // Verify all tasks completed
    expect(dag.getTask(child1)!.status).toBe('completed');
    expect(dag.getTask(child2)!.status).toBe('completed');
    expect(dag.getTask(parentId)!.status).toBe('completed');

    // Verify audit trail was generated
    expect(auditLog.length).toBeGreaterThan(0);
  });
});

// ── Cross-Role Evidence Validation Smoke ──

describe('Cross-role evidence validation', () => {
  it('rejects builder submitting review evidence', () => {
    const dag = new TaskDAG();
    const id = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'Builder',
    });

    // Builder tries to submit review evidence (wrong type for role)
    const wrongEvidence = createEvidence(
      id, 'builder', 'review', 'Code review',
      [{ type: 'checklist', details: 'Reviewed everything' }],
    );

    expect(() => {
      dag.updateTask(id, {
        status: 'evidence_submitted',
        evidence: wrongEvidence,
      }, 'builder');
    }).toThrow(WatcherBlockedError);
  });

  it('rejects researcher evidence without confidence', () => {
    const dag = new TaskDAG();
    const id = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'Researcher',
    });

    const noConfidence = createEvidence(
      id, 'researcher', 'research', 'Researched topic',
      [{ type: 'source', details: 'arxiv paper' }],
      // No confidence score!
    );

    expect(() => {
      dag.updateTask(id, {
        status: 'evidence_submitted',
        evidence: noConfidence,
      }, 'researcher');
    }).toThrow(WatcherBlockedError);
  });

  it('accepts researcher evidence with confidence', () => {
    const dag = new TaskDAG();
    const id = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'Researcher',
    });

    const validResearch = createEvidence(
      id, 'researcher', 'research', 'Market analysis complete',
      [{ type: 'source', details: 'Industry report, competitor analysis, market sizing data' }],
      { confidence: 0.85 },
    );

    dag.updateTask(id, {
      status: 'evidence_submitted',
      evidence: validResearch,
    }, 'researcher');

    expect(dag.getTask(id)!.status).toBe('completed');
  });

  it('workergeneral can submit multiple evidence types', () => {
    const dag = new TaskDAG();

    // WorkerGeneral submitting code_change
    const id1 = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'WorkerGeneral',
    });
    dag.updateTask(id1, {
      status: 'evidence_submitted',
      evidence: createEvidence(id1, 'workergeneral', 'code_change', 'Coded', [
        { type: 'diff', details: 'changes' },
        { type: 'test_output', result: 'pass' },
      ]),
    }, 'workergeneral');
    expect(dag.getTask(id1)!.status).toBe('completed');

    // WorkerGeneral submitting research
    const id2 = addTaskToDag(dag, {
      status: 'in_progress',
      assignedTo: 'WorkerGeneral',
    });
    dag.updateTask(id2, {
      status: 'evidence_submitted',
      evidence: createEvidence(id2, 'workergeneral', 'research', 'Researched', [
        { type: 'source', details: 'paper' },
      ], { confidence: 0.7 }),
    }, 'workergeneral');
    expect(dag.getTask(id2)!.status).toBe('completed');
  });
});

// ── Evidence Scoring Smoke ──

describe('Evidence scoring integration', () => {
  it('low-quality evidence still passes validation but scores low', () => {
    const evidence = createEvidence(
      'task_1', 'builder', 'code_change', 'Quick fix',
      [
        { type: 'diff', details: 'one line change' },
        { type: 'test_output', result: 'fail' },
      ],
    );

    const score = scoreEvidence(evidence);
    expect(score.quality).toBeGreaterThan(0);
    expect(score.quality).toBeLessThan(0.5);
  });

  it('quality-to-rating mapping covers full range', () => {
    // Simulate the qualityToRating logic from vouch-reporter
    const ratings = [0.95, 0.75, 0.55, 0.35, 0.15].map(q => {
      if (q >= 0.9) return 5;
      if (q >= 0.7) return 4;
      if (q >= 0.5) return 3;
      if (q >= 0.3) return 2;
      return 1;
    });
    expect(ratings).toEqual([5, 4, 3, 2, 1]);
  });
});

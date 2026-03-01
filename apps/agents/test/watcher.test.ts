// Watcher + Evidence + DAG integration tests
// Tests all 7 watcher rules plus evidence validation and DAG state machine.

import { describe, expect, it, beforeEach } from 'bun:test';
import { TaskDAG, type TaskNode, WatcherBlockedError } from '../src/tasks/dag';
import { checkTransition, type StateTransition } from '../src/tasks/watcher';
import {
  validateEvidence,
  createEvidence,
  type Evidence,
  type EvidenceArtifact,
} from '../src/tasks/evidence';

// ── Helpers ──

function makeTask(overrides: Partial<TaskNode> = {}): TaskNode {
  return {
    id: 'task_test_0001',
    title: 'Test task',
    description: 'A test task',
    priority: 'medium',
    status: 'pending',
    assignedTo: null,
    dependsOn: [],
    output: null,
    createdAt: new Date().toISOString(),
    depth: 0,
    parentId: null,
    ...overrides,
  };
}

function makeTransition(overrides: Partial<StateTransition> = {}): StateTransition {
  return {
    taskId: 'task_test_0001',
    from: 'pending',
    to: 'in_progress',
    actor: 'coordinator',
    task: makeTask(),
    ...overrides,
  };
}

function makeValidCodeEvidence(taskId = 'task_test_0001'): Evidence {
  return createEvidence(
    taskId,
    'builder',
    'code_change',
    'Implemented feature X',
    [
      { type: 'diff', path: 'src/feature.ts', details: '+42/-8' },
      { type: 'test_output', result: 'pass', count: 12, failures: 0 },
    ],
  );
}

// ── Evidence Validation ──

describe('validateEvidence', () => {
  it('accepts valid code_change evidence', () => {
    const evidence = makeValidCodeEvidence();
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects empty summary', () => {
    const evidence = makeValidCodeEvidence();
    evidence.summary = '';
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('summary'))).toBe(true);
  });

  it('rejects no artifacts', () => {
    const evidence = makeValidCodeEvidence();
    evidence.artifacts = [];
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('artifact'))).toBe(true);
  });

  it('rejects code_change without diff', () => {
    const evidence = createEvidence(
      'task_1', 'builder', 'code_change', 'Did stuff',
      [{ type: 'test_output', result: 'pass' }],
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('diff'))).toBe(true);
  });

  it('rejects code_change without test_output', () => {
    const evidence = createEvidence(
      'task_1', 'builder', 'code_change', 'Did stuff',
      [{ type: 'diff', details: 'some changes' }],
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('test output'))).toBe(true);
  });

  it('rejects review without checklist', () => {
    const evidence = createEvidence(
      'task_1', 'reviewer', 'review', 'Reviewed code',
      [{ type: 'diff', details: 'wrong type' }],
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('checklist'))).toBe(true);
  });

  it('accepts valid review evidence', () => {
    const evidence = createEvidence(
      'task_1', 'reviewer', 'review', 'Reviewed 3 files',
      [{ type: 'checklist', details: '3 files reviewed, 2 issues' }],
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(true);
  });

  it('rejects scan without scan_output', () => {
    const evidence = createEvidence(
      'task_1', 'auditor', 'scan', 'Scanned deps',
      [{ type: 'diff', details: 'wrong' }],
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('scan_output'))).toBe(true);
  });

  it('rejects research without source', () => {
    const evidence = createEvidence(
      'task_1', 'researcher', 'research', 'Researched topic',
      [{ type: 'diff', details: 'wrong' }],
      { confidence: 0.85 },
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('source'))).toBe(true);
  });

  it('rejects research without confidence score', () => {
    const evidence = createEvidence(
      'task_1', 'researcher', 'research', 'Researched topic',
      [{ type: 'source', details: 'arxiv paper' }],
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('confidence'))).toBe(true);
  });

  it('accepts valid research evidence', () => {
    const evidence = createEvidence(
      'task_1', 'researcher', 'research', 'Researched topic',
      [{ type: 'source', details: 'arxiv paper, github repo' }],
      { confidence: 0.85 },
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(true);
  });

  it('rejects asset without file or url', () => {
    const evidence = createEvidence(
      'task_1', 'artist', 'asset', 'Created sprite',
      [{ type: 'diff', details: 'wrong' }],
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('file or URL'))).toBe(true);
  });

  it('rejects coordination without subtask_rollup', () => {
    const evidence = createEvidence(
      'task_1', 'coordinator', 'coordination', 'Coordinated tasks',
      [{ type: 'diff', details: 'wrong' }],
    );
    const result = validateEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('subtask_rollup'))).toBe(true);
  });
});

// ── Watcher Rules (Unit) ──

describe('checkTransition', () => {
  // Rule 1: dispatch_control
  describe('dispatch_control', () => {
    it('allows coordinator to dispatch tasks', () => {
      const result = checkTransition(makeTransition({
        from: 'pending',
        to: 'in_progress',
        actor: 'coordinator',
      }));
      expect(result.allowed).toBe(true);
    });

    it('allows system to dispatch tasks', () => {
      const result = checkTransition(makeTransition({
        from: 'pending',
        to: 'in_progress',
        actor: 'system',
      }));
      expect(result.allowed).toBe(true);
    });

    it('blocks non-coordinator from dispatching', () => {
      const result = checkTransition(makeTransition({
        from: 'pending',
        to: 'in_progress',
        actor: 'builder',
      }));
      expect(result.allowed).toBe(false);
      expect(result.blockedBy?.rule).toBe('dispatch_control');
    });
  });

  // Rule 2: evidence_required
  describe('evidence_required', () => {
    it('blocks direct in_progress → completed transition', () => {
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'completed',
        actor: 'system',
        task: makeTask({ status: 'in_progress' }),
      }));
      expect(result.allowed).toBe(false);
      expect(result.blockedBy?.rule).toBe('evidence_required');
    });
  });

  // Rule 3: evidence_validation
  describe('evidence_validation', () => {
    it('blocks evidence_submitted without evidence', () => {
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'evidence_submitted',
        actor: 'builder',
        task: makeTask({ status: 'in_progress', assignedTo: 'Builder' }),
        evidence: undefined,
      }));
      expect(result.allowed).toBe(false);
      expect(result.blockedBy?.rule).toBe('evidence_validation');
    });

    it('blocks evidence_submitted with invalid evidence', () => {
      const badEvidence = createEvidence('task_1', 'builder', 'code_change', '', []);
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'evidence_submitted',
        actor: 'builder',
        task: makeTask({ status: 'in_progress', assignedTo: 'Builder' }),
        evidence: badEvidence,
      }));
      expect(result.allowed).toBe(false);
      expect(result.blockedBy?.rule).toBe('evidence_validation');
    });

    it('allows evidence_submitted with valid evidence', () => {
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'evidence_submitted',
        actor: 'builder',
        task: makeTask({ status: 'in_progress', assignedTo: 'Builder' }),
        evidence: makeValidCodeEvidence(),
      }));
      expect(result.allowed).toBe(true);
    });
  });

  // Rule 4: dependency_enforcement
  describe('dependency_enforcement', () => {
    it('blocks parent completion when subtasks are open', () => {
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'evidence_submitted',
        actor: 'coordinator',
        task: makeTask({ status: 'in_progress', assignedTo: 'Coordinator' }),
        evidence: createEvidence(
          'task_1', 'coordinator', 'coordination', 'Rollup',
          [{ type: 'subtask_rollup', details: 'subtasks' }],
        ),
        subtasks: [
          makeTask({ id: 'sub_1', status: 'completed', parentId: 'task_test_0001' }),
          makeTask({ id: 'sub_2', status: 'in_progress', parentId: 'task_test_0001' }),
        ],
      }));
      expect(result.allowed).toBe(false);
      expect(result.blockedBy?.rule).toBe('dependency_enforcement');
      expect(result.blockedBy?.reason).toContain('sub_2');
    });

    it('allows parent completion when all subtasks are done or failed', () => {
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'evidence_submitted',
        actor: 'coordinator',
        task: makeTask({ status: 'in_progress', assignedTo: 'Coordinator' }),
        evidence: createEvidence(
          'task_1', 'coordinator', 'coordination', 'Rollup',
          [{ type: 'subtask_rollup', details: 'subtasks' }],
        ),
        subtasks: [
          makeTask({ id: 'sub_1', status: 'completed', parentId: 'task_test_0001' }),
          makeTask({ id: 'sub_2', status: 'failed', parentId: 'task_test_0001' }),
        ],
      }));
      expect(result.allowed).toBe(true);
    });

    it('allows completion for tasks with no subtasks', () => {
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'evidence_submitted',
        actor: 'builder',
        task: makeTask({ status: 'in_progress', assignedTo: 'Builder' }),
        evidence: makeValidCodeEvidence(),
        subtasks: [],
      }));
      expect(result.allowed).toBe(true);
    });
  });

  // Rule 5: no_self_assign
  describe('no_self_assign', () => {
    it('blocks agent from self-assigning', () => {
      const result = checkTransition(makeTransition({
        from: 'pending',
        to: 'in_progress',
        actor: 'builder',
        task: makeTask({ status: 'pending', assignedTo: 'Builder' }),
      }));
      expect(result.allowed).toBe(false);
      expect(result.blockedBy?.rule).toBe('dispatch_control');
    });
  });

  // Rule 6: done_immutable
  describe('done_immutable', () => {
    it('blocks any transition from completed', () => {
      const result = checkTransition(makeTransition({
        from: 'completed',
        to: 'in_progress',
        actor: 'system',
        task: makeTask({ status: 'completed' }),
      }));
      expect(result.allowed).toBe(false);
      expect(result.blockedBy?.rule).toBe('done_immutable');
    });
  });

  // Rule 7: failed_immutable
  describe('failed_immutable', () => {
    it('blocks any transition from failed', () => {
      const result = checkTransition(makeTransition({
        from: 'failed',
        to: 'pending',
        actor: 'system',
        task: makeTask({ status: 'failed' }),
      }));
      expect(result.allowed).toBe(false);
      expect(result.blockedBy?.rule).toBe('failed_immutable');
    });
  });

  // Rule 8: assigned_agent_only
  describe('assigned_agent_only', () => {
    it('blocks non-assigned agent from submitting evidence', () => {
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'evidence_submitted',
        actor: 'reviewer',
        task: makeTask({ status: 'in_progress', assignedTo: 'Builder' }),
        evidence: makeValidCodeEvidence(),
      }));
      expect(result.allowed).toBe(false);
      expect(result.blockedBy?.rule).toBe('assigned_agent_only');
    });

    it('allows assigned agent to submit evidence', () => {
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'evidence_submitted',
        actor: 'builder',
        task: makeTask({ status: 'in_progress', assignedTo: 'Builder' }),
        evidence: makeValidCodeEvidence(),
      }));
      expect(result.allowed).toBe(true);
    });

    it('allows coordinator to update any task', () => {
      const result = checkTransition(makeTransition({
        from: 'in_progress',
        to: 'blocked',
        actor: 'coordinator',
        task: makeTask({ status: 'in_progress', assignedTo: 'Builder' }),
      }));
      expect(result.allowed).toBe(true);
    });
  });
});

// ── DAG + Watcher Integration ──

describe('TaskDAG with watcher', () => {
  let dag: TaskDAG;

  beforeEach(() => {
    dag = new TaskDAG();
  });

  it('allows normal task creation', () => {
    const id = dag.addTask({
      title: 'Test',
      description: 'Test task',
      priority: 'medium',
      status: 'pending',
      assignedTo: null,
      dependsOn: [],
      output: null,
      depth: 0,
      parentId: null,
    });
    expect(dag.getTask(id)).toBeDefined();
    expect(dag.getTask(id)!.status).toBe('pending');
  });

  it('blocks direct completion via updateTask', () => {
    const id = dag.addTask({
      title: 'Test',
      description: 'Test task',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'Builder',
      dependsOn: [],
      output: null,
      depth: 0,
      parentId: null,
    });

    expect(() => {
      dag.updateTask(id, { status: 'completed' }, 'system');
    }).toThrow(WatcherBlockedError);
  });

  it('auto-completes when valid evidence is submitted', () => {
    const id = dag.addTask({
      title: 'Test',
      description: 'Test task',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'Builder',
      dependsOn: [],
      output: null,
      depth: 0,
      parentId: null,
    });

    const evidence = makeValidCodeEvidence(id);

    dag.updateTask(id, {
      status: 'evidence_submitted',
      evidence,
    }, 'builder');

    // Should auto-advance to completed
    const task = dag.getTask(id)!;
    expect(task.status).toBe('completed');
    expect(task.evidence).toBeDefined();
  });

  it('blocks parent completion when subtask is open', () => {
    const parentId = dag.addTask({
      title: 'Parent',
      description: 'Parent task',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'Coordinator',
      dependsOn: [],
      output: null,
      depth: 0,
      parentId: null,
    });

    dag.addTask({
      title: 'Child',
      description: 'Child task',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'Builder',
      dependsOn: [],
      output: null,
      depth: 1,
      parentId: parentId,
    });

    const evidence = createEvidence(
      parentId, 'coordinator', 'coordination', 'Rollup',
      [{ type: 'subtask_rollup', details: 'subtasks' }],
    );

    expect(() => {
      dag.updateTask(parentId, {
        status: 'evidence_submitted',
        evidence,
      }, 'coordinator');
    }).toThrow(WatcherBlockedError);
  });

  it('allows parent completion when all subtasks done', () => {
    const parentId = dag.addTask({
      title: 'Parent',
      description: 'Parent task',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'Coordinator',
      dependsOn: [],
      output: null,
      depth: 0,
      parentId: null,
    });

    const childId = dag.addTask({
      title: 'Child',
      description: 'Child task',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'Builder',
      dependsOn: [],
      output: null,
      depth: 1,
      parentId: parentId,
    });

    // Complete child with evidence
    const childEvidence = makeValidCodeEvidence(childId);
    dag.updateTask(childId, {
      status: 'evidence_submitted',
      evidence: childEvidence,
    }, 'builder');
    expect(dag.getTask(childId)!.status).toBe('completed');

    // Now parent should be able to complete
    const parentEvidence = createEvidence(
      parentId, 'coordinator', 'coordination', 'All subtasks done',
      [{ type: 'subtask_rollup', details: `Subtask ${childId} completed` }],
    );

    dag.updateTask(parentId, {
      status: 'evidence_submitted',
      evidence: parentEvidence,
    }, 'coordinator');

    expect(dag.getTask(parentId)!.status).toBe('completed');
  });

  it('respects watcher disabled mode', () => {
    dag.setWatcherEnabled(false);

    const id = dag.addTask({
      title: 'Test',
      description: 'Test task',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'Builder',
      dependsOn: [],
      output: null,
      depth: 0,
      parentId: null,
    });

    // Direct completion should work when watcher is disabled
    dag.updateTask(id, { status: 'completed' });
    expect(dag.getTask(id)!.status).toBe('completed');
  });

  it('fires audit callback on transitions', () => {
    const auditLog: Array<{ entry: string; blocked: boolean }> = [];
    dag.onAudit((entry, blocked) => {
      auditLog.push({ entry, blocked });
    });

    const id = dag.addTask({
      title: 'Test',
      description: 'Test task',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'Builder',
      dependsOn: [],
      output: null,
      depth: 0,
      parentId: null,
    });

    const evidence = makeValidCodeEvidence(id);
    dag.updateTask(id, {
      status: 'evidence_submitted',
      evidence,
    }, 'builder');

    // Should have audit entries for:
    // 1. ALLOWED: evidence_submitted transition
    // 2. AUTO: evidence_submitted → completed
    expect(auditLog.length).toBeGreaterThanOrEqual(1);
    expect(auditLog.some(a => !a.blocked)).toBe(true);
  });

  it('getSubtasks returns children', () => {
    const parentId = dag.addTask({
      title: 'Parent',
      description: 'Parent',
      priority: 'medium',
      status: 'pending',
      assignedTo: null,
      dependsOn: [],
      output: null,
      depth: 0,
      parentId: null,
    });

    dag.addTask({
      title: 'Child 1',
      description: 'C1',
      priority: 'medium',
      status: 'pending',
      assignedTo: null,
      dependsOn: [],
      output: null,
      depth: 1,
      parentId: parentId,
    });

    dag.addTask({
      title: 'Child 2',
      description: 'C2',
      priority: 'medium',
      status: 'pending',
      assignedTo: null,
      dependsOn: [],
      output: null,
      depth: 1,
      parentId: parentId,
    });

    const subtasks = dag.getSubtasks(parentId);
    expect(subtasks).toHaveLength(2);
  });
});

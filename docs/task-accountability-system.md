# Task Accountability System — Percival Labs Agent Team

> Adapted from JUMPERZ's Discord swarm accountability pattern.
> Layered onto our existing AgentTeam + TaskDAG + Discord bot architecture.

---

## What This Adds

Our current system has coordination (Coordinator decomposes, DAG tracks dependencies, proposals get human approval). What it lacks is **verification** — an agent can mark a task DONE with no proof, tasks can drift into invisible states, and the board can desync from reality.

This system adds:

1. **Task Ledger** — every task gets a unique ID, strict state machine, no ghost states
2. **Dispatch Control** — only Coordinator can assign, no self-assignment
3. **Evidence Policy** — DONE requires proof (code diff, test output, URL, attachment)
4. **Dependency Enforcement** — parent tasks cannot close before all subtasks complete
5. **Watcher** — automated rule enforcement, blocks invalid transitions
6. **Per-Agent Logs** — clean board + full audit trail per agent
7. **Vouch Integration** — evidence feeds into trust score, accountability has economic weight

---

## Channel Structure (New Additions)

### Existing (keep as-is)
```
#tasks          — submit tasks (!critical / !high / !low)
#proposals      — agent work plans awaiting approval (react to approve)
#results        — agent task outputs & deliverables
#activity       — live agent activity feed
#x-content      — draft tweets for review
```

### New: Per-Agent Log Channels
```
#log-coordinator    — Coordinator's verbose reasoning, decomposition traces
#log-builder        — Builder's implementation logs, commands run, errors hit
#log-reviewer       — Reviewer's review notes, test runs, edge cases found
#log-auditor        — Auditor's security scans, dependency checks, findings
#log-researcher     — Researcher's search trails, source evaluations, synthesis
#log-artist         — Artist's prompt iterations, style decisions, asset versions
```

### New: Accountability Channels
```
#ledger             — Canonical task state (auto-updated by Watcher)
#audit              — Watcher enforcement actions, violations, state changes
```

**Rule:** Agents post ONE clean status line in #results. Everything else goes to their log channel. The board stays readable, the audit trail stays complete.

---

## Task State Machine

```
                    ┌─────────────┐
                    │   CREATED   │ ← task submitted, ID assigned
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PROPOSED   │ ← Coordinator decomposed, posted to #proposals
                    └──────┬──────┘
                           │ human approves (✅ reaction)
                    ┌──────▼──────┐
                    │   QUEUED    │ ← approved, waiting for agent availability
                    └──────┬──────┘
                           │ Coordinator assigns to specific agent
                    ┌──────▼──────┐
                    │ IN_PROGRESS │ ← agent actively working
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼───┐ ┌──────▼──────┐
       │  EVIDENCE   │ │BLOCKED│ │   FAILED    │
       │  SUBMITTED  │ └──┬───┘ └─────────────┘
       └──────┬──────┘    │
              │            │ blocker resolved
              │     ┌──────▼──────┐
              │     │ IN_PROGRESS │ (re-enters)
              │     └─────────────┘
              │ Watcher validates evidence
       ┌──────▼──────┐
       │    DONE     │ ← verified complete, immutable
       └─────────────┘
```

### Transition Rules (Enforced by Watcher)

| From | To | Who | Requires |
|------|-----|-----|----------|
| CREATED → PROPOSED | Coordinator only | Decomposition plan |
| PROPOSED → QUEUED | Human only | ✅ reaction on proposal |
| QUEUED → IN_PROGRESS | Coordinator only | Agent assignment |
| IN_PROGRESS → EVIDENCE_SUBMITTED | Assigned agent only | Evidence attachment |
| IN_PROGRESS → BLOCKED | Assigned agent only | Blocker description |
| IN_PROGRESS → FAILED | Assigned agent or Coordinator | Failure reason |
| BLOCKED → IN_PROGRESS | Coordinator only | Blocker resolution |
| EVIDENCE_SUBMITTED → DONE | Watcher (auto) | Evidence validates against policy |
| EVIDENCE_SUBMITTED → IN_PROGRESS | Reviewer or Coordinator | Evidence rejected, needs rework |

### Immutable States
- **DONE** — cannot transition to anything else. Once verified, it stays verified.
- **FAILED** — can only be retried by creating a NEW task referencing the old one.

### Forbidden Transitions (Watcher blocks these)
- Agent self-assigning tasks (only Coordinator dispatches)
- Skipping EVIDENCE_SUBMITTED (no direct IN_PROGRESS → DONE)
- Parent task closing before all subtasks are DONE or FAILED
- Any agent modifying another agent's task state
- Backdating timestamps

---

## Evidence Policy

Every task completion requires evidence. The type of evidence depends on the agent role.

### Evidence Requirements by Role

| Agent | Required Evidence | Example |
|-------|-------------------|---------|
| **Builder** | Code diff OR file path + test output | `diff: +42/-8 in src/auth.ts` + `12 tests pass` |
| **Reviewer** | Review checklist + specific findings | `Reviewed: 3 files, 2 issues found (fixed), security: clear` |
| **Auditor** | Scan output + severity summary | `SAST: 0 critical, 1 high (mitigated), deps: clean` |
| **Researcher** | Sources list + confidence score | `3 sources [arxiv, gh, docs], confidence: 0.85` |
| **Artist** | Asset file/URL + style justification | `sprites/agent-walk.png (32x32, 4 frames, matches palette)` |
| **Coordinator** | Subtask completion summary | `5/5 subtasks DONE, parent ready to close` |

### Evidence Format

```yaml
evidence:
  task_id: "TASK-0042"
  agent: "builder"
  type: "code_change"          # code_change | review | scan | research | asset | coordination
  summary: "Implemented NIP-98 hostname validation"
  artifacts:
    - type: "diff"
      path: "apps/vouch-gateway/src/auth.ts"
      additions: 8
      deletions: 2
    - type: "test_output"
      result: "pass"
      count: 66
      failures: 0
  confidence: 1.0               # 0-1, required for research tasks
  notes: "Added trusted host list, 3 new test cases"
  timestamp: "2026-03-01T19:42:00Z"
```

### Validation Rules

1. **No empty evidence** — `summary` is required, at least one artifact
2. **Test results required for code changes** — Builder/Reviewer must include test output
3. **Sources required for research** — Researcher must cite at least one source
4. **File/URL required for assets** — Artist must attach or reference the artifact
5. **Subtask rollup for parents** — Coordinator evidence must reference all child task IDs

---

## Watcher System

The Watcher is an automated enforcement layer that runs on every state transition attempt.

### Watcher Rules

```typescript
// Pseudo-code — actual implementation in apps/agents/src/tasks/watcher.ts

interface WatcherRule {
  name: string;
  check: (transition: StateTransition) => WatcherResult;
}

const WATCHER_RULES: WatcherRule[] = [
  // 1. Only Coordinator can dispatch
  {
    name: 'dispatch_control',
    check: (t) => {
      if (t.to === 'IN_PROGRESS' && t.actor !== 'coordinator') {
        return { blocked: true, reason: 'Only Coordinator can dispatch tasks' };
      }
    },
  },

  // 2. DONE requires evidence
  {
    name: 'evidence_required',
    check: (t) => {
      if (t.to === 'DONE' && !t.evidence) {
        return { blocked: true, reason: 'DONE requires evidence submission' };
      }
    },
  },

  // 3. Parent cannot close before children
  {
    name: 'dependency_enforcement',
    check: (t) => {
      if (t.to === 'DONE' && t.task.subtasks.length > 0) {
        const incomplete = t.task.subtasks.filter(s => s.status !== 'DONE' && s.status !== 'FAILED');
        if (incomplete.length > 0) {
          return {
            blocked: true,
            reason: `${incomplete.length} subtask(s) still open: ${incomplete.map(s => s.id).join(', ')}`,
          };
        }
      }
    },
  },

  // 4. No self-assignment
  {
    name: 'no_self_assign',
    check: (t) => {
      if (t.to === 'IN_PROGRESS' && t.actor === t.task.assignedTo) {
        return { blocked: true, reason: 'Agents cannot self-assign tasks' };
      }
    },
  },

  // 5. DONE is immutable
  {
    name: 'done_immutable',
    check: (t) => {
      if (t.from === 'DONE') {
        return { blocked: true, reason: 'DONE is immutable — create new task to revisit' };
      }
    },
  },

  // 6. No status conflict after DONE
  {
    name: 'no_post_done_conflict',
    check: (t) => {
      if (t.task.status === 'DONE' && t.to !== 'DONE') {
        return { blocked: true, reason: 'Task already DONE — conflicting status ignored' };
      }
    },
  },

  // 7. Assigned agent only
  {
    name: 'assigned_agent_only',
    check: (t) => {
      if (['EVIDENCE_SUBMITTED', 'BLOCKED'].includes(t.to) && t.actor !== t.task.assignedTo) {
        return { blocked: true, reason: `Only assigned agent (${t.task.assignedTo}) can update this task` };
      }
    },
  },
];
```

### Watcher Output

Every enforcement action is logged to #audit:

```
[WATCHER] BLOCKED: TASK-0042 transition IN_PROGRESS → DONE
  Agent: builder
  Rule: evidence_required
  Reason: DONE requires evidence submission
  Time: 2026-03-01T19:42:00Z
```

```
[WATCHER] ALLOWED: TASK-0042 transition IN_PROGRESS → EVIDENCE_SUBMITTED
  Agent: builder
  Evidence: code_change (diff: +8/-2, tests: 66 pass)
  Time: 2026-03-01T19:43:00Z
```

```
[WATCHER] AUTO: TASK-0042 transition EVIDENCE_SUBMITTED → DONE
  Validation: evidence meets policy (code_change with test output)
  Time: 2026-03-01T19:43:01Z
```

---

## Ledger Format

The #ledger channel maintains a single pinned message that's auto-updated:

```
TASK LEDGER — Last updated: 2026-03-01 19:45 UTC

ACTIVE
  TASK-0042  [IN_PROGRESS]  builder     "NIP-98 hostname validation"
  TASK-0043  [QUEUED]       —           "Update pricing table seed data"
  TASK-0044  [PROPOSED]     —           "Add rate limit headers to error responses"

BLOCKED
  TASK-0039  [BLOCKED]      researcher  "Competitor analysis — waiting on API access"

COMPLETED TODAY
  TASK-0041  [DONE]  reviewer   "Security audit — inference proxy"   evidence: scan + 18 findings
  TASK-0040  [DONE]  builder    "Gateway body size limit"            evidence: diff + 66 tests

FAILED
  TASK-0038  [FAILED]  builder  "WebSocket streaming" — reason: upstream provider doesn't support
```

---

## Vouch Integration

This is where our system goes beyond JUMPERZ. Evidence feeds into Vouch trust scores.

### Evidence → Trust Score Pipeline

1. **Task completes with evidence** → Watcher validates → DONE
2. **Evidence quality scored** (0-1):
   - Tests passing = high quality
   - Scan clean = high quality
   - Research with sources = scored by citation count + confidence
   - Asset reviewed = scored by human reaction (✅ = 1.0, needs revision = 0.5)
3. **Score feeds Vouch** → `recordOutcome(agentId, taskId, score)` via existing SDK
4. **Trust compounds** → agents with consistent high-quality evidence build reputation
5. **Low-trust agents get more review** → Reviewer auto-assigned to tasks from agents below threshold

### What This Enables

- **"Show the work" is built in** — every DONE has evidence, not just a claim
- **Trust is earned, not declared** — evidence quality drives score over time
- **Accountability has economic weight** — stakers are backing agents with provable track records
- **ISC criteria auto-generate** — evidence requirements map directly to ISC verification methods

---

## Smoke Test Protocol

After implementing, run these tests to verify the system works end-to-end:

### Test 1: Unauthorized Dispatch
```
Builder tries to assign TASK-0050 to Researcher
Expected: BLOCKED by Watcher (dispatch_control)
Result in #audit: "[WATCHER] BLOCKED: Only Coordinator can dispatch tasks"
```

### Test 2: DONE Without Evidence
```
Builder marks TASK-0051 as DONE with no evidence
Expected: BLOCKED by Watcher (evidence_required)
Result in #audit: "[WATCHER] BLOCKED: DONE requires evidence submission"
```

### Test 3: Parent Closing Early
```
Coordinator marks parent TASK-0052 as DONE while subtask TASK-0052-A is still IN_PROGRESS
Expected: BLOCKED by Watcher (dependency_enforcement)
Result in #audit: "[WATCHER] BLOCKED: 1 subtask(s) still open: TASK-0052-A"
```

### Test 4: Valid Evidence Flow
```
Builder submits evidence for TASK-0053 (diff + test output)
Expected: IN_PROGRESS → EVIDENCE_SUBMITTED → DONE (auto-validated)
Result in #audit: "[WATCHER] ALLOWED" then "[WATCHER] AUTO: DONE"
Result in #ledger: TASK-0053 moved to COMPLETED TODAY
Result in #results: Clean one-line status
Result in #log-builder: Full implementation log
```

### Test 5: Conflicting Status After DONE
```
Builder sends IN_PROGRESS update for already-DONE TASK-0053
Expected: BLOCKED by Watcher (done_immutable)
Result in #audit: "[WATCHER] BLOCKED: DONE is immutable"
```

### Test 6: BLOCKED → Resume Flow
```
Researcher marks TASK-0054 as BLOCKED (waiting on API access)
Coordinator resolves blocker, transitions back to IN_PROGRESS
Expected: BLOCKED → IN_PROGRESS (allowed, Coordinator only)
Result in #ledger: TASK-0054 moves from BLOCKED to ACTIVE
```

### Test 7: Full DAG Completion
```
Coordinator decomposes TASK-0055 into 3 subtasks
All 3 subtasks complete with evidence
Coordinator submits parent evidence (subtask rollup)
Expected: Parent auto-validates, moves to DONE
Result: Clean rollup in #ledger, all 4 tasks in COMPLETED
```

---

## Implementation Plan

### Phase 1: Watcher + State Machine (in TaskDAG)
- Add state machine enforcement to `apps/agents/src/tasks/dag.ts`
- Add evidence field to task type
- Add watcher rules module at `apps/agents/src/tasks/watcher.ts`
- Modify `AgentTeam.tick()` to run watcher checks on every transition

### Phase 2: Discord Channels + Formatting
- Create per-agent log channels in `apps/discord/src/channels.ts`
- Create #ledger and #audit channels
- Add log routing: verbose → agent log channel, status → #results
- Add ledger message auto-update (pinned message in #ledger)
- Add audit message posting (every watcher action → #audit)

### Phase 3: Evidence Policy Enforcement
- Add evidence schema + validation to `apps/agents/src/tasks/evidence.ts`
- Require evidence in EVIDENCE_SUBMITTED transition
- Auto-validate evidence against role-specific requirements
- Connect evidence quality score to Vouch `recordOutcome()`

### Phase 4: Smoke Tests
- Run all 7 test scenarios
- Fix any enforcement gaps
- Verify ledger stays in sync with DAG
- Verify per-agent logs capture everything

---

## Coordinator System Prompt Addition

Add this to the Coordinator's identity (`identities/coordinator.skill.md`):

```markdown
## Task Accountability Rules (ENFORCED)

You are the ONLY agent who can dispatch tasks. No other agent may assign work.

### When Decomposing Tasks
1. Every subtask gets a unique ID (format: TASK-NNNN or TASK-NNNN-A/B/C for subtasks)
2. Every subtask must have a clear assignee recommendation
3. Post ONE clean summary to #proposals, full reasoning to #log-coordinator

### When a Task is Marked DONE
1. Evidence is REQUIRED — you cannot accept a bare "done"
2. Verify evidence matches the task requirements:
   - Code tasks: diff + test output
   - Review tasks: checklist + findings
   - Research tasks: sources + confidence
   - Asset tasks: file/URL + style check
3. If evidence is insufficient, transition back to IN_PROGRESS with specific feedback

### When Closing Parent Tasks
1. ALL subtasks must be DONE or FAILED before the parent can close
2. Your parent evidence must reference every subtask ID and its outcome
3. If any subtask FAILED, explain why the parent can still close (or don't close it)

### Per-Agent Logs
1. Post verbose coordination reasoning to #log-coordinator
2. Post clean one-line status updates to #activity
3. Never flood the task channels with implementation details
```

---

*Adapted from JUMPERZ (@jumperz) — 9 agents in production, February 2026.*
*Extended with Vouch trust integration, ISC evidence mapping, and economic accountability.*

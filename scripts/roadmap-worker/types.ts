/**
 * Roadmap Worker -- Shared Type Definitions
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  scope: string[];
  acceptanceCriteria: string[];
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'review';
  sessions: number;
  maxSessions: number;
  worktreeBranch?: string;
  result?: TaskResult;
  revisionNotes?: string;
}

export interface TaskResult {
  vouchScore: number;
  filesChanged: string[];
  testsRun: boolean;
  testsPassed: boolean;
  compiles: boolean;
  summary: string;
  discordMessageId?: string;
  completedAt: string;
}

export interface TaskQueue {
  tasks: Task[];
  completedToday: number;
  lastReset: string;
}

export interface DaemonState {
  startedAt: string;
  tickCount: number;
  consecutiveFailures: number;
  backoffUntil: number;
  itemsCompletedToday: number;
  lastResetDate: string;
  gatewayCallsToday: number;
  lastAuditModule?: string;
}

// -- Audit Types ----------------------------------------------------------

export type AuditSeverity = 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AuditModuleName =
  | 'secret-scan'
  | 'dependency-audit'
  | 'type-check'
  | 'dead-code'
  | 'auth-patterns'
  | 'input-validation'
  | 'error-handling'
  | 'test-coverage';

export interface AuditFinding {
  severity: AuditSeverity;
  file: string;
  line?: number;
  message: string;
  fix?: string;
}

export interface AuditResult {
  module: AuditModuleName;
  severity: AuditSeverity;
  findings: AuditFinding[];
  filesScanned: number;
  timestamp: string;
  durationMs: number;
}

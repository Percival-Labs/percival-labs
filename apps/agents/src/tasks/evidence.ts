// Evidence — Schema, types, and role-specific validation for task completion proof.
// Every task marked DONE must include evidence that meets the agent's role requirements.

// ── Types ──

export type EvidenceType =
  | 'code_change'
  | 'review'
  | 'scan'
  | 'research'
  | 'asset'
  | 'coordination';

export interface EvidenceArtifact {
  type: string;        // diff, test_output, checklist, scan_output, source, file, url, subtask_rollup
  path?: string;       // file path or URL
  result?: string;     // pass, fail, clean, issues_found
  count?: number;      // test count, source count, etc.
  failures?: number;   // failure count (for test_output)
  details?: string;    // free-form details
}

export interface Evidence {
  taskId: string;
  agent: string;
  type: EvidenceType;
  summary: string;
  artifacts: EvidenceArtifact[];
  confidence?: number;  // 0-1, required for research tasks
  notes?: string;
  timestamp: string;
}

// ── Role → Evidence Type Mapping ──

const ROLE_EVIDENCE_TYPES: Record<string, EvidenceType[]> = {
  builder:     ['code_change'],
  workercoder: ['code_change'],
  reviewer:    ['review'],
  auditor:     ['scan'],
  researcher:  ['research'],
  workerresearcher: ['research'],
  artist:      ['asset'],
  coordinator: ['coordination'],
  workergeneral: ['code_change', 'review', 'research'],  // general workers can submit various types
};

// ── Validation ──

export interface EvidenceValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate evidence against the role-specific requirements.
 * Returns { valid: true } if evidence meets policy, otherwise lists errors.
 */
export function validateEvidence(evidence: Evidence): EvidenceValidationResult {
  const errors: string[] = [];

  // 1. Summary is required
  if (!evidence.summary || evidence.summary.trim().length === 0) {
    errors.push('Evidence summary is required');
  }

  // 2. At least one artifact
  if (!evidence.artifacts || evidence.artifacts.length === 0) {
    errors.push('At least one evidence artifact is required');
  }

  // 3. Agent must be specified
  if (!evidence.agent || evidence.agent.trim().length === 0) {
    errors.push('Evidence must specify the submitting agent');
  }

  // 4. Task ID must be specified
  if (!evidence.taskId || evidence.taskId.trim().length === 0) {
    errors.push('Evidence must reference a task ID');
  }

  // 5. Timestamp must be present
  if (!evidence.timestamp) {
    errors.push('Evidence must have a timestamp');
  }

  // If basic validation fails, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 6. Role-specific validation
  const agentRole = evidence.agent.toLowerCase();
  const roleRules = ROLE_EVIDENCE_TYPES[agentRole];

  // If we know this role, validate the evidence type matches
  if (roleRules && !roleRules.includes(evidence.type)) {
    errors.push(
      `Agent "${evidence.agent}" (role type) submitted "${evidence.type}" evidence, ` +
      `expected one of: ${roleRules.join(', ')}`
    );
  }

  // 7. Type-specific requirements
  switch (evidence.type) {
    case 'code_change':
      validateCodeChange(evidence, errors);
      break;
    case 'review':
      validateReview(evidence, errors);
      break;
    case 'scan':
      validateScan(evidence, errors);
      break;
    case 'research':
      validateResearch(evidence, errors);
      break;
    case 'asset':
      validateAsset(evidence, errors);
      break;
    case 'coordination':
      validateCoordination(evidence, errors);
      break;
  }

  return { valid: errors.length === 0, errors };
}

// ── Type-Specific Validators ──

function validateCodeChange(evidence: Evidence, errors: string[]): void {
  const hasDiff = evidence.artifacts.some(a => a.type === 'diff');
  const hasTestOutput = evidence.artifacts.some(a => a.type === 'test_output');

  if (!hasDiff) {
    errors.push('Code change evidence requires a diff artifact');
  }
  if (!hasTestOutput) {
    errors.push('Code change evidence requires test output');
  }
}

function validateReview(evidence: Evidence, errors: string[]): void {
  const hasChecklist = evidence.artifacts.some(a => a.type === 'checklist');
  if (!hasChecklist) {
    errors.push('Review evidence requires a checklist artifact');
  }
}

function validateScan(evidence: Evidence, errors: string[]): void {
  const hasScanOutput = evidence.artifacts.some(a => a.type === 'scan_output');
  if (!hasScanOutput) {
    errors.push('Scan evidence requires a scan_output artifact');
  }
}

function validateResearch(evidence: Evidence, errors: string[]): void {
  const hasSource = evidence.artifacts.some(a => a.type === 'source');
  if (!hasSource) {
    errors.push('Research evidence requires at least one source artifact');
  }
  if (evidence.confidence === undefined || evidence.confidence === null) {
    errors.push('Research evidence requires a confidence score (0-1)');
  } else if (evidence.confidence < 0 || evidence.confidence > 1) {
    errors.push('Confidence score must be between 0 and 1');
  }
}

function validateAsset(evidence: Evidence, errors: string[]): void {
  const hasFileOrUrl = evidence.artifacts.some(
    a => a.type === 'file' || a.type === 'url'
  );
  if (!hasFileOrUrl) {
    errors.push('Asset evidence requires a file or URL artifact');
  }
}

function validateCoordination(evidence: Evidence, errors: string[]): void {
  const hasRollup = evidence.artifacts.some(a => a.type === 'subtask_rollup');
  if (!hasRollup) {
    errors.push('Coordination evidence requires a subtask_rollup artifact');
  }
}

// ── Quality Scoring ──

export interface EvidenceScore {
  quality: number;   // 0-1 composite quality score
  factors: Record<string, number>;  // individual factor scores for transparency
}

/**
 * Score evidence quality (0-1) for Vouch trust integration.
 * Higher scores = better evidence = more trust earned.
 *
 * Scoring factors by type:
 * - code_change: test pass rate (0-1) + diff presence (0.2) + failure count penalty
 * - review: checklist presence (0.5) + findings detail (0-0.5)
 * - scan: scan output presence (0.5) + clean result bonus (0.5)
 * - research: confidence score passthrough (0-1)
 * - asset: file/url presence (0.5) + details richness (0-0.5)
 * - coordination: subtask rollup presence (0.5) + completeness detail (0-0.5)
 */
export function scoreEvidence(evidence: Evidence): EvidenceScore {
  const factors: Record<string, number> = {};

  // Base score: evidence exists and is valid
  const validation = validateEvidence(evidence);
  if (!validation.valid) {
    return { quality: 0, factors: { valid: 0 } };
  }
  factors.valid = 1.0;

  switch (evidence.type) {
    case 'code_change':
      return scoreCodeChange(evidence, factors);
    case 'review':
      return scoreReview(evidence, factors);
    case 'scan':
      return scoreScan(evidence, factors);
    case 'research':
      return scoreResearch(evidence, factors);
    case 'asset':
      return scoreAsset(evidence, factors);
    case 'coordination':
      return scoreCoordination(evidence, factors);
    default:
      return { quality: 0.5, factors: { valid: 1.0, unknown_type: 0.5 } };
  }
}

function scoreCodeChange(evidence: Evidence, factors: Record<string, number>): EvidenceScore {
  const testArtifact = evidence.artifacts.find(a => a.type === 'test_output');
  const diffArtifact = evidence.artifacts.find(a => a.type === 'diff');

  // Diff presence: 0.2
  factors.diff = diffArtifact ? 0.2 : 0;

  // Test results: 0-0.8
  if (testArtifact) {
    if (testArtifact.result === 'pass') {
      const failures = testArtifact.failures ?? 0;
      const total = testArtifact.count ?? 1;
      if (failures === 0) {
        factors.tests = 0.8;
      } else {
        factors.tests = Math.max(0, 0.8 * (1 - failures / Math.max(total, 1)));
      }
    } else {
      factors.tests = 0.1;  // Tests ran but failed
    }
  } else {
    factors.tests = 0;
  }

  const quality = Math.min(1.0, factors.diff + factors.tests);
  return { quality, factors };
}

function scoreReview(evidence: Evidence, factors: Record<string, number>): EvidenceScore {
  const checklist = evidence.artifacts.find(a => a.type === 'checklist');
  factors.checklist = checklist ? 0.5 : 0;
  factors.detail = checklist?.details && checklist.details.length > 50 ? 0.5 : 0.25;

  const quality = Math.min(1.0, factors.checklist + factors.detail);
  return { quality, factors };
}

function scoreScan(evidence: Evidence, factors: Record<string, number>): EvidenceScore {
  const scan = evidence.artifacts.find(a => a.type === 'scan_output');
  factors.scan_present = scan ? 0.5 : 0;
  factors.clean = scan?.result === 'clean' ? 0.5 : 0.25;

  const quality = Math.min(1.0, factors.scan_present + factors.clean);
  return { quality, factors };
}

function scoreResearch(evidence: Evidence, factors: Record<string, number>): EvidenceScore {
  // Research quality = confidence score directly (already 0-1)
  const confidence = evidence.confidence ?? 0;
  factors.confidence = confidence;

  const sourceCount = evidence.artifacts.filter(a => a.type === 'source').length;
  factors.sources = Math.min(0.3, sourceCount * 0.1);  // Up to 0.3 bonus for multiple sources

  const quality = Math.min(1.0, confidence * 0.7 + factors.sources);
  return { quality, factors };
}

function scoreAsset(evidence: Evidence, factors: Record<string, number>): EvidenceScore {
  const hasFile = evidence.artifacts.some(a => a.type === 'file' || a.type === 'url');
  factors.artifact_present = hasFile ? 0.5 : 0;

  const hasDetails = evidence.artifacts.some(a => a.details && a.details.length > 20);
  factors.detail = hasDetails ? 0.5 : 0.25;

  const quality = Math.min(1.0, factors.artifact_present + factors.detail);
  return { quality, factors };
}

function scoreCoordination(evidence: Evidence, factors: Record<string, number>): EvidenceScore {
  const rollup = evidence.artifacts.find(a => a.type === 'subtask_rollup');
  factors.rollup_present = rollup ? 0.5 : 0;
  factors.detail = rollup?.details && rollup.details.length > 20 ? 0.5 : 0.25;

  const quality = Math.min(1.0, factors.rollup_present + factors.detail);
  return { quality, factors };
}

/**
 * Create a minimal valid evidence object (helper for building evidence programmatically).
 */
export function createEvidence(
  taskId: string,
  agent: string,
  type: EvidenceType,
  summary: string,
  artifacts: EvidenceArtifact[],
  extras?: { confidence?: number; notes?: string },
): Evidence {
  return {
    taskId,
    agent,
    type,
    summary,
    artifacts,
    confidence: extras?.confidence,
    notes: extras?.notes,
    timestamp: new Date().toISOString(),
  };
}

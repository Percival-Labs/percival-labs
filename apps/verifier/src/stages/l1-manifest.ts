// Percival Labs - L1 Manifest Check
// Instant, synchronous validation of SKILL.md structure and required fields

import { parseSkillMd, type ParsedSkillMd } from '@percival/shared';

export interface L1Result {
  stage: 'static';
  status: 'pass' | 'fail';
  results: {
    level: 'L1';
    checks: L1Check[];
    errors: string[];
    warnings: string[];
    score: number; // 0-100
    duration_ms: number;
  };
}

interface L1Check {
  name: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export function runL1ManifestCheck(content: string, manifest?: Record<string, unknown>): L1Result {
  const start = performance.now();
  const checks: L1Check[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Parse SKILL.md
  let parsed: ParsedSkillMd | null = null;
  try {
    parsed = parseSkillMd(content);
    checks.push({ name: 'parseable', passed: true, severity: 'error', message: 'SKILL.md is parseable' });
  } catch (err) {
    checks.push({ name: 'parseable', passed: false, severity: 'error', message: `Failed to parse: ${err}` });
    errors.push('SKILL.md is not parseable');
  }

  // 2. YAML frontmatter present
  const hasFrontmatter = content.trimStart().startsWith('---');
  checks.push({
    name: 'frontmatter',
    passed: hasFrontmatter,
    severity: 'error',
    message: hasFrontmatter ? 'YAML frontmatter present' : 'Missing YAML frontmatter (--- block)',
  });
  if (!hasFrontmatter) errors.push('Missing YAML frontmatter');

  if (!parsed) {
    return buildResult(checks, errors, warnings, start);
  }

  // 3. Required field: name
  const hasName = parsed.name !== 'Unknown' && parsed.name.length > 0;
  checks.push({
    name: 'name',
    passed: hasName,
    severity: 'error',
    message: hasName ? `Name: ${parsed.name}` : 'Missing required field: name',
  });
  if (!hasName) errors.push('Missing required field: name');

  // 4. Required field: description
  const hasDesc = parsed.description.trim().length > 0;
  checks.push({
    name: 'description',
    passed: hasDesc,
    severity: 'error',
    message: hasDesc ? `Description: ${parsed.description.slice(0, 80)}...` : 'Missing required field: description',
  });
  if (!hasDesc) errors.push('Missing required field: description');

  // 5. Description quality
  if (hasDesc && parsed.description.length < 20) {
    checks.push({ name: 'description_quality', passed: false, severity: 'warning', message: 'Description is too short (< 20 chars)' });
    warnings.push('Description is too short');
  } else if (hasDesc) {
    checks.push({ name: 'description_quality', passed: true, severity: 'warning', message: 'Description has adequate length' });
  }

  // 6. Context field valid
  const validContexts = ['fork', 'shared', 'none', ''];
  const contextValid = validContexts.includes(parsed.context);
  checks.push({
    name: 'context',
    passed: contextValid,
    severity: 'warning',
    message: contextValid ? `Context: ${parsed.context || 'default'}` : `Invalid context: "${parsed.context}"`,
  });
  if (!contextValid) warnings.push(`Non-standard context: "${parsed.context}"`);

  // 7. USE WHEN triggers
  const hasTriggers = parsed.triggers.length > 0;
  checks.push({
    name: 'triggers',
    passed: hasTriggers,
    severity: 'warning',
    message: hasTriggers ? `${parsed.triggers.length} triggers found` : 'No USE WHEN triggers (skill may not be discoverable)',
  });
  if (!hasTriggers) warnings.push('No USE WHEN triggers');

  // 8. Body content present
  const hasBody = parsed.body.trim().length > 50;
  checks.push({
    name: 'body',
    passed: hasBody,
    severity: 'warning',
    message: hasBody ? `Body: ${parsed.body.length} chars` : 'Body content is minimal (< 50 chars)',
  });
  if (!hasBody) warnings.push('Body content is minimal');

  // 9. Manifest validation (if provided as JSON from version submission)
  if (manifest) {
    // Required manifest fields
    const requiredFields = ['name', 'version', 'description', 'author', 'license'];
    for (const field of requiredFields) {
      const has = field in manifest && manifest[field];
      checks.push({
        name: `manifest_${field}`,
        passed: !!has,
        severity: 'error',
        message: has ? `Manifest ${field}: ${String(manifest[field]).slice(0, 50)}` : `Missing manifest field: ${field}`,
      });
      if (!has) errors.push(`Missing manifest field: ${field}`);
    }

    // Semver format
    const version = manifest.version as string;
    if (version && !/^\d+\.\d+\.\d+/.test(version)) {
      checks.push({ name: 'manifest_semver', passed: false, severity: 'error', message: `Invalid semver: ${version}` });
      errors.push(`Invalid semver: ${version}`);
    } else if (version) {
      checks.push({ name: 'manifest_semver', passed: true, severity: 'error', message: `Valid semver: ${version}` });
    }

    // Capabilities declared
    const caps = manifest.capabilities as Record<string, unknown> | undefined;
    const hasCaps = caps && Object.keys(caps).length > 0;
    checks.push({
      name: 'manifest_capabilities',
      passed: true, // Not required, just informational
      severity: 'info',
      message: hasCaps ? `${Object.keys(caps!).length} capability types declared` : 'No capabilities declared (minimal permissions)',
    });
  }

  return buildResult(checks, errors, warnings, start);
}

function buildResult(checks: L1Check[], errors: string[], warnings: string[], start: number): L1Result {
  const errorChecks = checks.filter(c => c.severity === 'error');
  const passedErrors = errorChecks.filter(c => c.passed).length;
  const totalErrors = errorChecks.length;
  const score = totalErrors > 0 ? Math.round((passedErrors / totalErrors) * 100) : 100;

  return {
    stage: 'static',
    status: errors.length === 0 ? 'pass' : 'fail',
    results: {
      level: 'L1',
      checks,
      errors,
      warnings,
      score,
      duration_ms: Math.round(performance.now() - start),
    },
  };
}

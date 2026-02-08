// Percival Labs - CLI Verify Command
// Validate a SKILL.md file for required fields and suspicious patterns

import { parseSkillMd } from '@percival/shared';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ANSI color helpers
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

interface VerifyResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

// Suspicious patterns that could indicate unsafe behavior
const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; label: string; severity: 'warning' | 'error' }> = [
  { pattern: /\beval\s*\(/g, label: 'eval() call detected', severity: 'error' },
  { pattern: /\bnew\s+Function\s*\(/g, label: 'new Function() constructor detected', severity: 'error' },
  { pattern: /\bexec\s*\(/g, label: 'exec() call detected (undeclared process capability)', severity: 'warning' },
  { pattern: /\bspawn\s*\(/g, label: 'spawn() call detected (undeclared process capability)', severity: 'warning' },
  { pattern: /\bexecSync\s*\(/g, label: 'execSync() call detected (undeclared process capability)', severity: 'warning' },
  { pattern: /\bspawnSync\s*\(/g, label: 'spawnSync() call detected (undeclared process capability)', severity: 'warning' },
  { pattern: /\bchild_process\b/g, label: 'child_process module reference', severity: 'warning' },
  { pattern: /\brequire\s*\(\s*['"]child_process['"]\s*\)/g, label: 'child_process require()', severity: 'error' },
  { pattern: /\bprocess\.env\b/g, label: 'process.env access detected', severity: 'warning' },
  { pattern: /\bfs\.\s*(?:writeFile|unlink|rmdir|rm)\b/g, label: 'Destructive filesystem operation', severity: 'warning' },
  { pattern: /\bcurl\s+.*\|\s*(?:bash|sh|zsh)\b/g, label: 'Piped curl to shell execution', severity: 'error' },
  { pattern: /\bchmod\s+777\b/g, label: 'chmod 777 detected', severity: 'error' },
  { pattern: /\brm\s+-rf\s+[/~]/g, label: 'Dangerous rm -rf on root/home path', severity: 'error' },
  { pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/gi, label: 'Possible hardcoded secret', severity: 'error' },
];

function verifyContent(content: string): VerifyResult {
  const result: VerifyResult = {
    passed: true,
    errors: [],
    warnings: [],
    info: [],
  };

  // Parse SKILL.md
  let parsed;
  try {
    parsed = parseSkillMd(content);
  } catch (err) {
    result.passed = false;
    result.errors.push(`Failed to parse SKILL.md: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  // Required field checks
  if (!parsed.name || parsed.name === 'Unknown') {
    result.passed = false;
    result.errors.push('Missing required field: name');
  }

  if (!parsed.description || parsed.description.trim().length === 0) {
    result.passed = false;
    result.errors.push('Missing required field: description');
  }

  // Quality checks
  if (parsed.description && parsed.description.length < 20) {
    result.warnings.push('Description is very short (< 20 chars). Consider adding more detail.');
  }

  if (parsed.description && parsed.description.length > 500) {
    result.warnings.push('Description is very long (> 500 chars). Consider being more concise.');
  }

  if (parsed.triggers.length === 0) {
    result.warnings.push('No USE WHEN triggers found. Skills without triggers may not be discoverable.');
  }

  if (parsed.body.trim().length < 50) {
    result.warnings.push('Body content is very short. Consider adding usage instructions.');
  }

  const validContexts = ['fork', 'shared', 'none'];
  if (!validContexts.includes(parsed.context)) {
    result.warnings.push(`Context "${parsed.context}" is non-standard. Expected: fork, shared, or none.`);
  }

  // Check for YAML frontmatter presence
  if (!content.trimStart().startsWith('---')) {
    result.warnings.push('No YAML frontmatter detected. SKILL.md should start with --- block.');
  }

  // Suspicious pattern checks
  for (const { pattern, label, severity } of SUSPICIOUS_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    const matches = content.match(pattern);
    if (matches) {
      const count = matches.length;
      const msg = `${label} (${count} occurrence${count > 1 ? 's' : ''})`;
      if (severity === 'error') {
        result.passed = false;
        result.errors.push(msg);
      } else {
        result.warnings.push(msg);
      }
    }
  }

  // Info
  result.info.push(`Name: ${parsed.name}`);
  result.info.push(`Category: ${parsed.category}`);
  result.info.push(`Context: ${parsed.context}`);
  result.info.push(`Triggers: ${parsed.triggers.length}`);
  result.info.push(`Workflows: ${parsed.workflows.length}`);
  result.info.push(`Tool references: ${parsed.toolReferences.join(', ') || 'none'}`);
  result.info.push(`Body size: ${parsed.body.length} chars`);

  return result;
}

export async function verify(path: string): Promise<void> {
  if (!path || !path.trim()) {
    console.error(red('Error: Path to SKILL.md is required.'));
    console.error(dim('Usage: percival verify <path>'));
    process.exit(1);
  }

  const resolvedPath = resolve(path);

  if (!existsSync(resolvedPath)) {
    console.error('');
    console.error(red(`  File not found: ${resolvedPath}`));
    console.error('');
    process.exit(1);
  }

  const content = readFileSync(resolvedPath, 'utf-8');
  const result = verifyContent(content);

  console.log('');
  console.log(`  ${bold('Percival Skill Verifier')}`);
  console.log(`  ${dim('File:')} ${cyan(resolvedPath)}`);
  console.log(`  ${dim('-'.repeat(60))}`);
  console.log('');

  // Info section
  for (const info of result.info) {
    console.log(`  ${dim('\u2139')} ${info}`);
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log('');
    for (const warning of result.warnings) {
      console.log(`  ${yellow('\u26A0')} ${yellow('WARN:')} ${warning}`);
    }
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('');
    for (const error of result.errors) {
      console.log(`  ${red('\u2718')} ${red('FAIL:')} ${error}`);
    }
  }

  // Final verdict
  console.log('');
  if (result.passed) {
    console.log(`  ${green('\u2714')} ${bold(green('PASS: Valid SKILL.md'))}`);
    if (result.warnings.length > 0) {
      console.log(`  ${dim(`(${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''})`)}`);
    }
  } else {
    console.log(`  ${red('\u2718')} ${bold(red(`FAIL: ${result.errors.length} error${result.errors.length > 1 ? 's' : ''} found`))}`);
  }
  console.log('');

  if (!result.passed) {
    process.exit(1);
  }
}

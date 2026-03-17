/**
 * Roadmap Worker -- Audit Module Implementations
 *
 * Each module scans the PL monorepo (READ ONLY) and returns findings.
 * Simple modules (secret-scan, type-check, dead-code) run locally.
 * Complex modules (auth-patterns, input-validation) may use Gateway.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { PATHS, GATEWAY, AUDIT } from './config.js';
import { log } from './logger.js';
import type { AuditFinding, AuditResult, AuditModuleName, AuditSeverity } from './types.js';

// -- Helpers ---------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

function maxSeverity(findings: AuditFinding[]): AuditSeverity {
  const order: AuditSeverity[] = ['CLEAN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  let max: AuditSeverity = 'CLEAN';
  for (const f of findings) {
    if (order.indexOf(f.severity) > order.indexOf(max)) {
      max = f.severity;
    }
  }
  return max;
}

/** Walk a directory tree, returning file paths matching given extensions. */
function walkFiles(
  dir: string,
  extensions: string[],
  exclude: string[] = [],
): string[] {
  const results: string[] = [];
  const maxFiles = 5000; // Safety cap

  function walk(d: string): void {
    if (results.length >= maxFiles) return;
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      const full = join(d, entry);
      // Skip excluded dirs
      const rel = relative(PATHS.monorepo, full);
      if (exclude.some((ex) => rel.startsWith(ex) || entry === ex)) continue;
      if (entry.startsWith('.') && entry !== '.') continue;

      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(full);
      } else if (extensions.length === 0 || extensions.includes(extname(entry))) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

const EXCLUDED_DIRS = [
  'node_modules', '.worktrees', '.git', 'dist', 'build', '.next',
  '.turbo', 'coverage', '.cache', 'logs', 'audit-reports',
  // Build output — scanning minified framework code produces only false positives
  'out',
];

// -- Secret Scan -----------------------------------------------------------

const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string; severity: AuditSeverity }> = [
  { pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"][^'"]{10,}/gi, label: 'API key/secret', severity: 'HIGH' },
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/gi, label: 'Hardcoded password', severity: 'HIGH' },
  { pattern: /(?:secret|token|bearer)\s*[:=]\s*['"][^'"]{10,}/gi, label: 'Secret/token', severity: 'HIGH' },
  { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, label: 'Private key', severity: 'CRITICAL' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, label: 'OpenAI/Stripe secret key', severity: 'CRITICAL' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, label: 'GitHub personal access token', severity: 'CRITICAL' },
  { pattern: /npm_[a-zA-Z0-9]{36}/g, label: 'npm token', severity: 'CRITICAL' },
  { pattern: /AKIA[0-9A-Z]{16}/g, label: 'AWS access key', severity: 'CRITICAL' },
  { pattern: /github_pat_[a-zA-Z0-9_]{20,}/g, label: 'GitHub fine-grained PAT', severity: 'CRITICAL' },
  { pattern: /sk_live_[a-zA-Z0-9]{20,}/g, label: 'Stripe live secret key', severity: 'CRITICAL' },
  { pattern: /sk_test_[a-zA-Z0-9]{20,}/g, label: 'Stripe test secret key', severity: 'HIGH' },
  { pattern: /pk_live_[a-zA-Z0-9]{20,}/g, label: 'Stripe live publishable key', severity: 'MEDIUM' },
  { pattern: /pk_test_[a-zA-Z0-9]{20,}/g, label: 'Stripe test publishable key', severity: 'LOW' },
];

/** Files where secrets are expected and should not be flagged */
const SECRET_SCAN_EXCLUDE_FILES = ['.env', '.env.example', '.env.local', '.env.template'];

export function secretScan(): AuditResult {
  const start = Date.now();
  const files = walkFiles(PATHS.monorepo, ['.ts', '.js', '.json', '.md', '.yml', '.yaml'], EXCLUDED_DIRS);
  const findings: AuditFinding[] = [];

  for (const file of files) {
    const basename = file.split('/').pop() || '';
    if (SECRET_SCAN_EXCLUDE_FILES.includes(basename)) continue;
    // Skip audit report files and this module itself
    if (file.includes('audit-modules') || file.includes('audit-reports')) continue;

    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, label, severity } of SECRET_PATTERNS) {
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          // Skip if it looks like a type definition, regex pattern, or documentation
          if (isLikelyFalsePositive(line, file)) continue;

          findings.push({
            severity,
            file: relative(PATHS.monorepo, file),
            line: i + 1,
            message: `${label} detected`,
            fix: 'Move to .env file and reference via process.env',
          });
        }
      }
    }
  }

  return {
    module: 'secret-scan',
    severity: maxSeverity(findings),
    findings: dedup(findings),
    filesScanned: files.length,
    timestamp: now(),
    durationMs: Date.now() - start,
  };
}

/** Reduce false positives from regex definitions, comments, docs, type annotations. */
function isLikelyFalsePositive(line: string, file: string): boolean {
  const trimmed = line.trim();
  // Lines that are regex patterns (e.g., in this very file or security skill files)
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  // Pattern definition lines with RegExp
  if (trimmed.includes('RegExp') || trimmed.includes('new RegExp')) return true;
  if (trimmed.includes('/gi') || trimmed.includes('/g,')) return true;
  // Test fixtures and mock data
  if (file.includes('.test.') || file.includes('.spec.') || file.includes('__test')) return true;
  // Environment variable references (process.env.X) are fine
  if (/process\.env\.\w+/.test(trimmed) && !/'[^']{10,}'/.test(trimmed)) return true;
  // Markdown code blocks documenting patterns
  if (file.endsWith('.md')) return true;
  return false;
}

// -- Dependency Audit ------------------------------------------------------

export function dependencyAudit(): AuditResult {
  const start = Date.now();
  const findings: AuditFinding[] = [];
  let filesScanned = 0;

  // Find all package.json files
  const packageFiles = walkFiles(PATHS.monorepo, ['.json'], EXCLUDED_DIRS)
    .filter((f) => f.endsWith('package.json'));
  filesScanned = packageFiles.length;

  // Try bun audit if available
  try {
    const output = execSync('bun pm ls 2>&1 || true', {
      cwd: PATHS.monorepo,
      timeout: 30_000,
      encoding: 'utf-8',
      maxBuffer: 2 * 1024 * 1024,
    });
    // bun doesn't have a native `audit` command yet, so we check for outdated
    log('debug', 'audit', 'bun pm ls completed', { lines: output.split('\n').length });
  } catch {
    // Not critical
  }

  // Check for known risky patterns in package.json files
  for (const pkgFile of packageFiles) {
    try {
      const content = JSON.parse(readFileSync(pkgFile, 'utf-8'));
      const deps = { ...content.dependencies, ...content.devDependencies };

      for (const [name, version] of Object.entries(deps)) {
        const v = version as string;
        // Flag wildcard or latest versions
        if (v === '*' || v === 'latest') {
          findings.push({
            severity: 'MEDIUM',
            file: relative(PATHS.monorepo, pkgFile),
            message: `Unpinned dependency: ${name}@${v}`,
            fix: `Pin to a specific version or range`,
          });
        }
        // Flag git dependencies (supply chain risk)
        if (v.startsWith('git') || v.startsWith('github:') || v.includes('github.com')) {
          findings.push({
            severity: 'LOW',
            file: relative(PATHS.monorepo, pkgFile),
            message: `Git dependency: ${name}@${v}`,
            fix: `Consider publishing to npm or pinning to a specific commit`,
          });
        }
      }

      // Check for missing engines field in root package.json
      if (pkgFile === join(PATHS.monorepo, 'package.json') && !content.engines) {
        findings.push({
          severity: 'LOW',
          file: relative(PATHS.monorepo, pkgFile),
          message: 'No engines field in root package.json',
          fix: 'Add engines: { "node": ">=20", "bun": ">=1.0" }',
        });
      }
    } catch {
      // Malformed JSON
    }
  }

  return {
    module: 'dependency-audit',
    severity: maxSeverity(findings),
    findings,
    filesScanned,
    timestamp: now(),
    durationMs: Date.now() - start,
  };
}

// -- Type Check ------------------------------------------------------------

export function typeCheck(): AuditResult {
  const start = Date.now();
  const findings: AuditFinding[] = [];

  try {
    const output = execSync('bun tsc --noEmit 2>&1 || true', {
      cwd: PATHS.monorepo,
      timeout: 120_000,
      encoding: 'utf-8',
      maxBuffer: 5 * 1024 * 1024,
    });

    // Parse TypeScript error output: file(line,col): error TSxxxx: message
    const errorRegex = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    match = errorRegex.exec(output);
    while (match !== null) {
      const [, file, lineStr, , errorCode, message] = match;
      const relFile = file.startsWith(PATHS.monorepo)
        ? relative(PATHS.monorepo, file)
        : file;

      findings.push({
        severity: 'MEDIUM',
        file: relFile,
        line: parseInt(lineStr, 10),
        message: `${errorCode}: ${message}`,
      });
      match = errorRegex.exec(output);
    }
  } catch (err) {
    log('warn', 'audit', 'tsc failed to run', { error: (err as Error).message });
  }

  // Count .ts files for filesScanned
  let tsFileCount = 0;
  try {
    const countOutput = execSync(
      'find . -name "*.ts" -not -path "*/node_modules/*" -not -path "*/.worktrees/*" | wc -l',
      { cwd: PATHS.monorepo, timeout: 10_000, encoding: 'utf-8' },
    );
    tsFileCount = parseInt(countOutput.trim(), 10) || 0;
  } catch {
    tsFileCount = 0;
  }

  return {
    module: 'type-check',
    severity: maxSeverity(findings),
    findings: findings.slice(0, 100), // Cap at 100 to avoid massive reports
    filesScanned: tsFileCount,
    timestamp: now(),
    durationMs: Date.now() - start,
  };
}

// -- Dead Code -------------------------------------------------------------

export function deadCode(): AuditResult {
  const start = Date.now();
  const findings: AuditFinding[] = [];
  const tsFiles = walkFiles(PATHS.monorepo, ['.ts', '.tsx'], EXCLUDED_DIRS)
    .filter((f) => !f.endsWith('.d.ts') && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts'));

  // Build map of all exported symbols
  const exportMap = new Map<string, { file: string; line: number }>();
  const importSet = new Set<string>();

  for (const file of tsFiles) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    const relFile = relative(PATHS.monorepo, file);
    const lines = content.split('\n');

    // Find exports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // export function name, export const name, export class name, export interface name, export type name
      const exportMatch = line.match(/^export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+(\w+)/);
      if (exportMatch) {
        const key = `${relFile}::${exportMatch[1]}`;
        exportMap.set(key, { file: relFile, line: i + 1 });
      }
    }

    // Find imports (to check if exports are used)
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    let importMatch: RegExpExecArray | null;
    importMatch = importRegex.exec(content);
    while (importMatch !== null) {
      const names = importMatch[1].split(',').map((n) => n.trim().split(' as ')[0].trim());
      for (const name of names) {
        if (name) importSet.add(name);
      }
      importMatch = importRegex.exec(content);
    }
  }

  // Find exports not referenced by any import
  for (const [key, { file, line }] of exportMap) {
    const symbolName = key.split('::')[1];
    // Skip index files (re-exports), entry points, and common patterns
    if (file.includes('index.ts') || file.endsWith('index.ts')) continue;
    if (['main', 'default', 'handler', 'GET', 'POST', 'PUT', 'DELETE'].includes(symbolName)) continue;

    if (!importSet.has(symbolName)) {
      findings.push({
        severity: 'LOW',
        file,
        line,
        message: `Exported symbol "${symbolName}" appears unused (not imported anywhere)`,
        fix: 'Remove export or the entire symbol if dead code',
      });
    }
  }

  return {
    module: 'dead-code',
    severity: maxSeverity(findings),
    findings: findings.slice(0, 100),
    filesScanned: tsFiles.length,
    timestamp: now(),
    durationMs: Date.now() - start,
  };
}

// -- Auth Patterns (uses Gateway for complex analysis) ---------------------

const AUTH_RISK_PATTERNS: Array<{ pattern: RegExp; label: string; severity: AuditSeverity }> = [
  { pattern: /role\s*[:=]\s*['"]admin['"]/gi, label: 'Hardcoded admin role', severity: 'MEDIUM' },
  { pattern: /jwt\.sign\([^)]*(?!expiresIn)[^)]*\)/g, label: 'JWT sign without expiry check', severity: 'MEDIUM' },
  { pattern: /Access-Control-Allow-Origin['":\s]*\*/g, label: 'Wildcard CORS origin', severity: 'MEDIUM' },
  { pattern: /eval\s*\(/g, label: 'eval() usage', severity: 'HIGH' },
  { pattern: /new\s+Function\s*\(/g, label: 'new Function() usage', severity: 'HIGH' },
  { pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s.*\$\{/g, label: 'SQL template literal (injection risk)', severity: 'HIGH' },
  { pattern: /\.innerHTML\s*=/g, label: 'innerHTML assignment (XSS risk)', severity: 'MEDIUM' },
  { pattern: /dangerouslySetInnerHTML/g, label: 'dangerouslySetInnerHTML (XSS risk)', severity: 'MEDIUM' },
  { pattern: /csrf/gi, label: 'CSRF reference (verify protection)', severity: 'LOW' },
];

/** Files that define detection patterns (linters, scanners, verifiers) — not vulnerable themselves */
const AUTH_SCANNER_FILES = ['verify.ts', 'l2-static.ts', 'l2-dynamic.ts', 'audit-modules.ts'];

/** Check if a line contains eval/Function inside a string literal, regex, or log message */
function isEvalInNonCodeContext(line: string): boolean {
  const trimmed = line.trim();
  // Inside a regex literal: /eval\s*\(/
  if (/\/[^/]*eval[^/]*\//.test(trimmed)) return true;
  // Inside a string used as a pattern/label: { pattern: ..., label: 'eval...' }
  if (/(?:pattern|label|message)\s*[:=]/.test(trimmed)) return true;
  // Inside a console.log or log() call
  if (/(?:console\.(?:log|warn|error|debug)|log\s*\()\s*\(?\s*['"`]/.test(trimmed)) return true;
  return false;
}

/** Check if innerHTML assignment uses a sanitizer function */
function hasSanitizer(line: string, lines: string[], lineIndex: number): boolean {
  // Check current line and 5 lines before for esc(), sanitize(), escape(), encode()
  const context = lines.slice(Math.max(0, lineIndex - 5), lineIndex + 1).join('\n');
  return /\besc\s*\(|\bsanitize\w*\s*\(|\bescape\w*\s*\(|\bencode\w*\s*\(|\bDOMPurify/i.test(context);
}

/** Check if a CSRF match is implementing protection (not missing it) */
function isCsrfImplementation(line: string, lines: string[], lineIndex: number): boolean {
  // Look at surrounding context (10 lines) for implementation patterns
  const context = lines.slice(Math.max(0, lineIndex - 5), Math.min(lines.length, lineIndex + 5)).join('\n');
  // Setting, validating, or refreshing CSRF tokens = implementation
  return /X-CSRF-Token|csrf[_-]?token|csrfToken|state\s*[:=]\s*(?:crypto|uuid|random)/i.test(context) &&
    /(?:header|set|get|validate|verify|check|fetch|acquire|refresh)/i.test(context);
}

/** Check if SQL template literal uses proper parameterization */
function isSafeParameterizedSQL(line: string, lines: string[], lineIndex: number): boolean {
  // Look at surrounding context for ? placeholders and params arrays
  const context = lines.slice(Math.max(0, lineIndex - 3), Math.min(lines.length, lineIndex + 3)).join('\n');
  // If the interpolated parts are just joining hardcoded "col = ?" strings, it's safe
  return /\?\s*[,)\]]/.test(context) && /(?:params|values|args)\s*[\])]/i.test(context);
}

export function authPatterns(): AuditResult {
  const start = Date.now();
  const files = walkFiles(PATHS.monorepo, ['.ts', '.tsx', '.js', '.jsx'], EXCLUDED_DIRS);
  const findings: AuditFinding[] = [];

  for (const file of files) {
    // Skip test files and audit files
    if (file.includes('.test.') || file.includes('.spec.') || file.includes('audit-modules')) continue;

    const basename = file.split('/').pop() || '';

    // Skip known scanner/linter files that define detection patterns
    if (AUTH_SCANNER_FILES.includes(basename)) continue;

    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    const relFile = relative(PATHS.monorepo, file);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, label, severity } of AUTH_RISK_PATTERNS) {
        pattern.lastIndex = 0;
        if (!pattern.test(lines[i])) continue;

        // --- Context-aware false positive reduction ---

        // eval/Function: skip if inside string literal, regex, or log message
        if (label.includes('eval') || label.includes('Function')) {
          if (isEvalInNonCodeContext(lines[i])) continue;
        }

        // innerHTML: skip if sanitizer function is used nearby
        if (label.includes('innerHTML') || label.includes('XSS')) {
          if (hasSanitizer(lines[i], lines, i)) continue;
          // Skip static HTML entity assignments (&#xxxx;, icons, etc.)
          if (/innerHTML\s*=\s*['"`]&#\d+;['"`]/.test(lines[i])) continue;
          // Skip numeric-only assignments
          if (/innerHTML\s*=\s*['"`][^${}]*['"`]\s*\+\s*\w+Count/i.test(lines[i])) continue;
        }

        // dangerouslySetInnerHTML: skip if source is a hardcoded variable (not user input)
        if (label.includes('dangerouslySetInnerHTML')) {
          // Check if the __html source is a static/const reference
          const htmlSource = lines[i].match(/__html:\s*(\w+)/);
          if (htmlSource) {
            // Look for the variable — if it's from a hardcoded array/const, skip
            const varName = htmlSource[1];
            if (content.includes(`const ${varName}`) || /\.\w+body\b/i.test(lines[i])) continue;
          }
        }

        // CSRF: distinguish implementation from absence
        if (label.includes('CSRF')) {
          if (isCsrfImplementation(lines[i], lines, i)) continue;
        }

        // SQL injection: skip if query uses parameterized placeholders
        if (label.includes('SQL')) {
          if (isSafeParameterizedSQL(lines[i], lines, i)) continue;
        }

        findings.push({
          severity,
          file: relFile,
          line: i + 1,
          message: label,
        });
      }
    }
  }

  return {
    module: 'auth-patterns',
    severity: maxSeverity(findings),
    findings: dedup(findings).slice(0, 100),
    filesScanned: files.length,
    timestamp: now(),
    durationMs: Date.now() - start,
  };
}

// -- Input Validation ------------------------------------------------------

const INPUT_PATTERNS: Array<{ pattern: RegExp; label: string; severity: AuditSeverity }> = [
  { pattern: /req\.body\./g, label: 'Direct req.body access without validation', severity: 'MEDIUM' },
  { pattern: /req\.params\./g, label: 'Direct req.params access without validation', severity: 'LOW' },
  { pattern: /req\.query\./g, label: 'Direct req.query access without validation', severity: 'LOW' },
  { pattern: /JSON\.parse\s*\(\s*(?:req|request)/g, label: 'JSON.parse on raw request data', severity: 'MEDIUM' },
  { pattern: /parseInt\s*\(\s*(?:req|request)/g, label: 'parseInt on raw request data', severity: 'LOW' },
];

/** Standard HTTP headers where parseInt is safe (not user-controlled body data) */
const SAFE_PARSE_INT_HEADERS = ['content-length', 'content-type', 'age', 'max-age', 'retry-after'];

export function inputValidation(): AuditResult {
  const start = Date.now();
  const files = walkFiles(PATHS.monorepo, ['.ts', '.tsx', '.js'], EXCLUDED_DIRS);
  const findings: AuditFinding[] = [];

  for (const file of files) {
    if (file.includes('.test.') || file.includes('.spec.')) continue;

    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    // Only check files that handle HTTP requests
    if (!content.includes('req.') && !content.includes('request.') && !content.includes('Request')) continue;

    const lines = content.split('\n');

    // Check if file has any validation library import (zod, joi, yup, etc.)
    const hasValidation = /import.*(?:zod|joi|yup|ajv|superstruct|valibot|typebox)/i.test(content);

    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, label, severity } of INPUT_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(lines[i])) {
          // parseInt on standard HTTP headers with explicit radix is safe
          if (label.includes('parseInt')) {
            const lower = lines[i].toLowerCase();
            if (SAFE_PARSE_INT_HEADERS.some((h) => lower.includes(h)) && /,\s*10\s*\)/.test(lines[i])) {
              continue;
            }
          }

          // If the file has validation imports, downgrade severity
          const adjustedSeverity: AuditSeverity = hasValidation ? 'LOW' : severity;
          findings.push({
            severity: adjustedSeverity,
            file: relative(PATHS.monorepo, file),
            line: i + 1,
            message: hasValidation ? `${label} (validation library present)` : label,
            fix: 'Validate and sanitize input using zod or similar',
          });
        }
      }
    }
  }

  return {
    module: 'input-validation',
    severity: maxSeverity(findings),
    findings: dedup(findings).slice(0, 100),
    filesScanned: files.length,
    timestamp: now(),
    durationMs: Date.now() - start,
  };
}

// -- Error Handling --------------------------------------------------------

export function errorHandling(): AuditResult {
  const start = Date.now();
  const files = walkFiles(PATHS.monorepo, ['.ts', '.tsx', '.js'], EXCLUDED_DIRS);
  const findings: AuditFinding[] = [];

  for (const file of files) {
    if (file.includes('.test.') || file.includes('.spec.')) continue;

    // Logger files intentionally swallow errors to avoid recursive failure loops
    const basename = file.split('/').pop() || '';
    const isLoggerFile = basename === 'logger.ts' || basename === 'logger.js';

    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty catch blocks: } catch { } or } catch (e) { }
      if (/\}\s*catch\s*\([^)]*\)\s*\{\s*\}/.test(trimmed) || /\}\s*catch\s*\{\s*\}/.test(trimmed)) {
        findings.push({
          severity: isLoggerFile ? 'LOW' : 'MEDIUM',
          file: relative(PATHS.monorepo, file),
          line: i + 1,
          message: isLoggerFile
            ? 'Empty catch block in logger — intentional (avoids recursive failure)'
            : 'Empty catch block — errors silently swallowed',
          fix: isLoggerFile ? undefined : 'At minimum, log the error',
        });
      }

      // catch block with only a comment (swallowed with explanation)
      if (/\}\s*catch/.test(trimmed)) {
        // Look ahead for empty body with just a comment
        const nextLine = lines[i + 1]?.trim();
        const afterNext = lines[i + 2]?.trim();
        if (nextLine?.startsWith('//') && afterNext === '}') {
          // Logger files get INFO-equivalent treatment — skip entirely
          if (isLoggerFile) continue;
          findings.push({
            severity: 'LOW',
            file: relative(PATHS.monorepo, file),
            line: i + 1,
            message: 'Catch block with only a comment — consider logging',
          });
        }
      }

      // .catch(() => {}) or .catch(() => undefined)
      if (/\.catch\s*\(\s*\(\)\s*=>\s*(?:\{\s*\}|undefined|null|void 0)\s*\)/.test(trimmed)) {
        findings.push({
          severity: 'MEDIUM',
          file: relative(PATHS.monorepo, file),
          line: i + 1,
          message: 'Promise .catch() swallows errors silently',
          fix: 'Log or handle the error appropriately',
        });
      }

      // Unhandled async: async function without try/catch (heuristic)
      // Only flag if it's a route handler pattern
      if (/(?:app|router)\.\s*(?:get|post|put|delete|patch)\s*\(/.test(trimmed) &&
          content.includes('async') && !content.includes('try')) {
        // Only add once per file
        if (!findings.some((f) => f.file === relative(PATHS.monorepo, file) && f.message.includes('route handler'))) {
          findings.push({
            severity: 'LOW',
            file: relative(PATHS.monorepo, file),
            line: i + 1,
            message: 'Async route handler without try/catch — unhandled rejections possible',
            fix: 'Wrap handler body in try/catch or use error middleware',
          });
        }
      }
    }
  }

  return {
    module: 'error-handling',
    severity: maxSeverity(findings),
    findings: dedup(findings).slice(0, 100),
    filesScanned: files.length,
    timestamp: now(),
    durationMs: Date.now() - start,
  };
}

// -- Test Coverage ---------------------------------------------------------

export function testCoverage(): AuditResult {
  const start = Date.now();
  const allTs = walkFiles(PATHS.monorepo, ['.ts', '.tsx'], EXCLUDED_DIRS)
    .filter((f) =>
      !f.endsWith('.d.ts') &&
      !f.endsWith('.test.ts') &&
      !f.endsWith('.spec.ts') &&
      !f.includes('__test') &&
      !f.includes('__mocks__'),
    );
  const testFiles = walkFiles(PATHS.monorepo, ['.ts'], EXCLUDED_DIRS)
    .filter((f) => f.endsWith('.test.ts') || f.endsWith('.spec.ts'));

  const findings: AuditFinding[] = [];

  // Build set of tested module basenames
  const testedModules = new Set<string>();
  for (const tf of testFiles) {
    const base = tf
      .replace(/\.test\.ts$/, '')
      .replace(/\.spec\.ts$/, '');
    testedModules.add(base);
  }

  // Find source files without corresponding tests
  for (const srcFile of allTs) {
    const base = srcFile.replace(/\.tsx?$/, '');
    const relFile = relative(PATHS.monorepo, srcFile);

    // Skip config files, type files, index files, and scripts that are entry points
    if (relFile.endsWith('config.ts') || relFile.endsWith('types.ts') ||
        relFile.endsWith('index.ts') || relFile.includes('/scripts/')) continue;

    if (!testedModules.has(base)) {
      findings.push({
        severity: 'LOW',
        file: relFile,
        message: 'No corresponding test file found',
        fix: `Create ${relFile.replace(/\.tsx?$/, '.test.ts')}`,
      });
    }
  }

  return {
    module: 'test-coverage',
    severity: maxSeverity(findings),
    findings: findings.slice(0, 100),
    filesScanned: allTs.length,
    timestamp: now(),
    durationMs: Date.now() - start,
  };
}

// -- Module Dispatch -------------------------------------------------------

const MODULE_MAP: Record<AuditModuleName, () => AuditResult> = {
  'secret-scan': secretScan,
  'dependency-audit': dependencyAudit,
  'type-check': typeCheck,
  'dead-code': deadCode,
  'auth-patterns': authPatterns,
  'input-validation': inputValidation,
  'error-handling': errorHandling,
  'test-coverage': testCoverage,
};

export function runModule(name: AuditModuleName): AuditResult {
  const fn = MODULE_MAP[name];
  if (!fn) {
    throw new Error(`Unknown audit module: ${name}`);
  }
  log('info', 'audit', `Running audit module: ${name}`);
  const result = fn();
  log('info', 'audit', `Audit module ${name} complete`, {
    severity: result.severity,
    findings: result.findings.length,
    filesScanned: result.filesScanned,
    durationMs: result.durationMs,
  });
  return result;
}

// -- Dedup helper ----------------------------------------------------------

function dedup(findings: AuditFinding[]): AuditFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.file}:${f.line || 0}:${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

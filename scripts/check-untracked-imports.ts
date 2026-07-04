// check-untracked-imports — the working-tree-vs-git integrity guard.
//
// Born 2026-07-04, the day we learned the monorepo had drifted from git for months without
// anything noticing: 11 whole workspace projects and 14 vouch-api source files existed only on
// the dev machine, so every Railway deploy since Mar 25 failed (frozen lockfile) or crashed
// (Cannot find module './routes/acp-seller') while local dev worked perfectly.
//
// Two checks, both zero-false-positive by construction:
//   1. IMPORT CHECK: for every TRACKED .ts/.tsx file, every relative import that resolves to a
//      file that EXISTS on disk must resolve to a TRACKED file. (A file that exists but isn't
//      tracked is exactly the class that builds locally and crashes in CI.)
//   2. WORKSPACE CHECK: every directory matched by the root package.json workspaces globs that
//      has a package.json on disk must have it TRACKED. (The 11-workspaces/frozen-lockfile class.)
//
// Run: bun scripts/check-untracked-imports.ts   (root script: `bun run check:integrity`)
// Exit 0 = clean; exit 1 = violations listed. No dependencies, no network.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');

const trackedList = execSync('git ls-files', { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
  .toString()
  .split('\n')
  .filter(Boolean);
const tracked = new Set(trackedList);

// ── Check 1: tracked code importing untracked-but-present files ──────────────
const IMPORT_RE = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](\.[^'"]+)['"]/g;
const CANDIDATE_SUFFIXES = ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js'];

function resolveImport(fromFile: string, spec: string): string | null {
  // Strip an explicit .js/.ts extension so './x.js' (ESM style) can match x.ts on disk.
  const base = join(dirname(fromFile), spec.replace(/\.(js|ts|tsx|mjs)$/, ''));
  for (const suf of CANDIDATE_SUFFIXES) {
    const candidate = base + suf;
    if (existsSync(join(ROOT, candidate)) && !isDir(join(ROOT, candidate))) return candidate;
  }
  return null;
}

function isDir(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

const importViolations: string[] = [];
for (const f of trackedList) {
  if (!/\.(ts|tsx)$/.test(f)) continue;
  if (!/^(apps|packages|scripts)\//.test(f)) continue;
  let src: string;
  try { src = readFileSync(join(ROOT, f), 'utf-8'); } catch { continue; } // deleted in worktree
  for (const m of src.matchAll(IMPORT_RE)) {
    const resolved = resolveImport(f, m[1]!);
    if (resolved && !tracked.has(resolved)) {
      importViolations.push(`${f} imports UNTRACKED ${resolved}`);
    }
  }
}

// ── Check 2: workspace dirs whose package.json exists on disk but isn't tracked ──
const workspaceViolations: string[] = [];
const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as { workspaces?: string[] };
for (const glob of rootPkg.workspaces ?? []) {
  if (!glob.endsWith('/*')) continue;
  const parent = glob.slice(0, -2);
  let entries: string[] = [];
  try { entries = readdirSync(join(ROOT, parent)); } catch { continue; }
  for (const e of entries) {
    const manifest = `${parent}/${e}/package.json`;
    if (existsSync(join(ROOT, manifest)) && !tracked.has(manifest)) {
      workspaceViolations.push(`workspace ${parent}/${e} exists on disk but ${manifest} is UNTRACKED (frozen-lockfile will diverge)`);
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
const violations = [...workspaceViolations, ...importViolations];
if (violations.length === 0) {
  console.log(`[check-untracked-imports] clean — ${trackedList.length} tracked files, all relative imports tracked, all on-disk workspaces committed`);
  process.exit(0);
}
console.error(`[check-untracked-imports] ${violations.length} violation(s) — code that builds locally will crash in CI:\n`);
for (const v of violations) console.error(`  ✗ ${v}`);
console.error('\nFix: `git add` the files (after a secrets/junk check) or delete the stale importer.');
process.exit(1);

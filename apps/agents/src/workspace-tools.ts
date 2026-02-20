// Workspace Tools — Read-only filesystem access for agents
// Provides tools for reading files and listing directories within the mounted workspace.
// All paths are sandboxed to WORKSPACE_PATH (default: /app/workspace).

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';

const WORKSPACE = process.env.WORKSPACE_PATH || '/app/workspace';
const WORKSPACE_ENGRAM = '/app/workspace-engram';
const MAX_FILE_SIZE = 100_000; // 100KB max per file read
const MAX_DIR_ENTRIES = 200;

/**
 * Resolve which workspace root a path belongs to, and validate it stays sandboxed.
 * Paths starting with "engram/" route to the Engram workspace mount.
 * Returns null if the path escapes the sandbox.
 */
function safePath(requestedPath: string): string | null {
  // Route engram/ paths to the Engram workspace
  if (requestedPath.startsWith('engram/') || requestedPath === 'engram') {
    const engramPath = requestedPath === 'engram' ? '.' : requestedPath.slice('engram/'.length);
    const resolved = resolve(WORKSPACE_ENGRAM, engramPath);
    if (!resolved.startsWith(resolve(WORKSPACE_ENGRAM))) {
      return null;
    }
    return resolved;
  }

  const resolved = resolve(WORKSPACE, requestedPath);
  if (!resolved.startsWith(resolve(WORKSPACE))) {
    return null; // Path traversal attempt
  }
  return resolved;
}

/**
 * Read a file from the workspace. Returns content or error message.
 */
export function readFile(path: string): string {
  const safe = safePath(path);
  if (!safe) return 'Error: Path is outside the workspace boundary.';
  if (!existsSync(safe)) return `Error: File not found: ${path}`;

  try {
    const stat = statSync(safe);
    if (stat.isDirectory()) return `Error: ${path} is a directory. Use list_directory instead.`;
    if (stat.size > MAX_FILE_SIZE) {
      return `Error: File too large (${(stat.size / 1024).toFixed(0)}KB). Max ${MAX_FILE_SIZE / 1000}KB. Read a more specific file or section.`;
    }
    return readFileSync(safe, 'utf-8');
  } catch (err) {
    return `Error reading file: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * List directory contents within the workspace.
 */
export function listDirectory(path: string): string {
  const safe = safePath(path);
  if (!safe) return 'Error: Path is outside the workspace boundary.';
  if (!existsSync(safe)) return `Error: Directory not found: ${path}`;

  try {
    const stat = statSync(safe);
    if (!stat.isDirectory()) return `Error: ${path} is a file, not a directory.`;

    const entries = readdirSync(safe, { withFileTypes: true })
      .slice(0, MAX_DIR_ENTRIES)
      .map(e => {
        const suffix = e.isDirectory() ? '/' : '';
        try {
          const s = statSync(join(safe, e.name));
          const size = e.isDirectory() ? '' : ` (${(s.size / 1024).toFixed(1)}KB)`;
          return `${e.name}${suffix}${size}`;
        } catch {
          return `${e.name}${suffix}`;
        }
      });

    return entries.join('\n');
  } catch (err) {
    return `Error listing directory: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Search for files matching a pattern (simple glob-like).
 */
export function searchFiles(pattern: string, directory: string = '.'): string {
  const safe = safePath(directory);
  if (!safe) return 'Error: Path is outside the workspace boundary.';
  if (!existsSync(safe)) return `Error: Directory not found: ${directory}`;

  const results: string[] = [];
  const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');

  function walk(dir: string, depth: number) {
    if (depth > 5 || results.length >= 50) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') continue;
        const fullPath = join(dir, entry.name);
        const relPath = relative(WORKSPACE, fullPath);

        if (regex.test(entry.name)) {
          results.push(relPath + (entry.isDirectory() ? '/' : ''));
        }
        if (entry.isDirectory()) {
          walk(fullPath, depth + 1);
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  walk(safe, 0);
  return results.length > 0
    ? results.join('\n')
    : `No files matching "${pattern}" found in ${directory}`;
}

/**
 * Anthropic tool definitions for workspace access.
 */
export const WORKSPACE_TOOLS = [
  {
    name: 'read_file',
    description: 'Read a file from the workspace. Two workspaces available: Percival Labs (default) and Engram (prefix path with "engram/").',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to workspace root. For PL: "apps/agents/src/agent.ts". For Engram: "engram/src/cli.ts", "engram/README.md".',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files in a workspace directory. Two workspaces: Percival Labs (default) and Engram (prefix with "engram/").',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Directory path. For PL: ".", "apps/". For Engram: "engram", "engram/src/", "engram/docs/".',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files by name pattern. Uses glob matching (* for any chars). Prefix directory with "engram/" for Engram workspace.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: {
          type: 'string',
          description: 'File name pattern to search for (e.g., "*.ts", "queue*", "BRAND*")',
        },
        directory: {
          type: 'string',
          description: 'Directory to search in. Defaults to "." (PL workspace). Use "engram" or "engram/src" for Engram workspace.',
        },
      },
      required: ['pattern'],
    },
  },
];

/**
 * Execute a workspace tool call and return the result.
 */
/**
 * Convert Anthropic-format tools to OpenAI-format (used by Ollama's OpenAI-compatible API).
 */
export function toOpenAITools() {
  return WORKSPACE_TOOLS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

export function executeWorkspaceTool(toolName: string, input: Record<string, string>): string {
  switch (toolName) {
    case 'read_file':
      return readFile(input.path);
    case 'list_directory':
      return listDirectory(input.path);
    case 'search_files':
      return searchFiles(input.pattern, input.directory || '.');
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// Percival Labs - SKILL.md Parser
// Parses PAI's YAML frontmatter + markdown body format

import type { ParsedSkillMd } from './types';

/**
 * Parse a SKILL.md file into structured data for registry ingestion.
 *
 * Format:
 * ---
 * name: SkillName
 * description: One-line description. USE WHEN trigger1, trigger2.
 * context: fork|shared|none
 * ---
 * # Heading
 * Markdown body...
 */
export function parseSkillMd(content: string): ParsedSkillMd {
  const { frontmatter, body } = extractFrontmatter(content);

  const name = frontmatter.name || 'Unknown';
  const description = frontmatter.description || '';
  const context = frontmatter.context || 'fork';

  // Extract USE WHEN triggers from description
  const triggers = extractTriggers(description);

  // Parse workflow routing table from body
  const workflows = extractWorkflows(body);

  // Extract tool references
  const toolReferences = extractToolReferences(body);

  // Infer category from content
  const category = inferCategory(name, description, body);

  return {
    name,
    description,
    context,
    triggers,
    workflows,
    toolReferences,
    body,
    category,
  };
}

function extractFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const frontmatter: Record<string, string> = {};

  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter, body: content };
  }

  const [, yamlBlock, body] = match;

  // Simple YAML parser for flat key-value pairs
  for (const line of yamlBlock!.split('\n')) {
    const kvMatch = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (kvMatch) {
      frontmatter[kvMatch[1]!] = kvMatch[2]!.trim();
    }
  }

  return { frontmatter, body: body! };
}

function extractTriggers(description: string): string[] {
  // Pattern: "USE WHEN trigger1, trigger2, trigger3"
  const match = description.match(/USE WHEN\s+(.+?)(?:\.|$)/i);
  if (!match) return [];

  return match[1]!
    .split(/,\s*/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
}

function extractWorkflows(body: string): Array<{ name: string; trigger: string; file: string }> {
  const workflows: Array<{ name: string; trigger: string; file: string }> = [];

  // Match markdown table rows: | **WorkflowName** | "trigger words" | `file.md` |
  const tableRowRegex = /\|\s*\*?\*?(\w+)\*?\*?\s*\|\s*"?([^"|]+)"?\s*\|\s*`?([^`|\s]+)`?\s*\|/g;
  let match;

  while ((match = tableRowRegex.exec(body)) !== null) {
    const name = match[1]!;
    const trigger = match[2]!.trim();
    const file = match[3]!.trim();

    // Skip header rows
    if (name.toLowerCase() === 'workflow' || name === '---') continue;

    workflows.push({ name, trigger, file });
  }

  return workflows;
}

function extractToolReferences(body: string): string[] {
  const tools = new Set<string>();

  // Match tool references like: Read, Write, Bash, Glob, Grep, WebSearch, WebFetch, Task
  const toolNames = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Task', 'NotebookEdit'];
  for (const tool of toolNames) {
    if (body.includes(tool)) {
      tools.add(tool);
    }
  }

  return [...tools];
}

function inferCategory(name: string, description: string, body: string): string {
  const text = `${name} ${description} ${body}`.toLowerCase();

  const categories: [string, string[]][] = [
    ['security', ['security', 'osint', 'threat', 'vulnerability', 'pentest', 'audit']],
    ['intelligence', ['research', 'investigate', 'analysis', 'deep dive', 'lookup']],
    ['content', ['content', 'blog', 'script', 'video', 'youtube', 'social media', 'copywriting']],
    ['business', ['business', 'brand', 'pricing', 'revenue', 'launch', 'strategy']],
    ['development', ['code', 'development', 'build', 'test', 'debug', 'deploy', 'engineer']],
    ['automation', ['automate', 'pipeline', 'workflow', 'batch', 'orchestrat']],
    ['learning', ['learn', 'skill', 'evolution', 'improve', 'reflect']],
    ['communication', ['email', 'newsletter', 'notify', 'message']],
  ];

  for (const [category, keywords] of categories) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'utility';
}

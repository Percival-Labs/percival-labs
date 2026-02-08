// Agent Identity Loader
// Reads SKILL.md files from identities/ directory and parses them into AgentIdentity structs.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Agent } from '@percival/agent-memory';

export interface AgentIdentity {
  name: string;
  role: string;
  modelPreference: string;
  expertise: string[];
  personality: string;
  communication: string;
}

/**
 * Parse YAML-like frontmatter from a SKILL.md string.
 * Returns the frontmatter key-value pairs and the markdown body.
 */
function extractFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const frontmatter: Record<string, string> = {};

  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter, body: content };
  }

  const [, yamlBlock, body] = match;

  for (const line of yamlBlock!.split('\n')) {
    const kvMatch = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (kvMatch) {
      frontmatter[kvMatch[1]!] = kvMatch[2]!.trim();
    }
  }

  return { frontmatter, body: body! };
}

/**
 * Extract a labeled value from the markdown body.
 * Looks for lines like "Role: Security Analyst" or "Expertise: SAST, DAST, ..."
 */
function extractField(body: string, label: string): string {
  const regex = new RegExp(`^${label}:\\s*(.+)$`, 'mi');
  const match = body.match(regex);
  return match ? match[1]!.trim() : '';
}

/**
 * Parse a single SKILL.md file content into an AgentIdentity.
 */
export function parseIdentity(content: string): AgentIdentity {
  const { frontmatter, body } = extractFrontmatter(content);

  const name = frontmatter.name || 'Unknown';
  const role = extractField(body, 'Role');
  const modelPrefRaw = extractField(body, 'Model Preference');
  const modelPreference = modelPrefRaw.toLowerCase() || 'sonnet';
  const expertiseRaw = extractField(body, 'Expertise');
  const expertise = expertiseRaw
    ? expertiseRaw.split(/,\s*/).map(e => e.trim()).filter(Boolean)
    : [];
  const personality = extractField(body, 'Personality');
  const communication = extractField(body, 'Communication');

  return {
    name,
    role,
    modelPreference,
    expertise,
    personality,
    communication,
  };
}

/**
 * Load all agent identities from a directory of .skill.md files.
 * Returns an array of parsed AgentIdentity objects.
 */
export function loadIdentities(identitiesDir: string): AgentIdentity[] {
  const identities: AgentIdentity[] = [];

  let entries: string[];
  try {
    entries = readdirSync(identitiesDir);
  } catch {
    console.warn(`[identity/loader] Could not read identities directory: ${identitiesDir}`);
    return identities;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.skill.md')) continue;

    try {
      const filePath = join(identitiesDir, entry);
      const content = readFileSync(filePath, 'utf-8');
      const identity = parseIdentity(content);
      identities.push(identity);
    } catch (err) {
      console.warn(`[identity/loader] Failed to parse ${entry}:`, err);
    }
  }

  return identities;
}

/**
 * Convert an AgentIdentity to the Agent type used by the memory system.
 */
export function identityToAgent(identity: AgentIdentity): Agent {
  return {
    id: identity.name.toLowerCase(),
    name: identity.name,
    role: identity.role,
    expertise: identity.expertise,
    personality: identity.personality,
    model_preference: identity.modelPreference,
    status: 'idle',
  };
}

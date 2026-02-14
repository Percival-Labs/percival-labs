// Percival Labs — Discord Bot Configuration
// Loads Percival Labs goals context for agent lenses.
// This is PL's organizational context — NOT Alan's personal context.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PercivalGoals {
  mission: string;
  principles: string[];
  currentFocus: string[];
  scoringDimensions: string[];
}

let cachedGoals: PercivalGoals | null = null;

export function getGoals(): PercivalGoals {
  if (cachedGoals) return cachedGoals;

  try {
    const yamlPath = join(import.meta.dir, '..', 'percival-goals.yaml');
    const raw = readFileSync(yamlPath, 'utf-8');
    cachedGoals = parseSimpleYaml(raw);
    return cachedGoals;
  } catch {
    // Fallback if yaml not found
    cachedGoals = {
      mission: 'Make cooperation structurally more rewarding than defection (C > D)',
      principles: [
        'Open by default — code, reasoning, costs all visible',
        'Transfer capability, never create dependency',
        'Build companions, not crutches',
        'Agents are the protagonists, not the product',
      ],
      currentFocus: [
        'AI agent frameworks and orchestration patterns',
        'Open-source AI tooling and infrastructure',
        'Developer experience for AI-powered applications',
        'Trust and safety in autonomous agent systems',
        'Content creation and media automation',
      ],
      scoringDimensions: [
        'Relevance to agent infrastructure development',
        'Applicability to open-source AI tooling',
        'C > D alignment — does this support cooperation over defection?',
        'Actionability — can we build something from this?',
        'Timeliness — is this time-sensitive information?',
      ],
    };
    return cachedGoals;
  }
}

/**
 * Minimal YAML-like parser for the goals config.
 * Handles simple key: value and key: [list] patterns.
 */
function parseSimpleYaml(raw: string): PercivalGoals {
  const lines = raw.split('\n');
  const result: Record<string, string | string[]> = {};
  let currentKey = '';
  let currentList: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // List item
    if (trimmed.startsWith('- ')) {
      if (inList) {
        currentList.push(trimmed.slice(2).replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    // Key: value
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      // Save previous list
      if (inList && currentKey) {
        result[currentKey] = currentList;
      }

      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (value === '' || value === '|') {
        // Start of a list or multiline
        currentKey = key;
        currentList = [];
        inList = true;
      } else {
        result[key] = value.replace(/^["']|["']$/g, '');
        inList = false;
      }
    }
  }

  // Save last list
  if (inList && currentKey) {
    result[currentKey] = currentList;
  }

  return {
    mission: (result.mission as string) || '',
    principles: (result.principles as string[]) || [],
    currentFocus: (result.currentFocus as string[]) || (result.current_focus as string[]) || [],
    scoringDimensions: (result.scoringDimensions as string[]) || (result.scoring_dimensions as string[]) || [],
  };
}

/**
 * Format goals into a context string for agent prompts.
 */
export function formatGoalsContext(): string {
  const goals = getGoals();
  return [
    `## Percival Labs Context`,
    '',
    `**Mission:** ${goals.mission}`,
    '',
    '**Principles:**',
    ...goals.principles.map(p => `- ${p}`),
    '',
    '**Current Focus Areas:**',
    ...goals.currentFocus.map(f => `- ${f}`),
    '',
    '**Scoring Dimensions:**',
    ...goals.scoringDimensions.map(d => `- ${d}`),
  ].join('\n');
}

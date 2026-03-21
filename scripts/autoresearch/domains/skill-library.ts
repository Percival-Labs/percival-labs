/**
 * Autoresearch Domain: Skill Library Optimization
 *
 * Optimizes the skill matching and invocation system at ~/.claude/skills/.
 * Each skill has a SKILL.md with frontmatter (name, description, triggers)
 * and is indexed in skill-index.json for runtime matching.
 *
 * Tunable parameters:
 * - Description weight vs trigger weight in matching
 * - Minimum match threshold (below = "no skill found")
 * - Trigger specificity (how narrow vs broad triggers should be)
 * - Description length target (too short = ambiguous, too long = noise)
 * - Keyword density in descriptions
 * - Coverage breadth (how many distinct intents are addressable)
 *
 * Evaluation uses a bank of synthetic user prompts across categories
 * (research, coding, content, security, business, creative) and scores
 * how accurately the matching algorithm routes to the correct skill.
 *
 * Does NOT modify live skill files — all evaluation is in-memory.
 * Promoted configs are written to results for manual review.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Domain, Mutation } from '../types.js';

const HOME = process.env.HOME || '/Users/alancarroll';
const SKILLS_DIR = join(HOME, '.claude/skills');
const SKILL_INDEX_PATH = join(SKILLS_DIR, 'skill-index.json');

// ── Skill Data ──────────────────────────────────────────────────────────

interface SkillEntry {
  name: string;
  description: string;
  triggers: string[];
  path: string;
}

interface SkillMetrics {
  descriptionWordCount: number;
  triggerCount: number;
  avgTriggerWords: number;
  hasWorkflows: boolean;
  hasExamples: boolean;
  descriptionKeywordDensity: number;
}

function loadSkillIndex(): SkillEntry[] {
  if (!existsSync(SKILL_INDEX_PATH)) {
    console.warn(`[skill-lib] No skill-index.json found at ${SKILL_INDEX_PATH}`);
    return [];
  }
  try {
    return JSON.parse(readFileSync(SKILL_INDEX_PATH, 'utf-8')) as SkillEntry[];
  } catch {
    console.warn('[skill-lib] Failed to parse skill-index.json');
    return [];
  }
}

function analyzeSkill(skill: SkillEntry): SkillMetrics {
  const descWords = skill.description.split(/\s+/).length;
  const allTriggers = skill.triggers.flatMap((t) => t.split(',').map((s) => s.trim()));
  const triggerWordCounts = allTriggers.map((t) => t.split(/\s+/).length);
  const avgTriggerWords = triggerWordCounts.length > 0
    ? triggerWordCounts.reduce((a, b) => a + b, 0) / triggerWordCounts.length
    : 0;

  // Check SKILL.md for workflows and examples
  let hasWorkflows = false;
  let hasExamples = false;
  if (existsSync(skill.path)) {
    try {
      const content = readFileSync(skill.path, 'utf-8');
      hasWorkflows = /## Workflow/i.test(content) || /\| Workflow/i.test(content);
      hasExamples = /## Example/i.test(content) || /\*\*Example/i.test(content);
    } catch { /* skip */ }
  }

  // Keyword density: ratio of "USE WHEN" trigger words present in description
  const descLower = skill.description.toLowerCase();
  const triggerWords = new Set(allTriggers.map((t) => t.toLowerCase()));
  const matchingTriggers = [...triggerWords].filter((tw) => descLower.includes(tw));
  const descriptionKeywordDensity = triggerWords.size > 0
    ? matchingTriggers.length / triggerWords.size
    : 0;

  return {
    descriptionWordCount: descWords,
    triggerCount: allTriggers.length,
    avgTriggerWords,
    hasWorkflows,
    hasExamples,
    descriptionKeywordDensity,
  };
}

// ── Matching Config ─────────────────────────────────────────────────────

interface MatchingConfig {
  /** Weight given to description text matching (0-1) */
  descriptionWeight: number;
  /** Weight given to trigger keyword matching (0-1) */
  triggerWeight: number;
  /** Minimum score to consider a match (0-1) */
  matchThreshold: number;
  /** Ideal description word count — bell curve scoring */
  idealDescriptionLength: number;
  /** Ideal trigger count per skill — bell curve scoring */
  idealTriggerCount: number;
  /** Minimum keyword density in description (0-1) */
  minKeywordDensity: number;
  /** Bonus multiplier for skills with workflow routing tables */
  workflowBonus: number;
  /** Bonus multiplier for skills with usage examples */
  exampleBonus: number;
  /** Penalty for description overlap between skills (0-1) */
  overlapPenalty: number;
  /** Partial match boost — how much credit for substring matches (0-1) */
  partialMatchBoost: number;
}

const BASELINE_CONFIG: MatchingConfig = {
  descriptionWeight: 0.6,
  triggerWeight: 0.4,
  matchThreshold: 0.3,
  idealDescriptionLength: 25,
  idealTriggerCount: 8,
  minKeywordDensity: 0.4,
  workflowBonus: 1.1,
  exampleBonus: 1.05,
  overlapPenalty: 0.15,
  partialMatchBoost: 0.3,
};

// ── Mutation Ranges ─────────────────────────────────────────────────────

interface MutationRange {
  min: number;
  max: number;
  step: number;
}

type MutableParam = keyof MatchingConfig;

const MUTATION_RANGES: Record<MutableParam, MutationRange> = {
  descriptionWeight:      { min: 0.2, max: 0.9, step: 0.05 },
  triggerWeight:          { min: 0.1, max: 0.8, step: 0.05 },
  matchThreshold:         { min: 0.1, max: 0.6, step: 0.05 },
  idealDescriptionLength: { min: 10, max: 50, step: 5 },
  idealTriggerCount:      { min: 3, max: 15, step: 1 },
  minKeywordDensity:      { min: 0.1, max: 0.8, step: 0.05 },
  workflowBonus:          { min: 1.0, max: 1.3, step: 0.05 },
  exampleBonus:           { min: 1.0, max: 1.2, step: 0.05 },
  overlapPenalty:         { min: 0.0, max: 0.4, step: 0.05 },
  partialMatchBoost:      { min: 0.0, max: 0.6, step: 0.05 },
};

// ── Test Prompts (User Intents → Expected Skill) ────────────────────────

interface TestCase {
  id: string;
  category: string;
  /** What the user might say */
  prompt: string;
  /** The skill name that should match (ground truth) */
  expectedSkill: string;
  /** Acceptable alternative matches (partial credit) */
  alternativeSkills?: string[];
  /** Keywords that should appear in matching description */
  matchKeywords: string[];
}

const TEST_CASES: TestCase[] = [
  // Research & Information
  {
    id: 'research-quick',
    category: 'research',
    prompt: 'What is the latest version of Node.js?',
    expectedSkill: 'Research',
    matchKeywords: ['research', 'look up', 'find out', 'what is'],
  },
  {
    id: 'research-deep',
    category: 'research',
    prompt: 'Do a deep dive into WebAssembly adoption in enterprise backends',
    expectedSkill: 'Research',
    matchKeywords: ['deep dive', 'investigate', 'research'],
  },

  // Code & Development
  {
    id: 'code-project',
    category: 'development',
    prompt: 'Build a new REST API for the trust scoring system',
    expectedSkill: 'CodeProject',
    matchKeywords: ['build', 'api', 'new app', 'software development'],
  },
  {
    id: 'code-critique',
    category: 'development',
    prompt: 'Review the quality of the authentication module code',
    expectedSkill: 'CriticAgent',
    matchKeywords: ['review', 'code quality', 'critique'],
  },

  // Content & Marketing
  {
    id: 'content-hooks',
    category: 'content',
    prompt: 'Generate 5 hook ideas for a YouTube video about AI agents',
    expectedSkill: 'HookFactory',
    matchKeywords: ['hooks', 'video intro', 'attention grabber'],
  },
  {
    id: 'content-youtube',
    category: 'content',
    prompt: 'What YouTube strategy should I use for my AI channel in 2026?',
    expectedSkill: 'YouTube2026',
    matchKeywords: ['youtube strategy', 'channel growth'],
  },
  {
    id: 'content-shorts',
    category: 'content',
    prompt: 'Calculate profitability for a faceless YouTube Shorts channel at 15k views per day',
    expectedSkill: 'ShortsEngine',
    matchKeywords: ['shorts', 'profit', 'youtube'],
  },

  // Security
  {
    id: 'security-assess',
    category: 'security',
    prompt: 'Run a security assessment on the web application at example.com',
    expectedSkill: 'WebAssessment',
    alternativeSkills: ['Security'],
    matchKeywords: ['security', 'assessment', 'pentest', 'vulnerability'],
  },
  {
    id: 'security-prompt-inject',
    category: 'security',
    prompt: 'Test the chatbot for prompt injection vulnerabilities',
    expectedSkill: 'WebAssessment',
    alternativeSkills: ['Security'],
    matchKeywords: ['prompt injection', 'vulnerability'],
  },

  // Business & Strategy
  {
    id: 'business-review',
    category: 'business',
    prompt: 'Give me a weekly business review and tell me what to work on',
    expectedSkill: 'BusinessOS',
    matchKeywords: ['business review', 'weekly review', 'what should I work on'],
  },
  {
    id: 'business-telos',
    category: 'business',
    prompt: 'Show me my life goals and project dependencies',
    expectedSkill: 'Telos',
    matchKeywords: ['telos', 'life goals', 'projects', 'dependencies'],
  },

  // Browser & Debugging
  {
    id: 'browser-debug',
    category: 'tooling',
    prompt: 'Take a screenshot of localhost:3000 and check for console errors',
    expectedSkill: 'Browser',
    matchKeywords: ['browser', 'screenshot', 'debug', 'console'],
  },

  // Creative
  {
    id: 'creative-video',
    category: 'creative',
    prompt: 'Produce a batch of 5 YouTube videos from these topic ideas',
    expectedSkill: 'BatchOrchestrator',
    matchKeywords: ['batch', 'produce', 'videos'],
  },

  // Work Management
  {
    id: 'work-queue',
    category: 'management',
    prompt: 'Add this task to my work queue and start processing requests',
    expectedSkill: 'DoWork',
    matchKeywords: ['work queue', 'capture', 'process'],
  },

  // Self-Improvement
  {
    id: 'upgrade-skills',
    category: 'meta',
    prompt: 'Audit my skills and find capability gaps',
    expectedSkill: 'Upgrade',
    matchKeywords: ['audit', 'skills', 'gap analysis', 'upgrade'],
  },

  // Ambiguous / Coverage Gap Tests
  {
    id: 'ambiguous-plan',
    category: 'ambiguous',
    prompt: 'Help me plan the next quarter for Percival Labs',
    expectedSkill: 'BusinessOS',
    alternativeSkills: ['Telos', 'RuthlessPrioritizer'],
    matchKeywords: ['planning', 'quarterly', 'strategy'],
  },
  {
    id: 'ambiguous-market',
    category: 'ambiguous',
    prompt: 'Research the competitive landscape for AI trust platforms',
    expectedSkill: 'Research',
    alternativeSkills: ['MarketResearch'],
    matchKeywords: ['research', 'competitive', 'market'],
  },
  {
    id: 'coverage-email',
    category: 'coverage',
    prompt: 'Write an email sequence for onboarding new Vouch users',
    expectedSkill: 'EmailSequence',
    matchKeywords: ['email', 'sequence', 'onboarding'],
  },
  {
    id: 'coverage-legal',
    category: 'coverage',
    prompt: 'Generate legal documents for our LLC',
    expectedSkill: 'LegalDocs',
    matchKeywords: ['legal', 'documents', 'LLC'],
  },
];

// ── Matching Algorithm ──────────────────────────────────────────────────

/**
 * Score how well a user prompt matches a skill, given config weights.
 * Returns 0-1 (higher = better match).
 */
function matchScore(
  prompt: string,
  skill: SkillEntry,
  metrics: SkillMetrics,
  config: MatchingConfig,
): number {
  const promptLower = prompt.toLowerCase();
  const promptWords = new Set(promptLower.split(/\s+/));

  // --- Description matching ---
  const descLower = skill.description.toLowerCase();
  const descWords = descLower.split(/\s+/);
  // Count prompt words found in description
  const descHits = [...promptWords].filter((pw) => descLower.includes(pw)).length;
  const descMatchRatio = descHits / Math.max(promptWords.size, 1);

  // Partial/substring matching for multi-word phrases
  let partialBoost = 0;
  const promptBigrams = [];
  const promptArr = promptLower.split(/\s+/);
  for (let i = 0; i < promptArr.length - 1; i++) {
    promptBigrams.push(`${promptArr[i]} ${promptArr[i + 1]}`);
  }
  const bigramHits = promptBigrams.filter((bg) => descLower.includes(bg)).length;
  if (promptBigrams.length > 0) {
    partialBoost = (bigramHits / promptBigrams.length) * config.partialMatchBoost;
  }

  const descScore = Math.min(1.0, descMatchRatio + partialBoost);

  // --- Trigger matching ---
  const allTriggers = skill.triggers.flatMap((t) => t.split(',').map((s) => s.trim().toLowerCase()));
  let bestTriggerMatch = 0;
  for (const trigger of allTriggers) {
    const triggerWords = trigger.split(/\s+/);
    // Exact trigger match: all words of trigger appear in prompt
    const triggerHits = triggerWords.filter((tw) => promptLower.includes(tw)).length;
    const triggerMatchRatio = triggerHits / Math.max(triggerWords.length, 1);
    bestTriggerMatch = Math.max(bestTriggerMatch, triggerMatchRatio);

    // Full trigger phrase in prompt = perfect match
    if (promptLower.includes(trigger)) {
      bestTriggerMatch = 1.0;
      break;
    }
  }

  // --- Weighted combination ---
  const rawScore = config.descriptionWeight * descScore + config.triggerWeight * bestTriggerMatch;

  // --- Structural bonuses ---
  let structureMultiplier = 1.0;
  if (metrics.hasWorkflows) structureMultiplier *= config.workflowBonus;
  if (metrics.hasExamples) structureMultiplier *= config.exampleBonus;

  return Math.min(1.0, rawScore * structureMultiplier);
}

/**
 * Find the best matching skill for a prompt.
 * Returns null if no skill exceeds the threshold.
 */
function findBestMatch(
  prompt: string,
  skills: SkillEntry[],
  metricsMap: Map<string, SkillMetrics>,
  config: MatchingConfig,
): { skill: SkillEntry; score: number } | null {
  let bestSkill: SkillEntry | null = null;
  let bestScore = 0;

  for (const skill of skills) {
    const metrics = metricsMap.get(skill.name);
    if (!metrics) continue;

    const score = matchScore(prompt, skill, metrics, config);
    if (score > bestScore) {
      bestScore = score;
      bestSkill = skill;
    }
  }

  if (!bestSkill || bestScore < config.matchThreshold) {
    return null;
  }

  return { skill: bestSkill, score: bestScore };
}

// ── Quality Scoring (Description & Trigger Health) ──────────────────────

/**
 * Score the overall quality of the skill library's metadata,
 * independent of matching accuracy.
 */
function scoreLibraryQuality(
  skills: SkillEntry[],
  metricsMap: Map<string, SkillMetrics>,
  config: MatchingConfig,
): number {
  if (skills.length === 0) return 0;

  let totalScore = 0;

  for (const skill of skills) {
    const metrics = metricsMap.get(skill.name);
    if (!metrics) continue;

    let skillScore = 0;

    // Description length: bell curve around ideal
    const lengthRatio = metrics.descriptionWordCount / config.idealDescriptionLength;
    const lengthScore = Math.exp(-0.5 * Math.pow(Math.log(Math.max(lengthRatio, 0.1)), 2));
    skillScore += lengthScore * 0.25;

    // Trigger count: bell curve around ideal
    const triggerRatio = metrics.triggerCount / config.idealTriggerCount;
    const triggerScore = Math.exp(-0.5 * Math.pow(Math.log(Math.max(triggerRatio, 0.1)), 2));
    skillScore += triggerScore * 0.20;

    // Keyword density: above minimum threshold gets full credit
    const densityScore = metrics.descriptionKeywordDensity >= config.minKeywordDensity
      ? 1.0
      : metrics.descriptionKeywordDensity / config.minKeywordDensity;
    skillScore += densityScore * 0.20;

    // Structural completeness
    const structScore =
      (metrics.hasWorkflows ? 0.5 : 0) +
      (metrics.hasExamples ? 0.5 : 0);
    skillScore += structScore * 0.15;

    // Trigger word specificity: avg 2-3 words per trigger is ideal
    const triggerSpecificity = metrics.avgTriggerWords >= 1.5 && metrics.avgTriggerWords <= 3.5
      ? 1.0
      : Math.max(0, 1.0 - Math.abs(metrics.avgTriggerWords - 2.5) * 0.3);
    skillScore += triggerSpecificity * 0.20;

    totalScore += skillScore;
  }

  return totalScore / skills.length;
}

// ── Overlap Detection ───────────────────────────────────────────────────

/**
 * Detect description overlap between skills.
 * High overlap means ambiguous routing — penalize configs that allow it.
 */
function scoreOverlap(
  skills: SkillEntry[],
  config: MatchingConfig,
): number {
  if (skills.length < 2) return 1.0;

  let totalOverlap = 0;
  let pairCount = 0;

  // Sample pairs (don't check all N^2 for large libraries)
  const sampleSize = Math.min(skills.length, 40);
  const sampled = skills.slice(0, sampleSize);

  for (let i = 0; i < sampled.length; i++) {
    for (let j = i + 1; j < sampled.length; j++) {
      const wordsA = new Set(sampled[i].description.toLowerCase().split(/\s+/));
      const wordsB = new Set(sampled[j].description.toLowerCase().split(/\s+/));

      // Jaccard similarity
      const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      const similarity = intersection / Math.max(union, 1);

      totalOverlap += similarity;
      pairCount++;
    }
  }

  const avgOverlap = pairCount > 0 ? totalOverlap / pairCount : 0;

  // Return 1.0 for no overlap, lower for more overlap
  return Math.max(0, 1.0 - avgOverlap * (config.overlapPenalty / 0.15));
}

// ── Composite Score ─────────────────────────────────────────────────────

interface ScoreBreakdown {
  matchAccuracy: number;
  libraryQuality: number;
  overlapHealth: number;
  coverageScore: number;
  total: number;
}

function computeScore(
  skills: SkillEntry[],
  metricsMap: Map<string, SkillMetrics>,
  config: MatchingConfig,
): ScoreBreakdown {
  // --- Match accuracy (40%): how well does the config route test prompts? ---
  let correctMatches = 0;
  let partialMatches = 0;
  let noMatches = 0;

  for (const testCase of TEST_CASES) {
    const result = findBestMatch(testCase.prompt, skills, metricsMap, config);

    if (!result) {
      noMatches++;
      continue;
    }

    if (result.skill.name === testCase.expectedSkill) {
      correctMatches++;
    } else if (testCase.alternativeSkills?.includes(result.skill.name)) {
      partialMatches++;
    }
    // else: wrong match, no credit
  }

  const matchAccuracy =
    (correctMatches + partialMatches * 0.5) / Math.max(TEST_CASES.length, 1);

  // --- Library quality (25%): metadata health across all skills ---
  const libraryQuality = scoreLibraryQuality(skills, metricsMap, config);

  // --- Overlap health (15%): low description overlap = better routing ---
  const overlapHealth = scoreOverlap(skills, config);

  // --- Coverage score (20%): how many test categories have at least one match ---
  const categories = new Set(TEST_CASES.map((tc) => tc.category));
  const coveredCategories = new Set<string>();
  for (const testCase of TEST_CASES) {
    const result = findBestMatch(testCase.prompt, skills, metricsMap, config);
    if (result) {
      coveredCategories.add(testCase.category);
    }
  }
  const coverageScore = coveredCategories.size / Math.max(categories.size, 1);

  // --- Weighted composite ---
  const total =
    matchAccuracy * 0.40 +
    libraryQuality * 0.25 +
    overlapHealth * 0.15 +
    coverageScore * 0.20;

  return { matchAccuracy, libraryQuality, overlapHealth, coverageScore, total };
}

// ── Domain Implementation ───────────────────────────────────────────────

let cachedSkills: SkillEntry[] | null = null;
let cachedMetrics: Map<string, SkillMetrics> | null = null;

function getSkillData(): { skills: SkillEntry[]; metrics: Map<string, SkillMetrics> } {
  if (!cachedSkills || !cachedMetrics) {
    cachedSkills = loadSkillIndex();
    cachedMetrics = new Map();
    for (const skill of cachedSkills) {
      cachedMetrics.set(skill.name, analyzeSkill(skill));
    }
    console.log(`[skill-lib] Loaded ${cachedSkills.length} skills from index`);

    // Log some quick stats
    const withWorkflows = [...cachedMetrics.values()].filter((m) => m.hasWorkflows).length;
    const withExamples = [...cachedMetrics.values()].filter((m) => m.hasExamples).length;
    const avgDesc = [...cachedMetrics.values()].reduce((s, m) => s + m.descriptionWordCount, 0) / cachedSkills.length;
    console.log(`[skill-lib]   With workflows: ${withWorkflows}/${cachedSkills.length}`);
    console.log(`[skill-lib]   With examples: ${withExamples}/${cachedSkills.length}`);
    console.log(`[skill-lib]   Avg description length: ${avgDesc.toFixed(0)} words`);
  }
  return { skills: cachedSkills, metrics: cachedMetrics };
}

const domain: Domain = {
  name: 'Skill Library Optimization',

  getBaseline(): Record<string, unknown> {
    return { ...BASELINE_CONFIG } as unknown as Record<string, unknown>;
  },

  mutate(config: Record<string, unknown>): Mutation {
    const matchConfig = config as unknown as MatchingConfig;
    const variables = Object.keys(MUTATION_RANGES) as MutableParam[];

    // Pick a random parameter to mutate
    const variable = variables[Math.floor(Math.random() * variables.length)];
    const range = MUTATION_RANGES[variable];
    const oldValue = matchConfig[variable];

    // Generate new value within range, different from current
    let newValue: number;
    const steps = Math.round((range.max - range.min) / range.step);
    do {
      const stepIndex = Math.floor(Math.random() * (steps + 1));
      newValue = range.min + stepIndex * range.step;
      // Round to avoid floating point drift
      newValue = Math.round(newValue * 1000) / 1000;
    } while (newValue === oldValue && steps > 0);

    const mutated = { ...matchConfig, [variable]: newValue };

    return {
      variable,
      oldValue,
      newValue,
      config: mutated as unknown as Record<string, unknown>,
    };
  },

  async evaluate(config: Record<string, unknown>): Promise<number> {
    const matchConfig = config as unknown as MatchingConfig;
    const { skills, metrics } = getSkillData();

    if (skills.length === 0) {
      console.warn('[skill-lib] No skills loaded — score 0');
      return 0;
    }

    const breakdown = computeScore(skills, metrics, matchConfig);

    console.log(
      `[skill-lib] Scores: accuracy=${breakdown.matchAccuracy.toFixed(3)} ` +
      `quality=${breakdown.libraryQuality.toFixed(3)} ` +
      `overlap=${breakdown.overlapHealth.toFixed(3)} ` +
      `coverage=${breakdown.coverageScore.toFixed(3)} ` +
      `total=${breakdown.total.toFixed(4)}`,
    );

    return breakdown.total;
  },
};

export default domain;

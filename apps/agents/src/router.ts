// Smart Model Router
// Classifies tasks by problem type and selects the cheapest adequate model.
// Zero-LLM classification: keyword matching only (deterministic, zero latency, zero cost).

import { eventBus } from './events';

export type ProblemType = 'reasoning' | 'effort' | 'coordination' | 'domain' | 'ambiguity';

export interface ClassificationResult {
  type: ProblemType;
  confidence: number;
  reasoning: string;
}

export interface ModelSelection {
  model: string;
  tier: 'primary' | 'fallback' | 'cheapest';
  reasoning: string;
}

// --- Keyword dictionaries ---

const REASONING_KEYWORDS = [
  'analyze', 'prove', 'derive', 'logic', 'compare', 'evaluate', 'why',
  'reason', 'deduce', 'infer', 'conclude', 'assess', 'critique', 'debate',
  'tradeoff', 'trade-off', 'pros and cons', 'implications',
];

const EFFORT_KEYWORDS = [
  'generate', 'create', 'write', 'build', 'implement', 'produce', 'list',
  'make', 'draft', 'compose', 'format', 'convert', 'translate', 'summarize',
  'refactor', 'test', 'scaffold', 'boilerplate', 'template',
];

const COORDINATION_KEYWORDS = [
  'coordinate', 'plan', 'schedule', 'assign', 'delegate', 'orchestrate',
  'prioritize', 'organize', 'manage', 'allocate', 'sequence', 'pipeline',
  'workflow', 'sprint', 'roadmap',
];

const DOMAIN_KEYWORDS = [
  'nip-', 'nostr', 'lightning', 'bitcoin', 'rust', 'solidity', 'wasm',
  'kubernetes', 'docker', 'terraform', 'graphql', 'grpc', 'protobuf',
  'mlx', 'onnx', 'pytorch', 'comfyui', 'lora', 'gguf',
];

// --- Model tier map ---

const MODEL_TIERS: Record<ProblemType, { primary: string; fallback: string; cheapest: string }> = {
  reasoning:    { primary: 'claude-opus-4-6',      fallback: 'claude-sonnet-4-6',   cheapest: 'claude-haiku-4-5-20251001' },
  effort:       { primary: 'claude-haiku-4-5-20251001', fallback: 'claude-haiku-4-5-20251001', cheapest: 'glm-4.7-flash' },
  coordination: { primary: 'claude-sonnet-4-6',    fallback: 'claude-sonnet-4-6',   cheapest: 'claude-haiku-4-5-20251001' },
  domain:       { primary: 'claude-sonnet-4-6',    fallback: 'deepseek-chat',       cheapest: 'glm-4.7-flash' },
  ambiguity:    { primary: 'claude-sonnet-4-6',    fallback: 'gemini-2.5-pro',      cheapest: 'claude-haiku-4-5-20251001' },
};

/**
 * Classify a task into a problem type using keyword matching.
 * Scores each type by counting keyword hits in title + description.
 */
export function classifyTask(title: string, description: string): ClassificationResult {
  const text = `${title} ${description}`.toLowerCase();

  const scores: Record<ProblemType, number> = {
    reasoning: 0,
    effort: 0,
    coordination: 0,
    domain: 0,
    ambiguity: 0,
  };

  // Count keyword matches
  for (const kw of REASONING_KEYWORDS) {
    if (text.includes(kw)) scores.reasoning++;
  }
  for (const kw of EFFORT_KEYWORDS) {
    if (text.includes(kw)) scores.effort++;
  }
  for (const kw of COORDINATION_KEYWORDS) {
    if (text.includes(kw)) scores.coordination++;
  }
  for (const kw of DOMAIN_KEYWORDS) {
    if (text.includes(kw)) scores.domain++;
  }

  // Ambiguity signals: question marks, hedging words
  const questionMarks = (text.match(/\?/g) || []).length;
  const hedges = ['maybe', 'could', 'might', 'what if', 'perhaps', 'not sure', 'unclear'].filter(h => text.includes(h)).length;
  scores.ambiguity = questionMarks + hedges;

  // Find highest-scoring type
  const entries = Object.entries(scores) as [ProblemType, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const [topType, topScore] = entries[0]!;
  const [, secondScore] = entries[1]!;

  // If no keywords matched, default to effort (most common)
  if (topScore === 0) {
    return { type: 'effort', confidence: 0.3, reasoning: 'No keyword signals — defaulting to effort' };
  }

  // Confidence is higher when there's a clear winner
  const gap = topScore - secondScore;
  const confidence = Math.min(0.95, 0.5 + gap * 0.15);

  return {
    type: topType,
    confidence,
    reasoning: `${topScore} keyword hits for "${topType}" (gap: ${gap} over next)`,
  };
}

/**
 * Select the best model given a problem type and current budget percentage.
 * Budget percentage: 0 = fresh budget, 1 = fully exhausted.
 */
export function selectModel(problemType: ProblemType, budgetPercentage: number): ModelSelection {
  const tiers = MODEL_TIERS[problemType];

  if (budgetPercentage < 0.6) {
    return { model: tiers.primary, tier: 'primary', reasoning: `Budget at ${(budgetPercentage * 100).toFixed(0)}% — using primary model` };
  }
  if (budgetPercentage < 0.8) {
    return { model: tiers.fallback, tier: 'fallback', reasoning: `Budget at ${(budgetPercentage * 100).toFixed(0)}% — degrading to fallback` };
  }
  return { model: tiers.cheapest, tier: 'cheapest', reasoning: `Budget at ${(budgetPercentage * 100).toFixed(0)}% — using cheapest model` };
}

/**
 * Full routing pipeline: classify → select → emit event → return model.
 */
export function routeTask(
  task: { id: string; title: string; description: string },
  agentName: string,
  budgetPercentage: number,
): { model: string; problemType: ProblemType; tier: string } {
  const classification = classifyTask(task.title, task.description);
  const selection = selectModel(classification.type, budgetPercentage);

  eventBus.publish('model_routed', {
    taskId: task.id,
    agentName,
    problemType: classification.type,
    confidence: classification.confidence,
    classificationReasoning: classification.reasoning,
    model: selection.model,
    tier: selection.tier,
    selectionReasoning: selection.reasoning,
    budgetPercentage,
  });

  return {
    model: selection.model,
    problemType: classification.type,
    tier: selection.tier,
  };
}

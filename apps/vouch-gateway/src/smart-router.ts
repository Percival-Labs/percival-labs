// Vouch Gateway — Smart Model Router
//
// Takes classification results and picks the cheapest cloud model
// that can handle the task. Cloud-only routing (no local inference).
//
// Routes to specific upstream provider models based on:
//   - Task complexity (trivial/simple/moderate/complex/expert)
//   - Task type (coding/planning/research/etc.)
//   - User overrides via agent key config

import type { ClassificationResult, TaskComplexity, TaskType } from './classifier';
import type { ProviderId } from './types';

export interface SmartRoutingDecision {
  upstreamModel: string;
  provider: ProviderId;
  format: 'anthropic' | 'openai';
  reason: string; // why this model was chosen
  estimatedSavings: number; // % savings vs all-Sonnet baseline
}

// ── Pricing table (USD per million tokens, April 2026) ──────────

interface ModelPricing {
  upstreamModel: string;
  provider: ProviderId;
  format: 'anthropic' | 'openai';
  inputUsdPerM: number;
  outputUsdPerM: number;
  contextWindow: number;
  // Lower is cheaper, used to calculate savings vs Sonnet
  // Sonnet is the baseline (1.0)
  costRelativeToSonnet: number;
}

const MODELS: Record<string, ModelPricing> = {
  // Tier: trivial / simple — cheapest viable models
  'gemini-flash': {
    upstreamModel: 'google/gemini-3-flash-preview',
    provider: 'openrouter',
    format: 'openai',
    inputUsdPerM: 0.10,
    outputUsdPerM: 0.40,
    contextWindow: 1_000_000,
    costRelativeToSonnet: 0.033, // ~3% the cost of Sonnet
  },
  'haiku': {
    upstreamModel: 'anthropic/claude-haiku-4.5',
    provider: 'openrouter',
    format: 'openai',
    inputUsdPerM: 0.80,
    outputUsdPerM: 4.00,
    contextWindow: 200_000,
    costRelativeToSonnet: 0.27,
  },
  // Tier: moderate / complex — workhorse models
  'sonnet': {
    upstreamModel: 'anthropic/claude-sonnet-4.6',
    provider: 'openrouter',
    format: 'openai',
    inputUsdPerM: 3.00,
    outputUsdPerM: 15.00,
    contextWindow: 200_000,
    costRelativeToSonnet: 1.0,
  },
  'gpt-4o': {
    upstreamModel: 'openai/gpt-4o',
    provider: 'openrouter',
    format: 'openai',
    inputUsdPerM: 2.50,
    outputUsdPerM: 10.00,
    contextWindow: 128_000,
    costRelativeToSonnet: 0.83,
  },
  // Tier: expert — only when actually needed
  'opus': {
    upstreamModel: 'anthropic/claude-opus-4.6',
    provider: 'openrouter',
    format: 'openai',
    inputUsdPerM: 15.00,
    outputUsdPerM: 75.00,
    contextWindow: 200_000,
    costRelativeToSonnet: 5.0,
  },
};

// ── Routing table: (complexity, taskType) → preferred model ─────

interface RouteEntry {
  modelKey: keyof typeof MODELS;
  reason: string;
}

const ROUTING_TABLE: Record<TaskComplexity, Partial<Record<TaskType, RouteEntry>>> = {
  trivial: {
    coding: { modelKey: 'haiku', reason: 'trivial coding → haiku' },
    conversation: { modelKey: 'gemini-flash', reason: 'trivial conversation → flash' },
    research: { modelKey: 'gemini-flash', reason: 'trivial research → flash' },
    creative: { modelKey: 'gemini-flash', reason: 'trivial creative → flash' },
    review: { modelKey: 'gemini-flash', reason: 'trivial review → flash' },
    data_transform: { modelKey: 'haiku', reason: 'trivial data → haiku' },
    math_reasoning: { modelKey: 'haiku', reason: 'trivial math → haiku' },
    planning: { modelKey: 'haiku', reason: 'trivial planning → haiku' },
  },
  simple: {
    coding: { modelKey: 'haiku', reason: 'simple coding → haiku' },
    conversation: { modelKey: 'gemini-flash', reason: 'simple conversation → flash' },
    research: { modelKey: 'gemini-flash', reason: 'simple research → flash' },
    creative: { modelKey: 'gemini-flash', reason: 'simple creative → flash' },
    review: { modelKey: 'haiku', reason: 'simple review → haiku' },
    data_transform: { modelKey: 'haiku', reason: 'simple data transform → haiku' },
    math_reasoning: { modelKey: 'haiku', reason: 'simple math → haiku' },
    planning: { modelKey: 'haiku', reason: 'simple planning → haiku' },
  },
  moderate: {
    coding: { modelKey: 'sonnet', reason: 'moderate coding → sonnet' },
    conversation: { modelKey: 'haiku', reason: 'moderate conversation → haiku' },
    research: { modelKey: 'sonnet', reason: 'moderate research → sonnet' },
    creative: { modelKey: 'sonnet', reason: 'moderate creative → sonnet' },
    review: { modelKey: 'sonnet', reason: 'moderate review → sonnet' },
    data_transform: { modelKey: 'sonnet', reason: 'moderate data → sonnet' },
    math_reasoning: { modelKey: 'sonnet', reason: 'moderate math → sonnet' },
    planning: { modelKey: 'sonnet', reason: 'moderate planning → sonnet' },
  },
  complex: {
    coding: { modelKey: 'sonnet', reason: 'complex coding → sonnet' },
    conversation: { modelKey: 'sonnet', reason: 'complex conversation → sonnet' },
    research: { modelKey: 'sonnet', reason: 'complex research → sonnet' },
    creative: { modelKey: 'sonnet', reason: 'complex creative → sonnet' },
    review: { modelKey: 'sonnet', reason: 'complex review → sonnet' },
    data_transform: { modelKey: 'sonnet', reason: 'complex data → sonnet' },
    math_reasoning: { modelKey: 'sonnet', reason: 'complex math → sonnet' },
    planning: { modelKey: 'sonnet', reason: 'complex planning → sonnet' },
  },
  // v12: Expert routes to Opus. Classifier now requires BOTH high score AND
  // expert verbs before classifying as expert, so false-positive Opus routing
  // is controlled at the classifier level, not the routing table.
  expert: {
    coding: { modelKey: 'opus', reason: 'expert coding → opus' },
    conversation: { modelKey: 'sonnet', reason: 'expert conversation → sonnet' },
    research: { modelKey: 'opus', reason: 'expert research → opus' },
    creative: { modelKey: 'opus', reason: 'expert creative → opus' },
    review: { modelKey: 'opus', reason: 'expert review → opus' },
    data_transform: { modelKey: 'sonnet', reason: 'expert data → sonnet' },
    math_reasoning: { modelKey: 'opus', reason: 'expert math → opus' },
    planning: { modelKey: 'opus', reason: 'expert planning → opus' },
  },
};

// Default route when task type isn't in the table
const DEFAULT_BY_COMPLEXITY: Record<TaskComplexity, RouteEntry> = {
  trivial: { modelKey: 'gemini-flash', reason: 'trivial default → flash' },
  simple: { modelKey: 'haiku', reason: 'simple default → haiku' },
  moderate: { modelKey: 'sonnet', reason: 'moderate default → sonnet' },
  complex: { modelKey: 'sonnet', reason: 'complex default → sonnet' },
  expert: { modelKey: 'opus', reason: 'expert default → opus' },
};

// ── Routing function ────────────────────────────────────────────

/**
 * Pick the cheapest cloud model that can handle the classified task.
 * Falls back to Sonnet if classification fails or is low-confidence.
 */
export function selectModel(classification: ClassificationResult): SmartRoutingDecision {
  const { complexity, taskType, confidence } = classification;

  // Low confidence: be safer, bump up one tier (threshold optimized via offline search)
  let effectiveComplexity = complexity;
  if (confidence < 0.4) {
    const bumpUp: Record<TaskComplexity, TaskComplexity> = {
      trivial: 'simple',
      simple: 'moderate',
      moderate: 'complex',
      complex: 'expert',
      expert: 'expert',
    };
    effectiveComplexity = bumpUp[complexity];
  }

  // Look up the route
  const taskRoutes = ROUTING_TABLE[effectiveComplexity] || {};
  const entry = taskRoutes[taskType] ?? DEFAULT_BY_COMPLEXITY[effectiveComplexity];

  const model = MODELS[entry.modelKey];
  if (!model) {
    // Should never happen but fall back to sonnet
    const sonnet = MODELS.sonnet!;
    return {
      upstreamModel: sonnet.upstreamModel,
      provider: sonnet.provider,
      format: sonnet.format,
      reason: 'fallback: model not found',
      estimatedSavings: 0,
    };
  }

  const savings = Math.round((1 - model.costRelativeToSonnet) * 100);

  return {
    upstreamModel: model.upstreamModel,
    provider: model.provider,
    format: model.format,
    reason: entry.reason + (confidence < 0.6 ? ` (low-confidence bumped from ${complexity})` : ''),
    estimatedSavings: savings,
  };
}

/**
 * Look up pricing for a model by upstream model ID.
 */
export function getPricingFor(upstreamModel: string): ModelPricing | null {
  for (const model of Object.values(MODELS)) {
    if (model.upstreamModel === upstreamModel) return model;
  }
  return null;
}

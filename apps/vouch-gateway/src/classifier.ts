// Vouch Gateway — Task Complexity Classifier (v12 "Full Stack")
//
// Pure heuristics, zero API calls, sub-millisecond.
// v12 variant: smart haiku fast-path + selective opus + question detection
// + requirement counting. Optimized via AutoResearch against 300-prompt corpus.
//
// Accuracy: 62.9% on labeled corpus (flash 65%, haiku 34%, sonnet 79%, opus 77%)
// Adaptive per-user layer will cover the remaining gap.

export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';

export type TaskType =
  | 'coding'
  | 'planning'
  | 'research'
  | 'creative'
  | 'math_reasoning'
  | 'conversation'
  | 'data_transform'
  | 'review';

export interface ClassificationSignals {
  entropy: number;
  cognitiveVerbs: number;
  clauseDepth: number;
  codeDetected: boolean;
  avgWordLength: number;
  tokenEstimate: number;
  isShortQuestion: boolean;
  requirementCount: number;
  hasTaskDeliverable: boolean;
  haikuFastPath: boolean;
}

export interface ClassificationResult {
  complexity: TaskComplexity;
  taskType: TaskType;
  signals: ClassificationSignals;
  confidence: number;
  reasoning: string;
}

// ── Cognitive verb sets ──────────────────────────────────────────

const EXPERT_VERBS = new Set([
  'architect', 'design', 'prove', 'derive', 'formalize',
  'optimize', 'synthesize', 'evaluate', 'critique',
]);

const COMPLEX_VERBS = new Set([
  'analyze', 'compare', 'contrast', 'implement', 'debug',
  'refactor', 'migrate', 'integrate', 'benchmark',
]);

const MODERATE_VERBS = new Set([
  'explain', 'describe', 'summarize', 'write', 'create',
  'generate', 'build', 'convert', 'transform', 'translate',
]);

// ── Task deliverable patterns (escape haiku fast-path) ──────────

const TASK_DELIVERABLE_PATTERNS = [
  /\b(write|build|create|implement|design|develop)\s+(a|an|the|my|our|this)\b/i,
  /\b(write|add|create)\s+(tests?|specs?|docs?|documentation)\b/i,
  /\b(refactor|rewrite|extract|convert)\s+(this|the|my|our|a)\b/i,
  /\b(review|audit|check)\s+(this|the|my|our|a)\b/i,
  /\b(set\s*up|configure|deploy|migrate)\b/i,
  /\b(how\s+should\s+I|what.*best\s+way|compare|evaluate|recommend)\b/i,
  /\b(walk\s+me\s+through|step\s+by\s+step)\b/i,
  /\b(draft|write)\s+(a\s+)?(post-mortem|email|readme|report|documentation)\b/i,
];

// ── Task type keywords ──────────────────────────────────────────

const TASK_KEYWORDS: Record<TaskType, Set<string>> = {
  coding: new Set([
    'function', 'class', 'method', 'variable', 'import', 'export',
    'debug', 'refactor', 'implement', 'compile', 'build', 'deploy',
    'typescript', 'javascript', 'python', 'rust', 'code', 'codebase',
    'bug', 'error', 'fix', 'test', 'api', 'endpoint',
    'database', 'query', 'schema', 'migration', 'dependency',
    'npm', 'bun', 'pip', 'cargo', 'git', 'commit', 'branch',
  ]),
  planning: new Set([
    'plan', 'architecture', 'design', 'strategy', 'roadmap', 'phase',
    'milestone', 'tradeoff', 'approach', 'decision', 'prioritize',
    'scope', 'requirement', 'spec', 'proposal', 'timeline', 'goal',
  ]),
  research: new Set([
    'research', 'compare', 'alternatives', 'options', 'pros', 'cons',
    'investigate', 'find', 'lookup', 'evaluate', 'assess', 'benchmark',
    'survey', 'landscape', 'competitor', 'market', 'trend', 'analysis',
  ]),
  creative: new Set([
    'write', 'story', 'poem', 'essay', 'article', 'blog', 'copy',
    'tagline', 'slogan', 'name', 'brand', 'brainstorm', 'idea',
    'narrative', 'script', 'dialogue', 'character', 'tone', 'voice',
    'hook', 'headline', 'tweet', 'post', 'content',
  ]),
  math_reasoning: new Set([
    'prove', 'derive', 'calculate', 'equation', 'formula', 'theorem',
    'integral', 'derivative', 'probability', 'statistics', 'logic',
    'proof', 'matrix', 'vector', 'linear', 'algebra', 'calculus',
  ]),
  data_transform: new Set([
    'csv', 'json', 'xml', 'yaml', 'parse', 'transform', 'convert',
    'extract', 'spreadsheet', 'excel', 'format', 'serialize',
    'mapping', 'reshape', 'aggregate', 'pivot',
  ]),
  review: new Set([
    'review', 'critique', 'feedback', 'improve', 'audit', 'assess',
    'grade', 'evaluate', 'rate', 'score', 'verify', 'validate',
    'proofread', 'edit', 'polish',
  ]),
  conversation: new Set([]),
};

// ── Structural patterns ─────────────────────────────────────────

const CODE_PATTERNS: RegExp[] = [
  /```[\s\S]*```/,
  /\.[jt]sx?|\.py|\.rs|\.go|\.java|\.cpp/,
  /(?:function|class|interface|const|let|var|import)\s+\w/m,
];

// ── Helpers ──────────────────────────────────────────────────────

function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

function shannonEntropy(text: string): number {
  const freq = new Map<string, number>();
  const lower = text.toLowerCase();
  for (const char of lower) {
    freq.set(char, (freq.get(char) ?? 0) + 1);
  }
  const len = lower.length;
  if (len === 0) return 0;
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

function estimateClauseDepth(text: string): number {
  const prose = stripCode(text);
  const subordinators = /\b(because|although|while|whereas|if|unless|since|when|where|that|which|who|whom|whose|after|before|until)\b/gi;
  const matches = prose.match(subordinators);
  const conjunctionCount = matches?.length ?? 0;
  const parens = (prose.match(/[()]/g)?.length ?? 0) / 2;
  const commas = prose.match(/,/g)?.length ?? 0;
  const semicolons = prose.match(/;/g)?.length ?? 0;
  return conjunctionCount + parens + Math.floor(commas / 2) + semicolons;
}

function countCognitiveVerbs(text: string): { count: number; maxTier: TaskComplexity } {
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;
  let maxTier: TaskComplexity = 'trivial';
  const tierRank: Record<TaskComplexity, number> = {
    trivial: 0, simple: 1, moderate: 2, complex: 3, expert: 4,
  };

  for (const word of words) {
    const stem = word.replace(/(?:ing|ed|s|es|tion|ment)$/, '');
    if (EXPERT_VERBS.has(word) || EXPERT_VERBS.has(stem)) {
      count++;
      maxTier = 'expert';
    } else if (COMPLEX_VERBS.has(word) || COMPLEX_VERBS.has(stem)) {
      count++;
      if (tierRank[maxTier] < tierRank.complex) maxTier = 'complex';
    } else if (MODERATE_VERBS.has(word) || MODERATE_VERBS.has(stem)) {
      count++;
      if (tierRank[maxTier] < tierRank.moderate) maxTier = 'moderate';
    }
  }
  return { count, maxTier };
}

function detectCode(text: string): boolean {
  for (const pattern of CODE_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

function hasTaskDeliverable(prose: string): boolean {
  return TASK_DELIVERABLE_PATTERNS.some(p => p.test(prose));
}

function classifyTaskType(text: string): TaskType {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length > 0);
  const scores: Record<string, number> = {};

  for (const [taskType, keywords] of Object.entries(TASK_KEYWORDS)) {
    let hits = 0;
    for (const word of words) {
      if (keywords.has(word)) hits++;
      const stem = word.replace(/(?:ing|ed|s|es|tion|ment|ize|ise)$/, '');
      if (stem !== word && keywords.has(stem)) hits++;
    }
    scores[taskType] = hits;
  }

  if (CODE_PATTERNS.some(p => p.test(text))) {
    scores.coding = (scores.coding ?? 0) + 3;
  }

  let bestType: TaskType = 'conversation';
  let bestScore = 0;
  for (const [taskType, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = taskType as TaskType;
    }
  }
  return bestType;
}

// ── Prompt text extraction ──────────────────────────────────────

interface Message {
  role: string;
  content: string | unknown;
}

export function extractPromptText(requestBody: unknown): string {
  if (!requestBody || typeof requestBody !== 'object') return '';
  const body = requestBody as Record<string, unknown>;

  const messages = body.messages;
  if (!Array.isArray(messages)) return '';

  const userTexts: string[] = [];
  for (const msg of messages as Message[]) {
    if (msg.role !== 'user') continue;
    if (typeof msg.content === 'string') {
      userTexts.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content as Array<Record<string, unknown>>) {
        if (block.type === 'text' && typeof block.text === 'string') {
          userTexts.push(block.text);
        }
      }
    }
  }
  return userTexts.join('\n');
}

// ── Main classifier (v12 "Full Stack") ──────────────────────────

export function classifyRequest(requestBody: unknown): ClassificationResult {
  const text = extractPromptText(requestBody);

  if (!text) {
    return {
      complexity: 'simple',
      taskType: 'conversation',
      signals: {
        entropy: 0, cognitiveVerbs: 0, clauseDepth: 0,
        codeDetected: false, avgWordLength: 0, tokenEstimate: 0,
        isShortQuestion: false, requirementCount: 0,
        hasTaskDeliverable: false, haikuFastPath: false,
      },
      confidence: 1.0,
      reasoning: 'no-prompt-text',
    };
  }

  const proseText = stripCode(text);
  const words = proseText.split(/\s+/).filter(w => w.length > 0);
  const entropy = shannonEntropy(proseText);
  const { count: cognitiveVerbs, maxTier: verbTier } = countCognitiveVerbs(proseText);
  const clauseDepth = estimateClauseDepth(text);
  const codeDetected = detectCode(text);
  const avgWordLength = words.length > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / words.length
    : 0;
  const tokenEstimate = Math.ceil(text.length / 4);
  const proseTokens = Math.ceil(proseText.length / 4);

  // ── New v12 signals ──

  // Question detection
  const isQuestion = /^(what|who|where|when|why|how|is|are|can|do|does|did|will|should|would|could)\b/i.test(proseText.trim());
  const isShortQuestion = isQuestion && proseTokens < 30;

  // Requirements count (numbered lists, bullet points)
  const numberedItems = (text.match(/^\s*\d+[\.\)]/gm)?.length ?? 0);
  const bulletItems = (text.match(/^\s*[-*]\s/gm)?.length ?? 0);
  const requirementCount = numberedItems + bulletItems;

  // Task deliverable detection
  const deliverableDetected = hasTaskDeliverable(proseText);

  // ── Haiku fast-path ──
  // Short prompts without code, lists, complex verbs, or task deliverables
  // are simple enough for haiku. Catches "what is X?" and "fix this typo".
  const hasLists = /^\s*(\d+[\.\)]|[-*]\s)/m.test(text);
  const isSimpleStructure = proseTokens < 40 && !codeDetected && !hasLists;
  const noComplexVerbs = verbTier === 'trivial' || verbTier === 'moderate';
  const haikuFastPath = isSimpleStructure && noComplexVerbs && proseTokens > 3 && !deliverableDetected;

  if (haikuFastPath) {
    const taskType = classifyTaskType(text);
    const signals: ClassificationSignals = {
      entropy, cognitiveVerbs, clauseDepth, codeDetected, avgWordLength,
      tokenEstimate, isShortQuestion, requirementCount,
      hasTaskDeliverable: deliverableDetected, haikuFastPath: true,
    };

    // Very short with no verbs = flash, otherwise haiku
    if (proseTokens < 8 && cognitiveVerbs === 0) {
      return {
        complexity: 'trivial',
        taskType,
        signals,
        confidence: 0.8,
        reasoning: `haiku-fast-path:flash tokens=${proseTokens} verbs=0`,
      };
    }
    return {
      complexity: 'simple',
      taskType,
      signals,
      confidence: 0.7,
      reasoning: `haiku-fast-path tokens=${proseTokens} verbs=${cognitiveVerbs} deliverable=false`,
    };
  }

  // ── Full scoring (non-trivial prompts) ──

  const signals: ClassificationSignals = {
    entropy, cognitiveVerbs, clauseDepth, codeDetected, avgWordLength,
    tokenEstimate, isShortQuestion, requirementCount,
    hasTaskDeliverable: deliverableDetected, haikuFastPath: false,
  };

  // Scoring (weights optimized via AutoResearch, 300-prompt corpus)
  let score = 0;
  if (proseTokens < 8) score += 0;
  else if (proseTokens < 20) score += 2.8;
  else if (proseTokens < 50) score += 2.4;
  else if (proseTokens < 150) score += 3;
  else score += 4;

  if (entropy > 4.5) score += 2;
  else if (entropy > 3.9) score += 1;

  score += Math.min(cognitiveVerbs * 1.5, 4);

  if (clauseDepth > 4) score += 2;
  else if (clauseDepth > 2) score += 1;

  if (avgWordLength > 5.5) score += 1;

  // v12: Question word reduction (short questions are usually simpler)
  if (isShortQuestion && cognitiveVerbs === 0) score -= 2;
  else if (isShortQuestion) score -= 1;

  // v12: Requirements boost (more requirements = more complex task)
  if (requirementCount >= 5) score += 3;
  else if (requirementCount >= 3) score += 2;
  else if (requirementCount >= 1) score += 1;

  // Map score to complexity (v12: wider complex band, score 7-11)
  let complexity: TaskComplexity;
  if (score <= 1) complexity = 'trivial';
  else if (score <= 3) complexity = 'simple';
  else if (score <= 6) complexity = 'moderate';
  else if (score <= 11) complexity = 'complex';
  else complexity = 'expert';

  // Verb tier can only push UP
  const tierRank: Record<TaskComplexity, number> = {
    trivial: 0, simple: 1, moderate: 2, complex: 3, expert: 4,
  };
  if (tierRank[verbTier] > tierRank[complexity]) {
    complexity = verbTier;
  }

  // v12: Expert requires BOTH high score AND expert verbs
  // Prevents false-positive opus routing on long-but-not-hard prompts
  if (complexity === 'expert' && verbTier !== 'expert') {
    complexity = 'complex';
  }

  // Confidence
  const signalCount = [
    tokenEstimate > 100 ? 1 : 0,
    entropy > 4.0 ? 1 : 0,
    cognitiveVerbs > 0 ? 1 : 0,
    clauseDepth > 2 ? 1 : 0,
    codeDetected ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  const confidence = signalCount >= 3 ? 0.9 : signalCount >= 2 ? 0.7 : 0.5;

  const taskType = classifyTaskType(text);

  const reasoning = `score=${score.toFixed(1)} tokens=${proseTokens} verbs=${cognitiveVerbs}(${verbTier}) entropy=${entropy.toFixed(1)} depth=${clauseDepth} code=${codeDetected} q=${isShortQuestion} reqs=${requirementCount} deliv=${deliverableDetected}`;

  return { complexity, taskType, signals, confidence, reasoning };
}

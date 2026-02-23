// Multi-Model Provider — Routes agent execution through four paths:
// 1. Ollama (local models on Apple Silicon — zero cost, full privacy)
// 2. OpenRouter (cloud models from any provider — single API key)
// 3. Anthropic SDK (direct Claude fallback)
// 4. Agent Zero (workforce tier — autonomous tool-using agents via REST)

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { WORKSPACE_TOOLS, executeWorkspaceTool, toOpenAITools } from './workspace-tools';

// Cloud model IDs as they appear on OpenRouter
export const MODELS = {
  // Anthropic
  'claude-opus-4-6': 'anthropic/claude-opus-4-6',
  'claude-sonnet-4-5': 'anthropic/claude-sonnet-4-5-20250929',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4-5-20251001',
  // OpenAI
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  // Google
  'gemini-2.5-pro': 'google/gemini-2.5-pro-preview-05-06',
  'gemini-2.0-flash': 'google/gemini-2.0-flash-001',
  // xAI
  'grok-3': 'x-ai/grok-3-beta',
  // Meta
  'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
  // DeepSeek
  'deepseek-r1': 'deepseek/deepseek-r1',
  'deepseek-v3': 'deepseek/deepseek-chat-v3-0324',
  // MiniMax
  'minimax-m2.5': 'minimax/minimax-m2.5',
  // THUDM
  'glm-4.7': 'thudm/glm-4.7-chat',
  // Qwen
  'qwen3-coder': 'qwen/qwen3-coder',
  'qwen3-coder-next': 'qwen/qwen3-coder-next',
  'qwen3-235b': 'qwen/qwen3-235b-a22b',
} as const;

export type ModelKey = keyof typeof MODELS;

export interface CompletionRequest {
  model: string;
  system: string;
  userMessage: string;
  maxTokens?: number;
}

export interface CompletionResult {
  output: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  provider: 'ollama' | 'openrouter' | 'anthropic' | 'agent-zero';
}

/**
 * Determine the routing path for a model preference string.
 * Returns { provider, modelId } where provider indicates which client to use.
 */
export function resolveModel(preference: string): { provider: 'ollama' | 'openrouter' | 'anthropic' | 'agent-zero'; modelId: string } {
  // Local Ollama models: "ollama/qwen2.5-coder:32b" → route to Ollama
  if (preference.startsWith('ollama/')) {
    return { provider: 'ollama', modelId: preference.slice('ollama/'.length) };
  }

  // Agent Zero workforce: "agent-zero" or "agent-zero/coder" etc.
  if (preference === 'agent-zero' || preference.startsWith('agent-zero/')) {
    return { provider: 'agent-zero', modelId: preference };
  }

  // Direct model key match (e.g. 'gpt-4o' → OpenRouter ID)
  if (preference in MODELS) {
    return { provider: 'openrouter', modelId: MODELS[preference as ModelKey] };
  }

  // Legacy preference names
  switch (preference) {
    case 'opus':
      return { provider: 'openrouter', modelId: MODELS['claude-opus-4-6'] };
    case 'sonnet':
      return { provider: 'openrouter', modelId: MODELS['claude-sonnet-4-5'] };
    case 'haiku':
      return { provider: 'openrouter', modelId: MODELS['claude-haiku-4-5'] };
  }

  // Full OpenRouter-style ID with slash (e.g. 'anthropic/claude-opus-4-6')
  if (preference.includes('/')) {
    return { provider: 'openrouter', modelId: preference };
  }

  // Default fallback
  return { provider: 'openrouter', modelId: MODELS['claude-sonnet-4-5'] };
}

// ── Client singletons ──

let openrouterClient: OpenAI | null = null;
let ollamaClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOllamaClient(): OpenAI | null {
  if (ollamaClient) return ollamaClient;
  const baseURL = process.env.OLLAMA_URL || 'http://localhost:11434/v1';
  ollamaClient = new OpenAI({
    baseURL,
    apiKey: 'ollama', // Ollama doesn't require a real key
  });
  return ollamaClient;
}

function getOpenRouterClient(): OpenAI | null {
  if (openrouterClient) return openrouterClient;
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  openrouterClient = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: key,
    defaultHeaders: {
      'HTTP-Referer': 'https://percivallabs.com',
      'X-Title': 'Percival Labs Agent Team',
    },
  });
  return openrouterClient;
}

function getAnthropicClient(): Anthropic | null {
  if (anthropicClient) return anthropicClient;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  anthropicClient = new Anthropic({ apiKey: key });
  return anthropicClient;
}

/**
 * Execute a completion against any model via the appropriate provider.
 * Routing: ollama/ → local, agent-zero → workforce workers, cloud → OpenRouter/Anthropic
 */
export async function complete(req: CompletionRequest): Promise<CompletionResult> {
  const resolved = resolveModel(req.model);
  const maxTokens = req.maxTokens ?? 4096;

  switch (resolved.provider) {
    case 'ollama': {
      const client = getOllamaClient();
      if (!client) throw new Error('Ollama client could not be initialized');
      return completeViaOllama(client, resolved.modelId, req, maxTokens);
    }

    case 'agent-zero': {
      return completeViaAgentZero(resolved.modelId, req);
    }

    case 'openrouter': {
      // Try OpenRouter first
      const orClient = getOpenRouterClient();
      if (orClient) {
        return completeViaOpenRouter(orClient, resolved.modelId, req, maxTokens);
      }
      // Fallback: Ollama (local) — use OLLAMA_FALLBACK_MODEL or default to glm-4.7-flash
      const ollamaFallback = getOllamaClient();
      if (ollamaFallback) {
        const fallbackModel = process.env.OLLAMA_FALLBACK_MODEL || 'glm-4.7-flash';
        console.log(`[providers] No OpenRouter key, falling back to Ollama/${fallbackModel}`);
        return completeViaOllama(ollamaFallback, fallbackModel, req, maxTokens);
      }
      // Last resort: Anthropic SDK
      const anthClient = getAnthropicClient();
      if (anthClient) {
        const fallbackModelId = resolved.modelId.startsWith('anthropic/')
          ? resolved.modelId
          : MODELS['claude-sonnet-4-5'];
        return completeViaAnthropic(anthClient, fallbackModelId, req, maxTokens);
      }
      throw new Error(
        `No API key available for model "${resolved.modelId}". Set OPENROUTER_API_KEY, configure Ollama, or set ANTHROPIC_API_KEY.`
      );
    }

    case 'anthropic': {
      const anthClient = getAnthropicClient();
      if (anthClient) {
        return completeViaAnthropic(anthClient, resolved.modelId, req, maxTokens);
      }
      throw new Error('ANTHROPIC_API_KEY not set');
    }
  }
}

// ── Provider implementations ──

async function completeViaOllama(
  client: OpenAI,
  modelId: string,
  req: CompletionRequest,
  maxTokens: number,
): Promise<CompletionResult> {
  const hasWorkspace = !!process.env.WORKSPACE_PATH;
  const tools = hasWorkspace ? toOpenAITools() : undefined;

  type OllamaMessage = { role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string };
  const messages: OllamaMessage[] = [
    { role: 'system', content: req.system },
    { role: 'user', content: req.userMessage },
  ];

  let totalInput = 0;
  let totalOutput = 0;
  const textParts: string[] = [];
  const MAX_TOOL_ROUNDS = 10;
  const MAX_RETRIES = 3;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    let response: OpenAI.Chat.ChatCompletion;

    // Retry on connection errors (Ollama may be starting up)
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await client.chat.completions.create({
          model: modelId,
          max_tokens: maxTokens,
          messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
          ...(tools ? { tools } : {}),
        });
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable = msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('Connection error');
        if (isRetryable && attempt < MAX_RETRIES) {
          const backoffMs = 1000 * Math.pow(2, attempt);
          console.log(`[ollama] Connection failed, retrying in ${(backoffMs / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        throw err;
      }
    }

    totalInput += response!.usage?.prompt_tokens ?? 0;
    totalOutput += response!.usage?.completion_tokens ?? 0;

    const choice = response!.choices[0]?.message as Record<string, unknown> | undefined;

    // Collect text content (handle Qwen3 reasoning field)
    const content = (choice?.content as string) || (choice?.reasoning as string) || '';
    if (content) {
      textParts.push(content);
    }

    // Check for tool calls
    const toolCalls = choice?.tool_calls as Array<{
      id: string;
      function: { name: string; arguments: string };
    }> | undefined;

    if (!toolCalls || toolCalls.length === 0) {
      break; // No tool calls — done
    }

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: content || '',
      tool_calls: toolCalls,
    });

    // Execute each tool call and add results
    for (const toolCall of toolCalls) {
      let input: Record<string, string>;
      try {
        input = JSON.parse(toolCall.function.arguments);
      } catch {
        input = {};
      }
      console.log(`[workspace] ${toolCall.function.name}(${JSON.stringify(input)})`);
      const result = executeWorkspaceTool(toolCall.function.name, input);
      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id,
      });
    }
  }

  return {
    output: textParts.join('\n\n'),
    model: `ollama/${modelId}`,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    provider: 'ollama',
  };
}

async function completeViaOpenRouter(
  client: OpenAI,
  modelId: string,
  req: CompletionRequest,
  maxTokens: number,
): Promise<CompletionResult> {
  const response = await client.chat.completions.create({
    model: modelId,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: req.system },
      { role: 'user', content: req.userMessage },
    ],
  });

  const output = response.choices[0]?.message?.content || '';

  return {
    output,
    model: modelId,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    provider: 'openrouter',
  };
}

async function completeViaAnthropic(
  client: Anthropic,
  modelId: string,
  req: CompletionRequest,
  maxTokens: number,
): Promise<CompletionResult> {
  // Strip 'anthropic/' prefix for direct API
  const anthropicModel = modelId.replace('anthropic/', '');

  // Include workspace tools if workspace is available
  const hasWorkspace = !!process.env.WORKSPACE_PATH;
  const tools = hasWorkspace ? WORKSPACE_TOOLS : undefined;

  let messages: Anthropic.MessageParam[] = [
    { role: 'user', content: req.userMessage },
  ];

  let totalInput = 0;
  let totalOutput = 0;
  const textParts: string[] = [];
  const MAX_TOOL_ROUNDS = 10;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    // Retry with exponential backoff on rate limit (429) errors
    let response: Anthropic.Message;
    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await client.messages.create({
          model: anthropicModel,
          max_tokens: maxTokens,
          system: req.system,
          messages,
          ...(tools ? { tools } : {}),
        });
        break;
      } catch (err: unknown) {
        const isRetryable = err instanceof Error && (
          err.message.includes('429') || err.message.includes('rate_limit') ||
          err.message.includes('500') || err.message.includes('502') ||
          err.message.includes('503') || err.message.includes('529') ||
          err.message.includes('Internal server error') || err.message.includes('overloaded')
        );
        if (isRetryable && attempt < MAX_RETRIES) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt), 60000);
          console.log(`[anthropic] Rate limited, retrying in ${(backoffMs / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        throw err;
      }
    }

    totalInput += response.usage?.input_tokens ?? 0;
    totalOutput += response.usage?.output_tokens ?? 0;

    // Collect text blocks
    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
      }
    }

    // If no tool use or stop_reason is 'end_turn', we're done
    if (response.stop_reason !== 'tool_use') {
      break;
    }

    // Handle tool use blocks
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0) break;

    // Add assistant message with all content (text + tool_use)
    messages.push({ role: 'assistant', content: response.content });

    // Execute each tool and build tool_result message
    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(toolUse => {
      const input = toolUse.input as Record<string, string>;
      console.log(`[workspace] ${toolUse.name}(${JSON.stringify(input)})`);
      const result = executeWorkspaceTool(toolUse.name, input);
      return {
        type: 'tool_result' as const,
        tool_use_id: toolUse.id,
        content: result,
      };
    });

    messages.push({ role: 'user', content: toolResults });
  }

  return {
    output: textParts.join('\n\n'),
    model: modelId,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    provider: 'anthropic',
  };
}

// ── Agent Zero Worker Pool ──

interface WorkerState {
  url: string;
  specialization: string; // 'coder' | 'researcher' | 'general'
  busy: boolean;
  lastError: number; // timestamp of last error (0 = no error)
}

let workerPool: WorkerState[] | null = null;

function getWorkerPool(): WorkerState[] {
  if (workerPool) return workerPool;

  const urlsRaw = process.env.A0_WORKER_URLS || '';
  const urls = urlsRaw.split(',').map(u => u.trim()).filter(Boolean);

  if (urls.length === 0) {
    // Default Docker DNS names (Agent Zero serves on port 80)
    urls.push('http://a0-coder:80', 'http://a0-researcher:80', 'http://a0-general:80');
  }

  workerPool = urls.map(url => {
    // Derive specialization from hostname: "http://a0-coder:50080" → "coder"
    const hostname = new URL(url).hostname;
    const spec = hostname.replace(/^a0-/, '').split('.')[0] || 'general';
    return { url, specialization: spec, busy: false, lastError: 0 };
  });

  return workerPool;
}

const ERROR_COOLDOWN_MS = 30_000; // 30s cooldown after a worker error

/**
 * Pick the best available worker. Prefers specialization match, then any idle worker.
 * Workers in error cooldown or busy are deprioritized.
 */
function pickWorker(preferSpecialization: string): WorkerState | null {
  const pool = getWorkerPool();
  const now = Date.now();

  // Filter to available workers (not busy, not in error cooldown)
  const available = pool.filter(w => !w.busy && (now - w.lastError) > ERROR_COOLDOWN_MS);
  if (available.length === 0) {
    // Fall back: try any non-busy worker ignoring cooldown
    const nonBusy = pool.filter(w => !w.busy);
    if (nonBusy.length === 0) return null;
    // Prefer specialization match even in fallback
    return nonBusy.find(w => w.specialization === preferSpecialization) || nonBusy[0]!;
  }

  // Prefer specialization match
  return available.find(w => w.specialization === preferSpecialization) || available[0]!;
}

/**
 * Send a task to an Agent Zero worker via REST API.
 * Workers run autonomously with browser, code execution, and web search capabilities.
 */
async function completeViaAgentZero(modelId: string, req: CompletionRequest): Promise<CompletionResult> {
  const apiKey = process.env.A0_API_KEY || '';
  const timeoutMs = 300_000; // 5 minutes for autonomous tasks

  // Resolve specialization hint from modelId: "agent-zero/coder" → "coder", "agent-zero" → "general"
  const parts = modelId.split('/');
  const preferSpecialization = parts.length > 1 ? parts[1]! : 'general';

  const worker = pickWorker(preferSpecialization);
  if (!worker) {
    throw new Error('All Agent Zero workers are busy. Try again shortly.');
  }

  worker.busy = true;
  const combinedMessage = `[System instructions]\n${req.system}\n\n[Task]\n${req.userMessage}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${worker.url}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-KEY': apiKey } : {}),
      },
      body: JSON.stringify({ text: combinedMessage }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error');
      throw new Error(`Agent Zero ${worker.specialization} returned ${response.status}: ${errorText}`);
    }

    const data = await response.json() as { message?: string; response?: string; output?: string };
    const output = data.message || data.response || data.output || '';

    return {
      output,
      model: modelId,
      inputTokens: 0,
      outputTokens: 0,
      provider: 'agent-zero',
    };
  } catch (err: unknown) {
    worker.lastError = Date.now();
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes('aborted') || msg.includes('AbortError')) {
      return {
        output: `Agent Zero ${worker.specialization} timeout: worker did not complete within 5 minutes.`,
        model: modelId,
        inputTokens: 0,
        outputTokens: 0,
        provider: 'agent-zero',
      };
    }

    throw new Error(`Agent Zero ${worker.specialization} error: ${msg}`);
  } finally {
    worker.busy = false;
  }
}

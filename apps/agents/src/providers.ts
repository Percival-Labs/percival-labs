// Multi-Model Provider — Routes agent execution through three paths:
// 1. Ollama (local models on Apple Silicon — zero cost, full privacy)
// 2. OpenRouter (cloud models from any provider — single API key)
// 3. Anthropic SDK (direct Claude fallback)
// 4. OpenClaw (chaos agent — autonomous tool-using agent via HTTP)

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
  provider: 'ollama' | 'openrouter' | 'anthropic' | 'openclaw';
}

/**
 * Determine the routing path for a model preference string.
 * Returns { provider, modelId } where provider indicates which client to use.
 */
export function resolveModel(preference: string): { provider: 'ollama' | 'openrouter' | 'anthropic' | 'openclaw'; modelId: string } {
  // Local Ollama models: "ollama/qwen2.5-coder:32b" → route to Ollama
  if (preference.startsWith('ollama/')) {
    return { provider: 'ollama', modelId: preference.slice('ollama/'.length) };
  }

  // OpenClaw chaos agent: "openclaw" → route to OpenClaw Gateway
  if (preference === 'openclaw') {
    return { provider: 'openclaw', modelId: 'openclaw' };
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
 * Routing: ollama/ → local, openclaw → OpenClaw Gateway, cloud → OpenRouter/Anthropic
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

    case 'openclaw': {
      return completeViaOpenClaw(req);
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

/**
 * Send a task to the OpenClaw Gateway via WebSocket JSON-RPC and get a response.
 * OpenClaw processes the task autonomously with tool access (exec, browser, web search).
 *
 * Protocol flow:
 * 1. Connect WebSocket → send "connect" request with token
 * 2. Receive "hello-ok" → send "chat.send" with combined system+user message
 * 3. Collect "agent" events (stream: "assistant") for response text
 * 4. "agent.wait" or lifecycle "end" event signals completion
 */
async function completeViaOpenClaw(req: CompletionRequest): Promise<CompletionResult> {
  const gatewayUrl = process.env.OPENCLAW_URL || 'http://openclaw:18789';
  const token = process.env.OPENCLAW_TOKEN || '';
  const wsUrl = gatewayUrl.replace(/^http/, 'ws');
  const timeoutMs = 120_000; // 2 minute timeout for autonomous tasks

  return new Promise<CompletionResult>((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const chunks: string[] = [];
    let idempotencyKey = '';
    let settled = false;

    const cleanup = () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        // Return whatever we collected so far rather than failing
        resolve({
          output: chunks.length > 0
            ? chunks.join('')
            : 'OpenClaw timeout: agent did not complete within 2 minutes.',
          model: 'openclaw',
          inputTokens: 0,
          outputTokens: 0,
          provider: 'openclaw',
        });
      }
    }, timeoutMs);

    ws.addEventListener('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error(`OpenClaw WebSocket error: ${err instanceof Error ? err.message : String(err)}`));
      }
    });

    ws.addEventListener('open', () => {
      // Step 1: Send connect request
      idempotencyKey = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      ws.send(JSON.stringify({
        type: 'req',
        id: 'connect-1',
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'gateway-client',
            version: '1.0.0',
            platform: 'percival-labs',
            mode: 'backend',
          },
          caps: ['tool-events'],
          commands: [],
          role: 'operator',
          scopes: ['operator.admin'],
          auth: token ? { token } : undefined,
        },
      }));
    });

    ws.addEventListener('message', (event) => {
      if (settled) return;

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      } catch {
        return; // Ignore non-JSON messages
      }

      // Step 2: Handle connect response → send chat.send
      if (msg.type === 'res' && msg.id === 'connect-1') {
        if (!msg.ok) {
          settled = true;
          clearTimeout(timer);
          cleanup();
          const errPayload = msg.error as { message?: string } | undefined;
          reject(new Error(`OpenClaw auth failed: ${errPayload?.message || 'unknown error'}`));
          return;
        }

        // Connected — now send the message
        const combinedMessage = `[System instructions]\n${req.system}\n\n[Task]\n${req.userMessage}`;
        ws.send(JSON.stringify({
          type: 'req',
          id: 'chat-1',
          method: 'chat.send',
          params: {
            sessionKey: 'main',
            message: combinedMessage,
            idempotencyKey,
          },
        }));

        // Also start waiting for completion
        ws.send(JSON.stringify({
          type: 'req',
          id: 'wait-1',
          method: 'agent.wait',
          params: {
            runId: idempotencyKey,
            timeoutMs: timeoutMs - 5000, // Slightly less than our outer timeout
          },
        }));
        return;
      }

      // Handle chat.send or agent.wait error responses
      if (msg.type === 'res' && (msg.id === 'chat-1' || msg.id === 'wait-1') && !msg.ok) {
        const errPayload = msg.error as { message?: string; code?: string } | undefined;
        const errMsg = errPayload?.message || 'unknown error';
        // If scope error, provide helpful guidance
        if (errMsg.includes('scope')) {
          settled = true;
          clearTimeout(timer);
          cleanup();
          reject(new Error(
            `OpenClaw scope error: ${errMsg}. Run 'openclaw setup' in the container to configure device identity and grant operator scopes.`
          ));
          return;
        }
      }

      // Step 3: Collect assistant text from agent events
      if (msg.type === 'event' && msg.event === 'agent') {
        const payload = msg.payload as Record<string, unknown> | undefined;
        if (payload?.stream === 'assistant') {
          const data = payload.data as Record<string, unknown> | undefined;
          if (data?.text && typeof data.text === 'string') {
            chunks.push(data.text);
          }
        }
      }

      // Step 4: agent.wait response = completion
      if (msg.type === 'res' && msg.id === 'wait-1') {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve({
          output: chunks.join('') || 'OpenClaw completed but produced no text output.',
          model: 'openclaw',
          inputTokens: 0,
          outputTokens: 0,
          provider: 'openclaw',
        });
      }
    });

    ws.addEventListener('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        // Return whatever we have
        resolve({
          output: chunks.length > 0
            ? chunks.join('')
            : 'OpenClaw connection closed before completion.',
          model: 'openclaw',
          inputTokens: 0,
          outputTokens: 0,
          provider: 'openclaw',
        });
      }
    });
  });
}

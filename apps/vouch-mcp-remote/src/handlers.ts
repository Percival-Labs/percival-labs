// MCP Tool Handlers — Each handler delegates to Vouch API public endpoints.
// All API calls have a 5s timeout. Errors return MCP-formatted error results.

import type {
  Env,
  McpToolResult,
  CheckTrustInput,
  CheckAcpHistoryInput,
  ShouldTrustInput,
  VerifyAttestationInput,
  ListTrustedAgentsInput,
} from './types.ts';

// -- Helpers --

const API_TIMEOUT_MS = 5_000;

async function fetchApi(env: Env, path: string, options?: RequestInit): Promise<Response> {
  const url = `${env.VOUCH_API_URL}/v1/public${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'vouch-mcp-remote/0.1.0',
        ...options?.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function textResult(text: string): McpToolResult {
  return { content: [{ type: 'text', text }] };
}

function errorResult(message: string): McpToolResult {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

async function parseApiResponse(response: Response, label: string): Promise<McpToolResult> {
  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown error');
    return errorResult(`${label} failed (HTTP ${response.status}): ${body}`);
  }

  const data = await response.json();
  return textResult(JSON.stringify(data, null, 2));
}

// ── Input Validation ──

const MAX_IDENTIFIER_LENGTHS: Record<string, number> = {
  agent_id: 64,
  pubkey: 64,
  evm_address: 42,
};

function validateIdentifier(identifier: string, type: string): string | null {
  const maxLen = MAX_IDENTIFIER_LENGTHS[type] ?? 128;
  if (identifier.length > maxLen) {
    return `identifier too long for ${type} (max ${maxLen} chars)`;
  }
  if (type === 'pubkey' && !/^[0-9a-fA-F]{64}$/.test(identifier)) {
    return 'pubkey must be 64 hex characters';
  }
  if (type === 'evm_address' && !/^0x[0-9a-fA-F]{40}$/.test(identifier)) {
    return 'evm_address must be 0x + 40 hex characters';
  }
  return null;
}

// -- Tool Handlers --

export async function handleCheckTrust(env: Env, input: CheckTrustInput): Promise<McpToolResult> {
  if (!input.identifier || !input.identifier_type) {
    return errorResult('identifier and identifier_type are required');
  }

  const validationErr = validateIdentifier(input.identifier, input.identifier_type);
  if (validationErr) {
    return errorResult(validationErr);
  }

  let path: string;
  switch (input.identifier_type) {
    case 'agent_id':
      path = `/agents/${encodeURIComponent(input.identifier)}/vouch-score`;
      break;
    case 'pubkey':
      path = `/consumers/${encodeURIComponent(input.identifier)}/vouch-score`;
      break;
    case 'evm_address':
      path = `/wallets/${encodeURIComponent(input.identifier)}/vouch-score`;
      break;
    default:
      return errorResult(`Unknown identifier_type: ${input.identifier_type}. Use agent_id, pubkey, or evm_address.`);
  }

  try {
    const response = await fetchApi(env, path);
    return parseApiResponse(response, 'Trust score lookup');
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return errorResult('Vouch API request timed out (5s)');
    }
    return errorResult(`Failed to fetch trust score: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function handleCheckAcpHistory(env: Env, input: CheckAcpHistoryInput): Promise<McpToolResult> {
  if (!input.address) {
    return errorResult('address is required');
  }

  if (input.address.length > 128) {
    return errorResult('address too long (max 128 chars)');
  }

  try {
    const response = await fetchApi(env, `/acp/agents/${encodeURIComponent(input.address)}/score`);
    return parseApiResponse(response, 'ACP history lookup');
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return errorResult('Vouch API request timed out (5s)');
    }
    return errorResult(`Failed to fetch ACP history: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function handleShouldTrust(env: Env, input: ShouldTrustInput): Promise<McpToolResult> {
  if (!input.identifier || !input.identifier_type) {
    return errorResult('identifier and identifier_type are required');
  }

  const threshold = input.threshold ?? 500;

  // Reuse the trust score lookup
  const trustResult = await handleCheckTrust(env, {
    identifier: input.identifier,
    identifier_type: input.identifier_type,
  });

  // If the trust lookup errored, pass through
  if (trustResult.isError) {
    return trustResult;
  }

  try {
    const data = JSON.parse(trustResult.content[0]!.text);
    const score = data.vouchScore ?? 0;
    const trusted = score >= threshold;

    return textResult(JSON.stringify({
      trusted,
      score,
      threshold,
      tier: data.tier ?? 'unknown',
      reason: trusted
        ? `Agent score ${score} meets threshold ${threshold}`
        : `Agent score ${score} below threshold ${threshold}`,
    }, null, 2));
  } catch {
    return errorResult('Failed to parse trust score response');
  }
}

export async function handleVerifyAttestation(env: Env, input: VerifyAttestationInput): Promise<McpToolResult> {
  if (!input.identity_hash || typeof input.score !== 'number' ||
      typeof input.threshold !== 'number' || typeof input.expiry !== 'number' ||
      !input.signature?.R8x || !input.signature?.R8y || !input.signature?.S) {
    return errorResult('identity_hash, score, threshold, expiry, and signature (R8x, R8y, S) are all required');
  }

  try {
    const response = await fetchApi(env, '/verify-zk-proof', {
      method: 'POST',
      body: JSON.stringify({
        identity_hash: input.identity_hash,
        score: input.score,
        threshold: input.threshold,
        expiry: input.expiry,
        signature: input.signature,
      }),
    });
    return parseApiResponse(response, 'Attestation verification');
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return errorResult('Vouch API request timed out (5s)');
    }
    return errorResult(`Failed to verify attestation: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function handleGetEcosystemStats(env: Env): Promise<McpToolResult> {
  try {
    const response = await fetchApi(env, '/acp/stats');
    return parseApiResponse(response, 'Ecosystem stats');
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return errorResult('Vouch API request timed out (5s)');
    }
    return errorResult(`Failed to fetch ecosystem stats: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function handleListTrustedAgents(env: Env, input: ListTrustedAgentsInput): Promise<McpToolResult> {
  const minScore = input.min_score ?? 500;
  const limit = Math.min(input.limit ?? 25, 100);

  try {
    const params = new URLSearchParams({
      min_score: String(minScore),
      limit: String(limit),
    });
    const response = await fetchApi(env, `/agents/trusted?${params.toString()}`);
    return parseApiResponse(response, 'Trusted agents list');
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return errorResult('Vouch API request timed out (5s)');
    }
    return errorResult(`Failed to list trusted agents: ${err instanceof Error ? err.message : String(err)}`);
  }
}

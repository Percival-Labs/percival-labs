// Vouch MCP Remote — Cloudflare Worker Entry Point
// Remote MCP server implementing Streamable HTTP transport (JSON-RPC 2.0).
// Stateless — delegates all trust queries to Vouch API public endpoints.
//
// Endpoints:
//   GET  /        — Health check
//   POST /mcp     — MCP JSON-RPC 2.0 protocol (initialize, tools/list, tools/call)

import type { Env, JsonRpcRequest, JsonRpcResponse, McpToolResult } from './types.ts';
import { JSON_RPC_ERRORS } from './types.ts';
import { TOOLS } from './tools.ts';
import {
  handleCheckTrust,
  handleCheckAcpHistory,
  handleShouldTrust,
  handleVerifyAttestation,
  handleGetEcosystemStats,
  handleListTrustedAgents,
} from './handlers.ts';

// -- Constants --

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_NAME = 'vouch-mcp-remote';
const SERVER_VERSION = '0.1.0';

// -- CORS Headers --

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body: JsonRpcResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

// -- MCP Method Handlers --

function handleInitialize(id: string | number | null): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    },
  };
}

function handleToolsList(id: string | number | null): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      tools: TOOLS,
    },
  };
}

async function handleToolsCall(
  env: Env,
  id: string | number | null,
  params: Record<string, unknown> | undefined,
): Promise<JsonRpcResponse> {
  const toolName = params?.name as string | undefined;
  const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>;

  if (!toolName) {
    return {
      jsonrpc: '2.0',
      id,
      error: { ...JSON_RPC_ERRORS.INVALID_PARAMS, data: 'Missing tool name' },
    };
  }

  let result: McpToolResult;

  switch (toolName) {
    case 'vouch_check_trust':
      result = await handleCheckTrust(env, toolArgs as unknown as Parameters<typeof handleCheckTrust>[1]);
      break;
    case 'vouch_check_acp_history':
      result = await handleCheckAcpHistory(env, toolArgs as unknown as Parameters<typeof handleCheckAcpHistory>[1]);
      break;
    case 'vouch_should_trust':
      result = await handleShouldTrust(env, toolArgs as unknown as Parameters<typeof handleShouldTrust>[1]);
      break;
    case 'vouch_verify_attestation':
      result = await handleVerifyAttestation(env, toolArgs as unknown as Parameters<typeof handleVerifyAttestation>[1]);
      break;
    case 'vouch_get_ecosystem_stats':
      result = await handleGetEcosystemStats(env);
      break;
    case 'vouch_list_trusted_agents':
      result = await handleListTrustedAgents(env, toolArgs as unknown as Parameters<typeof handleListTrustedAgents>[1]);
      break;
    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { ...JSON_RPC_ERRORS.METHOD_NOT_FOUND, data: `Unknown tool: ${toolName}` },
      };
  }

  return {
    jsonrpc: '2.0',
    id,
    result: result,
  };
}

// -- Request Router --

async function handleMcpRequest(env: Env, request: Request): Promise<Response> {
  let body: JsonRpcRequest;

  try {
    body = await request.json() as JsonRpcRequest;
  } catch {
    return jsonResponse({
      jsonrpc: '2.0',
      id: null,
      error: JSON_RPC_ERRORS.PARSE_ERROR,
    }, 400);
  }

  if (body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return jsonResponse({
      jsonrpc: '2.0',
      id: body.id ?? null,
      error: JSON_RPC_ERRORS.INVALID_REQUEST,
    }, 400);
  }

  let response: JsonRpcResponse;

  switch (body.method) {
    case 'initialize':
      response = handleInitialize(body.id);
      break;
    case 'notifications/initialized':
      // Client acknowledgment — no response needed for notifications (id is null)
      return new Response(null, { status: 204, headers: corsHeaders() });
    case 'tools/list':
      response = handleToolsList(body.id);
      break;
    case 'tools/call':
      response = await handleToolsCall(env, body.id, body.params);
      break;
    default:
      response = {
        jsonrpc: '2.0',
        id: body.id,
        error: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
      };
  }

  return jsonResponse(response);
}

// -- Worker Entry --

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Health check
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(JSON.stringify({
        service: SERVER_NAME,
        version: SERVER_VERSION,
        status: 'running',
        protocol: 'mcp',
        protocolVersion: PROTOCOL_VERSION,
        endpoint: '/mcp',
        timestamp: new Date().toISOString(),
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      });
    }

    // MCP endpoint
    if (url.pathname === '/mcp' && request.method === 'POST') {
      return handleMcpRequest(env, request);
    }

    // 404 for everything else
    return new Response(JSON.stringify({
      error: 'Not Found',
      hint: 'POST /mcp for MCP protocol, GET / for health check',
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
  },
};

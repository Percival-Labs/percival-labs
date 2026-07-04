/**
 * Bittensor MCP Server
 *
 * The first MCP server for Bittensor. Exposes metagraph data, trust
 * attestations, weight-copying detection, and validator integration
 * as MCP tools.
 *
 * Architecture:
 *   MCP-T (open protocol)  →  This server (reference implementation)
 *   Vouch (optional)       →  One possible trust data source (not required)
 *
 * This server demonstrates MCP-T as a protocol standard. It produces
 * trust attestations conforming to MCP-T v0.2.0 using on-chain data
 * from Bittensor's metagraph. No Vouch dependency required.
 *
 * Usage:
 *   bun run src/index.ts              # stdio MCP server
 *   bun run src/index.ts --http 3800  # HTTP server for validator integration
 *
 * Environment:
 *   TAOSTATS_API_KEY    — TaoStats API key (optional, enables full API access)
 *   BITTENSOR_RPC_URL   — Custom RPC URL (optional)
 */

import type { McpTool, JsonRpcRequest, JsonRpcResponse } from './types.js';
import { BittensorClient } from './taostats-client.js';
import {
  analyzeWeightCopying,
  generateValidatorAttestations,
} from './weight-analysis.js';
import {
  blendTrustScores,
  generateValidatorSnippet,
  DEFAULT_CONFIG,
} from './trust-blend.js';

// ── Tool Definitions ──

const TOOLS: McpTool[] = [
  {
    name: 'bittensor_subnet_info',
    description:
      'Get information about a Bittensor subnet including neuron count, emissions, and tempo.',
    inputSchema: {
      type: 'object',
      properties: {
        netuid: {
          type: 'number',
          description:
            'Subnet ID (e.g., 3 for Templar, 39 for Basilica, 81 for Grail)',
        },
      },
      required: ['netuid'],
    },
  },
  {
    name: 'bittensor_metagraph',
    description:
      'Get the full metagraph for a subnet — all neurons with stake, trust, consensus, incentive, and emission data.',
    inputSchema: {
      type: 'object',
      properties: {
        netuid: {
          type: 'number',
          description: 'Subnet ID',
        },
        filter: {
          type: 'string',
          enum: ['all', 'validators', 'miners'],
          description: 'Filter by neuron type (default: all)',
        },
        limit: {
          type: 'number',
          description: 'Max neurons to return (default: 50)',
        },
      },
      required: ['netuid'],
    },
  },
  {
    name: 'bittensor_detect_weight_copying',
    description:
      'Analyze a subnet for weight-copying behavior. Compares validator weight vectors using cosine similarity to identify free-riders who copy other validators instead of independently evaluating miners. Returns MCP-T trust attestations for each validator.',
    inputSchema: {
      type: 'object',
      properties: {
        netuid: {
          type: 'number',
          description: 'Subnet ID to analyze',
        },
      },
      required: ['netuid'],
    },
  },
  {
    name: 'bittensor_trust_attestation',
    description:
      'Get an MCP-T v0.2.0 trust attestation for a specific miner or validator. Attestations include dimensional scores (behavioral_consistency, performance, commitment) with confidence levels and evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        hotkey: {
          type: 'string',
          description: 'ss58 address (hotkey) of the neuron',
        },
        netuid: {
          type: 'number',
          description: 'Subnet ID',
        },
      },
      required: ['hotkey', 'netuid'],
    },
  },
  {
    name: 'bittensor_simulate_trust_blend',
    description:
      'Simulate how MCP-T trust attestations would affect a validator\'s weight-setting. Shows the blended scores (raw validator score × trust adjustment) and explains how trust signals supplement Yuma Consensus. Includes a Python code snippet for validator integration.',
    inputSchema: {
      type: 'object',
      properties: {
        netuid: {
          type: 'number',
          description: 'Subnet ID',
        },
        trust_weight: {
          type: 'number',
          description:
            'How much trust influences final score (0.0-1.0, default 0.15 = 15%)',
        },
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Which MCP-T dimensions to use (default: behavioral_consistency, performance)',
        },
      },
      required: ['netuid'],
    },
  },
  {
    name: 'bittensor_validator_integration_guide',
    description:
      'Generate a complete Python code snippet showing how to integrate MCP-T trust attestations into a Bittensor validator\'s forward() method. This is the key demonstration: trust blending requires NO protocol changes, only a validator-side decision.',
    inputSchema: {
      type: 'object',
      properties: {
        trust_weight: {
          type: 'number',
          description: 'Trust weight (0.0-1.0, default 0.15)',
        },
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dimensions to use',
        },
      },
    },
  },
];

// ── Server Implementation ──

const client = new BittensorClient();

async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'bittensor_subnet_info': {
      const netuid = args.netuid as number;
      const subnet = await client.getSubnet(netuid);
      const neurons = await client.getMetagraph(netuid);

      subnet.minerCount = neurons.filter((n) => !n.isValidator).length;
      subnet.validatorCount = neurons.filter((n) => n.isValidator).length;

      return subnet;
    }

    case 'bittensor_metagraph': {
      const netuid = args.netuid as number;
      const filter = (args.filter as string) || 'all';
      const limit = (args.limit as number) || 50;

      let neurons = await client.getMetagraph(netuid);

      if (filter === 'validators') {
        neurons = neurons.filter((n) => n.isValidator);
      } else if (filter === 'miners') {
        neurons = neurons.filter((n) => !n.isValidator);
      }

      // Sort by emission descending
      neurons.sort((a, b) => b.emission - a.emission);

      return {
        netuid,
        total: neurons.length,
        returned: Math.min(neurons.length, limit),
        neurons: neurons.slice(0, limit),
      };
    }

    case 'bittensor_detect_weight_copying': {
      const netuid = args.netuid as number;
      const neurons = await client.getMetagraph(netuid);
      const weights = await client.getWeights(netuid);

      if (weights.size === 0) {
        return {
          netuid,
          error:
            'Weight data not available for this subnet. The subnet may use commit-reveal (weights are hidden) or weight data is not yet indexed.',
          suggestion:
            'Try subnets with public weight data, or wait for the next reveal window.',
        };
      }

      const analysis = analyzeWeightCopying(netuid, neurons, weights);
      return analysis;
    }

    case 'bittensor_trust_attestation': {
      const hotkey = args.hotkey as string;
      const netuid = args.netuid as number;

      const neurons = await client.getMetagraph(netuid);
      const weights = await client.getWeights(netuid);
      const neuron = neurons.find((n) => n.hotkey === hotkey);

      if (!neuron) {
        return {
          error: `Neuron with hotkey ${hotkey} not found on subnet ${netuid}`,
        };
      }

      // Run weight analysis to get behavioral data
      const analysis = analyzeWeightCopying(netuid, neurons, weights);
      const attestations = generateValidatorAttestations(
        netuid,
        neurons,
        weights,
        analysis
      );

      const attestation = attestations.find((a) => a.subject === hotkey);

      if (attestation) {
        return attestation;
      }

      // Fallback: generate basic attestation from metagraph data alone
      return {
        subject: hotkey,
        subjectType: neuron.isValidator ? 'validator' : 'miner',
        netuid,
        timestamp: new Date().toISOString(),
        dimensions: [
          {
            name: 'performance',
            value: Math.round(
              (neuron.isValidator ? neuron.consensus : neuron.incentive) * 1000
            ),
            confidence: 0.9,
            evidence: neuron.isValidator
              ? `Consensus: ${neuron.consensus.toFixed(4)}`
              : `Incentive: ${neuron.incentive.toFixed(4)}`,
          },
          {
            name: 'commitment',
            value: Math.min(1000, Math.round(neuron.stake * 100)),
            confidence: 0.8,
            evidence: `Stake: ${neuron.stake.toFixed(4)} TAO`,
          },
        ],
        composite: Math.round(
          ((neuron.isValidator ? neuron.consensus : neuron.incentive) * 1000 * 0.6 +
            Math.min(1000, neuron.stake * 100) * 0.4)
        ),
        confidence: 0.75,
        provider: 'bittensor-mcp/metagraph',
        methodology: 'metagraph metrics only (no weight analysis available)',
      };
    }

    case 'bittensor_simulate_trust_blend': {
      const netuid = args.netuid as number;
      const trustWeight = (args.trust_weight as number) || DEFAULT_CONFIG.trustWeight;
      const dimensions =
        (args.dimensions as string[]) || DEFAULT_CONFIG.dimensions;

      const neurons = await client.getMetagraph(netuid);
      const weights = await client.getWeights(netuid);
      const analysis = analyzeWeightCopying(netuid, neurons, weights);
      const attestations = generateValidatorAttestations(
        netuid,
        neurons,
        weights,
        analysis
      );

      // Build attestation map
      const attestationMap = new Map(attestations.map((a) => [a.subject, a]));

      // Simulate: use incentive scores as "raw validator scores"
      const miners = neurons.filter((n) => !n.isValidator);
      const rawScores = new Map(miners.map((m) => [m.uid, m.incentive]));

      const blended = blendTrustScores(miners, rawScores, attestationMap, {
        trustWeight,
        dimensions,
        minConfidence: DEFAULT_CONFIG.minConfidence,
        decayDays: DEFAULT_CONFIG.decayDays,
      });

      // Sort by score change magnitude
      const sorted = blended
        .filter((b) => b.trustApplied)
        .sort(
          (a, b) =>
            Math.abs(b.blendedScore - b.rawScore) -
            Math.abs(a.blendedScore - a.rawScore)
        );

      return {
        netuid,
        config: { trustWeight, dimensions },
        totalMiners: miners.length,
        trustApplied: sorted.length,
        topChanges: sorted.slice(0, 20),
        summary:
          `Trust blend simulation for SN${netuid}: ` +
          `${sorted.length}/${miners.length} miners had trust adjustments. ` +
          `Trust weight: ${(trustWeight * 100).toFixed(0)}%. ` +
          `Dimensions: [${dimensions.join(', ')}].`,
        note: 'This is a simulation. No weights were modified on-chain. Validators choose independently whether to adopt trust signals.',
      };
    }

    case 'bittensor_validator_integration_guide': {
      const config = {
        ...DEFAULT_CONFIG,
        trustWeight: (args.trust_weight as number) || DEFAULT_CONFIG.trustWeight,
        dimensions:
          (args.dimensions as string[]) || DEFAULT_CONFIG.dimensions,
      };

      return {
        language: 'python',
        framework: 'bittensor',
        integrationPoint: 'validator forward() method',
        code: generateValidatorSnippet(config),
        notes: [
          'This integrates BETWEEN scoring and set_weights() — no protocol changes.',
          'Fail-open design: if trust query fails, raw scores are used unchanged.',
          'Each validator independently chooses trust_weight and dimensions.',
          'MCP-T attestations are advisory signals, not access gates.',
          'No miner is excluded from the network by trust scores.',
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ── MCP Protocol (stdio JSON-RPC) ──

function sendResponse(res: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(res) + '\n');
}

async function handleMessage(msg: JsonRpcRequest): Promise<void> {
  switch (msg.method) {
    case 'initialize':
      sendResponse({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'bittensor-mcp',
            version: '0.1.0',
            description:
              'MCP server for Bittensor — metagraph queries, MCP-T trust attestations, weight-copying detection, validator integration',
          },
          capabilities: { tools: {} },
        },
      });
      break;

    case 'notifications/initialized':
      break;

    case 'tools/list':
      sendResponse({
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: TOOLS },
      });
      break;

    case 'tools/call': {
      const params = msg.params as {
        name: string;
        arguments?: Record<string, unknown>;
      };
      try {
        const result = await handleToolCall(
          params.name,
          params.arguments ?? {}
        );
        sendResponse({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) },
            ],
          },
        });
      } catch (err) {
        sendResponse({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          },
        });
      }
      break;
    }

    default:
      sendResponse({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `Unknown method: ${msg.method}` },
      });
  }
}

// ── HTTP Server Mode (for validator integration) ──

async function startHttpServer(port: number): Promise<void> {
  const server = Bun.serve({
    port,
    async fetch(req) {
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      if (req.method !== 'POST') {
        return Response.json(
          { error: 'POST only' },
          { status: 405 }
        );
      }

      const body = (await req.json()) as JsonRpcRequest;

      // Handle as tool call for simplified HTTP access
      if (body.method === 'trust/query') {
        const params = body.params as Record<string, unknown>;
        try {
          const result = await handleToolCall(
            'bittensor_trust_attestation',
            params
          );
          return Response.json({
            jsonrpc: '2.0',
            id: body.id,
            result,
          });
        } catch (err) {
          return Response.json({
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32603,
              message: err instanceof Error ? err.message : String(err),
            },
          });
        }
      }

      // Full MCP protocol
      const responsePromise = new Promise<JsonRpcResponse>((resolve) => {
        const origWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = ((data: string) => {
          try {
            resolve(JSON.parse(data.trim()));
          } catch {
            origWrite(data);
          }
          process.stdout.write = origWrite;
          return true;
        }) as typeof process.stdout.write;

        handleMessage(body);
      });

      const response = await responsePromise;
      return Response.json(response, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    },
  });

  console.log(
    `[bittensor-mcp] HTTP server running at http://localhost:${server.port}`
  );
  console.log(
    `[bittensor-mcp] Trust query endpoint: POST http://localhost:${server.port}/`
  );
  console.log(`[bittensor-mcp] Tools: ${TOOLS.map((t) => t.name).join(', ')}`);
}

// ── Entry Point ──

const args = process.argv.slice(2);
const httpIndex = args.indexOf('--http');

if (httpIndex !== -1) {
  const port = parseInt(args[httpIndex + 1] || '3800', 10);
  startHttpServer(port);
} else {
  // stdio MCP server mode
  process.stderr.write('[bittensor-mcp] MCP server started (stdio mode)\n');
  process.stderr.write(
    `[bittensor-mcp] Tools: ${TOOLS.map((t) => t.name).join(', ')}\n`
  );

  let buffer = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    while (true) {
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx === -1) break;

      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);

      if (!line) continue;

      try {
        const msg = JSON.parse(line) as JsonRpcRequest;
        handleMessage(msg).catch((err) => {
          sendResponse({
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32603, message: String(err) },
          });
        });
      } catch {
        // Skip malformed lines
      }
    }
  });
}

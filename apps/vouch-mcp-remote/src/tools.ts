// MCP Tool Definitions — 6 tools for ACP trust verification
// These are static definitions returned by tools/list.

import type { McpToolDefinition } from './types.ts';

export const TOOLS: McpToolDefinition[] = [
  {
    name: 'vouch_check_trust',
    description:
      'Get the full Vouch trust score for an agent, including score breakdown, backing stats, and tier. ' +
      'Accepts agent ID (ULID), Nostr hex pubkey, or EVM wallet address.',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'The agent identifier: ULID agent ID, 64-char hex Nostr pubkey, or 0x-prefixed EVM address.',
        },
        identifier_type: {
          type: 'string',
          enum: ['agent_id', 'pubkey', 'evm_address'],
          description: 'Type of identifier provided.',
        },
      },
      required: ['identifier', 'identifier_type'],
    },
  },
  {
    name: 'vouch_check_acp_history',
    description:
      'Get on-chain ACP (Agent Commerce Protocol) activity and trust score for an EVM wallet address. ' +
      'Returns job counts, completion rates, earnings, and spending stats from Base L2.',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'EVM wallet address (0x-prefixed, 42 characters).',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'vouch_should_trust',
    description:
      'Quick boolean check: should you trust this agent? Returns true/false based on whether the agent ' +
      'meets a trust score threshold (default 500). Use this for fast go/no-go decisions in agent pipelines.',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'The agent identifier: ULID agent ID, 64-char hex Nostr pubkey, or 0x-prefixed EVM address.',
        },
        identifier_type: {
          type: 'string',
          enum: ['agent_id', 'pubkey', 'evm_address'],
          description: 'Type of identifier provided.',
        },
        threshold: {
          type: 'number',
          description: 'Minimum trust score to be considered trusted (default: 500, range: 0-1000).',
        },
      },
      required: ['identifier', 'identifier_type'],
    },
  },
  {
    name: 'vouch_verify_attestation',
    description:
      'Verify a Vouch trust attestation (ZK proof). Checks the BJJ signature, expiry, and threshold. ' +
      'Use this to verify trust claims presented by other agents without trusting them blindly.',
    inputSchema: {
      type: 'object',
      properties: {
        identity_hash: {
          type: 'string',
          description: 'The identity hash from the attestation.',
        },
        score: {
          type: 'number',
          description: 'The claimed trust score.',
        },
        threshold: {
          type: 'number',
          description: 'The threshold the score was attested against.',
        },
        expiry: {
          type: 'number',
          description: 'Unix timestamp when the attestation expires.',
        },
        signature: {
          type: 'object',
          description: 'BJJ signature object with R8x, R8y, and S fields.',
          properties: {
            R8x: { type: 'string' },
            R8y: { type: 'string' },
            S: { type: 'string' },
          },
          required: ['R8x', 'R8y', 'S'],
        },
      },
      required: ['identity_hash', 'score', 'threshold', 'expiry', 'signature'],
    },
  },
  {
    name: 'vouch_get_ecosystem_stats',
    description:
      'Get aggregate statistics for the Vouch ACP ecosystem: total agents indexed, total jobs, ' +
      'completed jobs, and total USDC volume. Useful for gauging ecosystem health and activity.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'vouch_list_trusted_agents',
    description:
      'List agents above a trust score threshold. Returns the top trusted agents in the Vouch network. ' +
      'Useful for discovering reliable agents to work with in ACP transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        min_score: {
          type: 'number',
          description: 'Minimum trust score threshold (default: 500, range: 0-1000).',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of agents to return (default: 25, max: 100).',
        },
      },
    },
  },
];

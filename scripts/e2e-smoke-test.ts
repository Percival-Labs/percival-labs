#!/usr/bin/env bun
/**
 * Vouch API E2E Smoke Test
 *
 * Tests the core API flow against production (Railway):
 * 1. Health check
 * 2. Public vouch-score lookup
 * 3. NIP-98 agent registration
 * 4. NIP-98 authenticated score check (/me/score)
 * 5. NIP-98 authenticated proof generation (/me/prove)
 * 6. Outcome reporting (NIP-98)
 * 7. Auth enforcement (staking without Ed25519 → 401)
 *
 * Usage:
 *   bun run scripts/e2e-smoke-test.ts
 *   bun run scripts/e2e-smoke-test.ts --local   # test against localhost:3601
 */

import {
  generateNostrKeypair,
  signEvent,
  type UnsignedEvent,
} from '../packages/vouch-sdk/src/nostr-identity.js';

// ── Config ──

const isLocal = process.argv.includes('--local');
const BASE_URL = isLocal
  ? 'http://localhost:3601'
  : 'https://percivalvouch-api-production.up.railway.app';

let passed = 0;
let failed = 0;

// ── Helpers ──

function log(status: 'PASS' | 'FAIL' | 'INFO', msg: string) {
  const icon = status === 'PASS' ? '\x1b[32m✓\x1b[0m' : status === 'FAIL' ? '\x1b[31m✗\x1b[0m' : '\x1b[34m→\x1b[0m';
  console.log(`  ${icon} ${msg}`);
  if (status === 'PASS') passed++;
  if (status === 'FAIL') failed++;
}

let nip98Counter = 0;

async function createNip98Auth(
  secretKeyHex: string,
  pubkeyHex: string,
  url: string,
  method: string,
): Promise<string> {
  // Each event must have a unique ID. Add an expiration tag with a counter
  // to ensure uniqueness even when created_at falls in the same second.
  nip98Counter++;
  const unsigned: UnsignedEvent = {
    pubkey: pubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    kind: 27235,
    tags: [
      ['u', url],
      ['method', method],
      ['expiration', String(Math.floor(Date.now() / 1000) + 60)],
      ['nonce', String(nip98Counter)],
    ],
    content: '',
  };

  const signed = await signEvent(unsigned, secretKeyHex);
  const json = JSON.stringify(signed);
  const base64 = btoa(json);
  return `Nostr ${base64}`;
}

async function fetchJson(url: string, options?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, options);
  const body = await res.json() as Record<string, unknown>;
  return { status: res.status, body };
}

// ── Tests ──

console.log(`\n  Vouch API E2E Smoke Test`);
console.log(`  Target: ${BASE_URL}\n`);

// 1. Health check
try {
  const { status, body } = await fetchJson(`${BASE_URL}/health`);
  if (status === 200 && (body as Record<string, unknown>).status === 'ok') {
    log('PASS', 'Health check: API is running');
  } else {
    log('FAIL', `Health check: unexpected response ${status} ${JSON.stringify(body)}`);
  }
} catch (err) {
  log('FAIL', `Health check: ${err instanceof Error ? err.message : err}`);
}

// 2. Root endpoint
try {
  const { status, body } = await fetchJson(`${BASE_URL}/`);
  if (status === 200 && body.service === 'vouch-api') {
    log('PASS', `Root endpoint: service=${body.service}, status=${body.status}`);
  } else {
    log('FAIL', `Root endpoint: unexpected ${status} ${JSON.stringify(body)}`);
  }
} catch (err) {
  log('FAIL', `Root endpoint: ${err instanceof Error ? err.message : err}`);
}

// 3. Public vouch-score (existing smoke-test-agent)
try {
  const { status, body } = await fetchJson(`${BASE_URL}/v1/public/agents/01KJ3JV9SJDMPNXNBN8B286ZSN/vouch-score`);
  if (status === 200 && typeof body.vouchScore === 'number') {
    log('PASS', `Public vouch-score: score=${body.vouchScore}, tier=${body.tier}, backed=${(body.backing as Record<string, unknown>)?.badge}`);
  } else {
    log('FAIL', `Public vouch-score: ${status} ${JSON.stringify(body)}`);
  }
} catch (err) {
  log('FAIL', `Public vouch-score: ${err instanceof Error ? err.message : err}`);
}

// 4. OpenAPI spec available
try {
  const { status, body } = await fetchJson(`${BASE_URL}/openapi.json`);
  if (status === 200 && body.openapi) {
    log('PASS', `OpenAPI spec: version ${body.openapi}`);
  } else {
    log('FAIL', `OpenAPI spec: ${status}`);
  }
} catch (err) {
  log('FAIL', `OpenAPI spec: ${err instanceof Error ? err.message : err}`);
}

// 5. Agent discovery (llms.txt)
try {
  const res = await fetch(`${BASE_URL}/llms.txt`);
  if (res.status === 200) {
    const text = await res.text();
    log('PASS', `llms.txt: ${text.length} chars`);
  } else {
    log('FAIL', `llms.txt: ${res.status}`);
  }
} catch (err) {
  log('FAIL', `llms.txt: ${err instanceof Error ? err.message : err}`);
}

// ── NIP-98 Authenticated Tests ──

const testAgent1 = generateNostrKeypair();
const testAgent2 = generateNostrKeypair();
const agentName1 = `e2e-test-${Date.now().toString(36)}`;
const agentName2 = `e2e-staker-${Date.now().toString(36)}`;

log('INFO', `Generated test keypair 1: ${testAgent1.npub.slice(0, 20)}...`);
log('INFO', `Generated test keypair 2: ${testAgent2.npub.slice(0, 20)}...`);

// 6. NIP-98 agent registration (agent 1)
let agent1Id = '';
try {
  const url = `${BASE_URL}/v1/sdk/agents/register`;
  const authHeader = await createNip98Auth(testAgent1.secretKeyHex, testAgent1.pubkeyHex, url, 'POST');
  const { status, body } = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      name: agentName1,
      model: 'e2e-test',
      capabilities: ['testing'],
      description: 'E2E smoke test agent',
    }),
  });

  const data = body.data as Record<string, unknown> | undefined;
  if (status === 201 && data?.agent_id) {
    agent1Id = data.agent_id as string;
    log('PASS', `NIP-98 registration: agent_id=${agent1Id}, nip05=${data.nip05}`);
  } else {
    log('FAIL', `NIP-98 registration: ${status} ${JSON.stringify(body)}`);
  }
} catch (err) {
  log('FAIL', `NIP-98 registration: ${err instanceof Error ? err.message : err}`);
}

// 7. NIP-98 agent registration (agent 2 — will be staker later)
let agent2Id = '';
try {
  const url = `${BASE_URL}/v1/sdk/agents/register`;
  const authHeader = await createNip98Auth(testAgent2.secretKeyHex, testAgent2.pubkeyHex, url, 'POST');
  const { status, body } = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      name: agentName2,
      model: 'e2e-test',
      capabilities: ['staking'],
      description: 'E2E smoke test staker',
    }),
  });

  const data = body.data as Record<string, unknown> | undefined;
  if (status === 201 && data?.agent_id) {
    agent2Id = data.agent_id as string;
    log('PASS', `NIP-98 registration (staker): agent_id=${agent2Id}`);
  } else {
    log('FAIL', `NIP-98 registration (staker): ${status} ${JSON.stringify(body)}`);
  }
} catch (err) {
  log('FAIL', `NIP-98 registration (staker): ${err instanceof Error ? err.message : err}`);
}

// 8. Duplicate registration blocked (fresh NIP-98 event to avoid replay detection)
try {
  const url = `${BASE_URL}/v1/sdk/agents/register`;
  const freshAuth = await createNip98Auth(testAgent1.secretKeyHex, testAgent1.pubkeyHex, url, 'POST');
  const { status, body } = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': freshAuth,
    },
    body: JSON.stringify({
      name: agentName1,
      model: 'e2e-test',
    }),
  });

  if (status === 409) {
    log('PASS', 'Duplicate registration correctly rejected (409)');
  } else if (status === 429) {
    log('PASS', 'Duplicate registration: rate limited (429) — registration rate limit working');
  } else {
    log('FAIL', `Duplicate registration: expected 409 or 429, got ${status} ${JSON.stringify(body)}`);
  }
} catch (err) {
  log('FAIL', `Duplicate registration: ${err instanceof Error ? err.message : err}`);
}

// 9. /me/score — authenticated score check
try {
  const url = `${BASE_URL}/v1/sdk/agents/me/score`;
  const authHeader = await createNip98Auth(testAgent1.secretKeyHex, testAgent1.pubkeyHex, url, 'GET');
  const { status, body } = await fetchJson(url, {
    method: 'GET',
    headers: { 'Authorization': authHeader },
  });

  const data = body.data as Record<string, unknown> | undefined;
  if (status === 200 && data && typeof data.score === 'number') {
    const dims = data.dimensions as Record<string, number>;
    log('PASS', `Score check: score=${data.score} (verification=${dims?.verification}, tenure=${dims?.tenure}, performance=${dims?.performance}, backing=${dims?.backing})`);
  } else {
    log('FAIL', `/me/score: ${status} ${JSON.stringify(body)}`);
  }
} catch (err) {
  log('FAIL', `/me/score: ${err instanceof Error ? err.message : err}`);
}

// 10. /me/prove — NIP-85 trust attestation
try {
  const url = `${BASE_URL}/v1/sdk/agents/me/prove`;
  const authHeader = await createNip98Auth(testAgent1.secretKeyHex, testAgent1.pubkeyHex, url, 'POST');
  const { status, body } = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({}),
  });

  const data = body.data as Record<string, unknown> | undefined;
  if (status === 200 && data?.tier) {
    log('PASS', `Trust proof: tier=${data.tier}, score=${data.score}`);
  } else {
    log('FAIL', `/me/prove: ${status} ${JSON.stringify(body)}`);
  }
} catch (err) {
  log('FAIL', `/me/prove: ${err instanceof Error ? err.message : err}`);
}

// 11. Public score lookup by hex pubkey (SDK endpoint)
try {
  const url = `${BASE_URL}/v1/sdk/agents/${testAgent1.pubkeyHex}/score`;
  const authHeader = await createNip98Auth(testAgent1.secretKeyHex, testAgent1.pubkeyHex, url, 'GET');
  const { status, body } = await fetchJson(url, {
    method: 'GET',
    headers: { 'Authorization': authHeader },
  });

  const data = body.data as Record<string, unknown> | undefined;
  if (status === 200 && data && typeof data.score === 'number') {
    log('PASS', `Hex pubkey score lookup: score=${data.score}, backed=${data.backed}`);
  } else {
    log('FAIL', `Hex pubkey score: ${status} ${JSON.stringify(body)}`);
  }
} catch (err) {
  log('FAIL', `Hex pubkey score: ${err instanceof Error ? err.message : err}`);
}

// 12. Outcome reporting (cross-agent interaction)
if (agent1Id && agent2Id) {
  try {
    const url = `${BASE_URL}/v1/outcomes`;
    const authHeader = await createNip98Auth(testAgent1.secretKeyHex, testAgent1.pubkeyHex, url, 'POST');
    const { status, body } = await fetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        counterparty: testAgent2.pubkeyHex,
        role: 'purchaser',
        task_type: 'e2e-test',
        task_ref: `e2e-${Date.now()}`,
        success: true,
        rating: 5,
      }),
    });

    if (status === 201) {
      log('PASS', 'Outcome reporting: task outcome recorded');
    } else {
      log('FAIL', `Outcome reporting: ${status} ${JSON.stringify(body)}`);
    }
  } catch (err) {
    log('FAIL', `Outcome reporting: ${err instanceof Error ? err.message : err}`);
  }
}

// 13. Self-vouch prevention (fresh NIP-98 event)
try {
  const url = `${BASE_URL}/v1/outcomes`;
  const freshAuth = await createNip98Auth(testAgent1.secretKeyHex, testAgent1.pubkeyHex, url, 'POST');
  const { status } = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': freshAuth,
    },
    body: JSON.stringify({
      counterparty: testAgent1.pubkeyHex, // self!
      role: 'purchaser',
      task_type: 'e2e-test',
      task_ref: `e2e-self-${Date.now()}`,
      success: true,
    }),
  });

  if (status === 400) {
    log('PASS', 'Self-vouch prevention: correctly rejected (400)');
  } else {
    log('FAIL', `Self-vouch prevention: expected 400, got ${status}`);
  }
} catch (err) {
  log('FAIL', `Self-vouch prevention: ${err instanceof Error ? err.message : err}`);
}

// 14. Auth enforcement: staking without Ed25519 → 401
try {
  const { status } = await fetchJson(`${BASE_URL}/v1/staking/pools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: 'fake' }),
  });

  if (status === 401) {
    log('PASS', 'Auth enforcement: staking pool creation requires Ed25519 auth (401)');
  } else {
    log('FAIL', `Auth enforcement: expected 401, got ${status}`);
  }
} catch (err) {
  log('FAIL', `Auth enforcement: ${err instanceof Error ? err.message : err}`);
}

// 15. Rate limiting headers present
try {
  const res = await fetch(`${BASE_URL}/v1/public/agents/01KJ3JV9SJDMPNXNBN8B286ZSN/vouch-score`);
  const hasVouchHeader = res.headers.get('X-Vouch-API-Version');
  if (hasVouchHeader) {
    log('PASS', `Discoverability headers: X-Vouch-API-Version=${hasVouchHeader}`);
  } else {
    log('FAIL', 'Discoverability headers: X-Vouch-API-Version missing');
  }
} catch (err) {
  log('FAIL', `Discoverability headers: ${err instanceof Error ? err.message : err}`);
}

// ── Summary ──

console.log(`\n  ────────────────────────────────`);
console.log(`  Results: \x1b[32m${passed} passed\x1b[0m, \x1b[${failed > 0 ? '31' : '32'}m${failed} failed\x1b[0m`);
console.log(`  Target: ${BASE_URL}`);

if (agent1Id) {
  console.log(`\n  Test agents created (can be cleaned up):`);
  console.log(`    Agent 1: ${agent1Id} (${agentName1})`);
  console.log(`    Agent 2: ${agent2Id} (${agentName2})`);
}

console.log('');

process.exit(failed > 0 ? 1 : 0);

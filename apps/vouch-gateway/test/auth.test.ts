// auth.test.ts — NIP-98 header extraction and verification tests
// TDD RED phase: these tests define the auth contract

import { describe, expect, it } from 'bun:test';
import {
  extractNostrAuth,
  extractAgentKey,
  parseNostrEvent,
  computeEventId,
  validateNip98Structure,
  resolveAuthIdentity,
} from '../src/auth';
import type { NostrEvent } from '../src/types';

// ── Test Fixtures ──

function makeValidEvent(overrides: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: 'a'.repeat(64),
    pubkey: 'b'.repeat(64),
    created_at: Math.floor(Date.now() / 1000),
    kind: 27235,
    tags: [
      ['u', 'https://gateway.percival-labs.ai/v1/messages'],
      ['method', 'POST'],
    ],
    content: '',
    sig: 'c'.repeat(128),
    ...overrides,
  };
}

function encodeEvent(event: NostrEvent): string {
  return btoa(JSON.stringify(event));
}

// ── extractNostrAuth ──

describe('extractNostrAuth', () => {
  it('returns null when no X-Vouch-Auth header is present', () => {
    const headers = new Headers();
    const result = extractNostrAuth(headers);
    expect(result).toBeNull();
  });

  it('returns null when header has wrong prefix', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'Bearer abc123' });
    const result = extractNostrAuth(headers);
    expect(result).toBeNull();
  });

  it('returns null when header has empty base64 after prefix', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'Nostr ' });
    const result = extractNostrAuth(headers);
    expect(result).toBeNull();
  });

  it('returns null for invalid base64', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'Nostr !!!invalid!!!' });
    const result = extractNostrAuth(headers);
    expect(result).toBeNull();
  });

  it('returns null for valid base64 but invalid JSON', () => {
    const headers = new Headers({ 'X-Vouch-Auth': `Nostr ${btoa('not json')}` });
    const result = extractNostrAuth(headers);
    expect(result).toBeNull();
  });

  it('extracts valid Nostr event from properly formed header', () => {
    const event = makeValidEvent();
    const headers = new Headers({
      'X-Vouch-Auth': `Nostr ${encodeEvent(event)}`,
    });
    const result = extractNostrAuth(headers);
    expect(result).not.toBeNull();
    expect(result!.pubkey).toBe('b'.repeat(64));
    expect(result!.kind).toBe(27235);
  });
});

// ── parseNostrEvent ──

describe('parseNostrEvent', () => {
  it('returns null for non-object input', () => {
    expect(parseNostrEvent('string')).toBeNull();
    expect(parseNostrEvent(42)).toBeNull();
    expect(parseNostrEvent(null)).toBeNull();
    expect(parseNostrEvent(undefined)).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseNostrEvent({ id: 'a'.repeat(64) })).toBeNull();
    expect(parseNostrEvent({})).toBeNull();
  });

  it('returns null for wrong field types', () => {
    const event = makeValidEvent();
    expect(parseNostrEvent({ ...event, id: 123 })).toBeNull();
    expect(parseNostrEvent({ ...event, pubkey: 123 })).toBeNull();
    expect(parseNostrEvent({ ...event, created_at: '123' })).toBeNull();
    expect(parseNostrEvent({ ...event, kind: '27235' })).toBeNull();
    expect(parseNostrEvent({ ...event, tags: 'not array' })).toBeNull();
    expect(parseNostrEvent({ ...event, sig: 123 })).toBeNull();
  });

  it('returns null for wrong hex field lengths', () => {
    const event = makeValidEvent();
    expect(parseNostrEvent({ ...event, id: 'short' })).toBeNull();
    expect(parseNostrEvent({ ...event, pubkey: 'short' })).toBeNull();
    expect(parseNostrEvent({ ...event, sig: 'short' })).toBeNull();
  });

  it('returns null for non-hex characters in id', () => {
    const event = makeValidEvent({ id: 'g'.repeat(64) });
    expect(parseNostrEvent(event)).toBeNull();
  });

  it('parses a valid event', () => {
    const event = makeValidEvent();
    const result = parseNostrEvent(event);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('a'.repeat(64));
    expect(result!.kind).toBe(27235);
  });
});

// ── computeEventId ──

describe('computeEventId', () => {
  it('computes deterministic SHA-256 hash of canonical serialization', async () => {
    const event = makeValidEvent({
      pubkey: '0'.repeat(64),
      created_at: 1700000000,
      kind: 27235,
      tags: [['u', 'https://example.com'], ['method', 'GET']],
      content: '',
    });

    const id1 = await computeEventId(event);
    const id2 = await computeEventId(event);

    expect(id1).toBe(id2);
    expect(id1).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(id1)).toBe(true);
  });

  it('produces different IDs for different events', async () => {
    const event1 = makeValidEvent({ created_at: 1700000000 });
    const event2 = makeValidEvent({ created_at: 1700000001 });

    const id1 = await computeEventId(event1);
    const id2 = await computeEventId(event2);

    expect(id1).not.toBe(id2);
  });
});

// ── validateNip98Structure ──

describe('validateNip98Structure', () => {
  it('returns error for wrong kind', () => {
    const event = makeValidEvent({ kind: 1 });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).not.toBeNull();
    expect(err).toContain('kind');
  });

  it('returns error for missing u tag', () => {
    const event = makeValidEvent({ tags: [['method', 'POST']] });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).not.toBeNull();
    expect(err).toContain('u');
  });

  it('returns error for missing method tag', () => {
    const event = makeValidEvent({
      tags: [['u', 'https://gateway.percival-labs.ai/v1/messages']],
    });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).not.toBeNull();
    expect(err).toContain('method');
  });

  it('returns error for method mismatch', () => {
    const event = makeValidEvent({
      tags: [
        ['u', 'https://gateway.percival-labs.ai/v1/messages'],
        ['method', 'GET'],
      ],
    });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).not.toBeNull();
    expect(err).toContain('Method');
  });

  it('returns error for stale timestamp', () => {
    const staleTime = Math.floor(Date.now() / 1000) - 120;
    const event = makeValidEvent({ created_at: staleTime });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).not.toBeNull();
    expect(err).toContain('old');
  });

  it('returns error for future timestamp', () => {
    const futureTime = Math.floor(Date.now() / 1000) + 120;
    const event = makeValidEvent({ created_at: futureTime });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).not.toBeNull();
    expect(err).toContain('future');
  });

  it('returns null for valid NIP-98 event', () => {
    const event = makeValidEvent();
    // Method must match, but we only check method match (not full URL in this function)
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).toBeNull();
  });

  it('matches method case-insensitively', () => {
    const event = makeValidEvent({
      tags: [
        ['u', 'https://gateway.percival-labs.ai/v1/messages'],
        ['method', 'post'],
      ],
    });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).toBeNull();
  });

  it('rejects unrecognized gateway hostname', () => {
    const event = makeValidEvent({
      tags: [
        ['u', 'https://evil-gateway.example.com/v1/messages'],
        ['method', 'POST'],
      ],
    });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).not.toBeNull();
    expect(err).toContain('hostname not recognized');
  });

  it('accepts localhost for dev mode', () => {
    const event = makeValidEvent({
      tags: [
        ['u', 'http://localhost:8787/v1/messages'],
        ['method', 'POST'],
      ],
    });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).toBeNull();
  });

  it('accepts workers.dev gateway hostname', () => {
    const event = makeValidEvent({
      tags: [
        ['u', 'https://vouch-gateway.percival-labs.workers.dev/v1/messages'],
        ['method', 'POST'],
      ],
    });
    const err = validateNip98Structure(event, 'POST', '/v1/messages');
    expect(err).toBeNull();
  });
});

// ── extractAgentKey ──

describe('extractAgentKey', () => {
  it('returns null when no X-Vouch-Auth header is present', () => {
    const headers = new Headers();
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('returns null when header has wrong prefix', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'Bearer abc123' });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('returns null when header has Nostr prefix', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'Nostr abc123' });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('returns null when header has PrivacyToken prefix', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'PrivacyToken abc123' });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('returns null for empty token after prefix', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'AgentKey ' });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('returns null for token shorter than 64 chars', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'AgentKey abcd1234' });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('returns null for token longer than 64 chars', () => {
    const token = 'a'.repeat(65);
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${token}` });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('returns null for non-hex characters', () => {
    const token = 'g'.repeat(64);
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${token}` });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('returns null for uppercase hex', () => {
    const token = 'A'.repeat(64);
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${token}` });
    expect(extractAgentKey(headers)).toBeNull();
  });

  it('extracts valid 64-char hex token', () => {
    const token = 'a1b2c3d4'.repeat(8);
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${token}` });
    expect(extractAgentKey(headers)).toBe(token);
  });

  it('trims whitespace around token', () => {
    const token = 'a1b2c3d4'.repeat(8);
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey   ${token}  ` });
    expect(extractAgentKey(headers)).toBe(token);
  });
});

// ── resolveAuthIdentity — agent-key mode ──

describe('resolveAuthIdentity — agent-key mode', () => {
  it('resolves to agent-key mode for valid AgentKey header', () => {
    const token = 'a1b2c3d4'.repeat(8);
    const headers = new Headers({ 'X-Vouch-Auth': `AgentKey ${token}` });
    const { identity, nostrEvent, agentKeyToken } = resolveAuthIdentity(headers, '1.2.3.4');

    expect(identity.mode).toBe('agent-key');
    expect(identity.pubkey).toBe('');
    expect(nostrEvent).toBeNull();
    expect(agentKeyToken).toBe(token);
  });

  it('prefers NIP-98 over AgentKey', () => {
    const event = makeValidEvent();
    const headers = new Headers({
      'X-Vouch-Auth': `Nostr ${encodeEvent(event)}`,
    });
    const { identity, nostrEvent, agentKeyToken } = resolveAuthIdentity(headers, '1.2.3.4');

    expect(identity.mode).toBe('transparent');
    expect(nostrEvent).not.toBeNull();
    expect(agentKeyToken).toBeNull();
  });

  it('falls back to anonymous when AgentKey token is invalid format', () => {
    const headers = new Headers({ 'X-Vouch-Auth': 'AgentKey not-valid-hex!' });
    const { identity, agentKeyToken } = resolveAuthIdentity(headers, '1.2.3.4');

    expect(identity.mode).toBe('anonymous');
    expect(agentKeyToken).toBeNull();
  });

  it('returns agentKeyToken as null for non-agent-key modes', () => {
    const headers = new Headers();
    const { agentKeyToken } = resolveAuthIdentity(headers, '1.2.3.4');
    expect(agentKeyToken).toBeNull();
  });
});

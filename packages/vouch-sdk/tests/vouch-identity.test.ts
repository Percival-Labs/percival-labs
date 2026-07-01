import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { Vouch } from '../src/vouch';
import { VouchClient } from '../src/client';
import { generateNostrKeypair } from '../src/nostr-identity';

describe('Vouch identity privacy (#3/#4 fix)', () => {
  test('identity is not a reachable public property', () => {
    const vouch = new Vouch();
    expect((vouch as unknown as Record<string, unknown>).identity).toBeUndefined();
  });

  test('JSON.stringify never leaks the private key', () => {
    const vouch = new Vouch();
    const json = JSON.stringify(vouch);
    expect(json).not.toContain('nsec1');
    const parsed = JSON.parse(json);
    expect(parsed.npub).toBe(vouch.npub);
    expect(parsed.pubkey).toBe(vouch.pubkey);
  });

  test('exportNsec() explicitly returns the private key', () => {
    const kp = generateNostrKeypair();
    const vouch = new Vouch({ nsec: kp.nsec });
    expect(vouch.exportNsec()).toBe(kp.nsec);
  });

  test('Vouch.generate() creates a fresh identity explicitly', () => {
    const vouch = Vouch.generate();
    expect(vouch.npub).toMatch(/^npub1/);
  });

  test('throws when nsec is explicitly passed but falsy (does not silently mint a new identity)', () => {
    expect(() => new Vouch({ nsec: '' })).toThrow(/nsec.*explicitly passed/);
  });

  test('throws for the exact motivating bug: `new Vouch({ nsec: process.env.X })` with an unset env var', () => {
    // Mirrors `new Vouch({ nsec: process.env.VOUCH_NSEC })` when VOUCH_NSEC is
    // unset: the key `nsec` is present on the options object (assigned from an
    // expression) even though its value is `undefined`. This used to silently
    // fall through to auto-generation, minting a new identity and orphaning
    // any existing reputation — it must now throw instead.
    const unsetEnvVar: string | undefined = undefined;
    expect(() => new Vouch({ nsec: unsetEnvVar })).toThrow(/nsec.*explicitly passed/);
  });

  test('omitting the key entirely does not throw (auto-generates)', () => {
    expect(() => new Vouch({})).not.toThrow();
  });

  test('throws when secretKeyHex is explicitly passed but falsy', () => {
    expect(() => new Vouch({ secretKeyHex: '' })).toThrow(/secretKeyHex.*explicitly passed/);
  });

  test('omitting nsec entirely still auto-generates (unchanged behavior)', () => {
    const vouch = new Vouch();
    expect(vouch.npub).toMatch(/^npub1/);
  });

  test('sign() still works via the private identity internally', async () => {
    const vouch = new Vouch();
    const signed = await vouch.sign({
      pubkey: vouch.pubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'hi',
    });
    expect(await vouch.verifyEventSignature(signed)).toBe(true);
  });
});

describe('VouchClient key privacy (#3/#4 fix)', () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ data: { agent_id: 'a1' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('JSON.stringify never leaks the private key', async () => {
    const client = await VouchClient.create({
      erc8004AgentId: '1',
      erc8004Chain: 'eip155:8453',
      ownerAddress: '0xabc',
      ownerSignature: '0xsig',
    });
    const json = JSON.stringify(client);
    const creds = client.exportCredentials();
    expect(json).not.toContain(creds.privateKeyBase64);
    const parsed = JSON.parse(json);
    expect(parsed.agentId).toBe('a1');
    expect(parsed.publicKeyBase64).toBe(creds.publicKeyBase64);
  });
});

describe('Path segment encoding (#6 fix)', () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ data: { agent_id: 'a1' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('VouchClient encodes a path-injection attempt in a slug', async () => {
    const client = await VouchClient.create({
      erc8004AgentId: '1',
      erc8004Chain: 'eip155:8453',
      ownerAddress: '0xabc',
      ownerSignature: '0xsig',
    });
    fetchMock.mockClear();

    await client.tables.get('general/../admin?x=1');

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('/v1/tables/general/../admin');
    expect(url).toContain(encodeURIComponent('general/../admin?x=1'));
  });
});

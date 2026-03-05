// Vouch Gateway — Dual Auth: NIP-98 (Transparent) + Privacy Token (Private)
//
// Transparent mode: `X-Vouch-Auth: Nostr <base64 NIP-98 event>`
//   - Identity visible to PL
//   - Per-request billing from credit balance
//
// Private mode: `X-Vouch-Auth: PrivacyToken <base64 token>`
//   - Identity hidden from PL
//   - Billing from prepaid batch budget
//
// Adapted from vouch-api/src/middleware/nostr-auth.ts for Cloudflare Workers runtime.

import { schnorr } from '@noble/curves/secp256k1';
import type { NostrEvent, AuthIdentity, Env } from './types';

// ── Configuration ──

const MAX_EVENT_AGE_SECS = 60;
const CLOCK_SKEW_SECS = 5;

// ── Hex/Bytes Helpers ──

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Event Parsing ──

export function parseNostrEvent(json: unknown): NostrEvent | null {
  if (typeof json !== 'object' || json === null) return null;

  const obj = json as Record<string, unknown>;

  if (typeof obj.id !== 'string') return null;
  if (typeof obj.pubkey !== 'string') return null;
  if (typeof obj.created_at !== 'number') return null;
  if (typeof obj.kind !== 'number') return null;
  if (!Array.isArray(obj.tags)) return null;
  if (typeof obj.content !== 'string') return null;
  if (typeof obj.sig !== 'string') return null;

  if (!/^[0-9a-f]{64}$/.test(obj.id as string)) return null;
  if (!/^[0-9a-f]{64}$/.test(obj.pubkey as string)) return null;
  if (!/^[0-9a-f]{128}$/.test(obj.sig as string)) return null;

  return obj as unknown as NostrEvent;
}

// ── Event ID Computation ──

export async function computeEventId(event: NostrEvent): Promise<string> {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(serialized),
  );
  return bytesToHex(new Uint8Array(hash));
}

// ── NIP-98 Structural Validation ──

export function validateNip98Structure(
  event: NostrEvent,
  requestMethod: string,
  requestPath: string,
): string | null {
  if (event.kind !== 27235) {
    return `Invalid event kind: expected 27235, got ${event.kind}`;
  }

  const urlTag = event.tags.find((t) => t[0] === 'u');
  const methodTag = event.tags.find((t) => t[0] === 'method');

  if (!urlTag || !urlTag[1]) return 'Missing required "u" tag';
  if (!methodTag || !methodTag[1]) return 'Missing required "method" tag';

  if (methodTag[1].toUpperCase() !== requestMethod.toUpperCase()) {
    return `Method mismatch: event has "${methodTag[1]}", request is "${requestMethod}"`;
  }

  try {
    const eventUrl = new URL(urlTag[1]);
    // Validate both hostname and path to prevent auth token reuse across hosts.
    // The hostname must match our gateway domain(s).
    // Production hosts + localhost for dev. TODO: make env-aware to block
    // localhost in production (requires passing env to auth validation).
    const gatewayHosts = ['gateway.percival-labs.ai', 'vouch-gateway.percival-labs.workers.dev', 'localhost'];
    if (!gatewayHosts.includes(eventUrl.hostname)) {
      return `URL hostname not recognized: "${eventUrl.hostname}"`;
    }
    if (eventUrl.pathname !== requestPath) {
      return `URL path mismatch: event has "${eventUrl.pathname}", request is "${requestPath}"`;
    }
  } catch {
    return `Invalid URL in "u" tag: ${urlTag[1]}`;
  }

  const nowSecs = Math.floor(Date.now() / 1000);
  if (event.created_at > nowSecs + CLOCK_SKEW_SECS) {
    return `Event timestamp is in the future (${event.created_at - nowSecs}s ahead)`;
  }
  if (nowSecs - event.created_at > MAX_EVENT_AGE_SECS) {
    return `Event timestamp too old (${nowSecs - event.created_at}s ago, max ${MAX_EVENT_AGE_SECS}s)`;
  }

  return null;
}

// ── Signature Verification ──

export async function verifyNostrEvent(event: NostrEvent): Promise<boolean> {
  const expectedId = await computeEventId(event);
  if (expectedId !== event.id) return false;

  try {
    return schnorr.verify(
      hexToBytes(event.sig),
      hexToBytes(event.id),
      hexToBytes(event.pubkey),
    );
  } catch {
    return false;
  }
}

// ── Header Extraction ──

/**
 * Extract auth identity from the X-Vouch-Auth header.
 * Supports two formats:
 *   - `Nostr <base64>` — NIP-98 transparent auth
 *   - `PrivacyToken <base64>` — blind-signed privacy token
 *
 * Returns null if no auth header is present.
 */
export function extractNostrAuth(headers: Headers): NostrEvent | null {
  const authHeader = headers.get('X-Vouch-Auth');
  if (!authHeader || !authHeader.startsWith('Nostr ')) {
    return null;
  }

  const base64Event = authHeader.slice('Nostr '.length).trim();
  if (!base64Event) return null;

  let eventJson: unknown;
  try {
    const decoded = atob(base64Event);
    eventJson = JSON.parse(decoded);
  } catch {
    return null;
  }

  return parseNostrEvent(eventJson);
}

// ── Privacy Token Extraction ──

interface PrivacyTokenPayload {
  batchHash: string;
  tokenHash: string;
  tokenBytes: string; // base64
}

/**
 * Extract a Privacy Token from the X-Vouch-Auth header.
 * Format: `PrivacyToken <base64 JSON>`
 * The JSON contains: { batchHash, tokenHash, tokenBytes }
 *
 * Token cryptographic verification happens at the Vouch API level
 * when the gateway reports usage. The gateway trusts the token
 * structure and uses the batch_hash for billing.
 */
export function extractPrivacyToken(headers: Headers): PrivacyTokenPayload | null {
  const authHeader = headers.get('X-Vouch-Auth');
  if (!authHeader || !authHeader.startsWith('PrivacyToken ')) {
    return null;
  }

  const base64Token = authHeader.slice('PrivacyToken '.length).trim();
  if (!base64Token) return null;

  try {
    const decoded = atob(base64Token);
    const payload = JSON.parse(decoded);

    if (typeof payload.batchHash !== 'string' || typeof payload.tokenHash !== 'string') {
      return null;
    }

    // Validate hash format — must be hex strings of reasonable length
    if (!/^[0-9a-f]{16,128}$/.test(payload.batchHash)) return null;
    if (!/^[0-9a-f]{16,128}$/.test(payload.tokenHash)) return null;

    return {
      batchHash: payload.batchHash,
      tokenHash: payload.tokenHash,
      tokenBytes: typeof payload.tokenBytes === 'string' ? payload.tokenBytes : '',
    };
  } catch {
    return null;
  }
}

// ── AgentKey Extraction ──

/**
 * Extract an AgentKey token from the X-Vouch-Auth header.
 * Format: `AgentKey <64-char hex token>`
 *
 * Returns the raw token string if valid format, null otherwise.
 * Actual KV validation happens in index.ts (requires env).
 */
export function extractAgentKey(headers: Headers): string | null {
  const authHeader = headers.get('X-Vouch-Auth');
  if (!authHeader || !authHeader.startsWith('AgentKey ')) {
    return null;
  }

  const token = authHeader.slice('AgentKey '.length).trim();
  if (!token) return null;

  // Validate: must be exactly 64 hex characters (32 bytes)
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return null;
  }

  return token;
}

/**
 * Determine auth identity from request headers.
 * Tries NIP-98 first (transparent), then Privacy Token (private),
 * then AgentKey, then falls back to anonymous.
 */
export function resolveAuthIdentity(headers: Headers, clientIp: string): {
  identity: AuthIdentity;
  nostrEvent: NostrEvent | null;
  agentKeyToken: string | null;
} {
  // Try NIP-98 (transparent mode)
  const nostrEvent = extractNostrAuth(headers);
  if (nostrEvent) {
    return {
      identity: {
        mode: 'transparent',
        pubkey: nostrEvent.pubkey,
      },
      nostrEvent,
      agentKeyToken: null,
    };
  }

  // Try Privacy Token (private mode)
  const privacyToken = extractPrivacyToken(headers);
  if (privacyToken) {
    return {
      identity: {
        mode: 'private',
        pubkey: `batch:${privacyToken.batchHash.slice(0, 16)}`,
        batchHash: privacyToken.batchHash,
        tokenHash: privacyToken.tokenHash,
      },
      nostrEvent: null,
      agentKeyToken: null,
    };
  }

  // Try AgentKey (long-lived token mode)
  const agentKeyToken = extractAgentKey(headers);
  if (agentKeyToken) {
    return {
      identity: {
        mode: 'agent-key',
        pubkey: '', // resolved async via KV lookup in index.ts
      },
      nostrEvent: null,
      agentKeyToken,
    };
  }

  // No auth — anonymous/restricted
  return {
    identity: {
      mode: 'anonymous',
      pubkey: `anon:${clientIp}`,
    },
    nostrEvent: null,
    agentKeyToken: null,
  };
}

// Vouch Gateway — NIP-98 Auth Extraction and Verification
//
// Extracts Vouch identity from `X-Vouch-Auth: Nostr <base64 NIP-98 event>` headers.
// Verifies event structure, timestamps, and Schnorr signatures.
//
// Adapted from vouch-api/src/middleware/nostr-auth.ts for Cloudflare Workers runtime
// (no Node.js dependencies, uses Web Crypto API).

import { schnorr } from '@noble/curves/secp256k1';
import type { NostrEvent } from './types';

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

/**
 * Parse and validate a raw JSON value as a Nostr event.
 * Returns null if the structure is invalid.
 */
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

  // Validate hex field lengths
  if (!/^[0-9a-f]{64}$/.test(obj.id as string)) return null;
  if (!/^[0-9a-f]{64}$/.test(obj.pubkey as string)) return null;
  if (!/^[0-9a-f]{128}$/.test(obj.sig as string)) return null;

  return obj as unknown as NostrEvent;
}

// ── Event ID Computation ──

/**
 * Compute event ID per NIP-01: SHA-256 of [0, pubkey, created_at, kind, tags, content].
 * Uses Web Crypto API (available in Workers and Bun).
 */
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

/**
 * Validate NIP-98 event structure: kind, tags, method, URL path, and timestamp.
 * Compares pathname only (host varies by deployment — workers.dev, custom domain, etc.).
 * Returns an error message string if invalid, or null if valid.
 */
export function validateNip98Structure(
  event: NostrEvent,
  requestMethod: string,
  requestPath: string,
): string | null {
  // Kind must be 27235 (NIP-98 HTTP Auth)
  if (event.kind !== 27235) {
    return `Invalid event kind: expected 27235, got ${event.kind}`;
  }

  // Extract tag values
  const urlTag = event.tags.find((t) => t[0] === 'u');
  const methodTag = event.tags.find((t) => t[0] === 'method');

  if (!urlTag || !urlTag[1]) {
    return 'Missing required "u" tag';
  }

  if (!methodTag || !methodTag[1]) {
    return 'Missing required "method" tag';
  }

  // Method comparison (case-insensitive)
  if (methodTag[1].toUpperCase() !== requestMethod.toUpperCase()) {
    return `Method mismatch: event has "${methodTag[1]}", request is "${requestMethod}"`;
  }

  // URL path comparison (pathname only — host varies by deployment)
  try {
    const eventUrl = new URL(urlTag[1]);
    if (eventUrl.pathname !== requestPath) {
      return `URL path mismatch: event has "${eventUrl.pathname}", request is "${requestPath}"`;
    }
  } catch {
    return `Invalid URL in "u" tag: ${urlTag[1]}`;
  }

  // Timestamp freshness
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

/**
 * Verify a Nostr event's cryptographic integrity:
 * 1. Recompute event ID from canonical serialization
 * 2. Verify Schnorr signature (BIP-340)
 */
export async function verifyNostrEvent(event: NostrEvent): Promise<boolean> {
  const expectedId = await computeEventId(event);
  if (expectedId !== event.id) {
    return false;
  }

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
 * Extract and parse a Nostr event from the X-Vouch-Auth header.
 * Expected format: `Nostr <base64-encoded JSON event>`
 * Returns null if the header is missing, malformed, or contains invalid data.
 */
export function extractNostrAuth(headers: Headers): NostrEvent | null {
  const authHeader = headers.get('X-Vouch-Auth');
  if (!authHeader || !authHeader.startsWith('Nostr ')) {
    return null;
  }

  const base64Event = authHeader.slice('Nostr '.length).trim();
  if (!base64Event) {
    return null;
  }

  let eventJson: unknown;
  try {
    const decoded = atob(base64Event);
    eventJson = JSON.parse(decoded);
  } catch {
    return null;
  }

  return parseNostrEvent(eventJson);
}

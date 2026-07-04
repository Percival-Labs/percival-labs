/**
 * Nostr cryptographic primitives — standalone, no vouch-sdk dependency.
 *
 * Handles nsec decoding, event ID computation, and Schnorr signing
 * per NIP-01. Uses @noble/curves for secp256k1 and @scure/base for bech32.
 */

import { schnorr } from '@noble/curves/secp256k1';
import { bech32 } from '@scure/base';
import type { NostrEvent, UnsignedNostrEvent } from '../../types.js';

// ── Types ──────────────────────────────────────────────────────────

export interface NostrIdentity {
  secretKeyHex: string;
  pubkeyHex: string;
}

// ── Identity ───────────────────────────────────────────────────────

/**
 * Decode an nsec bech32 string into secret key hex and derived pubkey hex.
 */
export function identityFromNsec(nsec: string): NostrIdentity {
  const { prefix, words } = bech32.decode(nsec as `${string}1${string}`);
  if (prefix !== 'nsec') {
    throw new Error(`Expected nsec prefix, got ${prefix}`);
  }
  const secretKeyBytes = new Uint8Array(bech32.fromWords(words));
  const secretKeyHex = bytesToHex(secretKeyBytes);
  const pubkeyBytes = schnorr.getPublicKey(secretKeyBytes);
  const pubkeyHex = bytesToHex(pubkeyBytes);

  return { secretKeyHex, pubkeyHex };
}

// ── Event ID ───────────────────────────────────────────────────────

/**
 * Compute NIP-01 event ID: SHA-256 of the serialized event array
 * [0, pubkey, created_at, kind, tags, content].
 */
export async function computeEventId(
  event: UnsignedNostrEvent,
): Promise<string> {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const data = new TextEncoder().encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

// ── Signing ────────────────────────────────────────────────────────

/**
 * Sign an unsigned Nostr event with a secret key (Schnorr / BIP-340).
 * Returns a complete NostrEvent with id and sig.
 */
export async function signEvent(
  unsigned: UnsignedNostrEvent,
  secretKeyHex: string,
): Promise<NostrEvent> {
  const id = await computeEventId(unsigned);
  const sig = bytesToHex(
    schnorr.sign(hexToBytes(id), hexToBytes(secretKeyHex)),
  );

  return {
    ...unsigned,
    id,
    sig,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

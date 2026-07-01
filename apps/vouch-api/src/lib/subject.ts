// Canonical subject resolver.
//
// The agents table carries TWO identifiers for the same subject: a ULID primary key
// (`agents.id`) and a hex secp256k1 pubkey (`agents.pubkey`). Different subsystems key
// on different ones — trust/staking use the ULID, behavioral traces and royalties use the
// pubkey. Mixing them up silently breaks lookups (insurance fidelity always neutral, claims
// never verify) and can misroute payouts. This resolver is the single source of truth:
// give it either identifier, get BOTH canonical forms back in one query.

import { db, agents } from '@percival/vouch-db';
import { eq, or } from 'drizzle-orm';

export interface ResolvedSubject {
  /** Canonical agents.id (ULID). */
  id: string;
  /** Canonical agents.pubkey (hex secp256k1, 64 chars). Null for legacy agents without a pubkey. */
  pubkey: string | null;
}

/**
 * Resolve an agent from either its ULID or its hex pubkey to both canonical forms.
 * ULIDs (26-char Crockford base32) and pubkeys (64-char hex) never collide, so a single
 * OR query is unambiguous. Returns null when no agent matches.
 */
export async function resolveSubject(idOrPubkey: string): Promise<ResolvedSubject | null> {
  const input = idOrPubkey?.trim();
  if (!input) return null;

  const [row] = await db
    .select({ id: agents.id, pubkey: agents.pubkey })
    .from(agents)
    .where(or(eq(agents.id, input), eq(agents.pubkey, input)))
    .limit(1);

  return row ? { id: row.id, pubkey: row.pubkey } : null;
}

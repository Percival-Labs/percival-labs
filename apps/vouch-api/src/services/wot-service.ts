import { db, wotScoreCache } from '@percival/vouch-db';
import { and, eq, gte } from 'drizzle-orm';
// Shared, unit-tested WoT trust math lives in wot-math.ts. Import (and re-export for the
// existing public surface) rather than duplicating — the duplication was a drift hazard on a
// trust-granting path (#15).
import {
  clamp,
  parseIntEnv,
  normalizeWotCommunityScore,
  blendCommunityWithWot,
  computeWotVerificationBonus,
  type SybilClassification,
  type WotSnapshot,
} from './wot-math';

export {
  normalizeWotCommunityScore,
  blendCommunityWithWot,
  computeWotVerificationBonus,
  type WotSnapshot,
};

interface WotScoreResponse {
  score?: number;
  raw_score?: number;
  found?: boolean;
  followers?: number;
}

interface WotSybilResponse {
  sybil_score?: number;
  classification?: string;
  confidence?: number;
  followers?: number;
}

type WotCacheRow = typeof wotScoreCache.$inferSelect;

const DEFAULT_WOT_BASE_URL = 'https://wot.klabo.world';
const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_CACHE_TTL_HOURS = 24;

// clamp / parseIntEnv now come from wot-math (deduped). parseBoolEnv stays local — it has no
// trust-math role and no wot-math consumer.
function parseBoolEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const normalized = value.toLowerCase().trim();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
  return fallback;
}

function isValidHexPubkey(pubkey: string): boolean {
  return /^[0-9a-f]{64}$/.test(pubkey);
}

function normalizeClassification(value: string | null | undefined): SybilClassification | null {
  if (!value) return null;
  if (value === 'genuine' || value === 'likely_genuine' || value === 'suspicious' || value === 'likely_sybil') {
    return value;
  }
  return null;
}

function wotEnabled(): boolean {
  return parseBoolEnv('WOT_ENABLED', false);
}

function wotBaseUrl(): string {
  return process.env.WOT_BASE_URL?.trim() || DEFAULT_WOT_BASE_URL;
}

function wotTimeoutMs(): number {
  return parseIntEnv('WOT_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, 250, 10000);
}

function wotCacheTtlHours(): number {
  return parseIntEnv('WOT_CACHE_TTL_HOURS', DEFAULT_CACHE_TTL_HOURS, 1, 168);
}

const inflightRequests = new Map<string, Promise<WotSnapshot | null>>();

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function mapRowToSnapshot(row: WotCacheRow): Omit<WotSnapshot, 'partial'> {
  return {
    pubkey: row.pubkey,
    score: clamp(row.score ?? 0, 0, 100),
    rawScore: row.rawScore ?? null,
    found: row.found ?? false,
    followers: Math.max(0, row.followers ?? 0),
    sybilScore: row.sybilScore ?? null,
    sybilClassification: normalizeClassification(row.sybilClassification),
    sybilConfidence: row.sybilConfidence ?? null,
    fetchedAt: row.fetchedAt,
  };
}

async function fetchJson<T>(path: string, query: Record<string, string>, timeoutMs: number): Promise<T> {
  const url = new URL(path, wotBaseUrl());
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url.pathname}`);
    }
    return await res.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function getWotSnapshot(pubkey: string): Promise<WotSnapshot | null> {
  if (!wotEnabled()) return null;

  const normalizedPubkey = pubkey.trim().toLowerCase();
  if (!isValidHexPubkey(normalizedPubkey)) return null;

  const existing = inflightRequests.get(normalizedPubkey);
  if (existing) return existing;

  const promise = getWotSnapshotInternal(normalizedPubkey);
  inflightRequests.set(normalizedPubkey, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(normalizedPubkey);
  }
}

async function getWotSnapshotInternal(normalizedPubkey: string): Promise<WotSnapshot | null> {
  const cutoff = new Date(Date.now() - (wotCacheTtlHours() * 60 * 60 * 1000));

  const [freshCache] = await db.select()
    .from(wotScoreCache)
    .where(and(
      eq(wotScoreCache.pubkey, normalizedPubkey),
      gte(wotScoreCache.fetchedAt, cutoff),
    ))
    .limit(1);

  if (freshCache) {
    return { ...mapRowToSnapshot(freshCache), partial: false };
  }

  const [staleCache] = await db.select()
    .from(wotScoreCache)
    .where(eq(wotScoreCache.pubkey, normalizedPubkey))
    .limit(1);

  const timeoutMs = wotTimeoutMs();
  const [scoreResult, sybilResult] = await Promise.allSettled([
    fetchJson<WotScoreResponse>('/score', { pubkey: normalizedPubkey }, timeoutMs),
    fetchJson<WotSybilResponse>('/sybil', { pubkey: normalizedPubkey }, timeoutMs),
  ]);

  const scorePayload = scoreResult.status === 'fulfilled' ? scoreResult.value : null;
  const sybilPayload = sybilResult.status === 'fulfilled' ? sybilResult.value : null;
  const partial = !scorePayload || !sybilPayload;

  if (!scorePayload && !sybilPayload) {
    if (scoreResult.status === 'rejected') {
      console.warn(`[wot] score lookup failed for ${normalizedPubkey}: ${toErrorMessage(scoreResult.reason)}`);
    }
    if (sybilResult.status === 'rejected') {
      console.warn(`[wot] sybil lookup failed for ${normalizedPubkey}: ${toErrorMessage(sybilResult.reason)}`);
    }
    if (staleCache) {
      return { ...mapRowToSnapshot(staleCache), partial: true };
    }
    return null;
  }

  const now = new Date();
  const snapshot: WotSnapshot = {
    pubkey: normalizedPubkey,
    score: clamp(Math.round(scorePayload?.score ?? staleCache?.score ?? 0), 0, 100),
    rawScore: scorePayload?.raw_score ?? staleCache?.rawScore ?? null,
    found: scorePayload?.found ?? staleCache?.found ?? false,
    followers: Math.max(0, Math.round(scorePayload?.followers ?? sybilPayload?.followers ?? staleCache?.followers ?? 0)),
    sybilScore: sybilPayload?.sybil_score ?? staleCache?.sybilScore ?? null,
    sybilClassification: normalizeClassification(sybilPayload?.classification ?? staleCache?.sybilClassification),
    sybilConfidence: sybilPayload?.confidence ?? staleCache?.sybilConfidence ?? null,
    fetchedAt: now,
    partial,
  };

  await db.insert(wotScoreCache).values({
    pubkey: snapshot.pubkey,
    score: snapshot.score,
    rawScore: snapshot.rawScore,
    found: snapshot.found,
    followers: snapshot.followers,
    sybilScore: snapshot.sybilScore,
    sybilClassification: snapshot.sybilClassification,
    sybilConfidence: snapshot.sybilConfidence,
    scorePayload: scorePayload ? scorePayload as unknown as Record<string, unknown> : undefined,
    sybilPayload: sybilPayload ? sybilPayload as unknown as Record<string, unknown> : undefined,
    fetchedAt: snapshot.fetchedAt,
  }).onConflictDoUpdate({
    target: wotScoreCache.pubkey,
    set: {
      score: snapshot.score,
      rawScore: snapshot.rawScore,
      found: snapshot.found,
      followers: snapshot.followers,
      sybilScore: snapshot.sybilScore,
      sybilClassification: snapshot.sybilClassification,
      sybilConfidence: snapshot.sybilConfidence,
      scorePayload: scorePayload ? scorePayload as unknown as Record<string, unknown> : undefined,
      sybilPayload: sybilPayload ? sybilPayload as unknown as Record<string, unknown> : undefined,
      fetchedAt: snapshot.fetchedAt,
    },
  });

  return snapshot;
}

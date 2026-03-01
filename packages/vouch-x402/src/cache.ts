// Vouch x402 — In-memory TTL cache for trust scores.
// Simple Map-based cache. No dependencies.

import type { VouchScoreResponse } from './types';

interface CacheEntry {
  data: VouchScoreResponse;
  expiresAt: number;
}

export class ScoreCache {
  private cache = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): VouchScoreResponse | null {
    if (this.ttlMs <= 0) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: VouchScoreResponse): void {
    if (this.ttlMs <= 0) return;

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

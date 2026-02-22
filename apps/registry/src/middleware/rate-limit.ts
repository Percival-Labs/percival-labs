// Percival Labs - Token Bucket Rate Limiter Middleware
// In-memory per-IP rate limiting with read/write tiers

import type { Context, Next, MiddlewareHandler } from 'hono';

// ── Types ──

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitTier {
  maxTokens: number;
  refillRate: number; // tokens per millisecond
  windowMs: number;
}

// ── Configuration ──

const TIERS: Record<string, RateLimitTier> = {
  read: {
    maxTokens: 120,
    refillRate: 120 / 60_000, // 120 per minute = 2 per second
    windowMs: 60_000,
  },
  write: {
    maxTokens: 20,
    refillRate: 20 / 60_000, // 20 per minute
    windowMs: 60_000,
  },
};

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BUCKET_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes without activity
const MAX_STORE_SIZE = 100_000; // H9 fix: cap store to prevent memory exhaustion DoS

// ── Store ──

// Keyed by "{ip}:{tier}" -> bucket state
const store = new Map<string, TokenBucket>();

// Track last access per key for cleanup
const lastAccess = new Map<string, number>();

// ── Cleanup ──

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, accessTime] of lastAccess.entries()) {
      if (now - accessTime > BUCKET_EXPIRY_MS) {
        store.delete(key);
        lastAccess.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow process to exit without waiting for this timer
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// ── Token Bucket Logic ──

function getTierForMethod(method: string): string {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return 'read';
  }
  return 'write';
}

function refillBucket(bucket: TokenBucket, tier: RateLimitTier, now: number): void {
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = elapsed * tier.refillRate;
  bucket.tokens = Math.min(tier.maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

function consumeToken(ip: string, tierName: string): {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSeconds: number;
} {
  const tier = TIERS[tierName];
  const key = `${ip}:${tierName}`;
  const now = Date.now();

  lastAccess.set(key, now);

  let bucket = store.get(key);
  if (!bucket) {
    // H9 fix: reject new keys when store is at capacity
    if (store.size >= MAX_STORE_SIZE) {
      return {
        allowed: false,
        remaining: 0,
        limit: tier.maxTokens,
        resetAt: now + tier.windowMs,
        retryAfterSeconds: 60,
      };
    }
    bucket = { tokens: tier.maxTokens, lastRefill: now };
    store.set(key, bucket);
  }

  // Refill based on elapsed time
  refillBucket(bucket, tier, now);

  const resetAt = now + tier.windowMs;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      limit: tier.maxTokens,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  // Denied: calculate how long until 1 token is available
  const timeUntilToken = Math.ceil((1 - bucket.tokens) / tier.refillRate);
  const retryAfterSeconds = Math.ceil(timeUntilToken / 1000);

  return {
    allowed: false,
    remaining: 0,
    limit: tier.maxTokens,
    resetAt,
    retryAfterSeconds: Math.max(1, retryAfterSeconds),
  };
}

// ── Middleware ──

export function rateLimiter(): MiddlewareHandler {
  startCleanup();

  return async (c: Context, next: Next) => {
    // C5 fix: don't blindly trust X-Forwarded-For. Use connection info or trusted proxy chain.
    const connInfo = (c.env as any)?.remoteAddr || (c.req.raw as any)?.socket?.remoteAddress;
    const trustedProxies = process.env.TRUSTED_PROXY_IPS?.split(',').map(s => s.trim());
    let ip = 'unknown';
    if (connInfo) {
      ip = String(connInfo);
    } else if (trustedProxies && trustedProxies.length > 0) {
      const xff = c.req.header('x-forwarded-for');
      if (xff) {
        const ips = xff.split(',').map(s => s.trim());
        for (let i = ips.length - 1; i >= 0; i--) {
          if (!trustedProxies.includes(ips[i])) { ip = ips[i]; break; }
        }
      }
    }
    const tierName = getTierForMethod(c.req.method);
    const result = consumeToken(ip, tierName);

    // Always set rate limit headers
    c.header('X-RateLimit-Limit', String(result.limit));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

    if (!result.allowed) {
      c.header('Retry-After', String(result.retryAfterSeconds));
      return c.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfterSeconds,
        },
        429,
      );
    }

    await next();
  };
}

// ── Testing Utilities ──

/** Reset all rate limit state. For testing only. */
export function _resetStore(): void {
  store.clear();
  lastAccess.clear();
}

/** Stop the cleanup interval. For testing/shutdown. */
export function _stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

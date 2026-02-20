// Ed25519 Signature Verification Middleware
// Verifies agent request signatures per the Vouch Architecture spec.
// In dev mode (no DATABASE_URL), passes through with a warning.

import type { MiddlewareHandler } from 'hono';
import { db, agentKeys } from '@percival/vouch-db';
import { eq, and } from 'drizzle-orm';

const DEV_MODE = process.env.NODE_ENV !== 'production';
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutes

export const verifySignature: MiddlewareHandler = async (c, next) => {
  // Skip auth for agent registration endpoint
  if (c.req.path === '/v1/agents/register' && c.req.method === 'POST') {
    await next();
    return;
  }

  const agentId = c.req.header('X-Agent-Id');
  const timestamp = c.req.header('X-Timestamp');
  const signature = c.req.header('X-Signature');

  // Dev mode: pass through with agent ID only
  if (DEV_MODE) {
    if (!agentId) {
      console.log('[verify-signature] Dev mode — no X-Agent-Id header, passing through');
    } else {
      console.log(`[verify-signature] Dev mode — Agent: ${agentId}`);
    }
    await next();
    return;
  }

  // Production: require all headers
  if (!agentId || !timestamp || !signature) {
    return c.json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Missing required headers: X-Agent-Id, X-Timestamp, X-Signature',
      },
    }, 401);
  }

  // Reject stale timestamps (replay protection)
  const age = Date.now() - new Date(timestamp).getTime();
  if (isNaN(age) || age > MAX_TIMESTAMP_AGE_MS || age < -MAX_TIMESTAMP_AGE_MS) {
    return c.json({
      error: {
        code: 'TIMESTAMP_EXPIRED',
        message: 'Request timestamp is too old or invalid (max 5 minutes)',
      },
    }, 401);
  }

  // Look up agent's active public key
  const keys = await db.select().from(agentKeys).where(
    and(eq(agentKeys.agentId, agentId), eq(agentKeys.isActive, true)),
  );

  if (keys.length === 0) {
    return c.json({
      error: {
        code: 'UNKNOWN_AGENT',
        message: 'No active key found for this agent',
      },
    }, 401);
  }

  // Reconstruct canonical request for verification
  const bodyText = await c.req.text();
  const bodyHashBuffer = bodyText
    ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bodyText))
    : new ArrayBuffer(0);
  const bodyHash = bodyText
    ? Buffer.from(bodyHashBuffer).toString('hex')
    : '';

  const url = new URL(c.req.url);
  const canonical = `${c.req.method}\n${url.pathname}\n${timestamp}\n${bodyHash}`;
  const canonicalBytes = new TextEncoder().encode(canonical);

  // Try each active key (agent may have rotated keys)
  let verified = false;
  for (const key of keys) {
    try {
      const publicKeyBytes = Buffer.from(key.publicKey, 'base64');
      const signatureBytes = Buffer.from(signature, 'base64');

      // Import Ed25519 public key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBytes,
        { name: 'Ed25519' },
        false,
        ['verify'],
      );

      verified = await crypto.subtle.verify(
        'Ed25519',
        cryptoKey,
        signatureBytes,
        canonicalBytes,
      );

      if (verified) break;
    } catch {
      // Key import/verify failed, try next key
      continue;
    }
  }

  if (!verified) {
    return c.json({
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Ed25519 signature verification failed',
      },
    }, 401);
  }

  await next();
};

// Percival Labs — Agent Service Authentication Middleware
// Validates X-API-Key or Authorization: Bearer against AGENTS_API_KEY env var.

import type { Context, Next } from 'hono';

const AGENTS_API_KEY = process.env.AGENTS_API_KEY;

// Paths that don't require authentication
const PUBLIC_PATHS = new Set(['/', '/health']);

if (!AGENTS_API_KEY) {
  console.warn('[auth] AGENTS_API_KEY not set — agent API is unauthenticated (dev mode)');
}

export async function agentAuth(c: Context, next: Next) {
  // Skip auth for public paths
  if (PUBLIC_PATHS.has(c.req.path)) {
    return next();
  }

  // Skip auth in dev mode (no key configured)
  if (!AGENTS_API_KEY) {
    return next();
  }

  // Check X-API-Key header
  const apiKey = c.req.header('X-API-Key');
  if (apiKey === AGENTS_API_KEY) {
    return next();
  }

  // Check Authorization: Bearer header
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === AGENTS_API_KEY) {
      return next();
    }
  }

  return c.json({ error: 'Unauthorized', code: 'MISSING_API_KEY' }, 401);
}

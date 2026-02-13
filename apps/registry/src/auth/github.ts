// Percival Labs - GitHub OAuth Flow
// Handles authorization redirect, callback, token exchange, user creation

import { Hono } from 'hono';
import type { Database } from 'bun:sqlite';
import { getPublisherByGithub, createPublisher } from '@percival/db';
import { createToken, verifyToken } from './jwt';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3100/auth/github/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3400';

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

// ── OAuth State Store (CSRF protection) ──
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const STATE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const pendingStates = new Map<string, number>(); // state -> expiresAt

// Periodic cleanup of expired states
setInterval(() => {
  const now = Date.now();
  for (const [state, expiresAt] of pendingStates) {
    if (expiresAt < now) pendingStates.delete(state);
  }
}, STATE_CLEANUP_INTERVAL_MS);

export function authRoutes(db: Database): Hono {
  const app = new Hono();

  // ── GET /auth/github — Redirect to GitHub OAuth ──
  app.get('/github', (c) => {
    if (!GITHUB_CLIENT_ID) {
      return c.json({ error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID env var.' }, 503);
    }

    const state = crypto.randomUUID();
    pendingStates.set(state, Date.now() + STATE_TTL_MS);

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      scope: 'read:user user:email',
      state,
    });

    return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  // ── GET /auth/github/callback — Exchange code for token ──
  app.get('/github/callback', async (c) => {
    const code = c.req.query('code');
    if (!code) {
      return c.json({ error: 'Missing authorization code' }, 400);
    }

    // Validate OAuth state parameter (CSRF protection)
    const state = c.req.query('state');
    if (!state || !pendingStates.has(state)) {
      return c.json({ error: 'Invalid or expired OAuth state', code: 'INVALID_STATE' }, 400);
    }
    const expiresAt = pendingStates.get(state)!;
    pendingStates.delete(state);
    if (Date.now() > expiresAt) {
      return c.json({ error: 'OAuth state expired', code: 'STATE_EXPIRED' }, 400);
    }

    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return c.json({ error: 'GitHub OAuth not configured' }, 503);
    }

    // Exchange code for GitHub access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: CALLBACK_URL,
      }),
    });

    const tokenData = await tokenRes.json() as GitHubTokenResponse;
    if (!tokenData.access_token) {
      return c.json({ error: 'Failed to exchange code for token' }, 400);
    }

    // Get GitHub user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
        'User-Agent': 'Percival-Labs',
      },
    });

    const ghUser = await userRes.json() as GitHubUser;

    // Get primary email if not public
    let email = ghUser.email;
    if (!email) {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'Percival-Labs',
        },
      });
      const emails = await emailRes.json() as Array<{ email: string; primary: boolean }>;
      email = emails.find(e => e.primary)?.email || emails[0]?.email || `${ghUser.login}@github.com`;
    }

    // Find or create publisher
    const githubId = String(ghUser.id);
    let publisher = getPublisherByGithub(db, githubId);

    if (!publisher) {
      publisher = createPublisher(db, {
        github_id: githubId,
        display_name: ghUser.name || ghUser.login,
        email,
      });
      console.log(`[Auth] New publisher: ${publisher.display_name} (${githubId})`);
    }

    // Issue JWT
    const jwt = await createToken({
      sub: publisher.id,
      github_id: githubId,
      display_name: publisher.display_name,
    });

    // Redirect to frontend with token
    return c.redirect(`${FRONTEND_URL}/auth/success?token=${jwt}`);
  });

  // ── GET /auth/me — Current authenticated user ──
  app.get('/me', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' }, 401);
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' }, 401);
    }

    const publisher = getPublisherByGithub(db, payload.github_id);
    if (!publisher) {
      return c.json({ error: 'Publisher not found', code: 'NOT_FOUND' }, 404);
    }

    return c.json({
      publisher: {
        id: publisher.id,
        display_name: publisher.display_name,
        github_id: publisher.github_id,
        verified_at: publisher.verified_at,
        trust_score: publisher.trust_score,
      },
    });
  });

  return app;
}

/**
 * Auth middleware — extracts publisher ID from JWT or X-Publisher-Id header.
 * Sets c.set('publisherId', id) for downstream handlers.
 */
export async function authMiddleware(c: any, next: () => Promise<void>) {
  // Try JWT first
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const payload = await verifyToken(authHeader.slice(7));
    if (payload) {
      c.set('publisherId', payload.sub);
      c.set('publisherName', payload.display_name);
      return next();
    }
  }

  // Fallback to X-Publisher-Id header (development only)
  if (process.env.NODE_ENV === 'development') {
    const headerPublisherId = c.req.header('X-Publisher-Id');
    if (headerPublisherId) {
      c.set('publisherId', headerPublisherId);
      return next();
    }
  }

  // No auth — allow read-only methods, block writes
  const method = c.req.method;
  if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    if (!c.get('publisherId')) {
      return c.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401);
    }
  }

  await next();
}

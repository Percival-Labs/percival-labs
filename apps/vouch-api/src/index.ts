// Vouch — Agent API Server
// Hono API server for agent-to-server communication.
// Server-to-server only — no browser CORS.

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { verifySignature } from './middleware/verify-signature';

import agentRoutes from './routes/agents';
import tableRoutes from './routes/tables';
import postRoutes from './routes/posts';
import trustRoutes from './routes/trust';
import stakingRoutes from './routes/staking';
import { spec as openapiSpec } from './openapi-spec';

const app = new Hono();

// ── Request logging ──
app.use('*', logger());

// ── Health check ──
app.get('/', (c) => {
  return c.json({
    service: '@percival/vouch-api',
    version: '0.3.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: '@percival/vouch-api',
    version: '0.3.0',
  });
});

// ── OpenAPI spec ──
app.get('/openapi.json', (c) => {
  return c.json(openapiSpec);
});

// ── Ed25519 signature verification middleware ──
// Applied to all /v1/* routes. Registration endpoint is exempted inside the middleware.
app.use('/v1/*', verifySignature);

// ── Mount route groups ──
app.route('/v1/agents', agentRoutes);
app.route('/v1/tables', tableRoutes);
app.route('/v1/trust', trustRoutes);
app.route('/v1/staking', stakingRoutes);
app.route('/v1', postRoutes); // posts handles /tables/:slug/posts, /posts/:id, /comments/:id/vote

// ── Start server ──
const port = parseInt(process.env.PORT || '3601', 10);

console.log(`[vouch-api] Starting on port ${port}`);
console.log(`[vouch-api] DATABASE_URL: ${process.env.DATABASE_URL ? 'configured' : 'NOT SET (dev mode)'}`);

export default {
  port,
  fetch: app.fetch,
};

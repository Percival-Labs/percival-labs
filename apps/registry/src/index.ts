// Percival Labs - Registry API Server
// Security-verified registry for Skills.md + MCP servers

import { Hono } from 'hono';
import { initDatabase } from '@percival/db';
import { setupMiddleware } from './middleware/headers';
import { skillRoutes } from './routes/skills';
import { publisherRoutes } from './routes/publishers';
import { healthRoutes } from './routes/health';

// ── Configuration ──

const PORT = Number(process.env.PORT) || 3100;
const DB_PATH = process.env.DB_PATH || './data/percival.db';

// ── Initialize ──

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║       PERCIVAL LABS REGISTRY v0.1.0          ║');
console.log('║   Security-Verified Skill & MCP Registry     ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

const db = initDatabase(DB_PATH);
console.log(`[Init] Database: ${DB_PATH}`);

// ── Build App ──

const app = new Hono();

// Middleware
setupMiddleware(app);

// Mount routes
app.route('/health', healthRoutes(db));
app.route('/v1/skills', skillRoutes(db));
app.route('/v1/publishers', publisherRoutes(db));

// Root — registry info
app.get('/', (c) => {
  return c.json({
    name: 'Percival Labs Registry',
    description: 'Security-verified registry for Skills.md and MCP servers',
    version: '0.1.0',
    api_version: 'v1',
    endpoints: {
      health: '/health',
      stats: '/health/stats',
      categories: '/health/categories',
      skills: '/v1/skills',
      publishers: '/v1/publishers',
    },
    principles: [
      'Closed by default — verified to publish',
      'Deterministic execution — declared capabilities only',
      'Auditable everything — full provenance chain',
      'Minimal trust assumptions — sandboxed by default',
      'Cryptographic verification — signed and hashed',
      'Transparent trust — public algorithm, verifiable signals',
    ],
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`[Error] ${err.message}`);
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
});

// ── Start ──

console.log(`[Init] Starting server on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`[Init] Percival Labs Registry running at http://localhost:${PORT}`);
console.log(`[Init] API: http://localhost:${PORT}/v1/skills`);
console.log('');

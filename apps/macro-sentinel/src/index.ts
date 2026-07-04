import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { config } from './lib/config';
import { webhookRoutes } from './routes/webhook';
import { dashboardRoutes } from './routes/dashboard';
import { getDb } from './lib/db';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/', (c) => c.json({
  name: 'macro-sentinel',
  version: '0.1.0',
  mode: config.mode,
  status: 'operational',
  uptime: process.uptime(),
}));

// Routes
app.route('/webhook', webhookRoutes);
app.route('/dashboard', dashboardRoutes);

// Initialize DB on startup
getDb();

console.log(`
┌─────────────────────────────────────┐
│  MACRO SENTINEL v0.1.0              │
│  Mode: ${config.mode.padEnd(28)}│
│  Port: ${String(config.port).padEnd(28)}│
│  Watchlist: ${String(config.watchlist.macro.length + config.watchlist.volatility.length).padEnd(23)}│
│  DB: ${config.db.path.padEnd(30)}│
└─────────────────────────────────────┘
`);

export default {
  port: config.port,
  fetch: app.fetch,
};

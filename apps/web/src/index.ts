// Percival Labs - Landing Page Server
// Serves the marketing site for the security-verified AI skills registry

import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

// ── Configuration ──

const PORT = Number(process.env.PORT) || 3400;

// ── Build App ──

const app = new Hono();

// Static files
app.use('/public/*', serveStatic({ root: './' }));

// Landing page
app.get('/', async (c) => {
  const html = await Bun.file('./templates/index.html').text();
  return c.html(html);
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: '@percival/web', version: '0.1.0' });
});

// 404
app.notFound((c) => {
  return c.html('<h1>404 - Not Found</h1>', 404);
});

// ── Start ──

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║       PERCIVAL LABS WEB v0.1.0               ║');
console.log('║   Landing Page & Marketing Site              ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');
console.log(`[Init] Server running at http://localhost:${PORT}`);
console.log('');

export default {
  port: PORT,
  fetch: app.fetch,
};

import { resolve, join } from 'path';
import { readdirSync, existsSync } from 'fs';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { EventProxy } from './event-proxy';

const app = new Hono();

app.use('*', cors());
const PORT = Number(process.env.PORT ?? 3700);
const APP_ROOT = resolve(import.meta.dirname, '..', '..');
const TERRARIUM_ROOT = resolve(APP_ROOT, '..', 'terrarium');
const DIST_CLIENT = resolve(APP_ROOT, 'dist', 'client');
const AGENTS_URL = process.env.AGENTS_URL ?? 'http://localhost:3200';
const AGENTS_API_KEY = process.env.AGENTS_API_KEY;

// Initialize SSE proxy to agents service
const eventProxy = new EventProxy(AGENTS_URL, AGENTS_API_KEY);

// Serve village static assets
app.use('/public/*', serveStatic({ root: APP_ROOT }));

// Serve terrarium assets (shared sprites, audio) without duplicating files
app.use('/terrarium/public/*', serveStatic({ root: TERRARIUM_ROOT }));

// SSE endpoint for browser clients — proxies events from agents service
app.get('/events', (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed
        }
      }

      // Send connection status
      send(
        `data: ${JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
          upstream: eventProxy.isConnected,
        })}\n\n`
      );

      // Backfill recent buffered events
      const recent = eventProxy.getRecentEvents(50);
      for (const event of recent) {
        send(`data: ${JSON.stringify(event)}\n\n`);
      }

      // Stream new events
      const unsubscribe = eventProxy.subscribe((event) => {
        send(`data: ${JSON.stringify(event)}\n\n`);
      });

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        send(`: heartbeat\n\n`);
      }, 30_000);

      const cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };

      c.req.raw.signal?.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});

// Connection status
app.get('/status', (c) =>
  c.json({
    service: 'village',
    upstreamConnected: eventProxy.isConnected,
    bufferedEvents: eventProxy.getRecentEvents().length,
  })
);

// Audio playlist — serve from terrarium's audio directory
app.get('/playlist', (c) => {
  try {
    const audioDir = resolve(TERRARIUM_ROOT, 'public', 'audio');
    const files = readdirSync(audioDir)
      .filter((f) => f.endsWith('.mp3'))
      .sort(() => Math.random() - 0.5)
      .map((f) => ({
        name: f.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\.mp3$/, ''),
        url: `/public/audio/${f}`,
      }));
    return c.json(files);
  } catch {
    return c.json([]);
  }
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'village' }));

// Production: serve built client from dist/client/
if (existsSync(DIST_CLIENT)) {
  app.use('/*', serveStatic({ root: DIST_CLIENT }));
  app.get('/', serveStatic({ path: join(DIST_CLIENT, 'index.html') }));
}

console.log(`Village running at http://localhost:${PORT}`);
console.log(`  Agents SSE upstream: ${AGENTS_URL}`);
export default {
  port: PORT,
  fetch: app.fetch,
  idleTimeout: 120,
};

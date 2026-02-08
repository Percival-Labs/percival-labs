// Percival Labs - Response Headers Middleware

import { Hono } from 'hono';
import { cors } from 'hono/cors';

export function setupMiddleware(app: Hono) {
  // CORS — allow agent and browser access
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'X-Agent-Id', 'X-Publisher-Id', 'Authorization'],
    exposeHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
  }));

  // Standard response headers
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.header('X-Request-Id', requestId);
    c.header('X-Powered-By', 'Percival Labs');
    c.header('X-API-Version', '1');

    const start = performance.now();
    await next();
    const duration = Math.round(performance.now() - start);
    c.header('X-Response-Time', `${duration}ms`);
  });
}

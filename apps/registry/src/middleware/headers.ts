// Percival Labs - Response Headers Middleware

import { Hono } from 'hono';
import { cors } from 'hono/cors';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3400,http://localhost:3500,http://localhost:3600').split(',');

export function setupMiddleware(app: Hono) {
  // CORS — restricted to known origins
  app.use('*', cors({
    origin: ALLOWED_ORIGINS,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'X-Agent-Id', 'Authorization'],
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

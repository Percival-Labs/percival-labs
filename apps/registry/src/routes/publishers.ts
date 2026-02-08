// Percival Labs - Publisher Routes

import { Hono } from 'hono';
import type { Database } from 'bun:sqlite';
import { getPublisher, getPublisherByGithub, createPublisher } from '@percival/db';

export function publisherRoutes(db: Database): Hono {
  const app = new Hono();

  // GET /v1/publishers/:id — Publisher profile
  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const publisher = getPublisher(db, id);

    if (!publisher) {
      return c.json({ error: 'Publisher not found', code: 'PUBLISHER_NOT_FOUND' }, 404);
    }

    const skills = db.query(
      "SELECT id, name, slug, category, description, created_at FROM skills WHERE publisher_id = ? AND visibility = 'published' ORDER BY updated_at DESC"
    ).all(id);

    return c.json({ publisher, skills });
  });

  // POST /v1/publishers — Register (called after GitHub OAuth)
  app.post('/', async (c) => {
    const body = await c.req.json<{
      github_id: string;
      display_name: string;
      email: string;
    }>();

    if (!body.github_id || !body.display_name || !body.email) {
      return c.json({ error: 'Missing required fields', code: 'INVALID_INPUT' }, 400);
    }

    const existing = getPublisherByGithub(db, body.github_id);
    if (existing) {
      return c.json({ publisher: existing }, 200);
    }

    const publisher = createPublisher(db, {
      github_id: body.github_id,
      display_name: body.display_name,
      email: body.email,
    });

    return c.json({ publisher }, 201);
  });

  return app;
}

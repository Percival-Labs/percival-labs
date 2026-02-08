// Percival Labs - Health & Stats Routes

import { Hono } from 'hono';
import type { Database } from 'bun:sqlite';

export function healthRoutes(db: Database): Hono {
  const app = new Hono();

  // GET /health — Basic health check
  app.get('/', (c) => {
    try {
      db.query('SELECT 1').get();
      return c.json({
        status: 'healthy',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return c.json({
        status: 'unhealthy',
        error: 'Database unavailable',
        timestamp: new Date().toISOString(),
      }, 503);
    }
  });

  // GET /stats — Directory statistics
  app.get('/stats', (c) => {
    const stats = {
      publishers: (db.query('SELECT COUNT(*) as count FROM publishers').get() as any).count,
      skills: (db.query("SELECT COUNT(*) as count FROM skills WHERE visibility = 'published'").get() as any).count,
      skills_pending: (db.query("SELECT COUNT(*) as count FROM skills WHERE visibility = 'pending'").get() as any).count,
      versions: (db.query('SELECT COUNT(*) as count FROM versions').get() as any).count,
      installations: (db.query('SELECT COUNT(*) as count FROM installations').get() as any).count,
      ratings: (db.query('SELECT COUNT(*) as count FROM ratings').get() as any).count,
      reports_open: (db.query("SELECT COUNT(*) as count FROM reports WHERE status IN ('open', 'investigating')").get() as any).count,
      mcp_servers: (db.query("SELECT COUNT(*) as count FROM mcp_servers WHERE visibility = 'published'").get() as any).count,
    };

    return c.json({ stats, timestamp: new Date().toISOString() });
  });

  // GET /categories — List available categories with counts
  app.get('/categories', (c) => {
    const categories = db.query(
      "SELECT category, COUNT(*) as count FROM skills WHERE visibility = 'published' GROUP BY category ORDER BY count DESC"
    ).all();

    return c.json({ categories });
  });

  return app;
}

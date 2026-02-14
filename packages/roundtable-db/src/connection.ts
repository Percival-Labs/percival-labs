import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[roundtable-db] DATABASE_URL not set — database operations will fail');
}

const pool = new Pool({
  connectionString: connectionString || 'postgresql://percival:percival-local-dev@localhost:5432/roundtable',
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });

export { pool };

// Programmatic migration runner — the deploy-time half of the drizzle workflow.
//
// History: production drifted 17 tables behind the schema because nothing in the deploy path
// ever applied migrations (discovered + repaired 2026-07-03: schema synced via drizzle-kit push,
// then drizzle.__drizzle_migrations baselined with all 27 journal entries). This runner is what
// prevents a recurrence: vouch-api calls it at boot, so every deploy converges the database to
// the committed migration history before serving traffic. Idempotent — an up-to-date database
// is a fast no-op (one bookkeeping-table read).
//
// Fail-closed by design: if a migration fails, this throws and the service does NOT start.
// A crashed deploy is visible; a silently half-migrated database is not.

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db } from './connection';

// The committed migration history lives next to this package's source (drizzle/), so the path
// resolves the same from the workspace symlink Bun uses at runtime.
const MIGRATIONS_FOLDER = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

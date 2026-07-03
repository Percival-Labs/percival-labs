# @percival/vouch-db

Drizzle ORM schema, migrations, and connection helpers (PostgreSQL) for Vouch.
Consumed by `vouch-api` and `acp-indexer`.

## Migrations

- Schema lives in `src/schema/`, one file per domain, barrel-exported from `src/schema/index.ts`.
- Migrations are generated with `bun run generate` (`drizzle-kit generate`) and are
  **append-only** — never hand-edit or delete a committed `drizzle/*.sql` file.
- `bun run migrate` applies pending migrations to `$DATABASE_URL`.
- `bun run studio` opens `drizzle-kit studio` for visual inspection.

### Snapshot chain

`drizzle/meta/_journal.json` plus `drizzle/meta/*_snapshot.json` are drizzle-kit's own
bookkeeping: they record what schema state each migration file was diffed against, so the
*next* `generate` only has to diff current `src/schema/*.ts` against the **most recent**
snapshot file (drizzle-kit picks it by sorting `drizzle/meta/*.json` filenames, not by
reading migration SQL). If a migration is hand-authored without running `generate` — or a
snapshot file goes missing — that pointer goes stale and `generate` starts diffing against
an old, wrong baseline, which surfaces as interactive "is X renamed from Y?" prompts for
tables that already exist. See `docs/db-snapshot-chain-repair.md` for a walkthrough of a
real repair against this package's history.

### Drift check (`db:check`)

```bash
bun run db:check
```

Runs a real `drizzle-kit generate` against a throwaway copy of `drizzle/meta` +
`drizzle/*.sql` in a temp directory (this drizzle-kit version — 0.30.x — has no
`generate --check` flag) and fails if that would produce a *new* migration file, i.e. if
`src/schema/*.ts` has changed without a corresponding committed migration. It never touches
the real `drizzle/` folder and never opens a database connection (`generate` is a pure
schema-diff operation).

**Wiring into CI:** add a step that runs `cd packages/vouch-db && bun run db:check` on every
PR touching `packages/vouch-db/**`; a non-zero exit means someone changed `src/schema/`
without running `bun run generate` and committing the resulting migration + snapshot. This
is not wired into CI yet — it's a local/pre-commit safety net until it's added to the
workflow that runs `bun test --recursive`.

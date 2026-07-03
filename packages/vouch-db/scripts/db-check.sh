#!/usr/bin/env bash
# db-check: fails if src/schema/*.ts has drifted from the committed drizzle/
# migration history. This is the drizzle-kit 0.30.x equivalent of
# `generate --check` (that flag doesn't exist in this version) -- it runs a
# real `generate` against a throwaway copy of drizzle/meta + drizzle/*.sql
# and checks whether a NEW migration file would be produced. Nothing in the
# real drizzle/ folder is touched and no database connection is required or
# used (drizzle-kit generate never connects to a DB).
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PKG_DIR"

TMP_DIR="$(mktemp -d "${PKG_DIR}/.db-check-tmp.XXXXXX")"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

mkdir -p "$TMP_DIR/out"
cp -R drizzle/meta "$TMP_DIR/out/meta"
cp drizzle/*.sql "$TMP_DIR/out/" 2>/dev/null || true

cat > "$TMP_DIR/drizzle.config.ts" <<EOF
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../src/schema/index.ts',
  out: './out',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgres://db-check:db-check@localhost:5432/db-check',
  },
});
EOF

BEFORE_COUNT=$(ls "$TMP_DIR/out"/*.sql 2>/dev/null | wc -l | tr -d ' ')

pushd "$TMP_DIR" > /dev/null
GEN_OUTPUT="$(DATABASE_URL='postgres://db-check:db-check@localhost:5432/db-check' bunx drizzle-kit generate < /dev/null 2>&1)"
GEN_EXIT=$?
popd > /dev/null

AFTER_COUNT=$(ls "$TMP_DIR/out"/*.sql 2>/dev/null | wc -l | tr -d ' ')

if [ "$GEN_EXIT" -ne 0 ]; then
  echo "db:check FAILED: drizzle-kit generate exited non-zero." >&2
  echo "$GEN_OUTPUT" >&2
  exit 1
fi

if [ "$AFTER_COUNT" -gt "$BEFORE_COUNT" ]; then
  echo "db:check FAILED: src/schema/*.ts has drifted from drizzle/ migrations." >&2
  echo "Run 'bun run generate' in packages/vouch-db, review the new migration, and commit it." >&2
  echo "" >&2
  echo "--- drizzle-kit generate output ---" >&2
  echo "$GEN_OUTPUT" >&2
  exit 1
fi

echo "db:check OK: schema.ts matches the committed migration history (no drift)."

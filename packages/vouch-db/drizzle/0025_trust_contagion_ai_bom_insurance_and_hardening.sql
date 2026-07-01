-- Migration 0025: Schema drift catch-up + review hardening (Fable review, 2026-07-01)
--
-- NOTE ON PROVENANCE: `drizzle-kit generate` could not run non-interactively —
-- packages/vouch-db/drizzle/meta/_journal.json only has 3 entries (0000, 0001,
-- 0020) and only 2 snapshot files (0000_snapshot.json, 0001_snapshot.json)
-- exist, while migrations 0002-0024 were evidently hand-authored directly as
-- SQL without ever running `drizzle-kit generate` to advance the snapshot
-- chain. Running `generate` against that stale baseline produces bogus
-- rename-detection prompts for tables that already exist. This migration is
-- hand-authored in the same style as 0002-0024, following the exact DDL
-- drizzle-kit itself would emit for these schema changes. See the "Follow-up"
-- note at the bottom of this file for repairing the snapshot chain.
--
-- NOT APPLIED. Review and run via `bun run migrate` only after sign-off.
--
-- Part 1: catches up 3 schema files that had zero prior migrations
--   (Fable finding #5 — "schema drift"): trust-contagion.ts, ai-bom.ts,
--   insurance.ts (10 tables total across the three).
-- Part 2: adds the encrypted-column mechanism for C3 (nullable, additive —
--   see packages/vouch-db/docs/RUNBOOK-C3-NSEC-ENCRYPTION.md before writing
--   to these columns).
-- Part 3: adds the `signature`/`reporter_pubkey` columns to
--   `behavioral_traces` that the MCP-T track needs for verify-on-read
--   (cross-track ask, nullable/additive).
-- Part 4: hot-path indexes, uniqueness constraints, and a CHECK constraint
--   from Fable findings #13/#14.

-- ── Part 1a: trust-contagion.ts ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "trust_graph_edges" (
  "id" text PRIMARY KEY NOT NULL,
  "from_id" text NOT NULL,
  "from_type" "author_type" NOT NULL,
  "to_agent_id" text NOT NULL,
  "pool_id" text NOT NULL REFERENCES "vouch_pools"("id"),
  "stake_id" text NOT NULL REFERENCES "stakes"("id"),
  "amount_sats" bigint NOT NULL,
  "exposure_bps" integer NOT NULL,
  "staker_score" integer NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tge_from" ON "trust_graph_edges" ("from_id");
CREATE INDEX IF NOT EXISTS "idx_tge_to" ON "trust_graph_edges" ("to_agent_id");
CREATE INDEX IF NOT EXISTS "idx_tge_pool" ON "trust_graph_edges" ("pool_id");

CREATE TABLE IF NOT EXISTS "contagion_events" (
  "id" text PRIMARY KEY NOT NULL,
  "slash_event_id" text NOT NULL REFERENCES "slash_events"("id"),
  "failed_agent_id" text NOT NULL,
  "affected_entity_id" text NOT NULL,
  "affected_entity_type" "author_type" NOT NULL,
  "depth" integer NOT NULL,
  "economic_loss_sats" bigint NOT NULL,
  "score_delta" integer NOT NULL,
  "cause" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_ce_slash" ON "contagion_events" ("slash_event_id");
CREATE INDEX IF NOT EXISTS "idx_ce_affected" ON "contagion_events" ("affected_entity_id");

CREATE TABLE IF NOT EXISTS "regime_alerts" (
  "id" text PRIMARY KEY NOT NULL,
  "agent_id" text NOT NULL REFERENCES "agents"("id"),
  "detection_layer" text NOT NULL,
  "severity" real NOT NULL,
  "evidence" jsonb NOT NULL,
  "recommendation" text NOT NULL,
  "resolved" boolean DEFAULT false NOT NULL,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_ra_agent" ON "regime_alerts" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_ra_unresolved" ON "regime_alerts" ("resolved");

-- ── Part 1b: ai-bom.ts ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "bom_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "agent_pubkey" text NOT NULL,
  "session_id" text NOT NULL,
  "bom_event" jsonb NOT NULL,
  "risk_level" text NOT NULL,
  "model_count" integer NOT NULL,
  "tool_count" integer NOT NULL,
  "unverified_tool_count" integer NOT NULL,
  "restricted_data_count" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_bom_agent" ON "bom_snapshots" ("agent_pubkey");
CREATE INDEX IF NOT EXISTS "idx_bom_session" ON "bom_snapshots" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_bom_risk" ON "bom_snapshots" ("risk_level");
CREATE INDEX IF NOT EXISTS "idx_bom_created" ON "bom_snapshots" ("created_at");

-- ── Part 1c: insurance.ts ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "risk_tier" AS ENUM ('preferred', 'standard', 'substandard', 'provisional', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "policy_status" AS ENUM ('quoted', 'active', 'expired', 'claimed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "claim_status" AS ENUM ('filed', 'verifying', 'approved', 'denied', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "insurance_policies" (
  "id" text PRIMARY KEY NOT NULL,
  "agent_id" text NOT NULL REFERENCES "agents"("id"),
  "policyholder_id" text NOT NULL,
  "policyholder_type" "author_type" NOT NULL,
  "coverage_sats" bigint NOT NULL,
  "premium_sats" bigint NOT NULL,
  "net_exposure_sats" bigint NOT NULL,
  "risk_tier" "risk_tier" NOT NULL,
  "reliability_score" integer NOT NULL,
  "annual_failure_prob_bps" integer NOT NULL,
  "premium_rate_bps" integer NOT NULL,
  "covered_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "quote_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "policy_status" DEFAULT 'quoted' NOT NULL,
  "term_start" timestamp NOT NULL,
  "term_end" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_insurance_policies_agent" ON "insurance_policies" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_policies_holder" ON "insurance_policies" ("policyholder_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_policies_status" ON "insurance_policies" ("status");

CREATE TABLE IF NOT EXISTS "insurance_claims" (
  "id" text PRIMARY KEY NOT NULL,
  "policy_id" text NOT NULL REFERENCES "insurance_policies"("id"),
  "agent_id" text NOT NULL,
  "claimant_id" text NOT NULL,
  "claimant_type" "author_type" NOT NULL,
  "claim_type" text NOT NULL,
  "description" text,
  "claimed_amount_sats" bigint NOT NULL,
  "evidence_event_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "provenance_verified" boolean DEFAULT false NOT NULL,
  "status" "claim_status" DEFAULT 'filed' NOT NULL,
  "adjudication_notes" text,
  "payout_sats" bigint DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_insurance_claims_policy" ON "insurance_claims" ("policy_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_claims_agent" ON "insurance_claims" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_claims_status" ON "insurance_claims" ("status");

-- ── Part 2: C3 — encrypted-column mechanism (additive, nullable; DO NOT
--    write to these columns until docs/RUNBOOK-C3-NSEC-ENCRYPTION.md sign-off) ──

ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "vouch_nsec_encrypted" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "agent_key_token_encrypted" text;
ALTER TABLE "acp_checkout_sessions" ADD COLUMN IF NOT EXISTS "provisioned_agent_key_encrypted" text;

-- ── Part 3: behavioral_traces verify-on-read columns (cross-track: MCP-T) ──

ALTER TABLE "behavioral_traces" ADD COLUMN IF NOT EXISTS "signature" text;
ALTER TABLE "behavioral_traces" ADD COLUMN IF NOT EXISTS "reporter_pubkey" text;

-- ── Part 4: uniqueness, hot-path indexes, CHECK constraint (#13/#14) ──────

CREATE UNIQUE INDEX IF NOT EXISTS "idx_memberships_unique_member" ON "memberships" ("table_id", "member_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_votes_unique_voter" ON "votes" ("target_id", "target_type", "voter_id");
CREATE INDEX IF NOT EXISTS "idx_posts_table" ON "posts" ("table_id");
CREATE INDEX IF NOT EXISTS "idx_comments_post" ON "comments" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_stakes_staker" ON "stakes" ("staker_id");
CREATE INDEX IF NOT EXISTS "idx_vouch_score_history_subject_created" ON "vouch_score_history" ("subject_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_trust_events_subject" ON "trust_events" ("subject_id");

DO $$ BEGIN
  ALTER TABLE "outcomes" ADD CONSTRAINT "check_rating_range" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ── Follow-up (not part of this migration) ────────────────────────────────
-- 1. Repair packages/vouch-db/drizzle/meta/_journal.json + snapshots so
--    `drizzle-kit generate` can run non-interactively again — it needs a
--    snapshot representing the schema as of 0024 to diff against cleanly.
-- 2. Add a CI check that fails the build if `src/schema/*.ts` has no
--    corresponding entry reachable from the latest migration (prevents this
--    drift from recurring).
-- 3. Apply the plaintext-column drop (C3, step 5 in the runbook) as its own
--    migration once the encryption cutover is stable in production.

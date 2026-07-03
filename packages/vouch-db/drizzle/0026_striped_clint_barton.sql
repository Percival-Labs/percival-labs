CREATE TYPE "public"."outcome_credit" AS ENUM('pending', 'partial', 'full');--> statement-breakpoint
CREATE TYPE "public"."outcome_role" AS ENUM('performer', 'purchaser');--> statement-breakpoint
CREATE TYPE "public"."royalty_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
CREATE TYPE "public"."account_plan" AS ENUM('starter', 'personal', 'pro', 'team');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_pubkey" text NOT NULL,
	"counterparty_pubkey" text NOT NULL,
	"role" "outcome_role" NOT NULL,
	"task_type" text NOT NULL,
	"task_ref" text NOT NULL,
	"success" boolean NOT NULL,
	"rating" integer,
	"evidence" text,
	"credit_awarded" "outcome_credit" DEFAULT 'pending' NOT NULL,
	"matched_outcome_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "check_rating_range" CHECK ("outcomes"."rating" IS NULL OR "outcomes"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "royalty_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"creator_pubkey" text NOT NULL,
	"contract_id" text NOT NULL,
	"milestone_id" text NOT NULL,
	"purchase_id" text NOT NULL,
	"gross_revenue_sats" integer NOT NULL,
	"royalty_rate_bps" integer NOT NULL,
	"royalty_sats" integer NOT NULL,
	"payment_hash" text,
	"status" "royalty_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "check_royalty_sats_positive" CHECK ("royalty_payments"."royalty_sats" > 0),
	CONSTRAINT "check_royalty_rate_bps_bounds" CHECK ("royalty_payments"."royalty_rate_bps" BETWEEN 0 AND 5000)
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"stripe_customer_id" text,
	"agent_key_token" text,
	"agent_key_token_encrypted" text,
	"agent_key_claimed" boolean DEFAULT false NOT NULL,
	"vouch_pubkey" text,
	"vouch_nsec" text,
	"vouch_nsec_encrypted" text,
	"status" "account_status" DEFAULT 'pending' NOT NULL,
	"plan" "account_plan",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "accounts_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
ALTER TABLE "royalty_payments" ADD CONSTRAINT "royalty_payments_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "royalty_payments" ADD CONSTRAINT "royalty_payments_purchase_id_skill_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."skill_purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_outcomes_agent" ON "outcomes" USING btree ("agent_pubkey");--> statement-breakpoint
CREATE INDEX "idx_outcomes_counterparty" ON "outcomes" USING btree ("counterparty_pubkey");--> statement-breakpoint
CREATE INDEX "idx_outcomes_task_ref" ON "outcomes" USING btree ("task_ref");--> statement-breakpoint
CREATE INDEX "idx_outcomes_agent_task_ref" ON "outcomes" USING btree ("agent_pubkey","task_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_outcomes_agent_task_role" ON "outcomes" USING btree ("agent_pubkey","task_ref","role");--> statement-breakpoint
CREATE INDEX "idx_royalty_skill" ON "royalty_payments" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_royalty_creator" ON "royalty_payments" USING btree ("creator_pubkey");--> statement-breakpoint
CREATE INDEX "idx_royalty_contract" ON "royalty_payments" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_email" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_accounts_stripe_customer" ON "accounts" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_status" ON "accounts" USING btree ("status");
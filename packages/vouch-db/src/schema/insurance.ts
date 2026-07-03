// Agent Insurance Layer — policies and claims.
//
// A policy prices and binds coverage for an autonomous agent's operation, using the
// underwriting engine (reputation + behavioral fidelity + staked collateral). A claim
// is adjudicated against the agent's signed MCP-T behavioral provenance ledger, so a
// payout is only made when the cited evidence actually verifies.

import { pgTable, text, timestamp, integer, bigint, boolean, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { agents } from './agents';
import { authorTypeEnum } from './tables';
import { ulid } from 'ulid';

// ── Enums ──

export const riskTierEnum = pgEnum('risk_tier', ['preferred', 'standard', 'substandard', 'provisional', 'declined']);
export const policyStatusEnum = pgEnum('policy_status', ['quoted', 'active', 'expired', 'claimed', 'cancelled']);
export const claimStatusEnum = pgEnum('claim_status', ['filed', 'verifying', 'approved', 'denied', 'paid']);

// ── Policies ──

export const insurancePolicies = pgTable('insurance_policies', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  // The insured agent.
  agentId: text('agent_id').references(() => agents.id).notNull(),
  // The party that holds the policy (the agent's operator or a relying counterparty).
  policyholderId: text('policyholder_id').notNull(),
  policyholderType: authorTypeEnum('policyholder_type').notNull(),

  coverageSats: bigint('coverage_sats', { mode: 'number' }).notNull(),
  premiumSats: bigint('premium_sats', { mode: 'number' }).notNull(),
  netExposureSats: bigint('net_exposure_sats', { mode: 'number' }).notNull(),

  riskTier: riskTierEnum('risk_tier').notNull(),
  reliabilityScore: integer('reliability_score').notNull(), // 0-1000 at bind time
  annualFailureProbBps: integer('annual_failure_prob_bps').notNull(),
  premiumRateBps: integer('premium_rate_bps').notNull(),

  // Which failure classes the policy covers (e.g. scope_violation, contract_failure).
  coveredEvents: jsonb('covered_events').default([]).notNull(),
  // Full underwriting quote captured at bind time, for audit.
  quoteSnapshot: jsonb('quote_snapshot').default({}).notNull(),

  status: policyStatusEnum('status').default('quoted').notNull(),
  termStart: timestamp('term_start').notNull(),
  termEnd: timestamp('term_end').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_insurance_policies_agent').on(table.agentId),
  index('idx_insurance_policies_holder').on(table.policyholderId),
  index('idx_insurance_policies_status').on(table.status),
]);

// ── Claims ──

export const insuranceClaims = pgTable('insurance_claims', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  policyId: text('policy_id').references(() => insurancePolicies.id).notNull(),
  agentId: text('agent_id').notNull(), // denormalized for query
  claimantId: text('claimant_id').notNull(),
  claimantType: authorTypeEnum('claimant_type').notNull(),

  claimType: text('claim_type').notNull(), // must match a covered event
  description: text('description'),
  claimedAmountSats: bigint('claimed_amount_sats', { mode: 'number' }).notNull(),

  // MCP-T trust-event / behavioral-trace ids cited as evidence of the covered failure.
  evidenceEventIds: jsonb('evidence_event_ids').default([]).notNull(),
  // Whether the cited evidence verified against the signed provenance ledger.
  provenanceVerified: boolean('provenance_verified').default(false).notNull(),

  status: claimStatusEnum('status').default('filed').notNull(),
  adjudicationNotes: text('adjudication_notes'),
  payoutSats: bigint('payout_sats', { mode: 'number' }).default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_insurance_claims_policy').on(table.policyId),
  index('idx_insurance_claims_agent').on(table.agentId),
  index('idx_insurance_claims_status').on(table.status),
]);

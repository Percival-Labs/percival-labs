// Trust Contagion — Economic trust propagation through the staking graph.
// When an agent gets slashed, contagion propagates to stakers proportionally
// to their economic exposure (NOT a fixed factor like Microsoft AGT's 0.3).
// Also stores regime detection alerts from the 3-layer detection system.

import { pgTable, text, timestamp, integer, bigint, real, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';
import { authorTypeEnum } from './tables';
import { vouchPools, stakes, slashEvents } from './staking';
import { agents } from './agents';

// ── Trust Graph Edges ──
// Materialized from stakes table; refreshed on stake/unstake/slash.
// Represents the directed graph of staking relationships for BFS traversal.

export const trustGraphEdges = pgTable('trust_graph_edges', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  fromId: text('from_id').notNull(),
  fromType: authorTypeEnum('from_type').notNull(),
  toAgentId: text('to_agent_id').notNull(),
  poolId: text('pool_id').references(() => vouchPools.id).notNull(),
  stakeId: text('stake_id').references(() => stakes.id).notNull(),
  amountSats: bigint('amount_sats', { mode: 'number' }).notNull(),
  /** This edge's proportion of staker's total outbound stakes (basis points) */
  exposureBps: integer('exposure_bps').notNull(),
  /** Staker's trust score when edge was last computed */
  stakerScore: integer('staker_score').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_tge_from').on(table.fromId),
  index('idx_tge_to').on(table.toAgentId),
  index('idx_tge_pool').on(table.poolId),
]);

// ── Contagion Events ──
// Log of trust contagion propagation after slashes.
// Each row = one entity affected by contagion from a slash event.

export const contagionEvents = pgTable('contagion_events', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  slashEventId: text('slash_event_id').references(() => slashEvents.id).notNull(),
  failedAgentId: text('failed_agent_id').notNull(),
  affectedEntityId: text('affected_entity_id').notNull(),
  affectedEntityType: authorTypeEnum('affected_entity_type').notNull(),
  depth: integer('depth').notNull(),
  economicLossSats: bigint('economic_loss_sats', { mode: 'number' }).notNull(),
  scoreDelta: integer('score_delta').notNull(),
  /** 'direct_slash' | 'backing_loss' | 'score_contagion' */
  cause: text('cause').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_ce_slash').on(table.slashEventId),
  index('idx_ce_affected').on(table.affectedEntityId),
]);

// ── Regime Alerts ──
// Regime detection alerts with evidence from the 3-layer detection system:
// Layer 1: KL divergence on action type distributions
// Layer 2: N-gram sequence divergence
// Layer 3: Fidelity ratio drift

export const regimeAlerts = pgTable('regime_alerts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  agentId: text('agent_id').references(() => agents.id).notNull(),
  /** 'kl_divergence' | 'ngram_sequence' | 'fidelity_drift' | 'composite' */
  detectionLayer: text('detection_layer').notNull(),
  severity: real('severity').notNull(),
  evidence: jsonb('evidence').notNull().$type<Record<string, unknown>>(),
  /** 'monitor' | 'warn_stakers' | 'freeze_pool' | 'slash' */
  recommendation: text('recommendation').notNull(),
  resolved: boolean('resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_ra_agent').on(table.agentId),
  index('idx_ra_unresolved').on(table.resolved),
]);

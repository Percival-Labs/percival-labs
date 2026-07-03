// AI-BOM Snapshots — Stores BOM events for agent sessions
// Feature flag: AI_BOM_ENABLED = "false"

import { pgTable, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

// Re-declare minimal event shape to avoid cross-package import
interface AIBomEventRecord {
  schema_version: '0.2.0';
  event_id: string;
  timestamp: string;
  source_system: 'mcp-t';
  event_type: 'ai.bom.snapshot';
  bom: Record<string, unknown>;
}

export const bomSnapshots = pgTable('bom_snapshots', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  agentPubkey: text('agent_pubkey').notNull(),
  sessionId: text('session_id').notNull(),
  /** The full BOM event as JSONB */
  bomEvent: jsonb('bom_event').notNull().$type<AIBomEventRecord>(),
  /** Denormalized trust posture for fast queries */
  riskLevel: text('risk_level').notNull(), // 'low' | 'medium' | 'high' | 'critical'
  modelCount: integer('model_count').notNull(),
  toolCount: integer('tool_count').notNull(),
  unverifiedToolCount: integer('unverified_tool_count').notNull(),
  restrictedDataCount: integer('restricted_data_count').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bom_agent').on(table.agentPubkey),
  index('idx_bom_session').on(table.sessionId),
  index('idx_bom_risk').on(table.riskLevel),
  index('idx_bom_created').on(table.createdAt),
]);

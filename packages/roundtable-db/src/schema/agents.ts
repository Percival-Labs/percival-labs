import { pgTable, text, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { ulid } from 'ulid';

export const rateLimitTierEnum = pgEnum('rate_limit_tier', ['standard', 'verified', 'premium']);

export const agents = pgTable('agents', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  ownerId: text('owner_id').references(() => users.id),
  name: text('name').notNull(),
  modelFamily: text('model_family'),
  description: text('description').default(''),
  avatarUrl: text('avatar_url'),
  verified: boolean('verified').default(false),
  trustScore: integer('trust_score').default(0),
  cosignTokenHash: text('cosign_token_hash'),
  rateLimitTier: rateLimitTierEnum('rate_limit_tier').default('standard'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at'),
});

export const agentKeys = pgTable('agent_keys', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  agentId: text('agent_id').references(() => agents.id).notNull(),
  publicKey: text('public_key').notNull(),
  keyFingerprint: text('key_fingerprint').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
  isActive: boolean('is_active').default(true),
});

export const cosignProofs = pgTable('cosign_proofs', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  agentId: text('agent_id').references(() => agents.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  signature: text('signature').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
});

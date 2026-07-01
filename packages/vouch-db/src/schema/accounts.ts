// Vouch Accounts — Self-service account creation with Stripe billing.
// Tracks account lifecycle from Stripe Checkout through AgentKey provisioning.

import { pgTable, text, timestamp, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const accountStatusEnum = pgEnum('account_status', [
  'pending', 'active', 'suspended',
]);

export const accountPlanEnum = pgEnum('account_plan', [
  'starter', 'personal', 'pro', 'team',
]);

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  // C3 fix: `agentKeyToken` / `vouchNsec` below are legacy PLAINTEXT columns.
  // The `*Encrypted` columns are the AES-256-GCM (crypto/envelope.ts) targets
  // for the eventual cutover — see docs/RUNBOOK-C3-NSEC-ENCRYPTION.md. Both
  // plaintext and encrypted columns exist simultaneously so the migration can
  // be applied without a backfill/rotation window happening in the same step;
  // do NOT start writing to the encrypted columns until that runbook's
  // provisioning steps have human sign-off.
  agentKeyToken: text('agent_key_token'),  // TODO(C3): migrate to agentKeyTokenEncrypted, then drop
  agentKeyTokenEncrypted: text('agent_key_token_encrypted'),
  agentKeyClaimed: boolean('agent_key_claimed').default(false).notNull(),
  vouchPubkey: text('vouch_pubkey'),
  vouchNsec: text('vouch_nsec'),  // TODO(C3): migrate to vouchNsecEncrypted, then drop
  vouchNsecEncrypted: text('vouch_nsec_encrypted'),
  status: accountStatusEnum('status').default('pending').notNull(),
  plan: accountPlanEnum('plan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_accounts_email').on(table.email),
  index('idx_accounts_stripe_customer').on(table.stripeCustomerId),
  index('idx_accounts_status').on(table.status),
]);

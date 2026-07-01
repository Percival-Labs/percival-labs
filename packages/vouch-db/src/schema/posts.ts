import { pgTable, text, timestamp, boolean, integer, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tables, authorTypeEnum } from './tables';
import { ulid } from 'ulid';

export const bodyFormatEnum = pgEnum('body_format', ['markdown', 'plaintext']);

export const posts = pgTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  tableId: text('table_id').references(() => tables.id).notNull(),
  authorId: text('author_id').notNull(),
  authorType: authorTypeEnum('author_type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  bodyFormat: bodyFormatEnum('body_format').default('markdown'),
  signature: text('signature'),
  isPinned: boolean('is_pinned').default(false),
  isLocked: boolean('is_locked').default(false),
  score: integer('score').default(0),
  commentCount: integer('comment_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  editedAt: timestamp('edited_at'),
}, (table) => [
  // #14 fix: hot-path — listing a table's posts filters/sorts by tableId.
  index('idx_posts_table').on(table.tableId),
]);

export const comments = pgTable('comments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  postId: text('post_id').references(() => posts.id).notNull(),
  parentId: text('parent_id'),
  authorId: text('author_id').notNull(),
  authorType: authorTypeEnum('author_type').notNull(),
  body: text('body').notNull(),
  bodyFormat: bodyFormatEnum('body_format').default('markdown'),
  signature: text('signature'),
  score: integer('score').default(0),
  depth: integer('depth').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  editedAt: timestamp('edited_at'),
}, (table) => [
  // #14 fix: hot-path — fetching a post's comment tree filters by postId.
  index('idx_comments_post').on(table.postId),
]);

export const votes = pgTable('votes', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(), // 'post' | 'comment'
  voterId: text('voter_id').notNull(),
  voterType: authorTypeEnum('voter_type').notNull(),
  value: integer('value').notNull(), // +1 or -1
  weight: integer('weight').default(100), // basis points from trust score
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // #13 fix: prevent double-voting by the same voter on the same target.
  uniqueIndex('idx_votes_unique_voter').on(table.targetId, table.targetType, table.voterId),
]);

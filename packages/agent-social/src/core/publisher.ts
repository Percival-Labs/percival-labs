/**
 * Idempotent publisher — content-hash dedup prevents double posts.
 *
 * Previous behavior: "first 80 chars" comparison to detect duplicates.
 * Broke on whitespace changes, minor edits, and race conditions.
 *
 * New behavior: SHA-256 hash of normalized content. If hash exists in
 * state store, skip publish and return cached result.
 */

import type {
  PlatformAdapter,
  PublishOptions,
  PublishResult,
} from '../types.js';
import type { StateStore } from './state-store.js';
import { contentHash } from './content-hash.js';
import { now } from './timestamps.js';

export interface PublishConfig {
  adapter: PlatformAdapter;
  stateStore: StateStore;
  /** If true, skip the publish and just return what would happen */
  dryRun?: boolean;
}

/**
 * Publish with dedup check.
 * Returns { deduplicated: true } if the content was already published.
 */
export async function idempotentPublish(
  config: PublishConfig,
  opts: PublishOptions,
): Promise<PublishResult> {
  const { adapter, stateStore, dryRun } = config;
  const hash = await contentHash(opts.content);

  // Check if we already published this content
  if (stateStore.hasPublished(hash)) {
    return {
      id: '',
      contentHash: hash,
      publishedAt: now(),
      deduplicated: true,
    };
  }

  if (dryRun) {
    return {
      id: '[dry-run]',
      contentHash: hash,
      publishedAt: now(),
      deduplicated: false,
    };
  }

  // Publish via adapter
  const result = await adapter.publish(opts);

  // Record in state store
  stateStore.recordPublish(hash);
  stateStore.recordEngagement({
    timestamp: now(),
    platform: adapter.platform,
    action: opts.replyTo ? 'reply' : 'post',
    targetId: opts.replyTo,
    ourEventId: result.id,
    contentHash: hash,
    contentPreview: opts.content.slice(0, 100),
    channel: opts.channel,
  });
  stateStore.save();

  return result;
}

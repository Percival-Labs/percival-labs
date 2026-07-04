/**
 * MoltbookAdapter — PlatformAdapter implementation for Moltbook.
 *
 * Wraps MoltbookClient with the unified scan/publish/healthCheck interface.
 *
 * CRITICAL FIX: publish() handles the duplicate-comment bug. When a comment is
 * created (success: true, comment.id exists) but has a nested verification
 * challenge, we solve the challenge but do NOT re-create the comment. The old
 * code re-posted the same comment after solving, creating duplicates.
 */

import { MoltbookClient } from './client.js';
import type { MoltbookClientConfig, ApiResponse } from './client.js';
import { extractChallenge, isVerified } from './verification.js';
import { parseChallenge } from './challenge-parser.js';
import { contentHash } from '../../core/content-hash.js';
import { now, isAfter } from '../../core/timestamps.js';
import type {
  PlatformAdapter,
  PlatformEvent,
  ScanOptions,
  ScanResult,
  PublishOptions,
  PublishResult,
  HealthReport,
  MoltbookPost,
  MoltbookComment,
} from '../../types.js';

// ── Config ─────────────────────────────────────────────────────────

export interface MoltbookConfig {
  apiKey: string;
  baseUrl?: string;
  proxyUrl?: string;
  sanitize?: boolean;
}

// ── Adapter ────────────────────────────────────────────────────────

export class MoltbookAdapter implements PlatformAdapter {
  readonly platform = 'moltbook' as const;
  private readonly client: MoltbookClient;

  constructor(config: MoltbookConfig) {
    const clientConfig: MoltbookClientConfig = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      proxyUrl: config.proxyUrl,
      sanitize: config.sanitize,
    };
    this.client = new MoltbookClient(clientConfig);
  }

  // ── Scan ─────────────────────────────────────────────────────────

  async scan(opts: ScanOptions): Promise<ScanResult> {
    const scannedAt = now();
    const since = opts.since;
    const limit = opts.limit ?? 50;

    // Fetch feed (newest first)
    const feed = await this.client.getFeed('new', { limit });
    const posts = feed.data ?? [];

    // Convert posts to PlatformEvents
    const allEvents: PlatformEvent[] = posts.map((post: MoltbookPost) =>
      postToEvent(post),
    );

    // Filter to events after the cursor
    const newEvents = since
      ? allEvents.filter((e) => isAfter(e.timestamp, since))
      : allEvents;

    // Sort oldest first for processing order
    newEvents.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    // Determine new cursor: latest event timestamp, or keep existing
    const cursor =
      newEvents.length > 0
        ? newEvents[newEvents.length - 1].timestamp
        : since ?? scannedAt;

    return {
      events: newEvents,
      cursor,
      meta: {
        total: allEvents.length,
        new: newEvents.length,
        scannedAt,
      },
    };
  }

  // ── Publish ──────────────────────────────────────────────────────

  async publish(opts: PublishOptions): Promise<PublishResult> {
    const hash = await contentHash(opts.content);
    const publishedAt = now();

    // Determine if this is a comment (replyTo present) or a post
    if (opts.replyTo) {
      return this.publishComment(opts, hash, publishedAt);
    }
    return this.publishPost(opts, hash, publishedAt);
  }

  private async publishPost(
    opts: PublishOptions,
    hash: string,
    publishedAt: string,
  ): Promise<PublishResult> {
    const channel = opts.channel ?? 'general';
    // Posts use content as both title and body if no clear separator
    const title = opts.content.split('\n')[0].slice(0, 200);
    const content = opts.content;

    const response = await this.client.createPost(channel, title, content);

    // Handle verification challenge
    const verified = await this.handleVerification(response);

    const postId =
      (response.data as MoltbookPost | undefined)?.id ?? `mb-${Date.now()}`;

    return {
      id: postId,
      contentHash: hash,
      publishedAt,
      verified,
      deduplicated: false,
    };
  }

  private async publishComment(
    opts: PublishOptions,
    hash: string,
    publishedAt: string,
  ): Promise<PublishResult> {
    const postId = opts.replyTo!;
    const parentId = opts.parentAuthor; // Overloaded: used as parentCommentId for threading

    const response = await this.client.createComment(
      postId,
      opts.content,
      parentId,
    );

    // CRITICAL: Check if the comment was already created (success with ID)
    // even if there's a nested verification challenge.
    // The old code would re-create the comment after solving the challenge,
    // causing duplicates.

    // Extract comment ID from the response — it may be in data or in the
    // top-level comment field (Shape B)
    const commentData = response.data as MoltbookComment | undefined;
    const rawComment = (response as ApiResponse & { comment?: Record<string, unknown> }).comment;
    const commentId =
      commentData?.id ??
      (rawComment?.id as string | undefined) ??
      `mb-${Date.now()}`;

    // If already verified, we're done — no challenge needed
    if (isVerified(response)) {
      return {
        id: commentId,
        contentHash: hash,
        publishedAt,
        verified: true,
        deduplicated: false,
      };
    }

    // Handle verification challenge WITHOUT re-creating the comment
    const verified = await this.handleVerification(response);

    return {
      id: commentId,
      contentHash: hash,
      publishedAt,
      verified,
      deduplicated: false,
    };
  }

  /**
   * Handle verification challenges from any response shape.
   *
   * IMPORTANT: This only solves the challenge — it does NOT retry the original
   * request. The comment/post was already created; it just needs verification.
   */
  private async handleVerification(response: unknown): Promise<boolean> {
    // Already verified? Done.
    if (isVerified(response)) return true;

    // Extract challenge from any shape
    const challenge = extractChallenge(response);
    if (!challenge) {
      // No challenge and not verified — assume success (some endpoints
      // don't require verification)
      return true;
    }

    // Solve the math challenge
    const parsed = parseChallenge(challenge.challenge_text);
    if (!parsed) {
      return false;
    }

    // Submit answer
    const answer = parsed.answer.toString();
    const verifyResult = await this.client.submitVerification(
      challenge.verification_code,
      answer,
    );

    return verifyResult.data?.verified === true || verifyResult.success === true;
  }

  // ── Health Check ─────────────────────────────────────────────────

  async healthCheck(): Promise<HealthReport> {
    const checkedAt = now();
    const baseUrl =
      this.client['baseUrl'] ?? 'https://www.moltbook.com/api/v1';

    try {
      const profile = await this.client.getProfile();
      const isUp = profile.success || profile.data !== undefined;

      return {
        platform: 'moltbook',
        status: isUp ? 'healthy' : 'degraded',
        endpoints: [
          {
            url: `${baseUrl}/agents/me`,
            status: isUp ? 'up' : 'down',
            successRate: isUp ? 1 : 0,
            lastSuccess: isUp ? checkedAt : undefined,
            lastFailure: isUp ? undefined : checkedAt,
          },
        ],
        checkedAt,
      };
    } catch {
      return {
        platform: 'moltbook',
        status: 'down',
        endpoints: [
          {
            url: `${baseUrl}/agents/me`,
            status: 'down',
            successRate: 0,
            lastFailure: checkedAt,
          },
        ],
        checkedAt,
      };
    }
  }

  // ── Lifecycle (no-op for REST) ───────────────────────────────────

  async connect(): Promise<void> {
    // REST — no persistent connection needed
  }

  async disconnect(): Promise<void> {
    // REST — nothing to close
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function postToEvent(post: MoltbookPost): PlatformEvent {
  return {
    id: post.id,
    platform: 'moltbook',
    author: post.author?.name ?? 'unknown',
    content: post.content ?? '',
    timestamp: toISOTimestamp(post.created_at),
    channel: post.submolt,
    raw: post,
  };
}

/**
 * Ensure a timestamp is ISO 8601. Moltbook sometimes returns non-ISO formats.
 */
function toISOTimestamp(ts: string): string {
  if (!ts) return now();
  // If already ISO 8601, return as-is
  const d = new Date(ts);
  if (isNaN(d.getTime())) return now();
  return d.toISOString();
}

// Re-export client for direct use
export { MoltbookClient } from './client.js';
export type { MoltbookClientConfig, ApiResponse } from './client.js';

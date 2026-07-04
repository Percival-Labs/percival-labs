/**
 * Moltbook HTTP client — clean room implementation for agent-social.
 *
 * Features:
 * - Optional proxy routing (Docker proxy for sandboxed environments)
 * - Rate limit tracking from response headers
 * - Auto-wait on 429 responses
 * - Response sanitization via sanitizeDeep()
 * - No Bun-specific APIs — standard fetch() only
 */

import { sanitizeDeep } from './sanitizer.js';
import type {
  MoltbookPost,
  MoltbookComment,
} from '../../types.js';

// ── Config ─────────────────────────────────────────────────────────

export interface MoltbookClientConfig {
  apiKey: string;
  baseUrl?: string;
  proxyUrl?: string;
  sanitize?: boolean;
}

// ── Response Types ─────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  hint?: string;
  // Shape A verification (top-level)
  verification_code?: string;
  challenge_text?: string;
  expires_at?: string;
  // Shape B (nested)
  comment?: Record<string, unknown>;
  verified?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  has_more: boolean;
  next_cursor?: string;
}

export interface FeedOptions {
  submolt?: string;
  limit?: number;
  cursor?: string;
}

// ── Rate Limit State ───────────────────────────────────────────────

export interface RateLimitState {
  remaining: number;
  resetAt: number; // Unix epoch seconds
}

// ── Client ─────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://www.moltbook.com/api/v1';

export class MoltbookClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly proxyUrl: string | undefined;
  private readonly shouldSanitize: boolean;
  private rateLimit: RateLimitState = { remaining: 30, resetAt: 0 };

  constructor(config: MoltbookClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.proxyUrl = config.proxyUrl;
    this.shouldSanitize = config.sanitize ?? true;
  }

  // ── Rate Limit ─────────────────────────────────────────────────

  getRateLimit(): Readonly<RateLimitState> {
    return { ...this.rateLimit };
  }

  // ── Core Request ───────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ApiResponse<T>> {
    // Pre-emptive rate limit wait
    if (
      this.rateLimit.remaining <= 1 &&
      Date.now() / 1000 < this.rateLimit.resetAt
    ) {
      const waitMs = (this.rateLimit.resetAt - Date.now() / 1000) * 1000;
      await new Promise((r) => setTimeout(r, Math.max(waitMs, 0)));
    }

    let res: Response;

    if (this.proxyUrl) {
      // Route through Docker proxy
      res = await fetch(`${this.proxyUrl}/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ method, path, body }),
      });
    } else {
      // Direct REST call
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    // Track rate limits from response headers
    const remaining = res.headers.get('X-RateLimit-Remaining');
    const reset = res.headers.get('X-RateLimit-Reset');
    if (remaining !== null) this.rateLimit.remaining = parseInt(remaining, 10);
    if (reset !== null) this.rateLimit.resetAt = parseInt(reset, 10);

    // Handle 429
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      // Retry once after waiting
      return this.request<T>(method, path, body);
    }

    const json = (await res.json()) as ApiResponse<T>;

    // Sanitize if enabled
    if (this.shouldSanitize) {
      return sanitizeDeep(json) as ApiResponse<T>;
    }

    return json;
  }

  // ── Profile ────────────────────────────────────────────────────

  async getProfile(): Promise<
    ApiResponse<{ name: string; karma: number; description: string }>
  > {
    return this.request('GET', '/agents/me');
  }

  // ── Feed ───────────────────────────────────────────────────────

  async getFeed(
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    opts?: FeedOptions,
  ): Promise<PaginatedResponse<MoltbookPost>> {
    const params = new URLSearchParams({ sort });
    if (opts?.submolt) params.set('submolt', opts.submolt);
    if (opts?.limit) params.set('limit', opts.limit.toString());
    if (opts?.cursor) params.set('cursor', opts.cursor);

    const res = await this.request<PaginatedResponse<MoltbookPost>>(
      'GET',
      `/posts?${params}`,
    );
    return res.data ?? { data: [], has_more: false };
  }

  // ── Posts ──────────────────────────────────────────────────────

  async getPost(id: string): Promise<ApiResponse<MoltbookPost>> {
    return this.request<MoltbookPost>('GET', `/posts/${id}`);
  }

  async createPost(
    submolt: string,
    title: string,
    content: string,
  ): Promise<ApiResponse<MoltbookPost>> {
    return this.request<MoltbookPost>('POST', '/posts', {
      type: 'text',
      title,
      content,
      submolt,
    });
  }

  // ── Comments ───────────────────────────────────────────────────

  async getComments(
    postId: string,
    sort: 'best' | 'new' | 'old' = 'best',
  ): Promise<MoltbookComment[]> {
    const res = await this.request<{ data: MoltbookComment[] }>(
      'GET',
      `/posts/${postId}/comments?sort=${sort}`,
    );
    return res.data?.data ?? [];
  }

  async createComment(
    postId: string,
    content: string,
    parentId?: string,
  ): Promise<ApiResponse<MoltbookComment>> {
    const body: Record<string, unknown> = { content };
    if (parentId) body.parent_id = parentId;

    return this.request<MoltbookComment>(
      'POST',
      `/posts/${postId}/comments`,
      body,
    );
  }

  // ── Verification ──────────────────────────────────────────────

  async submitVerification(
    verificationCode: string,
    answer: string,
  ): Promise<ApiResponse<{ verified: boolean }>> {
    return this.request<{ verified: boolean }>('POST', '/verify', {
      verification_code: verificationCode,
      answer,
    });
  }

  // ── Notifications ─────────────────────────────────────────────

  async getNotifications(): Promise<ApiResponse<unknown>> {
    return this.request('GET', '/home');
  }

  // ── Search ────────────────────────────────────────────────────

  async search(
    query: string,
    type: 'posts' | 'comments' | 'all' = 'posts',
    limit: number = 20,
  ): Promise<MoltbookPost[]> {
    const params = new URLSearchParams({
      q: query,
      type,
      limit: limit.toString(),
    });
    const res = await this.request<{ data: MoltbookPost[] }>(
      'GET',
      `/search?${params}`,
    );
    return res.data?.data ?? [];
  }
}

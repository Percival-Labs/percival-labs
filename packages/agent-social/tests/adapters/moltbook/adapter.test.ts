import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { MoltbookAdapter } from '../../../src/adapters/moltbook/index.js';

// ── Mock Fetch ───────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;
let mockFetch: ReturnType<typeof mock>;
let fetchResponses: Array<() => Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchResponses = [];
  mockFetch = mock(() => {
    const next = fetchResponses.shift();
    if (next) return Promise.resolve(next());
    return Promise.resolve(jsonResponse({ success: true, data: {} }));
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ── Adapter Tests ────────────────────────────────────────────────────

describe('MoltbookAdapter', () => {
  const config = { apiKey: 'test-key', sanitize: false };

  describe('publish() — duplicate prevention', () => {
    test('does NOT retry when comment is already created and verified', async () => {
      // The API returns success: true with a comment ID and no verification
      // challenge. The old code would still try to re-post.
      fetchResponses = [
        () =>
          jsonResponse({
            success: true,
            data: {
              id: 'comment-abc',
              content: 'My reply',
              author: { name: 'Percy', id: 'agent-1' },
              created_at: '2026-03-08T10:00:00Z',
            },
          }),
      ];

      const adapter = new MoltbookAdapter(config);
      const result = await adapter.publish({
        content: 'My reply',
        replyTo: 'post-123',
      });

      expect(result.id).toBe('comment-abc');
      expect(result.verified).toBe(true);
      expect(result.deduplicated).toBe(false);
      // Only 1 fetch call — no retry
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('solves challenge WITHOUT re-creating comment (Shape B — nested)', async () => {
      // Shape B: comment was created (has ID) but needs verification.
      // The CRITICAL fix: solve challenge, do NOT call createComment again.
      fetchResponses = [
        // 1st call: createComment — returns comment WITH nested verification
        () =>
          jsonResponse({
            success: true,
            comment: {
              id: 'comment-xyz',
              content: 'My reply',
              verification: {
                verification_code: 'verify-123',
                challenge_text: 'What is twenty plus five?',
              },
            },
          }),
        // 2nd call: submitVerification — solves the challenge
        () =>
          jsonResponse({
            success: true,
            data: { verified: true },
          }),
      ];

      const adapter = new MoltbookAdapter(config);
      const result = await adapter.publish({
        content: 'My reply',
        replyTo: 'post-456',
      });

      // Exactly 2 calls: createComment + submitVerification (no 3rd retry)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('comment-xyz');
      expect(result.verified).toBe(true);

      // Verify the second call was to /verify, not /comments
      const [secondUrl, secondInit] = mockFetch.mock.calls[1] as [
        string,
        RequestInit,
      ];
      expect(secondUrl).toContain('/verify');
      const body = JSON.parse(secondInit.body as string);
      expect(body.verification_code).toBe('verify-123');
      expect(body.answer).toBe('25'); // 20 + 5
    });

    test('solves challenge for Shape A — top-level verification', async () => {
      fetchResponses = [
        // 1st call: createPost — returns top-level verification
        () =>
          jsonResponse({
            success: true,
            verification_code: 'verify-top',
            challenge_text: 'What is forty minus twelve?',
            expires_at: '2026-03-08T12:00:00Z',
          }),
        // 2nd call: submitVerification
        () =>
          jsonResponse({
            success: true,
            data: { verified: true },
          }),
      ];

      const adapter = new MoltbookAdapter(config);
      const result = await adapter.publish({
        content: 'My post about trust\nWith more details.',
        channel: 'agents',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.verified).toBe(true);

      // Verify the answer was correct: 40 - 12 = 28
      const [, secondInit] = mockFetch.mock.calls[1] as [string, RequestInit];
      const body = JSON.parse(secondInit.body as string);
      expect(body.answer).toBe('28');
    });
  });

  describe('scan() — cursor filtering', () => {
    test('only returns events newer than cursor', async () => {
      fetchResponses = [
        () =>
          jsonResponse({
            success: true,
            data: {
              data: [
                {
                  id: 'post-old',
                  title: 'Old Post',
                  content: 'Old content',
                  submolt: 'general',
                  author: { name: 'Alice', id: 'user-1' },
                  upvotes: 5,
                  comment_count: 2,
                  created_at: '2026-03-07T08:00:00Z',
                },
                {
                  id: 'post-new',
                  title: 'New Post',
                  content: 'New content',
                  submolt: 'agents',
                  author: { name: 'Bob', id: 'user-2' },
                  upvotes: 3,
                  comment_count: 1,
                  created_at: '2026-03-08T10:00:00Z',
                },
                {
                  id: 'post-newest',
                  title: 'Newest Post',
                  content: 'Latest content',
                  submolt: 'agents',
                  author: { name: 'Charlie', id: 'user-3' },
                  upvotes: 1,
                  comment_count: 0,
                  created_at: '2026-03-08T14:00:00Z',
                },
              ],
              has_more: false,
            },
          }),
      ];

      const adapter = new MoltbookAdapter(config);
      const result = await adapter.scan({
        since: '2026-03-08T00:00:00Z',
      });

      // Only the two posts after the cursor should be returned
      expect(result.events.length).toBe(2);
      expect(result.events[0].id).toBe('post-new');
      expect(result.events[1].id).toBe('post-newest');

      // Cursor should be the latest event's timestamp
      expect(result.cursor).toBe('2026-03-08T14:00:00.000Z');

      // Meta
      expect(result.meta.total).toBe(3);
      expect(result.meta.new).toBe(2);
    });

    test('returns all events when no cursor is provided', async () => {
      fetchResponses = [
        () =>
          jsonResponse({
            success: true,
            data: {
              data: [
                {
                  id: 'post-1',
                  title: 'First',
                  content: 'Content 1',
                  submolt: 'general',
                  author: { name: 'Alice', id: 'user-1' },
                  upvotes: 0,
                  comment_count: 0,
                  created_at: '2026-03-08T08:00:00Z',
                },
              ],
              has_more: false,
            },
          }),
      ];

      const adapter = new MoltbookAdapter(config);
      const result = await adapter.scan({});

      expect(result.events.length).toBe(1);
      expect(result.events[0].id).toBe('post-1');
    });

    test('events are sorted oldest-first', async () => {
      fetchResponses = [
        () =>
          jsonResponse({
            success: true,
            data: {
              data: [
                {
                  id: 'post-b',
                  title: 'B',
                  content: 'B',
                  submolt: 'general',
                  author: { name: 'A', id: '1' },
                  upvotes: 0,
                  comment_count: 0,
                  created_at: '2026-03-08T12:00:00Z',
                },
                {
                  id: 'post-a',
                  title: 'A',
                  content: 'A',
                  submolt: 'general',
                  author: { name: 'A', id: '1' },
                  upvotes: 0,
                  comment_count: 0,
                  created_at: '2026-03-08T08:00:00Z',
                },
              ],
              has_more: false,
            },
          }),
      ];

      const adapter = new MoltbookAdapter(config);
      const result = await adapter.scan({});

      // Oldest first
      expect(result.events[0].id).toBe('post-a');
      expect(result.events[1].id).toBe('post-b');
    });
  });

  describe('healthCheck()', () => {
    test('returns healthy when profile succeeds', async () => {
      fetchResponses = [
        () =>
          jsonResponse({
            success: true,
            data: { name: 'Percy', karma: 42, description: 'Agent' },
          }),
      ];

      const adapter = new MoltbookAdapter(config);
      const health = await adapter.healthCheck();

      expect(health.platform).toBe('moltbook');
      expect(health.status).toBe('healthy');
      expect(health.endpoints[0].status).toBe('up');
      expect(health.endpoints[0].successRate).toBe(1);
    });

    test('returns down on network error', async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error('Network error')),
      );

      const adapter = new MoltbookAdapter(config);
      const health = await adapter.healthCheck();

      expect(health.status).toBe('down');
      expect(health.endpoints[0].status).toBe('down');
      expect(health.endpoints[0].successRate).toBe(0);
    });
  });

  describe('connect/disconnect', () => {
    test('are no-ops that resolve', async () => {
      const adapter = new MoltbookAdapter(config);
      await expect(adapter.connect()).resolves.toBeUndefined();
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });
  });
});

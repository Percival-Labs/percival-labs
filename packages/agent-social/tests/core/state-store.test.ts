import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { StateStore } from '../../src/core/state-store.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), 'agent-social-test-' + process.pid);
const TEST_STATE = join(TEST_DIR, 'state.json');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  if (existsSync(TEST_STATE)) unlinkSync(TEST_STATE);
});

afterEach(() => {
  if (existsSync(TEST_STATE)) unlinkSync(TEST_STATE);
});

describe('StateStore', () => {
  // ── Fixes Nostr Problem 2: No cursor ──────────────────────────

  test('cursor persists across instances', () => {
    const store1 = new StateStore(TEST_STATE);
    store1.setCursor('nostr', '2026-03-08T12:00:00.000Z');
    store1.forceSave();

    const store2 = new StateStore(TEST_STATE);
    expect(store2.getCursor('nostr')).toBe('2026-03-08T12:00:00.000Z');
  });

  test('cursors are per-platform', () => {
    const store = new StateStore(TEST_STATE);
    store.setCursor('nostr', '2026-03-08T12:00:00.000Z');
    store.setCursor('moltbook', '2026-03-07T06:00:00.000Z');
    store.forceSave();

    const store2 = new StateStore(TEST_STATE);
    expect(store2.getCursor('nostr')).toBe('2026-03-08T12:00:00.000Z');
    expect(store2.getCursor('moltbook')).toBe('2026-03-07T06:00:00.000Z');
  });

  // ── Fixes Nostr Problem 3: No dedup ───────────────────────────

  test('hasSeen returns false for unseen events', () => {
    const store = new StateStore(TEST_STATE);
    expect(store.hasSeen('abc123')).toBe(false);
  });

  test('hasSeen returns true after recordSeen', () => {
    const store = new StateStore(TEST_STATE);
    store.recordSeen('abc123');
    expect(store.hasSeen('abc123')).toBe(true);
  });

  test('seen events persist across instances', () => {
    const store1 = new StateStore(TEST_STATE);
    store1.recordSeen('event1');
    store1.recordSeen('event2');
    store1.forceSave();

    const store2 = new StateStore(TEST_STATE);
    expect(store2.hasSeen('event1')).toBe(true);
    expect(store2.hasSeen('event2')).toBe(true);
    expect(store2.hasSeen('event3')).toBe(false);
  });

  test('recordSeenBatch marks multiple events', () => {
    const store = new StateStore(TEST_STATE);
    store.recordSeenBatch(['a', 'b', 'c']);
    expect(store.hasSeen('a')).toBe(true);
    expect(store.hasSeen('b')).toBe(true);
    expect(store.hasSeen('c')).toBe(true);
    expect(store.hasSeen('d')).toBe(false);
  });

  // ── Fixes Publish Dedup ────────────────────────────────────────

  test('hasPublished detects content hash duplicates', () => {
    const store = new StateStore(TEST_STATE);
    expect(store.hasPublished('hash1')).toBe(false);
    store.recordPublish('hash1');
    expect(store.hasPublished('hash1')).toBe(true);
  });

  test('published hashes persist across instances', () => {
    const store1 = new StateStore(TEST_STATE);
    store1.recordPublish('hash1');
    store1.forceSave();

    const store2 = new StateStore(TEST_STATE);
    expect(store2.hasPublished('hash1')).toBe(true);
  });

  // ── Fixes Relay Health (Nostr Problem 6) ───────────────────────

  test('healthy relay stays in list', () => {
    const store = new StateStore(TEST_STATE);
    const relays = ['wss://relay1.com', 'wss://relay2.com'];
    store.recordRelayResult('wss://relay1.com', true);
    store.recordRelayResult('wss://relay2.com', true);
    expect(store.getHealthyRelays(relays)).toEqual(relays);
  });

  test('relay enters cooldown after 3 consecutive failures', () => {
    const store = new StateStore(TEST_STATE);
    const relays = ['wss://good.com', 'wss://bad.com'];

    store.recordRelayResult('wss://good.com', true);
    store.recordRelayResult('wss://bad.com', false);
    store.recordRelayResult('wss://bad.com', false);
    store.recordRelayResult('wss://bad.com', false); // 3rd failure

    const healthy = store.getHealthyRelays(relays);
    expect(healthy).toEqual(['wss://good.com']);
    expect(healthy).not.toContain('wss://bad.com');
  });

  test('relay recovers after cooldown expires', () => {
    const store = new StateStore(TEST_STATE);
    const relays = ['wss://relay.com'];

    store.recordRelayResult('wss://relay.com', false);
    store.recordRelayResult('wss://relay.com', false);
    store.recordRelayResult('wss://relay.com', false);

    // Should be in cooldown
    expect(store.getHealthyRelays(relays)).toEqual([]);

    // Manually expire cooldown for test
    const health = store.getRelayHealth();
    health['wss://relay.com'].cooldownUntil = new Date(
      Date.now() - 1000,
    ).toISOString();
    // We need to modify internal state for this test
    const state = store.getState() as any;
    state.relayHealth['wss://relay.com'].cooldownUntil = new Date(
      Date.now() - 1000,
    ).toISOString();

    expect(store.getHealthyRelays(relays)).toEqual(['wss://relay.com']);
  });

  test('success resets consecutive failure count', () => {
    const store = new StateStore(TEST_STATE);
    const relays = ['wss://flaky.com'];

    store.recordRelayResult('wss://flaky.com', false);
    store.recordRelayResult('wss://flaky.com', false);
    store.recordRelayResult('wss://flaky.com', true); // Reset!
    store.recordRelayResult('wss://flaky.com', false);
    store.recordRelayResult('wss://flaky.com', false);

    // Only 2 consecutive failures — should still be healthy
    expect(store.getHealthyRelays(relays)).toEqual(['wss://flaky.com']);
  });

  // ── Engagement Log ─────────────────────────────────────────────

  test('engagement log tracks actions', () => {
    const store = new StateStore(TEST_STATE);
    store.recordEngagement({
      timestamp: '2026-03-08T12:00:00.000Z',
      platform: 'nostr',
      action: 'reply',
      targetId: 'event123',
      ourEventId: 'our456',
      contentPreview: 'Great point about trust...',
      channel: 'vouch',
    });

    const log = store.getEngagementLog();
    expect(log.length).toBe(1);
    expect(log[0].platform).toBe('nostr');
    expect(log[0].action).toBe('reply');
  });

  test('getOurEventIds returns all published event IDs', () => {
    // Fresh state file for this test
    const freshPath = join(TEST_DIR, 'event-ids-test.json');
    const store = new StateStore(freshPath);
    store.recordEngagement({
      timestamp: '2026-03-08T12:00:00.000Z',
      platform: 'nostr',
      action: 'reply',
      ourEventId: 'event1',
    });
    store.recordEngagement({
      timestamp: '2026-03-08T13:00:00.000Z',
      platform: 'nostr',
      action: 'post',
      ourEventId: 'event2',
    });
    store.recordEngagement({
      timestamp: '2026-03-08T14:00:00.000Z',
      platform: 'moltbook',
      action: 'reply',
      // No ourEventId
    });

    expect(store.getOurEventIds()).toEqual(['event1', 'event2']);
    if (existsSync(freshPath)) unlinkSync(freshPath);
  });

  // ── Pruning ────────────────────────────────────────────────────

  test('prune keeps state file manageable', () => {
    // Fresh state file for this test to avoid contamination
    const prunePath = join(TEST_DIR, 'prune-test.json');
    const store = new StateStore(prunePath);

    // Add 15,000 seen events (over the 10,000 limit)
    for (let i = 0; i < 15_000; i++) {
      store.recordSeen(`event-${i}`);
    }

    const { prunedEvents } = store.prune();
    expect(prunedEvents).toBe(5_000);

    // Most recent events should survive
    expect(store.hasSeen('event-14999')).toBe(true);
    expect(store.hasSeen('event-10000')).toBe(true);
    // Oldest events should be pruned
    expect(store.hasSeen('event-0')).toBe(false);

    if (existsSync(prunePath)) unlinkSync(prunePath);
  });

  // ── Edge Cases ─────────────────────────────────────────────────

  test('loads gracefully from nonexistent file', () => {
    const fakePath = join(TEST_DIR, 'truly-nonexistent-' + Date.now() + '.json');
    const store = new StateStore(fakePath);
    expect(store.getCursor('nostr')).toBeUndefined();
    expect(store.hasSeen('anything')).toBe(false);
  });

  test('loads gracefully from corrupt file', () => {
    const { writeFileSync } = require('fs');
    const corruptPath = join(TEST_DIR, 'corrupt-' + Date.now() + '.json');
    writeFileSync(corruptPath, 'this is not json{{{');
    const store = new StateStore(corruptPath);
    expect(store.getCursor('nostr')).toBeUndefined();
    if (existsSync(corruptPath)) unlinkSync(corruptPath);
  });

  test('no duplicate entries in seenEventIds', () => {
    const store = new StateStore(TEST_STATE);
    store.recordSeen('abc');
    store.recordSeen('abc');
    store.recordSeen('abc');
    const state = store.getState();
    const count = state.seenEventIds.filter((id) => id === 'abc').length;
    expect(count).toBe(1);
  });
});

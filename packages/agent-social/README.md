# @percival-labs/agent-social

Stateful social engagement toolkit for AI agents. Built because we shipped broken tooling and decided to fix it properly.

[![npm version](https://img.shields.io/npm/v/@percival-labs/agent-social)](https://www.npmjs.com/package/@percival-labs/agent-social)

```bash
npm install @percival-labs/agent-social
```

## Why This Exists

We built engagement tools for [Clawstr](https://clawstr.com) (Nostr) and [Moltbook](https://www.moltbook.com) from scratch. They had fundamental problems:

| Problem | Impact | Fix |
|---------|--------|-----|
| Timestamps showed time without date | Couldn't tell today from last week | ISO 8601 everywhere |
| Every scan returned full history | Reported old events as new | Cursor-based scanning |
| No dedup against what we'd already seen | Wasted time on stale data | State store with seen event tracking |
| Moltbook verification checked wrong path | Threaded replies stayed "pending" forever | Handle both response shapes |
| Challenge solver couldn't parse split words | "for ty" (forty) failed verification | Fragment merging parser |
| Duplicate posts from retry logic | Same comment posted 4 times | Content-hash idempotent publishing |
| Dead relays stayed in rotation | Timeouts on every scan | Relay health tracking with cooldown |

We're the team building [Vouch](https://percival-labs.ai) — trust infrastructure for AI agents. If we can't trust our own tooling, that's a problem. So we fixed it and open-sourced the result.

## Quick Start

### Nostr (Clawstr)

```typescript
import { NostrAdapter, StateStore, statefulScan, idempotentPublish } from '@percival-labs/agent-social';

const store = new StateStore('.agent-social/state.json');

const nostr = new NostrAdapter({
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.primal.net',
  ],
  nsec: process.env.VOUCH_NSEC!,
}, store);

await nostr.connect();

// Scan for new replies — only events since last check
const result = await statefulScan({ adapter: nostr, stateStore: store });
console.log(`${result.meta.new} new events (${result.meta.total} total on relays)`);

for (const event of result.events) {
  // Every event has a full ISO 8601 timestamp — never just "8:48 AM"
  console.log(`[${event.timestamp}] ${event.author.slice(0, 8)}: ${event.content.slice(0, 100)}`);
}

// Publish — idempotent, won't double-post
const pub = await idempotentPublish(
  { adapter: nostr, stateStore: store },
  { content: 'Trust is earned, not given.', channel: 'vouch' },
);

if (pub.deduplicated) {
  console.log('Already posted this — skipped');
} else {
  console.log(`Posted: ${pub.id}`);
}

await nostr.disconnect();
```

### Moltbook

```typescript
import { MoltbookAdapter, StateStore, statefulScan, idempotentPublish } from '@percival-labs/agent-social';

const store = new StateStore('.agent-social/state.json');

const moltbook = new MoltbookAdapter({
  apiKey: process.env.MOLTBOOK_API_KEY!,
  proxyUrl: 'http://localhost:9111', // Optional: route through sanitizing proxy
}, store);

// Scan for new activity
const result = await statefulScan({ adapter: moltbook, stateStore: store });

// Publish a reply — handles verification challenges automatically
// If challenge has split words like "for ty" (forty), the parser handles it
// If the comment is already created, it verifies without re-posting (no duplicates)
const pub = await idempotentPublish(
  { adapter: moltbook, stateStore: store },
  {
    content: 'Interesting point about cold-start trust scoring.',
    replyTo: 'post-id-123',
    channel: 'ai-agents',
  },
);
```

## Core Concepts

### Stateful Scanning

Every scan uses a cursor to only fetch events since the last check. Events are tracked by ID — if you've seen it before, it won't appear in results.

```typescript
// First scan: gets everything, sets cursor
const first = await statefulScan({ adapter, stateStore: store });
// first.meta.total = 150, first.meta.new = 150

// Second scan: only new events since cursor
const second = await statefulScan({ adapter, stateStore: store });
// second.meta.total = 3, second.meta.new = 3
```

### Idempotent Publishing

Content is SHA-256 hashed before publishing. If the same content was already posted, the publish is skipped.

```typescript
const pub1 = await idempotentPublish(config, { content: 'Hello world' });
// pub1.deduplicated = false (posted)

const pub2 = await idempotentPublish(config, { content: 'Hello world' });
// pub2.deduplicated = true (skipped — same content hash)

const pub3 = await idempotentPublish(config, { content: '  HELLO WORLD  ' });
// pub3.deduplicated = true (normalization: trim + lowercase + collapse spaces)
```

### Relay Health

Nostr relays are tracked for success/failure. After 3 consecutive failures, a relay enters 30-minute cooldown and is skipped.

```typescript
// relay.nostr.band times out 3 times → automatically skipped
// Other relays continue working
// After 30 minutes, it's retried
// One success resets the failure counter
```

### Moltbook Verification

Moltbook returns verification challenges in two different shapes. This toolkit handles both:

```typescript
// Shape A (top-level): { verification_code: "abc", challenge_text: "..." }
// Shape B (nested):    { comment: { verification: { verification_code: "abc", challenge_text: "..." } } }

// The adapter handles both automatically — you never need to think about it
```

The challenge solver handles obfuscated word problems:

```typescript
import { parseChallenge } from '@percival-labs/agent-social';

// Split words
parseChallenge('A bot has for ty points. It gains six teen. Total?');
// → { numbers: [40, 16], operation: 'add', answer: 56 }

// Randomized case
parseChallenge('A node has fOr Ty connections.');
// → { numbers: [40], ... }

// Bracket decorators
parseChallenge('Score is [f]o[r] t{y} points.');
// → { numbers: [40], ... }
```

## CLI

```bash
# Show engagement state
agent-social status

# Show relay health
agent-social health

# Import legacy engagement log
agent-social migrate ./engagement-log.json
```

## State File

All state is stored in a single JSON file (default: `.agent-social/state.json`):

- **Cursors** — per-platform "last checked at" timestamps
- **Seen event IDs** — dedup cache (auto-pruned at 10K entries)
- **Published content hashes** — prevents duplicate posts
- **Relay health** — success/failure counts, cooldown timestamps
- **Engagement log** — append-only record of all actions

The state file is human-readable. You can inspect it, back it up, or reset it by deleting it.

## API Reference

### Core

| Export | Description |
|--------|-------------|
| `StateStore` | File-backed engagement state |
| `statefulScan()` | Cursor-based scan with dedup |
| `idempotentPublish()` | Content-hash dedup publishing |
| `contentHash()` | SHA-256 of normalized content |
| `fromUnixSeconds()` | Unix epoch → ISO 8601 |
| `toUnixSeconds()` | ISO 8601 → Unix epoch |
| `now()` | Current time as ISO 8601 |
| `formatAge()` | "3h ago (2026-03-08T12:00:00Z)" |

### Nostr

| Export | Description |
|--------|-------------|
| `NostrAdapter` | PlatformAdapter for Nostr relays |
| `RelayPool` | Connection-reusing relay pool with health tracking |

### Moltbook

| Export | Description |
|--------|-------------|
| `MoltbookAdapter` | PlatformAdapter for Moltbook API |
| `parseChallenge()` | Robust word problem solver |
| `extractChallenge()` | Extract verification from any response shape |
| `isVerified()` | Check if response indicates verification complete |
| `sanitize()` | Strip prompt injection patterns |
| `sanitizeDeep()` | Recursive sanitization for objects |

## What We Learned

1. **Timestamps without dates are useless.** `toLocaleTimeString()` outputs "8:48 AM" — which day? We reported week-old events as breaking news.

2. **State is not optional.** Without cursors and dedup, every scan returns the full history. Your agent re-processes everything, wastes tokens, and creates duplicate responses.

3. **Test the exact failure modes.** Our Moltbook verification worked for top-level posts but silently failed for threaded replies because the response shape was different. We didn't have a test for the nested shape.

4. **Shallow copies mutate shared state.** `{ ...EMPTY_STATE }` looks like a fresh copy but shares inner objects. One instance modifying `cursors` corrupted every other instance. Classic JavaScript footgun.

5. **Dead relays waste everyone's time.** `relay.nostr.band` timed out consistently but stayed in rotation. Every scan waited 10 seconds for nothing. Track health, skip failures, retry later.

## License

MIT — [Percival Labs](https://percival-labs.ai)

Built because we believe broken tooling shouldn't be a secret. If your agent engagement tools have similar problems, use this or steal the patterns. That's why it's open source.

// Core
export { StateStore } from './core/state-store.js';
export { statefulScan } from './core/scanner.js';
export { idempotentPublish } from './core/publisher.js';
export { contentHash, normalizeContent } from './core/content-hash.js';
export { fromUnixSeconds, toUnixSeconds, now, formatAge, isAfter } from './core/timestamps.js';

// Adapters - Nostr
export { RelayPool } from './adapters/nostr/relay-pool.js';
export { NostrAdapter } from './adapters/nostr/index.js';
export type { NostrConfig } from './adapters/nostr/index.js';
export { identityFromNsec, signEvent, computeEventId } from './adapters/nostr/crypto.js';
export { buildPostTags, buildReplyTags } from './adapters/nostr/event-builder.js';

// Adapters - Moltbook
export { MoltbookAdapter } from './adapters/moltbook/index.js';
export { MoltbookClient } from './adapters/moltbook/client.js';
export type { MoltbookConfig } from './adapters/moltbook/index.js';
export type { MoltbookClientConfig } from './adapters/moltbook/client.js';
export { parseChallenge, mergeFragments, wordToNumber, stripDecorators } from './adapters/moltbook/challenge-parser.js';
export { extractChallenge, isVerified } from './adapters/moltbook/verification.js';
export { sanitize, sanitizeDeep } from './adapters/moltbook/sanitizer.js';

// Types
export type {
  PlatformEvent,
  ScanOptions,
  ScanResult,
  PublishOptions,
  PublishResult,
  RelayResult,
  HealthReport,
  EndpointHealth,
  PlatformAdapter,
  EngagementEntry,
  EngagementState,
  RelayHealthState,
  NostrEvent,
  UnsignedNostrEvent,
  NostrFilter,
  MoltbookPost,
  MoltbookComment,
  VerificationChallenge,
} from './types.js';

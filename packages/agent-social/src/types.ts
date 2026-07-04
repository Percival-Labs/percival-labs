// ── Platform Event ──────────────────────────────────────────────────

export interface PlatformEvent {
  id: string;
  platform: 'nostr' | 'moltbook';
  author: string;
  content: string;
  timestamp: string; // Always ISO 8601 with date+time+timezone
  channel?: string;
  replyTo?: string;
  raw?: unknown;
}

// ── Scan ────────────────────────────────────────────────────────────

export interface ScanOptions {
  /** Resume from this ISO 8601 timestamp. Events at or before this are excluded. */
  since?: string;
  /** Platform-specific identifiers to scope the scan (pubkeys, post IDs, etc.) */
  identifiers?: string[];
  /** Max events to return */
  limit?: number;
}

export interface ScanResult {
  events: PlatformEvent[];
  cursor: string; // ISO 8601 — pass back as `since` next time
  meta: {
    total: number;
    new: number;
    scannedAt: string; // ISO 8601
  };
}

// ── Publish ─────────────────────────────────────────────────────────

export interface PublishOptions {
  content: string;
  replyTo?: string;
  channel?: string;
  parentAuthor?: string;
}

export interface PublishResult {
  id: string;
  contentHash: string;
  publishedAt: string; // ISO 8601
  relayResults?: RelayResult[];
  verified?: boolean;
  deduplicated: boolean; // true if publish was skipped due to content hash match
}

export interface RelayResult {
  relay: string;
  ok: boolean;
  msg?: string;
}

// ── Health ──────────────────────────────────────────────────────────

export interface HealthReport {
  platform: string;
  status: 'healthy' | 'degraded' | 'down';
  endpoints: EndpointHealth[];
  checkedAt: string; // ISO 8601
}

export interface EndpointHealth {
  url: string;
  status: 'up' | 'down' | 'cooldown';
  successRate: number; // 0-1
  lastSuccess?: string;
  lastFailure?: string;
  cooldownUntil?: string;
}

// ── Adapter ─────────────────────────────────────────────────────────

export interface PlatformAdapter {
  readonly platform: 'nostr' | 'moltbook';

  scan(opts: ScanOptions): Promise<ScanResult>;
  publish(opts: PublishOptions): Promise<PublishResult>;
  healthCheck(): Promise<HealthReport>;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// ── State ───────────────────────────────────────────────────────────

export interface EngagementEntry {
  timestamp: string; // ISO 8601
  platform: 'nostr' | 'moltbook';
  action: 'scan' | 'reply' | 'post' | 'vote';
  targetId?: string;
  ourEventId?: string;
  contentHash?: string;
  contentPreview?: string;
  channel?: string;
}

export interface RelayHealthState {
  url: string;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastSuccess?: string;
  lastFailure?: string;
  cooldownUntil?: string;
}

export interface EngagementState {
  version: 2;
  cursors: Record<string, string>;
  publishedHashes: string[];
  seenEventIds: string[];
  relayHealth: Record<string, RelayHealthState>;
  engagementLog: EngagementEntry[];
  updatedAt: string;
}

// ── Nostr ───────────────────────────────────────────────────────────

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface UnsignedNostrEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  '#e'?: string[];
  '#p'?: string[];
  '#I'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

// ── Moltbook ────────────────────────────────────────────────────────

export interface MoltbookPost {
  id: string;
  title: string;
  content: string;
  submolt: string;
  author: { name: string; id: string };
  upvotes: number;
  comment_count: number;
  created_at: string;
}

export interface MoltbookComment {
  id: string;
  content: string;
  author: { name: string; id: string };
  upvotes: number;
  created_at: string;
  parent_id?: string;
}

export interface VerificationChallenge {
  verification_code: string;
  challenge_text: string;
  expires_at?: string;
}

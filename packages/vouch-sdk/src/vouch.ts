/**
 * Vouch — High-Level Agent SDK
 *
 * The primary interface for agents to interact with the Vouch trust network.
 * Handles identity, trust verification, outcome reporting, and score management.
 *
 * Usage:
 *   const vouch = new Vouch({ nsec: process.env.VOUCH_NSEC });
 *   await vouch.register({ name: 'MyAgent', model: 'claude-sonnet-4-6' });
 *   const trust = await vouch.verify('npub1abc...');
 */

import {
  generateNostrKeypair,
  identityFromNsec,
  identityFromHex,
  signEvent,
  verifyEvent,
  npubToHex,
  type NostrIdentity,
  type NostrEvent,
  type UnsignedEvent,
} from './nostr-identity.js';

// ── Types ──

export interface VouchOptions {
  /** Existing Nostr private key (bech32 nsec format). Omit to auto-generate. */
  nsec?: string;
  /** Existing Nostr private key (hex format). Omit to auto-generate. */
  secretKeyHex?: string;
  /** Vouch relay URL */
  relay?: string;
  /** Vouch API base URL */
  apiUrl?: string;
}

export interface RegisterOptions {
  name: string;
  model?: string;
  capabilities?: string[];
  description?: string;
  /** Optional ERC-8004 on-chain identity linkage */
  erc8004?: {
    agentId: string | number;
    chain: 'base' | 'base-sepolia';
    signature: string;
  };
}

export interface RegisterResult {
  npub: string;
  nip05: string;
  score: number;
  agentId: string;
}

export interface TrustResult {
  npub: string;
  score: number;
  tier: 'unranked' | 'bronze' | 'silver' | 'gold' | 'diamond';
  backed: boolean;
  poolSats: number;
  stakerCount: number;
  performance: {
    successRate: number;
    totalOutcomes: number;
  };
  dimensions: {
    verification: number;
    tenure: number;
    performance: number;
    backing: number;
    community: number;
  };
}

export interface OutcomeOptions {
  /** Counterparty's npub */
  counterparty: string;
  /** Your role in this interaction */
  role: 'performer' | 'purchaser';
  /** Task type for categorization */
  taskType: string;
  /** Whether the task succeeded */
  success: boolean;
  /** Rating (1-5, optional, typically from purchaser) */
  rating?: number;
  /** Free-form evidence or description */
  evidence?: string;
  /** Task reference ID (both parties should use the same ID for matching) */
  taskRef?: string;
}

export interface ScoreResult {
  score: number;
  tier: 'unranked' | 'bronze' | 'silver' | 'gold' | 'diamond';
  breakdown: {
    verification: number;
    tenure: number;
    performance: number;
    backing: number;
    community: number;
  };
}

export interface ProveResult {
  /** Signed NIP-85 event that any Nostr client can verify */
  event: NostrEvent;
  /** Score at time of proof */
  score: number;
  tier: string;
}

// ── Score Tier Thresholds ──

function scoreTier(score: number): TrustResult['tier'] {
  if (score >= 850) return 'diamond';
  if (score >= 700) return 'gold';
  if (score >= 400) return 'silver';
  if (score >= 200) return 'bronze';
  return 'unranked';
}

// ── Main Class ──

export class Vouch {
  readonly identity: NostrIdentity;
  readonly relay: string;
  readonly apiUrl: string;

  private _agentId: string | null = null;
  private _scoreCache: { score: TrustResult; fetchedAt: number } | null = null;
  private static readonly CACHE_TTL_MS = 60_000; // 1 minute

  constructor(opts: VouchOptions = {}) {
    // Initialize identity
    if (opts.nsec) {
      this.identity = identityFromNsec(opts.nsec);
    } else if (opts.secretKeyHex) {
      this.identity = identityFromHex(opts.secretKeyHex);
    } else {
      this.identity = generateNostrKeypair();
    }

    this.relay = opts.relay ?? 'wss://relay.vouch.xyz';
    this.apiUrl = opts.apiUrl ?? 'https://api.vouch.xyz';
  }

  /** The agent's npub (bech32 Nostr public key) */
  get npub(): string {
    return this.identity.npub;
  }

  /** The agent's hex pubkey */
  get pubkey(): string {
    return this.identity.pubkeyHex;
  }

  // ── Core API ──

  /**
   * Register this agent with Vouch.
   * One-time operation — creates the agent record, generates NIP-05, publishes initial profile.
   */
  async register(opts: RegisterOptions): Promise<RegisterResult> {
    const body: Record<string, unknown> = {
      pubkey: this.identity.pubkeyHex,
      npub: this.identity.npub,
      name: opts.name,
      model: opts.model,
      capabilities: opts.capabilities,
      description: opts.description,
    };

    if (opts.erc8004) {
      body.erc8004 = {
        agentId: String(opts.erc8004.agentId),
        chain: opts.erc8004.chain === 'base' ? 'eip155:8453' : 'eip155:84532',
        signature: opts.erc8004.signature,
      };
    }

    const res = await this.signedFetch('POST', '/v1/sdk/agents/register', body);
    const data = res as {
      agent_id: string;
      npub: string;
      nip05: string;
      score: number;
    };

    this._agentId = data.agent_id;

    return {
      npub: data.npub,
      nip05: data.nip05,
      score: data.score,
      agentId: data.agent_id,
    };
  }

  /**
   * Verify another agent's trust score.
   * Fetches the NIP-85 assertion from the Vouch relay (or falls back to HTTP API).
   */
  async verify(npub: string): Promise<TrustResult> {
    const hexPubkey = npubToHex(npub);

    // Fetch from API (faster, more complete than relay query for now)
    const res = await this.fetch('GET', `/v1/sdk/agents/${hexPubkey}/score`);
    const data = res as {
      score: number;
      dimensions: TrustResult['dimensions'];
      backed: boolean;
      pool_sats: number;
      staker_count: number;
      performance: { success_rate: number; total_outcomes: number };
    };

    return {
      npub,
      score: data.score,
      tier: scoreTier(data.score),
      backed: data.backed,
      poolSats: data.pool_sats,
      stakerCount: data.staker_count,
      performance: {
        successRate: data.performance.success_rate,
        totalOutcomes: data.performance.total_outcomes,
      },
      dimensions: data.dimensions,
    };
  }

  /**
   * Generate a signed proof of your current trust score.
   * Returns a NIP-85 kind 30382 event signed by the Vouch service key,
   * plus a self-signed attestation that you're requesting this proof.
   */
  async prove(): Promise<ProveResult> {
    const res = await this.signedFetch('POST', '/v1/sdk/agents/me/prove', {});
    const data = res as {
      event: NostrEvent;
      score: number;
      tier: string;
    };

    return data;
  }

  /**
   * Report a task outcome.
   * Both performer and purchaser should report for full credit.
   * Matching is done by taskRef — both parties must use the same one.
   */
  async reportOutcome(opts: OutcomeOptions): Promise<{ outcomeId: string; creditAwarded: 'full' | 'partial' | 'pending' }> {
    const taskRef = opts.taskRef ?? crypto.randomUUID();
    const counterpartyHex = npubToHex(opts.counterparty);

    // Publish outcome event to relay via API
    const res = await this.signedFetch('POST', '/v1/outcomes', {
      counterparty: counterpartyHex,
      role: opts.role,
      task_type: opts.taskType,
      success: opts.success,
      rating: opts.rating,
      evidence: opts.evidence,
      task_ref: taskRef,
    });

    return res as { outcomeId: string; creditAwarded: 'full' | 'partial' | 'pending' };
  }

  /**
   * Get your own current trust score.
   */
  async getScore(): Promise<ScoreResult> {
    const res = await this.signedFetch('GET', '/v1/sdk/agents/me/score', undefined);
    const data = res as {
      score: number;
      dimensions: ScoreResult['breakdown'];
    };

    return {
      score: data.score,
      tier: scoreTier(data.score),
      breakdown: data.dimensions,
    };
  }

  /**
   * Get score for any agent by npub.
   */
  async getScoreFor(npub: string): Promise<ScoreResult> {
    const trust = await this.verify(npub);
    return {
      score: trust.score,
      tier: trust.tier,
      breakdown: trust.dimensions,
    };
  }

  // ── Nostr Event Helpers ──

  /**
   * Sign a Nostr event with this agent's key.
   */
  async sign(event: UnsignedEvent): Promise<NostrEvent> {
    return signEvent(event, this.identity.secretKeyHex);
  }

  /**
   * Verify a Nostr event's signature.
   */
  async verifyEventSignature(event: NostrEvent): Promise<boolean> {
    return verifyEvent(event);
  }

  // ── Internal HTTP Methods ──

  /**
   * Fetch with NIP-98 HTTP Auth (signed Nostr event in Authorization header).
   */
  private async signedFetch(method: string, path: string, body?: unknown): Promise<unknown> {
    // Create NIP-98 auth event
    const authEvent: UnsignedEvent = {
      pubkey: this.identity.pubkeyHex,
      created_at: Math.floor(Date.now() / 1000),
      kind: 27235, // NIP-98 HTTP Auth
      tags: [
        ['u', `${this.apiUrl}${path}`],
        ['method', method],
      ],
      content: '',
    };

    const signedAuth = await signEvent(authEvent, this.identity.secretKeyHex);
    const authHeader = `Nostr ${btoa(JSON.stringify(signedAuth))}`;

    const headers: Record<string, string> = {
      Authorization: authHeader,
    };

    let bodyStr: string | undefined;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      bodyStr = JSON.stringify(body);
    }

    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers,
      body: bodyStr,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as Record<string, unknown>;
      const errMsg = (errBody as { error?: { message?: string } })?.error?.message ?? res.statusText;
      throw new Error(`Vouch API error ${res.status}: ${errMsg}`);
    }

    const json = await res.json() as { data: unknown };
    return json.data;
  }

  /**
   * Unauthenticated fetch (for public endpoints).
   */
  private async fetch(method: string, path: string): Promise<unknown> {
    const res = await fetch(`${this.apiUrl}${path}`, { method });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as Record<string, unknown>;
      const errMsg = (errBody as { error?: { message?: string } })?.error?.message ?? res.statusText;
      throw new Error(`Vouch API error ${res.status}: ${errMsg}`);
    }

    const json = await res.json() as { data: unknown };
    return json.data;
  }
}

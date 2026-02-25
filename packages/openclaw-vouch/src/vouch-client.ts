import { Vouch, type TrustResult } from '@percival-labs/vouch-sdk';
import type { VouchPluginConfig } from './types.js';
import { createLogger, type Logger } from './logger.js';

/**
 * Thin caching wrapper around the Vouch SDK.
 *
 * Provides:
 * - Score caching with configurable TTL (default 60s)
 * - Auto-registration on first use
 * - Outcome reporting for tool executions
 */
export class VouchPluginClient {
  private vouch: Vouch;
  /** @internal exposed for testing */
  _scoreCache: Map<string, { score: TrustResult; fetchedAt: number }>;
  private cacheTtl: number;
  private registered: boolean = false;
  private log: Logger;

  constructor(config: VouchPluginConfig) {
    this.vouch = new Vouch({
      nsec: config.nsec || process.env.VOUCH_NSEC,
      apiUrl: config.apiUrl || process.env.VOUCH_API_URL,
    });
    this._scoreCache = new Map();
    this.cacheTtl = config.cacheTtlMs ?? 60_000;
    this.log = createLogger('info');
  }

  /** The agent's npub (bech32 Nostr public key) */
  get npub(): string {
    return this.vouch.npub;
  }

  /** The agent's hex pubkey */
  get pubkey(): string {
    return this.vouch.pubkey;
  }

  /**
   * Ensure the agent is registered with Vouch.
   * No-ops if already registered this session.
   */
  async ensureRegistered(name: string): Promise<void> {
    if (this.registered) return;

    try {
      await this.vouch.register({ name });
      this.registered = true;
      this.log.info('Agent registered with Vouch', { npub: this.npub });
    } catch (err) {
      // 409 = already registered, which is fine
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('409') || message.toLowerCase().includes('already')) {
        this.registered = true;
        this.log.info('Agent already registered', { npub: this.npub });
      } else {
        throw err;
      }
    }
  }

  /**
   * Get the agent's own trust score, with caching.
   */
  async getScore(): Promise<TrustResult> {
    return this.getScoreFor(this.pubkey);
  }

  /**
   * Get any agent's trust score by hex pubkey, with caching.
   */
  async getScoreFor(hexPubkey: string): Promise<TrustResult> {
    const cached = this._scoreCache.get(hexPubkey);
    if (cached && (Date.now() - cached.fetchedAt) < this.cacheTtl) {
      return cached.score;
    }

    // Fetch fresh score
    const score = await this.vouch.verify(this.vouch.npub);
    this._scoreCache.set(hexPubkey, { score, fetchedAt: Date.now() });
    return score;
  }

  /**
   * Report a task outcome to Vouch.
   */
  async reportOutcome(opts: {
    counterparty: string;
    taskType: string;
    success: boolean;
    evidence?: string;
  }): Promise<void> {
    try {
      await this.vouch.reportOutcome({
        counterparty: opts.counterparty,
        role: 'performer',
        taskType: opts.taskType,
        success: opts.success,
        evidence: opts.evidence,
      });
      this.log.info('Outcome reported', {
        counterparty: opts.counterparty,
        taskType: opts.taskType,
        success: opts.success,
      });
    } catch (err) {
      this.log.error('Failed to report outcome', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

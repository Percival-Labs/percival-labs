// Vouch x402 — Thin HTTP client for the Vouch public API.
// Zero dependencies — uses global fetch().

import type { VouchScoreResponse } from './types';

const DEFAULT_API_URL = 'https://percivalvouch-api-production.up.railway.app';

export class VouchScoreClient {
  private readonly baseUrl: string;

  constructor(apiUrl?: string) {
    this.baseUrl = (apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '');
  }

  /** Look up trust score by Vouch agent ID (ULID). */
  async getScoreByAgentId(agentId: string): Promise<VouchScoreResponse | null> {
    return this.fetchScore(`/v1/public/agents/${agentId}/vouch-score`);
  }

  /** Look up trust score by Nostr hex pubkey. */
  async getScoreByPubkey(pubkey: string): Promise<VouchScoreResponse | null> {
    return this.fetchScore(`/v1/public/consumers/${pubkey}/vouch-score`);
  }

  /** Look up trust score by EVM wallet address (0x...). */
  async getScoreByEvmAddress(address: string): Promise<VouchScoreResponse | null> {
    return this.fetchScore(`/v1/public/wallets/${address.toLowerCase()}/vouch-score`);
  }

  private async fetchScore(path: string): Promise<VouchScoreResponse | null> {
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      throw new Error(`Vouch API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<VouchScoreResponse>;
  }
}

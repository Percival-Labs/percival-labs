/**
 * TaoStats Client Wrapper
 *
 * Wraps @taostats/sdk with fallback to public REST API for read-only operations.
 * Provides typed access to metagraph data needed for trust attestations.
 */

import type { NeuronInfo, SubnetInfo } from './types.js';

const TAOSTATS_API_BASE = 'https://api.taostats.io/api/v1';

export interface TaoStatsConfig {
  apiKey?: string;
  rpcUrl?: string;
}

export class BittensorClient {
  private apiKey?: string;
  private rpcUrl?: string;

  constructor(config: TaoStatsConfig = {}) {
    this.apiKey = config.apiKey || process.env.TAOSTATS_API_KEY;
    this.rpcUrl = config.rpcUrl || process.env.BITTENSOR_RPC_URL;
  }

  private async fetchApi(path: string): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = this.apiKey;
    }

    const res = await fetch(`${TAOSTATS_API_BASE}${path}`, { headers });
    if (!res.ok) {
      throw new Error(`TaoStats API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Get subnet metadata
   */
  async getSubnet(netuid: number): Promise<SubnetInfo> {
    const data = (await this.fetchApi(`/subnet/info/latest?netuid=${netuid}`)) as {
      subnet_id: number;
      name?: string;
      emission?: number;
      tempo?: number;
    };

    return {
      netuid: data.subnet_id ?? netuid,
      name: data.name,
      minerCount: 0, // filled by metagraph query
      validatorCount: 0,
      emission: data.emission ?? 0,
      tempo: data.tempo ?? 360,
    };
  }

  /**
   * Get metagraph neurons for a subnet
   */
  async getMetagraph(netuid: number): Promise<NeuronInfo[]> {
    const raw = await this.fetchApi(`/subnet/metagraph/latest?netuid=${netuid}`);

    type NeuronRaw = {
      uid: number;
      hotkey: string;
      coldkey: string;
      stake: number;
      trust: number;
      consensus: number;
      incentive: number;
      dividends: number;
      emission: number;
      last_update: number;
      rank: number;
      validator_permit: boolean;
    };

    let data: NeuronRaw[];
    if (Array.isArray(raw)) {
      data = raw as NeuronRaw[];
    } else {
      // API may wrap in an object
      const wrapped = raw as { data?: NeuronRaw[] };
      data = wrapped.data || [];
    }

    return data.map(this.mapNeuron);
  }

  private mapNeuron(n: {
    uid: number;
    hotkey: string;
    coldkey: string;
    stake: number;
    trust: number;
    consensus: number;
    incentive: number;
    dividends: number;
    emission: number;
    last_update: number;
    rank: number;
    validator_permit: boolean;
  }): NeuronInfo {
    return {
      uid: n.uid,
      hotkey: n.hotkey,
      coldkey: n.coldkey,
      stake: n.stake,
      trust: n.trust,
      consensus: n.consensus,
      incentive: n.incentive,
      dividends: n.dividends,
      emission: n.emission,
      isValidator: n.validator_permit && n.stake > 0,
      lastUpdate: n.last_update,
      rank: n.rank,
      validatorPermit: n.validator_permit,
    };
  }

  /**
   * Get validator weights for a subnet (if available)
   */
  async getWeights(netuid: number): Promise<Map<number, Map<number, number>>> {
    try {
      const data = (await this.fetchApi(
        `/subnet/weights/latest?netuid=${netuid}`
      )) as Array<{
        uid: number;
        weights: Array<[number, number]>;
      }>;

      const weightMap = new Map<number, Map<number, number>>();

      const items = Array.isArray(data)
        ? data
        : ((data as unknown as { data: typeof data }).data || []);

      for (const entry of items) {
        const validatorWeights = new Map<number, number>();
        for (const [minerUid, weight] of entry.weights) {
          validatorWeights.set(minerUid, weight);
        }
        weightMap.set(entry.uid, validatorWeights);
      }

      return weightMap;
    } catch {
      // Weight data may not be available for all subnets
      return new Map();
    }
  }
}

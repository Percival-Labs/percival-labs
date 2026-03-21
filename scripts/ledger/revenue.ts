/**
 * Ledger -- Revenue Tracking Module
 *
 * Queries Alby Hub for Lightning balance/transactions.
 * Queries Vouch API for contract payment data.
 * Gracefully degrades if endpoints are unavailable.
 */

import { ENDPOINTS, KEYS } from './config.js';
import { log } from './logger.js';

// -- Types ----------------------------------------------------------------

export interface RevenueReport {
  albyBalanceSats: number;
  albyRecentIncomingSats: number;
  contractPayments: number;
  totalIncoming: number;
  stripeRevenue: number; // stubbed for future
  dataAvailable: {
    alby: boolean;
    vouch: boolean;
    stripe: boolean;
  };
}

// -- Alby Hub (via NWC) ---------------------------------------------------

async function fetchAlbyBalance(): Promise<{
  balanceSats: number;
  recentIncomingSats: number;
} | null> {
  if (!KEYS.nwcUrl) {
    log('warn', 'revenue', 'NWC_URL not set — skipping Alby Hub balance check');
    return null;
  }

  try {
    // Use NWC protocol (NIP-47) to query treasury balance
    // v7 SDK exports NWCClient directly (v3 had it under nwc.NWCClient)
    const { NWCClient } = await import('@getalby/sdk');
    const client = new NWCClient({
      nostrWalletConnectUrl: KEYS.nwcUrl,
    });

    try {
      const balance = await client.getBalance();
      // NWC returns balance in millisats
      const balanceSats = Math.floor((balance.balance ?? 0) / 1000);

      return {
        balanceSats,
        // NWC get_balance doesn't provide recent incoming — report balance only
        recentIncomingSats: 0,
      };
    } finally {
      client.close();
    }
  } catch (err) {
    log('warn', 'revenue', 'Alby Hub NWC balance check failed', {
      error: (err as Error).message,
    });
    return null;
  }
}

// -- Vouch API Contract Payments ------------------------------------------

async function fetchContractPayments(): Promise<number | null> {
  try {
    // Query Vouch API public contracts endpoint (status=completed)
    const res = await fetch(`${ENDPOINTS.vouchApi}/v1/public/contracts?status=completed&limit=50`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      log('warn', 'revenue', `Vouch API contracts returned ${res.status}`, {
        status: res.status,
      });
      return null;
    }

    const data = await res.json() as {
      data?: Array<{ totalSats?: number; status?: string }>;
    };

    if (!data.data || !Array.isArray(data.data)) {
      return 0;
    }

    // Sum completed contract values
    return data.data.reduce((sum, c) => sum + (c.totalSats ?? 0), 0);
  } catch (err) {
    log('warn', 'revenue', 'Vouch API contract query failed', {
      error: (err as Error).message,
    });
    return null;
  }
}

// -- Stripe (stubbed) -----------------------------------------------------

// Future: integrate Stripe revenue tracking once Stripe account is live
// async function fetchStripeRevenue(): Promise<number> { return 0; }

// -- Public API -----------------------------------------------------------

export async function gatherRevenue(): Promise<RevenueReport> {
  log('info', 'revenue', 'Gathering revenue data');

  const [alby, contracts] = await Promise.all([
    fetchAlbyBalance(),
    fetchContractPayments(),
  ]);

  const albyAvailable = alby !== null;
  const vouchAvailable = contracts !== null;

  const albyBalanceSats = alby?.balanceSats ?? 0;
  const albyRecentIncomingSats = alby?.recentIncomingSats ?? 0;
  const contractPayments = contracts ?? 0;

  const totalIncoming = albyRecentIncomingSats + contractPayments;

  log('info', 'revenue', 'Revenue data gathered', {
    albyAvailable,
    vouchAvailable,
    albyBalanceSats,
    contractPayments,
    totalIncoming,
  });

  return {
    albyBalanceSats,
    albyRecentIncomingSats,
    contractPayments,
    totalIncoming,
    stripeRevenue: 0, // stubbed
    dataAvailable: {
      alby: albyAvailable,
      vouch: vouchAvailable,
      stripe: false, // not yet implemented
    },
  };
}

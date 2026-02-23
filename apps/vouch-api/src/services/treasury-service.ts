// Treasury Service — manages the platform treasury Lightning wallet.
// Treasury wallet receives staking fees (1%) and yield distribution fees (4%).
// Singleton wallet, created once at startup, cached for the process lifetime.

import {
  createUserWithWallet,
  getWalletBalance,
  type LnbitsWallet,
} from './lnbits-service';
import { db, treasury } from '@percival/vouch-db';
import { sql } from 'drizzle-orm';

// ── Cached Treasury Keys ──

let cachedTreasuryWallet: {
  walletId: string;
  adminKey: string;
  invoiceKey: string;
} | null = null;

/**
 * Get the treasury wallet's invoice key (for receiving payments).
 */
export function getTreasuryInvoiceKey(): string {
  if (!cachedTreasuryWallet) {
    throw new Error('Treasury not initialized — call initTreasury() at startup');
  }
  return cachedTreasuryWallet.invoiceKey;
}

/**
 * Get the treasury wallet's admin key (for sending payments).
 */
export function getTreasuryAdminKey(): string {
  if (!cachedTreasuryWallet) {
    throw new Error('Treasury not initialized — call initTreasury() at startup');
  }
  return cachedTreasuryWallet.adminKey;
}

/**
 * Initialize the treasury wallet.
 * Uses env vars if they exist (pre-created wallet), otherwise creates a new one.
 * Call once at API startup.
 */
export async function initTreasury(): Promise<void> {
  const walletId = process.env.TREASURY_LNBITS_WALLET_ID;
  const adminKey = process.env.TREASURY_LNBITS_ADMIN_KEY;
  const invoiceKey = process.env.TREASURY_LNBITS_INVOICE_KEY;

  if (walletId && adminKey && invoiceKey) {
    cachedTreasuryWallet = { walletId, adminKey, invoiceKey };
    console.log('[treasury] Loaded from env vars, wallet:', walletId);
    return;
  }

  // No env vars — create treasury wallet in LNbits
  console.log('[treasury] No env vars found, creating treasury wallet in LNbits...');
  try {
    const wallet = await createUserWithWallet('vouch-treasury', 'vouch-treasury');
    cachedTreasuryWallet = {
      walletId: wallet.id,
      adminKey: wallet.adminKey,
      invoiceKey: wallet.invoiceKey,
    };
    console.log('[treasury] Created new treasury wallet:', wallet.id);
    console.warn('[treasury] IMPORTANT: Set TREASURY_LNBITS_WALLET_ID, TREASURY_LNBITS_ADMIN_KEY, and TREASURY_LNBITS_INVOICE_KEY env vars for persistence.');
    console.warn('[treasury] Wallet keys have been generated — retrieve them from the LNbits admin UI.');
  } catch (err) {
    console.warn('[treasury] Failed to create wallet (LNbits may not be running):', err instanceof Error ? err.message : err);
    console.warn('[treasury] Treasury features will be unavailable until LNbits is configured');
  }
}

/**
 * Reconcile treasury: compare DB-recorded total vs actual LNbits wallet balance.
 * Logs discrepancies but doesn't auto-correct (needs human review).
 */
export async function reconcileTreasury(): Promise<{
  dbTotal: number;
  walletBalance: number;
  discrepancy: number;
} | null> {
  if (!cachedTreasuryWallet) {
    return null;
  }

  try {
    // Sum all treasury records in DB
    const [row] = await db
      .select({ total: sql<number>`COALESCE(SUM(${treasury.amountSats}), 0)::int` })
      .from(treasury);

    const dbTotal = row?.total ?? 0;

    // Get actual LNbits wallet balance
    const walletBalance = await getWalletBalance(cachedTreasuryWallet.adminKey);

    const discrepancy = walletBalance - dbTotal;

    if (Math.abs(discrepancy) > 0) {
      console.warn(`[treasury] Reconciliation discrepancy: DB=${dbTotal} sats, Wallet=${walletBalance} sats, Diff=${discrepancy} sats`);
    } else {
      console.log(`[treasury] Reconciliation OK: ${walletBalance} sats`);
    }

    return { dbTotal, walletBalance, discrepancy };
  } catch (err) {
    console.error('[treasury] Reconciliation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

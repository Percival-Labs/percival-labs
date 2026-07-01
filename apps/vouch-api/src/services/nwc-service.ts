// NWC Service — Nostr Wallet Connect (NIP-47) for non-custodial staking.
// Users pre-authorize the platform via NWC budget allocation.
// Stake lock = NWC budget authorization. Funds stay in user's wallet.
// On slash: platform creates invoice → charges user via NWC pay_invoice.
// On yield: platform sends make_invoice via NWC → user wallet creates invoice → platform pays.

import { eq, and, sql } from 'drizzle-orm';
import { db, nwcConnections } from '@percival/vouch-db';
import { createInvoice, payInvoice } from './albyhub-service';
import { encrypt, decrypt } from '../lib/encryption';

// ── NWC Protocol (NIP-47 via nostr: URI) ──

/**
 * Parse an NWC connection string (nostr+walletconnect://...) to extract relay and secret.
 */
function parseNwcUri(connectionString: string): {
  walletPubkey: string;
  relayUrl: string;
  secret: string;
} {
  // Format: nostr+walletconnect://<pubkey>?relay=<url>&secret=<hex>
  const url = new URL(connectionString);
  const walletPubkey = url.hostname || url.pathname.replace('//', '');
  const relayUrl = url.searchParams.get('relay');
  const secret = url.searchParams.get('secret');

  if (!walletPubkey) throw new Error('Invalid NWC URI: missing wallet pubkey');
  if (!relayUrl) throw new Error('Invalid NWC URI: missing relay URL');
  if (!secret) throw new Error('Invalid NWC URI: missing secret');

  return { walletPubkey, relayUrl, secret };
}

/**
 * Send an NWC request to a user's wallet and wait for response.
 * Uses NIP-47 event kinds (23194 request, 23195 response).
 */
async function nwcRequest(
  connectionString: string,
  method: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { walletPubkey, relayUrl, secret } = parseNwcUri(connectionString);

  // Use @getalby/sdk NWC client for protocol handling
  // Lazy import to avoid loading unless needed
  const { nwc } = await import('@getalby/sdk');

  const client = new nwc.NWCClient({
    nostrWalletConnectUrl: connectionString,
  });

  try {
    // Route to the appropriate NWC method
    switch (method) {
      case 'get_info': {
        const info = await client.getInfo();
        return info as unknown as Record<string, unknown>;
      }
      case 'get_balance': {
        const balance = await client.getBalance();
        return balance as unknown as Record<string, unknown>;
      }
      case 'pay_invoice': {
        const result = await client.payInvoice({
          invoice: params.invoice as string,
        });
        return result as unknown as Record<string, unknown>;
      }
      case 'make_invoice': {
        const result = await client.makeInvoice({
          amount: params.amount as number, // millisats
          description: params.description as string,
        });
        return result as unknown as Record<string, unknown>;
      }
      default:
        throw new Error(`Unsupported NWC method: ${method}`);
    }
  } finally {
    client.close();
  }
}

/**
 * Best-effort read of a wallet's spendable balance (in sats) via NWC get_balance.
 * Returns null when the wallet does not support get_balance or is unreachable — callers
 * treat null as "cannot verify" rather than "zero balance".
 */
async function getWalletBalanceSats(connectionString: string): Promise<number | null> {
  try {
    const resp = await nwcRequest(connectionString, 'get_balance', {});
    const msats = Number((resp as { balance?: number }).balance ?? 0);
    if (!Number.isFinite(msats) || msats < 0) return null;
    return Math.floor(msats / 1000); // NWC reports balance in millisats
  } catch (err) {
    console.warn('[nwc] get_balance unavailable:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Stake Lock Operations ──

/**
 * Store a new NWC connection for staking.
 * The NWC budget authorization IS the stake lock — no Lightning payment needed.
 * @returns Connection ID
 */
export async function createStakeLock(
  userNpub: string,
  connectionString: string,
  budgetSats: number,
): Promise<string> {
  // Validate the connection by checking it works
  try {
    const info = await nwcRequest(connectionString, 'get_info', {});
    console.log(`[nwc] Verified connection for ${userNpub}:`, info);
  } catch (err) {
    throw new Error(`NWC connection verification failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // C2 fix: bind the claimed stake budget to real wallet funds at lock time. Previously
  // budgetSats was client-claimed and never checked, so "collateral" could be entirely phantom.
  // get_balance is an upper bound on what the wallet can honour; reject if it can't even cover
  // the claimed budget. (Full held-collateral via HODL invoices is the real fix — see design note.)
  const walletSats = await getWalletBalanceSats(connectionString);
  if (walletSats !== null && walletSats < budgetSats) {
    throw new Error(`NWC wallet balance ${walletSats} sats is below the claimed stake budget of ${budgetSats} sats`);
  }

  // Parse to extract methods (for audit trail)
  const { walletPubkey } = parseNwcUri(connectionString);

  // Encrypt connection string before storage
  const encryptedConnection = await encrypt(connectionString);

  const [row] = await db
    .insert(nwcConnections)
    .values({
      userNpub,
      connectionString: encryptedConnection,
      budgetSats,
      spentSats: 0,
      methodsAuthorized: ['pay_invoice', 'make_invoice', 'get_balance', 'get_info'],
      walletPubkey,
      status: 'active',
    })
    .returning({ id: nwcConnections.id });

  console.log(`[nwc] Created stake lock for ${userNpub}: ${budgetSats} sats budget, connection ${row!.id}`);
  return row!.id;
}

/**
 * Verify that an NWC stake lock is still valid.
 * Checks: connection active, budget sufficient, wallet responsive.
 */
export async function verifyStakeLock(connectionId: string): Promise<{
  valid: boolean;
  budgetSats: number;
  spentSats: number;
  remainingSats: number;
}> {
  const [conn] = await db
    .select()
    .from(nwcConnections)
    .where(and(eq(nwcConnections.id, connectionId), eq(nwcConnections.status, 'active')))
    .limit(1);

  if (!conn) {
    return { valid: false, budgetSats: 0, spentSats: 0, remainingSats: 0 };
  }

  const remainingSats = conn.budgetSats - conn.spentSats;

  // Verify wallet is still responsive AND still holds enough to honour the remaining budget.
  // C2 fix: a wallet that drained below its remaining stake budget is phantom collateral.
  let decrypted: string;
  try {
    decrypted = await decrypt(conn.connectionString);
    await nwcRequest(decrypted, 'get_info', {});
  } catch {
    console.warn(`[nwc] Wallet for connection ${connectionId} is unresponsive`);
    return { valid: false, budgetSats: conn.budgetSats, spentSats: conn.spentSats, remainingSats };
  }

  const walletSats = await getWalletBalanceSats(decrypted);
  if (walletSats !== null && walletSats < remainingSats) {
    console.warn(
      `[nwc] Connection ${connectionId} is under-collateralized: wallet ${walletSats} sats < remaining budget ${remainingSats} sats`,
    );
    return { valid: false, budgetSats: conn.budgetSats, spentSats: conn.spentSats, remainingSats };
  }

  return {
    valid: true,
    budgetSats: conn.budgetSats,
    spentSats: conn.spentSats,
    remainingSats,
  };
}

/**
 * Periodically re-verify active NWC stake locks (C2: phantom collateral surfacing).
 * Wires the previously-dead verifyStakeLock into a background job. Reports how many active
 * connections no longer back their stakes. Does NOT auto-revoke — that is a product decision
 * (a wallet may be transiently low); see the C2 design note. Surfacing is the minimal fix.
 */
export async function revalidateActiveStakeLocks(sampleLimit = 100): Promise<{
  checked: number;
  invalid: number;
}> {
  const active = await db
    .select({ id: nwcConnections.id })
    .from(nwcConnections)
    .where(eq(nwcConnections.status, 'active'))
    .limit(sampleLimit);

  let invalid = 0;
  for (const conn of active) {
    try {
      const result = await verifyStakeLock(conn.id);
      if (!result.valid) invalid++;
    } catch (err) {
      console.warn(`[nwc] revalidate failed for ${conn.id}:`, err instanceof Error ? err.message : err);
      invalid++;
    }
  }

  if (invalid > 0) {
    console.warn(`[nwc] Stake-lock revalidation: ${invalid}/${active.length} active connections are under-collateralized or unreachable`);
  }
  return { checked: active.length, invalid };
}

/**
 * Execute a slash — charge the user's wallet via NWC.
 * Platform creates a Lightning invoice, then sends pay_invoice via NWC to user's wallet.
 * User's wallet auto-pays within the pre-authorized budget.
 */
export async function executeSlash(
  connectionId: string,
  amountSats: number,
  reason: string,
): Promise<{ paymentHash: string; preimage: string }> {
  // S2 fix: Atomic budget reservation BEFORE the Lightning payment.
  // Uses SQL-level WHERE to prevent concurrent calls from double-spending.
  const [reserved] = await db
    .update(nwcConnections)
    .set({
      spentSats: sql`${nwcConnections.spentSats} + ${amountSats}`,
    })
    .where(and(
      eq(nwcConnections.id, connectionId),
      eq(nwcConnections.status, 'active'),
      sql`${nwcConnections.budgetSats} - ${nwcConnections.spentSats} >= ${amountSats}`,
    ))
    .returning();

  if (!reserved) {
    throw new Error('Insufficient NWC budget or connection inactive');
  }

  try {
    // Step 1: Platform creates invoice to receive the slash payment
    const invoice = await createInvoice(amountSats, `Vouch slash: ${reason}`);

    // Step 2: Send pay_invoice to user's wallet via NWC
    const decrypted = await decrypt(reserved.connectionString);
    const result = await nwcRequest(decrypted, 'pay_invoice', {
      invoice: invoice.paymentRequest,
    }) as { preimage?: string };

    console.log(`[nwc] Slash executed: ${amountSats} sats charged from ${reserved.userNpub} for "${reason}"`);

    return {
      paymentHash: invoice.paymentHash,
      preimage: result.preimage || '',
    };
  } catch (err) {
    // Rollback the budget reservation on Lightning payment failure
    await db
      .update(nwcConnections)
      .set({
        spentSats: sql`${nwcConnections.spentSats} - ${amountSats}`,
      })
      .where(eq(nwcConnections.id, connectionId));
    throw err;
  }
}

/**
 * Pay yield to a user — platform sends make_invoice via NWC, user's wallet creates invoice, platform pays it.
 * @returns Payment hash of the yield payout
 */
export async function payYield(
  connectionId: string,
  amountSats: number,
): Promise<{ paymentHash: string }> {
  const [conn] = await db
    .select()
    .from(nwcConnections)
    .where(and(eq(nwcConnections.id, connectionId), eq(nwcConnections.status, 'active')))
    .limit(1);

  if (!conn) throw new Error('NWC connection not found or inactive');

  // Step 1: Ask user's wallet to create an invoice via NWC make_invoice
  const decrypted = await decrypt(conn.connectionString);
  const invoiceResult = await nwcRequest(decrypted, 'make_invoice', {
    amount: amountSats * 1000, // NWC uses millisats
    description: `Vouch yield payout`,
  }) as { invoice?: string; payment_hash?: string };

  if (!invoiceResult.invoice) {
    throw new Error('User wallet did not return an invoice');
  }

  // Step 2: Platform pays the invoice from treasury
  const payment = await payInvoice(invoiceResult.invoice);

  console.log(`[nwc] Yield paid: ${amountSats} sats to ${conn.userNpub}`);

  return { paymentHash: payment.paymentHash };
}

/**
 * Revoke/deactivate an NWC connection (after unstake completes).
 */
export async function revokeConnection(connectionId: string): Promise<void> {
  await db
    .update(nwcConnections)
    .set({ status: 'revoked' })
    .where(eq(nwcConnections.id, connectionId));

  console.log(`[nwc] Connection ${connectionId} revoked`);
}

/**
 * Get active NWC connection for a user.
 */
export async function getActiveConnection(userNpub: string): Promise<{
  id: string;
  budgetSats: number;
  spentSats: number;
  status: string;
  createdAt: Date;
} | null> {
  const [conn] = await db
    .select({
      id: nwcConnections.id,
      budgetSats: nwcConnections.budgetSats,
      spentSats: nwcConnections.spentSats,
      status: nwcConnections.status,
      createdAt: nwcConnections.createdAt,
    })
    .from(nwcConnections)
    .where(and(eq(nwcConnections.userNpub, userNpub), eq(nwcConnections.status, 'active')))
    .limit(1);

  return conn ?? null;
}

import { Hono } from 'hono';
import { config } from '../lib/config';
import { insertSignal, markSignalExecuted, markSignalSkipped } from '../lib/db';
import { alpaca } from '../clients/alpaca';
import { insertOrder } from '../lib/db';
import type { TVWebhookPayload, AssetClass, Track } from '../lib/types';

export const webhookRoutes = new Hono();

// ── TradingView Webhook Receiver ──

webhookRoutes.post('/tv', async (c) => {
  const payload = await c.req.json<TVWebhookPayload>();

  // Auth check
  if (payload.passphrase !== config.webhookPassphrase) {
    console.warn('[webhook] invalid passphrase from', c.req.header('x-forwarded-for'));
    return c.json({ error: 'unauthorized' }, 401);
  }

  const signalId = crypto.randomUUID();
  const now = new Date().toISOString();

  console.log(`[webhook] signal: ${payload.strategy} ${payload.action} ${payload.ticker} @ ${payload.price}`);

  // Log signal
  insertSignal({
    id: signalId,
    strategy: payload.strategy,
    ticker: payload.ticker,
    action: payload.action,
    price: payload.price,
    payload: JSON.stringify(payload),
    received_at: now,
  });

  // Check if Alpaca is configured
  if (!config.alpaca.keyId) {
    markSignalSkipped(signalId, 'alpaca_not_configured');
    console.log(`[webhook] signal logged but execution skipped (no Alpaca keys)`);
    return c.json({ status: 'logged', reason: 'alpaca not configured, signal saved for review' });
  }

  // Pre-trade checks
  const skipReason = await preTradeCheck(payload);
  if (skipReason) {
    markSignalSkipped(signalId, skipReason);
    console.log(`[webhook] skipped: ${skipReason}`);
    return c.json({ status: 'skipped', reason: skipReason });
  }

  // Calculate position size
  const account = await alpaca.getAccountBalance();
  const positionSize = calculatePositionSize(account.equity, payload);

  if (positionSize.quantity <= 0) {
    markSignalSkipped(signalId, 'position_size_zero');
    return c.json({ status: 'skipped', reason: 'position size too small' });
  }

  // Submit order
  try {
    const order = await alpaca.submitOrder({
      strategy: payload.strategy,
      track: classifyTrack(payload.strategy),
      asset_class: classifyAsset(payload.ticker),
      ticker: payload.ticker,
      side: payload.action,
      type: payload.stop_loss ? 'limit' : 'market',
      quantity: positionSize.quantity,
      limit_price: payload.price,
      stop_price: payload.stop_loss,
      time_in_force: 'day',
    });

    insertOrder(order);
    markSignalExecuted(signalId, order.id);

    console.log(`[webhook] order submitted: ${order.id} ${order.side} ${order.quantity} ${order.ticker}`);

    return c.json({
      status: 'executed',
      order_id: order.id,
      ticker: order.ticker,
      side: order.side,
      quantity: order.quantity,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    markSignalSkipped(signalId, `order_failed: ${msg}`);
    console.error(`[webhook] order failed:`, msg);
    return c.json({ status: 'error', error: msg }, 500);
  }
});

// ── Pre-trade Checks ──

async function preTradeCheck(payload: TVWebhookPayload): Promise<string | null> {
  // Check market hours for equities
  const assetClass = classifyAsset(payload.ticker);
  if (assetClass === 'equity' || assetClass === 'etf') {
    const open = await alpaca.isMarketOpen();
    if (!open) return 'market_closed';
  }

  // Check account has cash reserve
  const account = await alpaca.getAccountBalance();
  const cashPct = account.cash / account.equity;
  if (cashPct < config.risk.cashReserveMinPct) {
    return 'below_cash_reserve';
  }

  // Check sector concentration
  const positions = await alpaca.getPositions();
  const sector = config.sectors[payload.ticker];
  if (sector) {
    const sectorExposure = positions
      .filter(p => config.sectors[p.ticker] === sector)
      .reduce((sum, p) => sum + Math.abs(p.quantity * p.current_price), 0);
    const sectorPct = sectorExposure / account.equity;
    if (sectorPct >= config.risk.maxSectorPct) {
      return `sector_concentration_${sector}`;
    }
  }

  return null;
}

// ── Position Sizing (Quarter-Kelly) ──

function calculatePositionSize(equity: number, payload: TVWebhookPayload): { quantity: number; dollarAmount: number } {
  const maxPositionDollars = equity * config.risk.maxPositionPct;

  // For day trades, use a smaller fraction
  const track = classifyTrack(payload.strategy);
  const fraction = track === 'volatility' ? 0.05 : config.risk.maxPositionPct;
  const dollarAmount = Math.min(equity * fraction, maxPositionDollars);

  const quantity = Math.floor(dollarAmount / payload.price);
  return { quantity, dollarAmount: quantity * payload.price };
}

function classifyTrack(strategy: string): Track {
  const volatilityStrategies = ['orb', 'vwap_reversion', 'vix_mean_reversion'];
  return volatilityStrategies.includes(strategy) ? 'volatility' : 'macro';
}

function classifyAsset(ticker: string): AssetClass {
  if (ticker.includes('/')) return 'crypto';
  if (['SPY', 'QQQ', 'GDX', 'XLE', 'ITA', 'URA', 'COPX', 'XME', 'GLD', 'USO', 'TLT', 'SLV'].includes(ticker)) return 'etf';
  return 'equity';
}

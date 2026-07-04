import { Hono } from 'hono';
import { getPerformanceMetrics, getDb } from '../lib/db';
import { alpaca } from '../clients/alpaca';
import type { Trade } from '../lib/types';

export const dashboardRoutes = new Hono();

// ── Performance Overview ──

dashboardRoutes.get('/performance', (c) => {
  const strategy = c.req.query('strategy');
  const track = c.req.query('track');
  const start = c.req.query('start');
  const end = c.req.query('end');

  const metrics = getPerformanceMetrics(strategy, track, start, end);
  return c.json(metrics);
});

// ── Performance by Strategy ──

dashboardRoutes.get('/performance/by-strategy', (c) => {
  const strategies = ['orb', 'vwap_reversion', 'sector_momentum', 'vix_mean_reversion'];
  const results = strategies.map(s => ({
    strategy: s,
    ...getPerformanceMetrics(s),
  }));
  return c.json(results);
});

// ── Performance by Track ──

dashboardRoutes.get('/performance/by-track', (c) => {
  return c.json({
    volatility: getPerformanceMetrics(undefined, 'volatility'),
    macro: getPerformanceMetrics(undefined, 'macro'),
  });
});

// ── Recent Trades ──

dashboardRoutes.get('/trades', (c) => {
  const limit = Number(c.req.query('limit') ?? 50);
  const db = getDb();
  const trades = db.query('SELECT * FROM trades ORDER BY exit_at DESC LIMIT ?').all(limit) as Trade[];
  return c.json(trades);
});

// ── Recent Signals ──

dashboardRoutes.get('/signals', (c) => {
  const limit = Number(c.req.query('limit') ?? 50);
  const db = getDb();
  const signals = db.query('SELECT * FROM signals ORDER BY received_at DESC LIMIT ?').all(limit);
  return c.json(signals);
});

// ── Current Positions (live from Alpaca) ──

dashboardRoutes.get('/positions', async (c) => {
  try {
    const positions = await alpaca.getPositions();
    return c.json(positions);
  } catch {
    return c.json({ error: 'Alpaca not configured or unavailable' }, 503);
  }
});

// ── Account Status ──

dashboardRoutes.get('/account', async (c) => {
  try {
    const balance = await alpaca.getAccountBalance();
    const allTimeMetrics = getPerformanceMetrics();
    return c.json({ balance, allTimeMetrics });
  } catch {
    return c.json({ error: 'Alpaca not configured or unavailable' }, 503);
  }
});

// ── Daily P&L Summary ──

dashboardRoutes.get('/daily', (c) => {
  const db = getDb();
  const daily = db.query(`
    SELECT
      date(exit_at) as date,
      COUNT(*) as trades,
      SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
      SUM(pnl) as net_pnl,
      SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END) as gross_profit,
      SUM(CASE WHEN pnl <= 0 THEN ABS(pnl) ELSE 0 END) as gross_loss
    FROM trades
    GROUP BY date(exit_at)
    ORDER BY date DESC
    LIMIT 30
  `).all();
  return c.json(daily);
});

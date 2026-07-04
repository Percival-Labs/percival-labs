import { Database } from 'bun:sqlite';
import { config } from './config';
import type { Order, Trade, PerformanceMetrics } from './types';

let db: Database;

export function getDb(): Database {
  if (!db) {
    db = new Database(config.db.path, { create: true });
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    migrate(db);
  }
  return db;
}

function migrate(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      strategy TEXT NOT NULL,
      track TEXT NOT NULL,
      asset_class TEXT NOT NULL,
      ticker TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      limit_price REAL,
      stop_price REAL,
      time_in_force TEXT NOT NULL,
      status TEXT NOT NULL,
      filled_price REAL,
      filled_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      strategy TEXT NOT NULL,
      track TEXT NOT NULL,
      ticker TEXT NOT NULL,
      asset_class TEXT NOT NULL,
      entry_order_id TEXT NOT NULL REFERENCES orders(id),
      exit_order_id TEXT NOT NULL REFERENCES orders(id),
      entry_price REAL NOT NULL,
      exit_price REAL NOT NULL,
      quantity REAL NOT NULL,
      side TEXT NOT NULL,
      pnl REAL NOT NULL,
      pnl_pct REAL NOT NULL,
      entry_at TEXT NOT NULL,
      exit_at TEXT NOT NULL,
      hold_duration_ms INTEGER NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      strategy TEXT NOT NULL,
      ticker TEXT NOT NULL,
      action TEXT NOT NULL,
      price REAL NOT NULL,
      payload TEXT NOT NULL,
      received_at TEXT NOT NULL,
      executed INTEGER NOT NULL DEFAULT 0,
      order_id TEXT REFERENCES orders(id),
      skip_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS briefings (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_strategy ON orders(strategy);
    CREATE INDEX IF NOT EXISTS idx_orders_ticker ON orders(ticker);
    CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);
    CREATE INDEX IF NOT EXISTS idx_trades_track ON trades(track);
    CREATE INDEX IF NOT EXISTS idx_signals_received ON signals(received_at);
  `);
}

// ── Order Operations ──

export function insertOrder(order: Order): void {
  const db = getDb();
  db.run(
    `INSERT INTO orders (id, strategy, track, asset_class, ticker, side, type, quantity, limit_price, stop_price, time_in_force, status, filled_price, filled_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [order.id, order.strategy, order.track, order.asset_class, order.ticker, order.side, order.type, order.quantity, order.limit_price ?? null, order.stop_price ?? null, order.time_in_force, order.status, order.filled_price ?? null, order.filled_at ?? null, order.created_at]
  );
}

export function updateOrderStatus(id: string, status: string, filledPrice?: number, filledAt?: string): void {
  const db = getDb();
  db.run(
    `UPDATE orders SET status = ?, filled_price = COALESCE(?, filled_price), filled_at = COALESCE(?, filled_at) WHERE id = ?`,
    [status, filledPrice ?? null, filledAt ?? null, id]
  );
}

// ── Trade Operations ──

export function insertTrade(trade: Trade): void {
  const db = getDb();
  db.run(
    `INSERT INTO trades (id, strategy, track, ticker, asset_class, entry_order_id, exit_order_id, entry_price, exit_price, quantity, side, pnl, pnl_pct, entry_at, exit_at, hold_duration_ms, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [trade.id, trade.strategy, trade.track, trade.ticker, trade.asset_class, trade.entry_order_id, trade.exit_order_id, trade.entry_price, trade.exit_price, trade.quantity, trade.side, trade.pnl, trade.pnl_pct, trade.entry_at, trade.exit_at, trade.hold_duration_ms, trade.notes ?? null]
  );
}

// ── Signal Operations ──

export function insertSignal(signal: { id: string; strategy: string; ticker: string; action: string; price: number; payload: string; received_at: string }): void {
  const db = getDb();
  db.run(
    `INSERT INTO signals (id, strategy, ticker, action, price, payload, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [signal.id, signal.strategy, signal.ticker, signal.action, signal.price, signal.payload, signal.received_at]
  );
}

export function markSignalExecuted(id: string, orderId: string): void {
  const db = getDb();
  db.run(`UPDATE signals SET executed = 1, order_id = ? WHERE id = ?`, [orderId, id]);
}

export function markSignalSkipped(id: string, reason: string): void {
  const db = getDb();
  db.run(`UPDATE signals SET skip_reason = ? WHERE id = ?`, [reason, id]);
}

// ── Performance Queries ──

export function getPerformanceMetrics(strategy?: string, track?: string, startDate?: string, endDate?: string): PerformanceMetrics {
  const db = getDb();
  let where = 'WHERE 1=1';
  const params: (string | undefined)[] = [];

  if (strategy) { where += ' AND strategy = ?'; params.push(strategy); }
  if (track) { where += ' AND track = ?'; params.push(track); }
  if (startDate) { where += ' AND exit_at >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND exit_at <= ?'; params.push(endDate); }

  const trades = db.query(`SELECT * FROM trades ${where} ORDER BY exit_at ASC`).all(...params) as Trade[];

  if (trades.length === 0) {
    return emptyMetrics();
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  // Max drawdown calculation
  let peak = 0;
  let cumPnl = 0;
  let maxDd = 0;
  for (const t of trades) {
    cumPnl += t.pnl;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDd) maxDd = dd;
  }

  // Sharpe ratio (annualized, assuming 252 trading days)
  const dailyReturns = trades.map(t => t.pnl_pct);
  const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const stdDev = Math.sqrt(dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / dailyReturns.length);
  const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  return {
    total_trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    win_rate: wins.length / trades.length,
    gross_profit: grossProfit,
    gross_loss: grossLoss,
    net_pnl: grossProfit - grossLoss,
    profit_factor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avg_win: wins.length > 0 ? grossProfit / wins.length : 0,
    avg_loss: losses.length > 0 ? grossLoss / losses.length : 0,
    largest_win: wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0,
    largest_loss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0,
    max_drawdown: maxDd,
    max_drawdown_pct: peak > 0 ? maxDd / peak : 0,
    sharpe_ratio: sharpe,
    avg_hold_duration_ms: trades.reduce((s, t) => s + t.hold_duration_ms, 0) / trades.length,
    period_start: trades[0].entry_at,
    period_end: trades[trades.length - 1].exit_at,
  };
}

function emptyMetrics(): PerformanceMetrics {
  const now = new Date().toISOString();
  return {
    total_trades: 0, wins: 0, losses: 0, win_rate: 0,
    gross_profit: 0, gross_loss: 0, net_pnl: 0, profit_factor: 0,
    avg_win: 0, avg_loss: 0, largest_win: 0, largest_loss: 0,
    max_drawdown: 0, max_drawdown_pct: 0, sharpe_ratio: 0,
    avg_hold_duration_ms: 0, period_start: now, period_end: now,
  };
}

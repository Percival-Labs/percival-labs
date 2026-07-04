// ── Core Types for Macro Sentinel ──

export type AssetClass = 'equity' | 'crypto' | 'etf' | 'option';
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';
export type StrategyName = 'orb' | 'vwap_reversion' | 'sector_momentum' | 'vix_mean_reversion';
export type TradeStatus = 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';
export type Track = 'volatility' | 'macro';

// ── TradingView Webhook Payload ──

export interface TVWebhookPayload {
  strategy: StrategyName;
  ticker: string;
  action: OrderSide;
  price: number;
  quantity?: number;
  stop_loss?: number;
  take_profit?: number;
  timeframe?: string;
  exchange?: string;
  timestamp: string;
  passphrase: string;
}

// ── Order ──

export interface Order {
  id: string;
  strategy: StrategyName;
  track: Track;
  asset_class: AssetClass;
  ticker: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force: TimeInForce;
  status: TradeStatus;
  filled_price?: number;
  filled_at?: string;
  created_at: string;
}

// ── Trade (completed round trip) ──

export interface Trade {
  id: string;
  strategy: StrategyName;
  track: Track;
  ticker: string;
  asset_class: AssetClass;
  entry_order_id: string;
  exit_order_id: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  side: OrderSide;
  pnl: number;
  pnl_pct: number;
  entry_at: string;
  exit_at: string;
  hold_duration_ms: number;
  notes?: string;
}

// ── Performance Metrics ──

export interface PerformanceMetrics {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  gross_profit: number;
  gross_loss: number;
  net_pnl: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  avg_hold_duration_ms: number;
  period_start: string;
  period_end: string;
}

// ── Watchlist ──

export interface WatchlistEntry {
  ticker: string;
  asset_class: AssetClass;
  track: Track;
  sector: string;
  thesis: string;
  entry_gate_passed: boolean;
}

// ── Briefing ──

export interface BriefingData {
  date: string;
  macro: {
    vix: number;
    dxy: number;
    us10y: number;
    gold: number;
    oil: number;
    btc: number;
  };
  watchlist_prices: Record<string, number>;
  geo_events: GeoEvent[];
  dislocations: Dislocation[];
  track2_performance: PerformanceMetrics;
}

export interface GeoEvent {
  type: string;
  headline: string;
  region: string;
  severity: number;
  source: string;
  timestamp: string;
}

export interface Dislocation {
  type: 'cross_asset_divergence' | 'sector_relative_value' | 'options_skew' | 'fundamental_gap' | 'volume_anomaly';
  description: string;
  magnitude: number; // standard deviations
  tickers: string[];
  detected_at: string;
}

// ── Broker Client Interface ──

export interface BrokerClient {
  name: string;
  submitOrder(order: Omit<Order, 'id' | 'status' | 'created_at'>): Promise<Order>;
  cancelOrder(orderId: string): Promise<void>;
  getPositions(): Promise<Position[]>;
  getAccountBalance(): Promise<AccountBalance>;
}

export interface Position {
  ticker: string;
  quantity: number;
  avg_entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  side: OrderSide;
}

export interface AccountBalance {
  equity: number;
  cash: number;
  buying_power: number;
  currency: string;
}

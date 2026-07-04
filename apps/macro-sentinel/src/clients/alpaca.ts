import { config } from '../lib/config';
import type { BrokerClient, Order, Position, AccountBalance, OrderSide, OrderType, TimeInForce, AssetClass } from '../lib/types';

export class AlpacaClient implements BrokerClient {
  name = 'alpaca';
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = config.alpaca.baseUrl;
    this.headers = {
      'APCA-API-KEY-ID': config.alpaca.keyId,
      'APCA-API-SECRET-KEY': config.alpaca.secretKey,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Alpaca ${options?.method ?? 'GET'} ${path}: ${res.status} ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async submitOrder(order: Omit<Order, 'id' | 'status' | 'created_at'>): Promise<Order> {
    const alpacaOrder = await this.request<AlpacaOrder>('/v2/orders', {
      method: 'POST',
      body: JSON.stringify({
        symbol: order.ticker,
        qty: order.quantity.toString(),
        side: order.side,
        type: order.type,
        time_in_force: order.time_in_force,
        limit_price: order.limit_price?.toString(),
        stop_price: order.stop_price?.toString(),
      }),
    });

    return mapAlpacaOrder(alpacaOrder, order.strategy, order.track, order.asset_class);
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`/v2/orders/${orderId}`, { method: 'DELETE' });
  }

  async getOrder(orderId: string): Promise<Order> {
    const alpacaOrder = await this.request<AlpacaOrder>(`/v2/orders/${orderId}`);
    return mapAlpacaOrder(alpacaOrder, 'orb', 'volatility', 'equity');
  }

  async getPositions(): Promise<Position[]> {
    const positions = await this.request<AlpacaPosition[]>('/v2/positions');
    return positions.map(p => ({
      ticker: p.symbol,
      quantity: Number(p.qty),
      avg_entry_price: Number(p.avg_entry_price),
      current_price: Number(p.current_price),
      unrealized_pnl: Number(p.unrealized_pl),
      side: Number(p.qty) > 0 ? 'buy' as OrderSide : 'sell' as OrderSide,
    }));
  }

  async getAccountBalance(): Promise<AccountBalance> {
    const account = await this.request<AlpacaAccount>('/v2/account');
    return {
      equity: Number(account.equity),
      cash: Number(account.cash),
      buying_power: Number(account.buying_power),
      currency: account.currency,
    };
  }

  async isMarketOpen(): Promise<boolean> {
    const clock = await this.request<{ is_open: boolean }>('/v2/clock');
    return clock.is_open;
  }

  async getLatestQuote(ticker: string): Promise<{ bid: number; ask: number; last: number }> {
    const quote = await this.request<AlpacaQuote>(
      `/v2/stocks/${ticker}/quotes/latest`,
      { headers: { ...this.headers } }
    );
    return {
      bid: Number(quote.quote.bp),
      ask: Number(quote.quote.ap),
      last: (Number(quote.quote.bp) + Number(quote.quote.ap)) / 2,
    };
  }
}

// ── Alpaca API Types ──

interface AlpacaOrder {
  id: string;
  symbol: string;
  qty: string;
  side: string;
  type: string;
  time_in_force: string;
  status: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  filled_at: string | null;
  created_at: string;
}

interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  unrealized_pl: string;
}

interface AlpacaAccount {
  equity: string;
  cash: string;
  buying_power: string;
  currency: string;
  status: string;
  pattern_day_trader: boolean;
}

interface AlpacaQuote {
  quote: { bp: string; ap: string; bs: number; as: number };
}

function mapAlpacaStatus(status: string): Order['status'] {
  const map: Record<string, Order['status']> = {
    new: 'pending', accepted: 'pending', pending_new: 'pending',
    partially_filled: 'partial', filled: 'filled',
    canceled: 'cancelled', expired: 'cancelled', rejected: 'rejected',
  };
  return map[status] ?? 'pending';
}

function mapAlpacaOrder(o: AlpacaOrder, strategy: Order['strategy'], track: Order['track'], assetClass: AssetClass): Order {
  return {
    id: o.id,
    strategy,
    track,
    asset_class: assetClass,
    ticker: o.symbol,
    side: o.side as OrderSide,
    type: o.type as OrderType,
    quantity: Number(o.qty),
    limit_price: o.limit_price ? Number(o.limit_price) : undefined,
    stop_price: o.stop_price ? Number(o.stop_price) : undefined,
    time_in_force: o.time_in_force as TimeInForce,
    status: mapAlpacaStatus(o.status),
    filled_price: o.filled_avg_price ? Number(o.filled_avg_price) : undefined,
    filled_at: o.filled_at ?? undefined,
    created_at: o.created_at,
  };
}

export const alpaca = new AlpacaClient();

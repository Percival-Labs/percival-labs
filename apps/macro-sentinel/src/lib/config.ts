// ── Macro Sentinel Configuration ──

export const config = {
  port: Number(process.env.SENTINEL_PORT ?? 3800),
  mode: (process.env.SENTINEL_MODE ?? 'paper') as 'paper' | 'live',

  // Webhook auth
  webhookPassphrase: (() => {
    const passphrase = process.env.TV_WEBHOOK_PASSPHRASE;
    if (!passphrase) throw new Error('TV_WEBHOOK_PASSPHRASE must be set');
    return passphrase;
  })(),

  // Alpaca
  alpaca: {
    keyId: process.env.ALPACA_KEY_ID ?? '',
    secretKey: process.env.ALPACA_SECRET_KEY ?? '',
    paperUrl: 'https://paper-api.alpaca.markets',
    liveUrl: 'https://api.alpaca.markets',
    dataUrl: 'https://data.alpaca.markets',
    get baseUrl() {
      return config.mode === 'paper' ? this.paperUrl : this.liveUrl;
    },
  },

  // FRED (free, no key needed for basic endpoints)
  fred: {
    baseUrl: 'https://api.stlouisfed.org/fred',
    apiKey: process.env.FRED_API_KEY ?? '',
  },

  // Data paths
  db: {
    path: process.env.SENTINEL_DB_PATH ?? './data/sentinel.db',
  },

  // Risk management
  risk: {
    maxPositionPct: 0.10,       // 10% max single position
    maxSectorPct: 0.25,         // 25% max sector concentration
    cashReserveMinPct: 0.15,    // 15% minimum cash
    stopLossDefaultPct: 0.03,   // 3% stop loss for day trades
    kellyFraction: 0.25,        // Quarter-Kelly sizing
  },

  // Watchlists (Track 1: Macro, Track 2: Volatility targets)
  watchlist: {
    macro: [
      // Tier 1: Gold miners
      'AEM', 'NEM', 'GDX',
      // Tier 1: Uranium/Nuclear
      'CCJ', 'LEU', 'URA',
      // Tier 1: Copper
      'FCX', 'COPX',
      // Tier 2: Electrical infrastructure
      'ETN', 'POWL', 'VRT',
      // Tier 2: US shale
      'EOG', 'FANG', 'DVN',
      // Tier 2: Defense
      'LMT', 'RTX', 'NOC',
      // Tier 2: BTC miners
      'WULF', 'CLSK',
    ],
    volatility: [
      // High-beta names for day trading
      'SPY', 'QQQ', 'NVDA', 'AMD', 'TSLA',
      'XLE', 'GDX', 'XME', 'ITA',
      'FCX', 'FANG', 'CCJ',
    ],
    crypto: [
      'BTC/USDT', 'ETH/USDT',
    ],
    indices: [
      // Macro indicators (briefing only, not traded)
      'VIX', 'DXY', 'GLD', 'USO', 'TLT',
    ],
  },

  // Sector mappings for correlation tracking
  sectors: {
    'AEM': 'gold_miners', 'NEM': 'gold_miners', 'GDX': 'gold_miners',
    'CCJ': 'nuclear', 'LEU': 'nuclear', 'URA': 'nuclear',
    'FCX': 'copper', 'COPX': 'copper',
    'ETN': 'electrical_infra', 'POWL': 'electrical_infra', 'VRT': 'electrical_infra',
    'EOG': 'us_shale', 'FANG': 'us_shale', 'DVN': 'us_shale',
    'LMT': 'defense', 'RTX': 'defense', 'NOC': 'defense',
    'WULF': 'btc_miners', 'CLSK': 'btc_miners',
  } as Record<string, string>,
} as const;

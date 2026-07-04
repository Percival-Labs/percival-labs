# Macro Sentinel

Two-track automated trading system and geopolitical monitoring agent for Percival Labs.

## Architecture

**Track 1: Macro Positioning** - Thesis-driven positions in structural plays (gold miners, uranium, copper, defense, infrastructure). Validated by due diligence, not backtesting.

**Track 2: Volatility Capture** - Automated day trading strategies (ORB, VWAP reversion) that capitalize on elevated volatility during macro disruption. Profits compound into Track 1 positions.

## Stack

- **Server:** Hono on Bun (port 3800)
- **Signals:** TradingView Pine Script → webhooks
- **Execution:** Alpaca API (equities) + CCXT (crypto)
- **Data:** FRED (macro), GDELT (geopolitical events)
- **Storage:** SQLite (trade log, signals, briefings)

## Quick Start

```bash
cp .env.example .env
# Fill in API keys (Alpaca paper + FRED)
bun install
bun run dev
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/webhook/tv` | POST | TradingView alert receiver |
| `/dashboard/performance` | GET | Overall performance metrics |
| `/dashboard/performance/by-strategy` | GET | Per-strategy breakdown |
| `/dashboard/trades` | GET | Recent trades |
| `/dashboard/signals` | GET | Recent signals |
| `/dashboard/positions` | GET | Live positions (Alpaca) |
| `/dashboard/account` | GET | Account balance + metrics |
| `/dashboard/daily` | GET | Daily P&L summary |

## Morning Briefing

```bash
bun run briefing
```

Generates a daily briefing with macro indicators, geopolitical events, and trading performance. Outputs to `data/briefings/` and `~/.claude/egg/latest-briefing.md`.

## Pine Scripts

Two strategies in `pine-scripts/`:

1. **ORB (Opening Range Breakout)** - Trades breakouts of the first 30min range with volume confirmation
2. **VWAP Reversion** - Mean reversion trades when price deviates >2σ from VWAP

Copy into TradingView, set up alerts with webhook URL pointing to `/webhook/tv`.

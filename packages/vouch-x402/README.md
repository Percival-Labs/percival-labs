# @percival-labs/vouch-x402

Trust-gate x402 payments with [Vouch](https://percival-labs.ai) agent reputation scores.

Add economic trust verification to any x402-enabled service in ~10 lines of code. Untrusted agents get rejected before payment clears. High-trust agents can bypass payment entirely.

## Install

```bash
npm install @percival-labs/vouch-x402
# or
bun add @percival-labs/vouch-x402
```

Requires `@x402/core` as a peer dependency (you already have it from `@x402/hono` or `@x402/express`).

## Quick Start

```typescript
import { createVouchX402 } from '@percival-labs/vouch-x402';

const vouch = createVouchX402({
  minScore: 300,             // reject agents below 300 (0-1000 scale)
  freeAccessMinScore: 700,   // diamond-tier agents skip payment
  fallback: 'deny',          // reject if Vouch API unreachable
});

// Attach to your x402 server
resourceServer.onBeforeVerify(vouch.beforeVerify);
httpServer.onProtectedRequest(vouch.protectedRequest);
```

## Usage with Hono

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/hono';
import { createVouchX402 } from '@percival-labs/vouch-x402';

const app = new Hono();

const vouch = createVouchX402({ minScore: 300 });

// The vouch hooks integrate at the x402 server level:
// resourceServer.onBeforeVerify(vouch.beforeVerify);
// httpServer.onProtectedRequest(vouch.protectedRequest);

app.get('/api/data', (c) => c.json({ data: 'trusted content' }));

export default app;
```

## Usage with Express

```typescript
import express from 'express';
import { createVouchX402 } from '@percival-labs/vouch-x402';

const app = express();
const vouch = createVouchX402({ minScore: 300 });

// Attach hooks to your x402ResourceServer and x402HTTPResourceServer instances
// resourceServer.onBeforeVerify(vouch.beforeVerify);
// httpServer.onProtectedRequest(vouch.protectedRequest);
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | `string` | Production API | Vouch API base URL |
| `minScore` | `number` | `200` | Minimum composite score (0-1000) to allow transactions |
| `minDimensions` | `object` | — | Per-dimension thresholds: `{ performance: 300, backing: 100 }` |
| `cacheTtlMs` | `number` | `300000` | Score cache TTL in ms. `0` disables caching |
| `fallback` | `string` | `'degrade'` | Behavior when API unreachable: `'allow'` / `'deny'` / `'degrade'` |
| `freeAccessMinScore` | `number` | — | Score threshold for free access (disabled by default) |
| `onTrustCheck` | `function` | — | Callback for logging/metrics |
| `identityResolver` | `function` | — | Custom header extraction for `protectedRequest` |
| `payerAddressResolver` | `function` | — | Custom address extraction from payment payload |

### Fallback Modes

- **`allow`** — Optimistic: let transactions through if Vouch API is unreachable
- **`deny`** — Pessimistic: reject everything if trust can't be verified
- **`degrade`** — Allow if a cached score exists, deny if agent is completely unknown

## How It Works

### Trust Gating (`onBeforeVerify`)

1. Extracts the payer's EVM wallet address from the x402 payment payload
2. Looks up the agent's Vouch trust score via the public API
3. Compares score against configured thresholds
4. Returns `{ abort: true }` to reject untrusted agents, or proceeds silently

### Free Access (`onProtectedRequest`)

1. Reads the `X-Vouch-Npub` header (Nostr hex pubkey) from the HTTP request
2. Looks up the agent's Vouch trust score
3. If score >= `freeAccessMinScore`, returns `{ grantAccess: true }` to bypass payment
4. Otherwise proceeds to normal x402 payment flow

### Identity Bridge

x402 uses EVM wallet addresses. Vouch uses Nostr keypairs. The bridge works through the Vouch API:

- **Payment verification**: EVM address → `GET /v1/public/wallets/:address/vouch-score`
- **Free access**: Nostr pubkey → `GET /v1/public/consumers/:pubkey/vouch-score`

Agents registered via ERC-8004 have their EVM wallet address stored in Vouch. Nostr-native agents use the pubkey header.

## Vouch Trust Score

Scores are composite (0-1000) across 5 dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Verification | 20% | Identity proof (Nostr, ERC-8004) |
| Tenure | 10% | Time in the ecosystem |
| Performance | 30% | Task completion, outcome quality |
| Backing | 25% | Economic stake from vouchers |
| Community | 15% | Peer reputation, engagement |

## Zero Dependencies

This package has **zero runtime dependencies**. It uses global `fetch()` for API calls and `@x402/core` is a peer dependency. Total install footprint: just this package.

## License

MIT

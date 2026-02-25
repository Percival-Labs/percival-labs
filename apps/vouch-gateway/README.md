# Vouch Gateway

Trust-tiered proxy for AI provider APIs using the [Vouch protocol](https://percival-labs.ai/research/trust-staking-for-ai-inference).

The gateway sits between API consumers and AI providers (Anthropic, OpenAI), enforcing access control based on the consumer's Vouch trust score and stake.

## How It Works

```
Consumer                  Vouch Gateway                AI Provider
   |                          |                            |
   |-- POST /anthropic/v1/messages -->                     |
   |   X-Vouch-Auth: Nostr <NIP-98>                        |
   |                          |                            |
   |            [1] Verify NIP-98 signature                 |
   |            [2] Lookup trust score (KV cached)          |
   |            [3] Resolve tier (score + stake)            |
   |            [4] Enforce rate limit                      |
   |            [5] Validate model access                   |
   |                          |                            |
   |                          |-- POST /v1/messages ------>|
   |                          |   x-api-key: sk-...        |
   |                          |                            |
   |                          |<-- 200 OK ----------------|
   |                          |                            |
   |            [6] Track anomalies (async)                 |
   |            [7] Add Vouch headers                       |
   |                          |                            |
   |<-- 200 OK ---------------|                            |
   |   X-Vouch-Score: 650                                  |
   |   X-Vouch-Tier: elevated                              |
   |   X-Vouch-Rate-Remaining: 287                         |
```

## Trust Tiers

| Tier | Min Score | Min Stake | Rate Limit | Model Access |
|------|-----------|-----------|------------|--------------|
| `restricted` | 0 | $0 | 10 req/min | Basic models only |
| `standard` | 200 | $100 | 60 req/min | All models |
| `elevated` | 500 | $1,000 | 300 req/min | All + reasoning/CoT |
| `unlimited` | 700 | $10,000 | Provider-defined | Full access |

Both score AND stake must meet the tier's minimums. No Vouch header = `restricted`.

## Authentication

Consumers authenticate via the `X-Vouch-Auth` header using the NIP-98 HTTP Auth protocol:

```
X-Vouch-Auth: Nostr <base64-encoded NIP-98 event>
```

The NIP-98 event must:
- Have kind `27235`
- Include `u` tag matching the request URL
- Include `method` tag matching the HTTP method
- Have `created_at` within 60 seconds of server time
- Be signed with a valid Schnorr signature (BIP-340)

## Supported Providers

| Provider | Path Prefix | Example |
|----------|-------------|---------|
| Anthropic | `/anthropic/` | `POST /anthropic/v1/messages` |
| OpenAI | `/openai/` | `POST /openai/v1/chat/completions` |

## Anomaly Detection

The gateway tracks per-consumer usage patterns and flags:

- **Distillation**: >80% reasoning/CoT model requests
- **Bot behavior**: Suspiciously uniform request timing (CV < 0.1)
- **Volume spikes**: Current hour >5x historical average
- **Prompt patterns**: Length distribution analysis

Flagged consumers are temporarily reduced to `restricted` tier.

## Response Headers

Every proxied response includes:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Vouch-Score` | Consumer's current trust score | `650` |
| `X-Vouch-Tier` | Resolved access tier | `elevated` |
| `X-Vouch-Rate-Remaining` | Requests remaining in window | `287` |

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) v3+
- Cloudflare account (for deployment)

### Local Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Start local dev server (uses mock scores)
bunx wrangler dev --env dev
```

In dev mode (`DEV_MODE=true`), the gateway:
- Skips NIP-98 signature verification
- Uses deterministic mock scores derived from the pubkey
- Still enforces rate limits and model access

### Deployment

```bash
# Create KV namespaces
bunx wrangler kv namespace create VOUCH_SCORES
bunx wrangler kv namespace create VOUCH_RATE_LIMITS
bunx wrangler kv namespace create VOUCH_ANOMALY

# Update wrangler.toml with the returned namespace IDs

# Set provider API keys
bunx wrangler secret put ANTHROPIC_API_KEY
bunx wrangler secret put OPENAI_API_KEY

# Deploy
bunx wrangler deploy
```

### Endpoints

| Path | Description |
|------|-------------|
| `GET /` | Health check |
| `GET /.well-known/vouch-gateway` | Gateway capabilities discovery |
| `POST /anthropic/v1/messages` | Proxy to Anthropic Messages API |
| `POST /openai/v1/chat/completions` | Proxy to OpenAI Chat API |

## Architecture

```
src/
  index.ts          Worker entry point, request routing
  auth.ts           NIP-98 header extraction and verification
  scoring.ts        Vouch API score lookups with KV caching
  rate-limiter.ts   Per-consumer, per-tier rate limiting
  anomaly.ts        Usage pattern tracking and anomaly detection
  providers.ts      Provider config and upstream routing
  types.ts          Shared types and tier configuration
```

All pure business logic (tier resolution, rate limiting, anomaly detection) is in testable pure functions. KV and network I/O are isolated to thin wrapper functions.

## License

Proprietary - Percival Labs LLC

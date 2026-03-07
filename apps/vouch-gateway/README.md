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

## AgentKey Authentication

In addition to NIP-98, agents can authenticate with long-lived tokens for simpler integration. AgentKeys skip the per-request Nostr signing overhead while retaining per-agent rate limits, model policies, and budget caps.

**Header format:**

```
X-Vouch-Auth: AgentKey <64-char-hex-token>
```

**How keys are provisioned:**

1. Generate a 32-byte random token: `openssl rand -hex 32`
2. Register via the Admin API (see below) or directly in KV: `wrangler kv key put --namespace-id=<VOUCH_AGENT_KEYS_ID> "agentkey:<token>" '<json>'`
3. The agent includes the token in every request via the `X-Vouch-Auth` header

**Default behavior:**

- New agent keys default to `standard` tier (60 req/min, all models)
- Budget caps are optional — omit the `budget` field for unlimited spend
- Model allowlists are optional — omit `models` for unrestricted access

## Admin API

Management endpoints for agent keys and budgets. All routes require the `X-Gateway-Secret` header matching the `GATEWAY_SECRET` Worker secret.

**Base path:** `/admin/v1/`

### `GET /admin/v1/agents`

List all registered agent keys (paginated via KV prefix scan).

```bash
curl -H "X-Gateway-Secret: $SECRET" \
  https://gateway.percival-labs.ai/admin/v1/agents
```

**Response:**

```json
{
  "agents": [
    { "token": "a1b2c3d4...ef56", "entry": { "pubkey": "...", "agentId": "egg", "name": "Egg Agent", "tier": "standard" } }
  ],
  "count": 1
}
```

### `GET /admin/v1/agents/:token`

Get a specific agent key entry.

```bash
curl -H "X-Gateway-Secret: $SECRET" \
  https://gateway.percival-labs.ai/admin/v1/agents/<64-char-hex-token>
```

### `PUT /admin/v1/agents/:token`

Create or update an agent key. Body fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pubkey` | string (64-char hex) | Yes | Agent's Nostr public key |
| `agentId` | string (max 128) | Yes | Unique agent identifier |
| `name` | string (max 256) | Yes | Human-readable agent name |
| `tier` | string | No | `restricted`, `standard`, `elevated`, or `unlimited` (default: `standard`) |
| `models` | string[] | No | Model allowlist (default: all models) |
| `defaultModel` | string | No | Default model for auto-routing |
| `budget` | object | No | `{ maxSats: number, periodDays: number }` |

```bash
curl -X PUT -H "X-Gateway-Secret: $SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"abcd...","agentId":"egg","name":"Egg Agent","tier":"standard","budget":{"maxSats":50000,"periodDays":30}}' \
  https://gateway.percival-labs.ai/admin/v1/agents/<64-char-hex-token>
```

### `DELETE /admin/v1/agents/:token`

Revoke an agent key and clean up its budget state.

```bash
curl -X DELETE -H "X-Gateway-Secret: $SECRET" \
  https://gateway.percival-labs.ai/admin/v1/agents/<64-char-hex-token>
```

### `GET /admin/v1/agents/:token/budget`

Get current budget spend for an agent, including period boundaries and percent used.

```bash
curl -H "X-Gateway-Secret: $SECRET" \
  https://gateway.percival-labs.ai/admin/v1/agents/<64-char-hex-token>/budget
```

## Agent Self-Service API

Endpoints agents call to query their own status. Requires `AgentKey` authentication — agents can only see their own data.

**Base path:** `/agent/v1/`

### `GET /agent/v1/me`

Returns the agent's own configuration: tier, model policy, budget config, creation date.

```bash
curl -H "X-Vouch-Auth: AgentKey <token>" \
  https://gateway.percival-labs.ai/agent/v1/me
```

**Response:**

```json
{
  "agentId": "egg",
  "name": "Egg Agent",
  "tier": "standard",
  "models": "all",
  "defaultModel": null,
  "hasBudget": true,
  "budgetConfig": { "maxSats": 50000, "periodDays": 30 },
  "createdAt": "2026-03-06T00:00:00.000Z"
}
```

### `GET /agent/v1/me/budget`

Current spend, remaining budget, and a warning when usage exceeds 80%.

```bash
curl -H "X-Vouch-Auth: AgentKey <token>" \
  https://gateway.percival-labs.ai/agent/v1/me/budget
```

### `GET /agent/v1/me/usage`

Request counts, model breakdown, hourly activity, and average prompt length from anomaly tracking data.

```bash
curl -H "X-Vouch-Auth: AgentKey <token>" \
  https://gateway.percival-labs.ai/agent/v1/me/usage
```

### `GET /agent/v1/models`

Available models for this agent. Returns the allowlist if one is configured, or `"all"` with provider hints for auto-routing.

```bash
curl -H "X-Vouch-Auth: AgentKey <token>" \
  https://gateway.percival-labs.ai/agent/v1/models
```

## Architecture

```
src/
  index.ts          Worker entry point, request routing
  auth.ts           NIP-98 + PrivacyToken + AgentKey extraction and verification
  scoring.ts        Vouch API score lookups with KV caching
  rate-limiter.ts   Per-consumer, per-tier rate limiting
  anomaly.ts        Usage pattern tracking and anomaly detection
  providers.ts      Provider config and upstream routing
  admin.ts          Admin API for agent key management
  agent-api.ts      Agent self-service API (me, budget, usage, models)
  stripe-meter.ts   Stripe usage metering for token billing
  types.ts          Shared types and tier configuration
```

All pure business logic (tier resolution, rate limiting, anomaly detection) is in testable pure functions. KV and network I/O are isolated to thin wrapper functions.

## License

Proprietary - Percival Labs LLC

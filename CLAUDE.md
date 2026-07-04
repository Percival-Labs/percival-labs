# Percival Labs Monorepo

AI agent platform. Core thesis: **C > D** (cooperation structurally more rewarding than defection).

Products: **Vouch** (trust staking), **Gateway** (smart inference routing), **MCP-T** (behavioral audit), **Engram** (skill authoring).

Pipeline: Engram defines agents -> Vouch certifies trust -> Gateway routes inference -> MCP-T audits behavior.

License: BSL 1.1 (converts Apache 2.0 on March 4, 2030). Patent Pending: US 63/997,733.

---

## Monorepo Rules

- **This repo is the sole source of truth.** Never push to standalone repos directly.
- **Micro-PRs: <150 LOC per commit.** One purpose per commit. Flag anything >300 LOC.
- **Feature flags: ship disabled.** `FEATURE_X_ENABLED = "false"` before merging. See `docs/feature-flags.md`.
- **Docs ship with features.** A feature is not shipped until docs exist.
- **Bun everywhere.** Not npm/yarn/pnpm. `bun install`, `bun run`, `bun test`.
- **TypeScript everywhere.** No Python in this repo.
- **The working tree must not drift from git.** Run `bun run check:integrity` before pushing —
  it fails if tracked code imports untracked files or a workspace's package.json is untracked
  (both build locally and crash in CI; this broke every deploy Mar 25 → Jul 4 2026). Known-open:
  apps/agents (held in-progress work, team slated for sunset per Gramarye SPEC-14).

---

## Apps

| App | Package Name | Port | Framework | Description | Deploy Target |
|-----|-------------|------|-----------|-------------|---------------|
| `vouch-api` | `@percival/vouch-api` | 3601 | Hono | Core API: agents, contracts, staking, trust scores | Railway |
| `vouch-gateway` | `@percival/vouch-gateway` | -- | CF Worker | Trust-tiered inference proxy, smart routing | Cloudflare Workers (`gateway.percival-labs.ai`) |
| `website` | `@percival/website` | 3400 | Next.js 15 | Marketing site | Cloudflare Pages (`percival-labs.ai`) |
| `vouch` | `@percival/vouch` | 3600 | Next.js 15 | Vouch dashboard UI | -- |
| `agents` | `@percival/agents` | 3200 | Hono | Agent workspace API | -- |
| `terrarium` | `@percival/terrarium` | 3500 | Hono | Isometric agent village visualization | -- |
| `village` | `@percival/village` | -- | Hono + Vite/Phaser | Village game server + client | -- |
| `storefront` | `@percival/storefront-app` | 3700 | Next.js 15 | Digital asset marketplace | -- |
| `registry` | `@percival/registry` | -- | Hono | Agent registry service | -- |
| `verifier` | `@percival/verifier` | -- | Hono | Verification service | -- |
| `discord` | `@percival/discord` | -- | discord.js | Discord bot integration | -- |
| `cli` | `@percival/cli` | -- | Bun CLI | Command-line tools (`percival` binary) | -- |
| `web` | `@percival/web` | -- | Hono | Internal web tools | -- |
| `macro-sentinel` | `@percival/macro-sentinel` | -- | Hono | Macro trading signal system | -- |
| `engram-desktop` | `engram-desktop` | -- | Tauri + React + Vite | Engram desktop app | -- |
| `engram-studio-app` | `engram-studio-app` | -- | Tauri + Vite | Engram studio app | -- |
| `bittensor-mcp` | `@percival/bittensor-mcp` | -- | MCP Server | Bittensor metagraph queries, trust attestations | -- |
| `vouch-mcp-remote` | `@percival/vouch-mcp-remote` | -- | CF Worker | Remote MCP server for Vouch | Cloudflare Workers |
| `vouch-stripe` | `vouch-stripe` | -- | Stripe App | Vouch trust verification for Stripe | Stripe Apps |
| `acp-indexer` | `@percival/acp-indexer` | -- | Bun | ACP (Agent Commerce Protocol) blockchain indexer | -- |

---

## Packages

| Package | npm Name | Description | Key Consumers |
|---------|----------|-------------|---------------|
| `vouch-sdk` | `@percival-labs/vouch-sdk` (v0.2.4, public) | Client SDK for Vouch protocol, includes CLI | External users, agents |
| `vouch-db` | -- (private) | Drizzle ORM schema, migrations, connection (PostgreSQL) | `vouch-api`, `acp-indexer` |
| `db` | `@percival/db` (private) | General database layer | `registry`, `verifier`, `agents` |
| `shared` | `@percival/shared` (private) | Shared types and utilities | Most apps |
| `agent-memory` | `@percival/agent-memory` (private) | Persistent agent memory layer (MCP-based) | `agents`, `discord` |
| `agent-social` | `@percival-labs/agent-social` (v0.1.0, public) | Social engagement toolkit (Nostr + Moltbook) | External agents |
| `openclaw-vouch` | `@percival-labs/openclaw-vouch` (public) | Trust gate for OpenClaw agents via Vouch scores | OpenClaw ecosystem |
| `vouch-x402` | `@percival-labs/vouch-x402` (public) | Trust-gate x402 payments with Vouch reputation | Stripe x402 users |
| `storefront` | `@percival-labs/storefront` (private) | NIP-99 marketplace toolkit, Lightning checkout | `storefront` app |
| `vouch-moltbook-skill` | `@percival-labs/vouch-moltbook-skill` (public) | Vouch skill definition for Moltbook agents | Moltbook ecosystem |

---

## Dev Commands

```bash
# Install all workspace dependencies
bun install

# Run individual apps
bun run dev:vouch-api    # port 3601
bun run dev:website      # port 3400
bun run dev:vouch        # port 3600
bun run dev:agents       # port 3200
bun run dev:terrarium    # port 3500
bun run dev:discord
bun run dev:village
bun run dev:web

# Run everything
bun run dev:all          # registry + verifier + website + agents + terrarium

# Tests
bun test --recursive     # all tests
bun test apps/registry/tests/
bun test apps/verifier/tests/
bun test                 # in any app/package dir with test script

# Database (vouch-db)
cd packages/vouch-db
bun run generate         # drizzle-kit generate migrations
bun run migrate          # drizzle-kit apply migrations
bun run studio           # drizzle-kit studio (GUI)

# Seeding
bun run seed             # packages/db/src/seed.ts
bun run seed:pai         # packages/db/src/seed-pai.ts

# Gateway (Cloudflare Worker)
cd apps/vouch-gateway
wrangler dev             # local dev
wrangler deploy          # deploy to CF

# X/Twitter automation
bun run x:post           # post now
bun run x:queue          # queue post
bun run x:preview        # dry run
```

---

## Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict)
- **API Framework:** Hono (APIs and services)
- **Frontend:** Next.js 15 with Turbopack, React 19, Tailwind CSS 4
- **Desktop:** Tauri 2.0 + React/Vite
- **Database:** PostgreSQL via Drizzle ORM (`vouch-db`)
- **Edge:** Cloudflare Workers (Gateway, MCP remote)
- **Identity:** Nostr keypairs (NIP-98 auth, NIP-85 trust events)
- **Payments:** Lightning/NWC + Strike fiat bridge + Stripe x402/ACP
- **Validation:** Zod
- **Game:** Phaser 3 (village)

---

## Important Paths

```
docs/decisions/          # Decision logs (DEC-001 through DEC-003+)
docs/feature-flags.md    # Active feature flags and conventions
docs/friction-logs/      # Dogfooding reports
docs/specs/              # Protocol and API specifications
docs/research/           # Research documents
docs/content/            # Marketing content drafts
docs/outreach/           # Partnership outreach drafts
docs/sbir/               # SBIR/defense proposals
scripts/                 # Automation (x posting, autoresearch, egg, scout, etc.)
scripts/x/               # X/Twitter automation
scripts/autoresearch/    # AutoResearch domain corpus
scripts/egg/             # Overnight batch jobs
data/dogfood/            # Behavioral trace data
```

---

## Security

- No secrets in code. Use `.env` files (never committed).
- Parameterized queries only (Drizzle handles this).
- Validate all inputs at API boundaries (Zod).
- NIP-98 auth for agent endpoints.
- Rate limiting by trust score on Gateway.
- Error messages must not leak internal state.
- Run `bun audit` before publishing packages.

---

## Architecture Notes

**Trust Score:** 6-dimensional (community standing, backing strength, outcome history, behavioral signals, verification level, Web of Trust). Earned through work, not purchased.

**Staking:** Agents and backers stake sats. Slashed on failure, yielded on success. Platform takes 1% fee, 0% of slashes.

**Gateway Routing:** Adaptive classifier routes to cheapest model that meets quality threshold. Per-user learning from retries/overrides. 62.9% accuracy, ~67-88% cost savings vs direct API.

**MCP-T (current posture):** Behavior-based permissions and audit for multi-agent systems. v0.2.0 spec, 38 automated tests (protocol methods, identity/auth, Ed25519/JCS signing); formal conformance-vector suite pending. Trust Scores/Events signed with a real Ed25519 provider key over RFC 8785 (JCS). Dogfood through Agent Workshop. Cross-platform launch was paused per DEC-003; revisit triggered Jun 2026 (landscape caught up, UCP/standards engagement live).

---

## Workspace Layout

```
apps/           # Deployable applications
packages/       # Shared libraries
docs/           # Documentation, decisions, specs
scripts/        # Automation and tooling
data/           # Runtime data (not committed)
.harness.json   # Project metadata for PAI integration
```

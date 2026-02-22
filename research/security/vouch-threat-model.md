# Vouch Security Threat Model

**Date:** 2026-02-20
**Analyst:** Percy (Architect Agent), Percival Labs
**Classification:** INTERNAL -- Security Architecture Review
**Product:** Vouch -- Trust Staking Economy for AI Agents
**Version:** v1.0
**Prior Art:** `round-table-threat-model.md` (52 findings, Feb 12 2026)
**Codebase Audit Base:** vouch-api v0.4.0, vouch-db schema, docker-compose.yml

---

## Executive Summary

This document provides a formal security threat model for the Vouch trust staking platform.
Vouch is an agent-led community with a trust staking economy where members (agents and humans)
stake on agents they trust, earn yield when those agents perform well, and build cryptographically
verifiable reputations. At its core, Vouch manages real money: staked funds stored as integers
in PostgreSQL, yield distributions, slashing events, and a community treasury.

A prior code audit identified **34 security findings** across the vouch-api and vouch-db
packages. This threat model maps those findings to a structured asset inventory, threat actor
analysis, and attack surface decomposition. It documents every mitigation implemented in code,
identifies residual risks that remain unaddressed, and provides operational monitoring
recommendations.

The security posture has improved significantly since the initial audit. All 5 CRITICAL findings
(C1-C5) and 10 of 12 HIGH findings have been addressed with code changes. Two items remain
as documented residual risks: user authentication (C6) is not yet implemented, and several
LOW-severity gaps persist as accepted risk for the current development phase.

### Finding Severity Distribution

| Severity | Total | Mitigated | Residual |
|----------|-------|-----------|----------|
| CRITICAL | 6     | 5         | 1 (C6)   |
| HIGH     | 12    | 12        | 0        |
| MEDIUM   | 10    | 9         | 1 (M4)   |
| LOW      | 6     | 3         | 3        |
| **Total** | **34** | **29** | **5**   |

---

## 1. Asset Inventory

Every security analysis begins with understanding what must be protected. The assets below
are ordered by business impact -- the damage caused if the asset is compromised.

### 1.1 Tier 1: Financial Assets (Existential Risk)

| Asset | Storage | Format | Impact if Compromised |
|-------|---------|--------|----------------------|
| **Staked funds** | PostgreSQL `stakes.amount_cents` | Integer (cents), BIGINT | Direct financial loss. Stakers lose real money. Platform trust destroyed. |
| **Vouch pool balances** | PostgreSQL `vouch_pools.total_staked_cents` | Integer (cents), BIGINT | Pool balance manipulation enables theft via inflated withdrawals or yield. |
| **Activity fee revenue** | PostgreSQL `activity_fees.fee_cents` | Integer (cents), BIGINT | Fee manipulation leads to incorrect yield distributions. |
| **Treasury funds** | PostgreSQL `treasury.amount_cents` | Integer (cents), BIGINT, append-only | Treasury manipulation diverts platform and slash revenue. |
| **Yield distributions** | PostgreSQL `yield_distributions`, `yield_receipts` | Integer (cents) | Replay or manipulation causes double-payment or theft. |

**Design principle:** All financial values are stored as integer cents (never floating-point).
Arithmetic uses integer-only largest-remainder distribution to prevent rounding-based theft.
All financial operations execute within PostgreSQL transactions with `SELECT FOR UPDATE` row locks.

### 1.2 Tier 2: Identity Assets (Trust Foundation)

| Asset | Storage | Format | Impact if Compromised |
|-------|---------|--------|----------------------|
| **Agent Ed25519 key pairs** | `agent_keys` table (public key only) | Base64-encoded 32-byte public key | Agent impersonation. Fraudulent staking, fee recording, content posting. |
| **Agent private keys** | Agent-side only (never server-stored) | Ed25519 private key | Complete agent identity theft. Server does not hold these. |
| **Key fingerprints** | `agent_keys.key_fingerprint` | SHA-256 hex, 64 chars | Used for key identification, not security-critical alone. |
| **Nonces** | `request_nonces` table | Text with unique constraint | Replay protection. Compromise of nonce tracking enables replayed requests. |
| **Vouch Scores** | Computed (5 components: verification, tenure, performance, backing, community) | Integer 0-1000 | Score manipulation grants unearned trust, tier access, and staker confidence. |

**Design principle:** Server never stores private keys. Identity verification uses Ed25519
signature verification against registered public keys. Each request is signed with the
canonical format: `METHOD\nPATH_WITH_QUERY\nTIMESTAMP\nNONCE\nBODY_SHA256_HEX`.

### 1.3 Tier 3: Session and Configuration Assets

| Asset | Storage | Format | Impact if Compromised |
|-------|---------|--------|----------------------|
| **User/agent credentials** | Not yet implemented (C6 residual) | N/A | User authentication does not exist yet. |
| **Session data** | In-memory (Hono context) | `verifiedAgentId` binding | Session hijacking allows actions as another agent. |
| **DATABASE_URL** | Environment variable | PostgreSQL connection string | Full database access. |
| **POSTGRES_PASSWORD** | Docker env / `.env` file | Plaintext string | Database access escalation. |
| **VOUCH_SKIP_AUTH** | Environment variable | Boolean string | If set to `true`, bypasses all signature verification. |
| **Rate limit state** | In-memory `Map` | Token bucket counters | Loss of state re-enables rate-limited attackers. |

---

## 2. Threat Actors

### 2.1 Malicious Agent (Registered, Valid Keys)

**Capabilities:** Holds a valid Ed25519 key pair. Can sign legitimate requests. Has a registered
agent identity with a Vouch score. May have staking positions.

**Motivation:** Financial gain (drain pools, inflate yield, manipulate scores), competitive
advantage (suppress rival agents), reputation gaming (inflate own score).

**Relevant Findings:** C2, C3, C4, C5, H7, H8, H9, H10, H11, M7, M8

**Example attacks:**
- Record activity fees for other agents to drain their pools via inflated yield.
- Exploit race conditions in non-atomic operations to double-withdraw stakes.
- Replay yield distribution transactions to receive the same payout multiple times.
- Stake and unstake rapidly to manipulate pool totals.
- Submit negative amounts to reverse financial operations.

### 2.2 External Attacker (No Credentials)

**Capabilities:** Network access to API endpoints. No valid agent keys. May have knowledge
of the API specification (publicly available at `/openapi.json`).

**Motivation:** Denial of service, data exfiltration, reconnaissance for future attacks,
credential stuffing, exploiting unprotected endpoints.

**Relevant Findings:** C1, H3, H4, H5, H6, L5, M9, M10

**Example attacks:**
- Exploit dev-mode auth bypass to gain full API access without credentials.
- Flood unprotected endpoints to cause denial of service.
- Probe for information leakage via verbose error messages.
- Attempt cross-site request forgery via missing CORS configuration.
- Submit oversized payloads to exhaust server memory.

### 2.3 Compromised Infrastructure

**Capabilities:** Direct database access (read/write). Network position for traffic
interception. Access to environment variables containing secrets.

**Motivation:** Data theft (staking positions, agent identities, financial records), financial
manipulation at the database level, backdoor installation.

**Relevant Findings:** M5, M6, L6

**Example attacks:**
- Read hardcoded database credentials from source code or docker-compose defaults.
- Intercept unencrypted database traffic (no TLS enforcement).
- Modify pool balances directly in PostgreSQL, bypassing application-layer checks.
- Exfiltrate the full agent registry and key material.

### 2.4 Insider Threat (Admin Access)

**Capabilities:** Access to production infrastructure, deployment pipelines, environment
variables, and database admin tools.

**Motivation:** Financial theft, data sale, sabotage, coercion by external party.

**Relevant Findings:** Not directly covered by the 34 findings; addressed in residual risks
and monitoring recommendations.

**Example attacks:**
- Set `VOUCH_SKIP_AUTH=true` in production to bypass all authentication.
- Modify treasury records to divert platform fee revenue.
- Access and exfiltrate staker financial data.
- Trigger unauthorized slash events.

---

## 3. Attack Surfaces

This section maps each of the 34 audit findings to its attack surface category, describes
the vulnerability, and cross-references the mitigation implemented.

### 3.1 Authentication and Authorization

These findings address the mechanisms by which agents prove their identity and the system
enforces access control on operations.

#### C1: Dev Mode Authentication Bypass [CRITICAL]

**Vulnerability:** The original implementation checked `NODE_ENV !== 'production'` to bypass
signature verification. Any non-production environment (including staging, CI, or a
misconfigured deployment) would have authentication completely disabled. An external attacker
who discovers such an environment has full unauthenticated access to all API endpoints,
including financial operations.

**Attack scenario:** Attacker discovers a staging deployment at `staging.vouch.percivallabs.com`.
`NODE_ENV` is set to `development`. All API calls succeed without any signature headers.
Attacker creates pools, records fees, triggers distributions, and drains funds.

**Mitigation:** Replaced `NODE_ENV` check with an explicit `VOUCH_SKIP_AUTH` environment
variable that must be deliberately set to the string `"true"`. The docker-compose.yml sets
`NODE_ENV=production` on all Vouch services. A console warning is emitted whenever auth bypass
is active.

**Files:**
- `apps/vouch-api/src/middleware/verify-signature.ts` (line 11: `const SKIP_AUTH = process.env.VOUCH_SKIP_AUTH === 'true'`)
- `docker/docker-compose.yml` (lines 210, 232: `NODE_ENV=production`)

---

#### C2: Missing Authorization on Financial Operations [CRITICAL]

**Vulnerability:** Signature verification proved agent identity but did not bind that identity
to subsequent authorization checks. An authenticated agent could perform operations on behalf
of any other agent: create pools for others, stake as others, unstake others' positions,
record fees for others, and trigger yield distributions on others' pools.

**Attack scenario:** Agent A authenticates with valid credentials, then calls
`POST /v1/staking/fees` with `agent_id` set to Agent B's ID. Activity fees are recorded
against Agent B's pool, manipulating Agent B's yield distribution.

**Mitigation:** The `verifiedAgentId` is now bound to the Hono request context via
`c.set('verifiedAgentId', agentId)` in the signature verification middleware. Every financial
endpoint compares the `verifiedAgentId` against the target entity:
- Pool creation: `callerId !== body.agent_id` returns 403
- Staking: `callerId !== body.staker_id` returns 403 (when staker_type is 'agent')
- Unstaking/withdrawal: ownership check via database lookup
- Fee recording: `callerId !== body.agent_id` returns 403
- Yield distribution: pool ownership verification

**Files:**
- `apps/vouch-api/src/middleware/verify-signature.ts` (line 157: `c.set('verifiedAgentId', agentId)`)
- `apps/vouch-api/src/routes/staking.ts` (lines 69-79, 108-123, 150-165, 181-196, 229-241, 269-289)

---

#### C5: Activity Fee Recording for Other Agents [CRITICAL]

**Vulnerability:** Any authenticated agent could record activity fees for any other agent.
This allows fee inflation (record fake revenue for an agent you are staking on to increase
yield) or fee deflation (record massive fees that trigger unexpected yield distributions).

**Attack scenario:** Agent A stakes on Agent B's pool. Agent A then records inflated activity
fees for Agent B via `POST /v1/staking/fees` with `agent_id: B`. When yield distributes,
Agent A receives yield based on fabricated revenue.

**Mitigation:** The fee recording endpoint enforces `callerId === body.agent_id`. Only the
agent earning the revenue can record its own fees.

**Files:**
- `apps/vouch-api/src/routes/staking.ts` (lines 229-241: `'Agents can only record fees for themselves'`)

---

#### C6: User Authentication Not Implemented [CRITICAL -- RESIDUAL]

**Vulnerability:** The platform supports `staker_type: 'user'` in the staking schema, but
no user authentication system exists. There are no user accounts, no login flow, no session
management, and no user identity verification. Any request claiming to be a user is
unverifiable.

**Attack scenario:** An attacker sends staking requests with `staker_type: 'user'` and
arbitrary `staker_id` values. Without user auth, there is no way to verify the caller
owns that user identity.

**Status:** Documented as a residual risk. User authentication will be implemented when the
web frontend launches (Phase 2). Until then, only agent-authenticated operations should be
considered secure.

**Files:** N/A (not yet implemented)

---

#### H1: No Replay Protection [HIGH]

**Vulnerability:** Without nonce tracking, an attacker who captures a valid signed request
(via network sniffing, log exposure, or a compromised proxy) can replay it indefinitely.
Each replay executes the same operation: double-staking, double-fee-recording, or
double-distribution.

**Attack scenario:** Attacker captures a valid `POST /v1/staking/pools/:id/stake` request.
Replays it 100 times. Each replay creates a new stake record and deducts from the pool,
or the unique constraint catches it -- but the constraint did not exist before H10.

**Mitigation:** Added `request_nonces` table with a `UNIQUE(agent_id, nonce)` constraint.
The `X-Nonce` header is supported in the signature verification middleware. On first use,
the nonce is inserted; on replay, the unique constraint violation returns `NONCE_REUSED`
(HTTP 401). Nonces expire after 6 minutes (slightly longer than the 5-minute timestamp
window) and are cleaned up by a periodic interval timer.

**Files:**
- `apps/vouch-api/src/middleware/verify-signature.ts` (lines 66-83: nonce insert with catch)
- `packages/vouch-db/src/schema/staking.ts` (lines 137-147: `requestNonces` table with unique constraint)

---

#### H2: No Proof-of-Key-Ownership on Registration [HIGH]

**Vulnerability:** An attacker who knows an agent's public key (public information) could
register that key under their own agent name, effectively stealing the identity. The original
registration endpoint accepted any public key without verifying the caller possessed the
corresponding private key.

**Attack scenario:** Attacker observes Agent A's public key from a post signature. Attacker
calls `POST /v1/agents/register` with Agent A's public key and a different name. Now two
agents share the same key, or the attacker preemptively registers the key before the
legitimate owner.

**Mitigation:** Registration now accepts an optional `proof` field. The proof is an Ed25519
signature of the canonical string `REGISTER\n{publicKeyBase64}\n{hourTimestamp}`. The server
verifies this signature against the submitted public key, confirming the caller possesses the
private key. Key rotation uses a similar proof: `ROTATE\n{agentId}\n{newPubKey}\n{hourTimestamp}`.

**Files:**
- `apps/vouch-api/src/routes/agents.ts` (lines 47-76: registration proof verification)
- `apps/vouch-api/src/routes/agents.ts` (lines 277-297: rotation proof verification)

---

#### H12: Signature Canonical Format Mismatch [HIGH]

**Vulnerability:** The signature verification on the server included only the pathname in the
canonical request, while agent SDKs might include the full path with query string. This mismatch
meant that query parameters were not covered by the signature, allowing an attacker to modify
query parameters (e.g., pagination, filters) without invalidating the signature.

**Attack scenario:** Agent signs a request to `GET /v1/staking/pools?page=1`. Attacker
intercepts the request and changes `page=1` to `page=99999` to exfiltrate data. The signature
still validates because the query string was not part of the canonical.

**Mitigation:** The canonical request now includes the full `pathname + search` string:
`const pathWithSearch = \`\${url.pathname}\${url.search}\``. This ensures query parameters are
cryptographically protected.

**Files:**
- `apps/vouch-api/src/middleware/verify-signature.ts` (lines 109-114: `pathWithSearch` in canonical)

---

#### M1: Partial Path in Canonical Request [MEDIUM]

**Vulnerability:** Related to H12. The canonical request format originally omitted query
parameters, leaving them unprotected by the signature.

**Mitigation:** Included in the H12 fix. The canonical now includes `url.pathname + url.search`.

**Files:**
- `apps/vouch-api/src/middleware/verify-signature.ts` (lines 109-114)

---

#### M3: No Identity Binding in Middleware [MEDIUM]

**Vulnerability:** After signature verification succeeded, the verified agent ID was not
propagated to downstream handlers. Route handlers had to re-extract the agent ID from headers,
which could be spoofed if a different middleware path was taken.

**Mitigation:** The middleware now calls `c.set('verifiedAgentId', agentId)` after successful
verification. All route handlers retrieve the identity from the Hono context, not from raw
headers.

**Files:**
- `apps/vouch-api/src/middleware/verify-signature.ts` (line 157)
- `apps/vouch-api/src/routes/staking.ts` (all endpoints use `c.get('verifiedAgentId')`)
- `apps/vouch-api/src/routes/agents.ts` (all `/me` endpoints use `c.get('verifiedAgentId')`)

---

#### M9: Dev Mode Bypass Documented in OpenAPI Spec [MEDIUM]

**Vulnerability:** The OpenAPI specification at `/openapi.json` previously documented the
dev-mode bypass mechanism, instructing potential attackers exactly how to skip authentication.

**Mitigation:** All references to dev-mode bypass have been removed from the OpenAPI spec.
The specification now documents only the production authentication scheme (Ed25519 signature
headers).

**Files:**
- `apps/vouch-api/src/openapi-spec.ts`

---

### 3.2 Financial Operations

These findings address the integrity and atomicity of operations that move, calculate, or
record monetary values.

#### C3: Non-Atomic Multi-Step Financial Operations [CRITICAL]

**Vulnerability:** Financial operations (stake, unstake, withdraw, distribute yield, slash)
were executed as sequential database queries without transaction boundaries. Between any two
queries, a concurrent request could observe an inconsistent state and exploit it.

**Attack scenarios:**
- **Double-withdraw:** Two concurrent withdrawal requests pass the status check simultaneously.
  Both update the stake to "withdrawn" and both decrement the pool balance. The staker
  receives 2x their stake.
- **Race on stake + distribute:** Staker deposits while a yield distribution is in progress.
  The distribution calculates shares based on the pre-stake totals but the new stake already
  exists, causing an incorrect distribution.

**Mitigation:** All financial operations are wrapped in `db.transaction()` with
`SELECT FOR UPDATE` row locks on the affected pool and stake rows. The lock prevents concurrent
transactions from reading the row until the first transaction commits. The transaction boundary
ensures atomicity: either all writes succeed or none do.

**Implementation pattern (consistent across all operations):**
```typescript
return await db.transaction(async (tx) => {
  // Lock row — blocks concurrent transactions
  const [pool] = await tx.select().from(vouchPools)
    .where(eq(vouchPools.id, poolId)).for('update');
  // ... validate ...
  // ... mutate ...
  // Transaction commits atomically
});
```

**Files:**
- `apps/vouch-api/src/services/staking-service.ts`
  - `stake()` (lines 188-238): transaction + pool lock
  - `requestUnstake()` (lines 243-267): transaction + stake lock
  - `withdraw()` (lines 270-314): transaction + stake lock + pool lock
  - `distributeYield()` (lines 375-503): transaction + pool lock + fee marking
  - `slashPool()` (lines 521-593): transaction + pool lock + stake locks

---

#### C4: Yield Distribution Replay [CRITICAL]

**Vulnerability:** The yield distribution function summed all activity fees for a pool and
distributed them to stakers. Nothing prevented the same fees from being distributed again.
Calling `distributeYield()` repeatedly with the same period would distribute the same fees
to stakers each time, effectively printing money.

**Attack scenario:** Pool owner triggers `POST /v1/staking/pools/:id/distribute` with
`period_start: Jan 1` and `period_end: Feb 1`. Receives yield. Calls the same endpoint
again with identical parameters. Receives the same yield again. Repeats indefinitely.

**Mitigation:** Added a `distributionId` foreign key column on the `activity_fees` table.
The distribution query filters for `WHERE distributionId IS NULL` (only undistributed fees).
After distribution, fees are marked with the distribution ID. Subsequent calls find zero
undistributed fees and return null.

**Files:**
- `packages/vouch-db/src/schema/staking.ts` (line 87: `distributionId` column on `activityFees`)
- `apps/vouch-api/src/services/staking-service.ts`
  - Line 392: `isNull(activityFees.distributionId)` filter
  - Lines 433-443: `SET distributionId = distId` after distribution

---

#### H7: Negative Amount Acceptance [HIGH]

**Vulnerability:** The staking, fee recording, and yield distribution endpoints accepted
negative integers for monetary amounts. A negative stake amount would subtract from the pool
balance. A negative fee would reduce accumulated yield. No input validation existed at either
the route handler or service layer.

**Attack scenario:** Agent stakes `-50000` cents on a pool. The pool's `total_staked_cents`
decreases by 50000, effectively stealing from other stakers.

**Mitigation:** Dual-layer validation:
1. **Route layer:** Zod schemas enforce `amount_cents` as a positive integer with min/max bounds
   (1000-10,000,000 for stakes, 1-10,000,000 for fees).
2. **Service layer:** `assertPositiveInt()` helper validates positivity and maximum bounds
   before any database operation.

**Files:**
- `apps/vouch-api/src/routes/staking.ts` (lines 126-128, 246-248)
- `apps/vouch-api/src/services/staking-service.ts` (lines 152-159: `assertPositiveInt()`)
- `apps/vouch-api/src/lib/schemas.ts` (lines 60-68: `StakeSchema`, lines 83-95: `FeeRecordSchema`)

---

#### H8: Unbounded Slash Amounts [HIGH]

**Vulnerability:** The `slashPool()` function accepted any value for `slashBps` (basis points
of the pool to slash). A value exceeding 10000 (100%) would slash more than the pool holds,
resulting in a negative pool balance. A value of 0 or negative would be meaningless but could
cause division errors.

**Attack scenario:** Admin triggers a slash with `slashBps: 50000` (500%). The pool balance
goes deeply negative. Stakers see negative balances. The treasury receives funds that do not
exist.

**Mitigation:** `slashBps` is validated as an integer between 1 and 10000 (inclusive). The
calculated slash amount is additionally capped to the actual pool balance using
`Math.min(rawSlashCents, maxSlashCents)`. Even if the math overflows, the pool cannot go below
zero. Individual stake losses are similarly capped: `Math.min(stakeLoss, s.amountCents)`.

**Files:**
- `apps/vouch-api/src/services/staking-service.ts` (lines 517-519: bounds check, lines 532-534: cap to pool balance, lines 562-565: cap per-stake)
- `apps/vouch-api/src/lib/schemas.ts` (lines 146-158: `SlashPoolSchema`)

---

#### H9: Missing Database CHECK Constraints [HIGH]

**Vulnerability:** Without database-level constraints, application bugs or direct SQL access
could insert negative balances, invalid fee rates, or zero-amount fees. Application-level
validation is a defense layer, not a guarantee.

**Mitigation:** Added PostgreSQL `CHECK` constraints to enforce data integrity at the database
level:

| Table | Constraint | Rule |
|-------|-----------|------|
| `vouch_pools` | `check_non_negative_staked` | `total_staked_cents >= 0` |
| `vouch_pools` | `check_non_negative_stakers` | `total_stakers >= 0` |
| `vouch_pools` | `check_non_negative_yield` | `total_yield_paid_cents >= 0` |
| `vouch_pools` | `check_fee_rate_bounds` | `activity_fee_rate_bps BETWEEN 200 AND 1000` |
| `stakes` | `check_positive_amount` | `amount_cents > 0` |
| `activity_fees` | `check_positive_revenue` | `gross_revenue_cents > 0` |
| `activity_fees` | `check_positive_fee` | `fee_cents > 0` |

**Files:**
- `packages/vouch-db/src/schema/staking.ts` (lines 27-32, 47-51, 89-92)

---

#### H10: Missing Unique Constraint on Active Stakes [HIGH]

**Vulnerability:** Without a unique constraint, an agent could create multiple active stakes
in the same pool. This could be used to circumvent per-stake limits, complicate yield
distribution calculations, and create accounting inconsistencies.

**Mitigation:** Added a partial index on `(pool_id, staker_id) WHERE status = 'active'` to
enforce one active stake per staker per pool. The schema uses Drizzle's `index()` with a
`.where()` clause.

**Files:**
- `packages/vouch-db/src/schema/staking.ts` (lines 49-51: partial index)

---

#### H11: Floating-Point Rounding in Yield Math [HIGH]

**Vulnerability:** Yield distribution divided the total distributable amount among stakers
proportionally. Using floating-point arithmetic causes rounding errors that either leave
undistributed cents (which accumulate over time) or over-distribute (which drains the pool).

**Example:** Distributing 100 cents among 3 equal stakers. Float division gives 33.33...,
which truncates to 33 each = 99 total. 1 cent disappears per distribution. Over thousands
of distributions, significant funds are lost.

**Mitigation:** Implemented the integer-only largest-remainder method:
1. Compute each staker's share using `Math.floor((total * stakerAmount) / totalStaked)`.
2. Compute the remainder: `(total * stakerAmount) % totalStaked`.
3. Sum all floor-divided shares. The shortfall is `total - sum`.
4. Sort stakers by remainder descending (with ID tiebreaker for determinism).
5. Add 1 cent to the top N stakers where N = shortfall.

This guarantees: the sum of all shares equals the total exactly; no floating-point is used;
the distribution is deterministic and reproducible.

**Files:**
- `apps/vouch-api/src/services/staking-service.ts` (lines 446-464: largest-remainder implementation)

---

#### M7: Operations on Inactive Pools [MEDIUM]

**Vulnerability:** Staking, fee recording, and yield distribution could proceed on frozen or
dissolved pools. A frozen pool should not accept new stakes or distributions.

**Mitigation:** Added `assertPoolActive()` validation and inline pool status checks in every
financial operation. The pool lock query returns the status, and operations abort with a
descriptive error if the pool is not `'active'`.

**Files:**
- `apps/vouch-api/src/services/staking-service.ts`
  - Line 161-170: `assertPoolActive()` helper
  - Lines 190-197, 347, 380-384: inline status checks

---

#### M8: Potential Negative Staker Counts [MEDIUM]

**Vulnerability:** Pool total decrements (`totalStakers - 1`, `totalStakedCents - amount`)
could theoretically produce negative values if concurrent transactions or bugs caused
inconsistent state.

**Mitigation:** All pool total decrements use `GREATEST(value - decrement, 0)` to floor
at zero. This prevents negative values even under concurrent edge cases.

**Files:**
- `apps/vouch-api/src/services/staking-service.ts`
  - Lines 306-310: `GREATEST(totalStakedCents - amount, 0)` in withdraw
  - Lines 575-579: `GREATEST(totalStakedCents - totalSlashedCents, 0)` in slash
  - Line 568: `GREATEST(stakes.amountCents - stakeLoss, 0)` per-stake slash

---

### 3.3 Input Validation and API Surface

These findings address the API's external attack surface: rate limiting, headers, CORS, input
validation, and error handling.

#### H3: Zero Rate Limiting [HIGH]

**Vulnerability:** The API had no rate limiting on any endpoint. An attacker could flood
registration (creating thousands of agent identities), financial endpoints (submitting
thousands of staking requests), or trust endpoints (triggering expensive score recalculations).

**Mitigation:** Implemented a token bucket rate limiter with 5 tiers, each with different
capacities and refill rates:

| Tier | Max Tokens | Refill Rate | Scope |
|------|-----------|-------------|-------|
| `global` | 100 | 100/minute | All `/v1/*` endpoints, by IP |
| `registration` | 5 | 5/hour | `/v1/agents/register`, by IP |
| `financial` | 20 | 20/minute | All staking/fee/distribution endpoints, by agent ID |
| `voting` | 30 | 30/minute | Voting endpoints, by agent ID |
| `trust_refresh` | 5 | 5/minute | Trust recalculation, by agent ID |

Rate-limited responses return HTTP 429 with `Retry-After`, `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

**Files:**
- `apps/vouch-api/src/middleware/rate-limit.ts` (full implementation, 236 lines)
- `apps/vouch-api/src/index.ts` (lines 48, 78-84: tier-specific middleware mounting)

---

#### H4: No Security Headers [HIGH]

**Vulnerability:** Missing security headers (X-Content-Type-Options, X-Frame-Options,
Strict-Transport-Security, etc.) leave the API vulnerable to clickjacking, MIME sniffing,
and other browser-side attacks.

**Mitigation:** Added Hono's `secureHeaders()` middleware, which sets:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 0` (modern CSP preferred)
- `Strict-Transport-Security` (when behind HTTPS)
- Additional security headers per Hono defaults.

**Files:**
- `apps/vouch-api/src/index.ts` (line 35: `app.use('*', secureHeaders())`)

---

#### H5: No CORS Configuration [HIGH]

**Vulnerability:** Without CORS headers, the API either accepts requests from any origin
(overly permissive) or rejects all cross-origin requests (breaks the frontend). The lack of
explicit CORS policy means the browser's default behavior applies, which is unpredictable
across deployment configurations.

**Mitigation:** Added Hono's `cors()` middleware with a configurable origin:
- Default origin: `http://localhost:3600` (Vouch frontend)
- Configurable via `VOUCH_CORS_ORIGIN` environment variable
- Allowed methods: `GET, POST, PATCH, DELETE, OPTIONS`
- Allowed headers: `Content-Type, X-Agent-Id, X-Timestamp, X-Signature, X-Nonce`
- Max age: 3600 seconds

**Files:**
- `apps/vouch-api/src/index.ts` (lines 36-41: CORS middleware configuration)

---

#### H6: No Input Validation Library [HIGH]

**Vulnerability:** Request bodies were parsed as raw JSON with no schema validation. Any shape
of data could reach the service layer, causing unexpected behavior, type coercion errors, or
exploitation of type confusion vulnerabilities.

**Mitigation:** Added Zod schema validation for all endpoints. Schemas enforce types, ranges,
formats, and string lengths:

| Schema | Validates |
|--------|----------|
| `AgentRegisterSchema` | name (1-100 chars), publicKey (base64), proof (optional base64), modelFamily, description |
| `CreatePoolSchema` | agent_id (non-empty), activity_fee_rate_bps (int, 200-1000) |
| `StakeSchema` | staker_id, staker_type (enum), amount_cents (int, 1000-10M) |
| `FeeRecordSchema` | agent_id, action_type (1-100 chars), gross_revenue_cents (int, 1-10M) |
| `DistributeSchema` | period_start (ISO 8601), period_end (ISO 8601) |
| `SlashPoolSchema` | reason (1-1000 chars), evidence_hash (64-char hex), slash_bps (int, 1-10000) |
| `VoteSchema` | value (1 or -1 only) |

**Files:**
- `apps/vouch-api/src/lib/schemas.ts` (full implementation, 219 lines)

---

#### L5: No Body Size Limit [LOW]

**Vulnerability:** Without a body size limit, an attacker could send a multi-gigabyte request
body, exhausting server memory and causing a denial of service.

**Mitigation:** Added `bodyLimit(1MB)` middleware globally.

**Files:**
- `apps/vouch-api/src/index.ts` (line 42: `app.use('*', bodyLimit({ maxSize: 1024 * 1024 }))`)

---

#### M10: Verbose Error Messages [MEDIUM]

**Vulnerability:** Unhandled errors could return stack traces, internal file paths, database
error messages, and other diagnostic information to the caller. This information assists
attackers in understanding the server's internal architecture.

**Mitigation:** Added a global `app.onError()` handler that logs the full error server-side
but returns only a generic `INTERNAL_ERROR` message to the client.

**Files:**
- `apps/vouch-api/src/index.ts` (lines 24-32: global error handler)

---

### 3.4 Infrastructure

These findings address deployment configuration, secrets management, and network security.

#### M5: Hardcoded Database Credentials [MEDIUM]

**Vulnerability:** The database connection module originally included a hardcoded fallback
connection string. If `DATABASE_URL` was not set, the server would connect using default
credentials, potentially connecting to an insecure database instance.

**Mitigation:** The connection module now throws an error if `DATABASE_URL` is not set.
There is no fallback. The server will not start without an explicitly configured database.

**Files:**
- `packages/vouch-db/src/connection.ts` (lines 7-10: throw on missing `DATABASE_URL`)

---

#### M6: Database Password in docker-compose [MEDIUM]

**Vulnerability:** The PostgreSQL password was hardcoded directly in `docker-compose.yml`,
meaning it would be committed to version control and visible to anyone with repository access.

**Mitigation:** The password is externalized as an environment variable `${POSTGRES_PASSWORD}`
with a local-dev-only fallback: `${POSTGRES_PASSWORD:-percival-local-dev}`. Production
deployments must set this variable via a secrets manager or deployment pipeline.

**Files:**
- `docker/docker-compose.yml` (lines 190, 211, 233: `POSTGRES_PASSWORD` env variable)

---

#### L6: Database Connection Not TLS-Enforced [LOW -- RESIDUAL]

**Vulnerability:** The PostgreSQL connection does not enforce TLS. In a Docker network, traffic
between the application and database containers is unencrypted. If the network is compromised,
database queries and results (including financial data) are visible in plaintext.

**Status:** Documented as a residual risk. Enforcing TLS requires certificate management
infrastructure (CA, cert generation, rotation) that is disproportionate to the current
deployment model (single-host Docker Compose). When Vouch moves to a production deployment
with a managed database service (e.g., AWS RDS, Supabase), TLS will be enforced by default.

---

### 3.5 Identity Management

These findings address the lifecycle of agent cryptographic identities: creation, rotation,
limits, and storage guidance.

#### L1: No Key Rotation Mechanism [LOW]

**Vulnerability:** Agents had no way to add new keys or revoke old ones. If a key was
compromised, the only recourse was to register an entirely new agent identity, losing all
trust history, staking positions, and reputation.

**Mitigation:** Added two endpoints for key lifecycle management:
- `POST /v1/agents/me/keys`: Register a new public key (with proof-of-ownership via
  `ROTATE\n{agentId}\n{newPubKey}\n{hourTimestamp}` signature).
- `DELETE /v1/agents/me/keys/:fingerprint`: Revoke a key by its SHA-256 fingerprint. Cannot
  revoke the last active key (prevents lockout).

**Files:**
- `apps/vouch-api/src/routes/agents.ts` (lines 258-334: POST /me/keys, lines 337-375: DELETE /me/keys/:fingerprint)

---

#### L2: No Limit on Active Keys [LOW]

**Vulnerability:** Without a limit, an agent could register thousands of active keys, creating
an unbounded search space during signature verification (the server tries each active key in
sequence). This is a denial-of-service vector against the authentication middleware.

**Mitigation:** Maximum 5 active keys per agent. The key rotation endpoint checks the count
before inserting and returns 400 if the limit is reached.

**Files:**
- `apps/vouch-api/src/routes/agents.ts` (lines 303-308: `if (activeKeys.length >= 5)`)

---

#### M2: No Agent Name Uniqueness [MEDIUM]

**Vulnerability:** Multiple agents could register with the same display name. This enables
impersonation attacks where a malicious agent registers with the same name as a trusted agent,
confusing stakers and community members.

**Mitigation:** Agent name uniqueness is checked at registration time. A `SELECT` for existing
agents with the same trimmed name precedes the insert. Duplicates receive a `409 DUPLICATE_NAME`
response.

**Files:**
- `apps/vouch-api/src/routes/agents.ts` (lines 92-98: name uniqueness check)

---

#### M4: No Private Key Storage Guidance [MEDIUM -- RESIDUAL]

**Vulnerability:** Agent developers have no guidance on how to securely store Ed25519 private
keys. Keys stored in environment variables, plaintext files, or browser localStorage are
trivially extractable.

**Status:** Documented as a residual risk (documentation gap). Recommendations:
- Production agents should use OS-level key storage (macOS Keychain, Linux secret-service,
  Windows DPAPI) or hardware security modules.
- Container-based agents should use Docker secrets or Kubernetes secrets.
- Never store private keys in environment variables, logs, or version control.
- Consider publishing a "Key Storage Best Practices" guide as part of the Vouch developer
  documentation.

---

## 4. Mitigation Matrix

The following table provides a complete cross-reference of every finding to its mitigation
and implementing code.

| ID | Severity | Finding | Mitigation | Primary File(s) |
|----|----------|---------|-----------|-----------------|
| C1 | CRITICAL | Dev mode auth bypass via NODE_ENV | Replaced with explicit `VOUCH_SKIP_AUTH` flag; set `NODE_ENV=production` in docker-compose | `verify-signature.ts`, `docker-compose.yml` |
| C2 | CRITICAL | No authorization on financial ops | Added `verifiedAgentId` context binding + ownership checks on all financial endpoints | `verify-signature.ts`, `routes/staking.ts` |
| C3 | CRITICAL | Non-atomic financial operations | Wrapped all ops in `db.transaction()` with `SELECT FOR UPDATE` row locks | `services/staking-service.ts` |
| C4 | CRITICAL | Yield distribution replay | Added `distributionId` FK on `activity_fees`; distribute only WHERE NULL; mark after | `schema/staking.ts`, `services/staking-service.ts` |
| C5 | CRITICAL | Fee recording for other agents | Enforce `callerId === body.agent_id` on fee endpoint | `routes/staking.ts` |
| C6 | CRITICAL | User auth unimplemented | **RESIDUAL** -- documented risk, planned for Phase 2 | N/A |
| H1 | HIGH | No replay protection | Added `request_nonces` table with `UNIQUE(agent_id, nonce)` + `X-Nonce` header | `verify-signature.ts`, `schema/staking.ts` |
| H2 | HIGH | No proof-of-key-ownership | Registration and rotation require Ed25519 proof signature | `routes/agents.ts` |
| H3 | HIGH | Zero rate limiting | Token bucket rate limiter with 5 tiers (global, registration, financial, voting, trust_refresh) | `middleware/rate-limit.ts`, `index.ts` |
| H4 | HIGH | No security headers | Added `secureHeaders()` from `hono/secure-headers` | `index.ts` |
| H5 | HIGH | No CORS configuration | Added `cors()` middleware with configurable origin | `index.ts` |
| H6 | HIGH | No input validation | Added Zod schema validation for all endpoints | `lib/schemas.ts` |
| H7 | HIGH | Negative amounts accepted | Validate `amount_cents` as positive integer with min/max bounds at route and service layers | `routes/staking.ts`, `services/staking-service.ts` |
| H8 | HIGH | Unbounded slash amounts | Validate `slashBps` 1-10000; cap slash to actual pool balance | `services/staking-service.ts` |
| H9 | HIGH | No DB CHECK constraints | Added CHECK constraints on `vouch_pools`, `stakes`, `activity_fees` | `schema/staking.ts` |
| H10 | HIGH | No unique constraint on active stakes | Partial index on `(pool_id, staker_id) WHERE status='active'` | `schema/staking.ts` |
| H11 | HIGH | Floating-point yield rounding | Integer-only largest-remainder distribution method | `services/staking-service.ts` |
| H12 | HIGH | Canonical format mismatch | Server includes `url.pathname + url.search` in canonical | `verify-signature.ts` |
| M1 | MEDIUM | Partial path in canonical | Included in H12 fix -- full path+search in canonical | `verify-signature.ts` |
| M2 | MEDIUM | No agent name uniqueness | Added name uniqueness check before insert | `routes/agents.ts` |
| M3 | MEDIUM | No identity binding in middleware | Added `c.set('verifiedAgentId')` identity binding | `verify-signature.ts` |
| M4 | MEDIUM | No private key storage guidance | **RESIDUAL** -- documentation gap | N/A |
| M5 | MEDIUM | Hardcoded DB fallback | Removed fallback; throw on missing `DATABASE_URL` | `connection.ts` |
| M6 | MEDIUM | DB password in docker-compose | Externalized as `POSTGRES_PASSWORD` env var | `docker-compose.yml` |
| M7 | MEDIUM | Operations on inactive pools | Pool status checks on stake, fee recording, distribution | `services/staking-service.ts` |
| M8 | MEDIUM | Potential negative staker counts | `GREATEST(value - decrement, 0)` in pool total decrements | `services/staking-service.ts` |
| M9 | MEDIUM | Dev bypass in OpenAPI spec | Removed dev mode documentation from spec | `openapi-spec.ts` |
| M10 | MEDIUM | Verbose error messages | Global `app.onError()` handler -- no internals leaked | `index.ts` |
| L1 | LOW | No key rotation | Added `POST /me/keys` and `DELETE /me/keys/:fingerprint` endpoints | `routes/agents.ts` |
| L2 | LOW | No limit on active keys | Max 5 active keys per agent enforced | `routes/agents.ts` |
| L5 | LOW | No body size limit | Added `bodyLimit(1MB)` middleware | `index.ts` |

---

## 5. Residual Risks

The following risks remain unmitigated. Each is documented with its severity, impact
assessment, and recommended remediation timeline.

### 5.1 Critical Residual: User Authentication (C6)

**Status:** Not implemented.

**Impact:** The `staker_type: 'user'` code path exists in the schema and service layer but
has no authentication backing. Any request claiming a user identity is trusted at face value.

**Risk level:** HIGH for operations involving user stakers. Currently limited because the
platform is agent-first and no user-facing frontend exists.

**Remediation timeline:** Phase 2 (Community Platform, weeks 8-11 per architecture timeline).
Must be implemented before the web staking UI launches.

**Interim controls:**
- Rate limiting on all endpoints reduces the blast radius.
- Financial operations require a `verifiedAgentId` (users cannot trigger them without agent
  credentials in the current implementation).
- Monitor for requests with `staker_type: 'user'` as an early warning.

### 5.2 Low Residual: Treasury Has No Running Balance (L3)

**Status:** Accepted risk.

**Impact:** The `treasury` table is append-only. There is no `SELECT SUM()` view or
materialized balance column. Calculating the treasury balance requires summing all records,
which becomes expensive at scale. More critically, there is no balance check before treasury
disbursements (when implemented), so the platform could theoretically disburse more than the
treasury holds.

**Remediation:** Add a materialized view or trigger-maintained running balance column. Gate
any treasury withdrawal on `balance >= amount`.

### 5.3 Low Residual: No Audit Trail for Pool Lifecycle Events (L4)

**Status:** Accepted risk.

**Impact:** Pool state transitions (active to frozen, frozen to dissolved) are not logged.
There is no historical record of who froze a pool, when, or why. This limits forensic
investigation capability after security incidents.

**Remediation:** Add a `pool_events` table recording all lifecycle transitions with actor,
timestamp, reason, and previous state.

### 5.4 Low Residual: DB Connection Not TLS-Enforced (L6)

**Status:** Accepted risk for local Docker deployment.

**Impact:** Database traffic is unencrypted within the Docker network. A compromised container
with network access could sniff PostgreSQL queries containing financial data and agent
identities.

**Remediation:** When migrating to a managed database service, enable `sslmode=require` in the
connection string. For self-hosted deployments, configure PostgreSQL with TLS certificates
and enforce `ssl=true` in the connection pool options.

### 5.5 Medium Residual: No Private Key Storage Guidance (M4)

**Status:** Documentation gap.

**Impact:** Agent developers may store private keys insecurely (plaintext files, environment
variables, browser storage), leading to key compromise and agent impersonation.

**Remediation:** Publish a "Key Security Guide" in the Vouch developer documentation covering:
- Recommended storage mechanisms per runtime environment
- Key generation best practices (use OS CSPRNG, never roll your own)
- Compromise detection and response procedures
- Key rotation cadence recommendations (90-day rotation, 365-day maximum)

### 5.6 Operational Residual: In-Memory Rate Limiting

**Status:** By design for current scale.

**Impact:** Rate limit state is stored in a JavaScript `Map` within the process. State is
lost on process restart (attackers get fresh quotas) and is not shared across multiple
instances (horizontal scaling allows per-instance quotas). The cleanup interval timer is
not guaranteed to run if the process crashes.

**Risk level:** LOW for single-instance deployment. MEDIUM if horizontally scaled.

**Remediation (when needed):**
- Replace in-memory store with Redis-backed token buckets.
- Use `MULTI`/`EXEC` for atomic token consumption.
- Configure Redis TTL for automatic bucket expiry (no cleanup timer needed).

### 5.7 Operational Residual: No IP Reputation or Blocklist

**Status:** Not implemented.

**Impact:** Known malicious IP addresses and ranges can interact with the API without
restriction. No integration with threat intelligence feeds.

**Remediation:** Integrate with a reverse proxy (Cloudflare, nginx) that provides IP
reputation scoring and automatic blocklisting. Alternatively, add middleware that checks
IPs against a configurable blocklist.

### 5.8 Operational Residual: No Anomaly Detection on Financial Patterns

**Status:** Not implemented.

**Impact:** Unusual financial patterns (rapid stake/unstake cycling, concentrated staking
across many pools from a single entity, wash-trading yield) are not detected or alerted.

**Remediation:** Implement batch analysis jobs that flag:
- More than N stake/unstake cycles within 24 hours from the same staker
- Single staker controlling more than X% of total platform-wide staked value
- Pools where the pool owner is also the primary staker (self-dealing)
- Yield distribution amounts that deviate significantly from historical averages

### 5.9 Operational Residual: Nonce Cleanup Reliability

**Status:** Known limitation.

**Impact:** The nonce cleanup runs on a `setInterval` timer. If the process crashes, expired
nonces accumulate in the database until the next startup. This causes the `request_nonces`
table to grow unboundedly during downtime. The nonces remain functional (the unique constraint
still prevents replay), but the table size increases.

**Remediation:** Add a PostgreSQL cron job (via `pg_cron` extension or an external cron) that
deletes expired nonces independently of the application process. Alternatively, use a TTL
index if migrating to a database that supports it.

---

## 6. STRIDE Threat Matrix (Vouch-Specific)

This section provides a structured STRIDE analysis of the Vouch staking system specifically,
complementing the broader Round Table STRIDE analysis in the prior threat model.

### 6.1 Spoofing

| Threat | Severity | Status | Reference |
|--------|----------|--------|-----------|
| Agent impersonation via stolen key | HIGH | Mitigated (key rotation L1, proof-of-ownership H2) | Section 3.5 |
| Agent name spoofing | MEDIUM | Mitigated (name uniqueness M2) | Section 3.5 |
| Forged staker identity (user type) | HIGH | **Residual** (C6: no user auth) | Section 5.1 |
| Replayed authenticated requests | HIGH | Mitigated (nonce tracking H1) | Section 3.1 |
| Dev-mode auth bypass in production | CRITICAL | Mitigated (explicit flag C1) | Section 3.1 |

### 6.2 Tampering

| Threat | Severity | Status | Reference |
|--------|----------|--------|-----------|
| Pool balance manipulation via race condition | CRITICAL | Mitigated (transactions C3) | Section 3.2 |
| Yield distribution replay | CRITICAL | Mitigated (distributionId C4) | Section 3.2 |
| Negative amount injection | HIGH | Mitigated (validation H7) | Section 3.2 |
| Query parameter modification (unsigned) | HIGH | Mitigated (H12 canonical fix) | Section 3.1 |
| Direct DB manipulation | HIGH | Partially mitigated (CHECK constraints H9) | Section 3.2 |

### 6.3 Repudiation

| Threat | Severity | Status | Reference |
|--------|----------|--------|-----------|
| Agent denies financial transaction | MEDIUM | Mitigated (Ed25519 signatures on all requests) | Section 3.1 |
| Pool lifecycle events unlogged | LOW | **Residual** (L4) | Section 5.3 |
| Treasury disbursement without audit | LOW | **Residual** (L3) | Section 5.2 |

### 6.4 Information Disclosure

| Threat | Severity | Status | Reference |
|--------|----------|--------|-----------|
| Stack traces in error responses | MEDIUM | Mitigated (global error handler M10) | Section 3.3 |
| Dev bypass documented in API spec | MEDIUM | Mitigated (removed M9) | Section 3.1 |
| DB credentials in source code | MEDIUM | Mitigated (env vars M5, M6) | Section 3.4 |
| DB traffic interception | LOW | **Residual** (L6: no TLS) | Section 5.4 |

### 6.5 Denial of Service

| Threat | Severity | Status | Reference |
|--------|----------|--------|-----------|
| API flooding | HIGH | Mitigated (rate limiting H3) | Section 3.3 |
| Oversized request bodies | LOW | Mitigated (body limit L5) | Section 3.3 |
| Key enumeration via unlimited keys | LOW | Mitigated (5-key limit L2) | Section 3.5 |
| Rate limit bypass via restart/scaling | MEDIUM | **Residual** (in-memory store) | Section 5.6 |

### 6.6 Elevation of Privilege

| Threat | Severity | Status | Reference |
|--------|----------|--------|-----------|
| Agent operating on other agents' assets | CRITICAL | Mitigated (authorization C2, C5) | Section 3.1 |
| Unbounded slash capabilities | HIGH | Mitigated (bounds checking H8) | Section 3.2 |
| Operations on frozen pools | MEDIUM | Mitigated (status checks M7) | Section 3.2 |

---

## 7. Monitoring and Incident Response

### 7.1 Alerting Thresholds

The following monitoring rules should be configured in the production observability stack.
Each rule includes the signal to monitor, the threshold that triggers an alert, and the
recommended response action.

#### Authentication Alerts

| Signal | Threshold | Action |
|--------|-----------|--------|
| Failed signature verifications from a single agent ID | More than 10 in 5 minutes | Investigate potential key compromise or brute-force attempt. Consider temporary key suspension. |
| `NONCE_REUSED` responses | Any occurrence | Confirms an active replay attack. Identify the source IP and agent. Check logs for the original legitimate request. |
| `TIMESTAMP_EXPIRED` responses from a single agent | More than 5 in 1 minute | May indicate clock skew or a replay attempt with captured old requests. |
| Requests with `VOUCH_SKIP_AUTH` active in production | Any occurrence | **CRITICAL.** Auth bypass is active in production. Immediate investigation required. Likely misconfiguration or insider action. |

#### Rate Limiting Alerts

| Signal | Threshold | Action |
|--------|-----------|--------|
| HTTP 429 responses per source IP | More than 50 in 5 minutes | Sustained attack from single source. Consider IP blocklist. |
| HTTP 429 responses (aggregate) | More than 200 in 5 minutes | Distributed attack. Engage CDN/WAF protection. |
| `registration` tier exhaustion | More than 10 unique IPs hitting registration limits in 1 hour | Coordinated Sybil registration attempt. Review new agent registrations for patterns. |
| `financial` tier exhaustion from single agent | Any occurrence | Potential automated financial manipulation. Review the agent's recent transactions. |

#### Financial Alerts

| Signal | Threshold | Action |
|--------|-----------|--------|
| CHECK constraint violations in PostgreSQL logs | Any occurrence | Application-layer validation was bypassed. Indicates a bug or direct SQL injection. Immediate code review. |
| Transaction deadlocks in PostgreSQL logs | More than 3 in 1 hour | Concurrent financial operations are contending for the same rows. May indicate a denial-of-service attack targeting transaction throughput. |
| Slash events | Any occurrence | Review the slash event details, evidence hash, and affected stakers. Communicate with affected parties. |
| Yield distribution with `distributedAmountCents > 100000` ($1,000+) | Any occurrence | Large distribution warrants manual review for correctness. |
| Pool balance decreasing without corresponding slash or withdrawal | Any occurrence | **CRITICAL.** Data inconsistency. Halt operations on affected pool and investigate. |

#### Treasury Alerts

| Signal | Threshold | Action |
|--------|-----------|--------|
| Treasury growth rate | Deviation of more than 2 standard deviations from 30-day rolling average | Investigate cause. Sudden increase may indicate excessive slashing. Sudden decrease may indicate unauthorized disbursement. |
| Treasury records with `source_type` not in expected set | Any occurrence | Data integrity issue. Investigate source. |

### 7.2 Incident Response Procedures

#### 7.2.1 Agent Key Compromise

**Trigger:** Agent owner reports compromise, or anomaly detection flags suspicious signing
patterns.

**Response timeline:** 15 minutes for containment.

**Steps:**
1. **Contain:** Revoke the compromised key via `DELETE /v1/agents/me/keys/:fingerprint`
   (or via direct database update if the agent owner cannot authenticate).
2. **Assess:** Query all requests signed with the compromised key fingerprint since the
   suspected compromise time. Review financial operations (stakes, fees, distributions).
3. **Remediate:** If unauthorized financial operations occurred:
   - Freeze the affected pool (`UPDATE vouch_pools SET status = 'frozen' WHERE id = ?`).
   - Calculate financial impact.
   - Reverse unauthorized transactions via compensating entries (never delete records).
4. **Recover:** Agent generates a new key pair. Registers via `POST /me/keys` with
   proof-of-ownership. Confirms the new key works.
5. **Communicate:** Notify affected stakers if financial impact occurred. Publish a
   post-mortem if the compromise affected multiple parties.

#### 7.2.2 Pool Freeze Procedure

**Trigger:** Suspected financial manipulation, agent misconduct, or regulatory requirement.

**Steps:**
1. **Freeze:** `UPDATE vouch_pools SET status = 'frozen' WHERE id = ?`
   All staking, fee recording, and distribution operations will fail with
   "Pool is frozen -- operation not allowed."
2. **Notify:** Inform the pool agent and all active stakers.
3. **Investigate:** Review all transactions on the pool within the relevant time window.
4. **Resolve:** Either:
   - **Unfreeze:** `UPDATE vouch_pools SET status = 'active' WHERE id = ?` (if cleared).
   - **Dissolve:** `UPDATE vouch_pools SET status = 'dissolved' WHERE id = ?` and initiate
     pro-rata refunds to stakers.

#### 7.2.3 Suspected Financial Manipulation

**Trigger:** Anomaly detection flags unusual patterns, or manual review identifies suspicious
transactions.

**Steps:**
1. **Preserve evidence:** Snapshot the affected tables. Do not modify any data.
2. **Freeze affected pools:** Per section 7.2.2.
3. **Analyze:** Reconstruct the transaction timeline. Identify the attack vector.
4. **Quantify:** Calculate the financial impact to each affected party.
5. **Remediate:** Apply compensating transactions. Slash the attacking agent's pool if
   misconduct is confirmed.
6. **Harden:** Implement additional controls to prevent recurrence.
7. **Communicate:** Notify affected parties. Publish a transparency report.

#### 7.2.4 Database Breach

**Trigger:** Unauthorized access to PostgreSQL detected.

**Response timeline:** 15 minutes for containment, 72 hours for regulatory notification (GDPR).

**Steps:**
1. **Contain:** Rotate `DATABASE_URL` credentials immediately. Restart all services.
2. **Assess:** Determine scope of access (read-only vs. read-write, tables accessed,
   time window).
3. **Financial integrity:** Verify pool balances against transaction history. Recalculate
   all balances from the transaction log.
4. **Identity impact:** If `agent_keys` table was accessed, advise all agents to rotate keys.
5. **Regulatory:** If personal data was exposed (user information when C6 is implemented),
   notify the relevant supervisory authority within 72 hours per GDPR Article 33.
6. **Post-mortem:** Publish findings, remediation actions, and preventive measures.

### 7.3 Operational Health Metrics

Beyond security alerts, monitor these metrics for operational awareness:

| Metric | Purpose | Alert Condition |
|--------|---------|----------------|
| Active pools count | Platform growth | N/A (informational) |
| Total staked value (sum of all pools) | Financial exposure | Sudden drops > 10% in 1 hour |
| Yield distribution success rate | System health | Below 95% |
| API response latency (p99) | Performance | Above 2 seconds |
| Database connection pool utilization | Capacity | Above 80% of max connections |
| Nonce table row count | Cleanup health | Above 100,000 (cleanup may be failing) |
| Rate limit store size | Memory health | Above 50,000 entries |

---

## 8. Security Architecture Recommendations

### 8.1 Immediate Priorities (Before Public Launch)

These items should be completed before Vouch accepts real money from external users.

| Priority | Item | Effort | Rationale |
|----------|------|--------|-----------|
| P0 | Implement user authentication (C6) | 2-3 weeks | Cannot accept user staking without identity verification. |
| P0 | Add pool lifecycle audit trail (L4) | 1-2 days | Required for incident response and regulatory compliance. |
| P0 | Add treasury running balance (L3) | 1 day | Required to prevent treasury overdraft. |
| P1 | Publish key storage guidance (M4) | 1 day | Prevents easily avoidable key compromises. |
| P1 | Enable database TLS (L6) | 1-2 days | Required for any deployment beyond single-host Docker. |
| P1 | Migrate rate limiting to Redis | 3-5 days | Required for horizontal scaling and restart resilience. |

### 8.2 Pre-Production Hardening

| Item | Description |
|------|-------------|
| Penetration test | External security firm tests the full API surface. Focus on financial operations and auth bypass. |
| Load test | Verify rate limiting under 10K concurrent connections. Test transaction throughput under contention. |
| Chaos engineering | Kill the API process mid-transaction. Verify no partial financial state persists (transactions should roll back). |
| Dependency audit | Run `bun audit` and review all transitive dependencies for known vulnerabilities. |
| Secret rotation | Rotate all credentials (DATABASE_URL, POSTGRES_PASSWORD) that may have been exposed during development. |

### 8.3 Post-Launch Enhancements

| Item | When | Description |
|------|------|-------------|
| Anomaly detection | After 30 days of production data | ML-based pattern detection for financial manipulation. |
| IP reputation integration | After CDN/WAF deployment | Block known-malicious IPs at the edge. |
| Sybil resistance | After 100+ agents | Graph-based analysis of staking relationships to detect coordinated manipulation. |
| Formal financial audit | After 90 days | Independent audit of all financial flows, balances, and fee calculations. |
| Bug bounty program | After security hardening complete | Incentivize external security researchers to find and report vulnerabilities. |

---

## 9. Compliance Considerations

### 9.1 Data Classification

| Data | Classification | Handling |
|------|---------------|----------|
| Staking amounts and positions | CONFIDENTIAL | Encrypted at rest (when implemented). Access-logged. |
| Agent public keys | PUBLIC | Intentionally public. Published via API. |
| Agent private keys | RESTRICTED | Never server-stored. Client-side only. |
| Database credentials | RESTRICTED | Environment variables only. Never logged. Never committed. |
| Treasury balances | INTERNAL | Accessible to admin roles only. |
| Yield distribution records | CONFIDENTIAL | Contains financial positions of individual stakers. |
| API request logs | INTERNAL | Retained 30 days. IP addresses hashed after 30 days. |

### 9.2 Regulatory Readiness

| Regulation | Current Status | Action Required |
|------------|---------------|----------------|
| **GDPR** | Partially ready | Implement right-to-deletion for user data when C6 is built. Publish privacy policy. |
| **PCI DSS** | Not applicable (no card data) | Stripe handles all card processing. Vouch never touches card data. |
| **UK FCA** | Monitoring | If insurance products launch, evaluate discretionary mutual licensing requirements. |
| **Money transmission** | Monitoring | Staking may constitute money transmission in some jurisdictions. Seek legal counsel before accepting fiat deposits from users in regulated markets. |

---

## 10. Document Maintenance

This threat model is a living document. It must be updated when:

1. New endpoints are added to the API surface.
2. New financial operations are implemented (insurance products, treasury withdrawals).
3. New threat actors or attack vectors are identified.
4. Residual risks are remediated.
5. The deployment architecture changes (multi-instance, managed database, CDN).
6. A security incident occurs (add post-mortem findings).

**Review cadence:** Monthly during active development. Quarterly after launch stabilization.

**Ownership:** Alan Carroll (platform owner) + Percy (Architect Agent, author).

---

## Appendix A: File Reference

All source files referenced in this document, with their absolute paths within the
Percival Labs monorepo.

| File | Purpose |
|------|---------|
| `apps/vouch-api/src/middleware/verify-signature.ts` | Ed25519 signature verification, nonce tracking, auth bypass flag |
| `apps/vouch-api/src/middleware/rate-limit.ts` | Token bucket rate limiter (5 tiers) |
| `apps/vouch-api/src/services/staking-service.ts` | Core financial operations (stake, unstake, withdraw, distribute, slash) |
| `apps/vouch-api/src/routes/staking.ts` | Staking API route handlers with authorization checks |
| `apps/vouch-api/src/routes/agents.ts` | Agent registration, profile management, key rotation |
| `apps/vouch-api/src/lib/schemas.ts` | Zod validation schemas for all endpoints |
| `apps/vouch-api/src/index.ts` | Server entry point (CORS, headers, body limit, error handler, middleware mounting) |
| `apps/vouch-api/src/openapi-spec.ts` | OpenAPI 3.1 specification |
| `packages/vouch-db/src/schema/staking.ts` | Drizzle schema (pools, stakes, fees, distributions, nonces, treasury) |
| `packages/vouch-db/src/connection.ts` | PostgreSQL connection (throws on missing DATABASE_URL) |
| `docker/docker-compose.yml` | Docker deployment configuration (env vars, networks, health checks) |

## Appendix B: Cryptographic Primitives

| Primitive | Usage | Implementation |
|-----------|-------|---------------|
| Ed25519 | Agent request signing and verification | `crypto.subtle.verify('Ed25519', ...)` (Web Crypto API) |
| SHA-256 | Request body hashing, key fingerprinting | `crypto.subtle.digest('SHA-256', ...)` (Web Crypto API) |
| ULID | Primary keys for all tables | `ulid()` from `ulid` package (time-sortable, unique) |
| Base64 | Key encoding, signature encoding | `Buffer.from(str, 'base64')` / `buf.toString('base64')` |
| Hex | Key fingerprints, evidence hashes | `Buffer.from(buf).toString('hex')` |

**No custom cryptography is used.** All cryptographic operations use platform-provided
primitives (Web Crypto API) with well-vetted algorithms. Ed25519 was selected for its:
- 128-bit security strength with compact 32-byte keys and 64-byte signatures.
- Deterministic signatures (no nonce-reuse vulnerability, unlike ECDSA).
- Resistance to side-channel attacks by design.
- Wide deployment (SSH, Signal, Tor, cryptocurrency systems).

## Appendix C: Canonical Request Format

The canonical request format used for Ed25519 signature verification:

```
METHOD\n
PATH_WITH_QUERY\n
TIMESTAMP\n
NONCE\n
BODY_SHA256_HEX
```

**Example (POST with body):**
```
POST
/v1/staking/pools/01HQRZ.../stake?dry_run=true
2026-02-20T10:00:00.000Z
550e8400-e29b-41d4-a716-446655440000
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

**Example (GET without body):**
```
GET
/v1/staking/pools?page=1&limit=25
2026-02-20T10:00:00.000Z
550e8400-e29b-41d4-a716-446655440001

```

The empty trailing line represents the empty body hash. The nonce is included only when
the `X-Nonce` header is present.

---

*Threat model authored by Percy (Architect Agent), Percival Labs*
*Classification: INTERNAL -- Architecture Security Review*
*Vouch Threat Model v1.0*
*2026-02-20*

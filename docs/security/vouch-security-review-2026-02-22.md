# Vouch Platform — Pre-Launch Security Review

**Date:** 2026-02-22
**Scope:** All Vouch authentication, authorization, staking, trust scoring, outcome resolution, rate limiting, and SDK code
**Method:** Three parallel security reviewers covering: (1) auth layer, (2) staking/trust/outcomes, (3) SDK/rate-limiting
**Status:** Review complete. Remediation in progress.

---

## Executive Summary

Reviewed 20+ files across the Vouch platform. After deduplication across three independent reviewers, found **39 unique vulnerabilities**: 7 CRITICAL, 11 HIGH, 14 MEDIUM, 7 LOW.

Three systemic issues emerged:
1. **Identity trust inconsistency** — Some routes use `c.get('verifiedAgentId')`, others read raw `X-Agent-Id` header
2. **Self-dealing has no guards** — No checks for self-vouching (outcomes), self-staking (pools), or Sybil farming
3. **Rate limiting is cosmetic** — `X-Forwarded-For` spoofing + `X-Agent-Id` fallback + unbounded memory store

---

## Files Reviewed

### Auth Layer
- `apps/vouch-api/src/middleware/nostr-auth.ts`
- `apps/vouch-api/src/middleware/verify-signature.ts`
- `apps/vouch-api/src/middleware/verify-user.ts`
- `apps/vouch-api/src/routes/auth.ts`
- `apps/vouch-api/src/lib/jwt.ts`
- `apps/registry/src/auth/jwt.ts`
- `apps/vouch/src/lib/auth.ts`

### Staking / Trust / Outcomes
- `apps/vouch-api/src/services/outcome-service.ts`
- `apps/vouch-api/src/services/staking-service.ts`
- `apps/vouch-api/src/services/trust-service.ts`
- `apps/vouch-api/src/lib/trust.ts`
- `apps/vouch-api/src/routes/staking.ts`
- `apps/vouch-api/src/routes/trust.ts`
- `apps/vouch-api/src/routes/tables.ts`
- `packages/vouch-db/src/schema/staking.ts`
- `packages/vouch-db/src/schema/tables.ts`

### SDK / Rate Limiting
- `apps/vouch-api/src/routes/sdk.ts`
- `apps/vouch-api/src/middleware/rate-limit.ts`
- `apps/registry/src/middleware/rate-limit.ts`
- `apps/agents/src/middleware/auth.ts`

### Supporting
- `apps/vouch-api/src/index.ts`
- `apps/vouch-api/src/lib/schemas.ts`

---

## CRITICAL Findings (7)

### C1. VOUCH_SKIP_AUTH Has No Production Kill Switch

**Files:** `nostr-auth.ts:13`, `verify-signature.ts:11`
**OWASP:** A01 Broken Access Control, A05 Security Misconfiguration

`VOUCH_SKIP_AUTH` is a simple env var boolean check with zero runtime enforcement that it cannot be set in production. If accidentally set (copied `.env`, CI/CD error, container misconfiguration), ALL authentication is completely bypassed.

In `verify-signature.ts`, when SKIP_AUTH is true, any value in the `X-Agent-Id` header is trusted as verified identity. In `nostr-auth.ts`, the pubkey from an unverified, unsigned Nostr event is trusted.

**Attack scenario:** Production inherits `VOUCH_SKIP_AUTH=true` from staging. Attacker sends `X-Agent-Id: victim-agent-id` and operates as any agent — staking, unstaking, score manipulation, outcome fraud.

**Fix:**
```typescript
const SKIP_AUTH = process.env.VOUCH_SKIP_AUTH === 'true';
if (SKIP_AUTH && process.env.NODE_ENV === 'production') {
  console.error('[FATAL] VOUCH_SKIP_AUTH=true is forbidden in production. Exiting.');
  process.exit(1);
}
```

---

### C2. Registry JWT Uses Timing-Attack-Vulnerable String Comparison

**File:** `registry/src/auth/jwt.ts:48`
**OWASP:** A02 Cryptographic Failures

The `verifyToken` function compares signatures using `!==` — a non-constant-time operation that short-circuits on the first differing character. An attacker can recover the HMAC signature byte-by-byte via timing side-channel, then forge arbitrary JWTs.

The hand-rolled JWT implementation has no library-level protections. The `jose` library (already used in vouch-api) handles this correctly internally.

**Fix:** Replace hand-rolled JWT with `jose` library, or at minimum use `crypto.timingSafeEqual`.

---

### C3. Registry JWT Has No Algorithm Enforcement

**File:** `registry/src/auth/jwt.ts:41-60`
**OWASP:** A02 Cryptographic Failures

The `verifyToken` function never checks the `alg` field in the JWT header. It blindly recomputes HMAC-SHA256 regardless of the declared algorithm. If the implementation is ever extended to support asymmetric algorithms, a classic algorithm confusion attack becomes possible.

The header is decoded but never inspected at all. Combined with the manual implementation (no library protections), this creates a dangerous class of vulnerabilities.

**Fix:** Migrate to `jose` library (resolves C2 and C3 together).

---

### C4. Self-Vouching — Agent Reports Outcomes With Itself as Counterparty

**File:** `outcome-service.ts:60-131`, `sdk.ts:212-258`
**OWASP:** A01 Broken Access Control

No validation that `agentPubkey !== counterpartyPubkey`. An agent can report an outcome where it is both performer and purchaser. The matching logic finds a match when the same agent reports from both roles, awarding "full" credit (1.0x weight) and directly inflating the trust score.

**Attack scenario:**
1. Agent A reports as "performer" with counterparty = own pubkey, taskRef "task-1"
2. Agent A reports as "purchaser" with counterparty = own pubkey, taskRef "task-1"
3. Match found → full credit → successRate 100% → trust score inflated
4. Repeat 100 times → diamond tier

**Fix:**
```typescript
if (agentPubkey === counterpartyPubkey) {
  throw new Error('Cannot report outcome with yourself as counterparty');
}
```

---

### C5. IP Spoofing Bypasses ALL Rate Limiting

**Files:** `vouch-api/middleware/rate-limit.ts:158-159`, `registry/middleware/rate-limit.ts:137`
**OWASP:** A01 Broken Access Control

Both rate limiters extract client IP from `X-Forwarded-For` with zero validation:
```typescript
function getClientIp(c: Context): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
```

Any client can spoof this header with a random IP per request, getting a fresh rate limit bucket each time. This completely nullifies ALL rate limiting — registration (5/hour), login (10/min), financial transactions.

**Fix:** Use the connecting socket IP as default. If behind a reverse proxy, validate against a trusted proxy list. In Bun/Hono, use the platform's socket address, not the client-controlled header.

---

### C6. Rate Limiter Falls Back to Spoofable X-Agent-Id Header

**File:** `vouch-api/middleware/rate-limit.ts:213-217`
**OWASP:** A01 Broken Access Control

The `agentRateLimiter` falls back to an unauthenticated header:
```typescript
const agentId =
  c.get('verifiedAgentId') ||
  c.req.header('X-Agent-Id') ||   // ATTACKER CONTROLLED
  getClientIp(c);
```

An attacker can: (1) rotate `X-Agent-Id` values for unlimited rate limit buckets, or (2) set `X-Agent-Id: <victim>` to exhaust the victim's rate limit tokens, locking them out of staking.

**Fix:** Remove `X-Agent-Id` header fallback. Only use `c.get('verifiedAgentId')` or IP.

---

### C7. Table Leave Route Reads Raw X-Agent-Id Instead of Verified Context

**File:** `tables.ts:151-154`
**OWASP:** A01 Broken Access Control

The `POST /:slug/leave` route reads agent identity from the raw `X-Agent-Id` header instead of `c.get('verifiedAgentId')`. The join route (line 94) correctly uses the verified context. This inconsistency means if middleware is ever skipped or the auth path changes, leave is unprotected while join remains secure.

**Fix:**
```typescript
// Line 153: Change from
const agentId = c.req.header('X-Agent-Id');
// To
const agentId = c.get('verifiedAgentId');
```

---

## HIGH Findings (11)

### H1. JWT Missing Issuer and Audience Claims

**Files:** `vouch-api/lib/jwt.ts:22-28`, `registry/auth/jwt.ts:23-36`
**OWASP:** A02 Cryptographic Failures, A07 Identification and Authentication Failures

Neither JWT implementation sets or validates `iss` or `aud` claims. If both services share a `JWT_SECRET` (common in monorepo deployments), a JWT minted by the registry can be accepted by vouch-api and vice versa (cross-service token confusion).

**Fix:** Add `.setIssuer('vouch-api').setAudience('vouch-app')` to signing, and validate on verify.

---

### H2. NIP-98 URL Validation Ignores Query Parameters

**File:** `nostr-auth.ts:133-151`
**OWASP:** A01 Broken Access Control

The code explicitly strips query params: "match origin + pathname (ignore query params for flexibility)". NIP-98 spec requires matching the absolute URL. An attacker can reuse a NIP-98 event signed for one URL to authenticate against the same path with different query parameters.

**Fix:** Compare full URL including query string per NIP-98 spec.

---

### H3. No Replay Protection on NIP-98 Events

**File:** `nostr-auth.ts:158-163`
**OWASP:** A07 Identification and Authentication Failures

Timestamp freshness (60s window) is validated, but event IDs are not tracked. Within the 60s window, the same NIP-98 event can be replayed unlimited times. For state-mutating endpoints (POST outcomes, register), this enables duplicate operations.

**Fix:** Track seen event IDs in a short-lived store (60s TTL matching timestamp window). Reject duplicates.

---

### H4. Nonce Replay Protection Optional in Ed25519 Auth

**File:** `verify-signature.ts:91-107`
**OWASP:** A07 Identification and Authentication Failures

The nonce check is conditional: `if (nonce) { ... }`. If `X-Nonce` header is omitted, the request proceeds with only timestamp-based replay protection (5-minute window). Since the canonical string construction also conditionally includes the nonce (`if (nonce) canonicalParts.push(nonce)`), a request originally sent WITHOUT a nonce can be replayed freely within 5 minutes.

**Fix:** Make the nonce header mandatory for all authenticated requests.

---

### H5. Index Instead of Unique Constraint on Active Stakes

**File:** `packages/vouch-db/src/schema/staking.ts:49-51`
**OWASP:** A01 Broken Access Control

Schema defines an `index()` (not `unique()`) on `(poolId, stakerId) WHERE status = 'active'`. A regular index does NOT enforce uniqueness. A staker can create multiple active stakes via concurrent requests, multiplying yield receipts and inflating `totalStakers`.

**Fix:** Change `index()` to `unique()` or use raw SQL migration:
```sql
CREATE UNIQUE INDEX unique_one_active_stake_per_staker ON stakes (pool_id, staker_id) WHERE status = 'active';
```

---

### H6. Agent Can Stake in Its Own Pool (Self-Vouching via Staking)

**Files:** `staking.ts:109-138`, `staking-service.ts:175-238`
**OWASP:** A01 Broken Access Control

No check preventing the pool-owning agent from staking in its own pool. This inflates the backing component (25% of Vouch score). The staker trust quality score uses the agent's own score, creating a compounding feedback loop.

**Fix:**
```typescript
const pool = await getPoolSummary(poolId);
if (pool && body.staker_id === pool.agentId) {
  return error(c, 403, 'FORBIDDEN', 'Agents cannot stake in their own pool');
}
```

---

### H7. Outcome Report Flood — No Deduplication on taskRef

**Files:** `outcome-service.ts:60-131`, `sdk.ts:247`
**OWASP:** A01 Broken Access Control

The SDK generates a random `taskRef` if none provided: `body.task_ref || crypto.randomUUID()`. No uniqueness constraint on `(agentPubkey, taskRef, role)`. An agent can submit thousands of partial-credit outcomes rapidly, each with a unique auto-generated taskRef, inflating successRate.

**Fix:**
1. Add unique constraint: `UNIQUE(agent_pubkey, task_ref, role)`
2. Rate limit outcome submissions per agent (10/min)
3. Remove auto-generation of taskRef — require it explicitly

---

### H8. Unstake/Withdraw body.staker_id Not Cross-Validated With Caller

**File:** `staking.ts:141-202`
**OWASP:** A01 Broken Access Control

The routes perform an ownership check using `callerId`, but then pass `body.staker_id` to the service function. If `callerId` is undefined (middleware path change, new auth scheme), the guard is skipped entirely and `body.staker_id` is trusted without verification.

**Fix:** Use verified caller identity directly. Never accept identity from request body:
```typescript
if (!callerId) return error(c, 401, 'AUTH_REQUIRED', 'Authentication required');
const result = await requestUnstake(stakeId, callerId);
```

---

### H9. Unbounded In-Memory Rate Limit Store (Memory Exhaustion DoS)

**Files:** `vouch-api/middleware/rate-limit.ts:68-71`, `registry/middleware/rate-limit.ts:40-43`
**OWASP:** A05 Security Misconfiguration

Rate limit store is an unbounded `Map<string, TokenBucket>`. Combined with C5 (IP spoofing), an attacker can create millions of unique keys. Each key ~100-150 bytes. At 10K IPs/second, 3M entries before 5-minute cleanup fires = 600-900MB of heap exhaustion.

**Fix:** Add max store size (100K entries). Use LRU eviction or move to Redis for production.

---

### H10. SDK Registration Missing Dedicated Rate Limit Tier

**File:** `index.ts:98-121`
**OWASP:** A05 Security Misconfiguration

`POST /v1/sdk/agents/register` only gets the global 100/min limit. The registration tier (5/hour) is on `/v1/agents/register` — different path. An attacker with Nostr key rotation can register 100 agents per minute (Sybil attack vector).

**Fix:** Add explicit registration-tier rate limiting for SDK registration path.

---

### H11. Race Condition in Table Join/Leave Subscriber Count

**File:** `tables.ts:107-135 (join), 164-179 (leave)`
**OWASP:** A01 Broken Access Control

Join and leave are NOT wrapped in transactions. Membership check, insert, and count increment are separate operations. Concurrent requests can create duplicate memberships and desync the counter. Server crash between delete and decrement makes counter permanently wrong.

**Fix:** Wrap in database transactions with row-level locking:
```typescript
await db.transaction(async (tx) => {
  const [tableRow] = await tx.select().from(tables).where(eq(tables.slug, slug)).for('update');
  // check, insert, update within tx
});
```

---

## MEDIUM Findings (14)

### M1. JWT Secret Strength Not Enforced
**Files:** Both `jwt.ts` files. No minimum entropy check on `JWT_SECRET`. A short secret is trivially brute-forceable. **Fix:** Require `JWT_SECRET.length >= 32`.

### M2. 7-Day JWT Expiry With No Rotation or Revocation
**Files:** Both `jwt.ts` files. No revocation mechanism. Logout deletes cookie but token remains valid for 7 days from any client. **Fix:** Short-lived tokens + refresh rotation, or server-side revocation list.

### M3. Cookie Secure Flag Only in Production
**File:** `auth.ts:18-26`. `secure` only set when `NODE_ENV === 'production'`. Staging environments send cookies over HTTP. **Fix:** `secure: process.env.NODE_ENV !== 'development'`.

### M4. X-Forwarded-For Trust Without Proxy Validation
**File:** `rate-limit.ts:158-160`. (Overlaps with C5 but called out separately for the proxy trust issue.) Users can set their apparent IP to another user's IP to consume their rate limit tokens. **Fix:** Validate against trusted proxy list.

### M5. CORS Origin Defaults to Localhost
**File:** `index.ts:48`. `VOUCH_CORS_ORIGIN || 'http://localhost:3600'` — wrong default in production, no multi-origin support. **Fix:** Support comma-separated origins, fail if unset in production.

### M6. Error Messages Leak Validation Details
**File:** `nostr-auth.ts:117-162`. Returns highly specific errors: URL mismatches revealing server URLs, exact clock drift, method detection. Helps attackers iteratively debug their attacks. **Fix:** Generic external errors, specific server-side logs.

### M7. Password Complexity Not Enforced
**File:** `schemas.ts:26`. Only `min(8)`. No complexity requirements, no breach list check. **Fix:** Add regex for uppercase/lowercase/number at minimum.

### M8. Activity Fee Recording Has No Transaction Protection
**File:** `staking-service.ts:338-361`. Pool lookup and insert are separate operations. Fee can be recorded against a frozen/dissolved pool if status changes between check and insert.

### M9. Yield Distribution Period Overlap Not Prevented
**File:** `staking-service.ts:370-503`. No check that periods don't overlap. Concurrent calls for the same period could split fees between two distribution records.

### M10. Pool Owner Controls Distribution Timing
**File:** `staking.ts:249-292`. Owner can strategically time distributions to benefit/harm specific stakers. **Fix:** Enforce minimum intervals or automate via cron.

### M11. Trust Score Refresh Has No Cooldown
**File:** `trust.ts:51-79`. Agent can refresh after favorable actions, avoid refreshing after unfavorable ones — gaming the cached score. **Fix:** Minimum 1-hour cooldown tracked in DB.

### M12. NIP-85 Trust Attestation Unsigned
**File:** `sdk.ts:126-167`. The `/me/prove` endpoint returns NIP-85 events with empty `id` and `sig` fields. Anyone can forge attestations. **Fix:** Implement service signing key before launch.

### M13. NIP-05 Identifier Collision via Name Normalization
**File:** `sdk.ts:58`. `"Agent-1"` and `"Agent 1"` both normalize to `agent-1@vouch.xyz`. No uniqueness check on normalized identifier. **Fix:** Check NIP-05 uniqueness after normalization before INSERT.

### M14. Missing Input Length Limits on Registration/Outcome Fields
**File:** `sdk.ts:26-33, 220-228`. No length limits on `name`, `model`, `capabilities[]`, `description`, `evidence`, `task_ref`. Individual fields could be very large (900KB evidence). **Fix:** Add explicit field-level validation.

---

## LOW Findings (7)

### L1. Login Timing Leak on Missing User
**File:** `auth.ts:109-124`. Argon2 verification skipped when user not found. ~100-500ms timing difference reveals whether email exists. **Fix:** Run dummy verify when user not found.

### L2. Frontend Auth Library Does Not Validate Response Shape
**File:** `vouch/src/lib/auth.ts:21-50`. Casts `body as T` without validation. Malformed responses propagate through app. **Fix:** Use Zod schemas on client side.

### L3. Registry JWT process.exit() Bypasses Cleanup
**File:** `registry/jwt.ts:4-8`. `process.exit(1)` on missing secret bypasses graceful shutdown. **Fix:** Throw error instead.

### L4. DisplayName HTML Not Sanitized at Storage
**File:** `schemas.ts:27-31`. `<img src=x onerror=alert(1)>` stored as displayName. React escapes by default, but any non-React rendering is vulnerable. **Fix:** Strip HTML at schema level.

### L5. Pagination Not Clamped for Negative Values
**Files:** `staking.ts:41`, `outcome-service.ts:143`. Inconsistent clamping across endpoints. **Fix:** Apply `Math.max(1, page)` consistently.

### L6. Non-Constant-Time API Key Comparison
**File:** `agents/auth.ts:28,36`. `===` comparison on API key is timing-vulnerable. **Fix:** Use `crypto.timingSafeEqual`.

### L7. Rate Limit Headers Leak Configuration
**Files:** Both `rate-limit.ts`. `X-RateLimit-Limit` and remaining tokens help attackers calibrate bypass strategies. **Fix:** Consider only returning headers on 429 responses.

---

## Remediation Priority

### Phase 1: Pre-Launch Blockers (MUST FIX)

| ID | Fix | Effort |
|----|-----|--------|
| C1 | Production guard on SKIP_AUTH | 10 min |
| C2+C3 | Registry JWT → jose library | 30 min |
| C4 | Self-vouching check in outcomes | 10 min |
| C5 | Socket IP for rate limiting | 20 min |
| C6 | Remove X-Agent-Id from rate limiter | 5 min |
| C7 | Table leave use verified context | 5 min |
| H1 | JWT issuer/audience claims | 15 min |
| H3 | NIP-98 replay protection | 30 min |
| H4 | Mandatory nonce in Ed25519 auth | 15 min |
| H5 | Unique constraint on active stakes | 15 min |
| H6 | Block self-staking | 10 min |
| H7 | Outcome dedup + rate limit | 20 min |
| H8 | Caller validation on unstake/withdraw | 10 min |

### Phase 2: Pre-Public-Beta

| ID | Fix | Effort |
|----|-----|--------|
| H2 | NIP-98 full URL matching | 15 min |
| H9 | Bounded rate limit store | 30 min |
| H10 | SDK registration rate limit | 5 min |
| H11 | Table join/leave transactions | 30 min |
| M1 | JWT secret minimum length | 5 min |
| M5 | CORS multi-origin support | 15 min |
| M6 | Generic error messages | 20 min |
| M12 | Service signing for NIP-85 | 1 hr |
| M13 | NIP-05 uniqueness check | 10 min |
| M14 | Input length validation | 20 min |

### Phase 3: Post-Launch Hardening

| ID | Fix | Effort |
|----|-----|--------|
| M2 | Token rotation/revocation | 2 hrs |
| M3 | Cookie secure by default | 5 min |
| M7 | Password complexity | 10 min |
| M8-M11 | Transaction safety, cooldowns | 2 hrs |
| L1-L7 | Low severity fixes | 1 hr |

---

*Report generated by Percy (PAI) security review pipeline. Three parallel pentesting agents reviewed auth, staking/trust, and SDK/rate-limiting domains independently.*

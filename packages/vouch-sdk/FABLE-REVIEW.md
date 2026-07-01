# Vouch SDK + DB — Fable Review

**Date:** 2026-07-01 · **Reviewer:** Fable 5 · Part of the consolidated review at `docs/reviews/2026-07-01-fable-consolidated-review.md`.
**Covers:** `packages/vouch-sdk` and `packages/vouch-db`.

## 1. Overview

The SDK is small (~3,300 LOC), dependency-light (`@noble/curves`, `@scure/base` only), and uses vetted crypto libraries rather than hand-rolled primitives — the right instincts. The DB layer shows prior security passes (H1 nonce table, H5 partial unique index, H7 outcome dedup, CHECK constraints on money columns). The two most serious problems are not in the signing math: (a) **plaintext custodial Nostr private keys in the database**, and (b) a **broken schema hash in the rug-pull detector** that misses exactly the attack it exists to catch. Below that: key-material exposure through overly chatty objects, two parallel identity stacks, unencoded path parameters, and schema drift.

## 2. Cryptography & key management

Read every line of `crypto.ts` and `nostr-identity.ts`. Primitives: **sound**.

*Done right:* Ed25519 via `crypto.subtle` (crypto.ts:22-26); Schnorr/secp256k1 via `@noble/curves`; randomness delegated to WebCrypto/`schnorr.utils.randomPrivateKey()`; canonical request format binds method, path+query, timestamp, nonce, body SHA-256 (crypto.ts:70); nonce `crypto.randomUUID()` backed by `request_nonces` unique constraint; NIP-98 events include `payload` body-hash tag (vouch.ts:622-627); `verifyEvent` verifies **both** event ID and Schnorr signature (nostr-identity.ts:134-143); self-play prevention in `reportOutcome` (vouch.ts:380-382).

*Problems (severity order):*
- **`NostrIdentity` carries the secret everywhere.** `Vouch.identity` is a `readonly` **public** field (vouch.ts:247) whose type includes `secretKeyHex`/`nsec`. Any `console.log`/`JSON.stringify`/logger that serializes the client leaks the private key. `VouchClient` retains `privateKeyBase64` for its lifetime (client.ts:123,135). → Private identity, `npub`/`pubkeyHex` getters, explicit `exportNsec()`, redacting `toJSON()`.
- **`hexToBytes` performs zero validation** (nostr-identity.ts:179-185). Odd-length/non-hex → `NaN` → silently coerced to `0`; corrupted key bytes derive an identity instead of throwing. Validate `/^[0-9a-f]{64}$/i` and throw.
- **Silent identity auto-generation** (vouch.ts:255-263): `new Vouch({ nsec: process.env.VOUCH_NSEC })` with unset var silently mints a new identity; `register()` duplicates and orphans reputation. Require explicit `Vouch.generate()` or throw on falsy `nsec`.
- **CLI keygen prints nsec to stdout** (cli.ts:23) — offer `--out file` with 0600.
- **No NIP-98 `expiration` tag / clock guidance** — Nostr path relies solely on server `created_at`; Ed25519 path has nonces, Nostr doesn't.
- **Ed25519-in-WebCrypto portability** (crypto.ts:22) — uneven browser support; if targeting browsers, use `@noble/curves/ed25519`.
- `buildRegistrationMessage` (crypto.ts:121-123) `\n`-joined without length prefixes — fine only while fields can't contain `\n`.

## 3. Top findings

| # | Sev | Location | Issue | Recommendation |
|---|-----|----------|-------|----------------|
| 1 | **Critical** | vouch-db `schema/accounts.ts:23`, migration `0020` | `vouch_nsec` stored **plaintext** (`// TODO: encrypt`) — custodial Nostr keys; one DB dump = identity takeover of every managed agent. `agentKeyToken`, `provisionedAgentKey` also plaintext | Encrypt at rest (AES-256-GCM w/ KMS key, like `nwcConnections.connectionString` claims) or never custody nsec (provision client-side). Blocker before paid launch |
| 2 | **Critical** | sdk `scanner/rug-pull.ts:154` | `JSON.stringify(schema, Object.keys(schema).sort())` — replacer whitelists only **top-level** keys at every depth; nested definitions (the poisoning surface) dropped from hash; nested rug-pulls invisible, reordering → false positives | Canonical JSON (RFC 8785 — already used in MCP-T) |
| 3 | **High** | sdk `vouch.ts:247` + `nostr-identity.ts:13-22`; `client.ts:123` | Secret exposed on public `identity` field / retained as instance string | Private fields, redacting `toJSON()`, explicit export |
| 4 | **High** | sdk `vouch.ts:255-263` | Falsy `nsec` silently generates a new identity | Throw on explicitly-passed-but-empty key; separate `Vouch.generate()` |
| 5 | **High** | vouch-db `schema/{trust-contagion,ai-bom,insurance}.ts` vs `drizzle/` | **Schema drift**: 3 files (10+ tables) have no generated migrations (latest `0024`); code references tables not in deployed DBs | `drizzle-kit generate` + commit; CI drift check |
| 6 | **High** | sdk `client.ts:269,295…`; `vouch.ts:463,480…` | Path params interpolated into URLs with no `encodeURIComponent` → **signed** route confusion | Encode every path segment |
| 7 | **High** | sdk `scanner/response-scanner.ts:121-137` | `sanitizeResponse` strips only the **tags**, leaving the instruction body (`<system>ignore…</system>` → `ignore…`) | Strip tag + enclosed content, or reject |
| 8 | **High** | sdk `package.json:26` | `build`/`prepublishOnly` use `tsc --noCheck` → npm package published **without type-checking** | Split typecheck + emit; `noEmitOnError` in prepublish |
| 9 | Med | sdk `trust-contagion.ts:261-282` | Fail-open: `getStakeGraph` swallows errors → empty edges → `propagate()` returns "success" with zero impacts after a slash; write endpoints unauthenticated | Distinguish "no stakers" from "fetch failed"; sign the writes |
| 10 | Med | sdk `nostr-identity.ts:179` | Unvalidated hex → NaN → 0 silent key corruption | Validate + throw |
| 11 | Med | sdk `package.json` (no `exports`) vs `scanner/index.ts:12` | Documented `@percival-labs/vouch-sdk/scanner` import can't resolve | Add `exports` map (`.`, `./scanner`, `./bom`) |
| 12 | Med | sdk `vouch.ts:127` vs `client.ts:116` | Default API is a hardcoded Railway internal URL baked into every published version; legacy defaults to localhost | Point both at `api.percival-labs.ai` |
| 13 | Med | vouch-db `schema/posts.ts:39-48`, `tables.ts:26-35` | `votes` has no unique `(targetId,targetType,voterId)` → double-voting; `memberships` no unique `(tableId,memberId)` | Add unique indexes |
| 14 | Med | vouch-db missing indexes | `posts.tableId`, `comments.postId`, `trust_events.subjectId`, `vouch_score_history(subjectId,createdAt)`, `stakes.stakerId` — hot trust/feed queries | Add before volume hurts |
| 15 | Med | sdk `vouch.ts:150,223` | `domain` option accepted in `trust.check`/`trustGate` and silently ignored (violates "never cross score domains") | Wire through or remove |
| 16 | Low | sdk `vouch.ts:251-253` | `_scoreCache`, `CACHE_TTL_MS`, `_agentId` dead | Delete or implement |
| 17 | Low | sdk `bom/collector.ts:123-125` | `evId`/`uuid4` use `Math.random()` in audit artifacts | Use `crypto.randomUUID()`; cap unbounded arrays |
| 18 | Low | vouch-db `schema/stripe.ts:15` | jsonb `.default('{}')` string vs `.default({})` | Normalize |
| 19 | Low | vouch-db `connection.ts:7-11` | Throws at import; eager pool; no explicit SSL/TLS; raw `pool` exported | Lazy init/factory; document TLS |
| 20 | Low | sdk `scanner/static-analysis.ts:53-87` | Base64 pattern flags any 40+ char token; `https?://` and "you are/you must" as critical → high false-positive rate | Entropy check before flagging; tune before enabling |

## 4. Security concerns (SDK surface + DB)

- **Fail-closed posture mostly right**: `trust.check` throws on network failure, 404→0; `trustGate` catches → `ok:false`; scanner fails closed on internal errors. Exceptions: #7 (sanitize) and #9 (contagion).
- **Unvalidated response shapes**: `trust.score` casts `res.json()` and dereferences `d.performance.total_outcomes` — malformed/compromised response throws raw `TypeError` at the integrator. Add cheap structural checks.
- **npub handling asymmetry**: `trust.score` validates decoded hex; `Vouch.verify()` and `reportOutcome` skip the length check. Centralize into `npubToValidatedHex()`.
- **RugPullDetector registry is in-memory only** — restart erases fingerprints; a rug pull across a restart is undetectable. Needs persistence.
- **Error hygiene** good — no key material leaks in errors.
- **DB**: parameterization inherent to Drizzle; money-path CHECK constraints unusually thorough. Gaps: `outcomes.rating` has no 1-5 CHECK; `trust_graph_edges` no unique on `stakeId` (refresh race double-counts exposure); `agent_keys` no unique on `publicKey`, no index on `agentId`; `bigint mode:'number'` safe for sats but overflows for msats — document.

## 5. Simplification & API ergonomics

- **Two full identity/auth stacks** ship in one package (legacy Ed25519 `VouchClient` + Nostr `Vouch`). Publish a deprecation timeline for `VouchClient` now (`@deprecated` JSDoc — non-breaking).
- **The barrel export makes everything permanent** (index.ts:60-120) — trust-contagion internals, scanner, BOM are top-level exports under a "never remove exports" rule while their feature flags are *comments*. Move experimental modules behind subpath exports so flags mean something.
- Duplicated tier thresholds (`scoreTier()` vs inline ternary vouch.ts:202). Repeated inline `import('./types.js').X`. Unify error types on `VouchApiError`.
- Stale identity strings: `@vouch/agent-sdk`, `api.vouch.xyz`, hardcoded `'0.1.0'` while package is 0.2.4.

## 6. Gaps / footguns for integrators

1. `confidence: evidenceCount/50` (vouch.ts:205) invented client-side — two SDK versions report different confidence. Move to API.
2. `trustGate` reason strings embed internal error messages → integrators leak infra hostnames.
3. No timeout/retry on any `fetch` — a hung API hangs the integrator; `trustGate` in middleware needs `AbortSignal.timeout` default.
4. `exportCredentials()` offers no encrypted-at-rest helper — every integrator writes plaintext JSON. Ship `saveCredentials(path, passphrase)`.
5. `Vouch.relay` accepted, stored, never used — relay publishing isn't implemented.
6. Nonce table needs a documented cleanup job.

## 7. Future planning

*Quick wins (<150 LOC each):* redacting `toJSON()` + private identity (3/4) · fix `_hashSchema` with JCS (2) · `drizzle-kit generate` for drift (5) + CI check · `exports` map + `encodeURIComponent` + hex validation · split `prepublishOnly` (8) · unique/hot-path indexes (13/14).

*Bigger bets:* **custodial-nsec elimination** (1 — the one finding that could end the product; client-side generation, or envelope encryption + rotation) · **VouchClient sunset** (v0.3 deprecate → v0.4 `/legacy` → 1.0 Nostr-only) · **scanner as a real product surface** (persistence-backed detector, entropy-gated patterns, true content-stripping sanitize, then flip the flag) · **stable API domain + response-shape validation** as the 1.0 contract.

## 8. Coverage note

Read in full: `crypto.ts`, `nostr-identity.ts` (every line), `client.ts`, `vouch.ts`, `index.ts`, `cli.ts`, `errors.ts`, `types.ts`, `trust-contagion.ts`, `bom/*`, all six `scanner/*`, `mcp/server.ts`, `integration.test.ts`, both `package.json`; vouch-db `connection.ts`, `index.ts`, **all 23 schema files**; migration filenames + targeted greps. Skipped: `mcp-t-client.ts` internals, `bom/index.ts` barrel, full migration SQL, vouch-api/Gateway/Gramarye. The claim that `nwcConnections.connectionString` is actually AES-256-GCM encrypted lives in vouch-api code not read here — the vouch-api reviewer should confirm.

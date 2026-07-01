# MCP-T — Fable Review

**Date:** 2026-07-01 · **Reviewer:** Fable 5 · Part of the consolidated review at `docs/reviews/2026-07-01-fable-consolidated-review.md`.
**Note:** MCP-T code spans `apps/vouch-api` (routes/services/lib), `apps/vouch-mcp-remote`, `packages/vouch-sdk`, and `apps/agents`.

## 1. Overview (architecture as-built)

**Intended lifecycle:** agent produces a `behavior.trace` event → publishes via JSON-RPC `trust/publish` to `POST /mcp-t/v1/publish` (NIP-98 auth, `routes/mcp-t.ts:88`) → adapter validates with Zod, rate-limits, stores in Postgres `behavioral_traces` with a pre-computed `fidelityRatio` = declared/total → `computeBehavioralFidelity` averages into a 0–1000 dimension (`behavioral-trace-service.ts:163`) feeding Vouch's composite (`trust-service.ts:240`) → consumers read via `trust/query`/`verify`/`history`, responses Ed25519-signed over RFC 8785 JCS (`lib/mcp-t-signing.ts`). Consumers: agents `trust-gate` maps score→tier→tool access; CF Worker `vouch-mcp-remote` exposes read-only trust tools.

**Actual lifecycle as-built:** the write path and read path do not connect. Every in-repo producer (SDK `mcp-t-client.ts`, agents `mcp-t-reporter.ts`, daemon `scripts/shared/mcp-t-emitter.ts`) sends `{events:[...]}` with a summary-shaped trace — not a JSON-RPC envelope and not the Zod `tool_calls`/`resources_accessed` payload the server requires. The route rejects with `-32600` **at HTTP 200** (`routes/mcp-t.ts:45-50`); every producer checks only `res.ok`, so the failure is invisible; `mcp-t-reporter.ts` returns `published:true`. The trust-gate consumer has the mirror-image bug. Signing is real; signatures are applied on read but **never verified anywhere in production code** (`mcptVerify` is called only in tests).

## 2. Trust-model soundness — can the audit be gamed?

Yes, five independent ways. The core invariant ("fidelity reflects behavior vs. declared intent, attested by someone other than the subject") is not enforced.

- **A — self-vouch via omitted issuer.** Self-vouch check is `if (issuerId && issuerId === subjectId)` (`mcp-t-adapter.ts:582`). `issuer_id` is free-form; omit it and the check passes. The authenticated `callerPubkey` (`:554`) is **never compared** to `issuer_id`/`subject_id` — only logged. Any agent can publish perfect traces about itself or fabricated traces about anyone.
- **B — self-labeled fidelity.** `declared:true/false` flags are asserted by the reporter with no server-side record of declared intent to check against. Fidelity is a self-graded exam. `arguments_hash`/`result_hash` optional, never verified.
- **C — selective reporting / omission.** Nothing forces a trace to exist. Misbehavior simply isn't published; absence yields the neutral 500 (`behavioral-trace-service.ts:166-173`); no coverage metric. The model rewards only good behavior.
- **D — confidence farming.** Confidence is count-based (`:80-87`); at 100 traces/agent/hour an attacker reaches the 0.95 ceiling in two hours. Exact replay blocked only by the unique index on `trace_id` (also enables a squatting DoS).
- **E — victim poisoning.** Because caller≠issuer≠subject is unchecked, an attacker publishes low-fidelity traces about a victim, dragging their fidelity down and exhausting the victim's rate limit (keyed on `subjectId`, `:603`).

**Tamper-evidence:** the "ledger" is a mutable Postgres table; incoming signatures are never verified on publish and never stored; `trust/history` events are freshly provider-signed at read time. Provenance collapses to "trust the operator's database." Signed, not tamper-evident.

## 3. Top findings (ranked)

| # | Sev | Location | Issue | Recommendation |
|---|-----|----------|-------|----------------|
| 1 | Critical | `mcp-t-adapter.ts:554,573,582` | Authenticated `callerPubkey` never bound; `issuer_id` attacker-controlled and omittable → self-vouch, forged third-party traces, victim poisoning | Set `issuerId = callerPubkey` server-side; reject if `callerPubkey === subject_id`; ignore client `issuer_id` |
| 2 | Critical | producers (`mcp-t-client.ts:149`, `mcp-t-reporter.ts:131`, `mcp-t-emitter.ts`) | All producers send non-JSON-RPC `{events:[...]}`; server rejects at HTTP 200; clients report `published:true`. **Zero traces ever land.** | One shared client emitting the JSON-RPC `trust/publish` envelope; check the JSON-RPC `error` field; add one round-trip integration test |
| 3 | High | `trust-gate.ts:147-159` + `agents/src/team.ts:569-579` | Gate queries with wrong wire format → always score 0/observer; and the check runs **async after the tool already executed**, log-only | Fix query format; make `canUseTool` a blocking pre-execution check in `executeAgentTask` |
| 4 | High | `mcp-t-adapter.ts` (no `mcptVerify`); `behavioral-traces.ts` (no signature column) | Incoming signatures never verified/stored; history re-signed on read → provenance = DB trust | Require reporter signature, verify on publish, persist it, return original + provider co-signature |
| 5 | High | `behavioral-trace-service.ts:100-112`; schema `declared` flags | Fidelity is self-graded: no pre-committed intent baseline | Intent pre-commitment: signed declaration (tool/resource allowlist) at contract start; server computes declared-vs-actual |
| 6 | High | `lib/mcp-t-signing.ts:32-34,62-72` | `DEV_SEED` public in source; prod missing-key path only `console.warn`s and signs with it → forgeable provider signatures | `throw` on missing key when `NODE_ENV=production`; treat dev-key signatures as invalid in consumers |
| 7 | Med | `mcp-t-adapter.ts:193,201-204` vs `trust-service.ts:201,213` | Identifier-domain mixing: ULID vs pubkey → evidence_count/confidence always floor in `trust/query` | Resolve subject to a canonical (ULID, pubkey) pair once |
| 8 | Med | `mcp-t-adapter.ts:597-607` | Rate limit keyed on subject not caller; race-able (count-then-insert) | Key on `callerPubkey`; enforce atomically |
| 9 | Med | `mcp-t-adapter.ts:639-653` | Non-`behavior.trace` events return `accepted:true` but are dropped — audit ledger acknowledging and discarding data | Return `unsupported` or persist |
| 10 | Med | `mcp-t-adapter.ts:174,221-223` | `evidence_count` fabricated inside signed attestations | Report real counts or omit |
| 11 | Med | `middleware/nostr-auth.ts:21-28,364` | NIP-98 `payload` tag optional (body unbound if omitted); replay cache in-memory | Require payload tag on POST; move replay cache to Postgres/Redis |
| 12 | Low | `vouch-mcp-remote/src/index.ts:31` | CORS `*`, no edge auth/rate limit; `verify_zk_proof` POST passthrough | Add body-size cap and worker rate limit |

## 4. Security concerns

- **Auth is good where it exists** (NIP-98 middleware: ID recompute, Schnorr verify, freshness, replay set, optional body hash, registered-agent requirement, `VOUCH_SKIP_AUTH` hard-fails in prod). The failure is that the authenticated identity is not used downstream (Finding 1).
- **Key management**: keygen clean; signing lib well-documented. Dev-seed prod fallback (Finding 6) is the one real hole. No key rotation story.
- **`mcptVerify` scope creep**: its docstring correctly says key↔provider binding is the caller's job, but no caller does it.
- **Remote worker** exposes only public read endpoints via `/v1/public` — correctly cannot reach `trust/publish`. Good boundary.
- **SDK `mcp/server.ts`** `vouch_report_outcome` lets an agent self-report outcomes — same caller-binding class as Finding 1.
- **Input validation**: adapter casts params without Zod on query/verify/history; `new Date(after)` with garbage → Invalid Date. Low risk, inconsistent with the repo's "Zod at boundaries" rule.

## 5. Simplification & streamlining

- **One trace schema, one client.** Two incompatible `BehaviorTrace` shapes (SDK vs agents, already drifted) and neither matches the server's canonical payload. Export the Zod schema + a `publishTrace()` from `vouch-sdk`; delete the copies.
- **NIP-98 header creation is triplicated** (SDK, `agents/tasks/nip98-auth.ts`, inline). One export.
- **`estimateConfidence` duplicated** (`mcp-t-adapter.ts:142`, `behavioral-trace-service.ts:80`).
- **Two MCP servers** with overlapping tool sets and hand-rolled JSON-RPC loops — share the plumbing or build the local one on `@modelcontextprotocol/sdk`.
- `routes/mcp-t.ts:88-125` duplicates `createPostHandler` — parameterize with an auth flag.
- `ProposalManager` (`tool-proposal.ts`) is in-memory, unauthenticated, unpersisted — either persist + bind approver identity or label as advisory scaffolding.

## 6. Spec/patent vs implementation gaps

1. **Permissions are advisory, not enforced.** The only enforcement point runs after the tool executes, logs, never blocks. For a patent covering permission enforcement from behavioral scores, there is currently no working reduction to practice in this repo.
2. **Audit is not independently verifiable.** "Open ledger" implies third parties verify without trusting the operator; the implementation is provider-signed reads over a mutable private table. The MCP-T↔Vouch boundary is nominal — Vouch doesn't read the ledger, it is the ledger (same process/DB).
3. **Fidelity ≠ intent conformance** — the declaration must exist independently of the trace; it doesn't.
4. **Spec versioning drift**: adapter claims v0.2.0; only spec in monorepo is v0.1.0-draft. The "38 automated tests" cited in CLAUDE.md are not in this repo — which is exactly why Finding 2 survived.

## 7. Future planning

**Quick wins (before dogfood, ~days):** fix producer wire format + one e2e test (Finding 2) · bind `issuer_id := callerPubkey`, reject caller==subject (Finding 1, ~20 LOC) · fail hard on missing prod signing key (Finding 6) · make trust-gate blocking + fix query parsing (Finding 3) · rate-limit by caller; stop acknowledging dropped events (8, 9).

**Bigger bets (before SBIR/defense pitch):** attested traces (reporter-signed, verified+stored on publish; weight self vs third-party) · intent pre-commitment (the patent's core claim — build it) · omission resistance (per-contract coverage; missing traces lower confidence) · tamper-evident ledger (hash-chain rows, periodically anchor the head as a signed Nostr event) · conformance + adversarial test suite (replay, self-vouch, poisoning, dev-key forgery).

**Sequencing:** 1→2→4 unblocks honest dogfood; 6→7 before claiming "behavioral fidelity" in any proposal; 9→10 before "open ledger" appears in SBIR text.

## 8. Coverage note

Read in full: all scoped files (routes/mcp-t.ts, mcp-t-adapter.ts, behavioral-trace-service.ts, mcp-t-signing.ts + tests, mcp-t-keygen.ts, all four vouch-mcp-remote files, sdk mcp-t-client.ts, sdk mcp/server.ts, trust-gate.ts, mcp-t-reporter.ts, tool-proposal.ts, nip98-auth.ts, behavioral-traces.ts schema), plus middleware/nostr-auth.ts, trust-service.ts composite wiring, team.ts enforcement site, mcp-t-emitter.ts (header), index.ts mounting. **Not examined**: the separate `Percival-Labs/mcp-t` spec repo (v0.2.0 text + its 38-test conformance claim), `/v1/public` route implementations, `identity/loader.ts` fallback-tier provenance.

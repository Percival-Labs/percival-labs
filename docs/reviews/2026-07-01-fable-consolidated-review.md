# Fable Review — Consolidated Strategic Report

**Date:** 2026-07-01
**Reviewer:** Fable 5 (four parallel read-only agents)
**Scope:** Vouch core (`apps/vouch-api`, ~26K LOC) · MCP-T layer · Vouch SDK + DB (`packages/vouch-sdk`, `packages/vouch-db`) · Gramarye harness (`~/PAI/Projects/Protopus`) — ~31K LOC read end-to-end.
**Status:** These are pre-build blockers. Fix before continuing feature work.

Per-project detail lives alongside each codebase:
- Vouch core → `apps/vouch-api/docs/FABLE-REVIEW-vouch-core.md`
- MCP-T → `apps/vouch-api/docs/FABLE-REVIEW-mcp-t.md`
- Vouch SDK + DB → `packages/vouch-sdk/FABLE-REVIEW.md`
- Gramarye → `<gramarye-repo>/docs/FABLE-REVIEW.md`

---

## One-sentence verdict

**The primitives are excellent and the boundaries leak.** Across all three projects the pure/computational layers are auditable, well-tested, and use vetted crypto. The failures cluster at the wiring: value moves without being collected, evidence is self-graded, keys sit where they can leak, and enforcement happens after the fact or not at all. This is a consistent, fixable failure shape.

---

## Four systemic themes (each spans multiple codebases)

1. **Money-in / money-out asymmetry.** Vouch pays real sats it never collected (treasury drain via self-reported fees, phantom NWC "collateral," free self-adjudicated insurance). MCP-T is the same shape one level up — it records behavior but enforces nothing. **Invariant to install everywhere: no value/trust leaves against evidence that isn't independently settled or attested.**

2. **Self-graded evidence.** MCP-T traces are self-reported and self-labeled with no independent intent baseline; insurance claims cite evidence the insured produced; behavioral fidelity is a self-graded exam. **Fix pattern: bind the authenticated caller server-side, require counterparty/third-party attestation, make omission lower confidence.**

3. **Identifier soup — one root cause behind ~5 findings.** agent-ULID vs hex-pubkey vs npub vs userId are conflated across the stack. It is why MCP-T can't bind caller to trace (self-vouch), why Vouch insurance can never verify a claim, and the SDK npub-length asymmetry. **A single canonical `resolveSubject() → {ulid, pubkey}` eliminates a whole class at once.**

4. **Key material where it can leak ("trust layer vs honeypot").** Plaintext custodial `nsec` in the DB; SDK `identity` is a public field whose type includes the secret key; MCP-T `DEV_SEED` signs in prod on missing key; Gramarye can ship RESTRICTED memory off-machine on a provider fallback.

---

## Unified priority list

### CRITICAL — fix before any prod flag flips
| # | Project | Finding | Location |
|---|---|---|---|
| C1 | Vouch | Treasury drain: self-reported fees → real yield payouts from node holding user deposits | `staking-service.ts:522`, `nwc-service.ts:228` |
| C2 | Vouch | Phantom stake collateral (unverified, revocable, slash never moves sats, no affected-party payout) | `staking-service.ts:884` |
| C3 | SDK/DB | Plaintext custodial Nostr private keys (`// TODO: encrypt`) | `vouch-db schema/accounts.ts:23` |
| C4 | SDK | Rug-pull hash misses nested poisoning (the attack it exists to catch) | `scanner/rug-pull.ts:154` |
| C5 | MCP-T | All traces silently fail to land (wire-format mismatch, HTTP 200, `published:true`) — dogfood corpus likely empty | producers vs `routes/mcp-t.ts:45` |
| C6 | MCP-T | Caller never bound to trace → self-vouch, victim-poisoning, forged third-party traces | `mcp-t-adapter.ts:554,582` |

### HIGH
- **Vouch:** insurance ID/pubkey mismatch (no claim can verify) + zero authz on insurance mutations (self-adjudication) · metering price frozen at $85k fallback (`captured_at` typo) · backing-quality unit bug (bps read as 0–1000) · double-credit race in `confirmDeposit` · trust farmable at near-zero cost across all 6 dimensions.
- **SDK:** secret leaks via public `identity` field · schema drift (10+ tables, no migrations) · npm publishes without typecheck · unencoded path params (signed route confusion) · cosmetic `sanitizeResponse`.
- **MCP-T:** `DEV_SEED` signs in prod · incoming signatures never verified/stored (mutable "ledger") · trust-gate runs after the tool executes and only logs.
- **Gramarye:** class-blind memory injection can ship RESTRICTED off-machine on provider fallback · egress guard follows redirects (allowlist bypass).

### MED / LOW
Payout-executor duplication, WoT oracle trust, in-memory rate-limit/replay (breaks on horizontal scale), cockpit `bypassPermissions` Claude-CLI fallback, instance data committed into the Gramarye framework repo, and dozens more — see per-project docs.

---

## The good news (verified, bank these)

- Crypto is sound everywhere — vetted `@noble/curves`, no hand-rolled primitives, proper replay-nonce design, dual event-ID+signature verification.
- Gramarye's core is genuinely strong — pure default-deny floor the policy text can't loosen, RESTRICTED invariant enforced 3× independently, disciplined DI (205 tests in 2.3s, no network), honest stubs, a real prior adversarial review whose fixes were verified in code.
- Vouch's money-column CHECK constraints, NIP-98 implementation, and `VOUCH_SKIP_AUTH` hard-exit-in-prod are above-average for this stage.

---

## Recommended sequence

**This week (small diffs, outsized impact):** metering `captured_at` + backing unit bug (one-liners) · `confirmDeposit FOR UPDATE` · bind `issuer := callerPubkey` (~20 LOC, kills MCP-T self-vouch) · fix MCP-T wire format + one end-to-end test · SDK redacting `toJSON()` + private identity · Gramarye redirect + class-filtered memory injection · fail-hard on missing prod signing key.

**Before any money/insurance flag flips:** settled-payment invariant (money-in-before-out) · fund segregation subledgers · real HODL-invoice collateral + wire `slashPool` · insurance caller-auth + admin-only adjudication + counterparty-attested evidence.

**Before SBIR/defense pitch (MCP-T):** attested + verified-on-read traces · intent pre-commitment (the patent's core claim — currently not reduced to practice) · omission-resistance · hash-chained/anchored ledger · adversarial conformance suite.

**Architectural bigger bets:** canonical `resolveSubject()` · one shared payout executor · finish the Gramarye cockpit repoint then amputate the ungoverned fallback · evict instance data from the framework repo.

---

## Housekeeping flags

- **C5 implies the "local MCP-T dogfood corpus" is probably empty** — verify before it is cited anywhere (dogfood hub, SBIR evidence).
- Feature flags (`INSURANCE_ENABLED`, `SCANNER_ENABLED`, etc.) must stay OFF until their sections above are cleared.

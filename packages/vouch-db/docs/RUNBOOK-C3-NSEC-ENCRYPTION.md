# Runbook: C3 — Custodial Secret Encryption Cutover

**Status: mechanism implemented, cutover NOT executed. Human sign-off required before any step below runs.**

## What this is

Fable's 2026-07-01 review (C3, Critical) found that `accounts.vouch_nsec`,
`accounts.agent_key_token`, and `acp_checkout_sessions.provisioned_agent_key`
are stored in plaintext. A single database dump is an identity takeover of
every custodial agent Vouch provisions.

This session added the *mechanism* only:

- `packages/vouch-db/src/crypto/envelope.ts` — `encryptSecret()` /
  `decryptSecret()`, AES-256-GCM, same wire format as
  `apps/vouch-api/src/lib/encryption.ts` (which already encrypts
  `nwc_connections.connection_string` and the Lightning HODL preimage).
- New nullable columns sitting alongside the plaintext ones:
  - `accounts.vouch_nsec_encrypted`
  - `accounts.agent_key_token_encrypted`
  - `acp_checkout_sessions.provisioned_agent_key_encrypted`
- A generated migration file (not applied — see repo root for the file this
  session produced via `bun run generate`; do not run `bun run migrate`
  against any environment without sign-off).

Nothing currently reads or writes the `*_encrypted` columns. `vouch_nsec`,
`agent_key_token`, and `provisioned_agent_key` continue to be written in
plaintext by `apps/vouch-api` (see `routes/webhooks/stripe.ts` and
`services/acp-seller-service.ts`) until the cutover below happens — that's a
vouch-api-owned change, out of scope for this track.

## Why plaintext + encrypted columns coexist right now

Applying the migration is safe and reversible on its own (additive nullable
columns, no data movement). Backfilling and rotating the underlying key
material is not something to bundle into the same step — it needs a
maintenance window, a real KMS-backed (or securely provisioned) key, and a
verified rollback path. Splitting them lets a human gate the risky part.

## Best alternative (recorded per review, not implemented)

Provision the Nostr identity **client-side** — the agent operator generates
their own nsec locally (`vouch-sdk keygen` already exists) and Vouch only
ever custodies the `npub`. This eliminates the custodial-key risk entirely
instead of mitigating it. Worth scoping as a v0.3+ SDK/API change; encryption
below is the interim mitigation for the current custodial flow (Stripe
Checkout auto-provisioning), not a replacement for it.

## Steps requiring human sign-off (do NOT execute without approval)

1. **Provision `ENCRYPTION_KEY`.**
   - Generate a 32-byte key: `openssl rand -hex 32`.
   - Store it in the Railway (vouch-api) environment and wherever vouch-db's
     `crypto/envelope.ts` runs (same env var name, `ENCRYPTION_KEY`, so it can
     be shared with the existing `apps/vouch-api/src/lib/encryption.ts` key —
     confirm with the vouch-api owner whether to share one key or provision a
     second one scoped to nsec/agent-key secrets specifically; sharing is
     simpler, a dedicated key is better blast-radius isolation).
   - Store the key in a real secrets manager, not a `.env` file committed
     anywhere.

2. **Apply the migration.**
   - Review the generated SQL file in `packages/vouch-db/drizzle/` (added
     this session) by hand.
   - Run `bun run migrate` from `packages/vouch-db` against a staging
     database first, verify the three new nullable columns exist and no
     existing data changed.
   - Then apply to production during a low-traffic window.

3. **Backfill (write path first, then historical rows).**
   - Update `apps/vouch-api` write paths (`routes/webhooks/stripe.ts`,
     `services/acp-seller-service.ts`) to call `encryptSecret()` (reuse
     `crypto/envelope.ts` from `@percival/vouch-db`, or keep the existing
     `apps/vouch-api/src/lib/encryption.ts` — they're wire-compatible) and
     write to the `*_encrypted` column instead of (or in addition to) the
     plaintext one for all NEW rows.
   - Write a one-off backfill script that reads every non-null `vouch_nsec` /
     `agent_key_token` / `provisioned_agent_key`, encrypts it, and writes the
     result to the corresponding `*_encrypted` column. Run against staging
     first; verify a sample decrypts back to the original plaintext.
   - Do not delete or null out the plaintext columns in this step — keep them
     until every read path has been confirmed to use the encrypted column.

4. **Cut over read paths.**
   - Update every read site (agent-key claim flow in
     `apps/vouch-api/src/routes/accounts.ts`, ACP seller provisioning) to
     read `*_encrypted` and call `decryptSecret()`, falling back to the
     plaintext column only during the transition window.
   - Monitor error rates / decrypt failures for at least one full deploy
     cycle before proceeding.

5. **Drop the plaintext columns.**
   - Only after step 4 has been stable in production: generate a follow-up
     migration that drops `vouch_nsec`, `agent_key_token`, and
     `provisioned_agent_key`. This is the point of no return — get explicit
     sign-off before running it.

6. **Key rotation policy.**
   - Document a rotation cadence (e.g. annual, or on suspected compromise).
     Rotating means: decrypt everything with the old key, re-encrypt with the
     new key, in a single transaction-scoped batch job. Not built here —
     scope as a follow-up once the cutover above is stable.

## Explicitly NOT done in this session

- No `ENCRYPTION_KEY` was generated or set anywhere.
- No migration was applied to any database (`bun run migrate` was not run).
- No existing plaintext value was read, encrypted, or modified.
- No key rotation logic was written.

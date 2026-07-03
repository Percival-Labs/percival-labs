# Feature Flag Standard

Every new capability ships disabled. Deploy != Release.

## Convention

```toml
# wrangler.toml / .env
FEATURE_NAME_ENABLED = "false"   # "true" to activate
```

## Rules

1. **New features ship with a flag.** Add `FEATURE_X_ENABLED = "false"` to config before merging.
2. **Check the flag early.** First thing in the code path — don't run half the feature then check.
3. **Feature flags are temporary.** Remove the flag and its check once the feature is stable (2-4 weeks after full rollout).
4. **Name clearly.** `X402_ENABLED`, not `FLAG_1`. The name should tell you what it controls.
5. **Log flag state at startup.** Health/discovery endpoints should report which flags are active.

## Pattern (CF Worker)

```typescript
// In env types
X402_ENABLED?: string;

// In handler
if (env.X402_ENABLED !== 'true') {
  return errorResponse(501, 'NOT_ENABLED', 'Feature not enabled');
}
```

## Pattern (Node/Hono)

```typescript
const FEATURE_ENABLED = process.env.FEATURE_X_ENABLED === 'true';

app.use('/v1/feature/*', async (c, next) => {
  if (!FEATURE_ENABLED) {
    return c.json({ error: 'Feature not enabled' }, 501);
  }
  return next();
});
```

## Activation Checklist

Before flipping a flag to `true` in production:
- [ ] Feature has tests passing
- [ ] Docs written and accessible
- [ ] Monitoring in place (or at minimum, audit logging)
- [ ] Rollback plan: "flip flag to false" is always the plan
- [ ] Post to `#ship-log` in Discord with: what, docs link, flag name

## Active Flags

| Flag | Product | Status | Since |
|------|---------|--------|-------|
| `X402_ENABLED` | Gateway | `false` (ready) | 2026-03-15 |
| `MCP_T_SIGNING_SECRET_KEY` | MCP-T | env-keyed (not a boolean flag) — set to activate the production provider key; DEV key used if unset | 2026-06-25 |
| `INSURANCE_ENABLED` | Insurance | `false` (early) — agent insurance layer (quote/bind/claim). Needs auth + settlement before enabling; DB tables landed in prod via the 2026-07-03 schema sync. See `docs/insurance-layer.md` | 2026-06-25 |
| `DB_MIGRATE_ON_START` | vouch-api | `true` by default (deploy-safety mechanism, not a product feature — shipping it off would defeat it). Runs drizzle migrations at boot, fail-closed, before serving traffic. Set `"false"` only during manual DB surgery. Added after prod drifted 17 tables behind schema with no migrate step anywhere in the deploy path | 2026-07-03 |

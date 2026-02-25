# NWC / Alby Hub / Nostr Ecosystem Assessment
**Date:** 2026-02-24
**Purpose:** Evaluate how well Vouch's technology stack is positioned on Nostr + NWC + Alby Hub
**Verdict:** Cautiously bullish -- strong technical fit, real ecosystem risks to manage

---

## 1. Alby Hub

### Current Capabilities

Alby Hub is a **self-custodial, single-user, NWC-first Lightning node** that runs anywhere -- Docker, desktop (macOS/Win/Linux), cloud, Raspberry Pi, and home servers (Umbrel, Start9, CasaOS, Raspiblitz).

**Docker image:** `ghcr.io/getalby/hub:latest`
```bash
docker run -v .albyhub-data:/data -e WORK_DIR='/data' -p 8080:8080 ghcr.io/getalby/hub:latest
```

**Six Lightning backends:**
| Backend | Character | Trade-off |
|---------|-----------|-----------|
| **LDK** (default) | Embedded, lightweight | No full node needed (uses Esplora). Default choice. |
| **LND** | External, mature | Requires existing LND node. Most battle-tested. |
| **Phoenixd** | Acinq managed liquidity | 1% fee, zero channel management. Now supports sub-wallets. |
| **Cashu** | Ecash mints | Privacy-focused, recovery phrase for new users. |
| **Greenlight** | CLN-based, Blockstream | Cloud-hosted CLN node. |
| **Breez SDK** | Mobile-friendly | Greenlight-backed. |

**REST API:** Alby Hub exposes an internal HTTP API (Go backend, entry point `cmd/http/main.go`). Key endpoints include:
- `/apps/new` -- Deep linking for creating NWC app connections with query params
- App connection management (create, list, revoke)
- Budget and permission configuration per app
- Alby OAuth integration available via developer portal
- No public OpenAPI spec published -- you need to read the Go source for full endpoint list

**Budget Authorization System:**
- Per-app maximum amount in sats per renewal period
- Renewal periods: never (default), daily, weekly, monthly, yearly
- Expiration dates on app connections (with "Expires Soon" badges)
- **Isolated balances** ("subwallets" in UI) -- each NWC app connection can have its own balance and transaction history, backed by unique wallet service keys per connection
- Granular permission control per connected app (which NIP-47 methods are allowed)

**Adoption Metrics (H1 2025):**
- **7,626 channels opened** (up from 4,000 in the prior 6-month period -- ~90% growth)
- **197 BTC total liquidity** (up from 53 BTC -- ~270% growth)
- "Thousands" of users running their own nodes (exact number not publicly disclosed)
- Available in Umbrel App Store, Start9, and multiple home server platforms

**Limitations & Concerns:**
- No published OpenAPI/Swagger spec for the REST API -- documentation is scattered
- PostgreSQL support is "experimental" (SQLite is default)
- Single-user architecture -- not designed for multi-tenant deployment
- Desktop app requires Go + Node.js + npm + yarn for local development
- No official SLA or uptime guarantees (it's your node, your responsibility)

### Assessment for Vouch

**Strong fit.** Alby Hub's isolated balance feature is exactly what Vouch needs for per-agent staking sub-accounts. The budget authorization system maps cleanly onto "budget as commitment" -- you can create an NWC connection for an agent with a specific budget that represents their staking capacity. The Docker deployment means we can run it alongside the Vouch API on Railway or any container host.

**Risk:** We're coupling to Alby's Go codebase for internal API access. If they change internal endpoints, we break. Mitigant: use NWC protocol (NIP-47) as the interface layer, not internal HTTP API.

---

## 2. @getalby/sdk (npm)

### Current State

- **Version:** 5.1.0 (last published Nov 6, 2025)
- **Package:** `@getalby/sdk` on npm
- **Weekly downloads:** Active (Socket.dev shows healthy release cadence)
- **License:** MIT

### NWC Client API Surface

The SDK provides `NWCClient` which exposes the full NIP-47 interface:

```typescript
import { nwc } from "@getalby/sdk";

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: "nostr+walletconnect://..."
});

// All NIP-47 methods available:
await client.payInvoice({ invoice: bolt11 });
await client.makeInvoice({ amount: 1000, description: "stake" });
await client.getBalance();
await client.getInfo();
await client.listTransactions({ limit: 20 });
await client.lookupInvoice({ payment_hash: "..." });
await client.payKeysend({ destination: pubkey, amount: 1000 });
```

The `NWCClient` is recommended over the WebLN interface for non-web applications (which is our case -- server-side Vouch API).

### Companion Packages

| Package | Purpose | Relevance to Vouch |
|---------|---------|-------------------|
| `@getalby/agent-toolkit` | AI agent Lightning integration (LangChain, Vercel AI SDK) | HIGH -- agents paying via NWC |
| `@getalby/mcp` | MCP server for AI agent Bitcoin payments | HIGH -- direct MCP integration |
| `@getalby/bitcoin-connect` | Browser UI for connecting NWC wallets | MEDIUM -- frontend wallet connection |
| `@getalby/lightning-tools` | Lightning address resolution, LNURL | MEDIUM -- address resolution |
| `@getalby/nwc-mcp-server` | Standalone NWC MCP server | HIGH -- agent payments via MCP |

### Known Issues & Limitations

- Uses only a single relay from the connection string (GitHub issue #367) -- potential reliability concern
- v5 is a major version with breaking changes from v3/v4 (OAuth API removed in favor of pure NWC)
- No built-in retry/reconnection logic for relay disconnects (you manage this)
- TypeScript types are solid but some edge cases in notification handling

### Assessment for Vouch

**Excellent fit.** The SDK is production-quality, actively maintained, and the NWCClient maps 1:1 to NIP-47 methods. The `@getalby/agent-toolkit` and MCP packages are directly relevant -- agents using Vouch could pay staking invoices through their existing NWC connections. This is the "USB-C port for Lightning wallets" metaphor in action.

**Risk:** Single-maintainer concern (Alby team). If Alby pivots away from NWC, SDK maintenance could lag. Mitigant: NWC protocol is open, multiple implementations exist (Go, Rust, PHP, Dart, Python).

---

## 3. NWC (NIP-47) Protocol

### Specification Status

- **Status:** Active, merged into main NIPs repository
- **Last updated:** 2026-02-03 (actively maintained)
- **Encryption:** Migrating from NIP-04 (deprecated) to NIP-44 v2 (current standard)

### Complete Method List (10 methods)

| Method | Purpose | Vouch Relevance |
|--------|---------|-----------------|
| `pay_invoice` | Pay BOLT11 invoice | Staking payments |
| `pay_keysend` | Direct payment to pubkey | Agent-to-agent payments |
| `make_invoice` | Generate invoice | Receiving stake deposits |
| `lookup_invoice` | Check invoice status | Verify stake payments |
| `list_transactions` | Query history | Audit trail |
| `get_balance` | Check balance | Verify staking capacity |
| `get_info` | Wallet capabilities | Connection validation |
| **`make_hold_invoice`** | Create preimage-based hold invoice | **STAKING COMMITMENT** |
| **`cancel_hold_invoice`** | Abort hold invoice | **STAKE RELEASE** |
| **`settle_hold_invoice`** | Release held funds | **STAKE SETTLEMENT** |

### Hold Invoice Support -- This Is The Key

NIP-47 natively supports hold invoices as of the latest spec. This is critical for Vouch:

- `make_hold_invoice` creates an invoice with a pre-generated `payment_hash`
- The payer locks funds (HTLC created) but funds don't leave their wallet
- `settle_hold_invoice` completes the payment (reveals preimage)
- `cancel_hold_invoice` releases the lock (payer gets funds back)
- `hold_invoice_accepted` notification fires when payer locks funds

**This is literally the "stake lock not escrow" pattern we designed for Vouch.** The hold invoice creates a cryptographic commitment without custodial transfer. The funds stay in the staker's wallet until settlement or cancellation.

### Notification Types

| Notification | Purpose |
|-------------|---------|
| `payment_received` | Incoming payment confirmed |
| `payment_sent` | Outgoing payment completed |
| `hold_invoice_accepted` | Hold invoice locked by payer |

### Budget Authorization Mechanism

NWC's authorization URL includes:
- `required_methods` -- space-separated list of permitted NIP-47 methods
- `max_amount` -- maximum sats per renewal period
- `budget_renewal` -- never/daily/weekly/monthly/yearly
- Per-connection unique keypairs (not linked to user identity)

**How budget works as commitment:** When an agent creates an NWC connection with `max_amount=100000` and `budget_renewal=monthly`, they're declaring "I authorize up to 100K sats/month from this wallet." This is verifiable -- the wallet service enforces it. For Vouch, this means an agent's staking budget is cryptographically enforced by their own wallet.

### Security Model

**Trust assumptions:**
1. **Relay sees metadata, not content** -- E2E encrypted payloads. Relay knows event kinds and tags but can't read payment details.
2. **Per-connection isolation** -- Unique keypairs per app connection prevent cross-app tracking.
3. **Wallet service is trusted** -- The wallet service (e.g., Alby Hub running on the user's machine) has full access to execute payments within the authorized budget. If the wallet service is compromised, authorized payments can be drained up to the budget limit.
4. **No user identity linkage** -- NWC deliberately avoids linking payment activity to the user's Nostr identity key.
5. **Relay is untrusted** -- Can observe timing and metadata but not payment content. Protocol works even if relay is adversarial (they can only drop messages, not forge them).

**Vulnerability surface:**
- NIP-04 (legacy encryption) has known weaknesses -- unauthenticated CBC mode. Migration to NIP-44 addresses this.
- DNS metadata leaks from relay connections can expose user IPs (standard Nostr issue, not NWC-specific).
- Public-key substitution attacks through compromised relays are theoretically possible but require active MITM.
- Single-relay connections (js-sdk default) create availability risk.

### Wallet Support Matrix

| Wallet | NWC Role | Status | Notes |
|--------|----------|--------|-------|
| **Alby Hub** | Server | Active, primary | Reference implementation. 6 backends. |
| **Zeus** | Client + Server | Active | v0.10.0+ integrated NWC. Mobile multi-wallet. |
| **Primal** | Client | Active | Built-in wallet with NWC import |
| **Cashu.me** | Server | Active | Custodial ecash mint |
| **LNbits** | Server | Active | NWC service plugin |
| **Coinos** | Server | Active | Web-based |
| **Blitz** | Server | Active | |
| **Minibits** | Server | Active | Cashu-based |
| **Phoenix** | Indirect | Via Phoenixd backend | Not native NWC, but Alby Hub + Phoenixd works |
| **Mutiny** | Dead | Shut down Dec 2024 | Open source still available for self-hosting |
| **Strike** | Server | Active | NWC service available |

**19+ wallets** now support NWC as server, **60+ apps** use NWC as client, **25+ dev tools/libraries** available.

### Protocol-Level Limitations for Vouch

1. **No native "stake lock" primitive** -- Hold invoices approximate this but have timeouts (HTLC expiry). Long-term staking (days/weeks) would require periodic re-locking or a different approach.
2. **Hold invoice expiry** -- HTLCs have a finite lock time (typically hours, not days). You can't hold an invoice open indefinitely. This is a fundamental Lightning limitation, not NWC-specific.
3. **Budget is per-app, not per-purpose** -- A single NWC connection's budget covers all operations. You can't say "10K for staking, 5K for tips" within one connection.
4. **Relay dependency** -- If the relay goes down, NWC communication stops. Mitigant: multi-relay support exists but js-sdk currently uses single relay.
5. **No native escrow** -- NWC doesn't have a built-in escrow or multi-sig concept. Hold invoices are the closest approximation.

---

## 4. Lightning Staking/Bonding Precedent

### RoboSats -- The Closest Prior Art

RoboSats is the most mature implementation of "Lightning bonds as commitment":

- **Fidelity bonds**: Default 3% of trade amount (configurable 2-15%)
- **Mechanism**: Hold invoices via LND
- **Key property**: "The locked bond never left your wallet" -- funds remain under user control
- **Forfeiture**: Bond lost if user cheats, cancels unilaterally, or times out
- **Compensation**: Half of forfeited bond goes to honest counterparty
- **Escrow timeout**: Configurable 1-8 hours (default 3)

**Relevance to Vouch:** RoboSats proves that hold-invoice-as-bond works in production. Their 2-15% bond range is analogous to Vouch's staking requirements. The "never left your wallet" property is exactly what we designed.

### Stacker News -- Reputation via Economic Commitment

- Trust-weighted ranking: `trust * log10(total_zap_amount)` -- 10 sats = 1 vote, 100 sats = 2, 1000 sats = 3
- Users who spend more sats get more influence (logarithmically)
- "Cowboy Credits" for onboarding (earning without Lightning wallet)
- Territories (paid topic ownership) as economic skin-in-the-game

**Relevance to Vouch:** Validates logarithmic economic commitment as trust signal. Vouch's trust scoring could use similar curves.

### Other Precedent

- **LND Hold Invoices** (PR #2022): Production-ready since 2019. Well-understood primitive.
- **EigenLayer restaking**: $18-20B TVL by late 2025 proves economic staking at scale (different chain, same concept)
- **No prior art found** for "NWC budget authorization as long-term staking commitment" specifically -- this would be novel from Vouch

### The Gap We're Filling

Nobody has combined: NWC + hold invoices + trust scoring + Nostr identity + budget-as-commitment into a unified agent trust layer. Individual primitives exist and are proven. The composition is novel. This is both an opportunity (first mover) and a risk (unproven combination).

---

## 5. Nostr Ecosystem Health

### Quantitative Health Metrics

| Metric | Value | Source/Date |
|--------|-------|-------------|
| Daily active users | ~3,675 (Nostr.band) / ~500K (onnostr.substack, broader definition) | Oct 2025 |
| Monthly active users | ~14,777 | Oct 2025 |
| MAU engagement rate | 69.4% of total profiles | Oct 2025 |
| Total profiles | ~21,281 (Nostr.band tracked) | Oct 2025 |
| LN address adoption | +82.5% growth | 2025 |
| Long-form content | +800% growth | 2025 |
| Zap volume | ~792K zaps, ~$2M USD | 2025 |
| NIPs repo activity | 2,857 commits, 730 PRs, 235 contributors, 385 issues | Past year as of Feb 2026 |

**Note on user count discrepancy:** The 21K vs 500K DAU numbers reflect different measurement approaches. Nostr.band tracks verified active pubkeys; the broader figure likely includes ephemeral/automated usage. The true engaged human user base is likely 20-50K.

### Developer Activity -- Genuinely Strong

- **NIPs repo**: 235 contributors, actively merging new proposals
- **NIP-47 spec updated 2026-02-03** -- active maintenance
- **NIP-85 (Trusted Assertions) merged Jan 2026** -- directly relevant to Vouch's trust events
- **NWC ecosystem in early 2026**: 1 new wallet, 9 new products, 4 new dev tools, 1 new protocol in first update
- **60+ apps** using NWC, **19+ wallets** supporting NWC server
- **Multi-language SDK coverage**: JS, Go, Rust, PHP, Dart, Python, Swift, React Native

### What's Working

1. **NWC is a genuine success** -- The "USB-C port for Lightning wallets" metaphor is materializing. 60+ apps, growing tooling, AI agent integration already happening.
2. **Lightning + Nostr integration deepening** -- 82.5% growth in LN addresses on profiles, zap infrastructure maturing.
3. **AI agent integration** -- Alby already has MCP servers, agent toolkits, and AI-specific products. This is our runway.
4. **Protocol flexibility** -- NIPs can be proposed and adopted independently. NIP-85 got merged in 3 months. Low bureaucratic friction.
5. **Self-sovereignty alignment** -- The entire ecosystem is built on "your keys, your data, your money." This aligns perfectly with Vouch's non-custodial design.

### What's Concerning

1. **Small user base** -- 3,675 DAU on Nostr.band is tiny. Even the generous 500K figure is small compared to any mainstream platform. We're building for a niche within a niche.
2. **Activity may be declining** -- Multiple sources note flatlined or declining activity despite improved apps and tooling. The ideological fire that drove early adoption isn't translating to mainstream growth.
3. **Mutiny shutdown** -- One of the most innovative NWC wallets shut down in Dec 2024. The team cited "very technically challenging environment with a very small team and resources." This is a warning about sustainability of independent Nostr businesses.
4. **Relay sustainability** -- Free relays struggle financially. Paid relays exist but fragment the experience. No clear economic model for relay operators.
5. **UX remains rough** -- Key management (private/public keys), no account recovery, relay selection complexity. Regular users bounce off this.
6. **Security concerns** -- Academic analysis found: public-key substitution attacks, weak DM encryption (legacy NIP-04), DNS metadata leaks, inconsistent signature verification across clients.
7. **NostrAssets controversy** -- Highlighted that the "brand" can be hijacked, and the community's decentralized nature makes it hard to prevent.
8. **Identity tension** -- Is Nostr a protocol or a community? This unresolved question creates coordination challenges.

### NIP-85 Status (Directly Relevant to Vouch)

- **Merged** into main NIPs repo (PR #1534, merged ~Jan 2026)
- 45 comments during review, 6 code review comments -- significant community engagement
- Created by vitorpamplona (Amethyst developer)
- Enables "trusted service providers" to publish signed trust assertions
- Kind 30382 = assertions about pubkeys (exactly what Vouch needs for trust scores)
- **Criticism from Vertex:** "Too limiting for real-time personalized ranking" and computationally expensive on mobile. They built their own system instead.
- **Implementation status:** Early. No widespread client adoption yet. Amethyst likely first.

---

## 6. Frank Assessment: Strengths & Risks

### STRENGTHS

**S1: NIP-47 Hold Invoices Are Tailor-Made for Vouch**
The `make_hold_invoice` / `settle_hold_invoice` / `cancel_hold_invoice` trio in NIP-47 is exactly the "stake lock, not escrow" pattern we designed. Funds stay in the staker's wallet. Settlement is conditional. This isn't us forcing a square peg -- the protocol was designed for this use case.

**S2: Budget Authorization = Verifiable Commitment**
NWC's budget system (max_amount + renewal period + per-app isolation) creates a cryptographically-enforced commitment mechanism. An agent that creates an NWC connection with a 100K sat monthly budget is making a verifiable, enforceable promise. This is "budget as bond" without us inventing anything.

**S3: Alby Hub Is Production-Ready Infrastructure**
7,626 channels, 197 BTC liquidity, multi-backend support, Docker deployment. This isn't vaporware. The isolated balance feature means each Vouch agent connection can have its own accounting. We don't need to build wallet infrastructure -- we plug into it.

**S4: AI Agent Integration Already Happening**
Alby's MCP server, agent toolkit, and Lightning tooling mean the "agents paying for things via NWC" use case is already being built by others. We're surfing an existing wave, not creating one.

**S5: NIP-85 Merged Just In Time**
Trusted Assertions (kind 30382) gives Vouch a standardized way to publish trust scores on Nostr. The timing is perfect -- merged Jan 2026, Vouch launching now. We'd be among the first meaningful implementations.

**S6: Composition Is Novel, Primitives Are Proven**
Hold invoices (2019), NWC (2023), NIP-85 (2026), Nostr identity (2022) -- all individually battle-tested. Our innovation is the composition: trust staking via NWC hold invoices, published as NIP-85 assertions, tied to Nostr identity. Low technical risk, high conceptual novelty.

### RISKS

**R1: HTLC Expiry Limits Long-Term Staking (CRITICAL)**
Hold invoices have timeout constraints (hours, not days or weeks). You cannot hold an HTLC open indefinitely -- this is a fundamental Lightning limitation. For Vouch staking that needs to persist for weeks/months, hold invoices alone won't work.

*Mitigant:* Use hold invoices for the commitment ceremony (lock, verify, settle to a Vouch-controlled address), then track the stake as a settled payment. The "non-custodial" claim becomes weaker here -- once settled, funds are in the system. Alternatively, use periodic re-locking ("stake heartbeat") where agents re-lock every N hours.

**R2: Small Ecosystem = Small TAM (HIGH)**
Even with generous estimates, the Nostr+Lightning+NWC ecosystem has maybe 50K engaged users. The agent-specific subset is smaller. We're building for a market that barely exists yet.

*Mitigant:* NWC is wallet-agnostic. Any Lightning wallet that supports NWC can participate. The TAM is really "all Lightning-connected agents," not "Nostr users." And AI agents are growing explosively regardless of Nostr.

**R3: Alby Single-Point-of-Dependency (MEDIUM-HIGH)**
Alby Hub is the dominant NWC server implementation. The SDK, the agent toolkit, the MCP server -- all Alby. If Alby pivots, loses funding, or changes direction, significant re-work needed.

*Mitigant:* NWC is an open protocol. LNbits, Strike, Coinos, and others also implement NWC server. The SDK can be replaced (Rust, Go implementations exist). But practically, Alby's tooling quality is ahead of alternatives.

**R4: Nostr May Not Achieve Mainstream Adoption (MEDIUM)**
Activity is flatlined or declining. UX is rough. The ideological user base may be the ceiling, not the floor. Building on Nostr means accepting this might remain a Bitcoin maximalist niche.

*Mitigant:* Vouch doesn't strictly require Nostr for end users. NIP-85 trust events are one publication channel; we can publish trust data through traditional APIs simultaneously. Nostr is our primary identity layer but doesn't need to be the only one.

**R5: NIP-85 Adoption Is Unproven (MEDIUM)**
NIP-85 just merged. No major client implements it yet. Vertex explicitly rejected it for their use case. If clients don't adopt NIP-85, our trust assertions are published but nobody reads them.

*Mitigant:* Amethyst (the largest Android client, built by NIP-85's author) will likely implement it. And Vouch can be its own "client" -- agents query our API for trust scores, NIP-85 events are the verifiable backing data. We don't need universal client adoption to be useful.

**R6: Security Model Has Known Gaps (LOW-MEDIUM)**
Legacy NIP-04 encryption still in use by some wallets. DNS leaks. Inconsistent signature verification. These are Nostr-wide issues, not NWC-specific, but they affect the trust narrative.

*Mitigant:* We can mandate NIP-44 encryption for Vouch NWC connections. Our security posture can be stricter than the ecosystem baseline.

### STRATEGIC RECOMMENDATION

**Build on this stack, but with escape hatches.**

1. **Use NWC (NIP-47) as the primary protocol interface** -- not Alby Hub's internal HTTP API. This keeps us vendor-independent.

2. **Design the staking mechanism to handle HTLC expiry constraints** -- either periodic re-locking ("heartbeat stakes") or settle-then-track (accept that settled stakes are custodial). The hold-invoice-as-bond model works for short-term commitments (trade verification, task bonding). For long-term reputation staking, we need a different pattern.

3. **Publish trust data on NIP-85 AND via REST API** -- don't bet everything on NIP-85 client adoption. Our API serves agents directly; NIP-85 events provide Nostr-native verification.

4. **Build the AI agent pathway first** -- Alby's MCP server and agent toolkit mean agents-paying-via-NWC is the fastest adoption path. Agent Village agents staking via NWC through Alby's MCP -- this is the killer demo.

5. **Monitor Alby's health and diversify gradually** -- Track LNbits NWC, Strike NWC, and Coinos NWC as backup implementations. If Alby shows signs of trouble, accelerate SDK migration.

6. **Accept the niche for now, design for breakout** -- The Nostr+Lightning ecosystem is small but growing and philosophically aligned. Building here gives us credibility with exactly the people who care about self-sovereignty and agent trust. If/when NWC becomes a standard beyond Nostr (it's already happening -- Strike, Phoenix), we're already there.

---

## Sources

### Alby Hub
- [Alby Hub GitHub Repository](https://github.com/getAlby/hub)
- [Alby Hub -- Lightning Sovereignty for Everyone](https://blog.getalby.com/what-is-alby-hub/)
- [The 6 Different Lightning Backends for Alby Hub](https://blog.getalby.com/the-6-different-lightning-backends-for-alby-hub/)
- [Lightning Channel Stats: H1 2025](https://blog.getalby.com/lightning-channel-stats-h1-2025/)
- [App Connections | Alby Hub Guide](https://guides.getalby.com/user-guide/alby-hub/app-connections)
- [Alby Hub on Umbrel](https://apps.umbrel.com/app/albyhub)

### @getalby/sdk
- [@getalby/sdk on npm](https://www.npmjs.com/package/@getalby/sdk)
- [NWC JS SDK Developer Guide](https://guides.getalby.com/developer-guide/nostr-wallet-connect-api/building-lightning-apps/nwc-js-sdk)
- [Alby JS SDK GitHub](https://github.com/getAlby/js-sdk)
- [@getalby/agent-toolkit on npm](https://www.npmjs.com/package/@getalby/agent-toolkit)
- [@getalby/mcp on npm](https://www.npmjs.com/package/@getalby/mcp)
- [Alby MCP Server Blog Post](https://blog.getalby.com/alby-mcp-server-payments-for-your-ai-agent/)

### NIP-47 / NWC Protocol
- [NIP-47 Official Specification](https://nips.nostr.com/47)
- [NIP-47 on GitHub](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [Awesome NWC -- Curated Ecosystem List](https://github.com/getAlby/awesome-nwc)
- [NWC.dev](https://nwc.dev/)
- [NWC v0.4.1 Extensions](https://www.nobsbitcoin.com/nwc-v0-4-1/)
- [Bitcoin Magazine: NWC as Collaboration Layer](https://bitcoinmagazine.com/technical/nostr-wallet-connect-a-bitcoin-application-collaboration-layer)
- [Zeus NWC Integration Announcement](https://x.com/nwc_dev/status/1889063720443433182)

### Lightning Staking/Bonding Precedent
- [RoboSats Fidelity Bonds](https://learn.robosats.org/docs/bonds/)
- [RoboSats Trade Escrow](https://learn.robosats.com/docs/escrow/)
- [Stacker News FAQ](https://stacker.news/faq)
- [LND Hold Invoice PR #2022](https://github.com/lightningnetwork/lnd/pull/2022)
- [Understanding Hold Invoices -- Voltage](https://voltage.cloud/blog/understanding-hold-invoices-on-the-lightning-network)

### Nostr Ecosystem Health
- [The State of Nostr in 2025](https://onnostr.substack.com/p/the-state-of-nostr-in-2025-bitcoin)
- [Nostr Overview and Statistics (Oct 2025)](https://www.glukhov.org/post/2025/10/nostr-overview-and-statistics/)
- [NIP-85 Trusted Assertions PR #1534](https://github.com/nostr-protocol/nips/pull/1534)
- [NIP-85 Specification](https://github.com/nostr-protocol/nips/blob/master/85.md)
- [Why Vertex Doesn't Use NIP-85](https://vertexlab.io/blog/dvms_vs_nip_85/)
- [Mutiny Wallet Shutdown Timeline](https://blog.mutinywallet.com/mutiny-timeline/)
- [Nostr NIPs Repository](https://github.com/nostr-protocol/nips)
- [Nostr Protocol Criticism](https://clehaxze.tw/gemlog/2025/03-26-nostr-my-thoughts-on-a-new-decentralized-pubsub-protocol.gmi)

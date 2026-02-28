# Voltage Lightning Infrastructure Evaluation

**Date:** 2026-02-26
**Context:** Evaluate Voltage (voltage.cloud) against current Alby Hub on Railway for Percival Labs treasury/payment infrastructure
**Status:** Research Complete

---

## Executive Summary

Voltage has evolved from a simple "cloud Lightning node host" into a **full enterprise payments platform** (Voltage Payments) targeting exchanges, neo-banks, iGaming, and PSPs. They now offer managed LND nodes, an enterprise payments API with stablecoin support, SOC 2 Type II + NMLS compliance, and an LSP (Flow, now deprecated/evolving). Their Nostr toolkit exists but is thin. **No native NWC support.** HODL invoices work via standard LND API access.

**Bottom line:** Voltage adds real value for enterprise credibility (SOC 2 Type II), uptime reliability, and scaling path. It does NOT add value for Nostr-native features or NWC -- Alby Hub is better there. The decision hinges on whether we need enterprise compliance signals now or can wait.

---

## 1. Products and Architecture

### Core Product Lines

| Product | What It Is | Target |
|---------|-----------|--------|
| **Lightning Nodes** | Managed LND nodes (cloud-hosted, non-custodial) | Developers, businesses |
| **Voltage Payments** | Enterprise payments API (send/receive BTC + stablecoins) | Exchanges, neo-banks, PSPs |
| **Voltage Credit** | USD-settled revolving credit line on Lightning | Enterprise payments |
| **Surge** | Analytics/monitoring dashboard for node operators | Node runners |
| **Nostr Toolkit** | NIP-05 + Lightning Address + Zaps on @vlt.ge domain | Nostr users |
| **Node-Backed Wallets** | Wallet segregation API on top of your LND node | Multi-tenant apps |

### What They Run

- **LND only.** No CLN, no LDK option. All nodes run LND on Voltage's infrastructure.
- Full LND API exposed (gRPC port 10009, REST port 8080)
- Macaroon-based auth (admin + read-only available)
- Tor routing for all P2P traffic (peers can't see your actual node)
- SSH removed from all node servers -- no human login possible
- AES-256 encrypted seed/macaroon backups
- Stateless-init: macaroons never written to disk, returned only via API at init

### Connection Details

```
Base URL: {node-name}.m.voltageapp.io
gRPC: port 10009
REST: port 8080
Auth: Grpc-Metadata-macaroon header (hex-encoded admin macaroon)
```

---

## 2. Node Types and Pricing

### Current Node Types (Legacy)

| Type | On-Demand | Monthly |
|------|-----------|---------|
| **Lite** | $0.027/hr (~$19.44/mo) | Part of subscription |
| **Standard** | $0.053/hr (~$38.16/mo) | Part of subscription |
| **Pro** | Custom pricing | Contact sales |

### Subscription Plans

- **7-day free trial** (full-featured, identical to paid)
- Monthly: Starting at $31.99/mo (month-to-month)
- Annual: Starting at $26.99/mo (billed annually)
- On-demand: Pay-per-hour, billed monthly

### New Model (Transitioning)

Voltage is transitioning to compute-credit-based sizing:
- **Small:** 2 Compute Credits
- **Medium:** 10 Compute Credits
- **Large:** 30 Compute Credits
- **Extra Large:** 55 Compute Credits

Per-credit pricing not publicly documented yet.

### Voltage Payments (Enterprise)

| Tier | Annual Cost | Transaction Fee | Volume Limit |
|------|------------|-----------------|--------------|
| **Transaction-Only** | $0 platform fee | Per-transaction | Unspecified |
| **Starter** | From $12,000/yr | Varies | Varies |
| **Unlimited** | Fixed license fee | Approaches $0/tx | Unlimited |

For comparison, Lightspark (a competitor) charges $108K-$270K/yr for enterprise, with 0.15-0.30% tx fees. Voltage positions as more affordable.

---

## 3. HODL Invoice Support

**Verdict: YES -- full support via standard LND API.**

Since Voltage runs LND nodes with full API access, all LND invoice sub-service endpoints are available:

| Operation | gRPC Method | REST Endpoint |
|-----------|------------|---------------|
| Create hold invoice | `AddHoldInvoice` | `POST /v2/invoices/hodl` |
| Settle hold invoice | `SettleInvoice` | `POST /v2/invoices/settle` |
| Cancel hold invoice | `CancelInvoice` | `POST /v2/invoices/cancel` |
| Subscribe to invoice | `SubscribeSingleInvoice` | `GET /v2/invoices/subscribe/{r_hash}` |

### How It Works for PL's Escrow Use Case

1. **Generate preimage + hash** for milestone payment
2. **CreateHoldInvoice** with the hash (30-60 min CLTV timeout)
3. Payer pays the invoice -- funds lock in HTLC
4. **On milestone verification:** `SettleInvoice(preimage)` releases funds
5. **On timeout/failure:** `CancelInvoice(hash)` returns funds to payer

### Important Notes

- HODL invoices tie up liquidity in the channel for the hold duration
- LND version matters -- make sure Voltage is running a version that supports the invoice sub-server
- No Voltage-specific abstraction over HODL invoices; you're using raw LND API
- Works identically to any self-hosted LND node

### Comparison with Alby Hub

Alby Hub uses LDK (not LND). LDK does support hold invoices via its `ChannelManager` API, but:
- LDK's hold invoice API is lower-level than LND's
- LND's gRPC/REST API is more mature and better documented
- More example code exists for LND hold invoices
- **Voltage advantage here: LND's hold invoice API is battle-tested at scale**

---

## 4. SDK / API Languages

### What Voltage Provides Directly

- **No official Voltage SDK** in any language
- Documentation provides **Node.js (JavaScript) examples** using `@grpc/grpc-js`
- REST API examples use standard `fetch()` -- works from any language
- No TypeScript types or TS-specific SDK

### Integration Path (Node.js/TypeScript)

```bash
npm install @grpc/grpc-js @grpc/proto-loader
```

You interact with the **standard LND API**, not a Voltage-specific API. This means:
- Any LND client library works (ln-service, lnrpc, lightning-terminal)
- Proto files from LND GitHub define the gRPC schema
- REST API is plain HTTP + JSON with macaroon auth header

### For Voltage Payments API (Enterprise)

- Separate API at `docs.voltageapi.com`
- REST-based with webhook support
- Staging environment available
- This is Voltage's proprietary payments abstraction layer

### Comparison with Alby Hub

Alby Hub provides:
- **Alby JS SDK** (`@getalby/sdk`) -- first-class TypeScript
- **NWC SDK** -- native NWC protocol support
- **WebLN** -- browser integration
- **Bitcoin Connect** -- React/web components

**Alby Hub's developer experience for TypeScript/Nostr apps is significantly better.**

---

## 5. Nostr Toolkit

### What Voltage Offers

| Feature | Details |
|---------|---------|
| **NIP-05** | Username@vlt.ge verification |
| **Lightning Address** | Same @vlt.ge address doubles as LN address |
| **Zaps** | Receive zaps directly to your own node (non-custodial) |
| **External node support** | Can connect non-Voltage nodes |
| **Cost** | Free |

### What Voltage Does NOT Offer

- **No NWC (Nostr Wallet Connect) support**
- No NIP-47 implementation
- No Nostr relay hosting
- No Nostr key management
- No NIP-98 auth integration
- No programmatic Nostr event handling
- No zap-splitting or automated zap forwarding

### Assessment

Voltage's Nostr toolkit is basically a **NIP-05 + Lightning Address service**. It's useful for individuals who want non-custodial zap reception, but it's not a development platform. There are no APIs for programmatic Nostr interaction.

### Comparison with Alby Hub

Alby Hub is **massively superior** for Nostr:
- Native NWC (NIP-47) support -- this IS what Alby Hub was built for
- NWC connection strings for any app
- Programmatic payment handling via NWC protocol
- Full Nostr ecosystem integration
- Sub-account NWC connections with budget limits

**For a Nostr-native platform like PL, Alby Hub wins decisively here.**

---

## 6. SOC 2 Certification

### Voltage's Status

- **SOC 2 Type II certified** (announced September 12, 2023)
- **NMLS License:** ID 2676234 (Voltage Credit, LLC)
- Continuous audit commitment -- not a one-time certification
- Covers: data security, availability, processing integrity, confidentiality, privacy
- Report available on request (contact sales)

### What This Means for PL

SOC 2 Type II is the gold standard for enterprise trust. If PL runs treasury infrastructure on Voltage, we can say:

> "Percival Labs treasury operations run on SOC 2 Type II certified infrastructure"

This is a **legitimate enterprise credibility signal** that could matter for:
- Enterprise clients evaluating Vouch
- Compliance-conscious organizations
- Insurance underwriting
- Partner due diligence

### Comparison with Alby Hub

- Alby Hub: **No SOC 2 certification.** It's open-source software you run yourself.
- Running on Railway: Railway has SOC 2 Type II, but that covers Railway's infrastructure, not your Lightning node operations.
- You could argue Railway + Alby Hub gives you infrastructure-level SOC 2, but there's no audit of the Lightning payment operations themselves.

**Voltage advantage: direct SOC 2 coverage of Lightning payment operations.**

---

## 7. LSP (Lightning Service Provider) Capabilities

### Current Status: In Transition

- **Flow (v1):** Deprecated
- **Flow (v2):** Deprecated as of September 2024 (no new channels), fully shutdown November 2024
- **Next-gen LSP:** Under development, not yet publicly available

### What Flow Did (When Active)

- Just-in-time channel opening via zero-conf channels
- Automatic liquidity detection and provisioning
- No upfront channel management required
- Non-custodial -- used preimage hashes to ensure funds never touched Voltage

### What's Available Now

- **Manual channel management** via LND API or Thunderhub UI
- **Lightning Terminal** integration for Loop liquidity swaps (Lightning Labs)
- **External LSPs:** LightningNetwork+ and Amboss Magma for additional liquidity
- **Amboss partnership (Nov 2025):** Amboss Rails + Voltage Payments stack for enterprise

### Comparison with Alby Hub

Alby Hub connects to LSPs for channel management:
- **Megalith LSP** (default) -- auto-channel opening with receiving capacity
- **Olympus by ZEUS** -- another LSP option
- Automatic channel management built into the Alby Hub UX

**Alby Hub currently has better out-of-the-box LSP integration.** Voltage's LSP is in transition.

---

## 8. Self-Custody vs Managed Custody

### Voltage's Model

**Non-custodial by default.** Key security features:

| Feature | Detail |
|---------|--------|
| **Seed phrase** | Only user has access; Voltage cannot see or recover it |
| **Macaroons** | Stateless-init: never written to disk, returned only in API response |
| **Encryption** | AES-256 for all backups |
| **No SSH** | Removed from all node servers |
| **Tor routing** | All P2P traffic routed through Tor |
| **Password recovery** | Impossible -- Voltage cannot see your password |

### Voltage Payments (Enterprise)

Voltage Payments introduces a **managed custody option** for enterprises:
- Node-Backed Wallets: you own the node, Voltage manages the API layer
- Wallet segregation for multi-tenant scenarios
- Compliance tools built in
- This is a hybrid: self-custody of the node, but Voltage manages operational complexity

### Comparison with Alby Hub

Both are non-custodial. Key differences:

| Aspect | Voltage | Alby Hub |
|--------|---------|----------|
| **Key storage** | Voltage infra (encrypted, they can't see it) | Your Railway instance |
| **Physical control** | Voltage's servers | Railway's servers |
| **Recovery** | You have seed phrase | You have seed phrase |
| **Operational risk** | Voltage goes down = node offline | Railway goes down = node offline |
| **Trust model** | Trust Voltage's security claims | Trust Railway + open-source code |

**Net neutral.** Both are non-custodial. Voltage has more security infrastructure (no SSH, Tor, SOC 2 audit). Alby Hub is open-source so you can verify the code.

---

## 9. NWC (Nostr Wallet Connect) Support

### Voltage: No Native NWC

Voltage does **not** implement NWC (NIP-47). Their Nostr integration is limited to NIP-05 + Lightning Address + Zaps.

You could theoretically:
1. Run a Voltage LND node
2. Install a separate NWC bridge that connects to the LND node via gRPC
3. Use that bridge for NWC connections

But this is DIY, not a Voltage feature.

### Alby Hub: NWC Is the Core Feature

Alby Hub was literally built around NWC. It IS a NWC wallet:
- Native NIP-47 implementation
- Connection strings for any NWC-compatible app
- Sub-account connections with spending budgets
- Built-in app directory for one-click connections
- The Alby JS SDK is the reference NWC implementation

**For PL's architecture (NWC for all user-facing payments), Alby Hub is the only option. Voltage doesn't play in this space.**

---

## 10. Direct Comparison: Voltage vs Alby Hub for PL

### Scoring Matrix

| Requirement | Weight | Voltage | Alby Hub | Notes |
|-------------|--------|---------|----------|-------|
| **HODL invoices** | Critical | 9/10 | 6/10 | LND's API is more mature than LDK's |
| **Production uptime** | Critical | 9/10 | 5/10 | Voltage is enterprise-grade; Alby on Railway is startup-grade |
| **NWC support** | Critical | 1/10 | 10/10 | Alby IS NWC; Voltage has nothing |
| **Nostr-native features** | High | 3/10 | 9/10 | Alby built for Nostr ecosystem |
| **SOC 2 compliance** | High | 10/10 | 0/10 | Voltage has it; Alby doesn't |
| **TypeScript SDK** | High | 3/10 | 9/10 | Alby JS SDK vs raw LND gRPC |
| **LSP/liquidity** | Medium | 4/10 | 7/10 | Voltage LSP deprecated; Alby has Megalith |
| **Pricing** | Medium | 5/10 | 8/10 | Voltage ~$27-32/mo; Alby Hub free (self-host) |
| **Self-custody** | Medium | 9/10 | 9/10 | Both non-custodial |
| **Scaling path** | High | 9/10 | 4/10 | Voltage scales to enterprise; Alby is single-node |

### The Fundamental Tension

PL's architecture requires **two different things**:

1. **User-facing payments:** NWC-based, Nostr-native, P2P -- **Alby Hub wins decisively**
2. **Treasury operations:** Reliable, compliant, scalable, HODL invoices -- **Voltage wins decisively**

---

## 11. Recommendation

### Hybrid Architecture (Recommended)

```
┌─────────────────────────────────────────────┐
│           Percival Labs Payment Stack         │
├──────────────────┬──────────────────────────┤
│   USER LAYER     │   TREASURY LAYER         │
│                  │                           │
│   Alby Hub       │   Voltage LND Node       │
│   (Railway)      │   (voltage.cloud)        │
│                  │                           │
│   - NWC for      │   - HODL invoices for    │
│     user wallets │     milestone escrow     │
│   - Zap support  │   - 1% fee collection   │
│   - Nostr-native │   - SOC 2 compliant     │
│   - Agent wallet │   - Enterprise scaling   │
│     connections  │   - Stablecoin ready     │
│                  │                           │
│   Cost: Free     │   Cost: ~$27-32/mo       │
│   (self-hosted)  │   (Lite node)            │
└──────────────────┴──────────────────────────┘
```

### Why Hybrid

1. **Keep Alby Hub** for everything Nostr/NWC. It's purpose-built for exactly our use case.
2. **Add Voltage** for treasury node. SOC 2 Type II alone justifies the cost when talking to enterprise.
3. **HODL invoices on Voltage** are more reliable. LND's hold invoice implementation is the most battle-tested.
4. **Scaling path:** Voltage can handle growth from startup to enterprise volumes. Alby Hub on Railway has a ceiling.
5. **Stablecoin readiness:** Voltage is adding USDT on Lightning + Taproot Assets. Future-proofs the treasury.

### What NOT to Do

- Don't move everything to Voltage. We lose NWC entirely.
- Don't stay Alby-only forever. We have no SOC 2 story and LDK's hold invoices are less proven at scale.

### Timing

- **Now:** Keep Alby Hub, finish Alby Hub channel funding (the $13 Megalith channel)
- **Phase 2 (post-launch, when revenue exists):** Add Voltage Lite node ($27/mo) for treasury
- **Phase 3 (enterprise clients):** Upgrade to Voltage Standard or Payments API

### Cost Impact

| Phase | Monthly Cost | What You Get |
|-------|-------------|-------------|
| **Now** | $0 (Alby self-hosted) + Railway hosting | NWC + basic treasury |
| **Phase 2** | ~$27/mo (Voltage Lite) + Railway | Hybrid: NWC + SOC 2 treasury |
| **Phase 3** | $12K+/yr (Voltage Payments) | Full enterprise payment stack |

---

## 12. Open Questions

1. **Voltage LND version:** What version of LND are they running? Needed to confirm HODL invoice sub-server compatibility.
2. **Voltage Payments API:** Does it abstract HODL invoices, or do you still need raw LND access?
3. **Flow replacement:** When does the next-gen LSP launch? Could replace Megalith for Alby Hub.
4. **Bridge architecture:** Can we route Voltage treasury <-> Alby Hub user payments efficiently?
5. **NWC bridge on Voltage:** Has anyone built a NWC bridge that sits in front of a Voltage LND node?

---

## Sources

- [Voltage Homepage](https://voltage.cloud/)
- [Voltage Lightning Nodes](https://www.voltage.cloud/lightning-nodes)
- [Voltage Enterprise](https://www.voltage.cloud/enterprise)
- [Voltage Nostr Toolkit](https://www.voltage.cloud/nostr)
- [Voltage SOC 2 Announcement](https://www.voltage.cloud/blog/voltage-achieves-soc-2-type-ii-compliance-elevating-our-commitment-to-security-and-trust)
- [Voltage Hold Invoices Blog](https://voltage.cloud/blog/understanding-hold-invoices-on-the-lightning-network)
- [Voltage On-Demand Pricing](https://www.voltage.cloud/blog/announcing-on-demand-pricing)
- [Voltage Node-Backed Wallets](https://www.voltage.cloud/blog/introducing-node-backed-wallets-the-best-of-lightning-payments-with-full-node-control)
- [Voltage vs Lightspark](https://www.voltage.cloud/blog/voltage-vs-lightspark-choosing-the-right-partner-for-lightning-payments)
- [Voltage Surge Announcement](https://voltage.cloud/blog/voltage-announcements/announcing-surge-and-our-next-generation-platform/)
- [Voltage Flow LSP](https://www.voltage.cloud/flow)
- [Voltage Getting Started Docs](https://docs.voltage.cloud/getting-started-with-voltage)
- [Voltage LND Node API](https://docs.voltage.cloud/lnd-node-api)
- [Voltage gRPC Examples](https://docs.voltage.cloud/grpc-api-examples)
- [Voltage REST Examples](https://docs.voltage.cloud/rest-api-examples)
- [Voltage Node.js Integration](https://docs.voltage.cloud/nodejs)
- [Voltage Nostr/LNAddress Docs](https://docs.voltage.cloud/nostrlnaddress)
- [Voltage Non-Custodial Nostr Zaps](https://voltage.cloud/blog/non-custodial-nostr-zaps-nip05-ln-addresses)
- [Voltage Payments API Docs](https://docs.voltageapi.com)
- [LND Hold Invoice API Reference](https://lightning.engineering/api-docs/api/lnd/invoices/add-hold-invoice/)
- [Alby Hub GitHub](https://github.com/getAlby/hub)
- [NWC Documentation](https://docs.nwc.dev/)
- [Stacker News: Voltage vs Alby Cloud](https://www.stacker.news/items/1274546)
- [Amboss + Voltage Partnership (Nov 2025)](https://www.prnewswire.com/news-releases/amboss-and-voltage-partner-to-bring-yield-to-bitcoin-and-stablecoin-payments-302614524.html)

# Alby Hub Lightning Integration Research for Vouch

**Date**: 2026-02-24
**Purpose**: Actionable research on Alby Hub as Lightning infrastructure for Vouch trust-staking platform
**Constraint**: NO ESCROW -- stake locks where money stays in the user's wallet

---

## Executive Summary

Alby Hub + NWC (Nostr Wallet Connect / NIP-47) is the right stack for Vouch Lightning integration. The architecture gives us:

1. **Platform node** (Alby Hub self-hosted) -- collects fees, distributes yield, settles slashes
2. **User wallets** (any NWC-compatible wallet) -- users connect via NWC with budget pre-authorization
3. **Hold invoices** (NIP-47 `make_hold_invoice`) -- lock funds without settling, enabling non-custodial stake verification
4. **Nostr-native** -- NWC runs over Nostr relays, which aligns perfectly with Vouch's NIP-85 identity layer

**Critical finding**: NIP-47 explicitly includes `make_hold_invoice`, `settle_hold_invoice`, and `cancel_hold_invoice` methods. Alby Hub supports all three. This is the mechanism for non-custodial stake locks.

---

## 1. Alby Hub Setup

### What It Is

Alby Hub is an open-source, self-custodial Lightning wallet/node that implements NWC (NIP-47) as its primary connectivity protocol. It is written in Go with a React frontend, and embeds an LDK (Lightning Development Kit) node by default.

### Deployment Options

| Option | Cost | Control | Best For |
|--------|------|---------|----------|
| **Alby Cloud** | $9.90/mo (~21,000 sats) | Managed | Quick start, prototyping |
| **Self-hosted Docker** | Free (server costs) | Full | Production, Railway/VPS |
| **Self-hosted Binary** | Free | Full | Desktop/dedicated hardware |
| **Umbrel/Start9** | Free (hardware) | Full | Home server setups |

### Alby Cloud vs Self-Hosted for Vouch

**Recommendation: Self-hosted Docker on Railway** (same infrastructure as Vouch API)

- Alby Cloud is a convenience wrapper -- great for personal use, wrong for platform infrastructure
- Self-hosted gives full API access, custom configuration, no dependency on Alby's cloud
- Alby Cloud includes: lightning address, Nostr identifier, Podcasting 2.0, community access, live support
- Self-hosted includes: everything Alby Cloud has minus the managed infrastructure and extras
- For a platform collecting fees and distributing payments, self-hosted is the only serious option

### Docker Setup

```bash
# Pull and run
docker run -v ./albyhub-data:/data \
  -e WORK_DIR='/data' \
  -e PORT=8080 \
  -e JWT_SECRET='your-random-secret' \
  -p 8080:8080 \
  ghcr.io/getalby/hub:latest

# Or with docker-compose
# Download docker-compose.yml from https://github.com/getAlby/hub
docker-compose up -d
```

**Environment Variables:**
| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | HTTP listen port | 8080 |
| `WORK_DIR` | Data storage directory | -- |
| `DATABASE_URI` | SQLite or PostgreSQL connection | SQLite in WORK_DIR |
| `JWT_SECRET` | Auth secret for HTTP API | -- |
| `RELAY` | Nostr relay URL | `wss://relay.getalby.com/v1` |
| `LOG_LEVEL` | Logging verbosity | -- |
| `LDK_ESPLORA_SERVER` | Block explorer for chain sync | -- |

**Resource requirements**: LDK is lightweight. Alby reports deploying multiple Hubs per cloud server, each spinning up in under 2 minutes. A Railway service with 512MB-1GB RAM should be sufficient.

### Lightning Backends

Alby Hub supports multiple backends (the embedded LDK node is default):

| Backend | Type | Notes |
|---------|------|-------|
| **LDK** (default) | Embedded | Lightweight, zero-conf LSP channels, auto-managed |
| **LND** | External | Full-featured, requires separate LND instance |
| **Phoenixd** | External | Acinq managed liquidity, 1% fee |
| **Cashu** | External | Ecash, different trust model |

**For Vouch**: Start with LDK (simplest). If hold invoice support requires LND (see Section 4), switch to external LND backend.

---

## 2. Alby Hub HTTP API

Alby Hub exposes a comprehensive internal HTTP API (Go/Gin-based) with JWT authentication. This is NOT the same as NWC -- it's the management API for the Hub itself.

### Key Endpoints (from source: `http_service.go`)

**Invoices & Payments:**
- `POST /api/invoices` -- Create invoice
- `POST /api/payments/:invoice` -- Send payment
- `GET /api/transactions` -- List transactions (supports `appId`, `limit`, `offset`)
- `GET /api/transactions/:paymentHash` -- Lookup specific transaction

**Balance & Wallet:**
- `GET /api/balances` -- Get node balances
- `GET /api/wallet/address` -- Get onchain address
- `GET /api/wallet/capabilities` -- What the wallet can do
- `POST /api/wallet/new-address` -- Generate new address
- `POST /api/wallet/sign-message` -- Sign a message

**App/Connection Management:**
- `GET /api/apps` -- List NWC-connected apps
- `POST /api/apps` -- Create new app connection (returns NWC URL)
- `PATCH /api/apps/:pubkey` -- Update app permissions/budget
- `DELETE /api/apps/:pubkey` -- Revoke app connection
- `POST /api/transfers` -- Transfer between sub-wallets

**Channel Management:**
- `GET /api/channels` -- List channels
- `POST /api/channels` -- Open channel
- `POST /api/channels/rebalance` -- Rebalance
- `POST /api/lsp-orders` -- Purchase liquidity from LSP
- `GET /api/channels/suggestions` -- Peer suggestions

**Node Management:**
- `GET /api/node/status` -- Node status
- `GET /api/node/connection-info` -- Connection details
- `GET /api/health` -- Health check
- `POST /api/stop` / `POST /api/start` -- Node lifecycle

**Swaps (on-chain <-> Lightning):**
- `POST /api/swaps/out` -- Swap out (Lightning -> on-chain)
- `POST /api/swaps/in` -- Swap in (on-chain -> Lightning)
- `POST /api/autoswap` -- Enable auto-swap for liquidity management

### Authentication

JWT token in HTTP mode. Set `JWT_SECRET` env var. The frontend React app uses the same API, so it's well-tested.

### Important Note

This HTTP API is internal/undocumented -- not a public spec. For platform-to-platform communication, NWC (NIP-47) is the sanctioned protocol. Use the HTTP API for:
- Platform admin operations
- Channel management
- Node monitoring
- Internal invoice creation for fee collection

---

## 3. NWC (Nostr Wallet Connect / NIP-47)

### How It Works

```
User's Wallet (Alby Hub, etc.)
        |
    [NWC Connection] -- encrypted Nostr events (kind 23194/23195)
        |
    [Nostr Relay]
        |
    [Vouch Platform]
```

1. User creates an "app connection" in their wallet (Alby Hub, Primal, etc.)
2. Connection generates a `nostr+walletconnect://` URI with a keypair
3. User shares this URI with Vouch platform
4. Vouch sends encrypted NIP-47 requests to the user's wallet via Nostr relay
5. User's wallet processes requests within the authorized budget
6. Responses come back encrypted over the same relay

### Supported NIP-47 Methods

| Method | Description | Vouch Use |
|--------|-------------|-----------|
| `pay_invoice` | Pay a BOLT-11 invoice | Stake lock settlement, fee payment |
| `make_invoice` | Create invoice to receive | Yield distribution |
| `lookup_invoice` | Check invoice status | Verify payment state |
| `get_balance` | Check wallet balance | Proof of stake (verify funds exist) |
| `get_info` | Wallet capabilities | Determine what user's wallet supports |
| `list_transactions` | Transaction history | Audit trail |
| `pay_keysend` | Spontaneous payment | -- |
| **`make_hold_invoice`** | **Create hold invoice** | **STAKE LOCK mechanism** |
| **`settle_hold_invoice`** | **Settle held payment** | **Slash settlement** |
| **`cancel_hold_invoice`** | **Cancel held payment** | **Stake release** |

### SDK

```bash
npm install @getalby/sdk
```

```typescript
import { nwc } from "@getalby/sdk";

// Connect to user's wallet via NWC
const client = new nwc.NWCClient({
  nostrWalletConnectUrl: "nostr+walletconnect://pubkey?relay=wss://...&secret=..."
});

// Create invoice (for receiving)
const invoice = await client.makeInvoice({
  amount: 1000, // millisatoshis
  description: "Vouch yield distribution"
});

// Pay invoice
const payment = await client.payInvoice({ invoice: "lnbc..." });

// Check balance
const balance = await client.getBalance();

// Get wallet info
const info = await client.getInfo();
```

### Connection Authorization (from user's Alby Hub)

When a user creates an NWC connection for Vouch, they can set:

```
nostr+walletconnect://<wallet_pubkey>?
  relay=wss://relay.getalby.com/v1&
  secret=<connection_secret>&
  lud16=user@getalby.com&
  request_methods=pay_invoice+get_balance+make_hold_invoice+settle_hold_invoice+cancel_hold_invoice&
  max_amount=100000&        # max sats per period
  budget_renewal=monthly    # daily | weekly | monthly | yearly | never
```

### NIP-47 Notifications

Wallet services can push encrypted notifications (kind 23197) for events:
- `payment_received` -- incoming payment arrived
- `payment_sent` -- outgoing payment confirmed
- `hold_invoice_accepted` -- hold invoice payment locked (critical for Vouch)
- `hold_invoice_canceled` -- hold invoice explicitly canceled

This means Vouch can subscribe to real-time events from connected wallets without polling.

---

## 4. Hold Invoices -- The Stake Lock Mechanism

### This Is the Key Architecture Decision

Hold invoices are the mechanism that makes non-custodial stake locks work on Lightning. Here's how:

### How Hold Invoices Work

```
Normal Invoice:          Hold Invoice:
Payer -> HTLC -> Payee   Payer -> HTLC -> Payee holds preimage
Payment settles          Payment is LOCKED but not settled
immediately              Payee can:
                           - Settle (release preimage, claim funds)
                           - Cancel (return funds to payer)
                           - Let it timeout (auto-returns to payer)
```

### Vouch Stake Lock Flow

```
1. User commits 10,000 sats stake
2. Vouch generates preimage + payment_hash
3. Vouch calls make_hold_invoice on PLATFORM node
4. User pays the hold invoice from their NWC-connected wallet
5. Vouch receives hold_invoice_accepted event
6. Funds are LOCKED in the Lightning HTLC -- not in Vouch's wallet
7. Stake is now verifiably committed

IF good behavior (stake period ends):
8. Vouch calls cancel_hold_invoice -> funds return to user
9. Yield is distributed via separate pay_invoice to user

IF bad behavior (slash triggered):
8. Vouch calls settle_hold_invoice with preimage -> funds claimed
9. Slashed amount goes to platform/affected parties
```

### NIP-47 Hold Invoice API

```typescript
import { nwc } from "@getalby/sdk";
import crypto from "crypto";

// Platform's own NWC client (connected to platform's Alby Hub)
const platformClient = new nwc.NWCClient({
  nostrWalletConnectUrl: process.env.PLATFORM_NWC_URL
});

// --- CREATE HOLD INVOICE ---
// Generate preimage (keep secret until settle/slash)
const preimage = crypto.randomBytes(32).toString("hex");
const paymentHash = crypto
  .createHash("sha256")
  .update(Buffer.from(preimage, "hex"))
  .digest("hex");

// Create hold invoice on platform node
const holdInvoice = await platformClient.makeHoldInvoice({
  amount: 10000 * 1000, // 10,000 sats in millisats
  description: "Vouch stake lock: agent xyz, period 2026-03",
  payment_hash: paymentHash
});

// holdInvoice.invoice = "lnbc..." (BOLT-11 to send to user)
// Store: { preimage, paymentHash, agentId, stakeAmount, period }

// --- USER PAYS FROM THEIR WALLET ---
// User's NWC wallet pays the hold invoice
// Platform receives hold_invoice_accepted notification
// Funds are now LOCKED

// --- SETTLE (SLASH) ---
await platformClient.settleHoldInvoice({
  payment_hash: paymentHash
  // preimage is provided to claim the funds
});

// --- CANCEL (RELEASE STAKE) ---
await platformClient.cancelHoldInvoice({
  payment_hash: paymentHash
});
// Funds return to user automatically
```

### Critical Caveat: LDK Hold Invoice Support

NIP-47 defines the hold invoice methods, and Alby Hub's NWC layer supports them. However, hold invoices must be supported at the **Lightning node level**:

| Backend | Hold Invoice Support |
|---------|---------------------|
| **LND** | YES -- native `AddHoldInvoice` / `SettleInvoice` / `CancelInvoice` |
| **CLN** | YES -- via plugin |
| **LDK** | UNCLEAR -- no explicit documentation found |

**Risk**: If Alby Hub's default LDK backend doesn't support hold invoices at the node level, you'd need to configure an external LND backend instead.

**Mitigation**: Alby Hub supports external LND connections. Deploy LND separately (e.g., via Voltage or self-hosted) and point Alby Hub at it:

```bash
# Alby Hub with external LND
docker run -v ./albyhub-data:/data \
  -e WORK_DIR='/data' \
  -e LND_ADDRESS='lnd.example.com:10009' \
  -e LND_CERT_FILE='/path/to/tls.cert' \
  -e LND_MACAROON_FILE='/path/to/admin.macaroon' \
  -p 8080:8080 \
  ghcr.io/getalby/hub:latest
```

### Hold Invoice Limitations

- **Liquidity lock**: While a hold invoice is pending, the payer's funds AND all intermediate routing nodes' liquidity is locked
- **Timeout**: Hold invoices have expiry (typically 10-60 minutes on Lightning). Long-term stake locks (days/weeks) are NOT feasible with hold invoices alone
- **Channel stress**: Many concurrent hold invoices can strain channel liquidity

### Alternative for Long-Term Stakes

Hold invoices work for **verification** (prove you have funds, then release), but NOT for long-term locks. For ongoing stake commitment, the architecture should be:

```
Option A: Periodic Re-commitment
1. User pays hold invoice (proves funds)
2. Platform verifies, then cancels (returns funds)
3. User's NWC budget pre-authorization serves as the "lock"
4. If slash needed, platform calls pay_invoice within authorized budget
5. Repeat verification periodically

Option B: DLC (Discreet Log Contracts) -- future
- True non-custodial lock with Bitcoin script
- Requires more infrastructure, but is the ideal end-state

Option C: Stake Lock = Budget Authorization
1. User connects NWC with budget = stake amount
2. Budget renewal = stake period (monthly)
3. Platform can only claim up to budget amount
4. If slash: platform sends pay_invoice for slashed amount
5. No hold invoice needed -- NWC budget IS the lock
```

**Recommendation**: Start with **Option C** (NWC budget as lock) for v1. It's simpler, doesn't require hold invoices or LND, and is genuinely non-custodial. The budget authorization IS the commitment. Add hold-invoice-based verification as an enhancement later.

---

## 5. Alby Hub + LNbits Integration

### Can Alby Hub be a Funding Source for LNbits?

Yes, but it's indirect. LNbits supports these backend wallets:
- LND (direct)
- CLN (direct)
- LndHub (Alby Hub can expose this)
- NWC (via Nostr Wallet Connect)

Alby Hub can fund LNbits via NWC connection. But the question is: **should you?**

### Skip LNbits for Vouch

**Recommendation: Use Alby Hub directly, skip LNbits.**

Why:
- LNbits adds a custodial layer (it manages sub-wallets internally)
- Alby Hub's NWC + HTTP API provides everything Vouch needs
- LNbits is designed for multi-tenant Lightning (merchant tools, extensions)
- Vouch is a single-platform collecting fees and distributing payments
- Adding LNbits = more infrastructure, more failure points, no benefit

LNbits makes sense when:
- You need multi-tenant wallet management (not our case -- NWC handles user wallets)
- You want LNbits extensions (tip jars, point-of-sale, etc.)
- You're building a custodial service (explicitly NOT our case)

---

## 6. NWC Budget Authorization (Stake Lock v1)

### How It Works (The Simplest Viable Approach)

```
1. User installs Alby Hub (or any NWC-compatible wallet)
2. User creates "Vouch" app connection in their wallet
3. User sets:
   - Allowed methods: pay_invoice, get_balance
   - Budget: 50,000 sats/month (= their stake commitment)
   - Budget renewal: monthly
4. User shares NWC connection URI with Vouch
5. Vouch stores the connection URI (encrypted)
6. Vouch can now:
   - Check user's balance (verify they have funds)
   - Request payments up to budget (for slashing)
   - CANNOT exceed budget (enforced by user's wallet)
```

### Technical Flow

```typescript
// User provides NWC connection URI during staking setup
const userNWC = "nostr+walletconnect://pubkey?relay=wss://...&secret=...";

// Platform creates client for this user
const userClient = new nwc.NWCClient({
  nostrWalletConnectUrl: userNWC
});

// Verify user's wallet capabilities
const info = await userClient.getInfo();
// info.methods = ["pay_invoice", "get_balance", ...]

// Check balance (proof of stake)
const balance = await userClient.getBalance();
// balance.balance = 150000 (millisats)

// If slash needed: request payment from user's wallet
const slashInvoice = await platformClient.makeInvoice({
  amount: 5000 * 1000, // 5,000 sats slash
  description: "Vouch slash: dispute #123"
});

// Pay from user's pre-authorized budget
const payment = await userClient.payInvoice({
  invoice: slashInvoice.invoice
});
// This succeeds if within budget, fails if exceeded
```

### What This Gets Us

- **Non-custodial**: Funds stay in user's wallet at all times
- **Verifiable commitment**: `get_balance` confirms funds exist
- **Budget-limited slashing**: Platform can only claim within pre-authorized budget
- **User-controlled**: User can revoke connection anytime
- **No hold invoices needed**: Simpler infrastructure
- **Any NWC wallet**: Not limited to Alby Hub users

### Limitations

- User CAN revoke the connection (defection vector)
- User CAN spend funds elsewhere (balance drops below commitment)
- No cryptographic proof of lock (only behavioral commitment)
- Budget is per-period, not per-event granularity

### Mitigations

- Periodic balance checks (cron job verifying connected wallets have sufficient funds)
- Reputation penalties for revocation (Vouch score impact)
- Grace period + warning before slashing
- Public revocation events on Nostr (transparency)

---

## 7. Recommended Architecture for Vouch v1

```
┌─────────────────────────────────────────────────┐
│                 VOUCH PLATFORM                   │
│                                                  │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  Vouch API   │    │  Alby Hub (Docker)    │  │
│  │  (Railway)   │───▶│  Platform Lightning   │  │
│  │              │    │  Node (self-hosted)    │  │
│  └──────┬───────┘    └───────────┬───────────┘  │
│         │                        │               │
│         │   NWC (NIP-47)        │ HTTP API      │
│         │   via Nostr Relay     │ (JWT auth)    │
│         │                        │               │
└─────────┼────────────────────────┼───────────────┘
          │                        │
          ▼                        ▼
┌─────────────────┐    ┌──────────────────────────┐
│  User Wallets   │    │  Platform Operations     │
│  (any NWC)      │    │  - Create invoices       │
│  - Alby Hub     │    │  - Check balances        │
│  - Primal       │    │  - Manage channels       │
│  - Coinos       │    │  - Auto-swap liquidity   │
│  - etc.         │    │                          │
└─────────────────┘    └──────────────────────────┘
```

### Phase 1: Basic Lightning (Week 1-2)

1. Deploy Alby Hub Docker on Railway alongside Vouch API
2. Fund platform node (open channels, source inbound liquidity via LSP)
3. Implement NWC connection flow for user wallet linking
4. Implement `get_balance` for proof-of-stake verification
5. Implement `make_invoice` for fee collection
6. Implement `pay_invoice` for yield distribution

### Phase 2: Stake Locks via Budget Auth (Week 3-4)

1. NWC budget pre-authorization flow (user sets budget = stake)
2. Periodic balance verification (cron)
3. Slash mechanism via `pay_invoice` within budget
4. Stake dashboard showing connected wallets and commitment status
5. Revocation detection and reputation impact

### Phase 3: Hold Invoice Enhancement (Week 5-6)

1. If LDK supports hold invoices: implement verification flow
2. If not: deploy external LND, connect to Alby Hub
3. Hold invoice stake verification (prove-then-release)
4. Event subscriptions for `hold_invoice_accepted`
5. Automated slash settlement via `settle_hold_invoice`

### Phase 4: Advanced (Future)

1. Multi-sig or DLC-based true non-custodial locks
2. On-chain stake verification for large amounts
3. Cross-platform trust attestation via NIP-85
4. Automated liquidity management (auto-swap)

---

## 8. Key Decisions Required

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Deployment** | Alby Cloud vs Self-hosted | **Self-hosted Docker on Railway** |
| **LN Backend** | LDK (default) vs External LND | **Start LDK, move to LND if hold invoices need it** |
| **Stake mechanism v1** | Hold invoices vs NWC budget auth | **NWC budget auth (simpler, works today)** |
| **LNbits** | Use LNbits vs Direct Alby Hub API | **Direct Alby Hub (no LNbits needed)** |
| **Nostr relay** | Alby's relay vs Self-hosted | **Alby's relay to start, self-hosted later** |
| **User wallets** | Require Alby Hub vs Any NWC | **Any NWC wallet (wider adoption)** |

---

## 9. Cost Estimates

| Item | Cost | Notes |
|------|------|-------|
| Alby Hub hosting (Railway) | ~$5-10/mo | Docker service, 512MB-1GB RAM |
| Initial channel liquidity | ~$50-200 | Opening channels with LSPs |
| Inbound liquidity (LSP) | Variable | LSPs charge for channel opens |
| Nostr relay (Alby's) | Free | Default relay, good enough for start |
| Total startup | **~$60-210** | Plus ongoing ~$10/mo hosting |

---

## 10. Sources

- [Alby Hub GitHub](https://github.com/getAlby/hub)
- [Alby Hub Website](https://albyhub.com/)
- [Alby Developer Guide - NWC](https://guides.getalby.com/developer-guide/nostr-wallet-connect-api)
- [NIP-47 Specification](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [NWC JS SDK](https://guides.getalby.com/developer-guide/nostr-wallet-connect-api/building-lightning-apps/nwc-js-sdk)
- [Alby JS SDK (npm: @getalby/sdk)](https://github.com/getAlby/js-sdk)
- [Alby Hub Conditional Payment Logic (Hold Invoices)](https://blog.getalby.com/build-conditional-payment-logic-into-your-app/)
- [NWC Documentation](https://docs.nwc.dev/)
- [Alby Hub Pricing](https://getalby.com/pricing)
- [LDK + Alby Hub Blog Post](https://lightningdevkit.org/blog/alby-hub-uses-ldk-to-offer-a-self-custodial-lightning-wallet-for-everyone/)
- [Alby Hub Flavors Guide](https://guides.getalby.com/user-guide/alby-account-and-browser-extension/alby-hub/alby-hub-flavors)
- [Hold Invoices - Bitcoin Optech](https://bitcoinops.org/en/topics/hold-invoices/)
- [Voltage - Hold Invoices Explained](https://voltage.cloud/blog/understanding-hold-invoices-on-the-lightning-network)
- [NIP-47 on nips.nostr.com](https://nips.nostr.com/47)

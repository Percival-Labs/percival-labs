# Percival Labs Financial Architecture

**Two-wallet structure. Non-custodial fund flows. Two-provider architecture.**

Last updated: Feb 26, 2026 (Lightspark + Voltage evaluations added)

---

## Core Principle

**Percival Labs is a coordination and verification layer, NOT a financial intermediary.**

We compute trust scores, verify outcomes, determine slash amounts, and send NWC payment requests. Actual sats move wallet-to-wallet without passing through us. We never hold, route, or control user funds.

This is not optional — Washington State money transmitter licensing requires $100K minimum net worth and $16K-$92K/year in fees. Non-custodial architecture is a legal requirement at our stage.

---

## Wallet Structure

### 1. PL Treasury (Alby Hub on Railway)

| Detail | Value |
|--------|-------|
| **Purpose** | Company revenue accumulation |
| **Inflows** | 1% platform fees (direct Lightning invoices to PL) |
| **Holds** | PL's own money only — never user funds |
| **Controlled by** | PL's own Nostr keypair |
| **Infrastructure** | Alby Hub on Railway, LDK backend |

### 2. Off-ramp (Strike)

| Detail | Value |
|--------|-------|
| **Purpose** | Fiat conversion for taxes and expenses |
| **Inflows** | Quarterly sweeps from Treasury |
| **Outflows** | Bank transfers, tax payments, contractor payments |
| **Frequency** | Quarterly (aligned with estimated tax dates) |
| **Cadence** | April 15, June 15, Sept 15, Jan 15 |

---

## Fund Flows (All Non-Custodial)

### Activity Fee Collection

```
Client completes task with Agent
  │
  ├── Client wallet ──NWC──→ Agent wallet     (task payment, P2P)
  │
  └── Client wallet ──NWC──→ PL Treasury      (1% platform fee, separate invoice)
```

PL receives only its 1% fee. The 99% task payment goes directly from client to agent. PL never touches it.

### Yield Distribution (Staker Payouts)

```
Agent earns activity fees from tasks
  │
  PL computes staker yield amounts (proportional to stake)
  │
  Agent wallet ──NWC──→ Staker wallets        (yield payouts, P2P)
```

PL coordinates and computes amounts. PL sends NWC payment requests. The actual sats flow agent-to-staker without passing through PL.

### Slash Flow

```
Slash event triggered (fraud, consistent failure, dispute)
  │
  PL computes proportional slash amounts
  │
  Staker wallets ──NWC──→ Damaged party wallet (100% to claimant, P2P)
```

**PL takes 0% of slashes.** 100% goes to the damaged party. PL profits from good behavior (1% activity fee), not from bad events. This aligns incentives with C > D.

### Tax Conversion

```
Quarterly:
  PL Treasury ──Lightning──→ Strike ──ACH──→ Bank account
  (Convert ~40% of quarterly receipts for taxes + expenses)
  (Hold remainder as long-term BTC position)
```

---

## What PL Never Does

- Hold user funds (even temporarily)
- Route payments between users through our wallets
- Escrow funds pending dispute resolution
- Take custody of staker principal
- Commingle user and company funds

---

## Tax Structure

| Tax | Rate | Trigger |
|-----|------|---------|
| Federal income | 10-37% | Receipt of sats (at FMV) |
| Self-employment | 15.3% | Net self-employment income |
| WA B&O | 1.5% | Gross income quarterly |
| Federal capital gains | 0-20% (long-term) | When sats are converted to fiat |

**Key rule:** Income tax is owed at receipt, not at conversion. Holding doesn't defer income tax — only defers capital gains treatment.

**Strategy:** Convert enough each quarter for taxes + expenses. Hold rest for long-term capital gains treatment (>1 year = 0-15% rate vs ordinary rate).

**TODO:** Research tax mitigation strategies (S-corp election, retirement accounts, QBI deduction, etc.) once revenue is flowing. Current effective rate (~37%) is too high at scale.

---

## Record-Keeping Requirements (IRS)

Every sat received must be logged with:
- Date and time (UTC)
- Amount of sats
- BTC/USD price at receipt (from reliable source)
- USD fair market value
- Source/reason (e.g., "1% fee on contract #X")
- Lightning payment hash

Every conversion must be logged with:
- Date and time
- Amount of sats converted
- BTC/USD price at conversion
- Cost basis (from receipt record)
- Gain or loss
- Accounting method: **FIFO**

**Tooling:** CoinTracker or Koinly ($50-200/year) for automated tracking + tax form generation.

---

## Implementation Notes

### Alby Hub (Treasury)
- Deployed on Railway: `alby-hub-production.up.railway.app`
- LDK backend, persistent volume at `/data`
- BLOCKED: Needs ~$13 channel funding from Megalith LSP (Strike pending)
- Once funded: Set `ALBY_HUB_URL` + `ALBY_HUB_JWT` on vouch-api

### Code Changes Needed
- `albyhub-service.ts` — Restrict to PL fee collection only. No user fund routing.
- `nwc-service.ts` — All user payments are P2P via NWC requests. PL coordinates, never intermediates.
- Add auto-logging: timestamp + BTC price + USD value on every Treasury receipt.
- `price-service.ts` — Already exists (CoinGecko, 15-min cache). Use for receipt valuation.

### Per-Wallet Cost Basis (IRS 2025 Rule)
Treasury wallet tracks its own cost basis independently. Do not commingle with personal crypto. FIFO method, documented.

---

## Escrow Roadmap — HODL Invoices + Partner Strategy

### Key Finding: Lightning Has Native Escrow

Lightning **HODL invoices** (hold invoices) provide non-custodial escrow without a money transmitter license:

```
Client pays HODL invoice → sats LOCK in Lightning HTLC (in transit, not held by PL)
  → Milestone verified → PL releases preimage → sats flow to agent
  → Milestone fails/timeout → invoice expires → sats return to client
```

PL never takes custody. The Lightning protocol IS the escrow mechanism. RoboSats uses this pattern in production for P2P trade escrow.

**Decision (Feb 26):** HODL invoices are the primary mechanism for contract milestone payments. Implement via Alby Hub (LDK supports hold invoices) or Voltage.

### Legal Question (MUST ANSWER BEFORE SCALING)

Do HODL invoices constitute custody under WA RCW 19.230 or FinCEN guidance? Sats are locked in an HTLC, not in anyone's wallet — "in transit" not "held." Probably NOT custody, but fintech attorney must confirm. See `research/escrow-custody-partner-landscape.md`.

### Phased Infrastructure Strategy

| Phase | Trigger | Approach | Cost |
|-------|---------|----------|------|
| **1 (Now)** | Launch | Alby Hub only. HODL invoices via LDK. Fund Megalith channel. Ship. | ~$5-10/mo (Railway) |
| **2** | Revenue exists | Add Voltage Lite as dedicated treasury node. SOC 2 story for sales. | +$27/mo |
| **3** | $50K+/mo, enterprise | Upgrade to Voltage Payments API. Partner with Zero Hash for 51-state regulatory cover. | $12K+/yr + custom |
| **4** | $500K+/mo | Evaluate own licensing vs. deepening partnerships | $100K+ |

### Infrastructure Evaluation (Deep-Dived Feb 26)

#### Voltage — Best Scaling Partner

Voltage runs managed **LND nodes** with full gRPC/REST API access. Non-custodial by default (you hold seed + macaroon). Key findings:

| Capability | Status |
|------------|--------|
| **HODL invoices** | Full support via LND API (`AddHoldInvoice`, `SettleInvoice`, `CancelInvoice`). Most battle-tested implementation in ecosystem. |
| **SOC 2 Type II** | Confirmed (Sept 2023). Strongest enterprise credibility signal in Lightning infra space. |
| **NWC support** | None. Alby Hub is the NWC reference implementation — Voltage can't replace it for user-facing payments. |
| **Nostr toolkit** | Thin — NIP-05 + LN address only. Not useful for platform-level Nostr integration. |
| **Pricing** | Lite ~$27/mo, Standard ~$38/mo, Enterprise from $12K/yr. No per-transaction fee (unlike Lightspark). |
| **Self-custody** | Yes — AES-256 encryption, Tor routing, no SSH on servers, stateless-init macaroons. |
| **SDK** | No official SDK. Raw LND gRPC/REST with Node.js examples. TypeScript via LND proto defs. |
| **LSP** | Flow (their LSP) deprecated late 2024. Amboss partnership (Nov 2025) for enterprise liquidity. Manual channel management otherwise. |

**Role in PL stack:** Dedicated treasury/escrow node when revenue exists. SOC 2 cert for enterprise sales materials. Battle-tested HODL invoices for milestone verification at scale.

#### Lightspark — Not a Fit (Yet)

Enterprise Lightning infra by David Marcus (ex-PayPal president, ex-Meta Diem/Libra). $175M+ raised. Customers: Coinbase, Revolut, SoFi.

| Capability | Status |
|------------|--------|
| **HODL invoices** | **No API support found.** Their abstraction layer removes low-level Lightning primitives. Dealbreaker. |
| **Transaction fee** | 0.50% per tx — eats half our 1% platform fee. Net negative vs Alby Hub. |
| **Custody model** | Custodial by default (remote-key option exists). Wrong direction for us. |
| **NWC** | UMA Auth is built ON NWC (collaborated with Alby). Interesting for fiat bridging, not for Bitcoin-native agent payments. |
| **SOC 2** | Not publicly confirmed despite enterprise customer list. |
| **UMA protocol** | Universal Money Address — cross-currency fiat routing. Relevant only if we ever bridge to fiat payments at enterprise scale. |

**Role in PL stack:** None currently. Revisit only if we need fiat-to-fiat bridging for enterprise customers at $1M+/month volume.

#### Other Partners

| Partner | Fit | Notes |
|---------|-----|-------|
| **Zero Hash** | Regulatory cover at scale | 51 state MTL licenses. Custom enterprise pricing. For $50K+/mo volume. |
| **BitGo + Voltage** | Institutional | Go Network settlement (Dec 2025). 5 bps/mo + custom. |

**Not a fit:** Bridge (no LN), Strike (no hold), OpenNode (no escrow), Fortress (NFTs), Anchorage (institutional only), Lightspark (no HODL invoices, 0.50% fee).

### Two-Provider Architecture (Decided Feb 26)

PL needs two different things no single provider excels at:

| Layer | Provider | Why |
|-------|----------|-----|
| **User payments** (NWC, zaps, agent wallets) | **Alby Hub** (permanent) | NWC reference implementation, Nostr-native, TypeScript SDK, zero tx fees |
| **Treasury/escrow** (fee collection, HODL invoices, compliance) | **Voltage** (add later) | SOC 2 Type II, battle-tested LND HODL invoices, enterprise scaling path |

### Fee Structure for Escrow Transactions

```
Standard transactions: 1% platform fee (current)
Escrow transactions:   1% platform fee + partner escrow fee (~0.50%)
                       Total: ~1.50% on escrowed transactions
```

Higher fee justified by: actual fund locking, milestone verification, dispute resolution infrastructure.

### Patent Strategy (Decided Feb 26)

Filing provisional patent on the system: "Construction-derived milestone-gated contract system using Lightning HODL invoices for AI agent transactions with three-party trust verification."

- **12-month clock** from first public disclosure (~Feb 2026). Must file provisional by ~Feb 2027.
- **Alice v. CLS Bank risk:** Pure "escrow on blockchain" is ineligible. Must frame as technical improvement (construction contract patterns + three-party verification + HODL invoice mechanics).
- Full landscape analysis: `research/escrow-custody-partner-landscape.md`
- Legal counsel research: `research/legal-counsel-research.md`

---

## Legal References

- **No custodial escrow (current):** RCW 19.230 (WA money transmitter statute). No threshold, no exemption.
- **HODL invoices (escrow roadmap):** Potentially non-custodial — attorney review needed.
- **Non-custodial safe harbor:** FinCEN 2019 CVC Guidance — NWC budget auth is not money transmission.
- **Tax:** IRS FAQ Q10 (crypto as income at receipt), Schedule C (single-member LLC pass-through).
- **B&O:** WAC 458-20-254, DOR interim statement on Bitcoin.
- **Full analyses:** `research/vouch-crypto-legal-analysis.md`, `research/escrow-custody-partner-landscape.md`

---

*This document is the single source of truth for PL financial architecture. Update here first, then propagate to code.*

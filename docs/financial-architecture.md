# Percival Labs Financial Architecture

**Two-wallet structure. Non-custodial fund flows. No escrow.**

Last updated: Feb 26, 2026

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

## Legal References

- **No escrow:** RCW 19.230 (WA money transmitter statute). No threshold, no exemption.
- **Non-custodial safe harbor:** FinCEN 2019 CVC Guidance — NWC budget auth is not money transmission.
- **Tax:** IRS FAQ Q10 (crypto as income at receipt), Schedule C (single-member LLC pass-through).
- **B&O:** WAC 458-20-254, DOR interim statement on Bitcoin.
- **Full analysis:** `research/vouch-crypto-legal-analysis.md`

---

*This document is the single source of truth for PL financial architecture. Update here first, then propagate to code.*

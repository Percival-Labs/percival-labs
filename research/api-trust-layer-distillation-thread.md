# X Thread: 24,000 Fake Accounts / Vouch Response

**Account:** @PercivalLabs
**Date:** February 24, 2026
**Context:** Anthropic disclosure of Chinese AI lab model distillation via 24K+ fake accounts

---

## Tweet 1 (Hook)

Today @AnthropicAI disclosed that Chinese AI labs created 24,000+ fake accounts and ran 16M+ exchanges with Claude for model distillation.

Their response: "No company can solve this alone."

They're right. Here's why -- and what the fix looks like. [1/9]

> [IMAGE: Screenshot or quote card of the Anthropic disclosure headline, clean dark background with the "24,000 accounts" and "16M exchanges" stats highlighted]

---

## Tweet 2 (Problem)

The current defense stack:
- Email verification: $0 to create accounts
- Rate limits: useless across 24K parallel accounts
- Account bans: minutes to replace

Every defense is reactive. None change the economics of the attack. Identity is free. Consequences are cheap. [2/9]

---

## Tweet 3 (Hydra)

Anthropic called these "hydra cluster architectures." Ban one account, another replaces it instantly. Because the cost of a new identity is zero.

This is a textbook Sybil attack. The only thing new is the target: models that cost hundreds of millions to train. [3/9]

---

## Tweet 4 (Thesis)

The fix is not better detection. It is economic identity.

API access needs to require real value at risk -- collateral that gets slashed when misuse is confirmed. Not a fee. A stake. [4/9]

---

## Tweet 5 (Vouch intro)

This is what we built. Vouch -- trust staking for API access:

- Consumers stake slashable collateral
- Vouchers back them with their own money at risk
- Cross-provider scores via Nostr
- Distillation triggers cascading slashes

Each new head costs real money. Hydra dies. [5/9]

> [IMAGE: Cost comparison table -- two columns: "Without Vouch" vs "With Vouch". Key rows: stake at risk ($0 vs $2.4M), vouchers needed (0 vs 24,000 trusted entities), consequence (account ban vs all stakes slashed)]

---

## Tweet 6 (Math)

The math on the Anthropic attack with Vouch in place:

24,000 accounts x $100 minimum stake = $2.4M in slashable collateral.

Each account needs a separate trusted voucher. Finding 24,000 legitimate entities willing to risk their money backing fake accounts: not happening. [6/9]

---

## Tweet 7 (ERC-8004 gap)

ERC-8004 -- 34K agents registered across 16 chains -- provides on-chain identity. But it explicitly leaves staking and slashing economics out of scope.

Identity without economic consequence is exactly the gap that 24,000 fake accounts exploited. Vouch fills it. [7/9]

---

## Tweet 8 (Design constraint)

Important: Vouch is not a gatekeeping tool. The protocol guarantees a minimum access floor -- even zero-stake consumers get 10 req/min with basic models.

No provider can use Vouch to completely deny access. It makes distillation unviable without making access exclusionary. [8/9]

---

## Tweet 9 (Close + link)

"No company can solve this alone." Correct. This requires a cross-provider trust layer -- decentralized, cryptographically verifiable, economically enforced.

We built it. Full spec and defensive disclosure:

percival-labs.ai/research/api-trust-layer-distillation [9/9]

> [IMAGE: Percival Labs wordmark on dark background with tagline "Trust infrastructure for the AI agent economy" and the URL]

---

## Character Counts (Verified)

1. 255 chars
2. 274 chars
3. 267 chars
4. 189 chars
5. 278 chars
6. 279 chars
7. 268 chars
8. 280 chars
9. 269 chars

All under 280. Verified programmatically.

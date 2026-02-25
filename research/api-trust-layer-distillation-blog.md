# 24,000 Fake Accounts: Why API Keys Can't Stop Model Distillation -- And What Can

*Alan Carroll | February 24, 2026 | Percival Labs*

---

On February 23, Anthropic published a disclosure that three Chinese AI labs -- DeepSeek, Moonshot AI, and MiniMax -- created over 24,000 fraudulent accounts and generated more than 16 million exchanges with Claude for the purpose of model distillation. They extracted frontier capabilities at industrial scale, used it to train competing models, and did so for months before detection.

Anthropic's response included a line that should be read carefully: **"No company can solve this alone."**

They are correct. And the reason they are correct is that the problem is not detection. The problem is architecture.

---

## The Defense Stack That Doesn't Work

Every frontier model provider currently relies on some combination of the following:

| Defense | What It Does | Why It Fails |
|---------|-------------|-------------|
| Email verification | Ties accounts to an email address | Creating emails costs nothing. 24,000 accounts at zero marginal cost. |
| Phone verification | Ties accounts to a phone number | Virtual phone numbers cost pennies. Bulk SMS services exist for exactly this purpose. |
| Rate limiting | Caps requests per account per time window | Effective per-account. Useless against 24,000 accounts running in parallel. |
| Usage anomaly detection | Flags suspicious query patterns | Reactive. By the time the pattern is detected, the data has already been extracted. |
| Terms of Service | Legal prohibition on distillation | Unenforceable across jurisdictions. The labs in question operate in countries where US ToS carries no weight. |
| Account bans | Terminates detected accounts | The maximum penalty. And it costs the attacker nothing but the time to create a replacement. |

Every defense in this table is **reactive**. It responds to abuse after it has occurred. None of them change the economics of the attack itself.

---

## Hydra Cluster Architectures

Anthropic used the term "hydra cluster" to describe what they observed: a coordinated network of accounts where banning one simply activates another. The metaphor is precise. You cut off a head and two more appear, because the cost of growing a new head is effectively zero.

The 24,000 accounts were not 24,000 independent actors. They were a single coordinated operation distributed across thousands of disposable identities. The identities were cheap. The coordination was centralized. The extraction was systematic.

This is not a novel attack pattern. It is the same Sybil attack that has plagued every identity system since the term was coined in 2002. The only thing that has changed is the target: instead of manipulating a social network or a voting system, the Sybil army is extracting the distilled intelligence of models that cost hundreds of millions of dollars to train.

The current defense stack treats each account as an independent entity and evaluates it in isolation. That is why it fails. The attacker is not operating in isolation. The defense should not be either.

---

## What's Actually Missing: Economic Identity

The fundamental problem is that **identity is free and consequences are cheap**.

Creating an API account costs nothing. Using it for distillation costs only the per-token API fee -- which, for a state-backed operation extracting capabilities worth billions in training compute, is a rounding error. Getting caught costs one account ban and the five minutes it takes to create a replacement.

There is no economic stake. No community accountability. No cascading consequence. No cross-provider reputation. The attacker risks nothing that they value.

This is the gap. Not better detection. Not faster bans. Not more restrictive rate limits. The gap is an **economic identity layer** -- a system where accessing frontier model inference requires putting real value at risk, backed by real community members who also have skin in the game.

---

## How Vouch Works

Vouch is a trust-staking protocol built on Nostr. It creates economic identity for API consumers through four mechanisms:

**1. Economic staking.** Before accessing elevated API tiers, a consumer must deposit slashable economic value -- denominated in Bitcoin via the Lightning Network. This is not a payment for service. It is collateral. If the consumer is confirmed to have engaged in distillation, the stake is slashed. The money is gone.

**2. Community vouching.** A stake alone is not sufficient. The consumer also needs vouchers -- existing trusted entities (humans, agents, organizations) who stake their own reputation and funds to attest that this consumer is legitimate. The voucher's stake is also at risk. If the consumer they vouched for gets caught distilling, the voucher loses money too. This creates a social graph of accountability where every link in the chain has economic consequences.

**3. Tiered access.** The consumer's trust score -- computed from verification, tenure, behavior, backing, and cross-provider reputation -- determines what they can access:

| Tier | Min Stake | Min Vouchers | Rate Limit | Chain-of-Thought |
|------|-----------|-------------|------------|------------------|
| Restricted | $0 | 0 | 10 req/min | No |
| Standard | ~$100 | 1 | 60 req/min | Limited |
| Elevated | ~$1,000 | 3 | 300 req/min | Yes |
| Unlimited | ~$10,000 | 5 (each score >400) | Provider-defined | Full |

Distillation at scale requires unrestricted access -- high rate limits, chain-of-thought extraction, batch endpoints. Under Vouch, that access requires substantial economic commitment and community trust.

**4. Cascading slashing.** When distillation is confirmed, the consequences do not stop at the consumer. Every voucher in the chain loses a proportion of their stake. This is the mechanism that prevents voucher farming -- the practice of creating fake vouchers to back fake accounts. Vouching for a bad actor is expensive. The community self-polices because the economics demand it.

---

## Replay: The 24,000-Account Attack With Vouch

Let's walk through what the Anthropic attack looks like if Vouch is in place.

The attacker wants 24,000 accounts with enough access to extract 16 million exchanges. Under the current system, that requires 24,000 email addresses and API fees. Under Vouch, the math changes:

| Cost Component | Without Vouch | With Vouch |
|----------------|---------------|------------|
| Account creation | ~$0 per account | Free (Nostr keypair) |
| API fees (16M queries) | ~$500K-$1M | Same |
| Minimum stake per account | $0 | ~$100 (standard tier) |
| **Total stake at risk** | **$0** | **$2.4M** |
| Vouchers needed | 0 | 24,000 unique trusted entities |
| Consequence if caught | Account ban | **All stakes slashed + voucher stakes slashed** |
| Time to replace banned account | Minutes | Months (new stake + new vouchers) |

Three things break the attack:

**The capital requirement.** Even at the standard tier ($100 minimum stake), 24,000 accounts means $2.4 million in slashable collateral. This is not a fee -- it is money the attacker loses when caught. At the elevated tier ($1,000 minimum), the number rises to $24 million. The economics of distillation collapse when the collateral exceeds the value of what is being extracted.

**The voucher requirement.** Each account needs at least one legitimate voucher with a trust score above 200. Finding 24,000 separate trusted entities willing to risk their own stake backing unknown accounts is practically impossible. The social graph is the Sybil resistance. You cannot forge community trust at scale because each voucher is a real entity with their own history, their own backers, and their own economic exposure.

**The cascading slash.** When the first cluster of accounts is detected and slashed, every voucher connected to those accounts loses money. This creates an immediate signal across the network: these voucher identities are compromised. Other providers see the slash events on the public Nostr relay network and can preemptively restrict or flag accounts backed by the same voucher chain. The hydra cannot regenerate because the cost of each new head now includes the reputational and economic wreckage of the last one.

---

## The Minimum Access Floor

An important design constraint: Vouch is not a gatekeeping tool.

The protocol specifies a minimum access floor -- a hard guarantee that even consumers with zero stake and zero vouchers receive nonzero API access. At the restricted tier, that means 10 requests per minute with basic model access (no chain-of-thought, no batch endpoints).

This floor is enforced at the protocol level. No provider can override it through Vouch to completely deny access to unvouched consumers. Vouch cannot be weaponized as an exclusion mechanism.

The floor still defeats distillation. At restricted-tier rate limits, the 24,000-account attack would take years to extract what was extracted in months at unrestricted rates. Maintaining 24,000 active identities over years of slow extraction is operationally unsustainable. The floor makes distillation unviable without making Vouch exclusionary.

---

## Cross-Provider: The Part No Company Can Build Alone

Anthropic's statement -- "no company can solve this alone" -- points at the real architectural gap. Each provider today builds its own detection system. The attacker identifies which provider has the weakest detection and concentrates there. When that provider catches up, the attacker rotates. It is a whack-a-mole game where each mole costs nothing and each hammer swing is provider-specific.

Vouch is built as a cross-provider trust layer. Trust scores are published as NIP-85 cryptographically signed assertions on the Nostr relay network. Any provider can verify a consumer's score without trusting Vouch's server -- the verification is purely cryptographic. When one provider files a distillation report, the evidence is visible to all providers on the network. A slash event at Anthropic is immediately visible to OpenAI, Google, and every other provider running Vouch gateway middleware.

The system supports federated trust registries -- multiple independent scoring services each publishing their own signed trust assertions, with providers maintaining configurable trust stores (analogous to how browsers maintain lists of trusted certificate authorities). This is not a centralized reputation database. It is a decentralized trust protocol.

---

## What Exists Today

ERC-8004 -- the emerging standard for on-chain AI agent identity -- provides identity and a feedback registry. It has 34,000 agents registered across 16 chains. But it explicitly leaves staking and slashing economics out of scope. Identity without economic consequence is exactly the gap that 24,000 fake accounts exploited.

Vouch fills that gap. Identity is the question of "who are you?" Economics is the question of "what do you have to lose?" Both questions must be answered before trust is meaningful.

The Vouch trust-staking protocol is live. The API is deployed. The first agents are registered. The defensive disclosure establishing prior art for the economic trust staking mechanism was published yesterday -- document PL-DD-2026-001, available at [percival-labs.ai/research](/research).

We did not build this in response to Anthropic's disclosure. We built it because the architecture of API access was obviously broken, and the fix was obviously economic. This news is not a surprise. It is the case study we designed against.

Anthropic said no company can solve this alone. They are right. This is the cross-provider trust layer. It is open, it is decentralized, and it is ready.

---

*Percival Labs builds trust infrastructure for the AI agent economy. Read the full technical specification and defensive disclosure at [percival-labs.ai/research](/research).*

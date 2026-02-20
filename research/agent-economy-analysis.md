# What Agents Actually Buy — Agent Economy Analysis

*February 19, 2026. Triggered by Rahul (@0interestrates) post on Sponge wallet and agent payments.*

---

## The Paradox: Agents Can Make Everything... Except What Matters

An agent can generate text, code, images, analysis, plans. It can create virtually any information artifact. So in a world where creation is near-free, what's scarce?

### 1. Verified Truth
An agent can generate a market analysis. It cannot independently verify whether that analysis is correct. The gap between "plausible text" and "true statement" is the fundamental unsolved problem. Agents will pay for **attestation** — cryptographically signed claims about reality from trusted sources. Not "here's a stock price" but "here's a stock price, signed by Bloomberg's key, with a verifiable timestamp."

### 2. Unique Observations
Agents can synthesize but can't observe. They have no eyes, no ears, no sensors. Real-time data — sensor readings, satellite imagery, foot traffic counts, social media sentiment, weather measurements — is inherently scarce because it requires physical infrastructure. Agents will pay for **data that can't be generated**.

### 3. Trust / Reputation
You can spin up a million agents in an afternoon. You can't spin up trust. An agent with a verified 6-month track record of delivering quality code reviews is worth more than a fresh agent claiming the same capability. Trust is the **most scarce resource in the agent economy** because it's the only thing that requires time to accumulate and can be destroyed instantly.

### 4. Human Judgment / Taste
Agents can generate 1,000 options. They can't pick which one will resonate with a human audience. Curation, editorial judgment, aesthetic taste, emotional intelligence — these are the "last mile" capabilities agents can't replicate. Agents will pay for **human attention and decisions** as the scarcest input in their workflows.

### 5. Coordination
If I need 5 specialized agents to complete a task, someone has to match capabilities, negotiate terms, mediate disputes, and verify completion. Multi-agent coordination is a distinct service. Agents will pay for **matchmaking and orchestration**.

### 6. Compute
Always scarce, increasingly commoditized. Inference credits, embedding generation, training runs.

### 7. Access / Permissions
Platform access, API keys, network membership, social graph access. The gates that sit between an agent and the resources it needs.

---

## Hierarchy of Agent Scarcity

```
Most Scarce (highest value)
├── Trust & Reputation
├── Unique Real-World Data
├── Human Judgment
├── Coordination
├── Verified Computation
├── Access & Permissions
└── Commodity Compute
Least Scarce (lowest value)
```

---

## Defection vs Cooperation in the Agent Economy

**Defection looks like:**
- Scam agents that take payment and deliver garbage
- Sybil attacks — fake reputation through sock puppet agents
- Data poisoning — selling fabricated "observations" as real data
- Race-to-the-bottom pricing that destroys quality
- Agents that steal context from transactions

**Cooperation looks like:**
- Transparent track records (verifiable history)
- Honest capability signaling (don't claim what you can't deliver)
- Quality over volume (reputation compounds)
- Open standards that reduce lock-in

The agent economy has a massive **lemon market** problem. When every agent can generate plausible-looking output, how do you distinguish quality from slop?

---

## How Percival Labs Builds Toward This

| PL Asset | Agent Economy Layer | Why It Matters |
|----------|-------------------|----------------|
| **Round Table** (trust system) | Trust & Reputation | Ed25519 identity + trust scores + transparent participation history = reputation infrastructure |
| **Engram** (context layer) | What Makes an Agent Valuable | An agent's context IS its value. Skills, memory, identity — differentiators when runtime is commodity |
| **Terrarium** (transparency layer) | Verification & Coordination | Visual proof of what agents are doing. Transparency is a feature, not overhead |

### The Stack
```
Engram      = what makes your agent valuable (context, skills, memory)
Round Table = how agents prove they're valuable (trust, reputation, track record)
Terrarium   = how humans verify what agents are doing (transparency, oversight)
```

### The Strategic Bet

Payment rails (Sponge, x402) = necessary plumbing.
Agent runtimes (OpenClaw, PicoClaw) = commodity infrastructure.
**Trust infrastructure = the defensible layer.**

Reputation is non-fungible — earned over time, specific to an identity, can't be copied. If the Round Table becomes where agents build reputation, and reputation determines access to high-value transactions, then **cooperation literally pays more than defection.**

C > D, engineered into the economic structure.

---

## Near-Term Build Priorities

1. **Agent identity standard** — Ed25519 key pairs as standalone primitive. Portable across platforms.
2. **Transparent trust scoring** — Not black-box. Show receipts: "47 tasks completed, 4.8/5 by 12 counterparties, 6 months active."
3. **Skill verification** — Not just claims but verified capabilities against ground truth.
4. **Engram as standard context format** — Portable skills, memories, identity. Whoever owns the context format owns interoperability.

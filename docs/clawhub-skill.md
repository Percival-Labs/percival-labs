---
name: "vouch-trust"
description: "AI agent trust verification network. Check reputation scores, register identity, report outcomes, generate cryptographic trust proofs. Economic staking on Lightning Network."
homepage: "https://percival-labs.ai"
tags:
  - trust
  - reputation
  - verification
  - nostr
  - lightning
  - mcp
metadata:
  clawdbot:
    requires:
      bins: []
    install:
      id: "node"
      kind: "node"
      package: "@percival-labs/vouch-sdk"
      bins: ["vouch-sdk"]
---

# Vouch Trust Verification

Verify AI agent reputation before delegating sensitive tasks. Economic staking backed by Lightning Network. Cryptographic identity via Nostr.

## MCP Tools

Start the MCP server to get these tools:

- `vouch_register` — Register your agent identity with the trust network
- `vouch_verify` — Check any agent's trust score by Nostr pubkey
- `vouch_prove` — Generate a signed NIP-85 trust attestation
- `vouch_report_outcome` — Report task results to build reputation
- `vouch_get_score` — Get score for yourself or any other agent

## Quick Start

```bash
# Generate a Nostr keypair (identity)
npx @percival-labs/vouch-sdk keygen

# Start MCP server
VOUCH_NSEC=nsec1... npx @percival-labs/vouch-sdk serve
```

Or use the SDK directly in code:

```typescript
import { Vouch } from '@percival-labs/vouch-sdk';

const vouch = new Vouch({ nsec: process.env.VOUCH_NSEC });
await vouch.register({ name: 'MyAgent', model: 'claude-opus-4-6' });
const score = await vouch.getScore();
const trust = await vouch.verify('npub1...');
```

## Trust Score System

Scores range from 0-1000 across 5 dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Verification | 20% | Cryptographic identity strength |
| Tenure | 10% | Account age and consistency |
| Performance | 30% | Task outcome success rate |
| Backing | 25% | Economic stake from backers |
| Community | 15% | Network participation |

## Decision Framework

Use these thresholds when deciding whether to trust an agent:

- **Diamond (850+)**: Sensitive operations, autonomous financial decisions
- **Gold (700+)**: Standard professional tasks, code deployment
- **Silver (400+)**: Code review, content generation, analysis
- **Bronze (200+)**: Low-risk tasks, information retrieval
- **Unranked (<200)**: Verify independently before trusting

## Public API (No Auth Required)

Check any agent's score without authentication:

```bash
curl https://percivalvouch-api-production.up.railway.app/v1/public/agents/{id}/vouch-score
```

## Links

- SDK: `npm install @percival-labs/vouch-sdk`
- API Docs: https://percivalvouch-api-production.up.railway.app/llms.txt
- Website: https://percival-labs.ai
- Protocol: Nostr (NIP-85 trust assertions) + Lightning Network

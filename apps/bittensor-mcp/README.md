# Bittensor MCP Server

The first MCP server for Bittensor. Exposes metagraph data, trust attestations, weight-copying detection, and validator integration as MCP tools.

## What This Does

This server demonstrates **MCP-T as an open protocol standard** for trust in decentralized compute networks. It produces trust attestations conforming to MCP-T v0.2.0 using on-chain data from Bittensor's metagraph.

**Key design principles:**
- **Protocol, not platform** — MCP-T is an open standard (CC-BY-4.0). Anyone can implement their own trust provider.
- **Advisory, not exclusionary** — Trust attestations are quality signals for validators. No miner is excluded from the network.
- **Opt-in** — Each validator independently decides whether to use trust signals and how to weight them.
- **Fail-open** — If the trust service is unavailable, validators fall back to raw scores.

## Tools

| Tool | Description |
|------|-------------|
| `bittensor_subnet_info` | Subnet metadata (neurons, emissions, tempo) |
| `bittensor_metagraph` | Full metagraph with stake, trust, consensus, incentive data |
| `bittensor_detect_weight_copying` | Analyze validator weights for free-riding behavior |
| `bittensor_trust_attestation` | MCP-T v0.2.0 attestation for any neuron |
| `bittensor_simulate_trust_blend` | Simulate trust-adjusted weight-setting |
| `bittensor_validator_integration_guide` | Python code for validator forward() integration |

## Usage

### MCP Server (stdio)

```bash
bun run src/index.ts
```

### HTTP Server (for validator integration)

```bash
bun run src/index.ts --http 3800
```

### Query trust attestation

```bash
curl -X POST http://localhost:3800 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "trust/query",
    "params": {"hotkey": "5F...", "netuid": 39}
  }'
```

## Weight-Copying Detection

The `bittensor_detect_weight_copying` tool analyzes validator weight matrices to identify free-riders:

1. **Cosine similarity** between validator weight vectors (>0.95 = suspected copy)
2. **Entropy analysis** (honest validators have diverse, independent weight distributions)
3. **Stake-based attribution** (lower-stake validator in a similar pair is more likely the copier)

Each suspected copier gets an MCP-T attestation with low `behavioral_consistency` scores.

## Validator Integration

The trust blend integrates between `get_rewards()` and `set_weights()` in a validator's `forward()` method:

```
Miner does work
  → Validator scores work (existing)
  → [NEW] Query MCP-T trust attestation
  → Blend: (1-weight) * raw_score + weight * trust_signal
  → set_weights() on-chain
  → Yuma Consensus
  → Emissions
```

Use `bittensor_validator_integration_guide` to generate a ready-to-use Python snippet.

## Architecture

```
MCP-T v0.2.0 (Open Protocol — CC-BY-4.0)
├── Trust attestation format
├── JSON-RPC query interface
├── 10 trust dimensions
└── Transport bindings

This Server (Reference Implementation)
├── Metagraph queries via TaoStats API
├── Weight-copying detection via cosine similarity
├── Trust attestations from on-chain data
└── Validator integration patterns

Vouch (Optional — Separate Commercial Utility)
├── Economic staking mechanism
├── Community-backed reputation
└── NOT required to use this server
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `TAOSTATS_API_KEY` | No | TaoStats API key for full API access |
| `BITTENSOR_RPC_URL` | No | Custom Bittensor RPC endpoint |

## License

MIT

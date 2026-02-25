# @percival-labs/openclaw-vouch

Trust verification plugin for OpenClaw agents via the Vouch network. Gates tool execution based on an agent's reputation score -- agents must earn trust through real interactions before executing sensitive tools like shell commands, HTTP requests, or file writes.

## Installation

```bash
openclaw plugins install @percival-labs/openclaw-vouch
```

Or add to your OpenClaw configuration:

```json
{
  "plugins": ["@percival-labs/openclaw-vouch"]
}
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VOUCH_NSEC` | No | Nostr private key (bech32). Auto-generates ephemeral key if omitted. |
| `VOUCH_API_URL` | No | Vouch API base URL. Defaults to production. |

### Plugin Config

Pass configuration when activating the plugin:

```typescript
import activate from '@percival-labs/openclaw-vouch';

activate(api, {
  // Minimum score for any tool execution (0-1000)
  minScore: 200,

  // Tool-specific thresholds
  trustedTools: {
    'shell': 700,      // Shell commands need gold-tier trust
    'http': 500,       // HTTP requests need silver-tier
    'write': 400,      // File writes need silver-tier
  },

  // Tools that bypass trust checks entirely
  allowlistedTools: ['read', 'list', 'search'],

  // Auto-register with Vouch on activation
  autoRegister: true,
  agentName: 'my-agent',

  // Log tool executions as Vouch outcomes
  logOutcomes: true,

  // Score cache TTL (default: 60 seconds)
  cacheTtlMs: 60_000,
});
```

## How Trust Gating Works

The plugin registers three OpenClaw lifecycle hooks:

### 1. preToolExecution -- Trust Gate

Before any tool runs, the plugin checks the agent's Vouch score:

```
Agent wants to run "shell" (requires score >= 700)
  -> Agent score: 450 (silver tier)
  -> BLOCKED: Tool "shell" requires score >=700, agent has 450
```

Allowlisted tools skip the score check entirely:

```
Agent wants to run "read" (allowlisted)
  -> ALLOWED (no score check needed)
```

If the Vouch API is unreachable, the plugin **fails open** -- tools still execute. This prevents the trust layer from becoming a single point of failure.

### 2. postToolExecution -- Outcome Logging (opt-in)

When `logOutcomes: true`, significant tool executions (shell, write, edit, http, email, message) are reported to Vouch as outcomes. This builds the agent's performance history over time.

### 3. onError -- Error Tracking

Tool execution errors are logged for observability.

## Trust Tiers

| Tier | Score Range | What It Means |
|------|-------------|---------------|
| Diamond | 850-1000 | Highly trusted, extensive track record |
| Gold | 700-849 | Well-established, consistent performance |
| Silver | 400-699 | Building reputation, positive trend |
| Bronze | 200-399 | New but verified |
| Unranked | 0-199 | Not yet established |

## Programmatic Usage

You can also use the components directly without the OpenClaw plugin system:

```typescript
import { VouchPluginClient, shouldAllowTool } from '@percival-labs/openclaw-vouch';

// Create a client
const client = new VouchPluginClient({
  nsec: process.env.VOUCH_NSEC,
});

// Check a score
const score = await client.getScore();
console.log(`Score: ${score.score}, Tier: ${score.tier}`);

// Evaluate policy
const decision = shouldAllowTool('shell', score.score, {
  trustedTools: { 'shell': 700 },
});
console.log(decision); // { allowed: false, reason: '...' }
```

## API Reference

- Vouch API: https://percivalvouch-api-production.up.railway.app
- Documentation: https://percival-labs.ai/research
- Vouch SDK: `@percival-labs/vouch-sdk`

## License

Proprietary -- Percival Labs LLC

# OpenClaw + Engram + Vouch — Integration Guide

*For Ian and anyone connecting the full Percival Labs stack to OpenClaw.*

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    YOUR OPENCLAW                      │
│                                                      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │ Engram     │  │ Vouch       │  │ Your Custom  │ │
│  │ Skills     │  │ Plugin      │  │ Skills       │ │
│  │ (SKILL.md) │  │ (trust gate)│  │              │ │
│  └─────┬──────┘  └──────┬──────┘  └──────────────┘ │
│        │                │                            │
│        └────────┬───────┘                            │
│                 ↓                                    │
│         OpenClaw Gateway                             │
│         (routes, sessions, tools, memory)            │
│                 ↓                                    │
│         LLM Provider (Claude, GPT, Kimi, local)     │
└──────────────────────────────────────────────────────┘
         ↕                    ↕
   Vouch API (Railway)   Channels (WhatsApp,
   Trust scores,         Discord, Slack, etc.)
   Outcomes, Proofs
```

**Three layers, one agent:**
- **Engram** = the brain (skills, context, personality)
- **Vouch** = the reputation (trust scoring, outcome tracking)
- **OpenClaw** = the body (runtime, channels, tools, memory)

---

## Step 1: Install OpenClaw

```bash
# Install OpenClaw globally
npm install -g openclaw@latest

# Run the onboarding wizard
openclaw onboard
```

Follow the wizard to configure your gateway, workspace, and channels.

---

## Step 2: Export Engram Skills to OpenClaw Format

```bash
# From the Engram framework directory
cd ~/Desktop/PAI/Projects/PAIFramework

# Export all bundled skills
engram export --format openclaw --output ./openclaw-skills

# Include user-installed skills from ~/.claude/skills too
engram export --format openclaw --output ./openclaw-skills --include-user-skills
```

This creates:
```
openclaw-skills/
├── skills/
│   ├── Research/
│   │   └── SKILL.md      ← OpenClaw-formatted
│   ├── DoWork/
│   │   └── SKILL.md
│   └── ...
└── manifest.json          ← Index of all exported skills
```

### Install exported skills into OpenClaw

Copy the exported skills to your OpenClaw workspace:

```bash
# Find your workspace path
WORKSPACE=$(openclaw config get workspace.path)

# Copy skills
cp -r ./openclaw-skills/skills/* "$WORKSPACE/skills/"
```

Or install individually:
```bash
cp -r ./openclaw-skills/skills/Research "$WORKSPACE/skills/"
```

---

## Step 3: Install the Vouch Plugin

### Option A: From npm (when published)

```bash
openclaw plugins install @percival-labs/openclaw-vouch
```

### Option B: From local monorepo (development)

```bash
# Link the package
cd ~/Desktop/PAI/Projects/PercivalLabs/packages/openclaw-vouch
npm link

# Install in OpenClaw
openclaw plugins install @percival-labs/openclaw-vouch --local
```

### Configure Vouch

Set your agent's Nostr identity:

```bash
# Generate a new keypair (one-time)
npx @percival-labs/vouch-sdk keygen

# Output:
# nsec: nsec1abc...  (PRIVATE — keep secret)
# npub: npub1xyz...  (PUBLIC — share freely)

# Set the environment variable
export VOUCH_NSEC="nsec1abc..."
```

Add to your OpenClaw config or `.env`:

```env
# Required
VOUCH_NSEC=nsec1your-private-key-here

# Optional (defaults shown)
VOUCH_API_URL=https://percivalvouch-api-production.up.railway.app
```

### Plugin Configuration

In your OpenClaw workspace config, add plugin settings:

```json
{
  "plugins": {
    "@percival-labs/openclaw-vouch": {
      "autoRegister": true,
      "agentName": "Ian's Agent",
      "minScore": 0,
      "logOutcomes": true,
      "trustedTools": {
        "shell": 400,
        "email_send": 700,
        "http_post": 200
      },
      "allowlistedTools": [
        "read_file",
        "search",
        "web_browse"
      ]
    }
  }
}
```

**Configuration reference:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoRegister` | boolean | false | Auto-register with Vouch on first use |
| `agentName` | string | "openclaw-agent" | Name for auto-registration |
| `minScore` | number | 0 | Global minimum trust score for any tool |
| `trustedTools` | object | {} | Tool-specific score thresholds |
| `allowlistedTools` | string[] | [] | Tools that skip trust checks entirely |
| `logOutcomes` | boolean | false | Log tool executions to Vouch |
| `cacheTtlMs` | number | 60000 | Score cache duration (ms) |

---

## Step 4: Using Engram as the Harness

When using Engram skills inside OpenClaw, the skill instructions become part of OpenClaw's context kernel. The agent loads them just-in-time when relevant.

### Custom SOUL.md with Engram Personality

You can export your Engram personality config as OpenClaw's SOUL.md:

```bash
# Generate Engram bundle (includes INSTRUCTIONS.md with personality)
engram bundle --for "Ian" --output ./my-bundle

# The INSTRUCTIONS.md contains personality calibration
# Copy relevant sections to your OpenClaw SOUL.md
```

### Skill Priority

OpenClaw loads skills in this order:
1. **Workspace skills** (your Engram exports) — highest priority
2. **Managed skills** (from ClawHub)
3. **Bundled skills** (OpenClaw defaults) — lowest priority

Your Engram skills override defaults automatically.

---

## Step 5: Verify the Stack

### Check Vouch is active

```bash
# Your agent should appear in logs on startup:
# [vouch] Vouch plugin activated (npub1xyz...)
# [vouch] Registered as: npub1xyz... (score: 0)
```

### Test trust gating

```bash
# In an OpenClaw session, try a gated tool:
# If your score is below the threshold, you'll see:
# [vouch] BLOCKED: shell — Tool "shell" requires score ≥400, agent has 0
```

### Check your score

The agent can check its own score anytime:
```
> What's my Vouch trust score?
```

### Verify another agent

```
> Check the Vouch score for npub1x8glnkcq80d55sxuqk0dnplwvvx4m7r43gam3ncs23847w7uzczqt5t96a
```

---

## Agent Discovery: How Your Agent Finds Vouch

Even without the plugin installed, any OpenClaw agent can discover Vouch through:

1. **llms.txt** — `https://percivalvouch-api-production.up.railway.app/llms.txt`
2. **agents.json** — `https://percivalvouch-api-production.up.railway.app/.well-known/agents.json`
3. **API headers** — Every Vouch API response includes:
   - `X-Vouch-API-Version: 0.2.1`
   - `X-Vouch-LLMs-Txt: https://percivalvouch-api-production.up.railway.app/llms.txt`
4. **ClawHub** — Search for "vouch-trust" skill

An agent browsing the web can discover Vouch, read the llms.txt, understand the value, and integrate — all without human intervention.

---

## Troubleshooting

### "VOUCH_NSEC not set"
The plugin generates an ephemeral identity if no key is provided. This works but you'll lose your score history on restart. Set `VOUCH_NSEC` for persistence.

### "Registration failed: 409 Conflict"
Your agent is already registered. This is fine — the plugin handles 409s gracefully.

### "Score check failed" in logs
The Vouch API might be temporarily unreachable. The plugin fails open — tools still execute. Scores are cached for 60 seconds.

### Skills not loading
Verify skills are in the correct workspace path:
```bash
ls $(openclaw config get workspace.path)/skills/
```

Each skill needs a `SKILL.md` file in its directory.

---

## Full Stack Summary

| Component | What It Does | Install |
|-----------|-------------|---------|
| **Engram** | Author skills + context | `npm i -g engram-harness` |
| **engram export** | Convert to OpenClaw format | `engram export --format openclaw` |
| **OpenClaw** | Run the agent | `npm i -g openclaw` |
| **Vouch Plugin** | Trust verification | `openclaw plugins install @percival-labs/openclaw-vouch` |
| **Vouch SDK** | Direct API access | `npm i @percival-labs/vouch-sdk` |

**The flow:** Engram authors → OpenClaw runs → Vouch verifies.

---

*Built by Percival Labs — [percival-labs.ai](https://percival-labs.ai)*
*Questions? Reach Alan or Ian.*

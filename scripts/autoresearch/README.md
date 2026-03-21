# Autoresearch Loop Runner

Karpathy's autoresearch pattern adapted for Percival Labs domains. Reads a `program.md` loss function, iterates on config variables, evaluates against historical data, keeps winners.

## Quick Start

```bash
# From monorepo root
bun run scripts/autoresearch/runner.ts

# Dry run (no results written)
bun run scripts/autoresearch/runner.ts --dry-run

# Custom experiment count
bun run scripts/autoresearch/runner.ts --experiments 20

# Specific domain
bun run scripts/autoresearch/runner.ts --domain egg-config
```

## How It Works

1. Reads `program.md` — the loss function definition (what "good" looks like)
2. Loads the domain module (e.g., `domains/egg-config.ts`)
3. Gets the baseline config and scores it
4. For each experiment:
   - Picks a random variable and mutates it within safe bounds
   - Evaluates the mutated config against historical data
   - If score improves: promotes the mutation to new baseline
   - If score doesn't improve: discards and moves on
5. Writes results to `~/.claude/egg/autoresearch-results/latest.json`
6. Writes human-readable summary to `results/`

## Output

- **`~/.claude/egg/autoresearch-results/latest.json`** — Machine-readable results for Egg's morning briefing
- **`results/run-YYYY-MM-DD.md`** — Human-readable run summary
- **`results/experiment-NNN.json`** — Individual experiment logs

## Adding a New Domain

Create a new file in `domains/` that exports a `Domain` interface:

```typescript
import type { Domain } from '../types.js';

const domain: Domain = {
  name: 'My Domain',

  getBaseline() {
    return { /* current config values */ };
  },

  mutate(config) {
    // Pick a variable, change it, return the mutation
    return { variable, oldValue, newValue, config: mutatedConfig };
  },

  async evaluate(config) {
    // Score the config, return a number (higher = better)
    return score;
  },
};

export default domain;
```

Then run: `bun run scripts/autoresearch/runner.ts --domain my-domain`

## Convergence

The runner stops early if 5 consecutive experiments show less than 1% improvement. This prevents wasting budget on a plateaued config space.

## Overnight Schedule

The launchd plist (`com.percivallabs.autoresearch.plist`) runs at 9:30 PM PST daily. To install:

```bash
cp scripts/autoresearch/com.percivallabs.autoresearch.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.percivallabs.autoresearch.plist
```

Results appear in Egg's morning briefing at 6 AM.

## Architecture

```
program.md          — Loss function (human-written criteria)
runner.ts           — Main loop (domain-agnostic)
types.ts            — Shared type definitions
domains/
  egg-config.ts     — Domain 0: Egg daemon config optimization
  sentry-config.ts  — Domain 1: Sentry agent config
  scout-config.ts   — Domain 2: Scout agent config
  scribe-config.ts  — Domain 3: Scribe agent config
  skill-library.ts  — Domain 4: Skill matching/routing optimization
  gateway-token-efficiency.ts — RETIRED (converged Mar 20)
run.sh              — Shell wrapper for launchd
com.percivallabs.autoresearch.plist — launchd schedule (NOT installed)
results/            — Experiment logs and summaries
```

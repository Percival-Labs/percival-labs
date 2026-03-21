#!/bin/bash
# Autoresearch multi-domain runner — designed for launchd
# Sets PATH, sources .env, runs all domains sequentially via bun
#
# Schedule: 9:30 PM PST daily. Each domain gets 10 experiments.
# Domains rotate: egg-config → sentry-config → scout-config → scribe-config → skill-library
# Total: ~50 experiments per night. Runner exits when done.

set -euo pipefail

# Ensure PATH includes bun + homebrew + system
export PATH="$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# Move to monorepo root
MONOREPO="$HOME/Desktop/PAI/Projects/PercivalLabs"
cd "$MONOREPO"

# Source environment
if [ -f "$MONOREPO/.env" ]; then
  set -a
  source "$MONOREPO/.env"
  set +a
fi

# Ensure output directories exist
mkdir -p "$HOME/.claude/egg/autoresearch-results"
mkdir -p "$MONOREPO/scripts/autoresearch/results"

DOMAINS=("egg-config" "sentry-config" "scout-config" "scribe-config" "skill-library")
EXPERIMENTS_PER_DOMAIN=10

echo "[autoresearch] Starting multi-domain run at $(date)"
echo "[autoresearch] Domains: ${DOMAINS[*]}"
echo "[autoresearch] Experiments per domain: $EXPERIMENTS_PER_DOMAIN"

for domain in "${DOMAINS[@]}"; do
  echo ""
  echo "[autoresearch] === Domain: $domain ==="
  # Run each domain; continue to next on failure
  bun run scripts/autoresearch/runner.ts \
    --domain "$domain" \
    --experiments "$EXPERIMENTS_PER_DOMAIN" \
    || echo "[autoresearch] Domain $domain failed — continuing"
done

echo ""
echo "[autoresearch] Multi-domain run complete at $(date)"

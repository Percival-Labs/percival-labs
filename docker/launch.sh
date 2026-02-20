#!/bin/bash
# Percival Labs — Morning Launch Script
# Run this before heading to work. It:
# 1. Verifies Ollama is running with required models
# 2. Starts the Docker stack
# 3. Waits for services to be healthy
# 4. Prints the task paste instructions

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMPOSE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    PERCIVAL LABS — MORNING LAUNCH            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check Ollama
echo -e "${YELLOW}[1/4]${NC} Checking Ollama..."
if ! command -v ollama &> /dev/null; then
  echo -e "${RED}  Ollama not found. Install from https://ollama.com${NC}"
  exit 1
fi

if ! ollama list &> /dev/null; then
  echo -e "${RED}  Ollama not running. Start it first: ollama serve${NC}"
  exit 1
fi

REQUIRED_MODELS=("qwen2.5-coder:32b" "qwen3:30b-a3b")
for model in "${REQUIRED_MODELS[@]}"; do
  if ollama list | grep -q "$model"; then
    echo -e "  ${GREEN}✓${NC} $model"
  else
    echo -e "  ${RED}✗${NC} $model — pulling..."
    ollama pull "$model"
  fi
done

# Step 2: Start Docker stack
echo ""
echo -e "${YELLOW}[2/4]${NC} Starting Docker stack..."
cd "$COMPOSE_DIR"
docker compose up -d

# Step 3: Wait for health
echo ""
echo -e "${YELLOW}[3/4]${NC} Waiting for services..."

wait_for_health() {
  local service=$1
  local url=$2
  local max_wait=60
  local waited=0
  while [ $waited -lt $max_wait ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} $service"
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done
  echo -e "  ${RED}✗${NC} $service (timeout after ${max_wait}s)"
  return 1
}

wait_for_health "registry"  "http://localhost:3100/health"
wait_for_health "agents"    "http://localhost:3200/health"
wait_for_health "website"   "http://localhost:3400"
wait_for_health "terrarium" "http://localhost:3500/status"

# Step 4: Instructions
echo ""
echo -e "${YELLOW}[4/4]${NC} Stack is up!"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Open Discord → #tasks channel"
echo "  2. Paste tasks from: docker/morning-tasks.md"
echo "     (9 tasks — paste each block as a separate message)"
echo "  3. Go to #proposals and approve each plan"
echo "  4. Type: !start  (in any ops channel to enable auto-tick)"
echo "  5. Go to work. Check #results on your phone."
echo ""
echo -e "${CYAN}Evening review:${NC}"
echo "  Open Claude Code and ask Percy to review #results with you."
echo "  Percy will verify quality and help you apply the good outputs."
echo ""
echo -e "${GREEN}Budget: ~\$1-2 estimated for all 9 tasks (\$5/day limit)${NC}"
echo ""

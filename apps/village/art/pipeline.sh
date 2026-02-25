#!/bin/bash
# pipeline.sh — One-command art pipeline runner.
#
# Usage: ./art/pipeline.sh [--no-ipadapter]
#
# Runs the full pipeline:
#   1. Generate all assets via ComfyUI (tiles, buildings, decorations)
#   2. Post-process (diamond mask tiles, chroma-key sprites)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🎨 Agent Village — Full Art Pipeline"
echo "   Project: $PROJECT_DIR"
echo ""

# Step 1: Generate all assets
echo "═══ STEP 1: GENERATION ═══"
bun "$SCRIPT_DIR/generate-all.ts" "$@"

# Step 2: Post-process
echo ""
echo "═══ STEP 2: POST-PROCESSING ═══"
python3 "$SCRIPT_DIR/scripts/process-all.py"

echo ""
echo "✅ Pipeline complete! Run 'bun run dev:client' to see results."

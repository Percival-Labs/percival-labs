#!/usr/bin/env bun
/**
 * generate-all.ts — Master orchestration for all Village art asset generation.
 *
 * 1. Copies golden reference to ComfyUI input
 * 2. Queues all assets sequentially (tiles → buildings → decorations)
 * 3. Polls /history/{prompt_id} for completion
 *
 * Usage: bun art/generate-all.ts [--no-ipadapter] [--tiles-only] [--buildings-only] [--decorations-only]
 */

import { $ } from 'bun';
import { existsSync, cpSync } from 'fs';
import { join } from 'path';

const PROJECT_DIR = import.meta.dir + '/..';
const COMFYUI_INPUT = join(process.env.HOME || '~', 'ComfyUI', 'input');
const GOLDEN_REF = join(PROJECT_DIR, 'art', 'golden-reference.png');

const flags = new Set(process.argv.slice(2));
const runTiles = !flags.has('--buildings-only') && !flags.has('--decorations-only');
const runBuildings = !flags.has('--tiles-only') && !flags.has('--decorations-only');
const runDecorations = !flags.has('--tiles-only') && !flags.has('--buildings-only');

async function main() {
  console.log('🎨 Agent Village — Full Art Pipeline\n');

  // Step 1: Copy golden reference to ComfyUI input
  const refDest = join(COMFYUI_INPUT, 'golden-reference.png');
  if (!existsSync(refDest)) {
    console.log('📋 Copying golden reference to ComfyUI input...');
    cpSync(GOLDEN_REF, refDest);
    console.log('   ✅ Done\n');
  } else {
    console.log('📋 Golden reference already in ComfyUI input\n');
  }

  // Step 2: Check ComfyUI is running
  try {
    const resp = await fetch('http://127.0.0.1:8188/system_stats');
    if (!resp.ok) throw new Error('Not OK');
    console.log('🟢 ComfyUI is running\n');
  } catch {
    console.error('❌ ComfyUI is not running at http://127.0.0.1:8188');
    console.error('   Start ComfyUI first, then re-run this script.');
    process.exit(1);
  }

  // Forward --no-ipadapter flag
  const extraArgs = flags.has('--no-ipadapter') ? ['--no-ipadapter'] : [];

  // Step 3: Generate tiles
  if (runTiles) {
    console.log('═══ TILES ═══\n');
    const result = await $`bun ${join(PROJECT_DIR, 'art', 'generate-tiles.ts')} ${extraArgs}`.nothrow();
    if (result.exitCode !== 0) {
      console.error('❌ Tile generation failed');
    }
    console.log('');
  }

  // Step 4: Generate buildings
  if (runBuildings) {
    console.log('═══ BUILDINGS ═══\n');
    const result = await $`bun ${join(PROJECT_DIR, 'art', 'generate-buildings.ts')} ${extraArgs}`.nothrow();
    if (result.exitCode !== 0) {
      console.error('❌ Building generation failed');
    }
    console.log('');
  }

  // Step 5: Generate decorations
  if (runDecorations) {
    console.log('═══ DECORATIONS ═══\n');
    const result = await $`bun ${join(PROJECT_DIR, 'art', 'generate-decorations.ts')} ${extraArgs}`.nothrow();
    if (result.exitCode !== 0) {
      console.error('❌ Decoration generation failed');
    }
    console.log('');
  }

  console.log('═══ GENERATION COMPLETE ═══');
  console.log('Now run: python3 art/scripts/process-all.py');
}

main().catch(console.error);

/**
 * BootScene.ts — Loads real PNG assets if available, generates procedural
 * textures as fallback, then starts VillageScene.
 */

import Phaser from 'phaser';
import { generateTileTextures } from '../sprites/TileGenerator';
import { generateAgentTexture } from '../sprites/AgentSprite';
import { AGENTS } from '../../game/agents';
import {
  BUILDING_CONFIG,
  DECORATION_KEYS,
  TILE_VARIANTS,
  ZONE_IDS,
} from '../config';

export class BootScene extends Phaser.Scene {
  private realTilesAvailable = false;

  constructor() {
    super({ key: 'BootScene' });
  }

  /**
   * Preload real PNG assets from public/.
   * If files are missing, Phaser will fire a FILE_LOAD_ERROR —
   * we catch those and fall back to procedural in create().
   */
  preload(): void {
    // Track which real assets loaded successfully
    const loadedKeys = new Set<string>();

    this.load.on('filecomplete', (key: string) => {
      loadedKeys.add(key);
    });

    // --- Tiles ---
    // Real tiles are individual PNGs: tiles/{zone}-{variant}.png
    for (const zone of ZONE_IDS) {
      for (let v = 0; v < TILE_VARIANTS; v++) {
        const key = `real-tile-${zone}-${v}`;
        this.load.image(key, `tiles/${zone}-${v}.png`);
      }
    }

    // --- Buildings ---
    for (const buildingId of Object.keys(BUILDING_CONFIG)) {
      const key = `building-${buildingId}`;
      this.load.image(key, `sprites/building-${buildingId}.png`);
    }

    // --- Decorations ---
    for (const decoId of DECORATION_KEYS) {
      this.load.image(decoId, `sprites/${decoId}.png`);
    }

    // Don't fail on missing assets — we fall back to procedural
    this.load.on('loaderror', (file: { key: string }) => {
      // Silently ignore — procedural fallback will handle it
      void file;
    });

    // After all loads resolve, record which tiles loaded
    this.load.once('complete', () => {
      // Check if at least one real tile loaded
      this.realTilesAvailable = loadedKeys.has('real-tile-sanctum-0');
    });
  }

  create(): void {
    // Always generate procedural tile textures as fallback
    generateTileTextures(this);

    // If real tiles loaded, create spritesheet-style textures from individual PNGs
    // so VillageScene can use them with the same frame-based API
    if (this.realTilesAvailable) {
      this.buildRealTileTextures();
    }

    // Generate agent textures (always procedural for now)
    for (const agent of AGENTS) {
      generateAgentTexture(this, agent);
    }

    // Start the main scene
    this.scene.start('VillageScene', { realTiles: this.realTilesAvailable });
  }

  /**
   * Build composite tile textures from individual PNGs so VillageScene
   * can use the same frame-based lookup it uses for procedural tiles.
   *
   * Creates texture key `rtile-{zone}` with frames 0-3 for each zone.
   */
  private buildRealTileTextures(): void {
    for (const zone of ZONE_IDS) {
      const firstKey = `real-tile-${zone}-0`;
      if (!this.textures.exists(firstKey)) continue;

      // Get dimensions from first variant
      const firstTex = this.textures.get(firstKey);
      const frame = firstTex.get();
      const tw = frame.width;
      const th = frame.height;

      // Create a canvas strip with all variants side-by-side
      const canvas = document.createElement('canvas');
      canvas.width = tw * TILE_VARIANTS;
      canvas.height = th;
      const ctx = canvas.getContext('2d')!;

      for (let v = 0; v < TILE_VARIANTS; v++) {
        const key = `real-tile-${zone}-${v}`;
        if (!this.textures.exists(key)) continue;
        const img = this.textures.get(key).getSourceImage() as HTMLImageElement;
        ctx.drawImage(img, v * tw, 0, tw, th);
      }

      const tex = this.textures.addCanvas(`rtile-${zone}`, canvas)!;
      for (let v = 0; v < TILE_VARIANTS; v++) {
        tex.add(v, 0, v * tw, 0, tw, th);
      }
    }
  }
}

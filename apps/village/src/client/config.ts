import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { VillageScene } from './scenes/VillageScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#16161e',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, VillageScene],
};

/**
 * Building sprite configuration — origin and scale tuned per building.
 * originX/originY: anchor point (0.5 = center).
 * scale: display scale (1.0 = natural 256px-wide sprite).
 */
export interface BuildingSpriteConfig {
  originX: number;
  originY: number;
  scale: number;
}

export const BUILDING_CONFIG: Record<string, BuildingSpriteConfig> = {
  sanctum:      { originX: 0.5, originY: 0.85, scale: 0.45 },
  observatory:  { originX: 0.5, originY: 0.85, scale: 0.50 },
  'town-square': { originX: 0.5, originY: 0.80, scale: 0.40 },
  workshop:     { originX: 0.5, originY: 0.85, scale: 0.45 },
  library:      { originX: 0.5, originY: 0.85, scale: 0.45 },
};

/** Decoration types for asset loading */
export const DECORATION_KEYS = [
  'tree-1', 'tree-2', 'tree-3',
  'bush-1', 'bush-2',
  'lantern',
] as const;

/** How many tile variants exist per zone */
export const TILE_VARIANTS = 4;

/** Zone IDs for tile loading */
export const ZONE_IDS = [
  'sanctum', 'observatory', 'town-square', 'workshop', 'library', 'empty',
] as const;

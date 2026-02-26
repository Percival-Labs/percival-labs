/**
 * TilemapRenderer.ts — Renders the isometric tile grid from VillageState.
 */

import Phaser from 'phaser';
import { GRID_COLS, GRID_ROWS } from '../../game/zones';
import { isoToScreen } from '../core/coordinates';
import { type VillageState, getZoneAt } from '../state/VillageState';

/** Seeded PRNG for deterministic tile variation. */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderTilemap(
  scene: Phaser.Scene,
  state: VillageState,
  container: Phaser.GameObjects.Container
): Phaser.GameObjects.Image[] {
  const rng = mulberry32(42);
  const sprites: Phaser.GameObjects.Image[] = [];
  const viewWidth = scene.cameras.main.width;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const { x, y } = isoToScreen(col, row, viewWidth);
      const zoneId = getZoneAt(state, col, row) ?? 'empty';
      const variant = Math.floor(rng() * 4);

      const realKey = `rtile-${zoneId}`;
      const procKey = `tile-${zoneId}`;
      const key = scene.textures.exists(realKey) ? realKey : procKey;

      const tile = scene.add.image(x, y, key, variant);
      tile.setOrigin(0.5, 0);
      tile.setDepth(-500 + row);
      sprites.push(tile);
      container.add(tile);
    }
  }

  return sprites;
}

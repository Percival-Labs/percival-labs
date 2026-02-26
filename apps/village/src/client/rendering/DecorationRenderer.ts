/**
 * DecorationRenderer.ts — Renders decorations (trees, bushes, lanterns) from VillageState.
 *
 * Uses real PNG sprites when available, procedural graphics otherwise.
 */

import Phaser from 'phaser';
import { isoToScreen } from '../core/coordinates';
import { type VillageState } from '../state/VillageState';

/** Seeded PRNG for deterministic size variation. */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderDecorations(
  scene: Phaser.Scene,
  state: VillageState,
  container: Phaser.GameObjects.Container,
  viewWidth: number
): void {
  const rng = mulberry32(99);

  for (const deco of state.decorations) {
    const { x, y } = isoToScreen(deco.col, deco.row, viewWidth);

    if (deco.type.startsWith('tree-')) {
      const size = 0.8 + rng() * 0.4;
      drawTreeSprite(scene, container, x, y, deco.type, size, deco.row);
    } else if (deco.type.startsWith('bush-')) {
      rng(); // consume to keep deterministic
      drawBushSprite(scene, container, x, y + 4, deco.type, deco.row);
    } else if (deco.type === 'lantern') {
      rng(); // consume to keep deterministic
      drawLanternSprite(scene, container, x, y, deco.row);
    }
  }
}

function drawTreeSprite(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  sx: number,
  sy: number,
  type: string,
  size: number,
  row: number
): void {
  if (scene.textures.exists(type)) {
    const img = scene.add.image(sx, sy, type);
    img.setOrigin(0.5, 0.9);
    img.setScale(size * 0.12);
    img.setDepth(-300 + row * 0.1);
    container.add(img);
  } else {
    drawTreeProcedural(scene, container, sx, sy, size, row);
  }
}

function drawTreeProcedural(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  sx: number,
  sy: number,
  size: number,
  row: number
): void {
  const g = scene.add.graphics();
  g.setDepth(-300 + row * 0.1);
  container.add(g);

  const s = size || 1;
  g.fillStyle(0x5a3820);
  g.fillRect(sx - 2 * s, sy - 8 * s, 4 * s, 12 * s);
  const greens = [0x2a6838, 0x388448, 0x4aa060];
  greens.forEach((c, i) => {
    const r = (12 - i * 3) * s;
    const cy = sy - (12 + i * 8) * s;
    g.fillStyle(c);
    g.fillEllipse(sx, cy, r * 2, r * 1.4);
  });
  g.fillStyle(0x78dc78, 0.2);
  g.fillEllipse(sx - 3 * s, sy - 24 * s, 8 * s, 6 * s);
}

function drawBushSprite(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  sx: number,
  sy: number,
  type: string,
  row: number
): void {
  if (scene.textures.exists(type)) {
    const img = scene.add.image(sx, sy, type);
    img.setOrigin(0.5, 0.9);
    img.setScale(0.08);
    img.setDepth(-300 + row * 0.1);
    container.add(img);
  } else {
    const g = scene.add.graphics();
    g.setDepth(-300 + row * 0.1);
    container.add(g);
    g.fillStyle(0x2a5830);
    g.fillEllipse(sx, sy, 16, 10);
    g.fillStyle(0x3a7040);
    g.fillEllipse(sx - 2, sy - 1, 10, 6);
  }
}

function drawLanternSprite(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  sx: number,
  sy: number,
  row: number
): void {
  if (scene.textures.exists('lantern')) {
    const img = scene.add.image(sx, sy, 'lantern');
    img.setOrigin(0.5, 0.9);
    img.setScale(0.10);
    img.setDepth(-300 + row * 0.1);
    container.add(img);
  } else {
    const g = scene.add.graphics();
    g.setDepth(-300 + row * 0.1);
    container.add(g);
    g.fillStyle(0x555566);
    g.fillRect(sx - 1, sy - 16, 2, 18);
    g.fillStyle(0xffd080);
    g.fillCircle(sx, sy - 18, 3);
    g.fillStyle(0xffd080, 0.12);
    g.fillCircle(sx, sy - 16, 12);
  }
}

/**
 * ShadowRenderer.ts — Utility for drawing ground shadows.
 */

import Phaser from 'phaser';

/** Draw a semi-transparent dark ellipse as a ground shadow. */
export function drawShadow(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  alpha = 0.2
): void {
  graphics.fillStyle(0x000000, alpha);
  graphics.fillEllipse(x, y, radiusX, radiusY);
}

/** Create a standalone shadow graphic for an entity. */
export function createShadowGraphic(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  depth: number,
  alpha = 0.2
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setDepth(depth);
  drawShadow(g, x, y, radiusX, radiusY, alpha);
  return g;
}

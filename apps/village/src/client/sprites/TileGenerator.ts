/**
 * TileGenerator.ts — Procedural isometric tile textures.
 *
 * Generates diamond-shaped tile textures for each zone type + empty ground.
 * Uses Phaser's generateTexture() to create textures at boot time.
 */

import Phaser from 'phaser';
import { ZONES } from '../../game/zones';

const TILE_W = 64;
const TILE_H = 32;

/** Seeded PRNG for deterministic tile variation */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

/** Draw an isometric diamond path on a canvas context */
function drawIsoDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.closePath();
}

/**
 * Generate all tile textures and add to the Phaser texture manager.
 *
 * Creates one texture per zone + one "empty" texture. Each texture
 * has multiple tile variations baked into a spritesheet-style strip.
 */
export function generateTileTextures(scene: Phaser.Scene): void {
  const rng = mulberry32(42);
  const VARIANTS = 4; // tiles per zone for variation

  // Generate zone tile textures
  for (const zone of ZONES) {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_W * VARIANTS;
    canvas.height = TILE_H + 2; // +2 for anti-alias bleed
    const ctx = canvas.getContext('2d')!;

    const base = hexToRgb(zone.color);

    for (let v = 0; v < VARIANTS; v++) {
      const ox = v * TILE_W + TILE_W / 2;
      const oy = 0;
      const vary = (rng() - 0.5) * 30;
      const r = Math.max(0, Math.min(255, Math.floor(base.r * 0.35 + vary)));
      const g = Math.max(0, Math.min(255, Math.floor(base.g * 0.35 + vary)));
      const b = Math.max(0, Math.min(255, Math.floor(base.b * 0.35 + vary)));

      // Diamond fill
      drawIsoDiamond(ctx, ox, oy, TILE_W, TILE_H);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fill();

      // Subtle grid line
      ctx.strokeStyle = `rgba(${r + 15},${g + 15},${b + 15},0.3)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Zone-specific detail dots
      if (zone.id === 'sanctum') {
        for (let i = 0; i < 3; i++) {
          const dx = (rng() - 0.5) * 24;
          const dy = rng() * 10 + 4;
          const dr = (80 + (rng() * 40)) | 0;
          const dg = (180 + (rng() * 40)) | 0;
          const db = (140 + (rng() * 30)) | 0;
          ctx.fillStyle = `rgba(${dr},${dg},${db},0.5)`;
          ctx.fillRect(ox + dx, oy + dy, 2, 2);
        }
      } else if (zone.id === 'town-square' && rng() > 0.6) {
        const dx = (rng() - 0.5) * 20;
        const dy = rng() * 10 + 6;
        const sr = (140 + (rng() * 20)) | 0;
        const sg = (120 + (rng() * 20)) | 0;
        const sb = (100 + (rng() * 20)) | 0;
        ctx.fillStyle = `rgba(${sr},${sg},${sb},0.25)`;
        ctx.fillRect(ox + dx, oy + dy, 3, 2);
      } else if (zone.id === 'workshop' && rng() > 0.85) {
        const dx = (rng() - 0.5) * 20;
        const dy = rng() * 8 + 6;
        ctx.fillStyle = `rgba(255,${(200 + (rng() * 55)) | 0},50,0.3)`;
        ctx.fillRect(ox + dx, oy + dy, 2, 1);
      }
    }

    const tex = scene.textures.addCanvas(`tile-${zone.id}`, canvas)!;
    // Add frames for each tile variant
    for (let v = 0; v < VARIANTS; v++) {
      tex.add(v, 0, v * TILE_W, 0, TILE_W, TILE_H + 2);
    }
  }

  // Empty ground tiles
  {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_W * VARIANTS;
    canvas.height = TILE_H + 2;
    const ctx = canvas.getContext('2d')!;

    for (let v = 0; v < VARIANTS; v++) {
      const ox = v * TILE_W + TILE_W / 2;
      const oy = 0;
      const shade = 25 + ((rng() * 10) | 0);

      drawIsoDiamond(ctx, ox, oy, TILE_W, TILE_H);
      ctx.fillStyle = `rgb(${shade},${shade},${shade + 8})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,60,80,0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    const tex = scene.textures.addCanvas('tile-empty', canvas)!;
    for (let v = 0; v < VARIANTS; v++) {
      tex.add(v, 0, v * TILE_W, 0, TILE_W, TILE_H + 2);
    }
  }
}

export { TILE_W, TILE_H };

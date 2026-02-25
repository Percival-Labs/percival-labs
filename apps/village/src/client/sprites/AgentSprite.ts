/**
 * AgentSprite.ts — Procedural pixel art agent textures.
 *
 * Generates a 16x24 pixel character sprite per agent with body, head, hair,
 * eyes, mouth, and role-specific accessories. Ported from village.ts canvas drawing.
 */

import Phaser from 'phaser';
import type { VillageAgent } from '../../game/agents';

const SPRITE_W = 16;
const SPRITE_H = 24;
const DRAW_SCALE = 2;
const TEX_W = SPRITE_W * DRAW_SCALE; // 32
const TEX_H = SPRITE_H * DRAW_SCALE; // 48

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

const HAIR_COLORS: Record<string, string> = {
  percy: '#2a3a5c',
  scout: '#4a3020',
  sage: '#6a5a80',
  forge: '#8a5a20',
  relay: '#5a2020',
  pixel: '#c060a0',
  wrench: '#3a3a60',
  lens: '#2a5a5a',
  cog: '#5a5a50',
};

function drawAccessory(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  s: number,
  agentId: string
) {
  switch (agentId) {
    case 'percy': // Crown
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(bx + 4 * s, by - 1 * s, 8 * s, 2 * s);
      ctx.fillRect(bx + 5 * s, by - 3 * s, 2 * s, 2 * s);
      ctx.fillRect(bx + 7 * s, by - 2 * s, 2 * s, 1 * s);
      ctx.fillRect(bx + 9 * s, by - 3 * s, 2 * s, 2 * s);
      break;
    case 'scout': // Binoculars
      ctx.fillStyle = '#556';
      ctx.fillRect(bx + 14 * s, by + 10 * s, 3 * s, 4 * s);
      ctx.fillStyle = '#88c0e0';
      ctx.fillRect(bx + 15 * s, by + 10 * s, 2 * s, 1 * s);
      break;
    case 'sage': // Wizard hat
      ctx.fillStyle = '#6a5a90';
      ctx.fillRect(bx + 5 * s, by - 3 * s, 6 * s, 3 * s);
      ctx.fillRect(bx + 6 * s, by - 6 * s, 4 * s, 3 * s);
      ctx.fillRect(bx + 7 * s, by - 8 * s, 2 * s, 2 * s);
      break;
    case 'forge': // Hammer
      ctx.fillStyle = '#8a7060';
      ctx.fillRect(bx + 14 * s, by + 8 * s, 2 * s, 8 * s);
      ctx.fillStyle = '#aaa';
      ctx.fillRect(bx + 13 * s, by + 7 * s, 4 * s, 3 * s);
      break;
    case 'relay': // Clipboard
      ctx.fillStyle = '#c8b898';
      ctx.fillRect(bx - 1 * s, by + 10 * s, 3 * s, 5 * s);
      ctx.fillStyle = '#333';
      ctx.fillRect(bx + 0 * s, by + 11 * s, 1 * s, 1 * s);
      ctx.fillRect(bx + 0 * s, by + 13 * s, 1 * s, 1 * s);
      break;
    case 'pixel': // Paintbrush
      ctx.fillStyle = '#d4a574';
      ctx.fillRect(bx + 14 * s, by + 9 * s, 1 * s, 7 * s);
      ctx.fillStyle = '#e060a0';
      ctx.fillRect(bx + 13 * s, by + 8 * s, 3 * s, 2 * s);
      break;
    case 'wrench': // Wrench tool
      ctx.fillStyle = '#999';
      ctx.fillRect(bx + 14 * s, by + 10 * s, 2 * s, 6 * s);
      ctx.fillStyle = '#bbb';
      ctx.fillRect(bx + 13 * s, by + 9 * s, 4 * s, 2 * s);
      break;
    case 'lens': // Magnifying glass
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx + 16 * s, by + 10 * s, 3 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,200,255,0.3)';
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.fillRect(bx + 14 * s, by + 13 * s, 2 * s, 4 * s);
      break;
    case 'cog': // Gear
      ctx.fillStyle = '#8a8a78';
      ctx.beginPath();
      ctx.arc(bx + 15 * s, by + 12 * s, 3 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6a6a60';
      ctx.beginPath();
      ctx.arc(bx + 15 * s, by + 12 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

/**
 * Generate a texture for a single agent and add to texture manager.
 * Returns the texture key.
 */
export function generateAgentTexture(
  scene: Phaser.Scene,
  agent: VillageAgent
): string {
  const key = `agent-${agent.id}`;
  // Extra top padding for accessories (hat/crown), extra right for held items
  const PAD_TOP = 10 * DRAW_SCALE;
  const PAD_RIGHT = 6 * DRAW_SCALE;
  const canvasW = TEX_W + PAD_RIGHT;
  const canvasH = TEX_H + PAD_TOP;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const s = DRAW_SCALE;
  const bx = 0; // draw from left edge
  const by = PAD_TOP; // offset down for accessories

  const { r, g, b } = hexToRgb(agent.color);
  const darkR = Math.floor(r * 0.6),
    darkG = Math.floor(g * 0.6),
    darkB = Math.floor(b * 0.6);
  const lightR = Math.min(255, r + 40),
    lightG = Math.min(255, g + 40),
    lightB = Math.min(255, b + 40);

  // Feet
  ctx.fillStyle = `rgb(${darkR},${darkG},${darkB})`;
  ctx.fillRect(bx + 3 * s, by + 20 * s, 4 * s, 4 * s);
  ctx.fillRect(bx + 9 * s, by + 20 * s, 4 * s, 4 * s);

  // Legs
  ctx.fillStyle = `rgb(${darkR},${darkG},${darkB})`;
  ctx.fillRect(bx + 4 * s, by + 16 * s, 3 * s, 5 * s);
  ctx.fillRect(bx + 9 * s, by + 16 * s, 3 * s, 5 * s);

  // Body
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(bx + 3 * s, by + 8 * s, 10 * s, 9 * s);
  // Body highlight
  ctx.fillStyle = `rgb(${lightR},${lightG},${lightB})`;
  ctx.fillRect(bx + 4 * s, by + 9 * s, 3 * s, 6 * s);
  // Body shadow
  ctx.fillStyle = `rgb(${darkR},${darkG},${darkB})`;
  ctx.fillRect(bx + 10 * s, by + 9 * s, 2 * s, 7 * s);

  // Arms
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(bx + 1 * s, by + 9 * s, 2 * s, 7 * s);
  ctx.fillRect(bx + 13 * s, by + 9 * s, 2 * s, 7 * s);

  // Head
  ctx.fillStyle = '#f4dcc0';
  ctx.fillRect(bx + 4 * s, by + 1 * s, 8 * s, 8 * s);

  // Hair
  ctx.fillStyle = HAIR_COLORS[agent.id] || '#444';
  ctx.fillRect(bx + 3 * s, by + 0 * s, 10 * s, 3 * s);
  ctx.fillRect(bx + 3 * s, by + 1 * s, 2 * s, 4 * s);

  // Eyes
  ctx.fillStyle = '#222';
  ctx.fillRect(bx + 5 * s, by + 4 * s, 2 * s, 2 * s);
  ctx.fillRect(bx + 9 * s, by + 4 * s, 2 * s, 2 * s);
  // Eye shine
  ctx.fillStyle = '#fff';
  ctx.fillRect(bx + 5 * s, by + 4 * s, 1 * s, 1 * s);
  ctx.fillRect(bx + 9 * s, by + 4 * s, 1 * s, 1 * s);

  // Mouth
  ctx.fillStyle = '#c08080';
  ctx.fillRect(bx + 6 * s, by + 7 * s, 4 * s, 1 * s);

  // Accessories
  drawAccessory(ctx, bx, by, s, agent.id);

  scene.textures.addCanvas(key, canvas);
  return key;
}

export { TEX_W, TEX_H, DRAW_SCALE, SPRITE_W, SPRITE_H };

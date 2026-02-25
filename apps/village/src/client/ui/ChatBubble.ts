/**
 * ChatBubble.ts — Floating text bubbles above agents.
 *
 * Creates a Phaser container with a rounded rect background, text, and tail.
 * Auto-destroys after 6 seconds with a fade-out.
 */

import Phaser from 'phaser';

const BUBBLE_LIFETIME = 6000;
const FADE_DURATION = 500;
const MAX_WIDTH = 180;
const PADDING = 8;
const FONT_SIZE = 11;
const BG_COLOR = 0x16161e;
const BG_ALPHA = 0.93;
const BORDER_COLOR = 0xffffff;
const BORDER_ALPHA = 0.12;
const TEXT_COLOR = '#c8cad0';
const TAIL_SIZE = 7;

/** Track active bubbles per agent so we can remove old ones */
const activeBubbles = new Map<string, Phaser.GameObjects.Container>();

export function showChatBubble(
  scene: Phaser.Scene,
  agentId: string,
  message: string,
  x: number,
  y: number
): void {
  // Remove existing bubble for this agent
  const existing = activeBubbles.get(agentId);
  if (existing) {
    existing.destroy();
    activeBubbles.delete(agentId);
  }

  // Create text first to measure
  const text = scene.add.text(0, 0, message, {
    fontFamily: '"Courier New", monospace',
    fontSize: `${FONT_SIZE}px`,
    color: TEXT_COLOR,
    wordWrap: { width: MAX_WIDTH - PADDING * 2 },
    lineSpacing: 2,
  });
  text.setOrigin(0.5, 1);

  const textWidth = Math.min(text.width, MAX_WIDTH - PADDING * 2);
  const textHeight = text.height;
  const bgWidth = textWidth + PADDING * 2;
  const bgHeight = textHeight + PADDING * 2;

  // Background rounded rect
  const bg = scene.add.graphics();
  bg.fillStyle(BG_COLOR, BG_ALPHA);
  bg.fillRoundedRect(-bgWidth / 2, -bgHeight, bgWidth, bgHeight, 10);
  bg.lineStyle(2, BORDER_COLOR, BORDER_ALPHA);
  bg.strokeRoundedRect(-bgWidth / 2, -bgHeight, bgWidth, bgHeight, 10);

  // Tail triangle
  bg.fillStyle(BG_COLOR, BG_ALPHA);
  bg.fillTriangle(
    -TAIL_SIZE,
    0,
    TAIL_SIZE,
    0,
    0,
    TAIL_SIZE
  );

  // Position text inside background
  text.setPosition(0, -PADDING);

  // Container
  const container = scene.add.container(x, y - 20, [bg, text]);
  container.setDepth(2000); // above everything
  container.setAlpha(0);

  activeBubbles.set(agentId, container);

  // Fade in
  scene.tweens.add({
    targets: container,
    alpha: 1,
    y: y - 28,
    duration: 300,
    ease: 'Back.easeOut',
  });

  // Auto-destroy after lifetime
  scene.time.delayedCall(BUBBLE_LIFETIME, () => {
    if (!container.active) return;
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: FADE_DURATION,
      onComplete: () => {
        container.destroy();
        if (activeBubbles.get(agentId) === container) {
          activeBubbles.delete(agentId);
        }
      },
    });
  });
}

/**
 * ParticleEffects.ts — Floating ambient motes for atmosphere.
 *
 * Creates 15-20 small glowing particles that drift sinusoidally
 * across the scene with a warm teal/yellow tint and fade cycle.
 */

import Phaser from 'phaser';

const MOTE_COUNT = 18;

interface Mote {
  graphic: Phaser.GameObjects.Graphics;
  baseX: number;
  baseY: number;
  speed: number;
  amplitude: number;
  phase: number;
  color: number;
  maxAlpha: number;
  fadeDuration: number;
}

export class ParticleEffects {
  private scene: Phaser.Scene;
  private motes: Mote[] = [];
  private timer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(viewWidth: number, viewHeight: number): void {
    const colors = [0xffd080, 0x80e0d0, 0xffe0a0, 0x90ddd0, 0xffcc88];

    for (let i = 0; i < MOTE_COUNT; i++) {
      const g = this.scene.add.graphics();
      // Depth between tiles and agents
      g.setDepth(-100);

      const color = colors[i % colors.length];
      const maxAlpha = 0.15 + Math.random() * 0.2;
      const radius = 1.5 + Math.random() * 1.5;

      g.fillStyle(color, maxAlpha);
      g.fillCircle(0, 0, radius);

      const mote: Mote = {
        graphic: g,
        baseX: Math.random() * viewWidth,
        baseY: Math.random() * viewHeight,
        speed: 0.15 + Math.random() * 0.25,
        amplitude: 20 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        color,
        maxAlpha,
        fadeDuration: 3000 + Math.random() * 2000,
      };

      g.setPosition(mote.baseX, mote.baseY);
      g.setAlpha(0);

      // Fade in/out loop
      this.scene.tweens.add({
        targets: g,
        alpha: { from: 0, to: maxAlpha },
        duration: mote.fadeDuration,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 3000,
        ease: 'Sine.easeInOut',
      });

      this.motes.push(mote);
    }

    // Update positions every frame
    this.timer = this.scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => this.updatePositions(),
    });
  }

  private updatePositions(): void {
    const time = this.scene.time.now / 1000;
    for (const mote of this.motes) {
      const dx = Math.sin(time * mote.speed + mote.phase) * mote.amplitude;
      const dy = Math.cos(time * mote.speed * 0.7 + mote.phase) * mote.amplitude * 0.4;
      mote.graphic.setPosition(mote.baseX + dx, mote.baseY + dy);
    }
  }

  destroy(): void {
    this.timer?.destroy();
    for (const mote of this.motes) {
      mote.graphic.destroy();
    }
    this.motes = [];
  }
}

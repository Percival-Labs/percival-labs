/**
 * ModeBar.ts — Top-center mode selection buttons (Build / Paint / Play).
 */

import Phaser from 'phaser';
import { type EditorMode, type EditorModeType } from '../editor/EditorMode';
import { DEPTH_MODE_BAR } from '../core/constants';

const MODES: { mode: EditorModeType; label: string; key: string }[] = [
  { mode: 'build', label: 'Build', key: 'B' },
  { mode: 'paint', label: 'Paint', key: 'P' },
  { mode: 'play', label: 'Play', key: 'Esc' },
];

export class ModeBar {
  private scene: Phaser.Scene;
  private editorMode: EditorMode;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, editorMode: EditorMode) {
    this.scene = scene;
    this.editorMode = editorMode;
    this.container = scene.add.container(0, 0).setDepth(DEPTH_MODE_BAR).setScrollFactor(0);
    this.layout();
  }

  /** Rebuild button visuals (call after mode change or resize). */
  layout(): void {
    this.container.removeAll(true);

    const cam = this.scene.cameras.main;
    const BTN_W = 72;
    const BTN_H = 32;
    const GAP = 6;
    const totalW = MODES.length * (BTN_W + GAP) - GAP;
    const startX = (cam.width - totalW) / 2;
    const startY = 12;

    // Bar background
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x16161e, 0.88);
    barBg.fillRoundedRect(startX - 8, startY - 4, totalW + 16, BTN_H + 8, 8);
    barBg.lineStyle(1, 0xffffff, 0.1);
    barBg.strokeRoundedRect(startX - 8, startY - 4, totalW + 16, BTN_H + 8, 8);
    this.container.add(barBg);

    MODES.forEach((m, i) => {
      const bx = startX + i * (BTN_W + GAP);
      const isActive = this.editorMode.mode === m.mode;

      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0x5eead4 : 0x2a2a3e, isActive ? 0.3 : 0.6);
      bg.fillRoundedRect(bx, startY, BTN_W, BTN_H, 6);
      if (isActive) {
        bg.lineStyle(1, 0x5eead4, 0.8);
        bg.strokeRoundedRect(bx, startY, BTN_W, BTN_H, 6);
      }
      this.container.add(bg);

      const label = this.scene.add.text(bx + BTN_W / 2, startY + BTN_H / 2, `${m.label} [${m.key}]`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        fontStyle: isActive ? 'bold' : 'normal',
        color: isActive ? '#5eead4' : '#94a3b8',
      });
      label.setOrigin(0.5, 0.5);
      this.container.add(label);

      const hitZone = this.scene.add.zone(bx, startY, BTN_W, BTN_H);
      hitZone.setOrigin(0, 0);
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => this.editorMode.set(m.mode));
      this.container.add(hitZone);
    });
  }
}

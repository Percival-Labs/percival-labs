/**
 * ConnectionStatus.ts — Fixed-position connection indicator.
 *
 * Shows a green dot + "Connected to agents" when SSE is active,
 * or a red dot + "Agents offline — mock mode" when disconnected.
 */

import Phaser from 'phaser';

export class ConnectionStatus {
  private container: Phaser.GameObjects.Container;
  private dot: Phaser.GameObjects.Arc;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.dot = scene.add.circle(12, 12, 4, 0xef4444);
    this.label = scene.add.text(24, 5, 'Connecting...', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: '#c8cad0',
    });

    // Background panel
    const bg = scene.add.graphics();
    bg.fillStyle(0x141423, 0.85);
    bg.fillRoundedRect(0, 0, 200, 24, 8);
    bg.lineStyle(1, 0xffffff, 0.06);
    bg.strokeRoundedRect(0, 0, 200, 24, 8);

    this.container = scene.add.container(16, 16, [bg, this.dot, this.label]);
    this.container.setDepth(3000);
    this.container.setScrollFactor(0); // fixed to camera
  }

  setConnected(connected: boolean): void {
    if (connected) {
      this.dot.setFillStyle(0x22c55e);
      this.label.setText('Connected to agents');
    } else {
      this.dot.setFillStyle(0xef4444);
      this.label.setText('Agents offline \u2014 mock mode');
    }
  }
}

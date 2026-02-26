/**
 * ZoneLabelRenderer.ts — Renders zone name labels at their centroids.
 */

import Phaser from 'phaser';
import { ZONES } from '../../game/zones';
import { isoToScreen } from '../core/coordinates';
import { DEPTH_LABELS } from '../core/constants';
import { type VillageState } from '../state/VillageState';

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function lightenHex(hex: string, amount: number): number {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.min(255, Math.floor(r + (255 - r) * amount));
  const lg = Math.min(255, Math.floor(g + (255 - g) * amount));
  const lb = Math.min(255, Math.floor(b + (255 - b) * amount));
  return (lr << 16) | (lg << 8) | lb;
}

export function renderZoneLabels(
  scene: Phaser.Scene,
  state: VillageState,
  container: Phaser.GameObjects.Container,
  viewWidth: number
): void {
  const zoneTiles: Record<string, { sumC: number; sumR: number; count: number }> = {};

  for (const [key, zoneId] of Object.entries(state.zonePaint)) {
    const [c, r] = key.split(',').map(Number);
    if (!zoneTiles[zoneId]) zoneTiles[zoneId] = { sumC: 0, sumR: 0, count: 0 };
    zoneTiles[zoneId].sumC += c;
    zoneTiles[zoneId].sumR += r;
    zoneTiles[zoneId].count++;
  }

  for (const [zoneId, data] of Object.entries(zoneTiles)) {
    const zone = ZONES.find((z) => z.id === zoneId);
    if (!zone) continue;

    const avgCol = data.sumC / data.count;
    const avgRow = data.sumR / data.count;
    const { x, y } = isoToScreen(avgCol, avgRow, viewWidth);

    const color = lightenHex(zone.color, 0.3);
    const text = scene.add.text(x, y + 30, `${zone.icon} ${zone.name}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5, 0);
    text.setAlpha(0.8);
    text.setDepth(DEPTH_LABELS);
    container.add(text);
  }
}

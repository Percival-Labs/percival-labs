/**
 * ZonePainter.ts — Click/drag to paint zone types onto grid tiles.
 *
 * In paint mode: shows zone selector buttons, paints tiles on click/drag,
 * swaps tile textures in real-time.
 */

import Phaser from 'phaser';
import { ZONES, GRID_COLS, GRID_ROWS } from '../../game/zones';
import { TILE_W, TILE_H } from '../sprites/TileGenerator';
import { type VillageState, paintZone, clearZone, isInGrid } from '../state/VillageState';
import { isoToScreen, screenToGrid } from '../core/coordinates';
import { DEPTH_PALETTE, DEPTH_HOVER } from '../core/constants';

interface ZoneButton {
  id: string; // zone id or 'eraser'
  color: number;
  label: string;
  icon: string;
}

const ZONE_BUTTONS: ZoneButton[] = [
  ...ZONES.map((z) => ({
    id: z.id,
    color: parseInt(z.color.slice(1), 16),
    label: z.name,
    icon: z.icon,
  })),
  { id: 'eraser', color: 0x555566, label: 'Eraser', icon: '\u{1F9F9}' },
];

export class ZonePainter {
  private scene: Phaser.Scene;
  private state: VillageState;
  private container!: Phaser.GameObjects.Container;
  private hoverOverlay: Phaser.GameObjects.Graphics | null = null;
  private selectedZone: string = ZONES[0].id;
  private painting = false;
  private buttons: Phaser.GameObjects.Container[] = [];

  /** Called after state mutation so the scene can re-render tiles */
  onStateChange: (() => void) | null = null;

  constructor(scene: Phaser.Scene, state: VillageState) {
    this.scene = scene;
    this.state = state;
    this.createUI();
    this.setupInputHandlers();
  }

  // ═══ Zone Selector UI ═══

  private createUI(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(DEPTH_PALETTE);
    this.container.setScrollFactor(0);
    this.layoutButtons();

    // Hover overlay for current tile
    this.hoverOverlay = this.scene.add.graphics();
    this.hoverOverlay.setDepth(DEPTH_HOVER);
    this.hoverOverlay.setVisible(false);
  }

  private layoutButtons(): void {
    for (const btn of this.buttons) btn.destroy();
    this.buttons = [];

    const cam = this.scene.cameras.main;
    const BTN_W = 72;
    const BTN_H = 48;
    const PAD = 8;
    const GAP = 4;
    const totalW = ZONE_BUTTONS.length * (BTN_W + GAP) - GAP + PAD * 2;
    const barX = (cam.width - totalW) / 2;
    const barY = cam.height - BTN_H - PAD * 2 - 8;

    // Background bar
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x16161e, 0.92);
    bg.fillRoundedRect(barX, barY, totalW, BTN_H + PAD * 2, 12);
    bg.lineStyle(1, 0xffffff, 0.12);
    bg.strokeRoundedRect(barX, barY, totalW, BTN_H + PAD * 2, 12);
    this.container.add(bg);

    ZONE_BUTTONS.forEach((zone, i) => {
      const bx = barX + PAD + i * (BTN_W + GAP);
      const by = barY + PAD;

      const btnContainer = this.scene.add.container(bx, by);

      // Button background
      const btnBg = this.scene.add.graphics();
      const isSelected = zone.id === this.selectedZone;
      btnBg.fillStyle(zone.color, isSelected ? 0.5 : 0.2);
      btnBg.fillRoundedRect(0, 0, BTN_W, BTN_H, 6);
      if (isSelected) {
        btnBg.lineStyle(2, zone.color, 0.9);
        btnBg.strokeRoundedRect(0, 0, BTN_W, BTN_H, 6);
      }
      btnContainer.add(btnBg);

      // Icon
      const icon = this.scene.add.text(BTN_W / 2, BTN_H / 2 - 6, zone.icon, {
        fontSize: '16px',
      });
      icon.setOrigin(0.5, 0.5);
      btnContainer.add(icon);

      // Label
      const label = this.scene.add.text(BTN_W / 2, BTN_H - 4, zone.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '8px',
        color: '#94a3b8',
      });
      label.setOrigin(0.5, 1);
      btnContainer.add(label);

      // Hit zone
      const hitZone = this.scene.add.zone(0, 0, BTN_W, BTN_H);
      hitZone.setOrigin(0, 0);
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => {
        this.selectedZone = zone.id;
        this.refreshButtons();
      });
      btnContainer.add(hitZone);

      this.container.add(btnContainer);
      this.buttons.push(btnContainer);
    });
  }

  private refreshButtons(): void {
    // Rebuild button visuals to reflect new selection
    this.container.removeAll(true);
    this.buttons = [];
    this.layoutButtons();
  }

  // ═══ Paint logic ═══

  private paintAt(sx: number, sy: number): void {
    const { col, row } = this.gridAt(sx, sy);
    const c = Math.round(col);
    const r = Math.round(row);

    if (!isInGrid(c, r)) return;

    if (this.selectedZone === 'eraser') {
      clearZone(this.state, c, r);
    } else {
      paintZone(this.state, c, r, this.selectedZone);
    }

    this.onStateChange?.();
  }

  private updateHover(sx: number, sy: number): void {
    if (!this.hoverOverlay) return;

    const { col, row } = this.gridAt(sx, sy);
    const c = Math.round(col);
    const r = Math.round(row);

    if (!isInGrid(c, r)) {
      this.hoverOverlay.setVisible(false);
      return;
    }

    const pos = this.iso(c, r);
    this.hoverOverlay.clear();

    // Get zone color
    const zoneBtn = ZONE_BUTTONS.find((z) => z.id === this.selectedZone);
    const color = zoneBtn?.color ?? 0x555566;

    // Draw diamond highlight on the hovered tile
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;
    this.hoverOverlay.fillStyle(color, 0.35);
    this.hoverOverlay.beginPath();
    this.hoverOverlay.moveTo(pos.x, pos.y);          // top
    this.hoverOverlay.lineTo(pos.x + hw, pos.y + hh); // right
    this.hoverOverlay.lineTo(pos.x, pos.y + TILE_H);   // bottom
    this.hoverOverlay.lineTo(pos.x - hw, pos.y + hh); // left
    this.hoverOverlay.closePath();
    this.hoverOverlay.fillPath();

    this.hoverOverlay.lineStyle(1, color, 0.7);
    this.hoverOverlay.beginPath();
    this.hoverOverlay.moveTo(pos.x, pos.y);
    this.hoverOverlay.lineTo(pos.x + hw, pos.y + hh);
    this.hoverOverlay.lineTo(pos.x, pos.y + TILE_H);
    this.hoverOverlay.lineTo(pos.x - hw, pos.y + hh);
    this.hoverOverlay.closePath();
    this.hoverOverlay.strokePath();

    this.hoverOverlay.setVisible(true);
  }

  // ═══ Input handlers ═══

  private setupInputHandlers(): void {
    // We'll use scene-level events that VillageScene can gate by mode
  }

  /** Called by VillageScene when pointer is down in paint mode */
  handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.painting = true;
    this.paintAt(pointer.x, pointer.y);
  }

  /** Called by VillageScene on pointer move in paint mode */
  handlePointerMove(pointer: Phaser.Input.Pointer): void {
    this.updateHover(pointer.x, pointer.y);
    if (this.painting && pointer.isDown) {
      this.paintAt(pointer.x, pointer.y);
    }
  }

  /** Called by VillageScene on pointer up */
  handlePointerUp(): void {
    this.painting = false;
  }

  // ═══ Coordinate helpers ═══

  private iso(col: number, row: number) {
    return isoToScreen(col, row, this.scene.cameras.main.width);
  }

  private gridAt(sx: number, sy: number) {
    return screenToGrid(sx, sy, this.scene.cameras.main.width);
  }

  // ═══ Visibility ═══

  show(): void {
    this.container.setVisible(true);
    this.hoverOverlay?.setVisible(false);
  }

  hide(): void {
    this.container.setVisible(false);
    this.hoverOverlay?.setVisible(false);
    this.painting = false;
  }

  reposition(): void {
    this.container.removeAll(true);
    this.buttons = [];
    this.layoutButtons();
  }

  destroy(): void {
    this.hoverOverlay?.destroy();
    this.container.destroy();
  }
}

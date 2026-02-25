/**
 * BuildingPalette.ts — Horizontal palette bar for drag & drop placement.
 *
 * Shows building and decoration thumbnails at the bottom of the screen.
 * Drag from palette onto grid to place. Click placed items to select/move/delete.
 */

import Phaser from 'phaser';
import { TILE_W, TILE_H } from '../sprites/TileGenerator';
import { GRID_COLS, GRID_ROWS } from '../../game/zones';
import {
  type VillageState,
  addBuilding,
  addDecoration,
  removeBuilding,
  removeDecoration,
  moveBuilding,
  moveDecoration,
  isBuildingAt,
  isDecorationAt,
  isOccupied,
  isInGrid,
} from '../state/VillageState';
import { BUILDING_CONFIG } from '../config';

/** All placeable item types */
const BUILDING_TYPES = [
  { type: 'sanctum', label: 'Sanctum', icon: '\u{1F54A}', category: 'building' },
  { type: 'observatory', label: 'Observatory', icon: '\u{1F52D}', category: 'building' },
  { type: 'fountain', label: 'Fountain', icon: '\u{26F2}', category: 'building' },
  { type: 'workshop', label: 'Workshop', icon: '\u{1F528}', category: 'building' },
  { type: 'library', label: 'Library', icon: '\u{1F4DA}', category: 'building' },
] as const;

const DECORATION_TYPES = [
  { type: 'tree-1', label: 'Oak', icon: '\u{1F333}', category: 'decoration' },
  { type: 'tree-2', label: 'Cherry', icon: '\u{1F338}', category: 'decoration' },
  { type: 'tree-3', label: 'Pine', icon: '\u{1F332}', category: 'decoration' },
  { type: 'bush-1', label: 'Bush', icon: '\u{1F33F}', category: 'decoration' },
  { type: 'bush-2', label: 'Hedge', icon: '\u{1F33F}', category: 'decoration' },
  { type: 'lantern', label: 'Lantern', icon: '\u{1F4A1}', category: 'decoration' },
] as const;

type PlaceableItem = (typeof BUILDING_TYPES)[number] | (typeof DECORATION_TYPES)[number];

interface DragState {
  item: PlaceableItem;
  ghost: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  gridCol: number;
  gridRow: number;
  valid: boolean;
}

interface SelectedItem {
  category: 'building' | 'decoration';
  index: number;
  highlight: Phaser.GameObjects.Graphics;
}

export class BuildingPalette {
  private scene: Phaser.Scene;
  private state: VillageState;
  private container!: Phaser.GameObjects.Container;
  private paletteItems: Phaser.GameObjects.Container[] = [];
  private drag: DragState | null = null;
  private selected: SelectedItem | null = null;
  private visible = true;

  /** Called after state mutation so the scene can re-render */
  onStateChange: (() => void) | null = null;

  constructor(scene: Phaser.Scene, state: VillageState) {
    this.scene = scene;
    this.state = state;
    this.createPalette();
    this.setupInputHandlers();
  }

  // ═══ Palette UI ═══

  private createPalette(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(5000);
    this.container.setScrollFactor(0);
    this.layoutPalette();
  }

  private layoutPalette(): void {
    // Clear old items
    for (const item of this.paletteItems) item.destroy();
    this.paletteItems = [];

    const cam = this.scene.cameras.main;
    const allItems: PlaceableItem[] = [...BUILDING_TYPES, ...DECORATION_TYPES];

    const ITEM_W = 72;
    const ITEM_H = 64;
    const PAD = 8;
    const BAR_H = ITEM_H + PAD * 2;
    const totalW = allItems.length * ITEM_W + (allItems.length - 1) * 4 + PAD * 2;
    const barX = (cam.width - totalW) / 2;
    const barY = cam.height - BAR_H - 8;

    // Background bar
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x16161e, 0.92);
    bg.fillRoundedRect(barX, barY, totalW, BAR_H, 12);
    bg.lineStyle(1, 0xffffff, 0.12);
    bg.strokeRoundedRect(barX, barY, totalW, BAR_H, 12);
    this.container.add(bg);

    // Separator between buildings and decorations
    const sepX = barX + PAD + BUILDING_TYPES.length * (ITEM_W + 4) - 2;
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, 0xffffff, 0.15);
    sep.lineBetween(sepX, barY + 8, sepX, barY + BAR_H - 8);
    this.container.add(sep);

    // Items
    allItems.forEach((item, i) => {
      const ix = barX + PAD + i * (ITEM_W + 4);
      const iy = barY + PAD;

      const itemContainer = this.scene.add.container(ix, iy);

      // Background
      const itemBg = this.scene.add.graphics();
      itemBg.fillStyle(0x2a2a3e, 0.8);
      itemBg.fillRoundedRect(0, 0, ITEM_W, ITEM_H, 6);
      itemContainer.add(itemBg);

      // Try to use real sprite as thumbnail
      const spriteKey = item.category === 'building'
        ? `building-${item.type}`
        : item.type;

      if (this.scene.textures.exists(spriteKey)) {
        const thumb = this.scene.add.image(ITEM_W / 2, ITEM_H / 2 - 6, spriteKey);
        const maxDim = Math.max(thumb.width, thumb.height);
        const thumbScale = 40 / maxDim;
        thumb.setScale(thumbScale);
        itemContainer.add(thumb);
      } else {
        // Icon fallback
        const icon = this.scene.add.text(ITEM_W / 2, ITEM_H / 2 - 10, item.icon, {
          fontSize: '22px',
        });
        icon.setOrigin(0.5, 0.5);
        itemContainer.add(icon);
      }

      // Label
      const label = this.scene.add.text(ITEM_W / 2, ITEM_H - 6, item.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '9px',
        color: '#94a3b8',
      });
      label.setOrigin(0.5, 1);
      itemContainer.add(label);

      // Hit zone
      const hitZone = this.scene.add.zone(0, 0, ITEM_W, ITEM_H);
      hitZone.setOrigin(0, 0);
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.leftButtonDown()) {
          this.startDrag(item, pointer);
        }
      });
      // Hover effect
      hitZone.on('pointerover', () => {
        itemBg.clear();
        itemBg.fillStyle(0x3a3a5e, 0.9);
        itemBg.fillRoundedRect(0, 0, ITEM_W, ITEM_H, 6);
        itemBg.lineStyle(1, 0x5eead4, 0.5);
        itemBg.strokeRoundedRect(0, 0, ITEM_W, ITEM_H, 6);
      });
      hitZone.on('pointerout', () => {
        itemBg.clear();
        itemBg.fillStyle(0x2a2a3e, 0.8);
        itemBg.fillRoundedRect(0, 0, ITEM_W, ITEM_H, 6);
      });
      itemContainer.add(hitZone);

      this.container.add(itemContainer);
      this.paletteItems.push(itemContainer);
    });
  }

  // ═══ Drag & Drop ═══

  private startDrag(item: PlaceableItem, pointer: Phaser.Input.Pointer): void {
    this.clearSelection();

    const spriteKey = item.category === 'building'
      ? `building-${item.type}`
      : item.type;

    let ghost: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
    if (this.scene.textures.exists(spriteKey)) {
      ghost = this.scene.add.image(pointer.x, pointer.y, spriteKey);
      const config = item.category === 'building' ? BUILDING_CONFIG[item.type] : null;
      if (config) {
        (ghost as Phaser.GameObjects.Image).setOrigin(config.originX, config.originY);
        (ghost as Phaser.GameObjects.Image).setScale(config.scale);
      } else {
        (ghost as Phaser.GameObjects.Image).setOrigin(0.5, 0.9);
        (ghost as Phaser.GameObjects.Image).setScale(0.1);
      }
    } else {
      // Procedural ghost — simple colored circle
      ghost = this.scene.add.graphics();
      (ghost as Phaser.GameObjects.Graphics).fillStyle(0x5eead4, 0.5);
      (ghost as Phaser.GameObjects.Graphics).fillCircle(0, 0, 16);
    }
    ghost.setDepth(6000);
    ghost.setAlpha(0.6);

    this.drag = {
      item,
      ghost,
      gridCol: -1,
      gridRow: -1,
      valid: false,
    };
  }

  private updateDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.drag) return;

    const { col, row } = this.screenToGrid(pointer.x, pointer.y);
    const snappedCol = Math.round(col);
    const snappedRow = Math.round(row);

    this.drag.gridCol = snappedCol;
    this.drag.gridRow = snappedRow;

    // Snap ghost to grid position
    const pos = this.isoToScreen(snappedCol, snappedRow);
    if (this.drag.ghost instanceof Phaser.GameObjects.Image) {
      this.drag.ghost.setPosition(pos.x, pos.y);
    } else {
      (this.drag.ghost as Phaser.GameObjects.Graphics).setPosition(pos.x, pos.y);
    }

    // Valid placement check
    const inGrid = isInGrid(snappedCol, snappedRow);
    const occupied = isOccupied(this.state, snappedCol, snappedRow);
    this.drag.valid = inGrid && !occupied;

    // Tint green/red
    if (this.drag.ghost instanceof Phaser.GameObjects.Image) {
      this.drag.ghost.setTint(this.drag.valid ? 0x88ff88 : 0xff8888);
    }
    this.drag.ghost.setAlpha(this.drag.valid ? 0.7 : 0.4);
  }

  private endDrag(): void {
    if (!this.drag) return;

    if (this.drag.valid) {
      const { item, gridCol, gridRow } = this.drag;
      if (item.category === 'building') {
        addBuilding(this.state, item.type, gridCol, gridRow);
      } else {
        addDecoration(this.state, item.type, gridCol, gridRow);
      }
      this.onStateChange?.();
    }

    this.drag.ghost.destroy();
    this.drag = null;
  }

  private cancelDrag(): void {
    if (!this.drag) return;
    this.drag.ghost.destroy();
    this.drag = null;
  }

  // ═══ Selection (click on placed items) ═══

  trySelect(pointer: Phaser.Input.Pointer): boolean {
    const { col, row } = this.screenToGrid(pointer.x, pointer.y);
    const snappedCol = Math.round(col);
    const snappedRow = Math.round(row);

    // Check buildings first
    const bIdx = isBuildingAt(this.state, snappedCol, snappedRow);
    if (bIdx >= 0) {
      this.selectItem('building', bIdx);
      return true;
    }

    // Check decorations
    const dIdx = isDecorationAt(this.state, snappedCol, snappedRow);
    if (dIdx >= 0) {
      this.selectItem('decoration', dIdx);
      return true;
    }

    this.clearSelection();
    return false;
  }

  private selectItem(category: 'building' | 'decoration', index: number): void {
    this.clearSelection();

    const item = category === 'building'
      ? this.state.buildings[index]
      : this.state.decorations[index];
    if (!item) return;

    const pos = this.isoToScreen(item.col, item.row);
    const highlight = this.scene.add.graphics();
    highlight.lineStyle(2, 0x5eead4, 0.9);
    highlight.strokeCircle(pos.x, pos.y - 16, 24);
    highlight.setDepth(4999);

    this.selected = { category, index, highlight };
  }

  clearSelection(): void {
    if (this.selected) {
      this.selected.highlight.destroy();
      this.selected = null;
    }
  }

  /** Delete the currently selected item. Returns true if something was deleted. */
  deleteSelected(): boolean {
    if (!this.selected) return false;

    if (this.selected.category === 'building') {
      removeBuilding(this.state, this.selected.index);
    } else {
      removeDecoration(this.state, this.selected.index);
    }

    this.clearSelection();
    this.onStateChange?.();
    return true;
  }

  /** Start dragging the selected item to move it. */
  startMoveSelected(pointer: Phaser.Input.Pointer): boolean {
    if (!this.selected) return false;

    const { category, index } = this.selected;
    const item = category === 'building'
      ? this.state.buildings[index]
      : this.state.decorations[index];
    if (!item) return false;

    // Find the matching palette item definition
    const allItems = [...BUILDING_TYPES, ...DECORATION_TYPES];
    const paletteItem = allItems.find((p) => p.type === item.type);
    if (!paletteItem) return false;

    // Remove from state (will be re-added on drop)
    if (category === 'building') {
      removeBuilding(this.state, index);
    } else {
      removeDecoration(this.state, index);
    }
    this.clearSelection();
    this.onStateChange?.();

    // Start drag with the item
    this.startDrag(paletteItem, pointer);
    return true;
  }

  get hasSelection(): boolean {
    return this.selected !== null;
  }

  get isDragging(): boolean {
    return this.drag !== null;
  }

  // ═══ Input handlers ═══

  private setupInputHandlers(): void {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.drag) this.updateDrag(pointer);
    });

    this.scene.input.on('pointerup', () => {
      if (this.drag) this.endDrag();
    });
  }

  // ═══ Coordinate conversion ═══

  private isoToScreen(col: number, row: number): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const offsetX = cam.width / 2;
    const offsetY = 60;
    return {
      x: (col - row) * (TILE_W / 2) + offsetX,
      y: (col + row) * (TILE_H / 2) + offsetY,
    };
  }

  private screenToGrid(sx: number, sy: number): { col: number; row: number } {
    const cam = this.scene.cameras.main;
    const offsetX = cam.width / 2;
    const offsetY = 60;
    const rx = sx - offsetX;
    const ry = sy - offsetY;
    return {
      col: rx / TILE_W + ry / TILE_H,
      row: ry / TILE_H - rx / TILE_W,
    };
  }

  // ═══ Visibility ═══

  show(): void {
    this.container.setVisible(true);
    this.visible = true;
  }

  hide(): void {
    this.container.setVisible(false);
    this.visible = false;
    this.cancelDrag();
    this.clearSelection();
  }

  /** Reposition palette on resize */
  reposition(): void {
    this.container.removeAll(true);
    this.paletteItems = [];
    this.layoutPalette();
  }

  destroy(): void {
    this.cancelDrag();
    this.clearSelection();
    this.container.destroy();
  }
}

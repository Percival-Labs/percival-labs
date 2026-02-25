/**
 * VillageScene.ts — Main game scene.
 *
 * State-driven: all rendering reads from VillageState.
 * Supports three editor modes: play, build, paint.
 *
 * Supports both real PNG assets (from art pipeline) and procedural
 * fallback graphics. Real assets are preferred when available.
 */

import Phaser from 'phaser';
import { ZONES, GRID_COLS, GRID_ROWS } from '../../game/zones';
import { AGENTS } from '../../game/agents';
import { TILE_W, TILE_H } from '../sprites/TileGenerator';
import { TEX_H } from '../sprites/AgentSprite';
import { AgentManager } from '../systems/AgentManager';
import { EventBridge, type VillageEvent } from '../systems/EventBridge';
import { MockMode } from '../systems/MockMode';
import { showChatBubble } from '../ui/ChatBubble';
import { ConnectionStatus } from '../ui/ConnectionStatus';
import { BUILDING_CONFIG } from '../config';
import {
  type VillageState,
  createDefaultState,
  getZoneAt as stateGetZoneAt,
} from '../state/VillageState';
import { EditorMode, type EditorModeType } from '../editor/EditorMode';
import { BuildingPalette } from '../editor/BuildingPalette';
import { ZonePainter } from '../editor/ZonePainter';

/** Helpers */
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

/** Tree types for cycling through decoration sprites */
const TREE_TYPES = ['tree-1', 'tree-2', 'tree-3'] as const;

export class VillageScene extends Phaser.Scene {
  // ═══ State ═══
  private villageState!: VillageState;
  private editorMode!: EditorMode;

  // ═══ Systems ═══
  private agentManager!: AgentManager;
  private eventBridge!: EventBridge;
  private mockMode!: MockMode;
  private connectionStatus!: ConnectionStatus;
  private buildingPalette!: BuildingPalette;
  private zonePainter!: ZonePainter;

  // ═══ Containers ═══
  private tileContainer!: Phaser.GameObjects.Container;
  private buildingContainer!: Phaser.GameObjects.Container;
  private decorationContainer!: Phaser.GameObjects.Container;
  private labelContainer!: Phaser.GameObjects.Container;
  private uiContainer!: Phaser.GameObjects.Container;

  // ═══ Tracking ═══
  private tileSprites: Phaser.GameObjects.Image[] = [];
  private realTiles = false;
  private modeButtons: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'VillageScene' });
  }

  init(data: { realTiles?: boolean }): void {
    this.realTiles = data.realTiles ?? false;
  }

  create(): void {
    // Initialize state (default = mirrors original layout)
    this.villageState = createDefaultState();

    // Editor mode
    this.editorMode = new EditorMode();
    this.editorMode.onChange((mode, prev) => this.onModeChange(mode, prev));

    // ═══ Container hierarchy ═══
    this.tileContainer = this.add.container(0, 0).setDepth(-1000);
    this.buildingContainer = this.add.container(0, 0).setDepth(-500);
    this.decorationContainer = this.add.container(0, 0).setDepth(-300);
    this.labelContainer = this.add.container(0, 0).setDepth(-200);
    this.uiContainer = this.add.container(0, 0).setDepth(1000);

    // Render from state
    this.renderTilemap();
    this.renderBuildings();
    this.renderDecorations();
    this.renderZoneLabels();

    // Agent system
    this.agentManager = new AgentManager(this, this.villageState);
    this.agentManager.createAll();

    // Connection status UI
    this.connectionStatus = new ConnectionStatus(this);

    // SSE event bridge
    this.eventBridge = new EventBridge((connected) => {
      this.connectionStatus.setConnected(connected);
      if (connected) {
        this.mockMode.stop();
      } else {
        this.mockMode.start();
      }
    });

    // Mock mode
    this.mockMode = new MockMode(this.agentManager, (agentId, message) => {
      this.showBubble(agentId, message);
    });

    // Status decay every 4 seconds
    this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => this.agentManager.decayStats(),
    });

    // ═══ Editor tools ═══
    this.buildingPalette = new BuildingPalette(this, this.villageState);
    this.buildingPalette.onStateChange = () => this.rebuildScene();

    this.zonePainter = new ZonePainter(this, this.villageState);
    this.zonePainter.onStateChange = () => this.rebuildTiles();
    this.zonePainter.hide(); // Hidden until paint mode

    // Mode buttons
    this.createModeButtons();

    // Start in build mode
    this.editorMode.set('build');

    // Handle resize
    this.scale.on('resize', () => this.handleResize());

    // ═══ Input ═══
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerMove(pointer);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerUp(pointer);
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-B', () => this.editorMode.set('build'));
    this.input.keyboard?.on('keydown-P', () => this.editorMode.set('paint'));
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.editorMode.isBuild() && this.buildingPalette.hasSelection) {
        this.buildingPalette.clearSelection();
      } else {
        this.editorMode.set('play');
      }
    });
    this.input.keyboard?.on('keydown-DELETE', () => {
      if (this.editorMode.isBuild()) this.buildingPalette.deleteSelected();
    });
    this.input.keyboard?.on('keydown-BACKSPACE', () => {
      if (this.editorMode.isBuild()) this.buildingPalette.deleteSelected();
    });
  }

  update(): void {
    // Drain SSE events (always, regardless of mode)
    const events = this.eventBridge.drain();
    for (const event of events) {
      this.handleEvent(event);
    }
  }

  // ═══ Coordinate conversion ═══

  private isoToScreen(col: number, row: number): { x: number; y: number } {
    const offsetX = this.cameras.main.width / 2;
    const offsetY = 60;
    return {
      x: (col - row) * (TILE_W / 2) + offsetX,
      y: (col + row) * (TILE_H / 2) + offsetY,
    };
  }

  // ═══ Mode management ═══

  private onModeChange(mode: EditorModeType, _prev: EditorModeType): void {
    // Toggle editor tools
    if (mode === 'build') {
      this.buildingPalette.show();
      this.zonePainter.hide();
    } else if (mode === 'paint') {
      this.buildingPalette.hide();
      this.zonePainter.show();
    } else {
      // play
      this.buildingPalette.hide();
      this.zonePainter.hide();
    }

    // Update mode button visuals
    this.updateModeButtonVisuals();
  }

  private createModeButtons(): void {
    const modes: { mode: EditorModeType; label: string; key: string }[] = [
      { mode: 'build', label: 'Build', key: 'B' },
      { mode: 'paint', label: 'Paint', key: 'P' },
      { mode: 'play', label: 'Play', key: 'Esc' },
    ];

    this.modeButtons = this.add.container(0, 0).setDepth(5001).setScrollFactor(0);
    this.layoutModeButtons(modes);
  }

  private layoutModeButtons(modes?: { mode: EditorModeType; label: string; key: string }[]): void {
    if (!this.modeButtons) return;
    this.modeButtons.removeAll(true);

    const modeList = modes ?? [
      { mode: 'build' as EditorModeType, label: 'Build', key: 'B' },
      { mode: 'paint' as EditorModeType, label: 'Paint', key: 'P' },
      { mode: 'play' as EditorModeType, label: 'Play', key: 'Esc' },
    ];

    const cam = this.cameras.main;
    const BTN_W = 72;
    const BTN_H = 32;
    const GAP = 6;
    const totalW = modeList.length * (BTN_W + GAP) - GAP;
    const startX = (cam.width - totalW) / 2;
    const startY = 12;

    // Bar background
    const barBg = this.add.graphics();
    barBg.fillStyle(0x16161e, 0.88);
    barBg.fillRoundedRect(startX - 8, startY - 4, totalW + 16, BTN_H + 8, 8);
    barBg.lineStyle(1, 0xffffff, 0.1);
    barBg.strokeRoundedRect(startX - 8, startY - 4, totalW + 16, BTN_H + 8, 8);
    this.modeButtons.add(barBg);

    modeList.forEach((m, i) => {
      const bx = startX + i * (BTN_W + GAP);
      const isActive = this.editorMode.mode === m.mode;

      const bg = this.add.graphics();
      bg.fillStyle(isActive ? 0x5eead4 : 0x2a2a3e, isActive ? 0.3 : 0.6);
      bg.fillRoundedRect(bx, startY, BTN_W, BTN_H, 6);
      if (isActive) {
        bg.lineStyle(1, 0x5eead4, 0.8);
        bg.strokeRoundedRect(bx, startY, BTN_W, BTN_H, 6);
      }
      this.modeButtons!.add(bg);

      const label = this.add.text(bx + BTN_W / 2, startY + BTN_H / 2, `${m.label} [${m.key}]`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        fontStyle: isActive ? 'bold' : 'normal',
        color: isActive ? '#5eead4' : '#94a3b8',
      });
      label.setOrigin(0.5, 0.5);
      this.modeButtons!.add(label);

      const hitZone = this.add.zone(bx, startY, BTN_W, BTN_H);
      hitZone.setOrigin(0, 0);
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => this.editorMode.set(m.mode));
      this.modeButtons!.add(hitZone);
    });
  }

  private updateModeButtonVisuals(): void {
    this.layoutModeButtons();
  }

  // ═══ Render from state ═══

  private renderTilemap(): void {
    const rng = this.mulberry32(42);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const { x, y } = this.isoToScreen(col, row);
        const zoneId = stateGetZoneAt(this.villageState, col, row) ?? 'empty';
        const variant = Math.floor(rng() * 4);

        // Prefer real tile textures, fall back to procedural
        const realKey = `rtile-${zoneId}`;
        const procKey = `tile-${zoneId}`;
        const key = this.textures.exists(realKey) ? realKey : procKey;

        const tile = this.add.image(x, y, key, variant);
        tile.setOrigin(0.5, 0);
        tile.setDepth(-500 + row);
        this.tileSprites.push(tile);
        this.tileContainer.add(tile);
      }
    }
  }

  private renderBuildings(): void {
    for (const building of this.villageState.buildings) {
      const { x, y } = this.isoToScreen(building.col, building.row);
      this.drawBuilding(building.type, x, y, building.row);
    }
  }

  private renderDecorations(): void {
    const rng = this.mulberry32(99);

    for (const deco of this.villageState.decorations) {
      const { x, y } = this.isoToScreen(deco.col, deco.row);

      if (deco.type.startsWith('tree-')) {
        const size = 0.8 + rng() * 0.4;
        this.drawTreeSprite(x, y, deco.type, size, deco.row);
      } else if (deco.type.startsWith('bush-')) {
        rng(); // consume to keep deterministic
        this.drawBushSprite(x, y + 4, deco.type, deco.row);
      } else if (deco.type === 'lantern') {
        rng(); // consume to keep deterministic
        this.drawLanternSprite(x, y, deco.row);
      }
    }
  }

  private renderZoneLabels(): void {
    // Gather unique zones that are painted, show label at their centroid
    const zoneTiles: Record<string, { sumC: number; sumR: number; count: number }> = {};

    for (const [key, zoneId] of Object.entries(this.villageState.zonePaint)) {
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
      const { x, y } = this.isoToScreen(avgCol, avgRow);

      const color = lightenHex(zone.color, 0.3);
      const text = this.add.text(x, y + 30, `${zone.icon} ${zone.name}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#000',
        strokeThickness: 2,
      });
      text.setOrigin(0.5, 0);
      text.setAlpha(0.8);
      text.setDepth(-200);
      this.labelContainer.add(text);
    }
  }

  /** Rebuild everything from state (after placing/removing items) */
  private rebuildScene(): void {
    this.tileContainer.removeAll(true);
    this.buildingContainer.removeAll(true);
    this.decorationContainer.removeAll(true);
    this.labelContainer.removeAll(true);
    this.tileSprites = [];
    this.renderTilemap();
    this.renderBuildings();
    this.renderDecorations();
    this.renderZoneLabels();
    this.agentManager.repositionAll();
  }

  /** Rebuild only tiles (after zone painting) */
  private rebuildTiles(): void {
    this.tileContainer.removeAll(true);
    this.labelContainer.removeAll(true);
    this.tileSprites = [];
    this.renderTilemap();
    this.renderZoneLabels();
  }

  private mulberry32(a: number) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ═══ Buildings ═══

  /**
   * Draw a building — uses real PNG sprite if available, procedural graphics otherwise.
   */
  private drawBuilding(type: string, cx: number, cy: number, row: number): void {
    const key = `building-${type}`;
    const config = BUILDING_CONFIG[type];

    if (this.textures.exists(key) && config) {
      const img = this.add.image(cx, cy, key);
      img.setOrigin(config.originX, config.originY);
      img.setScale(config.scale);
      img.setDepth(-400 + row * 0.1);
      this.buildingContainer.add(img);
    } else {
      this.drawBuildingProcedural(type, cx, cy, row);
    }
  }

  private drawBuildingProcedural(id: string, cx: number, cy: number, row: number): void {
    const g = this.add.graphics();
    g.setDepth(-400 + row * 0.1);
    this.buildingContainer.add(g);

    switch (id) {
      case 'observatory':
        this.drawObservatory(g, cx, cy);
        break;
      case 'workshop':
        this.drawWorkshop(g, cx, cy);
        break;
      case 'fountain':
        this.drawFountain(g, cx, cy);
        break;
      case 'library':
        this.drawLibrary(g, cx, cy);
        break;
      case 'sanctum':
        this.drawSanctum(g, cx, cy);
        break;
    }
  }

  private drawObservatory(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x2d2440);
    g.fillEllipse(x, y + 10, 56, 28);
    g.fillStyle(0x3d3060);
    g.fillRect(x - 14, y - 50, 28, 60);
    g.fillStyle(0x2d2248);
    g.fillRect(x - 14, y - 50, 6, 60);
    g.fillStyle(0x6d5ca8);
    g.fillEllipse(x, y - 50, 36, 18);
    g.fillStyle(0x8d7cc8);
    g.fillEllipse(x - 4, y - 54, 16, 8);
    g.fillStyle(0xc8b8ff);
    g.fillRect(x - 4, y - 30, 8, 12);
    g.fillStyle(0xe8d8ff);
    g.fillRect(x - 2, y - 28, 4, 8);
    g.lineStyle(3, 0x94a3b8);
    g.lineBetween(x + 8, y - 58, x + 24, y - 72);
    g.fillStyle(0xa0b0c8);
    g.fillCircle(x + 24, y - 72, 5);
    g.fillStyle(0xc8b8ff, 0.6);
    for (const [dx, dy] of [[-20, -65], [18, -80], [-28, -55], [25, -60]]) {
      g.fillRect(x + dx, y + dy, 2, 2);
    }
  }

  private drawWorkshop(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x4a3828);
    g.fillTriangle(x, y + 5, x + 30, y + 20, x, y + 35);
    g.fillTriangle(x, y + 5, x - 30, y + 20, x, y + 35);
    g.fillStyle(0x5c4030);
    g.fillRect(x - 24, y - 40, 48, 45);
    g.fillStyle(0x4a3020);
    g.fillRect(x - 24, y - 40, 10, 45);
    g.fillStyle(0x8b5e3c);
    g.fillTriangle(x - 28, y - 40, x, y - 58, x + 28, y - 40);
    g.fillStyle(0x7a4e2c);
    g.fillTriangle(x - 28, y - 40, x - 2, y - 56, x - 2, y - 40);
    g.fillStyle(0x6b4028);
    g.fillRect(x + 10, y - 65, 8, 25);
    g.fillStyle(0xa0a0b4, 0.3);
    g.fillCircle(x + 14, y - 70, 5);
    g.fillCircle(x + 12, y - 78, 4);
    g.fillStyle(0x3a2010);
    g.fillRect(x - 6, y - 14, 12, 18);
    g.fillStyle(0x555566);
    g.fillRect(x + 16, y - 8, 10, 5);
    g.fillRect(x + 18, y - 3, 6, 6);
    g.fillStyle(0x777788);
    g.fillRect(x + 16, y - 8, 10, 2);
    g.fillStyle(0xffb060);
    g.fillRect(x - 18, y - 30, 8, 8);
    g.fillStyle(0xffc880);
    g.fillRect(x - 16, y - 28, 4, 4);
  }

  private drawFountain(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x4a6080);
    g.fillEllipse(x, y + 6, 48, 24);
    g.fillStyle(0x5a90c0);
    g.fillEllipse(x, y + 4, 40, 20);
    g.fillStyle(0x8cc8ff, 0.4);
    g.fillEllipse(x - 4, y + 2, 16, 8);
    g.fillStyle(0x9a9080);
    g.fillRect(x - 4, y - 28, 8, 32);
    g.fillStyle(0xb0a898);
    g.fillRect(x - 3, y - 28, 3, 32);
    g.fillStyle(0xa09888);
    g.fillEllipse(x, y - 28, 24, 12);
    g.lineStyle(2, 0x8cc8ff, 0.6);
    g.lineBetween(x, y - 28, x + 12, y);
    g.lineBetween(x, y - 28, x - 12, y);
  }

  private drawLibrary(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x1e3028);
    g.fillTriangle(x, y + 8, x + 28, y + 22, x, y + 36);
    g.fillTriangle(x, y + 8, x - 28, y + 22, x, y + 36);
    g.fillStyle(0x2a4838);
    g.fillRect(x - 22, y - 42, 44, 50);
    g.fillStyle(0x1e3828);
    g.fillRect(x - 22, y - 42, 8, 50);
    g.fillStyle(0x1a5040);
    g.fillTriangle(x - 26, y - 42, x, y - 56, x + 26, y - 42);
    g.fillStyle(0x4a2810);
    g.fillRect(x - 5, y - 10, 10, 18);
    g.lineStyle(2, 0x5a3820);
    g.beginPath();
    g.arc(x, y - 10, 5, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
    g.strokePath();
    g.fillStyle(0x60c890);
    g.fillRect(x - 16, y - 34, 8, 10);
    g.fillRect(x + 8, y - 34, 8, 10);
    g.fillStyle(0xa04040);
    g.fillRect(x - 14, y - 32, 2, 6);
    g.fillStyle(0x4060a0);
    g.fillRect(x - 11, y - 31, 2, 5);
    g.fillStyle(0xa08040);
    g.fillRect(x + 10, y - 33, 2, 7);
    g.fillStyle(0x60a060);
    g.fillRect(x + 13, y - 32, 2, 6);
    g.fillStyle(0x666677);
    g.fillRect(x + 28, y - 20, 2, 22);
    g.fillStyle(0xffffaa);
    g.fillCircle(x + 29, y - 22, 4);
    g.fillStyle(0xffffb4, 0.15);
    g.fillCircle(x + 29, y - 20, 14);
  }

  private drawSanctum(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x506860);
    g.fillEllipse(x, y + 4, 48, 20);
    g.fillStyle(0x607870, 0.5);
    g.fillEllipse(x, y + 2, 40, 16);
    g.fillStyle(0x90b8a8);
    for (const [dx, dy] of [[-14, -2], [14, -2], [-14, 2], [14, 2]]) {
      g.fillRect(x + dx - 2, y + dy - 36, 4, 38);
      g.fillStyle(0xa8d0c0);
      g.fillRect(x + dx - 3, y + dy - 38, 6, 3);
      g.fillStyle(0x90b8a8);
    }
    g.fillStyle(0xa8d0c0);
    g.fillRect(x - 17, y - 38, 34, 3);
    g.fillStyle(0x5eead4, 0.8);
    g.fillTriangle(x - 20, y - 38, x, y - 52, x + 20, y - 38);
    g.fillStyle(0x4ecaba, 0.6);
    g.fillTriangle(x - 20, y - 38, x - 2, y - 50, x - 2, y - 38);
    g.fillStyle(0x5eead4, 0.15);
    g.fillCircle(x, y - 8, 16);
    g.fillStyle(0x5eead4, 0.3);
    g.fillCircle(x, y - 8, 8);
    g.fillStyle(0xaafff0, 0.6);
    g.fillCircle(x, y - 8, 3);
    g.fillStyle(0x708880);
    g.fillRect(x - 5, y - 4, 10, 6);
    g.fillStyle(0x88a898);
    g.fillRect(x - 4, y - 4, 8, 2);
    const petals = [0x5eead4, 0x80f0e0, 0xa0fff0, 0x60d8c0, 0x90ffe8];
    const flowerPos: [number, number][] = [[-22, 6], [20, 8], [-18, -4], [22, -2], [-6, 12], [8, 12]];
    flowerPos.forEach(([dx, dy], i) => {
      g.fillStyle(petals[i % petals.length], 0.7);
      g.fillRect(x + dx, y + dy, 3, 3);
      g.fillStyle(0x408060);
      g.fillRect(x + dx, y + dy + 3, 3, 2);
    });
  }

  // ═══ Decorations ═══

  private drawTreeSprite(sx: number, sy: number, type: string, size: number, row: number): void {
    if (this.textures.exists(type)) {
      const img = this.add.image(sx, sy, type);
      img.setOrigin(0.5, 0.9);
      img.setScale(size * 0.12);
      img.setDepth(-300 + row * 0.1);
      this.decorationContainer.add(img);
    } else {
      this.drawTreeProcedural(sx, sy, size, row);
    }
  }

  private drawTreeProcedural(sx: number, sy: number, size: number, row: number): void {
    const g = this.add.graphics();
    g.setDepth(-300 + row * 0.1);
    this.decorationContainer.add(g);

    const s = size || 1;
    g.fillStyle(0x5a3820);
    g.fillRect(sx - 2 * s, sy - 8 * s, 4 * s, 12 * s);
    const greens = [0x2a6838, 0x388448, 0x4aa060];
    greens.forEach((c, i) => {
      const r = (12 - i * 3) * s;
      const cy = sy - (12 + i * 8) * s;
      g.fillStyle(c);
      g.fillEllipse(sx, cy, r * 2, r * 1.4);
    });
    g.fillStyle(0x78dc78, 0.2);
    g.fillEllipse(sx - 3 * s, sy - 24 * s, 8 * s, 6 * s);
  }

  private drawBushSprite(sx: number, sy: number, type: string, row: number): void {
    if (this.textures.exists(type)) {
      const img = this.add.image(sx, sy, type);
      img.setOrigin(0.5, 0.9);
      img.setScale(0.08);
      img.setDepth(-300 + row * 0.1);
      this.decorationContainer.add(img);
    } else {
      this.drawBushProcedural(sx, sy, row);
    }
  }

  private drawBushProcedural(sx: number, sy: number, row: number): void {
    const g = this.add.graphics();
    g.setDepth(-300 + row * 0.1);
    this.decorationContainer.add(g);

    g.fillStyle(0x2a5830);
    g.fillEllipse(sx, sy, 16, 10);
    g.fillStyle(0x3a7040);
    g.fillEllipse(sx - 2, sy - 1, 10, 6);
  }

  private drawLanternSprite(sx: number, sy: number, row: number): void {
    if (this.textures.exists('lantern')) {
      const img = this.add.image(sx, sy, 'lantern');
      img.setOrigin(0.5, 0.9);
      img.setScale(0.10);
      img.setDepth(-300 + row * 0.1);
      this.decorationContainer.add(img);
    } else {
      this.drawLanternProcedural(sx, sy, row);
    }
  }

  private drawLanternProcedural(sx: number, sy: number, row: number): void {
    const g = this.add.graphics();
    g.setDepth(-300 + row * 0.1);
    this.decorationContainer.add(g);

    g.fillStyle(0x555566);
    g.fillRect(sx - 1, sy - 16, 2, 18);
    g.fillStyle(0xffd080);
    g.fillCircle(sx, sy - 18, 3);
    g.fillStyle(0xffd080, 0.12);
    g.fillCircle(sx, sy - 16, 12);
  }

  // ═══ Event handling ═══

  private handleEvent(event: VillageEvent): void {
    const agentName = event.data?.agentName as string | undefined;
    const agentId = agentName?.toLowerCase() ?? null;

    switch (event.type) {
      case 'task_assigned': {
        if (!agentId) break;
        const state = this.agentManager.getState(agentId);
        if (state) {
          state.task = (event.data.taskTitle as string) || 'unknown';
          state.status = 'working';
          state.energy = Math.max(10, state.energy - 8);
        }
        const agent = AGENTS.find((a) => a.id === agentId);
        if (agent) this.agentManager.walkToZone(agentId, agent.defaultZone);
        break;
      }
      case 'model_routed': {
        if (!agentId) break;
        const state = this.agentManager.getState(agentId);
        if (state) {
          state.model = (event.data.model as string) || null;
          state.focus = Math.min(100, state.focus + 15);
        }
        const zone = ZONES.find((z) => z.problemType === event.data.problemType);
        if (zone) this.agentManager.walkToZone(agentId, zone.id);
        break;
      }
      case 'task_output': {
        if (!agentId) break;
        const output = event.data.output as string | undefined;
        if (output) this.showBubble(agentId, output.slice(0, 80));
        break;
      }
      case 'agent_completed': {
        if (!agentId) break;
        const state = this.agentManager.getState(agentId);
        if (state) {
          state.status = 'idle';
          state.task = null;
          state.focus = Math.min(100, state.focus + 10);
        }
        this.showBubble(agentId, 'Done!');
        this.time.delayedCall(5000, () => {
          this.agentManager.walkToZone(agentId, 'town-square');
        });
        break;
      }
      case 'agent_failed': {
        if (!agentId) break;
        const state = this.agentManager.getState(agentId);
        if (state) {
          state.status = 'idle';
          state.task = null;
          state.health = Math.max(10, state.health - 15);
        }
        this.showBubble(agentId, 'Task failed...');
        this.time.delayedCall(5000, () => {
          this.agentManager.walkToZone(agentId, 'town-square');
        });
        break;
      }
      case 'agent_started': {
        if (!agentId) break;
        this.showBubble(agentId, 'Starting task...');
        break;
      }
    }
  }

  // ═══ Chat bubble helper ═══

  private showBubble(agentId: string, message: string): void {
    const state = this.agentManager.getState(agentId);
    if (!state) return;
    const pos = this.isoToScreen(state.col, state.row);
    showChatBubble(this, agentId, message, pos.x, pos.y - TEX_H);
  }

  // ═══ Input handling ═══

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.editorMode.isPaint()) {
      this.zonePainter.handlePointerDown(pointer);
      return;
    }

    if (this.editorMode.isBuild()) {
      // If not currently dragging from palette, try to select a placed item
      if (!this.buildingPalette.isDragging) {
        this.buildingPalette.trySelect(pointer);
      }
      return;
    }

    // Play mode — click to inspect agents
    this.handleAgentClick(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.editorMode.isPaint()) {
      this.zonePainter.handlePointerMove(pointer);
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.editorMode.isPaint()) {
      this.zonePainter.handlePointerUp();
    }
  }

  private handleAgentClick(pointer: Phaser.Input.Pointer): void {
    const states = this.agentManager.getAllStates();
    let closest: (typeof states)[0] | null = null;
    let closestDist = 30;

    for (const state of states) {
      const pos = this.isoToScreen(state.col, state.row);
      const d = Math.sqrt(
        (pointer.x - pos.x) ** 2 + (pointer.y - (pos.y - TEX_H / 2)) ** 2
      );
      if (d < closestDist) {
        closest = state;
        closestDist = d;
      }
    }

    if (closest) {
      this.showBubble(
        closest.agent.id,
        `${closest.agent.role} | ${closest.status} | E:${Math.round(closest.energy)}%`
      );
    }
  }

  // ═══ Resize ═══

  private handleResize(): void {
    this.rebuildScene();
    this.buildingPalette.reposition();
    this.zonePainter.reposition();
    this.layoutModeButtons();
  }

  // ═══ Cleanup ═══

  shutdown(): void {
    this.eventBridge?.destroy();
    this.mockMode?.stop();
    this.buildingPalette?.destroy();
    this.zonePainter?.destroy();
  }
}

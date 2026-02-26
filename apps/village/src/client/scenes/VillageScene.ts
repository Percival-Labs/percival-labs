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
import { ZONES } from '../../game/zones';
import { AGENTS } from '../../game/agents';
import { TEX_H } from '../sprites/AgentSprite';
import { AgentManager } from '../systems/AgentManager';
import { EventBridge, type VillageEvent } from '../systems/EventBridge';
import { MockMode } from '../systems/MockMode';
import { AudioManager } from '../systems/AudioManager';
import { VouchBridge } from '../systems/VouchBridge';
import { AudioControls } from '../ui/AudioControls';
import { AgentPanel } from '../ui/AgentPanel';
import { showChatBubble } from '../ui/ChatBubble';
import { ConnectionStatus } from '../ui/ConnectionStatus';
import {
  type VillageState,
  createDefaultState,
} from '../state/VillageState';
import { renderTilemap } from '../rendering/TilemapRenderer';
import { renderBuildings } from '../rendering/BuildingRenderer';
import { renderDecorations } from '../rendering/DecorationRenderer';
import { renderZoneLabels } from '../rendering/ZoneLabelRenderer';
import { saveState, loadState } from '../persistence/StateStore';
import { EditorMode, type EditorModeType } from '../editor/EditorMode';
import { BuildingPalette } from '../editor/BuildingPalette';
import { ZonePainter } from '../editor/ZonePainter';
import { ModeBar } from '../ui/ModeBar';
import { isoToScreen } from '../core/coordinates';
import {
  DEPTH_TILES,
  DEPTH_BUILDINGS,
  DEPTH_DECORATIONS,
  DEPTH_LABELS,
  DEPTH_UI,
  STAT_DECAY_INTERVAL,
} from '../core/constants';

export class VillageScene extends Phaser.Scene {
  // ═══ State ═══
  private villageState!: VillageState;
  private editorMode!: EditorMode;

  // ═══ Systems ═══
  private agentManager!: AgentManager;
  private eventBridge!: EventBridge;
  private mockMode!: MockMode;
  private audioManager!: AudioManager;
  private vouchBridge!: VouchBridge;
  private connectionStatus!: ConnectionStatus;
  private audioControls!: AudioControls;
  private agentPanel!: AgentPanel;
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
  private modeBar!: ModeBar;

  constructor() {
    super({ key: 'VillageScene' });
  }

  init(data: { realTiles?: boolean }): void {
    this.realTiles = data.realTiles ?? false;
  }

  create(): void {
    // Initialize state (try persisted, fall back to default)
    this.villageState = loadState() ?? createDefaultState();

    // Editor mode
    this.editorMode = new EditorMode();
    this.editorMode.onChange((mode, prev) => this.onModeChange(mode, prev));

    // ═══ Container hierarchy ═══
    this.tileContainer = this.add.container(0, 0).setDepth(DEPTH_TILES);
    this.buildingContainer = this.add.container(0, 0).setDepth(DEPTH_BUILDINGS);
    this.decorationContainer = this.add.container(0, 0).setDepth(DEPTH_DECORATIONS);
    this.labelContainer = this.add.container(0, 0).setDepth(DEPTH_LABELS);
    this.uiContainer = this.add.container(0, 0).setDepth(DEPTH_UI);

    // Render from state
    this.renderAll();

    // Agent system
    this.agentManager = new AgentManager(this, this.villageState);
    this.agentManager.createAll();

    // Connection status UI
    this.connectionStatus = new ConnectionStatus(this);

    // Audio
    this.audioManager = new AudioManager();
    this.audioManager.init();
    this.audioControls = new AudioControls(this.audioManager);

    // Vouch trust scores + agent panel
    this.vouchBridge = new VouchBridge();
    this.agentPanel = new AgentPanel(this.vouchBridge);

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
      delay: STAT_DECAY_INTERVAL,
      loop: true,
      callback: () => this.agentManager.decayStats(),
    });

    // ═══ Editor tools ═══
    this.buildingPalette = new BuildingPalette(this, this.villageState);
    this.buildingPalette.onStateChange = () => this.rebuildScene();

    this.zonePainter = new ZonePainter(this, this.villageState);
    this.zonePainter.onStateChange = () => this.rebuildTiles();
    this.zonePainter.hide(); // Hidden until paint mode

    // Mode bar
    this.modeBar = new ModeBar(this, this.editorMode);

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

  private iso(col: number, row: number) {
    return isoToScreen(col, row, this.cameras.main.width);
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

    this.modeBar.layout();
  }

  // ═══ Render from state (delegates to rendering modules) ═══

  private renderAll(): void {
    const vw = this.cameras.main.width;
    this.tileSprites = renderTilemap(this, this.villageState, this.tileContainer);
    renderBuildings(this, this.villageState, this.buildingContainer, vw);
    renderDecorations(this, this.villageState, this.decorationContainer, vw);
    renderZoneLabels(this, this.villageState, this.labelContainer, vw);
  }

  /** Rebuild everything from state (after placing/removing items) */
  private rebuildScene(): void {
    this.tileContainer.removeAll(true);
    this.buildingContainer.removeAll(true);
    this.decorationContainer.removeAll(true);
    this.labelContainer.removeAll(true);
    this.tileSprites = [];
    this.renderAll();
    this.agentManager.repositionAll();
    saveState(this.villageState);
  }

  /** Rebuild only tiles (after zone painting) */
  private rebuildTiles(): void {
    this.tileContainer.removeAll(true);
    this.labelContainer.removeAll(true);
    this.tileSprites = [];
    const vw = this.cameras.main.width;
    this.tileSprites = renderTilemap(this, this.villageState, this.tileContainer);
    renderZoneLabels(this, this.villageState, this.labelContainer, vw);
    saveState(this.villageState);
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
    const pos = this.iso(state.col, state.row);
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
      const pos = this.iso(state.col, state.row);
      const d = Math.sqrt(
        (pointer.x - pos.x) ** 2 + (pointer.y - (pos.y - TEX_H / 2)) ** 2
      );
      if (d < closestDist) {
        closest = state;
        closestDist = d;
      }
    }

    if (closest) {
      this.agentPanel.show(closest);
    } else {
      this.agentPanel.hide();
    }
  }

  // ═══ Resize ═══

  private handleResize(): void {
    this.rebuildScene();
    this.buildingPalette.reposition();
    this.zonePainter.reposition();
    this.modeBar.layout();
  }

  // ═══ Cleanup ═══

  shutdown(): void {
    this.eventBridge?.destroy();
    this.mockMode?.stop();
    this.audioManager?.destroy();
    this.audioControls?.destroy();
    this.agentPanel?.destroy();
    this.buildingPalette?.destroy();
    this.zonePainter?.destroy();
  }
}

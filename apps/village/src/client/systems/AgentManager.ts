/**
 * AgentManager.ts — Agent state, sprites, name labels, and movement tweens.
 *
 * Manages all 9 agents: their sprites, positions, stats (HP/EN/FCS),
 * status, and walking animations via Phaser tweens.
 *
 * Zone lookup now reads from VillageState.zonePaint instead of ZONES bounds.
 */

import Phaser from 'phaser';
import { AGENTS, type VillageAgent } from '../../game/agents';
import { ZONES } from '../../game/zones';
import { TEX_H, DRAW_SCALE } from '../sprites/AgentSprite';
import { type VillageState, findZoneTiles } from '../state/VillageState';
import { isoToScreen } from '../core/coordinates';
import { WALK_SPEED } from '../core/constants';

export interface AgentState {
  agent: VillageAgent;
  sprite: Phaser.GameObjects.Image;
  nameLabel: Phaser.GameObjects.Text;
  col: number;
  row: number;
  zone: string;
  model: string | null;
  task: string | null;
  status: 'idle' | 'working';
  health: number;
  energy: number;
  focus: number;
  walking: boolean;
}

export class AgentManager {
  private scene: Phaser.Scene;
  private villageState: VillageState;
  private states = new Map<string, AgentState>();
  private bobTweens = new Map<string, Phaser.Tweens.Tween>();

  constructor(scene: Phaser.Scene, villageState: VillageState) {
    this.scene = scene;
    this.villageState = villageState;
  }

  private iso(col: number, row: number) {
    return isoToScreen(col, row, this.scene.cameras.main.width);
  }

  createAll(): void {
    for (const agent of AGENTS) {
      const { x, y } = this.iso(agent.startPos[0], agent.startPos[1]);

      const sprite = this.scene.add.image(x, y, `agent-${agent.id}`);
      sprite.setOrigin(0.5, 1); // anchor at feet
      sprite.setDepth(agent.startPos[1]); // depth = row for painter's order
      sprite.setInteractive({ useHandCursor: true });

      const nameLabel = this.scene.add.text(x, y - TEX_H - 4, agent.name, {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: agent.color,
        stroke: '#000',
        strokeThickness: 3,
      });
      nameLabel.setOrigin(0.5, 1);
      nameLabel.setDepth(1000); // labels always on top

      const state: AgentState = {
        agent,
        sprite,
        nameLabel,
        col: agent.startPos[0],
        row: agent.startPos[1],
        zone: agent.defaultZone,
        model: null,
        task: null,
        status: 'idle',
        health: 100,
        energy: 70 + Math.random() * 30,
        focus: 40 + Math.random() * 30,
        walking: false,
      };

      this.states.set(agent.id, state);
    }
  }

  getState(agentId: string): AgentState | undefined {
    return this.states.get(agentId);
  }

  getAllStates(): AgentState[] {
    return Array.from(this.states.values());
  }

  /** Walk agent to a specific grid position */
  walkTo(agentId: string, targetCol: number, targetRow: number): void {
    const state = this.states.get(agentId);
    if (!state) return;

    const dx = targetCol - state.col;
    const dy = targetRow - state.row;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.3) return;

    const duration = (dist / WALK_SPEED) * 1000;

    state.walking = true;
    this.startBob(agentId);

    const startCol = state.col;
    const startRow = state.row;

    this.scene.tweens.add({
      targets: {},
      duration,
      ease: 'Quad.easeInOut',
      onUpdate: (_tween, _target, _key, _value, progress: number) => {
        state.col = startCol + (targetCol - startCol) * progress;
        state.row = startRow + (targetRow - startRow) * progress;

        const pos = this.iso(state.col, state.row);
        state.sprite.setPosition(pos.x, pos.y);
        state.sprite.setDepth(state.row);
        state.nameLabel.setPosition(pos.x, pos.y - TEX_H - 4);
      },
      onComplete: () => {
        state.col = targetCol;
        state.row = targetRow;
        state.walking = false;
        this.stopBob(agentId);

        const pos = this.iso(state.col, state.row);
        state.sprite.setPosition(pos.x, pos.y);
        state.sprite.setDepth(state.row);
        state.nameLabel.setPosition(pos.x, pos.y - TEX_H - 4);
      },
    });
  }

  /**
   * Walk agent to a random position within a zone.
   * Reads painted zone tiles from VillageState instead of rectangular bounds.
   * Falls back to ZONES bounds if no tiles are painted for that zone.
   */
  walkToZone(agentId: string, zoneId: string): void {
    const state = this.states.get(agentId);
    if (state) state.zone = zoneId;

    // Try painted tiles first
    const tiles = findZoneTiles(this.villageState, zoneId);

    let targetCol: number;
    let targetRow: number;

    if (tiles.length > 0) {
      // Pick a random painted tile and add some offset within it
      const [tc, tr] = tiles[Math.floor(Math.random() * tiles.length)];
      targetCol = tc + (Math.random() - 0.5) * 0.8;
      targetRow = tr + (Math.random() - 0.5) * 0.8;
    } else {
      // Fallback: use original zone bounds
      const zone = ZONES.find((z) => z.id === zoneId);
      if (!zone) return;

      const [c0, r0, c1, r1] = zone.bounds;
      const cx = (c0 + c1) / 2;
      const cy = (r0 + r1) / 2;
      targetCol = cx + (Math.random() - 0.5) * (c1 - c0 - 2);
      targetRow = cy + (Math.random() - 0.5) * (r1 - r0 - 2);
    }

    // Random delay 0-2s for natural staggering
    const delay = Math.random() * 2000;
    this.scene.time.delayedCall(delay, () => {
      this.walkTo(agentId, targetCol, targetRow);
    });
  }

  /** Start a bob animation on the sprite while walking */
  private startBob(agentId: string): void {
    if (this.bobTweens.has(agentId)) return;
    const state = this.states.get(agentId);
    if (!state) return;

    const baseY = state.sprite.y;
    const tween = this.scene.tweens.add({
      targets: state.sprite,
      y: baseY - 3,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.bobTweens.set(agentId, tween);
  }

  /** Stop the bob animation */
  private stopBob(agentId: string): void {
    const tween = this.bobTweens.get(agentId);
    if (tween) {
      tween.stop();
      this.bobTweens.delete(agentId);
    }
  }

  /** Reposition all agents after a resize */
  repositionAll(): void {
    for (const state of this.states.values()) {
      const pos = this.iso(state.col, state.row);
      state.sprite.setPosition(pos.x, pos.y);
      state.nameLabel.setPosition(pos.x, pos.y - TEX_H - 4);
    }
  }

  /** Status decay — called every 4 seconds */
  decayStats(): void {
    for (const state of this.states.values()) {
      if (state.status === 'working') {
        state.energy = Math.max(5, state.energy - 0.3);
      } else {
        state.health = Math.min(100, state.health + 0.2);
        state.energy = Math.min(100, state.energy + 0.15);
      }
    }
  }
}

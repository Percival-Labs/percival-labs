/**
 * MockMode.ts — Random chat/movement when SSE is disconnected.
 *
 * Picks a random agent every 6-14 seconds, shows a mock chat message,
 * and with 40% probability moves them to a random zone.
 */

import type { AgentManager } from './AgentManager';
import { AGENTS } from '../../game/agents';
import { ZONES } from '../../game/zones';

type ChatCallback = (agentId: string, message: string) => void;

export class MockMode {
  private active = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private agentManager: AgentManager;
  private onChat: ChatCallback;

  constructor(agentManager: AgentManager, onChat: ChatCallback) {
    this.agentManager = agentManager;
    this.onChat = onChat;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.scheduleNext();
  }

  stop(): void {
    this.active = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  get isActive(): boolean {
    return this.active;
  }

  private scheduleNext(): void {
    if (!this.active) return;

    // Random interval 6-14 seconds
    const delay = 6000 + Math.random() * 8000;
    const timer = setTimeout(() => {
      if (!this.active) return;

      const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
      const msg = agent.messages[Math.floor(Math.random() * agent.messages.length)];
      this.onChat(agent.id, msg);

      // 40% chance to move agent to a random zone
      if (Math.random() < 0.4) {
        const moveDelay = 1000 + Math.random() * 3000;
        const moveTimer = setTimeout(() => {
          if (!this.active) return;
          const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
          this.agentManager.walkToZone(agent.id, zone.id);
        }, moveDelay);
        this.timers.push(moveTimer);
      }

      this.scheduleNext();
    }, delay);
    this.timers.push(timer);
  }
}

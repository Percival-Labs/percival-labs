// Agent Event Bus
// In-memory event system for real-time agent observation.
// Uses Node's EventEmitter (available in Bun) with a rolling log for SSE bootstrap.

import { EventEmitter } from 'node:events';

export type AgentEventType =
  | 'task_submitted'
  | 'task_decomposed'
  | 'task_assigned'
  | 'task_budget_blocked'
  | 'task_output'
  | 'tool_use'
  | 'agent_started'
  | 'agent_completed'
  | 'agent_failed'
  | 'tick_started'
  | 'tick_completed'
  | 'auto_tick_started'
  | 'auto_tick_stopped'
  | 'budget_warning'
  | 'budget_exhausted'
  | 'proposal_created'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'model_routed'
  | 'watcher_blocked'
  | 'watcher_allowed'
  | 'evidence_submitted'
  | 'evidence_rejected'
  | 'ledger_updated'
  | 'task_failed';

export interface AgentEvent {
  id: string;
  type: AgentEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

const MAX_LOG_SIZE = 500;

class AgentEventBus extends EventEmitter {
  private log: AgentEvent[] = [];

  /**
   * Emit a typed agent event. Stores in rolling log and broadcasts to listeners.
   */
  emit(type: 'agent_event', event: AgentEvent): boolean;
  emit(type: string | symbol, ...args: unknown[]): boolean {
    return super.emit(type, ...args);
  }

  /**
   * Publish a new event by type and data. Constructs the full event object.
   */
  publish(type: AgentEventType, data: Record<string, unknown> = {}): AgentEvent {
    const event: AgentEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    // Rolling log — drop oldest when full
    if (this.log.length >= MAX_LOG_SIZE) {
      this.log.shift();
    }
    this.log.push(event);

    this.emit('agent_event', event);
    return event;
  }

  /**
   * Get recent events from the rolling log.
   * @param count Number of recent events to return (default: 50)
   */
  getRecentEvents(count = 50): AgentEvent[] {
    return this.log.slice(-count);
  }

  /**
   * Get all events in the rolling log.
   */
  getAllEvents(): AgentEvent[] {
    return [...this.log];
  }

  /**
   * Get the total number of events emitted (stored in log).
   */
  get eventCount(): number {
    return this.log.length;
  }
}

// Singleton event bus
export const eventBus = new AgentEventBus();

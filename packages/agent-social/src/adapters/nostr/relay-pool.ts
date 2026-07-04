/**
 * Nostr relay pool with connection reuse and health tracking.
 *
 * Previous problems:
 * - One-shot WebSocket per query (opened, queried, closed every time)
 * - relay.nostr.band consistently timed out but stayed in the relay list
 * - No tracking of which relays actually work
 *
 * This implementation:
 * - Maintains persistent WebSocket connections
 * - Tracks success/failure per relay
 * - Automatically skips relays in cooldown
 * - Reconnects on failure
 */

import type { NostrEvent, NostrFilter, RelayResult } from '../../types.js';
import type { StateStore } from '../../core/state-store.js';

interface PendingSub {
  resolve: (events: NostrEvent[]) => void;
  events: NostrEvent[];
  timeout: ReturnType<typeof setTimeout>;
}

export class RelayPool {
  private connections: Map<string, WebSocket> = new Map();
  private pendingSubs: Map<string, PendingSub> = new Map();
  private connecting: Map<string, Promise<WebSocket | null>> = new Map();

  constructor(
    private readonly relays: string[],
    private readonly stateStore: StateStore,
    private readonly queryTimeout = 10_000,
    private readonly connectTimeout = 8_000,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────

  async connect(): Promise<void> {
    const healthy = this.stateStore.getHealthyRelays(this.relays);
    await Promise.allSettled(healthy.map((url) => this.connectRelay(url)));
  }

  async disconnect(): Promise<void> {
    for (const [, ws] of this.connections) {
      try {
        ws.close();
      } catch { /* ignore */ }
    }
    this.connections.clear();
    this.connecting.clear();
    for (const [, sub] of this.pendingSubs) {
      clearTimeout(sub.timeout);
      sub.resolve(sub.events);
    }
    this.pendingSubs.clear();
  }

  // ── Query ──────────────────────────────────────────────────────

  /**
   * Query all healthy relays, deduplicate by event ID, return merged results.
   */
  async query(filter: NostrFilter): Promise<NostrEvent[]> {
    const healthy = this.stateStore.getHealthyRelays(this.relays);
    if (healthy.length === 0) {
      console.warn('[RelayPool] No healthy relays available');
      return [];
    }

    const results = await Promise.allSettled(
      healthy.map((url) => this.queryRelay(url, filter)),
    );

    // Deduplicate by event ID
    const eventMap = new Map<string, NostrEvent>();
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const event of result.value) {
          eventMap.set(event.id, event);
        }
      }
    }

    return Array.from(eventMap.values());
  }

  // ── Publish ────────────────────────────────────────────────────

  /**
   * Publish an event to all healthy relays.
   */
  async publish(event: NostrEvent): Promise<RelayResult[]> {
    const healthy = this.stateStore.getHealthyRelays(this.relays);
    if (healthy.length === 0) {
      console.warn('[RelayPool] No healthy relays available for publish');
      return [];
    }

    return Promise.all(
      healthy.map((url) => this.publishToRelay(url, event)),
    );
  }

  // ── Internal: Connection Management ────────────────────────────

  private async connectRelay(url: string): Promise<WebSocket | null> {
    // Return existing connection if open
    const existing = this.connections.get(url);
    if (existing && existing.readyState === WebSocket.OPEN) {
      return existing;
    }

    // Return in-flight connection promise if connecting
    const inflight = this.connecting.get(url);
    if (inflight) return inflight;

    const promise = new Promise<WebSocket | null>((resolve) => {
      try {
        const ws = new WebSocket(url);
        const timeout = setTimeout(() => {
          ws.close();
          this.stateStore.recordRelayResult(url, false);
          this.connecting.delete(url);
          resolve(null);
        }, this.connectTimeout);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.connections.set(url, ws);
          this.connecting.delete(url);
          this.stateStore.recordRelayResult(url, true);
          resolve(ws);
        };

        ws.onclose = () => {
          this.connections.delete(url);
          this.connecting.delete(url);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          this.connections.delete(url);
          this.connecting.delete(url);
          this.stateStore.recordRelayResult(url, false);
          resolve(null);
        };

        ws.onmessage = (msg) => this.handleMessage(url, msg);
      } catch {
        this.connecting.delete(url);
        this.stateStore.recordRelayResult(url, false);
        resolve(null);
      }
    });

    this.connecting.set(url, promise);
    return promise;
  }

  // ── Internal: Message Handling ─────────────────────────────────

  private handleMessage(relayUrl: string, msg: MessageEvent): void {
    try {
      const data = JSON.parse(String(msg.data)) as unknown[];
      if (!Array.isArray(data)) return;

      const type = data[0];
      const subId = data[1] as string;

      if (type === 'EVENT' && data[2]) {
        const sub = this.pendingSubs.get(subId);
        if (sub) {
          sub.events.push(data[2] as NostrEvent);
        }
      } else if (type === 'EOSE') {
        const sub = this.pendingSubs.get(subId);
        if (sub) {
          clearTimeout(sub.timeout);
          this.pendingSubs.delete(subId);
          this.stateStore.recordRelayResult(relayUrl, true);
          sub.resolve(sub.events);
        }
      } else if (type === 'OK') {
        // Publish acknowledgement — handled by publishToRelay
      }
    } catch {
      // Malformed message — ignore
    }
  }

  // ── Internal: Query Single Relay ───────────────────────────────

  private async queryRelay(
    url: string,
    filter: NostrFilter,
  ): Promise<NostrEvent[]> {
    const ws = await this.connectRelay(url);
    if (!ws) return [];

    const subId = 'q' + Math.random().toString(36).slice(2, 8);

    return new Promise<NostrEvent[]>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingSubs.delete(subId);
        this.stateStore.recordRelayResult(url, false);
        resolve(sub.events);
      }, this.queryTimeout);

      const sub: PendingSub = { resolve, events: [], timeout };
      this.pendingSubs.set(subId, sub);

      try {
        ws.send(JSON.stringify(['REQ', subId, filter]));
      } catch {
        clearTimeout(timeout);
        this.pendingSubs.delete(subId);
        this.stateStore.recordRelayResult(url, false);
        resolve([]);
      }
    });
  }

  // ── Internal: Publish to Single Relay ──────────────────────────

  private async publishToRelay(
    url: string,
    event: NostrEvent,
  ): Promise<RelayResult> {
    const ws = await this.connectRelay(url);
    if (!ws) {
      return { relay: url, ok: false, msg: 'connection failed' };
    }

    return new Promise<RelayResult>((resolve) => {
      const timeout = setTimeout(() => {
        this.stateStore.recordRelayResult(url, false);
        resolve({ relay: url, ok: false, msg: 'timeout' });
      }, this.connectTimeout);

      // Temporarily override message handler for OK response
      const originalHandler = ws.onmessage;
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data)) as unknown[];
          if (data[0] === 'OK' && data[1] === event.id) {
            clearTimeout(timeout);
            ws.onmessage = originalHandler;
            const ok = data[2] === true;
            this.stateStore.recordRelayResult(url, ok);
            resolve({
              relay: url,
              ok,
              msg: typeof data[3] === 'string' ? data[3] : undefined,
            });
            return;
          }
        } catch { /* ignore */ }
        // Not our OK — delegate to normal handler
        if (originalHandler) {
          (originalHandler as (ev: MessageEvent) => void)(msg);
        }
      };

      try {
        ws.send(JSON.stringify(['EVENT', event]));
      } catch {
        clearTimeout(timeout);
        ws.onmessage = originalHandler;
        this.stateStore.recordRelayResult(url, false);
        resolve({ relay: url, ok: false, msg: 'send failed' });
      }
    });
  }

  // ── Health Report ──────────────────────────────────────────────

  getHealthReport(): {
    total: number;
    healthy: number;
    cooldown: number;
    connected: number;
    relays: Array<{
      url: string;
      status: 'connected' | 'healthy' | 'cooldown' | 'unknown';
    }>;
  } {
    const healthy = this.stateStore.getHealthyRelays(this.relays);
    const health = this.stateStore.getRelayHealth();

    return {
      total: this.relays.length,
      healthy: healthy.length,
      cooldown: this.relays.length - healthy.length,
      connected: this.connections.size,
      relays: this.relays.map((url) => {
        const ws = this.connections.get(url);
        const isConnected = ws?.readyState === WebSocket.OPEN;
        const isHealthy = healthy.includes(url);
        return {
          url,
          status: isConnected
            ? 'connected'
            : isHealthy
              ? 'healthy'
              : health[url]?.cooldownUntil
                ? 'cooldown'
                : 'unknown',
        };
      }),
    };
  }
}

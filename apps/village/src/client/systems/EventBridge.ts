/**
 * EventBridge.ts — SSE connection to /events, queues events for game loop.
 *
 * Connects to the server's SSE endpoint, buffers incoming events in a queue,
 * and exposes drain() to be called from update() for frame-safe processing.
 */

export interface VillageEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

type ConnectionCallback = (connected: boolean) => void;

export class EventBridge {
  private queue: VillageEvent[] = [];
  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;
  private _upstreamConnected = false;
  private onConnectionChange: ConnectionCallback;

  constructor(onConnectionChange: ConnectionCallback) {
    this.onConnectionChange = onConnectionChange;
    this.connect();
  }

  get connected(): boolean {
    return this._connected;
  }

  get upstreamConnected(): boolean {
    return this._upstreamConnected;
  }

  /** Drain all queued events. Call from update(). */
  drain(): VillageEvent[] {
    if (this.queue.length === 0) return [];
    const events = this.queue;
    this.queue = [];
    return events;
  }

  destroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private connect(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const evtSource = new EventSource('/events');
    this.eventSource = evtSource;

    evtSource.onopen = () => {
      this._connected = true;
    };

    evtSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as VillageEvent;
        if (parsed.type === 'connected') {
          this._upstreamConnected = !!parsed.data?.upstream;
          this.onConnectionChange(this._upstreamConnected);
          return;
        }
        this.queue.push(parsed);
      } catch {
        // Skip malformed events
      }
    };

    evtSource.onerror = () => {
      this._connected = false;
      this._upstreamConnected = false;
      this.onConnectionChange(false);
      evtSource.close();
      this.eventSource = null;

      // Reconnect after 10s
      this.reconnectTimer = setTimeout(() => this.connect(), 10_000);
    };
  }
}

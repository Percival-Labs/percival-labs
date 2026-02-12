/**
 * event-proxy.ts — SSE proxy between agents service and terrarium browser clients.
 *
 * Connects to the agents SSE endpoint, buffers events, maps agent IDs to
 * terrarium display names, and re-emits to browser clients.
 * Falls back to ambient mock messages when agents service is unreachable.
 */

// --- Agent name mapping: backend identity name → terrarium display name ---

const AGENT_NAME_MAP: Record<string, string> = {
  coordinator: "Percy",
  builder: "Forge",
  reviewer: "Sage",
  auditor: "Relay",
  researcher: "Scout",
  artist: "Pixel",
};

interface ProxiedEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

type EventListener = (event: ProxiedEvent) => void;

export class EventProxy {
  private buffer: ProxiedEvent[] = [];
  private maxBuffer = 50;
  private listeners = new Set<EventListener>();
  private agentsUrl: string;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;

  constructor(agentsBaseUrl: string = "http://localhost:3200") {
    this.agentsUrl = `${agentsBaseUrl}/v1/agents/events`;
    this.connect();
  }

  /** Whether we have an active connection to the agents SSE */
  get isConnected(): boolean {
    return this.connected;
  }

  /** Get recent buffered events */
  getRecentEvents(count = 50): ProxiedEvent[] {
    return this.buffer.slice(-count);
  }

  /** Subscribe to new events */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Shut down the proxy cleanly */
  destroy(): void {
    if (this.abortController) this.abortController.abort();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.listeners.clear();
  }

  // --- Internal ---

  private async connect(): Promise<void> {
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    try {
      const response = await fetch(this.agentsUrl, {
        signal: this.abortController.signal,
        headers: { Accept: "text/event-stream" },
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.connected = true;
      console.log("[event-proxy] Connected to agents SSE");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partial = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partial += decoder.decode(value, { stream: true });
        const lines = partial.split("\n");
        partial = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            this.handleSSEData(line.slice(6));
          }
        }
      }

      // Stream ended normally
      this.handleDisconnect();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.log("[event-proxy] Cannot reach agents service, running in mock mode");
      this.handleDisconnect();
    }
  }

  private handleSSEData(jsonStr: string): void {
    try {
      const raw = JSON.parse(jsonStr);

      // Skip connection/heartbeat events
      if (raw.type === "connected" || raw.type === "heartbeat") return;

      const event = this.mapEvent(raw);
      if (!event) return;

      this.buffer.push(event);
      if (this.buffer.length > this.maxBuffer) {
        this.buffer = this.buffer.slice(-this.maxBuffer);
      }

      for (const listener of this.listeners) {
        listener(event);
      }
    } catch {
      // Skip malformed events
    }
  }

  private mapEvent(raw: Record<string, unknown>): ProxiedEvent | null {
    const data = (raw.data || {}) as Record<string, unknown>;

    // Map backend agent name to terrarium display name
    const backendName = (data.agentName as string) || "";
    const displayName =
      AGENT_NAME_MAP[backendName.toLowerCase()] || backendName;

    return {
      id: (raw.id as string) || crypto.randomUUID(),
      type: raw.type as string,
      timestamp: (raw.timestamp as string) || new Date().toISOString(),
      data: { ...data, agentName: displayName },
    };
  }

  private handleDisconnect(): void {
    this.connected = false;
    console.log("[event-proxy] Disconnected, reconnecting in 10s...");
    this.reconnectTimer = setTimeout(() => this.connect(), 10_000);
  }
}

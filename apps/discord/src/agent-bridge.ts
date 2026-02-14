// Percival Labs — Agent Bridge
// SSE consumer + API client for the agents service.
// Adapts the terrarium EventProxy pattern for Discord integration.

interface AgentEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

type EventListener = (event: AgentEvent) => void;

export class AgentBridge {
  private buffer: AgentEvent[] = [];
  private maxBuffer = 100;
  private listeners = new Set<EventListener>();
  private baseUrl: string;
  private apiKey: string;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;

  constructor(agentsBaseUrl: string, apiKey: string) {
    this.baseUrl = agentsBaseUrl;
    this.apiKey = apiKey;
    this.connect();
  }

  get isConnected(): boolean {
    return this.connected;
  }

  getRecentEvents(count = 50): AgentEvent[] {
    return this.buffer.slice(-count);
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    if (this.abortController) this.abortController.abort();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.listeners.clear();
  }

  // ── API Client Methods ──

  async submitTask(
    title: string,
    description: string,
    priority: string,
    requireApproval: boolean,
  ): Promise<{ taskId: string; status: string }> {
    const res = await this.api('POST', '/v1/agents/tasks', {
      title,
      description,
      priority,
      requireApproval,
    });
    return res as { taskId: string; status: string };
  }

  async approveProposal(parentId: string): Promise<void> {
    await this.api('POST', `/v1/agents/proposals/${parentId}/approve`);
  }

  async rejectProposal(parentId: string): Promise<void> {
    await this.api('POST', `/v1/agents/proposals/${parentId}/reject`);
  }

  async getStatus(): Promise<Record<string, unknown>> {
    return this.api('GET', '/v1/agents/status') as Promise<Record<string, unknown>>;
  }

  async getBudget(): Promise<Record<string, unknown>> {
    return this.api('GET', '/v1/agents/budget') as Promise<Record<string, unknown>>;
  }

  async getProposals(): Promise<Record<string, unknown>> {
    return this.api('GET', '/v1/agents/proposals') as Promise<Record<string, unknown>>;
  }

  async getTasks(): Promise<Record<string, unknown>> {
    return this.api('GET', '/v1/agents/tasks') as Promise<Record<string, unknown>>;
  }

  async startAutoTick(): Promise<void> {
    await this.api('POST', '/v1/agents/auto-tick/start');
  }

  async stopAutoTick(): Promise<void> {
    await this.api('POST', '/v1/agents/auto-tick/stop');
  }

  // ── Internal: SSE Connection ──

  private async connect(): Promise<void> {
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${this.baseUrl}/v1/agents/events`, {
        signal: this.abortController.signal,
        headers: {
          Accept: 'text/event-stream',
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.connected = true;
      console.log('[agent-bridge] Connected to agents SSE');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partial = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partial += decoder.decode(value, { stream: true });
        const lines = partial.split('\n');
        partial = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            this.handleSSEData(line.slice(6));
          }
        }
      }

      this.handleDisconnect();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.log('[agent-bridge] Cannot reach agents service, retrying in 10s...');
      this.handleDisconnect();
    }
  }

  private handleSSEData(jsonStr: string): void {
    try {
      const raw = JSON.parse(jsonStr);
      if (raw.type === 'connected' || raw.type === 'heartbeat') return;

      const event: AgentEvent = {
        id: raw.id || crypto.randomUUID(),
        type: raw.type,
        timestamp: raw.timestamp || new Date().toISOString(),
        data: raw.data || {},
      };

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

  private handleDisconnect(): void {
    this.connected = false;
    console.log('[agent-bridge] Disconnected, reconnecting in 10s...');
    this.reconnectTimer = setTimeout(() => this.connect(), 10_000);
  }

  // ── Internal: HTTP API ──

  private async api(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
    };
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Agent API ${method} ${path} failed: ${res.status} ${text}`);
    }

    return res.json();
  }
}

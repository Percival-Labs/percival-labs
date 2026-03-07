const GATEWAY_URL = "https://gateway.percival-labs.ai/auto/v1";
const LOCAL_URL = "http://localhost:3939";

export interface EngineEvent {
  type: "token" | "done" | "error";
  data: string;
}

export interface EngineInfo {
  version: string;
  model: string;
  status: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
}

export interface EngineConfig {
  method: "gateway" | "byok";
  apiKey?: string;
  agentKey?: string;
}

function buildHeaders(config?: EngineConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config?.method === "gateway" && config.agentKey) {
    headers["X-Vouch-Auth"] = `AgentKey ${config.agentKey}`;
  }

  return headers;
}

function getBaseUrl(config?: EngineConfig): string {
  return config?.method === "gateway" ? GATEWAY_URL : LOCAL_URL;
}

async function* streamSSE(
  url: string,
  body: unknown,
  headers: Record<string, string>
): AsyncGenerator<EngineEvent> {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    yield { type: "error", data: `Engine returned ${response.status}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", data: "No response stream" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          yield { type: "done", data: "" };
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield { type: "token", data: content };
          }
        } catch {
          // Non-JSON SSE data, treat as raw token
          yield { type: "token", data };
        }
      }
    }
  }

  yield { type: "done", data: "" };
}

export function useEngine(config?: EngineConfig) {
  const baseUrl = getBaseUrl(config);
  const headers = buildHeaders(config);

  function sendMessage(text: string): AsyncGenerator<EngineEvent> {
    const chatUrl =
      config?.method === "gateway"
        ? `${baseUrl}/chat/completions`
        : `${baseUrl}/v1/chat/completions`;

    return streamSSE(
      chatUrl,
      {
        messages: [{ role: "user", content: text }],
        stream: true,
      },
      headers
    );
  }

  async function sendCommand(cmd: string): Promise<CommandResult> {
    try {
      const res = await fetch(`${baseUrl}/command`, {
        method: "POST",
        headers,
        body: JSON.stringify({ command: cmd }),
      });
      return await res.json();
    } catch {
      return { success: false, output: "Failed to connect to engine" };
    }
  }

  async function getInfo(): Promise<EngineInfo | null> {
    try {
      const res = await fetch(`${baseUrl}/info`, { headers });
      return await res.json();
    } catch {
      return null;
    }
  }

  return { sendMessage, sendCommand, getInfo };
}

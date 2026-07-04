import { useState, useRef, useEffect, useCallback } from "react";
import { useEngine } from "../hooks/useEngine";
import type { EngramConfig } from "../App";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "tool" | "error" | "status";
  content: string;
}

interface HttpTerminalProps {
  config: EngramConfig;
}

export default function HttpTerminal({ config }: HttpTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const engineConfig = config.connection.method === "team-server"
    ? {
        method: "team-server" as const,
        teamServerUrl: config.teamConfig?.serverUrl,
        authToken: config.teamConfig?.authToken,
      }
    : {
        method: config.connection.method,
        apiKey: config.connection.apiKey,
        agentKey: config.connection.agentKey,
      };

  const { sendMessage, sendCommand } = useEngine(engineConfig);

  // Add initial status line
  useEffect(() => {
    const label =
      config.connection.method === "team-server"
        ? `Connected to ${config.teamConfig?.teamName || "team server"}`
        : config.connection.method === "gateway"
          ? "Connected via Engram Gateway"
          : "Connected to local engine";

    setLines([
      { id: "status-0", type: "status", content: label },
      { id: "status-1", type: "status", content: `Type a message or /command. Press Enter to send.` },
    ]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on click
  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const addLine = useCallback((line: Omit<TerminalLine, "id">) => {
    setLines((prev) => [...prev, { ...line, id: `line-${Date.now()}-${Math.random()}` }]);
  }, []);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    // Add to history
    setHistory((prev) => [text, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    addLine({ type: "input", content: text });
    setInput("");
    setIsProcessing(true);

    try {
      if (text.startsWith("/")) {
        // Slash command
        const result = await sendCommand(text);
        addLine({
          type: result.success ? "output" : "error",
          content: result.output,
        });
      } else {
        // Chat message — stream response
        const stream = sendMessage([{ role: "user", content: text }]);
        let fullContent = "";
        const outputId = `output-${Date.now()}`;

        setLines((prev) => [
          ...prev,
          { id: outputId, type: "output", content: "" },
        ]);

        for await (const event of stream) {
          if (event.type === "token") {
            fullContent += event.data;
            setLines((prev) =>
              prev.map((l) =>
                l.id === outputId ? { ...l, content: fullContent } : l
              )
            );
          } else if (event.type === "error") {
            setLines((prev) =>
              prev.map((l) =>
                l.id === outputId
                  ? { ...l, type: "error", content: event.data }
                  : l
              )
            );
            break;
          }
        }
      }
    } catch (err) {
      addLine({
        type: "error",
        content: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div
      className="h-full flex flex-col font-mono text-sm"
      style={{ background: "#0f0f14" }}
      onClick={handleContainerClick}
    >
      {/* Scrollback */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {lines.map((line) => (
          <div key={line.id}>
            {line.type === "input" && (
              <div className="flex gap-2">
                <span style={{ color: "#818cf8" }}>&gt;</span>
                <span style={{ color: "#e2e2e9" }}>{line.content}</span>
              </div>
            )}
            {line.type === "output" && (
              <div
                className="pl-4 whitespace-pre-wrap"
                style={{ color: "#a9b1d6" }}
              >
                {line.content || (isProcessing ? "..." : "")}
              </div>
            )}
            {line.type === "tool" && (
              <div
                className="ml-4 my-1 px-3 py-2 rounded border"
                style={{
                  borderColor: "#33467c",
                  background: "#15161e",
                  color: "#7dcfff",
                }}
              >
                {line.content}
              </div>
            )}
            {line.type === "error" && (
              <div className="pl-4" style={{ color: "#f7768e" }}>
                {line.content}
              </div>
            )}
            {line.type === "status" && (
              <div style={{ color: "#414868" }}>{line.content}</div>
            )}
          </div>
        ))}
      </div>

      {/* Input line */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t"
        style={{ borderColor: "#1a1b26" }}
      >
        <span style={{ color: "#818cf8" }}>&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isProcessing ? "Processing..." : ""}
          disabled={isProcessing}
          autoFocus
          className="flex-1 bg-transparent outline-none disabled:opacity-50"
          style={{ color: "#e2e2e9", caretColor: "#818cf8" }}
        />
      </div>
    </div>
  );
}

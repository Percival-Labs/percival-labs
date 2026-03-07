import { useState, useRef, useEffect } from "react";
import ChatMessage, { TypingIndicator } from "../components/ChatMessage";
import { useEngine } from "../hooks/useEngine";
import type { EngramConfig } from "../App";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface ChatProps {
  config: EngramConfig;
}

export default function Chat({ config }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hey ${config.userName}! I'm ${config.aiName || "Engram"}, ready to help. What's on your mind?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useEngine({
    method: config.connection.method,
    apiKey: config.connection.apiKey,
    agentKey: config.connection.agentKey,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = `assistant-${Date.now()}`;

    try {
      const stream = sendMessage(text);
      let fullContent = "";

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ]);

      for await (const event of stream) {
        if (event.type === "token") {
          fullContent += event.data;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullContent, isStreaming: true }
                : m
            )
          );
        } else if (event.type === "error") {
          fullContent += `\n\n*Error: ${event.data}*`;
          break;
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: fullContent, isStreaming: false }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  config.connection.method === "gateway"
                    ? `Could not reach the Engram Gateway. Check your internet connection and AgentKey.`
                    : `Could not reach the Engram engine. Make sure it's running on port 3939.\n\n\`engram serve-http\``,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-1">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
          />
        ))}
        {isLoading &&
          !messages.some((m) => m.isStreaming) && <TypingIndicator />}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-surface-800 p-4 bg-surface-900/50"
      >
        <div className="flex gap-3 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${config.aiName || "Engram"}...`}
            rows={1}
            className="wizard-input resize-none min-h-[44px] max-h-[120px]"
            style={{
              height: "auto",
              height: `${Math.min(input.split("\n").length * 22 + 22, 120)}px`,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="wizard-button disabled:opacity-40 disabled:cursor-not-allowed h-[44px]"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

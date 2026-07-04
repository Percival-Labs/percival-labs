import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function ChatMessage({
  role,
  content,
  isStreaming,
}: ChatMessageProps) {
  return (
    <div
      className={`flex ${role === "user" ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={
          role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
        }
      >
        {role === "assistant" ? (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        ) : (
          <p>{content}</p>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="chat-bubble-assistant flex items-center gap-1.5 py-3">
        <span className="typing-dot w-2 h-2 bg-surface-400 rounded-full inline-block" />
        <span className="typing-dot w-2 h-2 bg-surface-400 rounded-full inline-block" />
        <span className="typing-dot w-2 h-2 bg-surface-400 rounded-full inline-block" />
      </div>
    </div>
  );
}

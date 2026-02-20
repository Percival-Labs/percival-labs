import { Bot, User } from "lucide-react";

interface AuthorBadgeProps {
  authorId: string;
  authorType: "agent" | "user";
}

export function AuthorBadge({ authorId, authorType }: AuthorBadgeProps) {
  const isAgent = authorType === "agent";

  return (
    <span className="inline-flex items-center gap-1.5">
      {isAgent ? (
        <Bot className="h-3.5 w-3.5 text-pl-cyan" />
      ) : (
        <User className="h-3.5 w-3.5 text-pl-green" />
      )}
      <span className="text-sm text-pl-text-secondary font-medium">
        {authorId.slice(0, 12)}
      </span>
      <span
        className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
          isAgent
            ? "bg-pl-cyan/10 text-pl-cyan"
            : "bg-pl-green/10 text-pl-green"
        }`}
      >
        {isAgent ? "agent" : "human"}
      </span>
    </span>
  );
}

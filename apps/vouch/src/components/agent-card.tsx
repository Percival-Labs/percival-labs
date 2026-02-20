import Link from "next/link";
import { Bot, ShieldCheck, ShieldX } from "lucide-react";
import type { Agent } from "@/lib/api";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group block rounded-xl border border-pl-border bg-pl-surface p-5 hover:border-pl-cyan/30 hover:bg-pl-surface-hover transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pl-cyan/10 border border-pl-cyan/30 flex items-center justify-center">
          <Bot className="h-5 w-5 text-pl-cyan" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-pl-text group-hover:text-pl-cyan transition-colors truncate">
              {agent.name}
            </h3>
            {agent.verified ? (
              <ShieldCheck className="h-4 w-4 text-pl-green flex-shrink-0" />
            ) : (
              <ShieldX className="h-4 w-4 text-pl-text-dim flex-shrink-0" />
            )}
          </div>

          {agent.model_family && (
            <p className="mt-0.5 text-xs text-pl-text-dim font-mono">
              {agent.model_family}
            </p>
          )}
        </div>
      </div>

      {agent.description && (
        <p className="mt-3 text-sm text-pl-text-muted leading-relaxed line-clamp-2">
          {agent.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-pl-text-dim">Vouch</span>
          <div className="w-20 h-1.5 rounded-full bg-pl-border overflow-hidden">
            <div
              className="h-full rounded-full bg-pl-cyan transition-all"
              style={{ width: `${Math.min(Math.max(agent.trust_score / 10, 0), 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono text-pl-text-muted">
            {agent.trust_score}
          </span>
        </div>
      </div>
    </Link>
  );
}

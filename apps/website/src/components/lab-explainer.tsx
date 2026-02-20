"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function LabExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-pl-border bg-pl-surface">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-pl-surface-hover transition-colors rounded-xl"
      >
        <span className="text-sm font-medium text-pl-text-secondary">
          What am I looking at?
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-pl-text-muted transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-pl-border px-6 py-5 space-y-4">
          <p className="text-sm text-pl-text-secondary leading-relaxed">
            Welcome to The Lab &mdash; a real-time observation window into our
            agent workspace.
          </p>
          <p className="text-sm text-pl-text-secondary leading-relaxed">
            Six AI agents &mdash; Percy, Scout, Pixel, Sage, Forge, and Relay
            &mdash; work autonomously on building Engram. Each agent has a
            specialized role: Percy architects, Scout researches, Pixel designs,
            Sage critiques, Forge builds, and Relay monitors operations.
          </p>
          <p className="text-sm text-pl-text-secondary leading-relaxed">
            The agents receive tasks via SSE (Server-Sent Events) and you can
            watch their thought bubbles, status changes, and interactions in
            real time.
          </p>
          <p className="text-sm text-pl-text-muted leading-relaxed">
            This is running live on our development servers. If you see
            &ldquo;Waiting for connection,&rdquo; the agents are between tasks.
          </p>
        </div>
      )}
    </div>
  );
}

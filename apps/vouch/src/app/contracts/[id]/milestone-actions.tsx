"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { ContractMilestone } from "@/lib/api";

const API_BASE = "/api/vouch";

interface MilestoneActionsProps {
  contractId: string;
  milestone: ContractMilestone;
}

type ActionState = "idle" | "loading" | "reject_input" | "submit_input";

export function MilestoneActions({
  contractId,
  milestone,
}: MilestoneActionsProps) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [deliverableNotes, setDeliverableNotes] = useState("");

  const inputClass =
    "w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none font-mono text-sm";

  async function callAction(
    action: string,
    body?: Record<string, unknown>,
  ) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/v1/contracts/${contractId}/milestones/${milestone.id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: body ? JSON.stringify(body) : undefined,
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `API error: ${res.status}`);
      }

      router.refresh();
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setState("idle");
    } finally {
      setIsLoading(false);
    }
  }

  // Only show actions for actionable states
  if (milestone.is_retention) return null;

  return (
    <div className="mt-3 pt-3 border-t border-pl-border/50">
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 mb-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Pending: Agent can start work */}
      {milestone.status === "pending" && (
        <button
          onClick={() => callAction("start")}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-pl-cyan/10 px-3 py-1.5 text-xs font-medium text-pl-cyan hover:bg-pl-cyan/20 transition-colors disabled:opacity-40"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Start Work
        </button>
      )}

      {/* In Progress: Agent can submit deliverable */}
      {milestone.status === "in_progress" && (
        <>
          {state === "submit_input" ? (
            <div className="space-y-2">
              <input
                type="text"
                value={deliverableUrl}
                onChange={(e) => setDeliverableUrl(e.target.value)}
                placeholder="Deliverable URL (optional)"
                className={inputClass}
              />
              <input
                type="text"
                value={deliverableNotes}
                onChange={(e) => setDeliverableNotes(e.target.value)}
                placeholder="Notes (optional)"
                className={inputClass}
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    callAction("submit", {
                      deliverable_url: deliverableUrl || undefined,
                      deliverable_notes: deliverableNotes || undefined,
                    })
                  }
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pl-cyan px-3 py-1.5 text-xs font-medium text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-40"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Submit
                </button>
                <button
                  onClick={() => setState("idle")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pl-surface px-3 py-1.5 text-xs font-medium text-pl-text-dim hover:text-pl-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setState("submit_input")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pl-cyan/10 px-3 py-1.5 text-xs font-medium text-pl-cyan hover:bg-pl-cyan/20 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Submit Deliverable
            </button>
          )}
        </>
      )}

      {/* Submitted: Customer can accept or reject */}
      {milestone.status === "submitted" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => callAction("accept")}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-pl-green/10 px-3 py-1.5 text-xs font-medium text-pl-green hover:bg-pl-green/20 transition-colors disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Accept
          </button>

          {state === "reject_input" ? (
            <div className="flex-1 min-w-0 space-y-2">
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                className={inputClass}
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    callAction("reject", {
                      rejection_reason: rejectionReason || undefined,
                    })
                  }
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  onClick={() => setState("idle")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pl-surface px-3 py-1.5 text-xs font-medium text-pl-text-dim hover:text-pl-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setState("reject_input")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Upload,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { ContractMilestone, MilestoneStatus } from "@/lib/api";

const API_BASE = "/api/vouch";

type ActionView = "idle" | "submit_form" | "reject_form" | "loading" | "success" | "error";

interface MilestoneActionsProps {
  milestone: ContractMilestone;
  contractId: string;
  userRole: "customer" | "agent";
  onAction?: () => void;
}

const statusLabels: Record<MilestoneStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  submitted: "Awaiting Review",
  accepted: "Accepted",
  rejected: "Rejected",
  released: "Released",
};

export function MilestoneActions({
  milestone,
  contractId,
  userRole,
  onAction,
}: MilestoneActionsProps) {
  const [view, setView] = useState<ActionView>("idle");
  const [error, setError] = useState<string | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [deliverableNotes, setDeliverableNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  async function apiCall(action: string, body: Record<string, unknown>) {
    setView("loading");
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/v1/contracts/${contractId}/milestones/${milestone.id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `Action failed: ${res.status}`);
      }
      setView("success");
      setTimeout(() => onAction?.(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setView("error");
    }
  }

  function handleSubmit() {
    apiCall("submit", {
      deliverable_url: deliverableUrl || undefined,
      deliverable_notes: deliverableNotes || undefined,
    });
  }

  function handleAccept() {
    apiCall("accept", {});
  }

  function handleReject() {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }
    apiCall("reject", { reason: rejectionReason.trim() });
  }

  // Customer sees Accept/Reject when milestone is submitted
  if (milestone.status === "submitted" && userRole === "customer") {
    return (
      <div className="space-y-3">
        {view === "idle" && (
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 rounded-lg bg-pl-green/20 border border-pl-green/30 py-2 text-sm font-medium text-pl-green hover:bg-pl-green/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Accept
            </button>
            <button
              onClick={() => setView("reject_form")}
              className="flex-1 rounded-lg bg-red-400/10 border border-red-400/20 py-2 text-sm font-medium text-red-400 hover:bg-red-400/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        )}

        {view === "reject_form" && (
          <div className="space-y-2">
            <label className="text-xs text-pl-text-dim">Reason for rejection</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setError(null);
              }}
              placeholder="Describe what needs to be changed..."
              rows={3}
              className="w-full rounded-lg border border-pl-border bg-pl-bg px-3 py-2 text-sm text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none"
            />
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setView("idle");
                  setRejectionReason("");
                  setError(null);
                }}
                className="flex-1 rounded-lg border border-pl-border py-2 text-sm text-pl-text-muted hover:text-pl-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 rounded-lg bg-red-400 py-2 text-sm font-semibold text-pl-bg hover:bg-red-400/80 transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                Confirm Reject
              </button>
            </div>
          </div>
        )}

        {view === "loading" && (
          <div className="flex items-center justify-center gap-2 py-3 text-pl-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-pl-cyan" />
            <span className="text-sm">Processing...</span>
          </div>
        )}

        {view === "success" && (
          <div className="flex items-center justify-center gap-2 py-3 text-pl-green">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Done!</span>
          </div>
        )}

        {view === "error" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
            <button
              onClick={() => setView("idle")}
              className="text-xs text-pl-text-muted hover:text-pl-text transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  // Agent sees Submit when milestone is pending, in_progress, or rejected
  if (
    (milestone.status === "pending" ||
      milestone.status === "in_progress" ||
      milestone.status === "rejected") &&
    userRole === "agent"
  ) {
    return (
      <div className="space-y-3">
        {view === "idle" && (
          <button
            onClick={() => setView("submit_form")}
            className="w-full rounded-lg bg-pl-cyan/20 border border-pl-cyan/30 py-2 text-sm font-medium text-pl-cyan hover:bg-pl-cyan/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Submit Deliverable
          </button>
        )}

        {view === "submit_form" && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-pl-text-dim">Deliverable URL (optional)</label>
              <input
                type="url"
                value={deliverableUrl}
                onChange={(e) => setDeliverableUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-3 py-2 text-sm text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-pl-text-dim">Notes (optional)</label>
              <textarea
                value={deliverableNotes}
                onChange={(e) => setDeliverableNotes(e.target.value)}
                placeholder="Describe what was completed..."
                rows={3}
                className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-3 py-2 text-sm text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setView("idle");
                  setDeliverableUrl("");
                  setDeliverableNotes("");
                  setError(null);
                }}
                className="flex-1 rounded-lg border border-pl-border py-2 text-sm text-pl-text-muted hover:text-pl-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 rounded-lg bg-pl-cyan py-2 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Submit
              </button>
            </div>
          </div>
        )}

        {view === "loading" && (
          <div className="flex items-center justify-center gap-2 py-3 text-pl-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-pl-cyan" />
            <span className="text-sm">Submitting...</span>
          </div>
        )}

        {view === "success" && (
          <div className="flex items-center justify-center gap-2 py-3 text-pl-green">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Submitted!</span>
          </div>
        )}

        {view === "error" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
            <button
              onClick={() => setView("idle")}
              className="text-xs text-pl-text-muted hover:text-pl-text transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default: show status text
  return (
    <div className="text-xs text-pl-text-dim">
      {statusLabels[milestone.status] ?? milestone.status}
    </div>
  );
}

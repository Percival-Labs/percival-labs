"use client";

import { useState } from "react";
import { X, FileEdit, Loader2, AlertCircle, CheckCircle } from "lucide-react";

const API_BASE = "/api/vouch";

type DialogState = "form" | "submitting" | "success" | "error";

interface ChangeOrderDialogProps {
  contractId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangeOrderDialog({
  contractId,
  onClose,
  onSuccess,
}: ChangeOrderDialogProps) {
  const [state, setState] = useState<DialogState>("form");
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [costDelta, setCostDelta] = useState("");
  const [timelineDelta, setTimelineDelta] = useState("");

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    setState("submitting");
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/v1/contracts/${contractId}/change-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            cost_delta_sats: parseInt(costDelta, 10) || 0,
            timeline_delta_days: parseInt(timelineDelta, 10) || 0,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error?.message || `Failed to create change order: ${res.status}`
        );
      }

      setState("success");
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create change order");
      setState("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-pl-border bg-pl-surface p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-pl-text-dim hover:text-pl-text transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-pl-text flex items-center gap-2">
          <FileEdit className="h-5 w-5 text-pl-cyan" />
          Propose Change Order
        </h2>
        <p className="mt-1 text-sm text-pl-text-muted">
          Propose a scope, cost, or timeline change for review.
        </p>

        {/* Form */}
        {(state === "form" || state === "error") && (
          <div className="mt-5 space-y-3">
            <div>
              <label className="text-xs text-pl-text-dim">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError(null);
                }}
                placeholder="Brief summary of the change"
                className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-sm text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-pl-text-dim">Description</label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setError(null);
                }}
                placeholder="Detailed explanation of what is changing and why..."
                rows={4}
                className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-sm text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-pl-text-dim">
                  Cost change (sats)
                </label>
                <input
                  type="number"
                  value={costDelta}
                  onChange={(e) => setCostDelta(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-sm text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none font-mono"
                />
                <p className="mt-0.5 text-[10px] text-pl-text-dim">
                  Positive = cost increase, negative = decrease
                </p>
              </div>
              <div>
                <label className="text-xs text-pl-text-dim">
                  Timeline change (days)
                </label>
                <input
                  type="number"
                  value={timelineDelta}
                  onChange={(e) => setTimelineDelta(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-sm text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none font-mono"
                />
                <p className="mt-0.5 text-[10px] text-pl-text-dim">
                  Positive = extension, negative = reduction
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-pl-border py-2.5 text-sm text-pl-text-muted hover:text-pl-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !description.trim()}
                className="flex-1 rounded-lg bg-pl-cyan py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileEdit className="h-4 w-4" />
                Propose
              </button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {state === "submitting" && (
          <div className="mt-8 flex flex-col items-center gap-3 text-pl-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-pl-cyan" />
            <p className="text-sm">Submitting change order...</p>
          </div>
        )}

        {/* Success */}
        {state === "success" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pl-green/20">
              <CheckCircle className="h-6 w-6 text-pl-green" />
            </div>
            <p className="text-sm font-medium text-pl-green">
              Change order proposed!
            </p>
            <p className="text-xs text-pl-text-muted">
              The other party will be notified for review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

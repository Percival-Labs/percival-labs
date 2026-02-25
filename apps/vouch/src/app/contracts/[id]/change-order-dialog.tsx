"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  GitPullRequestArrow,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatSats } from "@/lib/format";

const API_BASE = "/api/vouch";

interface ChangeOrderDialogProps {
  contractId: string;
}

type DialogState = "closed" | "open" | "submitting";

export function ChangeOrderDialog({ contractId }: ChangeOrderDialogProps) {
  const router = useRouter();
  const [state, setState] = useState<DialogState>("closed");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [costDeltaSats, setCostDeltaSats] = useState("");
  const [timelineDeltaDays, setTimelineDeltaDays] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none font-mono text-sm";
  const labelClass = "text-xs font-medium text-pl-text-dim";

  function resetForm() {
    setTitle("");
    setDescription("");
    setCostDeltaSats("");
    setTimelineDeltaDays("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
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
            cost_delta_sats: parseInt(costDeltaSats, 10) || 0,
            timeline_delta_days: parseInt(timelineDeltaDays, 10) || 0,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error?.message || `API error: ${res.status}`,
        );
      }

      resetForm();
      setState("closed");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to propose change order",
      );
      setState("open");
    }
  }

  if (state === "closed") {
    return (
      <button
        onClick={() => setState("open")}
        className="inline-flex items-center gap-1.5 text-xs text-pl-cyan hover:text-pl-cyan/80 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Propose Change
      </button>
    );
  }

  const costNum = parseInt(costDeltaSats, 10) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-pl-border bg-pl-surface p-6 shadow-2xl">
        <button
          onClick={() => {
            resetForm();
            setState("closed");
          }}
          className="absolute right-4 top-4 text-pl-text-dim hover:text-pl-text transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-pl-text flex items-center gap-2">
          <GitPullRequestArrow className="h-5 w-5 text-pl-cyan" />
          Propose Change Order
        </h2>
        <p className="mt-1 text-sm text-pl-text-muted">
          Request a modification to the contract scope, cost, or timeline.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Add mobile responsiveness"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the requested change..."
              rows={3}
              className={`mt-1 ${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cost Change (sats)</label>
              <input
                type="number"
                value={costDeltaSats}
                onChange={(e) => setCostDeltaSats(e.target.value)}
                placeholder="0"
                className={`mt-1 ${inputClass}`}
              />
              {costNum !== 0 && (
                <p
                  className={`mt-1 text-xs ${costNum > 0 ? "text-red-400" : "text-pl-green"}`}
                >
                  {costNum > 0 ? "+" : ""}
                  {formatSats(costNum)}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Timeline Change (days)</label>
              <input
                type="number"
                value={timelineDeltaDays}
                onChange={(e) => setTimelineDeltaDays(e.target.value)}
                placeholder="0"
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={state === "submitting"}
            className="w-full rounded-lg bg-pl-cyan py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {state === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <GitPullRequestArrow className="h-4 w-4" />
                Propose Change Order
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

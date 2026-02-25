"use client";

import { useState } from "react";
import {
  FileEdit,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { ChangeOrder } from "@/lib/api";
import { formatSats, relativeTime, truncateKey } from "@/lib/format";

const API_BASE = "/api/vouch";

interface ChangeOrderListProps {
  changeOrders: ChangeOrder[];
  contractId: string;
  userPubkey: string;
  onAction?: () => void;
}

const statusConfig: Record<
  ChangeOrder["status"],
  { icon: typeof Clock; label: string; classes: string }
> = {
  proposed: { icon: Clock, label: "Proposed", classes: "text-yellow-400" },
  approved: { icon: CheckCircle, label: "Approved", classes: "text-pl-green" },
  rejected: { icon: XCircle, label: "Rejected", classes: "text-red-400" },
  withdrawn: { icon: XCircle, label: "Withdrawn", classes: "text-pl-text-dim" },
};

export function ChangeOrderList({
  changeOrders,
  contractId,
  userPubkey,
  onAction,
}: ChangeOrderListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const sorted = [...changeOrders].sort((a, b) => a.sequence - b.sequence);

  async function handleAction(
    coId: string,
    action: "approve" | "reject",
    body: Record<string, unknown> = {}
  ) {
    setLoadingId(coId);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/v1/contracts/${contractId}/change-orders/${coId}/${action}`,
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
      setRejectingId(null);
      setRejectionReason("");
      onAction?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoadingId(null);
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-pl-text-dim text-center py-6">
        No change orders yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((co) => {
        const config = statusConfig[co.status];
        const StatusIcon = config.icon;
        const isOtherParty =
          co.status === "proposed" && co.proposed_by !== userPubkey;
        const isLoading = loadingId === co.id;
        const isRejecting = rejectingId === co.id;

        return (
          <div
            key={co.id}
            className="rounded-lg border border-pl-border bg-pl-bg/50 p-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileEdit className="h-4 w-4 text-pl-text-dim flex-shrink-0" />
                <span className="text-xs font-mono text-pl-text-dim">
                  CO-{co.sequence}
                </span>
                <h4 className="text-sm font-medium text-pl-text truncate">
                  {co.title}
                </h4>
              </div>
              <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${config.classes}`}>
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </span>
            </div>

            {/* Description */}
            <p className="mt-2 text-xs text-pl-text-muted leading-relaxed">
              {co.description}
            </p>

            {/* Deltas */}
            <div className="mt-3 flex items-center gap-4 text-xs">
              {co.cost_delta_sats !== 0 && (
                <span className="font-mono">
                  <span className="text-pl-text-dim">Cost: </span>
                  <span
                    className={
                      co.cost_delta_sats > 0 ? "text-red-400" : "text-pl-green"
                    }
                  >
                    {co.cost_delta_sats > 0 ? "+" : ""}
                    {formatSats(co.cost_delta_sats)}
                  </span>
                </span>
              )}
              {co.timeline_delta_days !== 0 && (
                <span className="font-mono">
                  <span className="text-pl-text-dim">Timeline: </span>
                  <span
                    className={
                      co.timeline_delta_days > 0
                        ? "text-yellow-400"
                        : "text-pl-green"
                    }
                  >
                    {co.timeline_delta_days > 0 ? "+" : ""}
                    {co.timeline_delta_days}d
                  </span>
                </span>
              )}
              <span className="text-pl-text-dim">
                by {truncateKey(co.proposed_by)}
              </span>
              <span className="text-pl-text-dim">
                {relativeTime(co.created_at)}
              </span>
            </div>

            {/* Rejection reason */}
            {co.status === "rejected" && co.rejection_reason && (
              <div className="mt-2 rounded border border-red-400/20 bg-red-400/5 px-3 py-2">
                <p className="text-xs text-red-400">
                  Reason: {co.rejection_reason}
                </p>
              </div>
            )}

            {/* Action buttons for the other party */}
            {isOtherParty && !isLoading && (
              <div className="mt-3 space-y-2">
                {isRejecting ? (
                  <div className="space-y-2">
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      rows={2}
                      className="w-full rounded-lg border border-pl-border bg-pl-bg px-3 py-2 text-xs text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason("");
                        }}
                        className="flex-1 rounded-lg border border-pl-border py-1.5 text-xs text-pl-text-muted hover:text-pl-text transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          handleAction(co.id, "reject", {
                            reason: rejectionReason.trim(),
                          })
                        }
                        className="flex-1 rounded-lg bg-red-400 py-1.5 text-xs font-semibold text-pl-bg hover:bg-red-400/80 transition-colors"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(co.id, "approve")}
                      className="flex-1 rounded-lg bg-pl-green/20 border border-pl-green/30 py-1.5 text-xs font-medium text-pl-green hover:bg-pl-green/30 transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(co.id)}
                      className="flex-1 rounded-lg bg-red-400/10 border border-red-400/20 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Loading state */}
            {isOtherParty && isLoading && (
              <div className="mt-3 flex items-center justify-center gap-2 py-2 text-pl-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-pl-cyan" />
                <span className="text-xs">Processing...</span>
              </div>
            )}

            {/* Error */}
            {isOtherParty && error && loadingId === null && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

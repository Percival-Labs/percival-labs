import { CheckCircle } from "lucide-react";
import type { ContractMilestone, MilestoneStatus } from "@/lib/api";
import { formatSats } from "@/lib/format";

interface MilestoneTrackerProps {
  milestones: ContractMilestone[];
}

const statusDot: Record<MilestoneStatus, { color: string; label: string }> = {
  pending: { color: "bg-pl-text-dim", label: "Pending" },
  in_progress: { color: "bg-pl-cyan", label: "In Progress" },
  submitted: { color: "bg-yellow-400", label: "Submitted" },
  accepted: { color: "bg-pl-green", label: "Accepted" },
  rejected: { color: "bg-red-400", label: "Rejected" },
  released: { color: "bg-pl-green", label: "Released" },
};

export function MilestoneTracker({ milestones }: MilestoneTrackerProps) {
  const sorted = [...milestones].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="space-y-0">
      {sorted.map((ms, idx) => {
        const dot = statusDot[ms.status] ?? statusDot.pending;
        const isLast = idx === sorted.length - 1;

        return (
          <div key={ms.id} className="relative flex gap-3">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              {/* Dot / checkmark */}
              {ms.status === "released" ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-pl-green/20 flex-shrink-0">
                  <CheckCircle className="h-3.5 w-3.5 text-pl-green" />
                </div>
              ) : (
                <div
                  className={`h-6 w-6 rounded-full border-2 border-pl-border flex items-center justify-center flex-shrink-0`}
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${dot.color}`} />
                </div>
              )}
              {/* Connecting line */}
              {!isLast && (
                <div className="w-px flex-1 min-h-[24px] bg-pl-border" />
              )}
            </div>

            {/* Content */}
            <div className="pb-5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-pl-text-dim">
                  #{ms.sequence}
                </span>
                <h4 className="text-sm font-medium text-pl-text truncate">
                  {ms.title}
                </h4>
                {ms.is_retention && (
                  <span className="text-[10px] font-medium text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded flex-shrink-0">
                    Retention
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs">
                <span className="font-mono text-pl-text-muted">
                  {formatSats(ms.amount_sats)}
                </span>
                <span className={`flex items-center gap-1`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot.color}`} />
                  <span className="text-pl-text-dim">{dot.label}</span>
                </span>
              </div>
              {ms.description && (
                <p className="mt-1.5 text-xs text-pl-text-dim leading-relaxed line-clamp-2">
                  {ms.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

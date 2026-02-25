import {
  Plus,
  Wallet,
  Upload,
  CheckCircle,
  XCircle,
  Zap,
  FileEdit,
  AlertTriangle,
  Trophy,
  Ban,
  Star,
  Activity,
} from "lucide-react";
import type { ContractEvent } from "@/lib/api";
import { relativeTime, truncateKey } from "@/lib/format";

interface ContractEventTimelineProps {
  events: ContractEvent[];
}

type IconComponent = typeof Plus;

const eventConfig: Record<string, { icon: IconComponent; color: string; label: string }> = {
  created: { icon: Plus, color: "text-pl-cyan", label: "Contract Created" },
  funded: { icon: Wallet, color: "text-pl-green", label: "Contract Funded" },
  milestone_submitted: { icon: Upload, color: "text-yellow-400", label: "Milestone Submitted" },
  milestone_accepted: { icon: CheckCircle, color: "text-pl-green", label: "Milestone Accepted" },
  milestone_rejected: { icon: XCircle, color: "text-red-400", label: "Milestone Rejected" },
  milestone_released: { icon: Zap, color: "text-pl-green", label: "Payment Released" },
  change_order_proposed: { icon: FileEdit, color: "text-yellow-400", label: "Change Order Proposed" },
  change_order_approved: { icon: FileEdit, color: "text-pl-green", label: "Change Order Approved" },
  change_order_rejected: { icon: FileEdit, color: "text-red-400", label: "Change Order Rejected" },
  change_order_withdrawn: { icon: FileEdit, color: "text-pl-text-dim", label: "Change Order Withdrawn" },
  disputed: { icon: AlertTriangle, color: "text-red-400", label: "Dispute Raised" },
  completed: { icon: Trophy, color: "text-pl-green", label: "Contract Completed" },
  cancelled: { icon: Ban, color: "text-pl-text-dim", label: "Contract Cancelled" },
  rated: { icon: Star, color: "text-yellow-400", label: "Rating Submitted" },
};

const defaultConfig = { icon: Activity, color: "text-pl-text-dim", label: "Event" };

function formatEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function renderMetadata(metadata: Record<string, unknown>): string | null {
  const parts: string[] = [];

  if (metadata.milestone_title) {
    parts.push(`Milestone: ${metadata.milestone_title}`);
  }
  if (metadata.amount_sats) {
    parts.push(`${metadata.amount_sats} sats`);
  }
  if (metadata.reason) {
    parts.push(`Reason: ${metadata.reason}`);
  }
  if (metadata.rating) {
    parts.push(`Rating: ${metadata.rating}/5`);
  }
  if (metadata.title) {
    parts.push(`${metadata.title}`);
  }
  if (metadata.cost_delta_sats && Number(metadata.cost_delta_sats) !== 0) {
    const delta = Number(metadata.cost_delta_sats);
    parts.push(`Cost ${delta > 0 ? "+" : ""}${delta} sats`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
}

export function ContractEventTimeline({ events }: ContractEventTimelineProps) {
  // Show most recent first
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-pl-text-dim text-center py-6">
        No events recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {sorted.map((event, idx) => {
        const config = eventConfig[event.event_type] ?? defaultConfig;
        const EventIcon = config.icon;
        const isLast = idx === sorted.length - 1;
        const metaSummary = renderMetadata(event.metadata);

        return (
          <div key={event.id} className="relative flex gap-3">
            {/* Icon column */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full bg-pl-bg border border-pl-border flex-shrink-0`}
              >
                <EventIcon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              {!isLast && (
                <div className="w-px flex-1 min-h-[16px] bg-pl-border" />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-pl-text">
                  {config !== defaultConfig
                    ? config.label
                    : formatEventType(event.event_type)}
                </span>
                <span className="text-xs text-pl-text-dim flex-shrink-0">
                  {relativeTime(event.created_at)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-pl-text-dim">
                <span className="font-mono">
                  {truncateKey(event.actor_pubkey)}
                </span>
              </div>
              {metaSummary && (
                <p className="mt-1 text-xs text-pl-text-muted leading-relaxed">
                  {metaSummary}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

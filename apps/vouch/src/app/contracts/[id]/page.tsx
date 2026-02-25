import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  ListChecks,
  ClipboardList,
  Star,
  GitPullRequestArrow,
} from "lucide-react";
import { getContract } from "@/lib/api";
import type {
  Contract,
  ContractMilestone,
  ChangeOrder,
  ContractEvent,
  ContractStatus,
  MilestoneStatus,
} from "@/lib/api";
import { formatSats, formatBps, truncateKey, relativeTime } from "@/lib/format";
import { MilestoneActions } from "./milestone-actions";
import { ChangeOrderDialog } from "./change-order-dialog";
import { RatingDialog } from "./rating-dialog";

interface ContractDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ContractDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getContract(id);
  if (!result) return { title: "Contract Not Found" };
  return {
    title: `${result.data.contract.title} - Contract`,
    description: `Contract details for ${result.data.contract.title} - ${formatSats(result.data.contract.total_sats)}`,
  };
}

// --- Status badge styles ---
const STATUS_CONFIG: Record<
  ContractStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  draft: {
    label: "Draft",
    bgClass: "bg-pl-surface-hover",
    textClass: "text-pl-text-dim",
  },
  awaiting_funding: {
    label: "Awaiting Funding",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
  },
  active: {
    label: "Active",
    bgClass: "bg-pl-green/10",
    textClass: "text-pl-green",
  },
  completed: {
    label: "Completed",
    bgClass: "bg-pl-cyan/10",
    textClass: "text-pl-cyan",
  },
  disputed: {
    label: "Disputed",
    bgClass: "bg-red-500/10",
    textClass: "text-red-400",
  },
  cancelled: {
    label: "Cancelled",
    bgClass: "bg-pl-surface-hover",
    textClass: "text-pl-text-dim",
  },
};

const MILESTONE_STATUS_CONFIG: Record<
  MilestoneStatus,
  { label: string; bgClass: string; textClass: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pending",
    bgClass: "bg-pl-surface-hover",
    textClass: "text-pl-text-dim",
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    bgClass: "bg-pl-cyan/10",
    textClass: "text-pl-cyan",
    icon: Zap,
  },
  submitted: {
    label: "Submitted",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
    icon: ClipboardList,
  },
  accepted: {
    label: "Accepted",
    bgClass: "bg-pl-green/10",
    textClass: "text-pl-green",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    bgClass: "bg-red-500/10",
    textClass: "text-red-400",
    icon: XCircle,
  },
  released: {
    label: "Released",
    bgClass: "bg-pl-green/10",
    textClass: "text-pl-green",
    icon: CheckCircle2,
  },
};

const CHANGE_ORDER_STATUS_CONFIG: Record<
  ChangeOrder["status"],
  { bgClass: string; textClass: string }
> = {
  proposed: { bgClass: "bg-amber-500/10", textClass: "text-amber-400" },
  approved: { bgClass: "bg-pl-green/10", textClass: "text-pl-green" },
  rejected: { bgClass: "bg-red-500/10", textClass: "text-red-400" },
  withdrawn: { bgClass: "bg-pl-surface-hover", textClass: "text-pl-text-dim" },
};

const EVENT_ICONS: Record<string, typeof Clock> = {
  contract_created: FileText,
  contract_funded: Zap,
  contract_activated: CheckCircle2,
  milestone_submitted: ClipboardList,
  milestone_accepted: CheckCircle2,
  milestone_rejected: XCircle,
  milestone_released: Zap,
  change_order_proposed: GitPullRequestArrow,
  change_order_approved: CheckCircle2,
  change_order_rejected: XCircle,
  contract_completed: Star,
  contract_disputed: AlertTriangle,
  contract_cancelled: Ban,
  rating_submitted: Star,
};

export default async function ContractDetailPage({
  params,
}: ContractDetailPageProps) {
  const { id } = await params;
  const result = await getContract(id);

  if (!result) notFound();

  const { contract, milestones, changeOrders, events } = result.data;

  const statusConfig = STATUS_CONFIG[contract.status];
  const progressPct =
    contract.total_sats > 0
      ? Math.round((contract.paid_sats / contract.total_sats) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/contracts"
        className="inline-flex items-center gap-1.5 text-sm text-pl-text-dim hover:text-pl-text-secondary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All Contracts
      </Link>

      {/* --- Header Card --- */}
      <div className="rounded-xl border border-pl-border bg-pl-surface p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-pl-text">
              {contract.title}
            </h1>
            {contract.description && (
              <p className="mt-2 text-sm text-pl-text-muted leading-relaxed">
                {contract.description}
              </p>
            )}
          </div>
          <span
            className={`ml-4 flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded ${statusConfig.bgClass} ${statusConfig.textClass}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Parties */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div>
            <span className="text-pl-text-dim">Customer: </span>
            <code className="font-mono text-pl-text-muted bg-pl-bg px-2 py-0.5 rounded border border-pl-border">
              {truncateKey(contract.customer_pubkey)}
            </code>
          </div>
          <div>
            <span className="text-pl-text-dim">Agent: </span>
            <code className="font-mono text-pl-text-muted bg-pl-bg px-2 py-0.5 rounded border border-pl-border">
              {truncateKey(contract.agent_pubkey)}
            </code>
          </div>
        </div>

        {/* Financial Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total", value: formatSats(contract.total_sats) },
            { label: "Funded", value: formatSats(contract.funded_sats) },
            { label: "Paid", value: formatSats(contract.paid_sats) },
            { label: "Retention", value: formatBps(contract.retention_bps) },
            {
              label: "Release After",
              value: `${contract.retention_release_after_days}d`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-pl-bg p-3 border border-pl-border"
            >
              <p className="text-xs text-pl-text-dim">{stat.label}</p>
              <p className="mt-0.5 text-lg font-bold text-pl-text">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-pl-text-dim">Payment Progress</span>
            <span className="text-xs font-mono text-pl-text-muted">
              {formatSats(contract.paid_sats)} / {formatSats(contract.total_sats)}{" "}
              ({progressPct}%)
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-pl-border overflow-hidden">
            <div
              className="h-full rounded-full bg-pl-cyan transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* --- Statement of Work --- */}
      <div className="mt-6 rounded-xl border border-pl-border bg-pl-surface p-6">
        <h2 className="text-sm font-semibold text-pl-text-secondary mb-4 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-pl-cyan" />
          Statement of Work
        </h2>

        {/* Deliverables */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-pl-text-dim mb-2">
            Deliverables
          </h3>
          <ul className="space-y-1.5">
            {contract.sow.deliverables.map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-pl-text-muted"
              >
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-pl-cyan flex-shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        </div>

        {/* Acceptance Criteria */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-pl-text-dim mb-2">
            Acceptance Criteria
          </h3>
          <ul className="space-y-1.5">
            {contract.sow.acceptance_criteria.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-pl-text-muted"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-pl-green flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Exclusions */}
        {contract.sow.exclusions && contract.sow.exclusions.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-pl-text-dim mb-2">
              Exclusions
            </h3>
            <ul className="space-y-1.5">
              {contract.sow.exclusions.map((e, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-pl-text-muted"
                >
                  <Ban className="mt-0.5 h-3.5 w-3.5 text-pl-text-dim flex-shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* --- Milestones --- */}
      <div className="mt-6 rounded-xl border border-pl-border bg-pl-surface p-6">
        <h2 className="text-sm font-semibold text-pl-text-secondary mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-pl-cyan" />
          Milestones
        </h2>

        <div className="space-y-3">
          {milestones.map((ms) => {
            const msConfig = MILESTONE_STATUS_CONFIG[ms.status];
            const MsIcon = msConfig.icon;

            return (
              <div
                key={ms.id}
                className="rounded-lg border border-pl-border bg-pl-bg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-pl-text-dim">
                        #{ms.sequence}
                      </span>
                      <h3 className="text-sm font-semibold text-pl-text truncate">
                        {ms.title}
                      </h3>
                      {ms.is_retention && (
                        <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Retention
                        </span>
                      )}
                    </div>
                    {ms.description && (
                      <p className="mt-1 text-xs text-pl-text-muted">
                        {ms.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-pl-text">
                      {formatSats(ms.amount_sats)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${msConfig.bgClass} ${msConfig.textClass}`}
                    >
                      <MsIcon className="h-3 w-3" />
                      {msConfig.label}
                    </span>
                  </div>
                </div>

                {/* Milestone progress bar */}
                <div className="mt-3 h-1.5 rounded-full bg-pl-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      ms.status === "released" || ms.status === "accepted"
                        ? "bg-pl-green"
                        : ms.status === "submitted"
                          ? "bg-amber-400"
                          : ms.status === "in_progress"
                            ? "bg-pl-cyan"
                            : ms.status === "rejected"
                              ? "bg-red-400"
                              : "bg-pl-border"
                    }`}
                    style={{
                      width:
                        ms.status === "released" || ms.status === "accepted"
                          ? "100%"
                          : ms.status === "submitted"
                            ? "75%"
                            : ms.status === "in_progress"
                              ? "40%"
                              : ms.status === "rejected"
                                ? "50%"
                                : "0%",
                    }}
                  />
                </div>

                {/* Deliverable info */}
                {ms.deliverable_url && (
                  <div className="mt-2 text-xs text-pl-text-dim">
                    <span>Deliverable: </span>
                    <a
                      href={ms.deliverable_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pl-cyan hover:underline"
                    >
                      {ms.deliverable_url}
                    </a>
                  </div>
                )}

                {ms.deliverable_notes && (
                  <p className="mt-1 text-xs text-pl-text-muted italic">
                    {ms.deliverable_notes}
                  </p>
                )}

                {ms.rejection_reason && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400">
                    <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{ms.rejection_reason}</span>
                  </div>
                )}

                {/* Milestone Actions (client component) */}
                {contract.status === "active" && (
                  <MilestoneActions
                    contractId={contract.id}
                    milestone={ms}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Change Orders --- */}
      <div className="mt-6 rounded-xl border border-pl-border bg-pl-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-pl-text-secondary flex items-center gap-2">
            <GitPullRequestArrow className="h-4 w-4 text-pl-cyan" />
            Change Orders
          </h2>
          {contract.status === "active" && (
            <ChangeOrderDialog contractId={contract.id} />
          )}
        </div>

        {changeOrders.length === 0 ? (
          <p className="text-sm text-pl-text-dim">
            No change orders have been proposed.
          </p>
        ) : (
          <div className="space-y-3">
            {changeOrders.map((co) => {
              const coConfig = CHANGE_ORDER_STATUS_CONFIG[co.status];
              return (
                <div
                  key={co.id}
                  className="rounded-lg border border-pl-border bg-pl-bg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-pl-text-dim">
                          CO-{co.sequence}
                        </span>
                        <h3 className="text-sm font-semibold text-pl-text truncate">
                          {co.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-pl-text-muted">
                        {co.description}
                      </p>
                    </div>
                    <span
                      className={`ml-3 flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded capitalize ${coConfig.bgClass} ${coConfig.textClass}`}
                    >
                      {co.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-pl-text-dim">
                    {co.cost_delta_sats !== 0 && (
                      <span>
                        Cost:{" "}
                        <span
                          className={
                            co.cost_delta_sats > 0
                              ? "text-red-400"
                              : "text-pl-green"
                          }
                        >
                          {co.cost_delta_sats > 0 ? "+" : ""}
                          {formatSats(co.cost_delta_sats)}
                        </span>
                      </span>
                    )}
                    {co.timeline_delta_days !== 0 && (
                      <span>
                        Timeline:{" "}
                        <span
                          className={
                            co.timeline_delta_days > 0
                              ? "text-amber-400"
                              : "text-pl-green"
                          }
                        >
                          {co.timeline_delta_days > 0 ? "+" : ""}
                          {co.timeline_delta_days}d
                        </span>
                      </span>
                    )}
                    <span>
                      Proposed by:{" "}
                      <code className="font-mono text-pl-text-muted">
                        {truncateKey(co.proposed_by)}
                      </code>
                    </span>
                    <span>{relativeTime(co.created_at)}</span>
                  </div>

                  {co.rejection_reason && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400">
                      <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{co.rejection_reason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Ratings --- */}
      {contract.status === "completed" && (
        <div className="mt-6 rounded-xl border border-pl-border bg-pl-surface p-6">
          <h2 className="text-sm font-semibold text-pl-text-secondary mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400" />
            Ratings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer rating */}
            <div className="rounded-lg border border-pl-border bg-pl-bg p-4">
              <p className="text-xs text-pl-text-dim mb-2">Customer Rating</p>
              {contract.customer_rating !== null ? (
                <>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < contract.customer_rating!
                            ? "text-amber-400 fill-amber-400"
                            : "text-pl-border"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-bold text-pl-text">
                      {contract.customer_rating}/5
                    </span>
                  </div>
                  {contract.customer_review && (
                    <p className="mt-2 text-xs text-pl-text-muted italic">
                      &ldquo;{contract.customer_review}&rdquo;
                    </p>
                  )}
                </>
              ) : (
                <RatingDialog
                  contractId={contract.id}
                  role="customer"
                />
              )}
            </div>

            {/* Agent rating */}
            <div className="rounded-lg border border-pl-border bg-pl-bg p-4">
              <p className="text-xs text-pl-text-dim mb-2">Agent Rating</p>
              {contract.agent_rating !== null ? (
                <>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < contract.agent_rating!
                            ? "text-amber-400 fill-amber-400"
                            : "text-pl-border"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-bold text-pl-text">
                      {contract.agent_rating}/5
                    </span>
                  </div>
                  {contract.agent_review && (
                    <p className="mt-2 text-xs text-pl-text-muted italic">
                      &ldquo;{contract.agent_review}&rdquo;
                    </p>
                  )}
                </>
              ) : (
                <RatingDialog
                  contractId={contract.id}
                  role="agent"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Event Timeline --- */}
      <div className="mt-6 rounded-xl border border-pl-border bg-pl-surface p-6">
        <h2 className="text-sm font-semibold text-pl-text-secondary mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-pl-cyan" />
          Timeline
        </h2>

        {events.length === 0 ? (
          <p className="text-sm text-pl-text-dim">No events recorded yet.</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-pl-border" />

            <div className="space-y-4">
              {events.map((ev) => {
                const EvIcon = EVENT_ICONS[ev.event_type] || Clock;
                return (
                  <div key={ev.id} className="relative flex items-start gap-4 pl-2">
                    <div className="relative z-10 flex-shrink-0 w-5 h-5 rounded-full bg-pl-surface border border-pl-border flex items-center justify-center">
                      <EvIcon className="h-3 w-3 text-pl-text-dim" />
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-pl-text">
                          {ev.event_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-pl-text-dim">
                          {relativeTime(ev.created_at)}
                        </span>
                      </div>
                      <p className="text-[10px] text-pl-text-dim font-mono mt-0.5">
                        by {truncateKey(ev.actor_pubkey)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- Contract ID --- */}
      <div className="mt-6 rounded-xl border border-pl-border bg-pl-surface p-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-pl-text-dim">Contract ID:</span>
          <code className="text-xs font-mono text-pl-text-muted bg-pl-bg px-2 py-1 rounded border border-pl-border">
            {contract.id}
          </code>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-pl-text-dim">Created:</span>
          <span className="text-xs text-pl-text-muted">
            {relativeTime(contract.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

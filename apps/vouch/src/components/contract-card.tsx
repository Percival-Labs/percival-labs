import Link from "next/link";
import { FileText, Zap, CheckCircle } from "lucide-react";
import type { Contract } from "@/lib/api";
import { formatSats, relativeTime, truncateKey } from "@/lib/format";
import { ContractStatusBadge } from "./contract-status-badge";

interface ContractCardProps {
  contract: Contract;
  /** Number of milestones on this contract */
  milestoneCount?: number;
  /** Number of milestones in accepted/released status */
  completedMilestones?: number;
}

export function ContractCard({
  contract,
  milestoneCount = 0,
  completedMilestones = 0,
}: ContractCardProps) {
  const progressPct =
    contract.total_sats > 0
      ? Math.min((contract.paid_sats / contract.total_sats) * 100, 100)
      : 0;

  return (
    <Link
      href={`/contracts/${contract.id}`}
      className="group block rounded-xl border border-pl-border bg-pl-surface p-5 hover:border-pl-cyan/30 hover:bg-pl-surface-hover transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-pl-cyan flex-shrink-0" />
          <h3 className="text-base font-semibold text-pl-text group-hover:text-pl-cyan transition-colors truncate">
            {contract.title}
          </h3>
        </div>
        <ContractStatusBadge status={contract.status} />
      </div>

      {/* Parties */}
      <div className="mt-3 flex items-center gap-4 text-xs text-pl-text-dim">
        <div>
          <span className="text-pl-text-muted">Customer:</span>{" "}
          <span className="font-mono">{truncateKey(contract.customer_pubkey)}</span>
        </div>
        <div>
          <span className="text-pl-text-muted">Agent:</span>{" "}
          <span className="font-mono">{truncateKey(contract.agent_pubkey)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 text-pl-text-dim">
            <Zap className="h-3 w-3 text-pl-cyan" />
            <span>
              {formatSats(contract.paid_sats)} / {formatSats(contract.total_sats)}
            </span>
          </div>
          <span className="text-pl-text-muted font-mono">
            {progressPct.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-pl-border overflow-hidden">
          <div
            className="h-full rounded-full bg-pl-cyan transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Footer stats */}
      <div className="mt-4 flex items-center justify-between text-xs text-pl-text-dim">
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-pl-green" />
          <span>
            {completedMilestones}/{milestoneCount} milestones
          </span>
        </div>
        <span>{relativeTime(contract.created_at)}</span>
      </div>
    </Link>
  );
}

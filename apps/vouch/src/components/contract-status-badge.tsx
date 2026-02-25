import type { ContractStatus } from "@/lib/api";

interface ContractStatusBadgeProps {
  status: ContractStatus;
}

const statusConfig: Record<ContractStatus, { label: string; classes: string }> = {
  draft: {
    label: "Draft",
    classes: "text-pl-text-muted bg-pl-text-muted/10",
  },
  awaiting_funding: {
    label: "Awaiting Funding",
    classes: "text-yellow-400 bg-yellow-400/10",
  },
  active: {
    label: "Active",
    classes: "text-pl-cyan bg-pl-cyan/10",
  },
  completed: {
    label: "Completed",
    classes: "text-pl-green bg-pl-green/10",
  },
  disputed: {
    label: "Disputed",
    classes: "text-red-400 bg-red-400/10",
  },
  cancelled: {
    label: "Cancelled",
    classes: "text-pl-text-dim bg-pl-text-dim/10",
  },
};

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

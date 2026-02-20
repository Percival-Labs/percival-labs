import { formatCents, formatNumber } from "@/lib/format";

interface StakingSummaryBarProps {
  totalValueLocked: number;
  totalStakers: number;
  totalYieldDistributed: number;
  poolCount: number;
}

export function StakingSummaryBar({
  totalValueLocked,
  totalStakers,
  totalYieldDistributed,
  poolCount,
}: StakingSummaryBarProps) {
  const stats = [
    { label: "Total Value Locked", value: formatCents(totalValueLocked) },
    { label: "Total Stakers", value: formatNumber(totalStakers) },
    { label: "Yield Distributed", value: formatCents(totalYieldDistributed) },
    { label: "Active Pools", value: poolCount.toString() },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-pl-border bg-pl-surface p-4"
        >
          <p className="text-xs text-pl-text-dim">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold text-pl-text">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

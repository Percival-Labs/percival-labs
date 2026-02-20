import Link from "next/link";
import { TrendingUp, Users } from "lucide-react";
import type { Pool } from "@/lib/api";
import { formatCents, formatBps, formatNumber } from "@/lib/format";

interface PoolCardProps {
  pool: Pool;
}

export function PoolCard({ pool }: PoolCardProps) {
  return (
    <Link
      href={`/staking/${pool.id}`}
      className="group block rounded-xl border border-pl-border bg-pl-surface p-5 hover:border-pl-cyan/30 hover:bg-pl-surface-hover transition-colors"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-pl-text group-hover:text-pl-cyan transition-colors truncate">
          {pool.agentName}
        </h3>
        <span className="text-xs font-medium text-pl-green bg-pl-green/10 px-2 py-0.5 rounded">
          {pool.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-pl-text-dim">TVL</p>
          <p className="text-lg font-bold text-pl-text">
            {formatCents(pool.totalStakedCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-pl-text-dim">Stakers</p>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-pl-text-dim" />
            <p className="text-lg font-bold text-pl-text">
              {formatNumber(pool.totalStakers)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-pl-text-dim">Yield Paid</p>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-pl-green" />
            <p className="text-sm font-semibold text-pl-text">
              {formatCents(pool.totalYieldPaidCents)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-pl-text-dim">Fee Rate</p>
          <p className="text-sm font-semibold text-pl-text">
            {formatBps(pool.activityFeeRateBps)}
          </p>
        </div>
      </div>
    </Link>
  );
}

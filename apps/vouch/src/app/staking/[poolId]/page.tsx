import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp, Users, Clock, Percent } from "lucide-react";
import { getStakingPool } from "@/lib/api";
import { formatCents, formatBps } from "@/lib/format";
import { RelativeTime } from "@/components/relative-time";

interface PoolDetailPageProps {
  params: Promise<{ poolId: string }>;
}

export async function generateMetadata({
  params,
}: PoolDetailPageProps): Promise<Metadata> {
  const { poolId } = await params;
  const result = await getStakingPool(poolId);
  if (!result) return { title: "Pool Not Found" };
  return {
    title: `${result.data.agentName} Staking Pool`,
    description: `Staking pool for ${result.data.agentName} — ${formatCents(result.data.totalStakedCents)} TVL`,
  };
}

export default async function PoolDetailPage({
  params,
}: PoolDetailPageProps) {
  const { poolId } = await params;
  const result = await getStakingPool(poolId);

  if (!result) notFound();

  const pool = result.data;

  const stats = [
    {
      icon: TrendingUp,
      label: "Total Value Locked",
      value: formatCents(pool.totalStakedCents),
      color: "text-pl-cyan",
    },
    {
      icon: Users,
      label: "Stakers",
      value: pool.totalStakers.toString(),
      color: "text-pl-text",
    },
    {
      icon: TrendingUp,
      label: "Yield Distributed",
      value: formatCents(pool.totalYieldPaidCents),
      color: "text-pl-green",
    },
    {
      icon: Percent,
      label: "Activity Fee Rate",
      value: formatBps(pool.activityFeeRateBps),
      color: "text-pl-text",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/staking"
        className="inline-flex items-center gap-1.5 text-sm text-pl-text-dim hover:text-pl-text-secondary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All Pools
      </Link>

      <div className="rounded-xl border border-pl-border bg-pl-surface p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/agents/${pool.agentId}`}
              className="text-2xl font-bold text-pl-text hover:text-pl-cyan transition-colors"
            >
              {pool.agentName}
            </Link>
            <div className="mt-1 flex items-center gap-2 text-xs text-pl-text-dim">
              <Clock className="h-3.5 w-3.5" />
              Created <RelativeTime date={pool.createdAt} />
            </div>
          </div>
          <span className="text-xs font-medium text-pl-green bg-pl-green/10 px-2.5 py-1 rounded">
            {pool.status}
          </span>
        </div>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-pl-bg p-4 border border-pl-border"
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-xs text-pl-text-dim">{stat.label}</p>
              </div>
              <p className="text-xl font-bold text-pl-text">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Pool ID */}
        <div className="mt-6 pt-5 border-t border-pl-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-pl-text-dim">Pool ID:</span>
            <code className="text-xs font-mono text-pl-text-muted bg-pl-bg px-2 py-1 rounded border border-pl-border">
              {pool.id}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

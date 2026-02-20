import type { Metadata } from "next";
import { Vault } from "lucide-react";
import { getStakingPools } from "@/lib/api";
import type { Pool } from "@/lib/api";
import { StakingSummaryBar } from "@/components/staking-summary-bar";
import { PoolCard } from "@/components/pool-card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Staking Pools",
  description: "Browse and stake on AI agent pools. Earn yield by backing agents you trust.",
};

export default async function StakingPage() {
  const result = await getStakingPools(1, 50);
  const pools: Pool[] = result?.data ?? [];

  const summary = {
    totalValueLocked: pools.reduce((sum, p) => sum + p.totalStakedCents, 0),
    totalStakers: pools.reduce((sum, p) => sum + p.totalStakers, 0),
    totalYieldDistributed: pools.reduce((sum, p) => sum + p.totalYieldPaidCents, 0),
    poolCount: pools.length,
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pl-text">Staking Pools</h1>
        <p className="mt-2 text-base text-pl-text-muted">
          Back agents you trust. Earn yield when they perform.
        </p>
      </div>

      {pools.length > 0 && (
        <div className="mb-8">
          <StakingSummaryBar {...summary} />
        </div>
      )}

      {pools.length === 0 ? (
        <EmptyState
          icon={Vault}
          title="No active staking pools"
          description="Staking pools will appear here once agents create them. Check back soon."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </div>
      )}
    </div>
  );
}

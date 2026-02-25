import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { getContracts } from "@/lib/api";
import type { Contract } from "@/lib/api";
import { formatSats, formatNumber } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { ContractCard } from "@/components/contract-card";

export const metadata: Metadata = {
  title: "Contracts",
  description:
    "Manage agent work agreements with milestone-based payments and escrow protection.",
};

export default async function ContractsPage() {
  const result = await getContracts(1, 50);
  const contracts: Contract[] = result?.data ?? [];

  const activeContracts = contracts.filter((c) => c.status === "active");
  const completedContracts = contracts.filter((c) => c.status === "completed");
  const totalValue = contracts.reduce((sum, c) => sum + c.total_sats, 0);

  const summary = [
    { label: "Total Contracts", value: formatNumber(contracts.length) },
    { label: "Active", value: formatNumber(activeContracts.length) },
    { label: "Completed", value: formatNumber(completedContracts.length) },
    { label: "Total Value", value: formatSats(totalValue) },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pl-text">Contracts</h1>
          <p className="mt-2 text-base text-pl-text-muted">
            Agent work agreements with milestone-based payments and escrow
            protection.
          </p>
        </div>
        <Link
          href="/contracts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-pl-cyan px-4 py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Contract
        </Link>
      </div>

      {contracts.length > 0 && (
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summary.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-pl-border bg-pl-surface p-4"
            >
              <p className="text-xs text-pl-text-dim">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-pl-text">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No contracts yet"
          description="Create your first contract to start managing agent work agreements with milestone-based payments."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      )}
    </div>
  );
}

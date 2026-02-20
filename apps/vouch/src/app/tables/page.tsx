import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { getTables } from "@/lib/api";
import { TableCard } from "@/components/table-card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Browse Tables",
  description: "Explore discussion Tables on Vouch.",
};

export default async function TablesPage() {
  const result = await getTables(1, 50);
  const tables = result?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pl-text">Tables</h1>
        <p className="mt-2 text-base text-pl-text-muted">
          Browse discussion spaces. Find your seat at the table.
        </p>
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No tables yet"
          description="Tables will appear here once they are created. Check back soon."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      )}

      {result?.meta && result.meta.has_more && (
        <div className="mt-8 text-center">
          <p className="text-sm text-pl-text-dim">
            Showing {tables.length} of {result.meta.total} tables
          </p>
        </div>
      )}
    </div>
  );
}

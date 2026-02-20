import Link from "next/link";
import { Users, FileText, Lock, Crown } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { Table } from "@/lib/api";

interface TableCardProps {
  table: Table;
}

export function TableCard({ table }: TableCardProps) {
  const typeIcon =
    table.type === "private" ? (
      <Lock className="h-3.5 w-3.5 text-pl-amber" />
    ) : table.type === "paid" ? (
      <Crown className="h-3.5 w-3.5 text-pl-amber" />
    ) : null;

  return (
    <Link
      href={`/tables/${table.slug}`}
      className="group block rounded-xl border border-pl-border bg-pl-surface p-5 hover:border-pl-cyan/30 hover:bg-pl-surface-hover transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-pl-text group-hover:text-pl-cyan transition-colors truncate">
              {table.name}
            </h3>
            {typeIcon}
          </div>
          <p className="mt-0.5 text-sm text-pl-text-dim font-mono">
            /{table.slug}
          </p>
        </div>
      </div>

      {table.description && (
        <p className="mt-3 text-sm text-pl-text-muted leading-relaxed line-clamp-2">
          {table.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-pl-text-dim">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {formatNumber(table.subscriber_count)} members
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {formatNumber(table.post_count)} posts
        </span>
      </div>
    </Link>
  );
}

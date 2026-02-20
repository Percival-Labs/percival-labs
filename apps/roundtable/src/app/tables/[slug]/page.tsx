import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, FileText, ArrowLeft, UserPlus } from "lucide-react";
import { getTable, getTablePosts } from "@/lib/api";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { formatNumber } from "@/lib/format";

interface TableDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: TableDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getTable(slug);
  if (!result) return { title: "Table Not Found" };
  return {
    title: result.data.name,
    description: result.data.description || `Posts in ${result.data.name}`,
  };
}

export default async function TableDetailPage({ params }: TableDetailPageProps) {
  const { slug } = await params;
  const [tableResult, postsResult] = await Promise.all([
    getTable(slug),
    getTablePosts(slug, 1, 50),
  ]);

  if (!tableResult) notFound();

  const table = tableResult.data;
  const posts = postsResult?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/tables"
        className="inline-flex items-center gap-1.5 text-sm text-pl-text-dim hover:text-pl-text-secondary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All Tables
      </Link>

      {/* Table header */}
      <div className="rounded-xl border border-pl-border bg-pl-surface p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-pl-text">{table.name}</h1>
            <p className="mt-0.5 text-sm text-pl-text-dim font-mono">
              /{table.slug}
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-pl-cyan px-4 py-2 text-sm font-semibold text-pl-cyan hover:bg-pl-cyan/10 transition-colors flex-shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Join Table
          </button>
        </div>

        {table.description && (
          <p className="mt-4 text-sm text-pl-text-muted leading-relaxed">
            {table.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-5 text-sm text-pl-text-dim">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {formatNumber(table.subscriber_count)} members
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            {formatNumber(table.post_count)} posts
          </span>
        </div>
      </div>

      {/* Post feed */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No posts yet"
            description="This table is waiting for its first post. Join and start the discussion."
          />
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      {postsResult?.meta && postsResult.meta.has_more && (
        <div className="mt-8 text-center">
          <p className="text-sm text-pl-text-dim">
            Showing {posts.length} of {postsResult.meta.total} posts
          </p>
        </div>
      )}
    </div>
  );
}

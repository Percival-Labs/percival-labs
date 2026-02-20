import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Pin, Lock } from "lucide-react";
import { getPost } from "@/lib/api";
import { VoteButtons } from "@/components/vote-buttons";
import { AuthorBadge } from "@/components/author-badge";
import { RelativeTime } from "@/components/relative-time";
import { CommentThread } from "@/components/comment-thread";

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getPost(id);
  if (!result) return { title: "Post Not Found" };
  return {
    title: result.data.title,
    description: result.data.body.slice(0, 160),
  };
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;
  const result = await getPost(id);

  if (!result) notFound();

  const post = result.data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/tables"
        className="inline-flex items-center gap-1.5 text-sm text-pl-text-dim hover:text-pl-text-secondary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tables
      </Link>

      {/* Post */}
      <article className="rounded-xl border border-pl-border bg-pl-surface p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0 pt-1">
            <VoteButtons score={post.score} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Title and badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-pl-amber/10 text-pl-amber">
                  <Pin className="h-3 w-3" />
                  pinned
                </span>
              )}
              {post.is_locked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-pl-red/10 text-pl-red">
                  <Lock className="h-3 w-3" />
                  locked
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-pl-text leading-snug">
              {post.title}
            </h1>

            {/* Author and meta */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <AuthorBadge
                authorId={post.author_id}
                authorType={post.author_type}
              />
              <RelativeTime
                date={post.created_at}
                className="text-xs text-pl-text-dim"
              />
              {post.edited_at && (
                <span className="text-xs text-pl-text-dim italic">
                  (edited)
                </span>
              )}
            </div>

            {/* Post body */}
            <div className="mt-5 text-sm text-pl-text-secondary leading-relaxed whitespace-pre-wrap">
              {post.body}
            </div>

            {/* Post footer */}
            <div className="mt-5 pt-4 border-t border-pl-border flex items-center gap-4 text-sm text-pl-text-dim">
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                {post.comment_count} comments
              </span>
              {post.signature && (
                <span
                  className="font-mono text-xs text-pl-text-dim truncate max-w-[200px]"
                  title={post.signature}
                >
                  sig: {post.signature.slice(0, 16)}...
                </span>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Comments section */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-pl-text mb-4">
          Comments ({post.comment_count})
        </h2>

        <div className="rounded-xl border border-pl-border bg-pl-surface p-4">
          <CommentThread comments={post.comments} />
        </div>
      </section>
    </div>
  );
}

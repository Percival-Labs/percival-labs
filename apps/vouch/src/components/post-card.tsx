import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { VoteButtons } from "@/components/vote-buttons";
import { AuthorBadge } from "@/components/author-badge";
import { RelativeTime } from "@/components/relative-time";
import { formatNumber } from "@/lib/format";
import type { Post } from "@/lib/api";

interface PostCardProps {
  post: Post;
  showTable?: boolean;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <div className="flex gap-3 rounded-xl border border-pl-border bg-pl-surface p-4 hover:border-pl-cyan/20 hover:bg-pl-surface-hover transition-colors">
      <div className="flex-shrink-0 pt-1">
        <VoteButtons score={post.score} />
      </div>

      <div className="min-w-0 flex-1">
        <Link href={`/posts/${post.id}`} className="group">
          <h3 className="text-base font-semibold text-pl-text group-hover:text-pl-cyan transition-colors leading-snug">
            {post.title}
          </h3>
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <AuthorBadge authorId={post.author_id} authorType={post.author_type} />
          <span className="text-pl-text-dim">
            <RelativeTime date={post.created_at} className="text-xs" />
          </span>
        </div>

        <div className="mt-3 flex items-center gap-4">
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-pl-text-dim hover:text-pl-text-secondary transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {formatNumber(post.comment_count)} comments
          </Link>
          {post.is_pinned && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-pl-amber/10 text-pl-amber">
              pinned
            </span>
          )}
          {post.is_locked && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-pl-red/10 text-pl-red">
              locked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

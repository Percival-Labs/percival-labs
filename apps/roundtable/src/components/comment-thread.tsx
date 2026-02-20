"use client";

import { MessageSquare } from "lucide-react";
import { VoteButtons } from "@/components/vote-buttons";
import { AuthorBadge } from "@/components/author-badge";
import { RelativeTime } from "@/components/relative-time";
import type { Comment } from "@/lib/api";

interface CommentThreadProps {
  comments: Comment[];
}

function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  const maxIndent = 4;
  const indentLevel = Math.min(depth, maxIndent);

  return (
    <div
      className={indentLevel > 0 ? "border-l-2 border-pl-border pl-4 ml-2" : ""}
    >
      <div className="py-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 pt-0.5">
            <VoteButtons score={comment.score} orientation="vertical" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
              <AuthorBadge
                authorId={comment.author_id}
                authorType={comment.author_type}
              />
              <RelativeTime
                date={comment.created_at}
                className="text-xs text-pl-text-dim"
              />
            </div>

            <div className="text-sm text-pl-text-secondary leading-relaxed whitespace-pre-wrap">
              {comment.body}
            </div>

            <div className="mt-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-pl-text-dim hover:text-pl-text-secondary transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-0">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentThread({ comments }: CommentThreadProps) {
  if (comments.length === 0) {
    return (
      <div className="py-8 text-center">
        <MessageSquare className="h-8 w-8 text-pl-text-dim mx-auto mb-2" />
        <p className="text-sm text-pl-text-muted">
          No comments yet. Be the first to discuss.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-pl-border">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} depth={0} />
      ))}
    </div>
  );
}

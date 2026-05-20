"use client";

import type { CSSProperties } from "react";
import { Fragment, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronRight,
  MessageCircle,
  MessageSquareReply
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ForumCommentForm } from "@/components/ForumCommentForm";
import { ReportButton } from "@/components/ReportButton";
import { visualCommentDepth } from "@/lib/forum-comments";

export type ForumCommentView = {
  id: number;
  parentCommentId: number | null;
  body: string;
  createdAtLabel: string;
  replyCount: number;
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
  replies: ForumCommentView[];
};

type ForumCommentThreadProps = {
  comments: ForumCommentView[];
  threadId: number;
  currentUserId: number | null;
};

type ForumCommentBranchProps = {
  comment: ForumCommentView;
  threadId: number;
  currentUserId: number | null;
  depth: number;
  collapsedCommentIds: ReadonlySet<number>;
  replyingToCommentId: number | null;
  onToggleCollapse: (commentId: number) => void;
  onReply: (commentId: number | null) => void;
};

function hiddenReplyLabel(replyCount: number) {
  return replyCount === 1 ? "1 reply hidden" : `${replyCount} replies hidden`;
}

function replyCountLabel(replyCount: number) {
  return replyCount === 1 ? "1 reply" : `${replyCount} replies`;
}

function ForumCommentBranch({
  comment,
  threadId,
  currentUserId,
  depth,
  collapsedCommentIds,
  replyingToCommentId,
  onToggleCollapse,
  onReply
}: ForumCommentBranchProps) {
  const isCollapsed = collapsedCommentIds.has(comment.id);
  const canCollapse = comment.replyCount > 0;
  const visualDepth = visualCommentDepth(depth);
  const indentRem = visualDepth * 0.85;
  const lineLeftRem = Math.max(indentRem - 0.45, 0.2);
  const articleStyle = {
    paddingLeft: `${indentRem}rem`
  } satisfies CSSProperties;
  const lineStyle = {
    left: `${lineLeftRem}rem`
  } satisfies CSSProperties;

  return (
    <Fragment>
      <article
        className="relative min-w-0"
        data-comment-depth={depth}
        data-comment-id={comment.id}
        id={`comment-${comment.id}`}
        style={articleStyle}
      >
        {depth > 0 ? (
          <span
            aria-hidden
            className="absolute bottom-2 top-2 w-px rounded-full bg-canopy-900/15"
            style={lineStyle}
          />
        ) : null}

        <div
          className={clsx(
            "relative min-w-0 rounded-lg border border-canopy-900/10 bg-white p-3 shadow-sm transition",
            isCollapsed && "bg-white/75"
          )}
        >
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink/60">
              {canCollapse ? (
                <button
                  aria-expanded={!isCollapsed}
                  aria-label={
                    isCollapsed
                      ? `Expand comment by ${comment.user.username}`
                      : `Collapse comment by ${comment.user.username}`
                  }
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canopy-50 text-canopy-700 transition hover:bg-canopy-100"
                  onClick={() => onToggleCollapse(comment.id)}
                  type="button"
                >
                  {isCollapsed ? (
                    <ChevronRight size={16} aria-hidden />
                  ) : (
                    <ChevronDown size={16} aria-hidden />
                  )}
                </button>
              ) : (
                <span className="h-7 w-7 shrink-0" aria-hidden />
              )}
              <Avatar
                name={comment.user.username}
                size="sm"
                src={comment.user.profileImageUrl}
              />
              <span className="min-w-0 truncate">
                @{comment.user.username} - {comment.createdAtLabel}
              </span>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {comment.replyCount > 0 ? (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-water-100 px-3 text-xs font-black text-water-700">
                  <MessageCircle size={13} aria-hidden />
                  {replyCountLabel(comment.replyCount)}
                </span>
              ) : null}
              {currentUserId !== null && currentUserId !== comment.user.id ? (
                <ReportButton targetId={comment.id} targetType="forumComment" />
              ) : null}
            </div>
          </div>

          {isCollapsed ? (
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-canopy-50 px-3 py-1.5 text-xs font-black text-ink/60 transition hover:bg-canopy-100 hover:text-ink"
              onClick={() => onToggleCollapse(comment.id)}
              type="button"
            >
              <ChevronRight size={14} aria-hidden />
              {hiddenReplyLabel(comment.replyCount)}
            </button>
          ) : (
            <>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-ink/70">
                {comment.body}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {currentUserId !== null ? (
                  <button
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-canopy-50 px-3 text-xs font-black text-ink/60 transition hover:bg-canopy-100 hover:text-ink"
                    onClick={() =>
                      onReply(
                        replyingToCommentId === comment.id ? null : comment.id
                      )
                    }
                    type="button"
                  >
                    <MessageSquareReply size={14} aria-hidden />
                    Reply
                  </button>
                ) : (
                  <Link
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-black text-white transition hover:bg-canopy-700"
                    href={`/login?redirectTo=/forum/${threadId}`}
                  >
                    <MessageSquareReply size={14} aria-hidden />
                    Log in to reply
                  </Link>
                )}

                {canCollapse ? (
                  <button
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-ink/45 shadow-sm transition hover:text-canopy-700"
                    onClick={() => onToggleCollapse(comment.id)}
                    type="button"
                  >
                    <ChevronDown size={14} aria-hidden />
                    Collapse branch
                  </button>
                ) : null}
              </div>

              {replyingToCommentId === comment.id ? (
                <div className="mt-3">
                  <ForumCommentForm
                    autoFocus
                    onCancel={() => onReply(null)}
                    onPosted={() => onReply(null)}
                    parentCommentId={comment.id}
                    submitLabel="Reply"
                    threadId={threadId}
                    title={`Reply to @${comment.user.username}`}
                    variant="compact"
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </article>

      {!isCollapsed
        ? comment.replies.map((reply) => (
            <ForumCommentBranch
              collapsedCommentIds={collapsedCommentIds}
              comment={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              key={reply.id}
              onReply={onReply}
              onToggleCollapse={onToggleCollapse}
              replyingToCommentId={replyingToCommentId}
              threadId={threadId}
            />
          ))
        : null}
    </Fragment>
  );
}

export function ForumCommentThread({
  comments,
  threadId,
  currentUserId
}: ForumCommentThreadProps) {
  const [collapsedCommentIds, setCollapsedCommentIds] = useState<Set<number>>(
    () => new Set()
  );
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(
    null
  );

  function toggleCollapse(commentId: number) {
    setCollapsedCommentIds((current) => {
      const next = new Set(current);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });
  }

  if (!comments.length) {
    return (
      <section className="rounded-lg bg-white p-6 text-center shadow-sm">
        <MessageCircle className="mx-auto text-canopy-700" size={28} aria-hidden />
        <h3 className="mt-3 text-xl font-black text-ink">No comments yet</h3>
        <p className="mt-2 text-sm font-semibold text-ink/55">
          Start the first branch in this chain.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-3">
      {comments.map((comment) => (
        <ForumCommentBranch
          collapsedCommentIds={collapsedCommentIds}
          comment={comment}
          currentUserId={currentUserId}
          depth={0}
          key={comment.id}
          onReply={setReplyingToCommentId}
          onToggleCollapse={toggleCollapse}
          replyingToCommentId={replyingToCommentId}
          threadId={threadId}
        />
      ))}
    </div>
  );
}

"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowBigUp,
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
  likedByCurrentUser: boolean;
  likeCount: number;
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

const compactCountFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact"
});

function formatCompactCount(count: number) {
  return compactCountFormatter.format(count);
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
  const repliesStyle = {
    marginLeft: `${visualDepth >= 6 ? 1.15 : 2}rem`
  } satisfies CSSProperties;
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [likedByCurrentUser, setLikedByCurrentUser] = useState(
    comment.likedByCurrentUser
  );
  const [likeSaving, setLikeSaving] = useState(false);

  function toggleLike() {
    if (currentUserId === null || likeSaving) return;

    setLikeSaving(true);

    void (async () => {
      try {
        const response = await fetch(`/api/forum/comments/${comment.id}/like`, {
          method: "POST"
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          likedByCurrentUser: boolean;
          likeCount: number;
        };

        setLikedByCurrentUser(payload.likedByCurrentUser);
        setLikeCount(payload.likeCount);
      } finally {
        setLikeSaving(false);
      }
    })();
  }

  return (
    <article
      className="relative min-w-0"
      data-comment-depth={depth}
      data-comment-id={comment.id}
      id={`comment-${comment.id}`}
    >
      <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-2">
        <div className="relative flex justify-center">
          <div className="relative z-10 mt-1">
            <Avatar
              name={comment.user.username}
              size="sm"
              src={comment.user.profileImageUrl}
            />
          </div>
          {canCollapse && !isCollapsed ? (
            <button
              aria-label={`Collapse replies to ${comment.user.username}`}
              className="absolute bottom-0 top-10 flex w-6 justify-center rounded-full text-canopy-900/15 transition hover:text-canopy-700/45"
              onClick={() => onToggleCollapse(comment.id)}
              title="Collapse thread"
              type="button"
            >
              <span
                aria-hidden
                className="block h-full w-px rounded-full bg-current"
              />
            </button>
          ) : null}
        </div>

        <div
          className={clsx(
            "min-w-0 rounded-md px-1.5 py-1.5 transition",
            isCollapsed ? "bg-white/45" : "hover:bg-white/60"
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-ink/50">
            {canCollapse ? (
              <button
                aria-expanded={!isCollapsed}
                aria-label={
                  isCollapsed
                    ? `Expand comment by ${comment.user.username}`
                    : `Collapse comment by ${comment.user.username}`
                }
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-canopy-700 transition hover:bg-canopy-50"
                onClick={() => onToggleCollapse(comment.id)}
                title={isCollapsed ? "Expand thread" : "Collapse thread"}
                type="button"
              >
                {isCollapsed ? (
                  <ChevronRight size={14} aria-hidden />
                ) : (
                  <ChevronDown size={14} aria-hidden />
                )}
              </button>
            ) : null}
            <span className="min-w-0 truncate font-black text-ink/75">
              @{comment.user.username}
            </span>
            <span aria-hidden>-</span>
            <span className="shrink-0">{comment.createdAtLabel}</span>
            {!isCollapsed && comment.replyCount > 0 ? (
              <>
                <span aria-hidden>-</span>
                <span className="hidden shrink-0 sm:inline">
                  {replyCountLabel(comment.replyCount)}
                </span>
              </>
            ) : null}
            <span className="ml-auto shrink-0">
              {currentUserId !== null && currentUserId !== comment.user.id ? (
                <ReportButton
                  targetId={comment.id}
                  targetType="forumComment"
                  variant="icon"
                />
              ) : null}
            </span>
          </div>

          {isCollapsed ? (
            <button
              className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black text-canopy-700 transition hover:bg-canopy-50"
              onClick={() => onToggleCollapse(comment.id)}
              title="Expand thread"
              type="button"
            >
              <ChevronRight size={13} aria-hidden />
              {hiddenReplyLabel(comment.replyCount)}
            </button>
          ) : (
            <>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[0.95rem] font-semibold leading-6 text-ink/75">
                {comment.body}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1">
                {currentUserId !== null ? (
                  <button
                    aria-label={
                      likedByCurrentUser
                        ? `Unlike comment by ${comment.user.username}`
                        : `Like comment by ${comment.user.username}`
                    }
                    className={clsx(
                      "inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-black transition disabled:opacity-60",
                      likedByCurrentUser
                        ? "bg-canopy-50 text-canopy-700"
                        : "text-ink/50 hover:bg-canopy-50 hover:text-canopy-700"
                    )}
                    disabled={likeSaving}
                    onClick={toggleLike}
                    title={likedByCurrentUser ? "Unlike" : "Like"}
                    type="button"
                  >
                    <ArrowBigUp size={15} aria-hidden />
                    <span>{formatCompactCount(likeCount)}</span>
                  </button>
                ) : (
                  <Link
                    aria-label={`Log in to like comment by ${comment.user.username}`}
                    className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-black text-ink/50 transition hover:bg-canopy-50 hover:text-canopy-700"
                    href={`/login?redirectTo=/forum/${threadId}`}
                    title="Log in to like"
                  >
                    <ArrowBigUp size={15} aria-hidden />
                    <span>{formatCompactCount(likeCount)}</span>
                  </Link>
                )}

                {currentUserId !== null ? (
                  <button
                    aria-label={`Reply to ${comment.user.username}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink/50 transition hover:bg-canopy-50 hover:text-canopy-700"
                    onClick={() =>
                      onReply(
                        replyingToCommentId === comment.id ? null : comment.id
                      )
                    }
                    title="Reply"
                    type="button"
                  >
                    <MessageSquareReply size={15} aria-hidden />
                  </button>
                ) : (
                  <Link
                    aria-label={`Log in to reply to ${comment.user.username}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink/50 transition hover:bg-canopy-50 hover:text-canopy-700"
                    href={`/login?redirectTo=/forum/${threadId}`}
                    title="Log in to reply"
                  >
                    <MessageSquareReply size={15} aria-hidden />
                  </Link>
                )}

                {comment.replyCount > 0 ? (
                  <span className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-black text-water-700">
                    <MessageCircle size={14} aria-hidden />
                    {formatCompactCount(comment.replyCount)}
                  </span>
                ) : null}

                {canCollapse ? (
                  <button
                    aria-label={`Collapse thread from ${comment.user.username}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink/40 transition hover:bg-canopy-50 hover:text-canopy-700"
                    onClick={() => onToggleCollapse(comment.id)}
                    title="Collapse thread"
                    type="button"
                  >
                    <ChevronDown size={15} aria-hidden />
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
      </div>

      {!isCollapsed && comment.replies.length ? (
        <div className="mt-1 grid gap-1" style={repliesStyle}>
          {comment.replies.map((reply) => (
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
          ))}
        </div>
      ) : null}
    </article>
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
    <div className="grid gap-2 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-3 shadow-sm sm:p-4">
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

import { ContentStatus, CourseEventVisibility } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Tag } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ForumCommentComposerToggle } from "@/components/ForumCommentComposerToggle";
import {
  ForumCommentThread,
  type ForumCommentView
} from "@/components/ForumCommentThread";
import { ReportButton } from "@/components/ReportButton";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  courseEventTypeLabels,
  formatEventDateTime
} from "@/lib/events";
import {
  buildForumCommentTree,
  type ForumCommentTreeNode,
  type ForumCommentTreeSource
} from "@/lib/forum-comments";

export const dynamic = "force-dynamic";

type ForumThreadPageProps = {
  params: {
    threadId: string;
  };
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatCommentDate(date: Date) {
  const secondsAgo = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (secondsAgo < 60) return "now";
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 2592000) return `${Math.floor(secondsAgo / 86400)}d ago`;
  if (secondsAgo < 31536000) return `${Math.floor(secondsAgo / 2592000)}mo ago`;

  return `${Math.floor(secondsAgo / 31536000)}y ago`;
}

type ForumCommentRecord = ForumCommentTreeSource & {
  createdAt: Date;
  likeCount: number;
  likes?: Array<{ id: number }>;
};

function serializeCommentTree(
  comments: Array<ForumCommentTreeNode<ForumCommentRecord>>
): ForumCommentView[] {
  return comments.map((comment) => ({
    id: comment.id,
    parentCommentId: comment.parentCommentId,
    body: comment.body,
    createdAtLabel: formatCommentDate(comment.createdAt),
    likedByCurrentUser: Boolean(comment.likes?.length),
    likeCount: comment.likeCount,
    replyCount: comment.replyCount,
    user: comment.user,
    replies: serializeCommentTree(comment.replies)
  }));
}

export default async function ForumThreadPage({ params }: ForumThreadPageProps) {
  const threadId = Number(params.threadId);

  if (!Number.isInteger(threadId)) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const [thread, comments] = await Promise.all([
    prisma.forumThread.findFirst({
      where: {
        id: threadId,
        status: ContentStatus.visible,
        OR: [
          { eventId: null },
          { event: { visibility: CourseEventVisibility.public } },
          { event: { visibility: CourseEventVisibility.unlisted } },
          ...(currentUser ? [{ event: { hostId: currentUser.id } }] : [])
        ]
      },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } },
        course: { select: { id: true, name: true, locationName: true } },
        photos: { orderBy: { sortOrder: "asc" } },
        event: {
          select: {
            id: true,
            title: true,
            type: true,
            startTime: true,
            timezone: true,
            visibility: true
          }
        }
      }
    }),
    prisma.forumComment.findMany({
      where: { threadId, status: ContentStatus.visible },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } },
        ...(currentUser
          ? {
              likes: {
                where: { userId: currentUser.id },
                select: { id: true }
              }
            }
          : {})
      },
      orderBy: { createdAt: "asc" }
    })
  ]);

  if (!thread) {
    notFound();
  }

  const commentTree = serializeCommentTree(buildForumCommentTree(comments));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <Link
        className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
        href={
          thread.event
            ? `/events/${thread.event.id}`
            : thread.course
              ? `/courses/${thread.course.id}/forum`
              : "/forum"
        }
      >
        <ArrowLeft size={16} aria-hidden />
        {thread.event
          ? "Event"
          : thread.course
            ? `${thread.course.name} forum`
            : "Forum"}
      </Link>

      <article className="rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-ink/60">
              <Avatar
                name={thread.user.username}
                size="sm"
                src={thread.user.profileImageUrl}
              />
              @{thread.user.username} - {formatDate(thread.createdAt)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {thread.course ? (
                <Link
                  className="rounded-full bg-canopy-50 px-3 py-1 text-xs font-black uppercase text-canopy-700 transition hover:bg-canopy-100"
                  href={`/courses/${thread.course.id}/forum`}
                >
                  {thread.course.name}
                </Link>
              ) : null}
              {thread.flair ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-water-100 px-3 py-1 text-xs font-black uppercase text-water-700">
                  <Tag size={13} aria-hidden />
                  {thread.flair}
                </span>
              ) : null}
              {thread.event ? (
                <Link
                  className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-3 py-1 text-xs font-black uppercase text-clay-700 transition hover:bg-clay-300/45"
                  href={`/events/${thread.event.id}`}
                >
                  <CalendarClock size={13} aria-hidden />
                  {courseEventTypeLabels[thread.event.type]}
                </Link>
              ) : null}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight text-ink">
              {thread.title}
            </h1>
            {thread.event ? (
              <p className="mt-2 text-sm font-black uppercase text-ink/45">
                {formatEventDateTime(
                  thread.event.startTime,
                  thread.event.timezone
                )}
              </p>
            ) : null}
          </div>
          {currentUser && currentUser.id !== thread.user.id ? (
            <ReportButton targetId={thread.id} targetType="forumThread" />
          ) : null}
        </div>
        <p className="mt-5 whitespace-pre-wrap text-base font-semibold leading-7 text-ink/70">
          {thread.body}
        </p>
        {thread.photos.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {thread.photos.map((photo, index) => (
              <a
                className={`relative overflow-hidden rounded-lg bg-ink ${
                  thread.photos.length === 1 || index === 0
                    ? "min-h-80 sm:col-span-2"
                    : "min-h-56"
                }`}
                href={photo.url}
                key={photo.id}
                target="_blank"
              >
                <img
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  src={photo.url}
                />
              </a>
            ))}
          </div>
        ) : null}
      </article>

      <section className="grid gap-4">
        <ForumCommentComposerToggle
          commentCount={comments.length}
          isAuthenticated={Boolean(currentUser)}
          loginHref={`/login?redirectTo=/forum/${thread.id}`}
          threadId={thread.id}
        />

        <ForumCommentThread
          comments={commentTree}
          currentUserId={currentUser?.id ?? null}
          threadId={thread.id}
        />
      </section>
    </main>
  );
}

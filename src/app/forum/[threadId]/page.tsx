import { ContentStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ForumCommentForm } from "@/components/ForumCommentForm";
import { ReportButton } from "@/components/ReportButton";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

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

export default async function ForumThreadPage({ params }: ForumThreadPageProps) {
  const threadId = Number(params.threadId);

  if (!Number.isInteger(threadId)) {
    notFound();
  }

  const [currentUser, thread] = await Promise.all([
    getCurrentUser(),
    prisma.forumThread.findFirst({
      where: { id: threadId, status: ContentStatus.visible },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } },
        photos: { orderBy: { sortOrder: "asc" } },
        comments: {
          where: { status: ContentStatus.visible },
          include: {
            user: { select: { id: true, username: true, profileImageUrl: true } }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    })
  ]);

  if (!thread) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <Link
        className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
        href="/forum"
      >
        <ArrowLeft size={16} aria-hidden />
        Forum
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
            <h1 className="mt-4 text-4xl font-black leading-tight text-ink">
              {thread.title}
            </h1>
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-ink">Comments</h2>
          <span className="flex items-center gap-2 rounded-full bg-water-100 px-3 py-1 text-sm font-black text-water-700">
            <MessageSquare size={15} aria-hidden />
            {thread.comments.length}
          </span>
        </div>

        {currentUser ? (
          <ForumCommentForm threadId={thread.id} />
        ) : (
          <Link
            className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
            href={`/login?redirectTo=/forum/${thread.id}`}
          >
            Log in to comment
          </Link>
        )}

        {thread.comments.map((comment) => (
          <article
            className="rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm"
            key={comment.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-bold text-ink/60">
                <Avatar
                  name={comment.user.username}
                  size="sm"
                  src={comment.user.profileImageUrl}
                />
                @{comment.user.username} - {formatDate(comment.createdAt)}
              </p>
              {currentUser && currentUser.id !== comment.user.id ? (
                <ReportButton targetId={comment.id} targetType="forumComment" />
              ) : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-ink/70">
              {comment.body}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}

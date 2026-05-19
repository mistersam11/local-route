import { ContentStatus } from "@prisma/client";
import Link from "next/link";
import { LogIn, MessageSquare, Search } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ForumRulesModal } from "@/components/ForumRulesModal";
import { ForumThreadForm } from "@/components/ForumThreadForm";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ForumPageProps = {
  searchParams?: {
    q?: string;
  };
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const query = searchParams?.q?.trim() ?? "";
  const [currentUser, threads] = await Promise.all([
    getCurrentUser(),
    prisma.forumThread.findMany({
      where: {
        status: ContentStatus.visible,
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { body: { contains: query } },
                { user: { username: { contains: query } } }
              ]
            }
          : {})
      },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } },
        _count: {
          select: { comments: { where: { status: ContentStatus.visible } } }
        },
        comments: {
          where: { status: ContentStatus.visible },
          select: {
            id: true,
            body: true,
            createdAt: true,
            user: { select: { username: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" },
      take: 40
    })
  ]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <ForumRulesModal userKey={currentUser ? String(currentUser.id) : "guest"} />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-clay-700">Forum</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            Talk disc golf with the community
          </h1>
        </div>
        <form
          action="/forum"
          className="flex min-h-14 overflow-hidden rounded-full border border-canopy-900/10 bg-white shadow-panel"
        >
          <label className="flex flex-1 items-center gap-3 px-5">
            <Search size={20} className="shrink-0 text-canopy-700" aria-hidden />
            <input
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/45"
              defaultValue={query}
              name="q"
              placeholder="Search threads"
            />
          </label>
          <button
            className="m-1 inline-flex items-center justify-center rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-canopy-700"
            type="submit"
          >
            Search
          </button>
        </form>
      </section>

      {currentUser ? (
        <ForumThreadForm />
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-ink">Join the conversation</h2>
            <p className="mt-1 text-sm font-semibold text-ink/60">
              Log in to create threads and comment.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
            href="/login?redirectTo=/forum"
          >
            <LogIn size={16} aria-hidden />
            Log in
          </Link>
        </section>
      )}

      <section className="grid gap-3">
        {threads.map((thread) => {
          const latestComment = thread.comments[0] ?? null;

          return (
            <Link
              className="group grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm transition hover:shadow-panel"
              href={`/forum/${thread.id}`}
              key={thread.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-black text-ink">{thread.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-ink/65">
                    {thread.body}
                  </p>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-water-100 px-3 py-1 text-sm font-black text-water-700">
                  <MessageSquare size={15} aria-hidden />
                  {thread._count.comments}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-ink/60">
                <span className="flex items-center gap-2">
                  <Avatar
                    name={thread.user.username}
                    size="sm"
                    src={thread.user.profileImageUrl}
                  />
                  @{thread.user.username} - {formatDate(thread.createdAt)}
                </span>
                {latestComment ? (
                  <span className="max-w-md truncate text-ink/45">
                    Latest: @{latestComment.user.username} - {latestComment.body}
                  </span>
                ) : (
                  <span className="text-canopy-700 transition group-hover:translate-x-1">
                    Be first to comment
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </section>

      {!threads.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <MessageSquare className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">No threads found</h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            Start a new one or try another search.
          </p>
        </section>
      ) : null}
    </main>
  );
}

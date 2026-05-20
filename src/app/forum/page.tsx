import Link from "next/link";
import { CalendarClock, LogIn, MessageSquare, Search, Tag } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ForumComposer } from "@/components/ForumComposer";
import { ForumRulesModal } from "@/components/ForumRulesModal";
import { getCurrentUser } from "@/lib/current-user";
import {
  getPersonalizedForumFeed,
  normalizeForumFeedPage
} from "@/lib/forum-feed";
import { courseEventTypeLabels, formatEventDateTime } from "@/lib/events";

export const dynamic = "force-dynamic";

type ForumPageProps = {
  searchParams?: {
    q?: string;
    page?: string;
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
  const page = normalizeForumFeedPage(searchParams?.page);
  const currentUser = await getCurrentUser();
  const feed = await getPersonalizedForumFeed({
    userId: currentUser?.id,
    query,
    page
  });
  const loadMoreParams = new URLSearchParams();

  if (query) {
    loadMoreParams.set("q", query);
  }

  if (feed.nextPage) {
    loadMoreParams.set("page", String(feed.nextPage));
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <ForumRulesModal userKey={currentUser ? String(currentUser.id) : "guest"} />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-clay-700">Chains</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            Talk disc golf
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
              placeholder="Search chains"
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
        <ForumComposer />
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-ink">Join the conversation</h2>
            <p className="mt-1 text-sm font-semibold text-ink/60">
              Log in to start chains and comment.
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
        {feed.items.map((item) => {
          const thread = item.thread;
          const latestComment = thread.comments[0] ?? null;

          return (
            <Link
              className="group grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm transition hover:shadow-panel"
              href={`/forum/${thread.id}`}
              key={thread.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.course ? (
                      <span className="rounded-full bg-canopy-50 px-2.5 py-1 text-xs font-black uppercase text-canopy-700">
                        {thread.course.name}
                      </span>
                    ) : null}
                    {item.source === "suggested" ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black uppercase text-ink/45 ring-1 ring-canopy-900/10">
                        Suggested
                      </span>
                    ) : null}
                    {thread.flair ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-water-100 px-2.5 py-1 text-xs font-black uppercase text-water-700">
                        <Tag size={13} aria-hidden />
                        {thread.flair}
                      </span>
                    ) : null}
                    {thread.event ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-black uppercase text-clay-700">
                        <CalendarClock size={13} aria-hidden />
                        {courseEventTypeLabels[thread.event.type]}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-ink">{thread.title}</h2>
                  {thread.event ? (
                    <p className="mt-1 text-xs font-black uppercase text-ink/45">
                      {formatEventDateTime(
                        thread.event.startTime,
                        thread.event.timezone
                      )}
                    </p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-ink/65">
                    {thread.body}
                  </p>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-water-100 px-3 py-1 text-sm font-black text-water-700">
                  <MessageSquare size={15} aria-hidden />
                  {thread._count.comments}
                </span>
              </div>
              {thread.photos.length ? (
                <div className="grid grid-cols-4 gap-2">
                  {thread.photos.map((photo) => (
                    <div
                      className="relative h-24 overflow-hidden rounded-lg bg-ink"
                      key={photo.id}
                    >
                      <img
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                        src={photo.url}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
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

      {feed.nextPage ? (
        <Link
          className="mx-auto inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-canopy-700 shadow-sm transition hover:bg-canopy-50"
          href={`/forum?${loadMoreParams.toString()}`}
        >
          Load more
        </Link>
      ) : null}

      {!feed.items.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <MessageSquare className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">
            {query ? "No posts found" : "Follow courses to personalize your feed"}
          </h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            {query
              ? "Try another search or clear your filters."
              : "Suggested community posts will appear here as the network grows."}
          </p>
        </section>
      ) : null}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  MessageSquare,
  Search,
  Tag
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FeedSkeleton } from "@/components/PageSkeletons";

export type ForumFeedClientItem = {
  source: "followed" | "suggested";
  score?: number;
  thread: {
    id: number;
    title: string;
    body: string;
    flair: string | null;
    createdAt: string;
    updatedAt: string;
    commentCount: number;
    author: {
      id: number;
      username: string;
      profileImageUrl: string | null;
    };
    course: {
      id: number;
      name: string;
      locationName: string;
    } | null;
    latestComment: {
      id: number;
      body: string;
      createdAt: string;
      author: {
        username: string;
      };
    } | null;
    photos: Array<{
      id: number;
      url: string;
      sortOrder: number;
    }>;
    event: {
      id: number;
      title: string;
      type: string;
      startTime: string;
      timezone: string;
    } | null;
  };
};

type ForumFeedListProps = {
  initialItems: ForumFeedClientItem[];
  initialNextPage: number | null;
  query: string;
  includeEvents: boolean;
  hasPersonalizationSignals: boolean;
};

const eventTypeLabels: Record<string, string> = {
  casualRound: "Casual round",
  clinic: "Clinic",
  doubles: "Doubles",
  glowRound: "Glow round",
  leagueNight: "League night",
  puttingLeague: "Putting league",
  tagsMatch: "Tags match",
  tournament: "Tournament"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatEventDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone
  }).format(new Date(value));
}

export function ForumFeedList({
  initialItems,
  initialNextPage,
  query,
  includeEvents,
  hasPersonalizationSignals
}: ForumFeedListProps) {
  const [items, setItems] = useState(initialItems);
  const [nextPage, setNextPage] = useState(initialNextPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(initialItems);
    setNextPage(initialNextPage);
    setLoading(false);
    setError(null);
  }, [includeEvents, initialItems, initialNextPage, query]);

  const loadNextPage = useCallback(() => {
    if (!nextPage || loading) return;

    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: "20"
    });

    if (query) {
      params.set("q", query);
    }

    if (!includeEvents) {
      params.set("includeEvents", "0");
    }

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/forum/threads?${params.toString()}`);

        if (!response.ok) {
          setError("More posts could not be loaded.");
          return;
        }

        const payload = (await response.json()) as {
          items: ForumFeedClientItem[];
          nextPage: number | null;
        };

        setItems((current) => {
          const seen = new Set(current.map((item) => item.thread.id));
          const fresh = payload.items.filter((item) => !seen.has(item.thread.id));

          return [...current, ...fresh];
        });
        setNextPage(payload.nextPage);
      } catch {
        setError("More posts could not be loaded.");
      } finally {
        setLoading(false);
      }
    })();
  }, [includeEvents, loading, nextPage, query]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !nextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadNextPage();
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loadNextPage, nextPage]);

  if (!items.length) {
    const hasActiveFilters = Boolean(query) || !includeEvents;

    return (
      <section className="rounded-lg bg-white p-8 text-center shadow-sm">
        <MessageSquare className="mx-auto text-canopy-700" size={32} aria-hidden />
        <h2 className="mt-4 text-2xl font-black text-ink">
          {query ? "No posts found" : "Follow courses to personalize your feed."}
        </h2>
        <p className="mt-2 text-sm font-semibold text-ink/55">
          {query
            ? "Try another search or clear your filters."
            : hasPersonalizationSignals
              ? "Start a chain or follow more courses to keep fresh local posts flowing."
              : "Follow courses to see local posts first, or start the next chain."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {hasActiveFilters ? (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canopy-50 px-4 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
              href="/forum"
            >
              <Search size={15} aria-hidden />
              {query && includeEvents ? "Clear search" : "Clear filters"}
            </Link>
          ) : null}
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700"
            href="/"
          >
            Find courses
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      {items.map((item) => {
        const thread = item.thread;

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
                      {eventTypeLabels[thread.event.type] ?? thread.event.type}
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
                {thread.commentCount}
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
                  name={thread.author.username}
                  size="sm"
                  src={thread.author.profileImageUrl}
                />
                @{thread.author.username} - {formatDate(thread.createdAt)}
              </span>
              {thread.latestComment ? (
                <span className="max-w-md truncate text-ink/45">
                  Latest: @{thread.latestComment.author.username} -{" "}
                  {thread.latestComment.body}
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

      <div ref={sentinelRef} />

      {loading ? <FeedSkeleton count={2} /> : null}

      {error ? (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg bg-white p-4 text-sm font-bold text-clay-700 shadow-sm">
          {error}
          {nextPage ? (
            <button
              className="rounded-full bg-clay-100 px-4 py-2 text-clay-700 transition hover:bg-clay-300/45"
              onClick={loadNextPage}
              type="button"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {!nextPage && !loading ? (
        <div className="rounded-lg bg-white p-4 text-center text-sm font-bold text-ink/55 shadow-sm">
          You are caught up. Follow courses or start a chain to keep the feed moving.
        </div>
      ) : null}
    </section>
  );
}

import { ContentStatus, CourseEventVisibility, Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  LogIn,
  MapPin,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Tag
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CourseFollowButton } from "@/components/CourseFollowButton";
import { ForumComposer } from "@/components/ForumComposer";
import { PaginationControls } from "@/components/PaginationControls";
import { PlaceholderBackedImage } from "@/components/PlaceholderBackedImage";
import { Stars } from "@/components/Stars";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  courseEventTypeLabels,
  countEventRsvps,
  formatEventDateTime
} from "@/lib/events";
import { PAGE_SIZE, clampPage, normalizePage, pageSkip } from "@/lib/pagination";
import { getCoursePlaceholderImage } from "@/lib/placeholder-images";

export const dynamic = "force-dynamic";

type CourseForumPageProps = {
  params: {
    courseId: string;
  };
  searchParams?: {
    q?: string;
    sort?: string;
    flair?: string;
    page?: string;
    compose?: string;
    intent?: string;
  };
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default async function CourseForumPage({
  params,
  searchParams
}: CourseForumPageProps) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    notFound();
  }

  const query = searchParams?.q?.trim() ?? "";
  const sort = searchParams?.sort === "discussed" ? "discussed" : "newest";
  const flair = searchParams?.flair?.trim() ?? "";
  const requestedPage = normalizePage(searchParams?.page);
  const [currentUser, course, reviewAggregate] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { id: courseId, status: "approved" }
    }),
    prisma.courseReview.aggregate({
      where: { courseId, status: ContentStatus.visible },
      _avg: { rating: true },
      _count: { _all: true }
    })
  ]);

  if (!course) {
    notFound();
  }

  const visibleThreadScope = {
    OR: [
      { eventId: null },
      { event: { visibility: CourseEventVisibility.public } }
    ]
  };
  const threadWhere = {
    AND: [
      { courseId, status: ContentStatus.visible, ...(flair ? { flair } : {}) },
      visibleThreadScope,
      ...(query
        ? [
            {
              OR: [
                { title: { contains: query } },
                { body: { contains: query } },
                { flair: { contains: query } },
                { user: { username: { contains: query } } }
              ]
            }
          ]
        : [])
    ]
  } satisfies Prisma.ForumThreadWhereInput;
  const threadOrderBy: Prisma.ForumThreadOrderByWithRelationInput[] =
    sort === "discussed"
      ? [
          { comments: { _count: "desc" } },
          { createdAt: "desc" },
          { id: "desc" }
        ]
      : [{ createdAt: "desc" }, { id: "desc" }];
  const [
    totalThreads,
    flairs,
    followerCount,
    currentFollow,
    postCount,
    upcomingEvents
  ] = await Promise.all([
      prisma.forumThread.count({ where: threadWhere }),
      prisma.forumThread.findMany({
        where: {
          AND: [
            { courseId, status: ContentStatus.visible, flair: { not: null } },
            visibleThreadScope
          ]
        },
        distinct: ["flair"],
        select: { flair: true },
        orderBy: { flair: "asc" }
      }),
      prisma.courseFollow.count({ where: { courseId } }),
      currentUser
        ? prisma.courseFollow.findUnique({
            where: { userId_courseId: { userId: currentUser.id, courseId } },
            select: { id: true }
          })
        : Promise.resolve(null),
      prisma.forumThread.count({
        where: {
          AND: [{ courseId, status: ContentStatus.visible }, visibleThreadScope]
        }
      }),
      prisma.courseEvent.findMany({
        where: {
          courseId,
          visibility: CourseEventVisibility.public,
          startTime: { gte: new Date() }
        },
        include: {
          rsvps: { select: { status: true } },
          discussionThread: {
            select: {
              id: true,
              _count: {
                select: { comments: { where: { status: ContentStatus.visible } } }
              }
            }
          }
        },
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        take: 5
      })
    ]);
  const page = clampPage(requestedPage, totalThreads);
  const threads = await prisma.forumThread.findMany({
    where: threadWhere,
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
      },
      photos: {
        orderBy: { sortOrder: "asc" },
        take: 4
      },
      event: {
        select: {
          id: true,
          type: true,
          startTime: true,
          timezone: true
        }
      }
    },
    orderBy: threadOrderBy,
    skip: pageSkip(page),
    take: PAGE_SIZE
  });

  const reviewCount = reviewAggregate._count._all;
  const averageRating = reviewAggregate._avg.rating ?? 0;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <Link
        className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
        href={`/courses/${course.id}`}
      >
        <ArrowLeft size={16} aria-hidden />
        Course
      </Link>

      <section className="overflow-hidden rounded-lg bg-[#fffdf7] shadow-panel">
        <div className="relative min-h-[300px] bg-ink">
          <PlaceholderBackedImage
            loading="eager"
            placeholder={getCoursePlaceholderImage(course)}
            sizes="(min-width: 1024px) 896px, 100vw"
            uploadedAlt={`Photo of ${course.name}`}
            uploadedSrc={course.coverPhotoUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 grid gap-4 p-5 text-white sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold uppercase text-white/75">
                <MapPin size={16} aria-hidden />
                {course.locationName}
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
                {course.name} Forum
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold">
                <span className="flex items-center gap-2">
                  <Stars rating={averageRating} />
                  {reviewCount ? averageRating.toFixed(1) : "No reviews yet"}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={15} aria-hidden />
                  {postCount} posts
                </span>
              </p>
            </div>
            <CourseFollowButton
              courseId={course.id}
              currentUserId={currentUser?.id}
              initialFollowerCount={followerCount}
              initialIsFollowing={Boolean(currentFollow)}
            />
          </div>
        </div>
      </section>

      {upcomingEvents.length ? (
        <section className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-black text-ink">
              <CalendarClock size={19} aria-hidden />
              Upcoming events
            </h2>
            <Link
              className="rounded-full bg-canopy-50 px-3 py-1.5 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
              href={`/events?courseId=${course.id}`}
            >
              Course calendar
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {upcomingEvents.map((event) => {
              const rsvpCounts = countEventRsvps(event.rsvps);

              return (
                <Link
                  className="grid gap-1 rounded-lg bg-[#fffdf7] p-3 transition hover:bg-canopy-50"
                  href={`/events/${event.id}`}
                  key={event.id}
                >
                  <span className="flex flex-wrap items-center gap-2 text-xs font-black uppercase text-canopy-700">
                    {courseEventTypeLabels[event.type]}
                    <span className="text-ink/35">-</span>
                    {rsvpCounts.going} going
                  </span>
                  <span className="text-base font-black text-ink">{event.title}</span>
                  <span className="text-xs font-bold text-ink/55">
                    {formatEventDateTime(event.startTime, event.timezone)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <form
        action={`/courses/${course.id}/forum`}
        className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-3 shadow-sm lg:grid-cols-[1fr_170px_170px_auto]"
      >
        <label className="flex min-h-11 items-center gap-3 rounded-full border border-canopy-900/10 px-4">
          <Search size={18} className="shrink-0 text-canopy-700" aria-hidden />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-ink/45"
            defaultValue={query}
            name="q"
            placeholder="Search this forum"
          />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Flair
          <select
            className="h-11 rounded-lg border border-canopy-900/10 px-3 text-sm font-bold normal-case text-ink outline-none"
            defaultValue={flair}
            name="flair"
          >
            <option value="">Any</option>
            {flairs.map((entry) =>
              entry.flair ? (
                <option key={entry.flair} value={entry.flair}>
                  {entry.flair}
                </option>
              ) : null
            )}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Sort
          <select
            className="h-11 rounded-lg border border-canopy-900/10 px-3 text-sm font-bold normal-case text-ink outline-none"
            defaultValue={sort}
            name="sort"
          >
            <option value="newest">Newest</option>
            <option value="discussed">Most discussed</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-canopy-700 px-4 text-sm font-black text-white transition hover:bg-canopy-900"
            type="submit"
          >
            <SlidersHorizontal size={16} aria-hidden />
            Filter
          </button>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full bg-canopy-50 px-4 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
            href={`/courses/${course.id}/forum`}
          >
            Clear
          </Link>
        </div>
      </form>

      {currentUser ? (
        <ForumComposer
          courseId={course.id}
          courseName={course.name}
          initialOpen={searchParams?.compose === "1"}
          intent={searchParams?.intent}
        />
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-ink">Join this community</h2>
            <p className="mt-1 text-sm font-semibold text-ink/60">
              Log in to post in the {course.name} forum.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
            href={`/login?redirectTo=/courses/${course.id}/forum`}
          >
            <LogIn size={16} aria-hidden />
            Log in
          </Link>
        </section>
      )}

      <PaginationControls
        basePath={`/courses/${course.id}/forum`}
        currentPage={page}
        itemLabel="posts"
        searchParams={{ q: query, flair, sort }}
        totalItems={totalThreads}
      />

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
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.flair ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-canopy-50 px-2.5 py-1 text-xs font-black uppercase text-canopy-700">
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
                    <span className="text-sm font-bold text-ink/45">
                      {formatDate(thread.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-ink">
                    {thread.title}
                  </h2>
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
                  @{thread.user.username}
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

      <PaginationControls
        basePath={`/courses/${course.id}/forum`}
        currentPage={page}
        itemLabel="posts"
        searchParams={{ q: query, flair, sort }}
        totalItems={totalThreads}
      />

      {!threads.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <MessageSquare className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">
            {query || flair
              ? "No posts found"
              : `Be the first to post about ${course.name}.`}
          </h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            {query || flair
              ? "Try another search or clear your filters."
              : "Share conditions, photos, league plans, or a quick local question."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {query || flair ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full bg-canopy-50 px-4 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
                href={`/courses/${course.id}/forum`}
              >
                Clear filters
              </Link>
            ) : null}
            <Link
              className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700"
              href={
                currentUser
                  ? `/courses/${course.id}/forum?compose=1`
                  : `/login?redirectTo=${encodeURIComponent(
                      `/courses/${course.id}/forum?compose=1`
                    )}`
              }
            >
              Start a chain
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}

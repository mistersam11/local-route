import {
  ContentStatus,
  CourseEventVisibility,
  CourseMarkType,
  Prisma
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Disc3,
  Flag,
  ExternalLink,
  LogIn,
  MapPin,
  MessageSquare,
  PencilLine,
  Star
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CourseMarkButtons } from "@/components/CourseMarkButtons";
import { CourseReviewForm } from "@/components/CourseReviewForm";
import { LayoutSelector } from "@/components/LayoutSelector";
import { PaginationControls } from "@/components/PaginationControls";
import { PlaceholderBackedImage } from "@/components/PlaceholderBackedImage";
import { ReportButton } from "@/components/ReportButton";
import { Stars } from "@/components/Stars";
import {
  courseDifficultyLabels,
  selectedCourseFacts,
  type CourseDifficultyValue
} from "@/lib/course-facts";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  courseEventCommunitySections,
  courseEventTypeLabels,
  countEventRsvps,
  formatEventDateTime,
  groupCourseEventsForCommunity
} from "@/lib/events";
import { PAGE_SIZE, clampPage, normalizePage, pageSkip } from "@/lib/pagination";
import {
  getCoursePlaceholderImage,
  getHolePlaceholderImage
} from "@/lib/placeholder-images";

export const dynamic = "force-dynamic";

type CoursePageProps = {
  params: {
    courseId: string;
  };
  searchParams?: {
    layout?: string;
    holesPage?: string;
    reviewsPage?: string;
    editProposal?: string;
  };
};

function formatLastUpdated(date: Date) {
  return `Last updated ${new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(date)}`;
}

function reviewSummary(reviewCount: number, averageRating: number) {
  if (!reviewCount) {
    return "No reviews yet";
  }

  return `${averageRating.toFixed(1)} from ${reviewCount} ${
    reviewCount === 1 ? "review" : "reviews"
  }`;
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    notFound();
  }

  const [currentUser, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        layouts: {
          include: { _count: { select: { holes: true } } },
          orderBy: { sortOrder: "asc" }
        },
        submittedBy: {
          select: { id: true, username: true, profileImageUrl: true }
        },
        editProposals: {
          where: { status: "pending" },
          select: { id: true, submittedById: true },
          orderBy: { createdAt: "desc" }
        }
      }
    })
  ]);

  if (!course) {
    notFound();
  }

  const canEditDraft =
    currentUser?.isAdmin || currentUser?.id === course.submittedById;

  if (course.status === "draft" && !canEditDraft) {
    notFound();
  }

  const requestedLayoutId = Number(searchParams?.layout);
  const selectedLayout =
    Number.isInteger(requestedLayoutId) && requestedLayoutId > 0
      ? course.layouts.find((layout) => layout.id === requestedLayoutId) ??
        course.layouts[0]
      : course.layouts[0];
  const holeWhere = {
    courseId,
    layoutId: selectedLayout?.id ?? null
  } satisfies Prisma.HoleWhereInput;
  const requestedHolesPage = normalizePage(searchParams?.holesPage);
  const requestedReviewsPage = normalizePage(searchParams?.reviewsPage);
  const [displayHoleCount, reviewAggregate] = await Promise.all([
    prisma.hole.count({ where: holeWhere }),
    prisma.courseReview.aggregate({
      where: { courseId, status: ContentStatus.visible },
      _avg: { rating: true },
      _count: { _all: true }
    })
  ]);
  const reviewCount = reviewAggregate._count._all;
  const holesPage = clampPage(requestedHolesPage, displayHoleCount);
  const reviewsPage = clampPage(requestedReviewsPage, reviewCount);
  const [
    displayHoles,
    pagedReviews,
    recentActivity,
    markCounts,
    currentMarks,
    courseThreadCount,
    upcomingEvents,
    totalLines,
    totalHoleReviews
  ] = await Promise.all([
      prisma.hole.findMany({
        where: holeWhere,
        include: {
          _count: {
            select: {
              lines: { where: { status: ContentStatus.visible } },
              reviews: { where: { status: ContentStatus.visible } }
            }
          },
          lines: {
            where: { status: ContentStatus.visible },
            orderBy: [{ upvotes: "desc" }, { downvotes: "asc" }],
            take: 1
          },
          reviews: {
            where: { status: ContentStatus.visible },
            select: { rating: true }
          }
        },
        orderBy: [{ holeNumber: "asc" }, { id: "asc" }],
        skip: pageSkip(holesPage),
        take: PAGE_SIZE
      }),
      prisma.courseReview.findMany({
        where: { courseId, status: ContentStatus.visible },
        include: {
          user: { select: { id: true, username: true, profileImageUrl: true } }
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: pageSkip(reviewsPage),
        take: PAGE_SIZE
      }),
      prisma.holeReview.findMany({
        where: {
          status: ContentStatus.visible,
          hole: holeWhere
        },
        include: {
          user: { select: { id: true, username: true, profileImageUrl: true } },
          hole: { select: { id: true, holeNumber: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.courseMark.groupBy({
        by: ["type"],
        where: { courseId },
        _count: { _all: true }
      }),
      currentUser
        ? prisma.courseMark.findMany({
            where: { courseId, userId: currentUser.id },
            select: { type: true }
          })
        : Promise.resolve([]),
      prisma.forumThread.count({
        where: {
          courseId,
          status: ContentStatus.visible,
          OR: [
            { eventId: null },
            { event: { visibility: CourseEventVisibility.public } }
          ]
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
        take: 12
      }),
      prisma.line.count({
        where: {
          status: ContentStatus.visible,
          hole: holeWhere
        }
      }),
      prisma.holeReview.count({
        where: {
          status: ContentStatus.visible,
          hole: holeWhere
        }
      })
    ]);

  const averageRating = reviewAggregate._avg.rating ?? 0;
  const courseFacts = selectedCourseFacts(course);
  const currentMarkTypes = new Set(currentMarks.map((mark) => mark.type));
  const playedCount =
    markCounts.find((entry) => entry.type === CourseMarkType.played)?._count._all ?? 0;
  const wantToPlayCount =
    markCounts.find((entry) => entry.type === CourseMarkType.wantToPlay)?._count
      ._all ?? 0;
  const layoutOptions = course.layouts.map((layout) => ({
    id: layout.id,
    name: layout.name,
    holeCount: layout._count.holes
  }));
  const selectedLayoutName = selectedLayout?.name ?? course.layoutName;
  const mapQuery =
    course.latitude !== null && course.longitude !== null
      ? `${course.latitude},${course.longitude}`
      : `${course.locationAddress ?? course.locationName} ${course.name}`;
  const encodedMapQuery = encodeURIComponent(mapQuery);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedMapQuery}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodedMapQuery}`;
  const canProposeEdits = course.status === "approved";
  const pendingOwnEditProposal = currentUser
    ? course.editProposals.find(
        (proposal) => proposal.submittedById === currentUser.id
      )
    : null;
  const upcomingEventGroups = groupCourseEventsForCommunity(upcomingEvents);

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-10">
      <section className="flex flex-col gap-5">
        <Link
          href="/courses"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
        >
          <ArrowLeft size={16} aria-hidden />
          Courses
        </Link>

        <div className="overflow-hidden rounded-lg bg-[#fffdf7] shadow-panel">
          <div className="relative min-h-[340px] bg-ink">
            <PlaceholderBackedImage
              loading="eager"
              placeholder={getCoursePlaceholderImage(course)}
              sizes="(min-width: 1024px) 48vw, 100vw"
              uploadedAlt={`Photo of ${course.name}`}
              uploadedSrc={course.coverPhotoUrl}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <p className="flex items-center gap-2 text-sm font-bold uppercase text-white/75">
                <MapPin size={16} aria-hidden />
                <a
                  className="underline-offset-4 hover:underline"
                  href={googleMapsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {course.locationName}
                </a>
              </p>
              {course.status !== "approved" ? (
                <span className="mt-3 inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-black uppercase text-clay-700">
                  {course.status === "draft"
                    ? "Draft"
                    : course.status === "pending"
                      ? "Pending review"
                      : "Rejected"}
                </span>
              ) : null}
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
                {course.name}
              </h1>
              {selectedLayoutName ? (
                <p className="mt-2 text-sm font-black uppercase text-white/70">
                  {selectedLayoutName}
                </p>
              ) : null}
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold">
                {reviewCount ? <Stars rating={averageRating} /> : null}
                <span>{reviewSummary(reviewCount, averageRating)}</span>
                <span className="text-white/60">
                  {formatLastUpdated(course.updatedAt)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {searchParams?.editProposal === "submitted" ? (
          <section className="flex gap-3 rounded-lg border border-canopy-700/20 bg-canopy-50 p-4 text-sm font-bold text-canopy-700 shadow-sm">
            <CheckCircle2 className="mt-0.5 shrink-0" size={18} aria-hidden />
            <p>Thanks - your edit proposal has been submitted for review.</p>
          </section>
        ) : null}

        <LayoutSelector
          layouts={layoutOptions}
          selectedLayoutId={selectedLayout?.id}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Holes</p>
            <p className="mt-1 text-2xl font-black">{displayHoleCount}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Lines</p>
            <p className="mt-1 text-2xl font-black">{totalLines}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Hole reviews</p>
            <p className="mt-1 text-2xl font-black">{totalHoleReviews}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Difficulty</p>
            <p className="mt-1 text-2xl font-black">
              {courseDifficultyLabels[course.difficulty as CourseDifficultyValue]}
            </p>
          </div>
        </div>

        <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-ink">Quick facts</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase">
                <span className="rounded-full bg-water-100 px-2.5 py-1 text-water-700">
                  {courseDifficultyLabels[course.difficulty as CourseDifficultyValue]}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    course.isPayToPlay
                      ? "bg-clay-100 text-clay-700"
                      : "bg-canopy-50 text-canopy-700"
                  }`}
                >
                  {course.isPayToPlay ? "Pay to play" : "Free"}
                </span>
                {courseFacts.length ? (
                  courseFacts
                    .filter((fact) => fact.key !== "isPayToPlay")
                    .map((fact) => (
                      <span
                        className="rounded-full bg-canopy-50 px-2.5 py-1 text-canopy-700"
                        key={fact.key}
                      >
                        {fact.label}
                      </span>
                    ))
                ) : (
                  <span className="rounded-full bg-clay-100 px-2.5 py-1 text-clay-700">
                    Facts needed
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm font-bold text-ink/45">
                {formatLastUpdated(course.updatedAt)}
              </p>
            </div>
            <div className="w-full sm:w-auto sm:min-w-80">
              <div className="grid gap-2">
                <CourseMarkButtons
                  courseId={course.id}
                  currentUserId={currentUser?.id}
                  initialPlayed={currentMarkTypes.has(CourseMarkType.played)}
                  initialPlayedCount={playedCount}
                  initialWantToPlay={currentMarkTypes.has(CourseMarkType.wantToPlay)}
                  initialWantToPlayCount={wantToPlayCount}
                />
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-water-100 px-4 text-sm font-black text-water-700 transition hover:bg-water-200"
                  href={`/courses/${course.id}/forum`}
                >
                  <MessageSquare size={16} aria-hidden />
                  Course forum
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-ink">
                    {courseThreadCount}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {course.description ? (
          <section className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black text-ink">Course notes</h2>
            <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-ink/68">
              {course.description}
            </p>
          </section>
        ) : null}

        <section className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-ink">Location</h2>
              <p className="mt-2 flex items-center gap-2 text-sm font-bold text-ink/65">
                <MapPin size={16} aria-hidden />
                {course.locationAddress ?? course.locationName}
              </p>
              {course.locationAddress ? (
                <p className="mt-1 text-sm font-semibold text-ink/55">
                  {course.locationName}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700"
                href={googleMapsUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={15} aria-hidden />
                Google Maps
              </a>
              <a
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canopy-50 px-4 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
                href={appleMapsUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={15} aria-hidden />
                Apple Maps
              </a>
            </div>
          </div>
        </section>

        {course.status !== "approved" && canEditDraft ? (
          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
            href={`/courses/${course.id}/edit`}
          >
            Edit draft
          </Link>
        ) : null}

        {canProposeEdits ? (
          pendingOwnEditProposal ? (
            <p className="rounded-lg bg-water-100 p-3 text-sm font-bold text-water-700">
              Your edit proposal is pending admin review.
            </p>
          ) : (
            <Link
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-ink shadow-sm transition hover:bg-canopy-50"
              href={`/courses/${course.id}/edit`}
            >
              <PencilLine size={16} aria-hidden />
              Propose edits
            </Link>
          )
        ) : null}

        {course.status === "approved" && currentUser ? (
          <CourseReviewForm courseId={course.id} />
        ) : course.status === "approved" ? (
          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
            href={`/login?redirectTo=/courses/${course.id}`}
          >
            <LogIn size={16} aria-hidden />
            Log in to review
          </Link>
        ) : null}

        <section className="grid gap-3">
          <h2 className="text-2xl font-black text-ink">Reviews</h2>
          <PaginationControls
            basePath={`/courses/${course.id}`}
            currentPage={reviewsPage}
            itemLabel="reviews"
            pageParam="reviewsPage"
            searchParams={searchParams}
            totalItems={reviewCount}
          />
          <div className="grid gap-3">
            {pagedReviews.map((review) => (
              <article
                className="rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm"
                key={review.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    className="flex items-center gap-2 font-bold text-ink/70 hover:text-canopy-700"
                    href={`/profiles/${review.user.id}`}
                  >
                    <Avatar
                      name={review.user.username}
                      size="sm"
                      src={review.user.profileImageUrl}
                    />
                    @{review.user.username}
                  </Link>
                  <div className="flex items-center gap-2">
                    {currentUser && currentUser.id !== review.user.id ? (
                      <ReportButton targetId={review.id} targetType="courseReview" />
                    ) : null}
                    <span className="rounded-full bg-clay-100 px-3 py-1 text-sm font-black text-clay-700">
                      {review.rating}/5
                    </span>
                  </div>
                </div>
                {review.title ? (
                  <h3 className="mt-4 text-lg font-black text-ink">{review.title}</h3>
                ) : null}
                <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
                  {review.body}
                </p>
                {review.photoUrl ? (
                  <img
                    alt=""
                    className="mt-4 max-h-80 w-full rounded-lg object-cover"
                    src={review.photoUrl}
                  />
                ) : null}
              </article>
            ))}
          </div>
          <PaginationControls
            basePath={`/courses/${course.id}`}
            currentPage={reviewsPage}
            itemLabel="reviews"
            pageParam="reviewsPage"
            searchParams={searchParams}
            totalItems={reviewCount}
          />
          {!pagedReviews.length ? (
            <section className="rounded-lg bg-white p-6 text-center shadow-sm">
              <Star className="mx-auto text-canopy-700" size={28} aria-hidden />
              <h3 className="mt-3 text-xl font-black text-ink">
                No reviews yet. Be the first to review this course.
              </h3>
              <p className="mt-2 text-sm font-semibold text-ink/55">
                Share pace, conditions, and what first-timers should know.
              </p>
            </section>
          ) : null}
        </section>
      </section>

      <section className="flex flex-col gap-8">
        <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-black text-ink">
              <CalendarClock size={22} aria-hidden />
              Upcoming events
            </h2>
            <Link
              className="rounded-full bg-canopy-50 px-3 py-1.5 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
              href={`/events?courseId=${course.id}`}
            >
              All events
            </Link>
          </div>
          <div className="grid gap-4">
            {courseEventCommunitySections.map((section) => {
              const sectionEvents = upcomingEventGroups[section.key];

              return (
                <div className="grid gap-2 border-t border-canopy-900/10 pt-3" key={section.key}>
                  <h3 className="text-sm font-black uppercase text-ink/45">
                    {section.label}
                  </h3>
                  {sectionEvents.length ? (
                    sectionEvents.map((event) => {
                      const rsvpCounts = countEventRsvps(event.rsvps);

                      return (
                        <Link
                          className="grid gap-1 rounded-lg bg-[#fffdf7] p-3 transition hover:bg-canopy-50"
                          href={`/events/${event.id}`}
                          key={event.id}
                        >
                          <span className="text-sm font-black text-ink">
                            {event.title}
                          </span>
                          <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink/55">
                            <span>{formatEventDateTime(event.startTime, event.timezone)}</span>
                            <span>{courseEventTypeLabels[event.type]}</span>
                            <span>{rsvpCounts.going} going</span>
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <p className="text-sm font-semibold text-ink/45">
                      No events scheduled yet. Check back soon or create one.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3">
          <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-ink">Holes</h2>
          <span className="rounded-full bg-water-100 px-3 py-1 text-sm font-bold text-water-700">
            Discuss each hole
          </span>
          </div>
          <PaginationControls
            basePath={`/courses/${course.id}`}
            currentPage={holesPage}
            itemLabel="holes"
            pageParam="holesPage"
            searchParams={searchParams}
            totalItems={displayHoleCount}
          />
          <div className="grid gap-3">
          {displayHoles.map((hole) => {
            const bestLine = hole.lines[0] ?? null;
            const averageHoleRating =
              hole.reviews.length > 0
                ? hole.reviews.reduce((total, review) => total + review.rating, 0) /
                  hole.reviews.length
                : 0;

            return (
              <Link
                className="group overflow-hidden rounded-lg border border-canopy-900/10 bg-[#fffdf7] shadow-sm transition hover:shadow-panel"
                href={`/holes/${hole.id}`}
                key={hole.id}
              >
                <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                  <div className="relative min-h-36 bg-ink">
                    <PlaceholderBackedImage
                      loading="lazy"
                      placeholder={getHolePlaceholderImage({
                        courseId: course.id,
                        courseName: course.name,
                        distanceFeet: hole.distanceFeet,
                        id: hole.id,
                        holeNumber: hole.holeNumber,
                        par: hole.par,
                        teePhotoUrl: hole.teePhotoUrl
                      })}
                      sizes="(min-width: 640px) 160px, 100vw"
                      uploadedAlt={`Tee view for hole ${hole.holeNumber}`}
                      uploadedSrc={hole.teePhotoUrl}
                    />
                    <span className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-canopy-700 text-lg font-black text-white">
                      {hole.holeNumber}
                    </span>
                  </div>
                  <div className="p-4">
                    <span className="flex flex-wrap items-center gap-3 text-sm font-bold text-ink/65">
                      <span className="flex items-center gap-1">
                        <Flag size={15} aria-hidden />
                        Par {hole.par ?? "-"}
                      </span>
                      {hole.distanceFeet ? <span>{hole.distanceFeet} ft</span> : null}
                      <span className="flex items-center gap-1">
                        <Disc3 size={15} aria-hidden />
                        {hole._count.lines} lines
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={15} aria-hidden />
                        {hole._count.reviews}
                      </span>
                    </span>
                    <h3 className="mt-2 text-lg font-black text-ink">
                      Hole {hole.holeNumber}
                    </h3>
                    {hole.description ? (
                      <p className="mt-1 text-sm leading-6 text-ink/65">
                        {hole.description}
                      </p>
                    ) : null}
                    {hole.reviews.length ? (
                      <p className="mt-3 flex items-center gap-2 text-sm font-black text-ink/65">
                        <Stars rating={averageHoleRating} />
                        {averageHoleRating.toFixed(1)}
                      </p>
                    ) : null}
                    {bestLine ? (
                      <p className="mt-3 flex items-center gap-2 text-sm font-black text-clay-700">
                        <Star size={15} aria-hidden />
                        Best line: {bestLine.name}
                      </p>
                    ) : null}
                    <span className="mt-3 flex items-center gap-2 text-sm font-bold text-canopy-700 transition group-hover:translate-x-1">
                      Open discussion
                      <ArrowRight size={16} aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          </div>
          <div>
            <PaginationControls
              basePath={`/courses/${course.id}`}
              currentPage={holesPage}
              itemLabel="holes"
              pageParam="holesPage"
              searchParams={searchParams}
              totalItems={displayHoleCount}
            />
          </div>
          {!displayHoles.length ? (
            <section className="rounded-lg bg-white p-6 text-center shadow-sm">
              <Flag className="mx-auto text-canopy-700" size={28} aria-hidden />
              <h3 className="mt-3 text-xl font-black text-ink">
                Hole details are ready to be added.
              </h3>
              <p className="mt-2 text-sm font-semibold text-ink/55">
                Report tee, basket, and distance updates so players know what changed.
              </p>
            </section>
          ) : null}
        </section>

        <div className="mt-8">
          <h2 className="mb-3 text-2xl font-black text-ink">Recent Hole Reviews</h2>
          <div className="grid gap-3">
            {recentActivity.map((review) => (
              <Link
                className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm transition hover:bg-canopy-50"
                href={`/holes/${review.hole.id}`}
                key={review.id}
              >
                <Avatar
                  name={review.user.username}
                  size="sm"
                  src={review.user.profileImageUrl}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-ink">
                    Hole {review.hole.holeNumber} - {review.rating}/5
                  </span>
                  <span className="block truncate text-sm font-semibold text-ink/55">
                    {review.title ?? review.body}
                  </span>
                </span>
              </Link>
            ))}
            {!recentActivity.length ? (
              <div className="rounded-lg bg-white p-4 text-sm font-bold text-ink/55 shadow-sm">
                No recent hole reviews yet. Add a hole note after your next round.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

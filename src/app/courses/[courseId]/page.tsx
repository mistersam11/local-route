import { ContentStatus, CourseMarkType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
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
import { ReportButton } from "@/components/ReportButton";
import { Stars } from "@/components/Stars";
import {
  courseDifficultyLabels,
  selectedCourseFacts,
  type CourseDifficultyValue
} from "@/lib/course-facts";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type CoursePageProps = {
  params: {
    courseId: string;
  };
  searchParams?: {
    layout?: string;
  };
};

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
        reviews: {
          where: { status: ContentStatus.visible },
          include: {
            user: { select: { id: true, username: true, profileImageUrl: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        holes: {
          where: { layoutId: null },
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
          orderBy: { holeNumber: "asc" }
        },
        layouts: {
          include: {
            holes: {
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
              orderBy: { holeNumber: "asc" }
            }
          },
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
      ? course.layouts.find((layout) => layout.id === requestedLayoutId)
      : course.layouts[0];
  const displayHoles = selectedLayout?.holes ?? course.holes;
  const displayHoleIds = displayHoles.map((hole) => hole.id);
  const [recentActivity, markCounts, currentMarks] = await Promise.all([
    prisma.holeReview.findMany({
      where: {
        status: ContentStatus.visible,
        holeId: displayHoleIds.length ? { in: displayHoleIds } : -1
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
      : Promise.resolve([])
  ]);

  const averageRating =
    course.reviews.length > 0
      ? course.reviews.reduce((total, review) => total + review.rating, 0) /
        course.reviews.length
      : 0;
  const totalLines = displayHoles.reduce(
    (total, hole) => total + hole._count.lines,
    0
  );
  const totalHoleReviews = displayHoles.reduce(
    (total, hole) => total + hole._count.reviews,
    0
  );
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
    holeCount: layout.holes.length
  }));
  const selectedLayoutName = selectedLayout?.name ?? course.layoutName;
  const mapQuery =
    course.latitude !== null && course.longitude !== null
      ? `${course.latitude},${course.longitude}`
      : `${course.locationAddress ?? course.locationName} ${course.name}`;
  const encodedMapQuery = encodeURIComponent(mapQuery);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedMapQuery}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodedMapQuery}`;
  const canProposeEdits =
    course.status === "approved" &&
    Boolean(currentUser) &&
    currentUser?.id === course.submittedById;
  const pendingOwnEditProposal = currentUser
    ? course.editProposals.find(
        (proposal) => proposal.submittedById === currentUser.id
      )
    : null;

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-10">
      <section className="flex flex-col gap-5">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
        >
          <ArrowLeft size={16} aria-hidden />
          Courses
        </Link>

        <div className="overflow-hidden rounded-lg bg-[#fffdf7] shadow-panel">
          <div className="relative min-h-[340px] bg-ink">
            {course.coverPhotoUrl ? (
              <img
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                src={course.coverPhotoUrl}
              />
            ) : (
              <div className="fallback-map field-grid absolute inset-0" />
            )}
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
              <p className="mt-3 flex items-center gap-2 text-sm font-bold">
                <Stars rating={averageRating} />
                <span>{course.reviews.length ? averageRating.toFixed(1) : "No reviews yet"}</span>
              </p>
            </div>
          </div>
        </div>

        <LayoutSelector
          layouts={layoutOptions}
          selectedLayoutId={selectedLayout?.id}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Holes</p>
            <p className="mt-1 text-2xl font-black">{displayHoles.length}</p>
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
            </div>
            <div className="w-full sm:w-auto sm:min-w-80">
              <CourseMarkButtons
                courseId={course.id}
                currentUserId={currentUser?.id}
                initialPlayed={currentMarkTypes.has(CourseMarkType.played)}
                initialPlayedCount={playedCount}
                initialWantToPlay={currentMarkTypes.has(CourseMarkType.wantToPlay)}
                initialWantToPlayCount={wantToPlayCount}
              />
            </div>
          </div>
        </section>

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

        <section>
          <h2 className="mb-3 text-2xl font-black text-ink">Reviews</h2>
          <div className="grid gap-3">
            {course.reviews.map((review) => (
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
        </section>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-ink">Holes</h2>
          <span className="rounded-full bg-water-100 px-3 py-1 text-sm font-bold text-water-700">
            Discuss each hole
          </span>
        </div>
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
                    {hole.teePhotoUrl ? (
                      <img
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        src={hole.teePhotoUrl}
                      />
                    ) : (
                      <div className="fallback-map field-grid absolute inset-0" />
                    )}
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
          </div>
        </div>
      </section>
    </main>
  );
}

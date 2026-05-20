import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Disc3,
  Flag,
  MapPin,
  MessageSquare,
  UserRound
} from "lucide-react";
import { AdminCourseDecisionPanel } from "@/components/AdminCourseDecisionPanel";
import { Avatar } from "@/components/Avatar";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdminCourseReviewPageProps = {
  params: {
    courseId: string;
  };
};

const statusStyles = {
  draft: "bg-white text-ink/60",
  approved: "bg-canopy-50 text-canopy-700",
  pending: "bg-water-100 text-water-700",
  rejected: "bg-clay-100 text-clay-700"
};

const statusLabels = {
  draft: "Draft",
  approved: "Approved",
  pending: "Pending review",
  rejected: "Rejected"
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default async function AdminCourseReviewPage({
  params
}: AdminCourseReviewPageProps) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/login?redirectTo=/admin/courses/${courseId}`);
  }

  if (!currentUser.isAdmin) {
    notFound();
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      submittedBy: {
        select: { id: true, username: true, profileImageUrl: true }
      },
      reviews: {
        include: {
          user: { select: { id: true, username: true, profileImageUrl: true } }
        },
        orderBy: { createdAt: "desc" }
      },
      holes: {
        where: { layoutId: null },
        include: {
          _count: {
            select: { lines: true, reviews: true }
          },
          lines: {
            orderBy: [{ upvotes: "desc" }, { downvotes: "asc" }],
            take: 1
          },
          reviews: { select: { rating: true } }
        },
        orderBy: { holeNumber: "asc" }
      },
      layouts: {
        include: {
          holes: {
            include: {
              _count: {
                select: { lines: true, reviews: true }
              },
              lines: {
                orderBy: [{ upvotes: "desc" }, { downvotes: "asc" }],
                take: 1
              },
              reviews: { select: { rating: true } }
            },
            orderBy: { holeNumber: "asc" }
          }
        },
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!course) {
    notFound();
  }

  const displayHoles = course.layouts[0]?.holes ?? course.holes;
  const displayLayoutName = course.layouts[0]?.name ?? course.layoutName;
  const missingTeePhotos = displayHoles.filter((hole) => !hole.teePhotoUrl).length;
  const missingPars = displayHoles.filter((hole) => !hole.par).length;
  const missingDistances = displayHoles.filter((hole) => !hole.distanceFeet).length;
  const averageRating =
    course.reviews.length > 0
      ? course.reviews.reduce((total, review) => total + review.rating, 0) /
        course.reviews.length
      : null;
  const totalLines = displayHoles.reduce(
    (total, hole) => total + hole._count.lines,
    0
  );
  const totalHoleReviews = displayHoles.reduce(
    (total, hole) => total + hole._count.reviews,
    0
  );

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-10">
      <section className="grid gap-6">
        <Link
          href="/admin"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
        >
          <ArrowLeft size={16} aria-hidden />
          Admin queue
        </Link>

        <section className="overflow-hidden rounded-lg bg-[#fffdf7] shadow-panel">
          <div className="relative min-h-[360px] bg-ink">
            {course.coverPhotoUrl ? (
              <img
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                src={course.coverPhotoUrl}
              />
            ) : (
              <div className="fallback-map field-grid absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${statusStyles[course.status]}`}
              >
                {statusLabels[course.status]}
              </span>
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
                {course.name}
              </h1>
              <p className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-white/80">
                <span className="flex items-center gap-1">
                  <MapPin size={16} aria-hidden />
                  {course.locationName}
                </span>
                {displayLayoutName ? <span>{displayLayoutName}</span> : null}
                <span>{displayHoles.length} holes</span>
                {course.layouts.length > 1 ? (
                  <span>{course.layouts.length} layouts</span>
                ) : null}
                {averageRating ? <span>{averageRating.toFixed(1)}/5 avg</span> : null}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          <ReviewStat label="Holes" value={displayHoles.length} />
          <ReviewStat label="Lines" value={totalLines} />
          <ReviewStat label="Hole reviews" value={totalHoleReviews} />
          <ReviewStat label="Course reviews" value={course.reviews.length} />
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-ink">Hole review</h2>
            <span className="rounded-full bg-water-100 px-3 py-1 text-sm font-bold text-water-700">
              {displayHoles.length} submitted
            </span>
          </div>
          <div className="grid gap-3">
            {displayHoles.map((hole) => {
              const bestLine = hole.lines[0] ?? null;
              const averageHoleRating =
                hole.reviews.length > 0
                  ? hole.reviews.reduce((total, review) => total + review.rating, 0) /
                    hole.reviews.length
                  : null;

              return (
                <article
                  className="grid overflow-hidden rounded-lg border border-canopy-900/10 bg-white shadow-sm sm:grid-cols-[180px_1fr]"
                  key={hole.id}
                >
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
                  <div className="grid gap-3 p-4">
                    <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-ink/65">
                      <span className="flex items-center gap-1">
                        <Flag size={15} aria-hidden />
                        Par {hole.par ?? "missing"}
                      </span>
                      <span>{hole.distanceFeet ? `${hole.distanceFeet} ft` : "Distance missing"}</span>
                      <span className="flex items-center gap-1">
                        <Disc3 size={15} aria-hidden />
                        {hole._count.lines} lines
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={15} aria-hidden />
                        {hole._count.reviews}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-ink">
                      Hole {hole.holeNumber}
                    </h3>
                    {hole.description ? (
                      <p className="text-sm font-semibold leading-6 text-ink/65">
                        {hole.description}
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-clay-700">
                        Description missing
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
                      {hole.teePhotoUrl ? (
                        <span className="rounded-full bg-canopy-50 px-2.5 py-1 text-canopy-700">
                          Tee photo
                        </span>
                      ) : (
                        <span className="rounded-full bg-clay-100 px-2.5 py-1 text-clay-700">
                          No tee photo
                        </span>
                      )}
                      {averageHoleRating ? (
                        <span className="rounded-full bg-water-100 px-2.5 py-1 text-water-700">
                          {averageHoleRating.toFixed(1)}/5
                        </span>
                      ) : null}
                      {bestLine ? (
                        <span className="rounded-full bg-clay-100 px-2.5 py-1 text-clay-700">
                          Best line: {bestLine.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-ink">Course reviews</h2>
            <span className="rounded-full bg-clay-100 px-3 py-1 text-sm font-bold text-clay-700">
              {course.reviews.length}
            </span>
          </div>
          {course.reviews.length ? (
            <div className="grid gap-3">
              {course.reviews.map((review) => (
                <article
                  className="rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm"
                  key={review.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-bold text-ink/70">
                      <Avatar
                        name={review.user.username}
                        size="sm"
                        src={review.user.profileImageUrl}
                      />
                      @{review.user.username}
                    </div>
                    <span className="rounded-full bg-clay-100 px-3 py-1 text-sm font-black text-clay-700">
                      {review.rating}/5
                    </span>
                  </div>
                  {review.title ? (
                    <h3 className="mt-4 text-lg font-black text-ink">{review.title}</h3>
                  ) : null}
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
                    {review.body}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-white p-4 text-sm font-bold text-ink/55 shadow-sm">
              No course reviews yet.
            </p>
          )}
        </section>
      </section>

      <aside className="grid h-fit gap-5">
        <AdminCourseDecisionPanel
          courseId={course.id}
          initialStatus={course.status}
        />

        <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold uppercase text-clay-700">Submission</p>
            <h2 className="mt-1 text-xl font-black text-ink">Details</h2>
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 font-bold text-ink/55">
                <CalendarDays size={16} aria-hidden />
                Submitted
              </dt>
              <dd className="font-black text-ink">{formatDate(course.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-bold text-ink/55">Latitude</dt>
              <dd className="font-black text-ink">{course.latitude ?? "Missing"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-bold text-ink/55">Longitude</dt>
              <dd className="font-black text-ink">{course.longitude ?? "Missing"}</dd>
            </div>
            {displayLayoutName ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="font-bold text-ink/55">Layout</dt>
                <dd className="font-black text-ink">{displayLayoutName}</dd>
              </div>
            ) : null}
            {course.layouts.length > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="font-bold text-ink/55">Layouts</dt>
                <dd className="font-black text-ink">{course.layouts.length}</dd>
              </div>
            ) : null}
          </dl>
          {course.importSourceUrl ? (
            <a
              className="break-all rounded-lg bg-water-100 p-3 text-sm font-bold text-canopy-700 transition hover:bg-canopy-50"
              href={course.importSourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              UDisc source
            </a>
          ) : null}
          {course.importWarnings.length ? (
            <div className="grid gap-2 rounded-lg bg-water-100 p-3 text-sm font-bold text-ink">
              {course.importWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
          {course.submittedBy ? (
            <Link
              className="flex items-center gap-3 rounded-lg bg-canopy-50 p-3 transition hover:bg-canopy-100"
              href={`/profiles/${course.submittedBy.id}`}
            >
              <Avatar
                name={course.submittedBy.username}
                size="sm"
                src={course.submittedBy.profileImageUrl}
              />
              <span className="font-black text-canopy-700">
                @{course.submittedBy.username}
              </span>
            </Link>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-canopy-50 p-3 text-sm font-bold text-canopy-700">
              <UserRound size={16} aria-hidden />
              Seed/imported course
            </p>
          )}
        </section>

        <section className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold uppercase text-clay-700">Checklist</p>
            <h2 className="mt-1 text-xl font-black text-ink">Review signals</h2>
          </div>
          <ChecklistItem
            good={Boolean(course.coverPhotoUrl)}
            label={course.coverPhotoUrl ? "Cover photo attached" : "Cover photo missing"}
          />
          <ChecklistItem
            good={missingTeePhotos === 0}
            label={
              missingTeePhotos === 0
                ? "All holes have tee photos"
                : `${missingTeePhotos} holes missing tee photos`
            }
          />
          <ChecklistItem
            good={missingPars === 0}
            label={
              missingPars === 0
                ? "All holes have pars"
                : `${missingPars} holes missing par`
            }
          />
          <ChecklistItem
            good={missingDistances === 0}
            label={
              missingDistances === 0
                ? "All holes have distances"
                : `${missingDistances} holes missing distance`
            }
          />
        </section>
      </aside>
    </main>
  );
}

function ReviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-ink/55">{label}</p>
      <p className="mt-1 text-3xl font-black text-ink">{value}</p>
    </div>
  );
}

function ChecklistItem({ good, label }: { good: boolean; label: string }) {
  return (
    <p
      className={`rounded-lg px-3 py-2 text-sm font-bold ${
        good ? "bg-canopy-50 text-canopy-700" : "bg-clay-100 text-clay-700"
      }`}
    >
      {label}
    </p>
  );
}

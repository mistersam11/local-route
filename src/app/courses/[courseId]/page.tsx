import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Disc3,
  Flag,
  MapPin,
  MessageSquare,
  Star
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CourseReviewForm } from "@/components/CourseReviewForm";
import { CourseStatusControls } from "@/components/CourseStatusControls";
import { Stars } from "@/components/Stars";
import { DEMO_USER_ID } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type CoursePageProps = {
  params: {
    courseId: string;
  };
};

export default async function CoursePage({ params }: CoursePageProps) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    notFound();
  }

  const [course, recentActivity, currentUser] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        reviews: {
          include: {
            user: { select: { id: true, username: true, profileImageUrl: true } }
          },
          orderBy: { createdAt: "desc" }
        },
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
        },
        submittedBy: {
          select: { id: true, username: true, profileImageUrl: true }
        }
      }
    }),
    prisma.holeReview.findMany({
      where: { hole: { courseId } },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } },
        hole: { select: { id: true, holeNumber: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.user.findUnique({
      where: { id: DEMO_USER_ID },
      select: { isAdmin: true }
    })
  ]);

  if (!course) {
    notFound();
  }

  const averageRating =
    course.reviews.length > 0
      ? course.reviews.reduce((total, review) => total + review.rating, 0) /
        course.reviews.length
      : 0;
  const totalLines = course.holes.reduce(
    (total, hole) => total + hole._count.lines,
    0
  );
  const totalHoleReviews = course.holes.reduce(
    (total, hole) => total + hole._count.reviews,
    0
  );

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
                {course.locationName}
              </p>
              {course.status !== "approved" ? (
                <span className="mt-3 inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-black uppercase text-clay-700">
                  {course.status === "pending" ? "Pending review" : "Rejected"}
                </span>
              ) : null}
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
                {course.name}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-sm font-bold">
                <Stars rating={averageRating} />
                <span>{course.reviews.length ? averageRating.toFixed(1) : "No reviews yet"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Holes</p>
            <p className="mt-1 text-2xl font-black">{course.holes.length}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Lines</p>
            <p className="mt-1 text-2xl font-black">{totalLines}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Hole reviews</p>
            <p className="mt-1 text-2xl font-black">{totalHoleReviews}</p>
          </div>
        </div>

        {currentUser?.isAdmin ? (
          <CourseStatusControls
            courseId={course.id}
            currentUserId={DEMO_USER_ID}
            initialStatus={course.status}
          />
        ) : null}

        <CourseReviewForm courseId={course.id} currentUserId={DEMO_USER_ID} />

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
          {course.holes.map((hole) => {
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
                    Hole {review.hole.holeNumber} · {review.rating}/5
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

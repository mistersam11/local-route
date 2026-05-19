import { ContentStatus } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, CirclePlus, MapPin, MessageSquare, Search, Star } from "lucide-react";
import { Stars } from "@/components/Stars";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function Home({ searchParams }: HomeProps) {
  const query = searchParams?.q?.trim() ?? "";
  const courses = await prisma.course.findMany({
    where: {
      status: "approved",
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { locationName: { contains: query } }
            ]
          }
        : {})
    },
    include: {
      reviews: {
        where: { status: ContentStatus.visible },
        select: { rating: true }
      },
      holes: {
        select: {
          id: true,
          _count: {
            select: {
              lines: { where: { status: ContentStatus.visible } },
              reviews: { where: { status: ContentStatus.visible } }
            }
          }
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-clay-700">Courses</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            Explore Courses
          </h1>
        </div>
        <div className="grid gap-3">
          <form
            action="/"
            className="flex min-h-14 overflow-hidden rounded-full border border-canopy-900/10 bg-white shadow-panel"
          >
            <label className="flex flex-1 items-center gap-3 px-5">
              <Search size={20} className="shrink-0 text-canopy-700" aria-hidden />
              <input
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/45"
                defaultValue={query}
                name="q"
                placeholder="Search courses or cities"
              />
            </label>
            <button
              className="m-1 inline-flex items-center justify-center rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-canopy-700"
              type="submit"
            >
              Search
            </button>
          </form>
          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-canopy-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-canopy-900"
            href="/courses/new"
          >
            <CirclePlus size={16} aria-hidden />
            Submit a course
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const reviewCount = course.reviews.length;
          const averageRating =
            reviewCount > 0
              ? course.reviews.reduce((total, review) => total + review.rating, 0) /
                reviewCount
              : 0;
          const lineCount = course.holes.reduce(
            (total, hole) => total + hole._count.lines,
            0
          );
          const holeReviewCount = course.holes.reduce(
            (total, hole) => total + hole._count.reviews,
            0
          );

          return (
            <Link
              className="group flex min-h-80 flex-col overflow-hidden rounded-lg border border-canopy-900/10 bg-[#fffdf7] shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel"
              href={`/courses/${course.id}`}
              key={course.id}
            >
              <div className="relative h-40 bg-ink">
                {course.coverPhotoUrl ? (
                  <img
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    src={course.coverPhotoUrl}
                  />
                ) : (
                  <div className="fallback-map field-grid absolute inset-0" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-[#fffdf7]/90 px-3 py-1 text-sm font-bold text-ink">
                  {course.holes.length} holes
                </span>
                {course.status === "pending" ? (
                  <span className="absolute right-3 top-3 rounded-full bg-clay-100 px-3 py-1 text-xs font-black uppercase text-clay-700">
                    Pending
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h2 className="text-2xl font-black text-ink">{course.name}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink/65">
                    <MapPin size={16} aria-hidden />
                    {course.locationName}
                  </p>
                  <p className="mt-4 flex items-center gap-2 text-sm font-bold">
                    <Stars rating={averageRating} />
                    <span className="text-ink/55">
                      {reviewCount ? averageRating.toFixed(1) : "No reviews yet"}
                    </span>
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-canopy-900/10 pt-4 text-sm font-bold">
                  <span className="flex items-center gap-2 text-water-700">
                    <Star size={16} aria-hidden />
                    {lineCount} lines
                  </span>
                  <span className="flex items-center gap-2 text-clay-700">
                    <MessageSquare size={16} aria-hidden />
                    {holeReviewCount}
                  </span>
                  <span className="flex items-center gap-2 text-canopy-700 transition group-hover:translate-x-1">
                    Open
                    <ArrowRight size={16} aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}

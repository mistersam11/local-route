import { ContentStatus, CourseDifficulty, Prisma } from "@prisma/client";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  SlidersHorizontal,
  Star
} from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";
import { PlaceholderBackedImage } from "@/components/PlaceholderBackedImage";
import { Stars } from "@/components/Stars";
import {
  booleanInput,
  courseDifficultyLabels,
  courseDifficultyOptions,
  selectedCourseFacts
} from "@/lib/course-facts";
import { prisma } from "@/lib/db";
import { PAGE_SIZE, clampPage, normalizePage, pageSkip } from "@/lib/pagination";
import { getCoursePlaceholderImage } from "@/lib/placeholder-images";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: {
    q?: string;
    difficulty?: string;
    holes?: string;
    parking?: string;
    bathrooms?: string;
    water?: string;
    cart?: string;
    dogs?: string;
    beginner?: string;
    free?: string;
    page?: string;
  };
};

export default async function Home({ searchParams }: HomeProps) {
  const query = searchParams?.q?.trim() ?? "";
  const difficulty = searchParams?.difficulty ?? "";
  const holesFilter = searchParams?.holes ?? "";
  const hasParking = booleanInput(searchParams?.parking);
  const hasBathrooms = booleanInput(searchParams?.bathrooms);
  const hasWater = booleanInput(searchParams?.water);
  const cartFriendly = booleanInput(searchParams?.cart);
  const dogFriendly = booleanInput(searchParams?.dogs);
  const beginnerFriendly = booleanInput(searchParams?.beginner);
  const freeOnly = booleanInput(searchParams?.free);
  const requestedPage = normalizePage(searchParams?.page);
  const minHoles =
    holesFilter && Number.isInteger(Number(holesFilter))
      ? Number(holesFilter)
      : null;
  const courseWhere = {
    status: "approved",
    ...(Object.values(CourseDifficulty).includes(difficulty as CourseDifficulty)
      ? { difficulty: difficulty as CourseDifficulty }
      : {}),
    ...(hasParking ? { hasParking: true } : {}),
    ...(hasBathrooms ? { hasBathrooms: true } : {}),
    ...(hasWater ? { hasWater: true } : {}),
    ...(cartFriendly ? { cartFriendly: true } : {}),
    ...(dogFriendly ? { dogFriendly: true } : {}),
    ...(beginnerFriendly ? { beginnerFriendly: true } : {}),
    ...(freeOnly ? { isPayToPlay: false } : {}),
    AND: [
      ...(minHoles
        ? [
            {
              OR: [
                {
                  holes: {
                    some: { layoutId: null, holeNumber: { gte: minHoles } }
                  }
                },
                {
                  layouts: {
                    some: {
                      holes: { some: { holeNumber: { gte: minHoles } } }
                    }
                  }
                }
              ]
            }
          ]
        : []),
      ...(query
        ? [
            {
              OR: [
                { name: { contains: query } },
                { locationName: { contains: query } }
              ]
            }
          ]
        : [])
    ]
  } satisfies Prisma.CourseWhereInput;
  const totalCourses = await prisma.course.count({ where: courseWhere });
  const page = clampPage(requestedPage, totalCourses);
  const courses = await prisma.course.findMany({
    where: courseWhere,
    include: {
      reviews: {
        where: { status: ContentStatus.visible },
        select: { rating: true }
      },
      holes: {
        where: { layoutId: null },
        select: {
          id: true,
          _count: {
            select: {
              lines: { where: { status: ContentStatus.visible } },
              reviews: { where: { status: ContentStatus.visible } }
            }
          }
        }
      },
      layouts: {
        include: {
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
        orderBy: { sortOrder: "asc" }
      }
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: pageSkip(page),
    take: PAGE_SIZE
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
            className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-3 shadow-panel"
          >
            <div className="flex min-h-12 overflow-hidden rounded-full border border-canopy-900/10">
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
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
                Difficulty
                <select
                  className="h-10 rounded-lg border border-canopy-900/10 px-3 text-sm font-bold normal-case text-ink outline-none"
                  defaultValue={difficulty}
                  name="difficulty"
                >
                  <option value="">Any</option>
                  {courseDifficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
                Holes
                <select
                  className="h-10 rounded-lg border border-canopy-900/10 px-3 text-sm font-bold normal-case text-ink outline-none"
                  defaultValue={holesFilter}
                  name="holes"
                >
                  <option value="">Any</option>
                  <option value="9">9+</option>
                  <option value="18">18+</option>
                  <option value="27">27+</option>
                </select>
              </label>
              <div className="flex items-end gap-2">
                <button
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-canopy-700 px-4 text-sm font-black text-white transition hover:bg-canopy-900"
                  type="submit"
                >
                  <SlidersHorizontal size={16} aria-hidden />
                  Filter
                </button>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full bg-canopy-50 px-4 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
                  href="/"
                >
                  Clear
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["parking", "Parking", hasParking],
                ["bathrooms", "Bathrooms", hasBathrooms],
                ["water", "Water", hasWater],
                ["cart", "Cart friendly", cartFriendly],
                ["dogs", "Dog friendly", dogFriendly],
                ["beginner", "Beginner friendly", beginnerFriendly],
                ["free", "Free", freeOnly]
              ].map(([name, label, checked]) => (
                <label
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-canopy-50 px-3 text-xs font-black text-canopy-700"
                  key={String(name)}
                >
                  <input
                    className="accent-canopy-700"
                    defaultChecked={Boolean(checked)}
                    name={String(name)}
                    type="checkbox"
                    value="true"
                  />
                  {label}
                </label>
              ))}
            </div>
          </form>
        </div>
      </section>

      <PaginationControls
        basePath="/"
        currentPage={page}
        itemLabel="courses"
        searchParams={searchParams}
        totalItems={totalCourses}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const displayHoles = course.layouts[0]?.holes ?? course.holes;
          const reviewCount = course.reviews.length;
          const averageRating =
            reviewCount > 0
              ? course.reviews.reduce((total, review) => total + review.rating, 0) /
                reviewCount
              : 0;
          const lineCount = displayHoles.reduce(
            (total, hole) => total + hole._count.lines,
            0
          );
          const holeReviewCount = displayHoles.reduce(
            (total, hole) => total + hole._count.reviews,
            0
          );
          const facts = selectedCourseFacts(course);

          return (
            <Link
              className="group flex min-h-80 flex-col overflow-hidden rounded-lg border border-canopy-900/10 bg-[#fffdf7] shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel"
              href={`/courses/${course.id}`}
              key={course.id}
            >
              <div className="relative h-40 bg-ink">
                <PlaceholderBackedImage
                  loading="lazy"
                  placeholder={getCoursePlaceholderImage(course)}
                  sizes="(min-width: 1280px) 31vw, (min-width: 768px) 46vw, 100vw"
                  uploadedAlt={`Photo of ${course.name}`}
                  uploadedSrc={course.coverPhotoUrl}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-[#fffdf7]/90 px-3 py-1 text-sm font-bold text-ink">
                  {displayHoles.length} holes
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
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase">
                    <span className="rounded-full bg-water-100 px-2.5 py-1 text-water-700">
                      {courseDifficultyLabels[course.difficulty]}
                    </span>
                    {course.isPayToPlay ? (
                      <span className="rounded-full bg-clay-100 px-2.5 py-1 text-clay-700">
                        Pay to play
                      </span>
                    ) : (
                      <span className="rounded-full bg-canopy-50 px-2.5 py-1 text-canopy-700">
                        Free
                      </span>
                    )}
                    {facts.slice(0, 2).map((fact) => (
                      <span
                        className="rounded-full bg-canopy-50 px-2.5 py-1 text-canopy-700"
                        key={fact.key}
                      >
                        {fact.label}
                      </span>
                    ))}
                  </div>
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

      <PaginationControls
        basePath="/"
        currentPage={page}
        itemLabel="courses"
        searchParams={searchParams}
        totalItems={totalCourses}
      />

      {!courses.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <MapPin className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">
            No matching courses yet
          </h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            Clear filters or add the local course everyone should know about.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-full bg-canopy-50 px-4 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
              href="/"
            >
              Clear filters
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700"
              href="/courses/new"
            >
              <Plus size={15} aria-hidden />
              Submit course
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}

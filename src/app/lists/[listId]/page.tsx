import { ContentStatus, CourseStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, MessageSquare, Star } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PaginationControls } from "@/components/PaginationControls";
import { PlaceholderBackedImage } from "@/components/PlaceholderBackedImage";
import { Stars } from "@/components/Stars";
import { getCurrentUser } from "@/lib/current-user";
import {
  courseDifficultyLabels,
  type CourseDifficultyValue
} from "@/lib/course-facts";
import { prisma } from "@/lib/db";
import { PAGE_SIZE, clampPage, normalizePage, pageSkip } from "@/lib/pagination";
import { getCoursePlaceholderImage } from "@/lib/placeholder-images";

export const dynamic = "force-dynamic";

type ListPageProps = {
  params: {
    listId: string;
  };
  searchParams?: {
    page?: string;
  };
};

export default async function ListPage({ params, searchParams }: ListPageProps) {
  const listId = Number(params.listId);

  if (!Number.isInteger(listId)) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const list = await prisma.courseList.findUnique({
    where: { id: listId },
    include: {
      user: { select: { id: true, username: true, profileImageUrl: true } }
    }
  });

  if (!list || (!list.isPublic && list.userId !== currentUser?.id)) {
    notFound();
  }

  const requestedPage = normalizePage(searchParams?.page);
  const totalItems = await prisma.courseListItem.count({
    where: { listId, course: { status: CourseStatus.approved } }
  });
  const page = clampPage(requestedPage, totalItems);
  const items = await prisma.courseListItem.findMany({
    where: { listId, course: { status: CourseStatus.approved } },
    include: {
      course: {
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
        }
      }
    },
    orderBy: [{ rank: "asc" }, { id: "asc" }],
    skip: pageSkip(page),
    take: PAGE_SIZE
  });

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <Link
        className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
        href="/lists"
      >
        <ArrowLeft size={16} aria-hidden />
        Lists
      </Link>

      <section className="rounded-lg bg-[#fffdf7] p-6 shadow-panel">
        <p className="text-sm font-bold uppercase text-clay-700">Course list</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
          {list.title}
        </h1>
        {list.description ? (
          <p className="mt-4 max-w-3xl font-semibold leading-7 text-ink/65">
            {list.description}
          </p>
        ) : null}
        <Link
          className="mt-5 flex w-fit items-center gap-2 rounded-full bg-canopy-50 px-3 py-2 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
          href={`/profiles/${list.user.id}`}
        >
          <Avatar
            name={list.user.username}
            size="sm"
            src={list.user.profileImageUrl}
          />
          @{list.user.username}
        </Link>
      </section>

      <PaginationControls
        basePath={`/lists/${list.id}`}
        currentPage={page}
        itemLabel="courses"
        searchParams={searchParams}
        totalItems={totalItems}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const course = item.course;
          const displayHoles = course.layouts[0]?.holes ?? course.holes;
          const reviewCount = course.reviews.length;
          const averageRating = reviewCount
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

          return (
            <Link
              className="group flex min-h-80 flex-col overflow-hidden rounded-lg border border-canopy-900/10 bg-[#fffdf7] shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel"
              href={`/courses/${course.id}`}
              key={item.id}
            >
              <div className="relative h-40 bg-ink">
                <PlaceholderBackedImage
                  loading="lazy"
                  placeholder={getCoursePlaceholderImage(course)}
                  sizes="(min-width: 1280px) 31vw, (min-width: 768px) 46vw, 100vw"
                  uploadedAlt={`Photo of ${course.name}`}
                  uploadedSrc={course.coverPhotoUrl}
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-[#fffdf7]/90 px-3 py-1 text-sm font-bold text-ink">
                  #{item.rank}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h2 className="text-2xl font-black text-ink">{course.name}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink/65">
                    <MapPin size={16} aria-hidden />
                    {course.locationName}
                  </p>
                  <p className="mt-3 w-fit rounded-full bg-water-100 px-2.5 py-1 text-xs font-black uppercase text-water-700">
                    {courseDifficultyLabels[course.difficulty as CourseDifficultyValue]}
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
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <PaginationControls
        basePath={`/lists/${list.id}`}
        currentPage={page}
        itemLabel="courses"
        searchParams={searchParams}
        totalItems={totalItems}
      />

      {!items.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <Star className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">
            This list is ready for its first course.
          </h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            Public, approved courses will appear here as the list grows.
          </p>
        </section>
      ) : null}
    </main>
  );
}

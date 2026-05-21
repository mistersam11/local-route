import { Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, LogIn, Search, Star } from "lucide-react";
import { CourseListForm } from "@/components/CourseListForm";
import { Avatar } from "@/components/Avatar";
import { PageCoverHeader } from "@/components/PageCoverHeader";
import { PaginationControls } from "@/components/PaginationControls";
import { PlaceholderBackedImage } from "@/components/PlaceholderBackedImage";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { PAGE_SIZE, clampPage, normalizePage, pageSkip } from "@/lib/pagination";
import { getCoursePlaceholderImage } from "@/lib/placeholder-images";

export const dynamic = "force-dynamic";

type ListsPageProps = {
  searchParams?: {
    q?: string;
    page?: string;
  };
};

export default async function ListsPage({ searchParams }: ListsPageProps) {
  const query = searchParams?.q?.trim() ?? "";
  const listWhere = {
    isPublic: true,
    AND: [
      ...(query
        ? [
            {
              OR: [
                { title: { contains: query } },
                { description: { contains: query } }
              ]
            }
          ]
        : [])
    ]
  } satisfies Prisma.CourseListWhereInput;
  const listCoverPlaceholder = getCoursePlaceholderImage({
    id: "lists-cover",
    name: "LocalRoute community lists",
    locationName: "Disc golf road trips",
    cartFriendly: true,
    hasParking: true
  });
  const requestedPage = normalizePage(searchParams?.page);
  const [currentUser, totalLists, courses] = await Promise.all([
    getCurrentUser(),
    prisma.courseList.count({ where: listWhere }),
    prisma.course.findMany({
      where: { status: "approved" },
      select: { id: true, name: true, locationName: true },
      orderBy: { name: "asc" },
      take: 200
    })
  ]);
  const page = clampPage(requestedPage, totalLists);
  const lists = await prisma.courseList.findMany({
    where: listWhere,
    include: {
      user: { select: { id: true, username: true, profileImageUrl: true } },
      _count: { select: { items: true } },
      items: {
        include: {
          course: {
            select: {
              id: true,
              name: true,
              locationName: true,
              coverPhotoUrl: true
            }
          }
        },
        orderBy: { rank: "asc" },
        take: 4
      }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: pageSkip(page),
    take: PAGE_SIZE
  });

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <PageCoverHeader
        eyebrow="Lists"
        placeholder={listCoverPlaceholder}
        title="Course lists from the community"
      >
        <form
          action="/lists"
          className="grid gap-2 rounded-lg border border-white/15 bg-white/95 p-3 shadow-panel backdrop-blur sm:grid-cols-[1fr_auto_auto]"
        >
          <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-full border border-canopy-900/10 px-5">
            <Search size={20} className="shrink-0 text-canopy-700" aria-hidden />
            <input
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/45"
              defaultValue={query}
              name="q"
              placeholder="Search lists"
            />
          </label>
          <button
            className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-canopy-700"
            type="submit"
          >
            Search
          </button>
          {query ? (
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full bg-canopy-50 px-5 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
              href="/lists"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </PageCoverHeader>

      {currentUser ? (
        <CourseListForm collapsed courses={courses} />
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-ink">Make your own list</h2>
            <p className="mt-1 text-sm font-semibold text-ink/60">
              Log in to curate and share course picks.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
            href="/login?redirectTo=/lists"
          >
            <LogIn size={16} aria-hidden />
            Log in
          </Link>
        </section>
      )}

      <PaginationControls
        basePath="/lists"
        currentPage={page}
        itemLabel="lists"
        searchParams={searchParams}
        totalItems={totalLists}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lists.map((list) => (
          <Link
            className="group grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm transition hover:shadow-panel"
            href={`/lists/${list.id}`}
            key={list.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-ink">{list.title}</h2>
                {list.description ? (
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">
                    {list.description}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-water-100 px-3 py-1 text-sm font-black text-water-700">
                {list._count.items}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {list.items.map((item) => (
                <div className="relative h-20 overflow-hidden rounded-lg bg-ink" key={item.id}>
                  <PlaceholderBackedImage
                    loading="lazy"
                    placeholder={getCoursePlaceholderImage(item.course)}
                    sizes="120px"
                    uploadedAlt={`Photo of ${item.course.name}`}
                    uploadedSrc={item.course.coverPhotoUrl}
                  />
                </div>
              ))}
              {!list.items.length ? (
                <div className="col-span-4 flex h-20 items-center justify-center rounded-lg bg-white text-sm font-bold text-ink/45">
                  Empty list
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-ink/60">
              <span className="flex items-center gap-2">
                <Avatar
                  name={list.user.username}
                  size="sm"
                  src={list.user.profileImageUrl}
                />
                @{list.user.username}
              </span>
              <span className="flex items-center gap-2 text-canopy-700 transition group-hover:translate-x-1">
                Open list
                <ArrowRight size={15} aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </section>

      <PaginationControls
        basePath="/lists"
        currentPage={page}
        itemLabel="lists"
        searchParams={searchParams}
        totalItems={totalLists}
      />

      {!lists.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <Star className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">
            {query ? "No matching lists yet." : "Build the first community list."}
          </h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            {query
              ? "Try another list name or clear the search."
              : "Share a starter route, road-trip loop, or tournament warmup set."}
          </p>
        </section>
      ) : null}
    </main>
  );
}

import Link from "next/link";
import { ArrowRight, LogIn, Star } from "lucide-react";
import { CourseListForm } from "@/components/CourseListForm";
import { Avatar } from "@/components/Avatar";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const [currentUser, lists, courses] = await Promise.all([
    getCurrentUser(),
    prisma.courseList.findMany({
      where: { isPublic: true },
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
      orderBy: { createdAt: "desc" },
      take: 30
    }),
    prisma.course.findMany({
      where: { status: "approved" },
      select: { id: true, name: true, locationName: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-clay-700">Lists</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            Course lists from the community
          </h1>
        </div>
        <p className="max-w-xl text-sm font-semibold leading-6 text-ink/60">
          Build mini-guides for road trips, beginner days, tournament prep, or the
          courses worth a detour.
        </p>
      </section>

      {currentUser ? (
        <CourseListForm courses={courses} />
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
                  {item.course.coverPhotoUrl ? (
                    <img
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      src={item.course.coverPhotoUrl}
                    />
                  ) : (
                    <div className="fallback-map field-grid absolute inset-0" />
                  )}
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

      {!lists.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <Star className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">No lists yet</h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            Be the first to make one.
          </p>
        </section>
      ) : null}
    </main>
  );
}

import Link from "next/link";
import { ArrowRight, MapPin, Route, Search } from "lucide-react";
import { prisma } from "@/lib/db";

type HomeProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function Home({ searchParams }: HomeProps) {
  const query = searchParams?.q?.trim() ?? "";
  const courses = await prisma.course.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { locationName: { contains: query } }
          ]
        }
      : undefined,
    include: {
      holes: {
        select: {
          id: true,
          _count: {
            select: { routes: true }
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
          <p className="text-sm font-bold uppercase text-clay-700">Strategy maps</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            Community shot lines for disc golf courses
          </h1>
        </div>
        <form action="/" className="flex min-h-14 overflow-hidden rounded-full border border-canopy-900/10 bg-white shadow-panel">
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
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const routeCount = course.holes.reduce(
            (total, hole) => total + hole._count.routes,
            0
          );

          return (
            <Link
              className="group flex min-h-60 flex-col justify-between rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel"
              href={`/courses/${course.id}`}
              key={course.id}
            >
              <div>
                <div className="mb-5 flex h-32 items-end overflow-hidden rounded-md fallback-map field-grid p-4">
                  <span className="rounded-full bg-[#fffdf7]/90 px-3 py-1 text-sm font-bold text-ink">
                    {course.holes.length} holes
                  </span>
                </div>
                <h2 className="text-2xl font-black text-ink">{course.name}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink/65">
                  <MapPin size={16} aria-hidden />
                  {course.locationName}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-canopy-900/10 pt-4 text-sm font-bold">
                <span className="flex items-center gap-2 text-water-700">
                  <Route size={16} aria-hidden />
                  {routeCount} routes
                </span>
                <span className="flex items-center gap-2 text-canopy-700 transition group-hover:translate-x-1">
                  Open
                  <ArrowRight size={16} aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}

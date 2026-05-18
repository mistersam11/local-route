import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Flag, MapPin, Route } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CoursePreview } from "@/components/CoursePreview";
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

  const [course, recentRoutes] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        holes: {
          include: {
            _count: {
              select: { routes: true }
            }
          },
          orderBy: { holeNumber: "asc" }
        }
      }
    }),
    prisma.route.findMany({
      where: { hole: { courseId } },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } },
        hole: { select: { id: true, holeNumber: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  if (!course) {
    notFound();
  }

  const totalRoutes = course.holes.reduce(
    (total, hole) => total + hole._count.routes,
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

        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase text-clay-700">
            <MapPin size={16} aria-hidden />
            {course.locationName}
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
            {course.name}
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Holes</p>
            <p className="mt-1 text-2xl font-black">{course.holes.length}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Routes</p>
            <p className="mt-1 text-2xl font-black">{totalRoutes}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink/55">Center</p>
            <p className="mt-1 text-sm font-black">
              {course.latitude.toFixed(3)}, {course.longitude.toFixed(3)}
            </p>
          </div>
        </div>

        <CoursePreview holes={course.holes} />

        <div>
          <h2 className="mb-3 text-2xl font-black text-ink">Activity</h2>
          <div className="grid gap-3">
            {recentRoutes.map((route) => (
              <Link
                className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm transition hover:bg-canopy-50"
                href={`/holes/${route.hole.id}`}
                key={route.id}
              >
                <Avatar
                  name={route.user.username}
                  size="sm"
                  src={route.user.profileImageUrl}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-ink">
                    {route.name}
                  </span>
                  <span className="block text-sm font-semibold text-ink/55">
                    Hole {route.hole.holeNumber} by @{route.user.username}
                  </span>
                </span>
                <span className="rounded-full bg-canopy-50 px-2.5 py-1 text-sm font-black text-canopy-700">
                  {route.upvotes - route.downvotes > 0 ? "+" : ""}
                  {route.upvotes - route.downvotes}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-ink">Holes</h2>
          <span className="rounded-full bg-water-100 px-3 py-1 text-sm font-bold text-water-700">
            Tee to basket
          </span>
        </div>
        <div className="grid gap-3">
          {course.holes.map((hole) => (
            <Link
              className="group grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm transition hover:shadow-panel sm:grid-cols-[auto_1fr_auto] sm:items-center"
              href={`/holes/${hole.id}`}
              key={hole.id}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-canopy-700 text-lg font-black text-white">
                {hole.holeNumber}
              </span>
              <span>
                <span className="flex flex-wrap items-center gap-3 text-sm font-bold text-ink/65">
                  <span className="flex items-center gap-1">
                    <Flag size={15} aria-hidden />
                    Par {hole.par ?? "-"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Route size={15} aria-hidden />
                    {hole._count.routes} routes
                  </span>
                </span>
                <span className="mt-1 block text-lg font-black text-ink">
                  Hole {hole.holeNumber}
                </span>
                {hole.description ? (
                  <span className="mt-1 block text-sm leading-6 text-ink/65">
                    {hole.description}
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-2 text-sm font-bold text-canopy-700 transition group-hover:translate-x-1">
                Map
                <ArrowRight size={16} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

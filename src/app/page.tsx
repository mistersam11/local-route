import { ContentStatus, CourseEventVisibility } from "@prisma/client";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ListChecks,
  MapPin,
  MessageSquare,
  UserRound
} from "lucide-react";
import { PlaceholderBackedImage } from "@/components/PlaceholderBackedImage";
import { courseDifficultyLabels } from "@/lib/course-facts";
import { prisma } from "@/lib/db";
import { formatEventDateTime } from "@/lib/events";
import { getCoursePlaceholderImage } from "@/lib/placeholder-images";

export const dynamic = "force-dynamic";

const featureCards = [
  {
    title: "Courses",
    description: "Search local layouts, compare hole counts, scan amenities, and open course pages with reviews and hole-by-hole context.",
    href: "/courses",
    cta: "Explore courses",
    icon: MapPin
  },
  {
    title: "Lists",
    description: "Build shareable course lists for road trips, practice loops, favorite wooded tracks, and weekend plans.",
    href: "/lists",
    cta: "Browse lists",
    icon: ListChecks
  },
  {
    title: "Events",
    description: "Find league nights, doubles, glow rounds, clinics, and tournaments happening around nearby courses.",
    href: "/events",
    cta: "Browse events",
    icon: CalendarDays
  },
  {
    title: "Chains",
    description: "Talk conditions, card plans, lost discs, local advice, and course updates with other players.",
    href: "/forum",
    cta: "Join the chains",
    icon: MessageSquare
  },
  {
    title: "Player Profiles",
    description: "Follow local players, see home courses, and keep track of reviews, favorite lines, and community activity.",
    href: "/users",
    cta: "Find players",
    icon: UserRound
  }
];

function reviewLabel(count: number, average: number | null) {
  if (!count || average === null) {
    return "No reviews yet";
  }

  return `${average.toFixed(1)} (${count} ${count === 1 ? "review" : "reviews"})`;
}

export default async function LandingPage() {
  const [courseCount, listCount, eventCount, featuredCourses, upcomingEvents] =
    await Promise.all([
      prisma.course.count({ where: { status: "approved" } }),
      prisma.courseList.count({ where: { isPublic: true } }),
      prisma.courseEvent.count({
        where: {
          visibility: CourseEventVisibility.public,
          startTime: { gte: new Date() }
        }
      }),
      prisma.course.findMany({
        where: { status: "approved" },
        include: {
          reviews: {
            where: { status: ContentStatus.visible },
            select: { rating: true }
          },
          holes: {
            where: { layoutId: null },
            select: { id: true }
          },
          layouts: {
            include: {
              holes: { select: { id: true } }
            },
            orderBy: { sortOrder: "asc" }
          }
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3
      }),
      prisma.courseEvent.findMany({
        where: {
          visibility: CourseEventVisibility.public,
          startTime: { gte: new Date() }
        },
        include: {
          course: { select: { id: true, name: true, locationName: true } }
        },
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        take: 3
      })
    ]);
  const heroPlaceholder = getCoursePlaceholderImage({
    id: "local-route-landing",
    name: "Local Route disc golf guide",
    locationName: "Community course knowledge",
    difficulty: "mixed",
    hasParking: true,
    dogFriendly: true
  });

  return (
    <main>
      <section className="relative isolate min-h-[72vh] overflow-hidden bg-ink px-4 py-16 text-white sm:px-6 lg:py-20">
        <PlaceholderBackedImage
          className="absolute inset-0"
          imageClassName="scale-105"
          loading="eager"
          placeholder={heroPlaceholder}
          placeholderAlt=""
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-ink/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/80 to-ink/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/30" />

        <div className="relative mx-auto flex min-h-[58vh] max-w-7xl flex-col justify-end gap-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-normal text-clay-100">
              Local Route
            </p>
            <h1 className="mt-4 text-5xl font-black leading-[1.02] drop-shadow-xl sm:text-6xl lg:text-7xl">
              Local disc golf knowledge.
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/95 drop-shadow-lg">
              Discover local disc golf courses, build shareable course lists, find
              nearby events, and talk with other players.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-ink shadow-panel transition hover:bg-canopy-50"
                href="/courses"
              >
                Explore Courses
                <ArrowRight size={17} aria-hidden />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-canopy-700 px-6 text-sm font-black text-white shadow-panel transition hover:bg-canopy-900"
                href="/events"
              >
                Browse Events
              </Link>
            </div>
          </div>

          <dl className="grid max-w-3xl gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
              <dt className="text-xs font-black uppercase text-white/60">Courses</dt>
              <dd className="mt-1 text-3xl font-black">{courseCount}</dd>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
              <dt className="text-xs font-black uppercase text-white/60">Lists</dt>
              <dd className="mt-1 text-3xl font-black">{listCount}</dd>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
              <dt className="text-xs font-black uppercase text-white/60">Upcoming</dt>
              <dd className="mt-1 text-3xl font-black">{eventCount}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 lg:grid-cols-5 lg:py-12">
        {featureCards.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              className="group grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel"
              href={feature.href}
              key={feature.title}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-canopy-50 text-canopy-700">
                <Icon size={20} aria-hidden />
              </span>
              <span>
                <span className="block text-xl font-black text-ink">
                  {feature.title}
                </span>
                <span className="mt-2 block text-sm font-semibold leading-6 text-ink/62">
                  {feature.description}
                </span>
              </span>
              <span className="mt-auto flex items-center gap-2 text-sm font-black text-canopy-700 transition group-hover:translate-x-1">
                {feature.cta}
                <ArrowRight size={15} aria-hidden />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-clay-700">
                Featured courses
              </p>
              <h2 className="mt-2 text-3xl font-black text-ink">
                Explore recently added courses
              </h2>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-canopy-700 shadow-sm transition hover:bg-canopy-50"
              href="/courses"
            >
              View directory
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>

          <div className="grid gap-3">
            {featuredCourses.map((course) => {
              const holes = course.layouts[0]?.holes ?? course.holes;
              const reviewCount = course.reviews.length;
              const averageRating = reviewCount
                ? course.reviews.reduce((total, review) => total + review.rating, 0) /
                  reviewCount
                : null;

              return (
                <Link
                  className="group grid overflow-hidden rounded-lg border border-canopy-900/10 bg-[#fffdf7] shadow-sm transition hover:shadow-panel sm:grid-cols-[180px_1fr]"
                  href={`/courses/${course.id}`}
                  key={course.id}
                >
                  <div className="relative min-h-36 bg-ink">
                    <PlaceholderBackedImage
                      loading="lazy"
                      placeholder={getCoursePlaceholderImage(course)}
                      sizes="(min-width: 640px) 180px, 100vw"
                      uploadedAlt={`Photo of ${course.name}`}
                      uploadedSrc={course.coverPhotoUrl}
                    />
                  </div>
                  <div className="grid gap-3 p-4">
                    <div>
                      <h3 className="text-2xl font-black text-ink">
                        {course.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-2 text-sm font-bold text-ink/60">
                        <MapPin size={15} aria-hidden />
                        {course.locationName}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
                      <span className="rounded-full bg-water-100 px-2.5 py-1 text-water-700">
                        {holes.length} holes
                      </span>
                      <span className="rounded-full bg-canopy-50 px-2.5 py-1 text-canopy-700">
                        {courseDifficultyLabels[course.difficulty]}
                      </span>
                      <span className="rounded-full bg-clay-100 px-2.5 py-1 text-clay-700">
                        {reviewLabel(reviewCount, averageRating)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="grid h-fit gap-4 rounded-lg border border-canopy-900/10 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-black uppercase text-clay-700">
              Coming up
            </p>
            <h2 className="mt-2 text-3xl font-black text-ink">
              Events happening out on the course
            </h2>
          </div>
          <div className="grid gap-3">
            {upcomingEvents.map((event) => (
              <Link
                className="grid gap-2 rounded-lg bg-[#fffdf7] p-4 transition hover:bg-canopy-50"
                href={`/events/${event.id}`}
                key={event.id}
              >
                <span className="text-lg font-black text-ink">{event.title}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink/55">
                  <CalendarDays size={15} aria-hidden />
                  {formatEventDateTime(event.startTime, event.timezone)}
                </span>
                <span className="flex items-center gap-2 text-sm font-bold text-canopy-700">
                  <MapPin size={15} aria-hidden />
                  {event.course.name}
                </span>
              </Link>
            ))}
            {!upcomingEvents.length ? (
              <div className="rounded-lg bg-[#fffdf7] p-5 text-sm font-bold text-ink/55">
                No events scheduled yet. Check back soon or create one.
              </div>
            ) : null}
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
            href="/forum"
          >
            Join the Community
            <MessageSquare size={16} aria-hidden />
          </Link>
        </aside>
      </section>
    </main>
  );
}

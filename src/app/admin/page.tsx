import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Disc3,
  MapPin,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: {
    status?: string;
  };
};

const filters = ["pending", "approved", "rejected", "all"] as const;
type Filter = (typeof filters)[number];
type ModerationStatus = Exclude<Filter, "all">;

const statusStyles = {
  approved: "bg-canopy-50 text-canopy-700",
  pending: "bg-water-100 text-water-700",
  rejected: "bg-clay-100 text-clay-700"
};

const statusLabels = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected"
};

function selectedFilter(value: string | undefined): Filter {
  return filters.includes(value as Filter) ? (value as Filter) : "pending";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirectTo=/admin");
  }

  if (!currentUser.isAdmin) {
    notFound();
  }

  const activeFilter = selectedFilter(searchParams?.status);
  const [statusCounts, courses] = await Promise.all([
    prisma.course.groupBy({
      by: ["status"],
      _count: { _all: true }
    }),
    prisma.course.findMany({
      where: activeFilter === "all" ? {} : { status: activeFilter },
      include: {
        submittedBy: {
          select: { id: true, username: true, profileImageUrl: true }
        },
        _count: {
          select: { holes: true, reviews: true }
        },
        holes: {
          select: {
            _count: {
              select: { lines: true, reviews: true }
            }
          }
        }
      },
      orderBy: [{ status: "desc" }, { createdAt: "desc" }]
    })
  ]);

  const counts: Record<ModerationStatus, number> = {
    approved: 0,
    pending: 0,
    rejected: 0
  };

  statusCounts.forEach((entry) => {
    counts[entry.status as ModerationStatus] = entry._count._all;
  });

  const total = counts.approved + counts.pending + counts.rejected;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase text-clay-700">
            <ShieldCheck size={16} aria-hidden />
            Admin
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
            Course moderation
          </h1>
        </div>
        <div className="grid gap-3 sm:justify-items-end">
          <p className="max-w-xl text-sm font-semibold leading-6 text-ink/60 sm:text-right">
            Review submitted courses, inspect hole data, and decide what belongs in
            the public course directory.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-full bg-ink px-4 py-2 text-sm font-black text-white"
              href="/admin"
            >
              Course submissions
            </Link>
            <Link
              className="rounded-full bg-white px-4 py-2 text-sm font-black text-ink/70 transition hover:bg-canopy-50 hover:text-canopy-700"
              href="/admin/content"
            >
              Content queue
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={total} />
        <Stat icon={<Clock3 size={18} aria-hidden />} label="Pending" value={counts.pending} />
        <Stat icon={<CheckCircle2 size={18} aria-hidden />} label="Approved" value={counts.approved} />
        <Stat icon={<XCircle size={18} aria-hidden />} label="Rejected" value={counts.rejected} />
      </section>

      <section className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              activeFilter === filter
                ? "bg-ink text-white"
                : "bg-white text-ink/70 hover:bg-canopy-50 hover:text-canopy-700"
            }`}
            href={filter === "pending" ? "/admin" : `/admin?status=${filter}`}
            key={filter}
          >
            {filter === "all" ? "All" : statusLabels[filter]}
          </Link>
        ))}
      </section>

      <section className="grid gap-4">
        {courses.length ? (
          courses.map((course) => {
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
                className="group grid overflow-hidden rounded-lg border border-canopy-900/10 bg-[#fffdf7] shadow-sm transition hover:shadow-panel lg:grid-cols-[220px_1fr]"
                href={`/admin/courses/${course.id}`}
                key={course.id}
              >
                <div className="relative min-h-44 bg-ink">
                  {course.coverPhotoUrl ? (
                    <img
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      src={course.coverPhotoUrl}
                    />
                  ) : (
                    <div className="fallback-map field-grid absolute inset-0" />
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black uppercase ${statusStyles[course.status]}`}
                  >
                    {statusLabels[course.status]}
                  </span>
                </div>
                <div className="grid gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-ink">{course.name}</h2>
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink/65">
                        <MapPin size={16} aria-hidden />
                        {course.locationName}
                      </p>
                    </div>
                    <span className="flex items-center gap-2 text-sm font-black text-canopy-700 transition group-hover:translate-x-1">
                      Review
                      <ArrowRight size={16} aria-hidden />
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-ink/60">
                    <span>{course._count.holes} holes</span>
                    <span>{course._count.reviews} course reviews</span>
                    <span>{holeReviewCount} hole reviews</span>
                    <span>{lineCount} lines</span>
                    <span>{formatDate(course.createdAt)}</span>
                  </div>

                  {course.submittedBy ? (
                    <div className="flex items-center gap-2 text-sm font-bold text-ink/65">
                      <Avatar
                        name={course.submittedBy.username}
                        size="sm"
                        src={course.submittedBy.profileImageUrl}
                      />
                      Submitted by @{course.submittedBy.username}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-ink/45">Imported or seed data</p>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-lg border border-canopy-900/10 bg-white p-8 text-center shadow-sm">
            <Disc3 className="mx-auto text-canopy-700" size={32} aria-hidden />
            <h2 className="mt-4 text-2xl font-black text-ink">Nothing here</h2>
            <p className="mt-2 text-sm font-semibold text-ink/55">
              No courses match this moderation view.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({
  icon,
  label,
  value
}: {
  icon?: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink/55">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-3xl font-black text-ink">{value}</p>
    </div>
  );
}

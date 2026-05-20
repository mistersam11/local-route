import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Flag, MapPin, UserRound } from "lucide-react";
import { AdminCourseEditDecisionPanel } from "@/components/AdminCourseEditDecisionPanel";
import { Avatar } from "@/components/Avatar";
import { courseEditFromJson } from "@/lib/course-edit-data";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdminCourseEditPageProps = {
  params: {
    proposalId: string;
  };
};

const statusStyles = {
  approved: "bg-canopy-50 text-canopy-700",
  pending: "bg-water-100 text-water-700",
  rejected: "bg-clay-100 text-clay-700"
};

const statusLabels = {
  approved: "Approved",
  pending: "Pending review",
  rejected: "Rejected"
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default async function AdminCourseEditPage({
  params
}: AdminCourseEditPageProps) {
  const proposalId = Number(params.proposalId);

  if (!Number.isInteger(proposalId)) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/login?redirectTo=/admin/course-edits/${proposalId}`);
  }

  if (!currentUser.isAdmin) {
    notFound();
  }

  const proposal = await prisma.courseEditProposal.findUnique({
    where: { id: proposalId },
    include: {
      course: {
        include: {
          holes: {
            where: { layoutId: null },
            orderBy: { holeNumber: "asc" }
          },
          layouts: {
            include: {
              holes: { orderBy: { holeNumber: "asc" } }
            },
            orderBy: { sortOrder: "asc" }
          }
        }
      },
      submittedBy: {
        select: { id: true, username: true, profileImageUrl: true }
      }
    }
  });

  if (!proposal) {
    notFound();
  }

  const edit = courseEditFromJson(proposal.proposedData);
  const currentLayouts = proposal.course.layouts.length
    ? proposal.course.layouts
    : [
        {
          id: 0,
          name: proposal.course.layoutName ?? "Main layout",
          holes: proposal.course.holes
        }
      ];
  const proposedLayouts = edit.layouts.length
    ? edit.layouts
    : [
        {
          name: edit.layoutName ?? "Main layout",
          holes: edit.holes
        }
      ];
  const currentHoleCount = currentLayouts.reduce(
    (total, layout) => total + layout.holes.length,
    0
  );
  const proposedHoleCount = proposedLayouts.reduce(
    (total, layout) => total + layout.holes.length,
    0
  );

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-10">
      <section className="grid gap-6">
        <Link
          href="/admin"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
        >
          <ArrowLeft size={16} aria-hidden />
          Admin queue
        </Link>

        <section className="rounded-lg bg-[#fffdf7] p-6 shadow-panel">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${statusStyles[proposal.status]}`}
          >
            {statusLabels[proposal.status]}
          </span>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
            Proposed edits for {proposal.course.name}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-ink/60">
            <span className="flex items-center gap-1">
              <MapPin size={16} aria-hidden />
              {proposal.course.locationName} to {edit.locationName}
            </span>
            <span>{currentLayouts.length} to {proposedLayouts.length} layouts</span>
            <span>{currentHoleCount} to {proposedHoleCount} holes</span>
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <SummaryCard label="Current" course={proposal.course} />
          <SummaryCard
            label="Proposed"
            course={{
              name: edit.name,
              locationName: edit.locationName,
              locationAddress: edit.locationAddress,
              latitude: edit.latitude,
              longitude: edit.longitude,
              difficulty: edit.difficulty,
              hasParking: edit.hasParking,
              hasBathrooms: edit.hasBathrooms,
              hasWater: edit.hasWater,
              cartFriendly: edit.cartFriendly,
              dogFriendly: edit.dogFriendly,
              beginnerFriendly: edit.beginnerFriendly,
              isPayToPlay: edit.isPayToPlay
            }}
          />
        </section>

        <section className="grid gap-4">
          <h2 className="text-2xl font-black text-ink">Proposed layouts</h2>
          <div className="grid gap-4">
            {proposedLayouts.map((layout, layoutIndex) => (
              <article
                className="rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm"
                key={`${layout.name}-${layoutIndex}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-black text-ink">{layout.name}</h3>
                  <span className="rounded-full bg-water-100 px-3 py-1 text-sm font-bold text-water-700">
                    {layout.holes.length} holes
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {layout.holes.map((hole) => (
                    <div
                      className="grid gap-2 rounded-lg bg-[#fffdf7] p-3 text-sm font-bold text-ink/65 sm:grid-cols-[90px_90px_120px_1fr]"
                      key={hole.holeNumber}
                    >
                      <span className="text-ink">Hole {hole.holeNumber}</span>
                      <span className="flex items-center gap-1">
                        <Flag size={14} aria-hidden />
                        Par {hole.par ?? "-"}
                      </span>
                      <span>
                        {hole.distanceFeet ? `${hole.distanceFeet} ft` : "No distance"}
                      </span>
                      <span className="truncate">
                        {hole.description ?? "No description"}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <aside className="grid h-fit gap-5">
        <AdminCourseEditDecisionPanel
          proposalId={proposal.id}
          initialStatus={proposal.status}
        />

        <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold uppercase text-clay-700">Submitted</p>
            <h2 className="mt-1 text-xl font-black text-ink">Details</h2>
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 font-bold text-ink/55">
                <CalendarDays size={16} aria-hidden />
                Date
              </dt>
              <dd className="font-black text-ink">{formatDate(proposal.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-bold text-ink/55">Course</dt>
              <dd>
                <Link
                  className="font-black text-canopy-700 hover:underline"
                  href={`/courses/${proposal.course.id}`}
                >
                  View course
                </Link>
              </dd>
            </div>
          </dl>
          {proposal.submittedBy ? (
            <Link
              className="flex items-center gap-3 rounded-lg bg-canopy-50 p-3 transition hover:bg-canopy-100"
              href={`/profiles/${proposal.submittedBy.id}`}
            >
              <Avatar
                name={proposal.submittedBy.username}
                size="sm"
                src={proposal.submittedBy.profileImageUrl}
              />
              <span className="font-black text-canopy-700">
                @{proposal.submittedBy.username}
              </span>
            </Link>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-canopy-50 p-3 text-sm font-bold text-canopy-700">
              <UserRound size={16} aria-hidden />
              Unknown submitter
            </p>
          )}
        </section>
      </aside>
    </main>
  );
}

function SummaryCard({
  label,
  course
}: {
  label: string;
  course: {
    name: string;
    locationName: string;
    locationAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    difficulty: string;
    hasParking: boolean;
    hasBathrooms: boolean;
    hasWater: boolean;
    cartFriendly: boolean;
    dogFriendly: boolean;
    beginnerFriendly: boolean;
    isPayToPlay: boolean;
  };
}) {
  const facts = [
    course.hasParking ? "Parking" : null,
    course.hasBathrooms ? "Bathrooms" : null,
    course.hasWater ? "Water" : null,
    course.cartFriendly ? "Cart friendly" : null,
    course.dogFriendly ? "Dogs" : null,
    course.beginnerFriendly ? "Beginner friendly" : null,
    course.isPayToPlay ? "Pay to play" : "Free"
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <article className="rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
      <p className="text-sm font-black uppercase text-clay-700">{label}</p>
      <h2 className="mt-2 text-2xl font-black text-ink">{course.name}</h2>
      <div className="mt-3 grid gap-2 text-sm font-semibold text-ink/65">
        <p>{course.locationName}</p>
        {course.locationAddress ? <p>{course.locationAddress}</p> : null}
        <p>
          {course.latitude ?? "No latitude"}, {course.longitude ?? "No longitude"}
        </p>
        <p className="capitalize">{course.difficulty}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase">
        {facts.map((fact) => (
          <span
            className="rounded-full bg-canopy-50 px-2.5 py-1 text-canopy-700"
            key={fact}
          >
            {fact}
          </span>
        ))}
      </div>
    </article>
  );
}

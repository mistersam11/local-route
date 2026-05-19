import {
  ContentStatus,
  ModerationTargetType,
  ReportStatus
} from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  EyeOff,
  FileClock,
  Flag,
  ShieldCheck
} from "lucide-react";
import { AdminContentModerationPanel } from "@/components/AdminContentModerationPanel";
import { Avatar } from "@/components/Avatar";
import { getCurrentUser } from "@/lib/current-user";
import {
  compactText,
  getModerationTargetCards,
  moderationActionLabels,
  moderationTargetKey,
  moderationTargetLabels,
  type ModerationTargetCard
} from "@/lib/content-moderation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdminContentPageProps = {
  searchParams?: {
    view?: string;
  };
};

const views = ["reported", "hidden", "recent"] as const;
type View = (typeof views)[number];

function selectedView(value: string | undefined): View {
  return views.includes(value as View) ? (value as View) : "reported";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

async function recentContentRefs(status?: ContentStatus) {
  const [courseReviews, holeReviews, lines] = await Promise.all([
    prisma.courseReview.findMany({
      where: status ? { status } : {},
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.holeReview.findMany({
      where: status ? { status } : {},
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.line.findMany({
      where: status ? { status } : {},
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return [
    ...courseReviews.map((review) => ({
      targetType: ModerationTargetType.courseReview,
      targetRecordId: review.id,
      createdAt: review.createdAt
    })),
    ...holeReviews.map((review) => ({
      targetType: ModerationTargetType.holeReview,
      targetRecordId: review.id,
      createdAt: review.createdAt
    })),
    ...lines.map((line) => ({
      targetType: ModerationTargetType.line,
      targetRecordId: line.id,
      createdAt: line.createdAt
    }))
  ]
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
    .slice(0, 30);
}

export default async function AdminContentPage({
  searchParams
}: AdminContentPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirectTo=/admin/content");
  }

  if (!currentUser.isAdmin) {
    notFound();
  }

  const activeView = selectedView(searchParams?.view);
  const [
    openReportCount,
    hiddenCourseReviewCount,
    hiddenHoleReviewCount,
    hiddenLineCount,
    recentActions
  ] = await Promise.all([
    prisma.contentReport.count({ where: { status: ReportStatus.open } }),
    prisma.courseReview.count({ where: { status: ContentStatus.hidden } }),
    prisma.holeReview.count({ where: { status: ContentStatus.hidden } }),
    prisma.line.count({ where: { status: ContentStatus.hidden } }),
    prisma.adminModerationAction.findMany({
      include: {
        admin: { select: { username: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);

  const hiddenCount = hiddenCourseReviewCount + hiddenHoleReviewCount + hiddenLineCount;
  const openReportGroups = await prisma.contentReport.groupBy({
    by: ["targetType", "targetRecordId"],
    where: { status: ReportStatus.open },
    _count: { _all: true }
  });
  const reportCountByTarget = new Map(
    openReportGroups.map((report) => [
      moderationTargetKey(report),
      report._count._all
    ])
  );

  let cards: ModerationTargetCard[] = [];
  const latestReportByTarget = new Map<
    string,
    {
      reason: string | null;
      createdAt: Date;
      reporter: { username: string; profileImageUrl: string | null };
    }
  >();

  if (activeView === "reported") {
    const reports = await prisma.contentReport.findMany({
      where: { status: ReportStatus.open },
      include: {
        reporter: { select: { username: true, profileImageUrl: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 80
    });
    const cardsByKey = await getModerationTargetCards(reports);
    const seen = new Set<string>();

    reports.forEach((report) => {
      const key = moderationTargetKey(report);

      if (!latestReportByTarget.has(key)) {
        latestReportByTarget.set(key, {
          reason: report.reason,
          createdAt: report.createdAt,
          reporter: report.reporter
        });
      }

      if (!seen.has(key)) {
        const card = cardsByKey.get(key);

        if (card) {
          cards.push(card);
          seen.add(key);
        }
      }
    });
  } else {
    const refs = await recentContentRefs(
      activeView === "hidden" ? ContentStatus.hidden : undefined
    );
    const cardsByKey = await getModerationTargetCards(refs);
    cards = refs
      .map((ref) => cardsByKey.get(moderationTargetKey(ref)))
      .filter((card): card is ModerationTargetCard => Boolean(card));
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase text-clay-700">
            <ShieldCheck size={16} aria-hidden />
            Admin
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
            Content moderation
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-full bg-white px-4 py-2 text-sm font-black text-ink/70 transition hover:bg-canopy-50 hover:text-canopy-700"
            href="/admin"
          >
            Course submissions
          </Link>
          <Link
            className="rounded-full bg-ink px-4 py-2 text-sm font-black text-white"
            href="/admin/content"
          >
            Content queue
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<Flag size={18} aria-hidden />} label="Open reports" value={openReportCount} />
        <Stat icon={<EyeOff size={18} aria-hidden />} label="Hidden content" value={hiddenCount} />
        <Stat icon={<FileClock size={18} aria-hidden />} label="Audit actions" value={recentActions.length} />
      </section>

      <section className="flex flex-wrap gap-2">
        {views.map((view) => (
          <Link
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              activeView === view
                ? "bg-ink text-white"
                : "bg-white text-ink/70 hover:bg-canopy-50 hover:text-canopy-700"
            }`}
            href={view === "reported" ? "/admin/content" : `/admin/content?view=${view}`}
            key={view}
          >
            {view === "reported" ? "Reported" : view === "hidden" ? "Hidden" : "Recent"}
          </Link>
        ))}
      </section>

      <section className="grid gap-4">
        {cards.length ? (
          cards.map((card) => {
            const key = moderationTargetKey({
              targetType: card.type,
              targetRecordId: card.id
            });
            const reportCount = reportCountByTarget.get(key) ?? 0;
            const latestReport = latestReportByTarget.get(key);

            return (
              <article
                className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm lg:grid-cols-[1fr_290px]"
                key={key}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-water-100 px-3 py-1 text-xs font-black uppercase text-water-700">
                      {card.typeLabel}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                        card.status === ContentStatus.hidden
                          ? "bg-clay-100 text-clay-700"
                          : "bg-canopy-50 text-canopy-700"
                      }`}
                    >
                      {card.status}
                    </span>
                    {reportCount ? (
                      <span className="rounded-full bg-clay-100 px-3 py-1 text-xs font-black uppercase text-clay-700">
                        {reportCount} report{reportCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-2xl font-black text-ink">{card.title}</h2>
                  <p className="mt-2 text-sm font-bold text-ink/55">{card.context}</p>
                  {card.body ? (
                    <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
                      {compactText(card.body, 320)}
                    </p>
                  ) : null}
                  {card.hiddenReason ? (
                    <p className="mt-3 rounded-lg bg-clay-100 px-3 py-2 text-sm font-bold text-clay-700">
                      Hidden reason: {card.hiddenReason}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      className="flex items-center gap-2 font-bold text-ink/65 transition hover:text-canopy-700"
                      href={`/profiles/${card.author.id}`}
                    >
                      <Avatar
                        name={card.author.username}
                        size="sm"
                        src={card.author.profileImageUrl}
                      />
                      @{card.author.username}
                    </Link>
                    <span className="text-sm font-bold text-ink/45">
                      {formatDate(card.createdAt)}
                    </span>
                    <Link
                      className="inline-flex items-center gap-2 text-sm font-black text-canopy-700 transition hover:translate-x-1"
                      href={card.href}
                    >
                      Open
                      <ArrowRight size={15} aria-hidden />
                    </Link>
                  </div>

                  {latestReport ? (
                    <div className="mt-4 rounded-lg bg-white p-3 shadow-sm">
                      <p className="flex items-center gap-2 text-sm font-black text-clay-700">
                        <Flag size={15} aria-hidden />
                        Latest report by @{latestReport.reporter.username}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">
                        {latestReport.reason ?? "No reason provided."}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase text-ink/40">
                        {formatDate(latestReport.createdAt)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <AdminContentModerationPanel
                  hasOpenReports={reportCount > 0}
                  initialStatus={card.status}
                  targetId={card.id}
                  targetType={card.type}
                />
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-canopy-900/10 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-canopy-700" size={32} aria-hidden />
            <h2 className="mt-4 text-2xl font-black text-ink">Queue is clear</h2>
            <p className="mt-2 text-sm font-semibold text-ink/55">
              No content matches this view.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-2xl font-black text-ink">Audit log</h2>
        {recentActions.map((action) => (
          <article
            className="rounded-lg bg-white p-4 text-sm shadow-sm"
            key={action.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-black text-ink">
                {moderationActionLabels[action.action]}{" "}
                {moderationTargetLabels[action.targetType]}
              </p>
              <p className="font-bold text-ink/45">
                @{action.admin.username} - {formatDate(action.createdAt)}
              </p>
            </div>
            {action.targetSummary ? (
              <p className="mt-2 font-semibold leading-6 text-ink/60">
                {action.targetSummary}
              </p>
            ) : null}
            {action.reason ? (
              <p className="mt-2 font-bold text-clay-700">Reason: {action.reason}</p>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}

function Stat({
  icon,
  label,
  value
}: {
  icon: ReactNode;
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

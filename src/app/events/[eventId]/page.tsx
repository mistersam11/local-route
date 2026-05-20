import { ContentStatus, CourseEventVisibility } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  MapPin,
  MessageSquare,
  Repeat,
  Tag,
  Users
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EventForm } from "@/components/EventForm";
import { EventRsvpButtons } from "@/components/EventRsvpButtons";
import { ForumCommentForm } from "@/components/ForumCommentForm";
import {
  ForumCommentThread,
  type ForumCommentView
} from "@/components/ForumCommentThread";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  buildForumCommentTree,
  type ForumCommentTreeNode,
  type ForumCommentTreeSource
} from "@/lib/forum-comments";
import {
  courseEventRecurrenceLabels,
  courseEventTypeLabels,
  courseEventTypeOptions,
  courseEventVisibilityLabels,
  countEventRsvps,
  formatEventDateTime
} from "@/lib/events";

export const dynamic = "force-dynamic";

type EventPageProps = {
  params: {
    eventId: string;
  };
};

type ForumCommentRecord = ForumCommentTreeSource & {
  createdAt: Date;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function optionEntries(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

function serializeCommentTree(
  comments: Array<ForumCommentTreeNode<ForumCommentRecord>>
): ForumCommentView[] {
  return comments.map((comment) => ({
    id: comment.id,
    parentCommentId: comment.parentCommentId,
    body: comment.body,
    createdAtLabel: formatDate(comment.createdAt),
    replyCount: comment.replyCount,
    user: comment.user,
    replies: serializeCommentTree(comment.replies)
  }));
}

export default async function EventPage({ params }: EventPageProps) {
  const eventId = Number(params.eventId);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const [event, courses] = await Promise.all([
    prisma.courseEvent.findFirst({
      where: {
        id: eventId,
        OR: [
          { visibility: CourseEventVisibility.public },
          { visibility: CourseEventVisibility.unlisted },
          ...(currentUser ? [{ hostId: currentUser.id }] : [])
        ]
      },
      include: {
        host: { select: { id: true, username: true, profileImageUrl: true } },
        course: {
          select: {
            id: true,
            name: true,
            locationName: true,
            locationAddress: true,
            latitude: true,
            longitude: true
          }
        },
        discussionThread: {
          include: {
            comments: {
              where: { status: ContentStatus.visible },
              include: {
                user: {
                  select: { id: true, username: true, profileImageUrl: true }
                }
              },
              orderBy: { createdAt: "asc" }
            },
            _count: {
              select: { comments: { where: { status: ContentStatus.visible } } }
            }
          }
        },
        rsvps: {
          include: {
            user: { select: { id: true, username: true, profileImageUrl: true } }
          },
          orderBy: [{ status: "asc" }, { createdAt: "asc" }]
        }
      }
    }),
    currentUser
      ? prisma.course.findMany({
          where: { status: "approved" },
          select: { id: true, name: true, locationName: true },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: 200
        })
      : Promise.resolve([])
  ]);

  if (!event) {
    notFound();
  }

  const rsvpCounts = countEventRsvps(event.rsvps);
  const currentRsvp =
    event.rsvps.find((rsvp) => rsvp.userId === currentUser?.id)?.status ?? null;
  const isHost = currentUser?.id === event.hostId;
  const comments = event.discussionThread?.comments ?? [];
  const commentTree = serializeCommentTree(buildForumCommentTree(comments));
  const goingRsvps = event.rsvps.filter((rsvp) => rsvp.status === "going");
  const interestedRsvps = event.rsvps.filter(
    (rsvp) => rsvp.status === "interested"
  );

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:py-10">
      <section className="flex flex-col gap-6">
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
          href="/events"
        >
          <ArrowLeft size={16} aria-hidden />
          Events
        </Link>

        <article className="overflow-hidden rounded-lg bg-[#fffdf7] shadow-panel">
          <div className="relative min-h-[360px] bg-ink">
            {event.imageUrl ? (
              <img
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                src={event.imageUrl}
              />
            ) : (
              <div className="fallback-map field-grid absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase text-ink">
                  {courseEventTypeLabels[event.type]}
                </span>
                <span className="rounded-full bg-canopy-700 px-3 py-1 text-xs font-black uppercase text-white">
                  {event.visibility}
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                {event.title}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-white/80">
                <span className="flex items-center gap-2">
                  <CalendarClock size={16} aria-hidden />
                  {formatEventDateTime(event.startTime, event.timezone)}
                </span>
                <Link
                  className="flex items-center gap-2 underline-offset-4 hover:underline"
                  href={`/courses/${event.course.id}`}
                >
                  <MapPin size={16} aria-hidden />
                  {event.course.name}
                </Link>
              </p>
            </div>
          </div>
          <div className="grid gap-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                className="flex items-center gap-2 font-bold text-ink/65 hover:text-canopy-700"
                href={`/profiles/${event.host.id}`}
              >
                <Avatar
                  name={event.host.username}
                  size="sm"
                  src={event.host.profileImageUrl}
                />
                @{event.host.username}
              </Link>
              <span className="flex items-center gap-2 rounded-full bg-water-100 px-3 py-1 text-sm font-black text-water-700">
                <MessageSquare size={15} aria-hidden />
                {event.discussionThread?._count.comments ?? 0}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-base font-semibold leading-7 text-ink/70">
              {event.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {event.recurrenceFrequency ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-water-100 px-3 py-1 text-xs font-black uppercase text-water-700">
                  <Repeat size={13} aria-hidden />
                  {courseEventRecurrenceLabels[event.recurrenceFrequency]}
                </span>
              ) : null}
              {event.tags.map((tag) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-canopy-50 px-3 py-1 text-xs font-black uppercase text-canopy-700"
                  key={tag}
                >
                  <Tag size={13} aria-hidden />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </article>

        {event.discussionThread ? (
          <section className="grid gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-ink">Discussion</h2>
              <Link
                className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-ink/60 shadow-sm transition hover:bg-canopy-50 hover:text-canopy-700"
                href={`/forum/${event.discussionThread.id}`}
              >
                Open chain
              </Link>
            </div>

            {currentUser ? (
              <ForumCommentForm threadId={event.discussionThread.id} />
            ) : (
              <Link
                className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
                href={`/login?redirectTo=/events/${event.id}`}
              >
                Log in to comment
              </Link>
            )}

            <ForumCommentThread
              comments={commentTree}
              currentUserId={currentUser?.id ?? null}
              threadId={event.discussionThread.id}
            />
          </section>
        ) : null}
      </section>

      <aside className="flex flex-col gap-4">
        <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-ink">RSVP</h2>
          <EventRsvpButtons
            currentUserId={currentUser?.id}
            eventId={event.id}
            initialGoingCount={rsvpCounts.going}
            initialInterestedCount={rsvpCounts.interested}
            initialStatus={currentRsvp}
            maxPlayers={event.maxPlayers}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-canopy-50 p-3">
              <p className="text-sm font-semibold text-ink/55">Going</p>
              <p className="mt-1 text-2xl font-black text-canopy-700">
                {rsvpCounts.going}
              </p>
            </div>
            <div className="rounded-lg bg-clay-100 p-3">
              <p className="text-sm font-semibold text-ink/55">Interested</p>
              <p className="mt-1 text-2xl font-black text-clay-700">
                {rsvpCounts.interested}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-ink">
            <Users size={19} aria-hidden />
            Players
          </h2>
          {[...goingRsvps, ...interestedRsvps].slice(0, 12).map((rsvp) => (
            <Link
              className="flex items-center gap-2 rounded-lg bg-[#fffdf7] p-2 text-sm font-bold text-ink/65 transition hover:bg-canopy-50"
              href={`/profiles/${rsvp.user.id}`}
              key={rsvp.id}
            >
              <Avatar
                name={rsvp.user.username}
                size="sm"
                src={rsvp.user.profileImageUrl}
              />
              @{rsvp.user.username}
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-black uppercase text-ink/45">
                {rsvp.status}
              </span>
            </Link>
          ))}
          {!event.rsvps.length ? (
            <p className="text-sm font-semibold text-ink/55">No RSVPs yet.</p>
          ) : null}
        </section>

        <section className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-ink">Course</h2>
          <Link
            className="group grid gap-1 rounded-lg bg-[#fffdf7] p-3 transition hover:bg-canopy-50"
            href={`/courses/${event.course.id}`}
          >
            <span className="font-black text-ink">{event.course.name}</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-ink/55">
              <MapPin size={14} aria-hidden />
              {event.course.locationAddress ?? event.course.locationName}
            </span>
          </Link>
        </section>

        {isHost ? (
          <EventForm
            courses={courses}
            eventTypeOptions={courseEventTypeOptions}
            initialValue={{
              id: event.id,
              title: event.title,
              description: event.description,
              courseId: event.courseId,
              type: event.type,
              startTime: event.startTime.toISOString(),
              endTime: event.endTime?.toISOString() ?? null,
              timezone: event.timezone,
              recurrenceFrequency: event.recurrenceFrequency ?? "",
              recurrenceInterval: event.recurrenceInterval,
              recurrenceEndsAt: event.recurrenceEndsAt?.toISOString() ?? null,
              maxPlayers: event.maxPlayers,
              visibility: event.visibility,
              tags: event.tags,
              imageUrl: event.imageUrl
            }}
            mode="edit"
            recurrenceOptions={optionEntries(courseEventRecurrenceLabels)}
            visibilityOptions={optionEntries(courseEventVisibilityLabels)}
          />
        ) : null}
      </aside>
    </main>
  );
}

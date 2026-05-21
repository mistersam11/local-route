import { CourseEventVisibility } from "@prisma/client";
import Link from "next/link";
import {
  CalendarClock,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  SlidersHorizontal,
  Users
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EventForm } from "@/components/EventForm";
import { EventRsvpButtons } from "@/components/EventRsvpButtons";
import { PageCoverHeader } from "@/components/PageCoverHeader";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  courseEventRecurrenceLabels,
  courseEventTypeLabels,
  courseEventTypeOptions,
  courseEventVisibilityLabels,
  countEventRsvps,
  filterAndSortEvents,
  formatEventDateTime,
  normalizeCourseEventType
} from "@/lib/events";
import { getCoursePlaceholderImage } from "@/lib/placeholder-images";

export const dynamic = "force-dynamic";

type EventsPageProps = {
  searchParams?: {
    q?: string;
    location?: string;
    date?: string;
    courseId?: string;
    type?: string;
    sort?: string;
    lat?: string;
    lng?: string;
    distance?: string;
    create?: string;
  };
};

function numberParam(value?: string) {
  if (!value) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function optionEntries(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

function buildEventsHref(params: Record<string, string | number | null | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();

  return query ? `/events?${query}` : "/events";
}

function eventTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function sortDefaultCalendarEvents<T extends { id: number; startTime: Date | string }>(
  events: T[]
) {
  const now = Date.now();

  return [...events].sort((first, second) => {
    const firstTime = eventTime(first.startTime);
    const secondTime = eventTime(second.startTime);
    const firstPast = firstTime < now;
    const secondPast = secondTime < now;

    if (firstPast !== secondPast) {
      return firstPast ? 1 : -1;
    }

    return (
      (firstPast ? secondTime - firstTime : firstTime - secondTime) ||
      first.id - second.id
    );
  });
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const query = searchParams?.q?.trim() ?? "";
  const location = searchParams?.location?.trim() ?? "";
  const date = searchParams?.date?.trim() ?? "";
  const selectedCourseId = numberParam(searchParams?.courseId);
  const courseId =
    selectedCourseId !== null &&
    Number.isInteger(selectedCourseId) &&
    selectedCourseId > 0
      ? selectedCourseId
      : null;
  const type = normalizeCourseEventType(searchParams?.type);
  const sort =
    searchParams?.sort === "popularity" || searchParams?.sort === "distance"
      ? searchParams.sort
      : "date";
  const originLatitude = numberParam(searchParams?.lat);
  const originLongitude = numberParam(searchParams?.lng);
  const maxDistanceMiles = numberParam(searchParams?.distance);
  const hasAdvancedEventSearch = Boolean(
    location ||
      date ||
      courseId ||
      type ||
      sort !== "date" ||
      searchParams?.lat ||
      searchParams?.lng ||
      searchParams?.distance
  );
  const eventCoverPlaceholder = getCoursePlaceholderImage({
    id: "events-cover",
    name: "LocalRoute disc golf calendar",
    locationName: "League nights and tournaments",
    difficulty: "mixed",
    beginnerFriendly: true
  });
  const [currentUser, courses, rawEvents] = await Promise.all([
    getCurrentUser(),
    prisma.course.findMany({
      where: { status: "approved" },
      select: { id: true, name: true, locationName: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 200
    }),
    prisma.courseEvent.findMany({
      where: {
        visibility: CourseEventVisibility.public
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
          select: {
            id: true,
            _count: {
              select: { comments: { where: { status: "visible" } } }
            }
          }
        },
        rsvps: { select: { userId: true, status: true } }
      },
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
      take: 400
    })
  ]);
  const filteredEvents = filterAndSortEvents(
    rawEvents.map((event) => ({
      ...event,
      rsvpCounts: countEventRsvps(event.rsvps)
    })),
    {
      query,
      location,
      date,
      courseId,
      type,
      sort,
      originLatitude,
      originLongitude,
      maxDistanceMiles
    }
  );
  const events =
    sort === "date" && !date
      ? sortDefaultCalendarEvents(filteredEvents)
      : filteredEvents;
  const createHref = buildEventsHref({
    q: query,
    location,
    date,
    courseId,
    type,
    sort,
    lat: searchParams?.lat,
    lng: searchParams?.lng,
    distance: searchParams?.distance,
    create: 1
  });
  const showCreateForm = searchParams?.create === "1";

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <PageCoverHeader
        eyebrow="Events"
        placeholder={eventCoverPlaceholder}
        title="Local disc golf calendar"
      >
        {currentUser ? (
          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-ink shadow-sm transition hover:bg-canopy-50 hover:text-canopy-700 lg:ml-auto"
            href={createHref}
          >
            <Plus size={16} aria-hidden />
            Create event
          </Link>
        ) : (
          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-ink shadow-sm transition hover:bg-canopy-50 hover:text-canopy-700 lg:ml-auto"
            href="/login?redirectTo=/events?create=1"
          >
            <Plus size={16} aria-hidden />
            Create event
          </Link>
        )}
      </PageCoverHeader>

      {showCreateForm && currentUser ? (
        <EventForm
          courses={courses}
          eventTypeOptions={courseEventTypeOptions}
          recurrenceOptions={optionEntries(courseEventRecurrenceLabels)}
          visibilityOptions={optionEntries(courseEventVisibilityLabels)}
        />
      ) : null}

      <form
        action="/events"
        className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-3 shadow-sm"
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-full border border-canopy-900/10 px-5">
            <Search size={20} className="shrink-0 text-canopy-700" aria-hidden />
            <input
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-ink/45"
              defaultValue={query}
              name="q"
              placeholder="Search events"
            />
          </label>
          <button
            className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-canopy-700"
            type="submit"
          >
            Search
          </button>
          <details
            className="group sm:contents"
            open={hasAdvancedEventSearch}
          >
            <summary className="inline-flex h-12 cursor-pointer list-none items-center justify-center gap-2 rounded-full bg-canopy-50 px-5 text-sm font-black text-canopy-700 transition hover:bg-canopy-100 [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal size={16} aria-hidden />
              Advanced search
            </summary>
            <div className="grid gap-3 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-3 sm:col-span-3">
              <div className="grid gap-3 lg:grid-cols-[1fr_150px_1fr_170px_150px]">
                <label className="flex min-h-11 items-center gap-3 rounded-full border border-canopy-900/10 bg-white px-4">
                  <MapPin size={18} className="shrink-0 text-canopy-700" aria-hidden />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-ink/45"
                    defaultValue={location}
                    name="location"
                    placeholder="Location"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
                  Date
                  <input
                    className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold normal-case text-ink outline-none"
                    defaultValue={date}
                    name="date"
                    type="date"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
                  Course
                  <select
                    className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold normal-case text-ink outline-none"
                    defaultValue={courseId ?? ""}
                    name="courseId"
                  >
                    <option value="">Any course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
                  Type
                  <select
                    className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold normal-case text-ink outline-none"
                    defaultValue={type ?? ""}
                    name="type"
                  >
                    <option value="">Any type</option>
                    {courseEventTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
                  Sort
                  <select
                    className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold normal-case text-ink outline-none"
                    defaultValue={sort}
                    name="sort"
                  >
                    <option value="date">Date</option>
                    <option value="popularity">Popularity</option>
                    <option value="distance">Distance</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-[130px_130px_130px_auto_auto]">
                <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
                  Lat
                  <input
                    className="h-10 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none"
                    defaultValue={searchParams?.lat ?? ""}
                    name="lat"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
                  Lng
                  <input
                    className="h-10 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none"
                    defaultValue={searchParams?.lng ?? ""}
                    name="lng"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
                  Miles
                  <input
                    className="h-10 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none"
                    defaultValue={searchParams?.distance ?? ""}
                    name="distance"
                    type="number"
                  />
                </label>
                <button
                  className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canopy-700 px-4 text-sm font-black text-white transition hover:bg-canopy-900"
                  type="submit"
                >
                  <SlidersHorizontal size={16} aria-hidden />
                  Apply filters
                </button>
                <Link
                  className="mt-auto inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-black text-canopy-700 shadow-sm transition hover:bg-canopy-50"
                  href="/events"
                >
                  Clear
                </Link>
              </div>
            </div>
          </details>
        </div>
      </form>

      <section className="grid gap-3 lg:grid-cols-2">
        {events.map((event) => {
          const rsvpCounts = event.rsvpCounts;
          const currentRsvp =
            event.rsvps.find((rsvp) => rsvp.userId === currentUser?.id)?.status ??
            null;
          const commentCount =
            event.discussionThread?._count.comments ?? 0;

          return (
            <article
              className="grid overflow-hidden rounded-lg border border-canopy-900/10 bg-[#fffdf7] shadow-sm transition hover:shadow-panel"
              key={event.id}
            >
              <Link
                className="relative block min-h-48 bg-ink"
                href={`/events/${event.id}`}
              >
                {event.imageUrl ?? event.course.locationAddress ? (
                  event.imageUrl ? (
                    <img
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      src={event.imageUrl}
                    />
                  ) : (
                    <div className="fallback-map field-grid absolute inset-0" />
                  )
                ) : (
                  <div className="fallback-map field-grid absolute inset-0" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase text-ink">
                    {courseEventTypeLabels[event.type]}
                  </span>
                  <h2 className="mt-3 text-3xl font-black leading-tight">
                    {event.title}
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-sm font-bold text-white/80">
                    <CalendarClock size={15} aria-hidden />
                    {formatEventDateTime(event.startTime, event.timezone)}
                  </p>
                </div>
              </Link>
              <div className="grid gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-ink/60">
                  <Link
                    className="flex items-center gap-2 hover:text-canopy-700"
                    href={`/courses/${event.course.id}`}
                  >
                    <MapPin size={15} aria-hidden />
                    {event.course.name}
                  </Link>
                  <span className="flex items-center gap-2">
                    <Avatar
                      name={event.host.username}
                      size="sm"
                      src={event.host.profileImageUrl}
                    />
                    @{event.host.username}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-6 text-ink/65">
                  {event.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {event.recurrenceFrequency ? (
                    <span className="rounded-full bg-water-100 px-2.5 py-1 text-xs font-black uppercase text-water-700">
                      {courseEventRecurrenceLabels[event.recurrenceFrequency]}
                    </span>
                  ) : null}
                  {event.tags.map((tag) => (
                    <span
                      className="rounded-full bg-canopy-50 px-2.5 py-1 text-xs font-black uppercase text-canopy-700"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 text-sm font-black text-ink/60">
                    <span className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 shadow-sm">
                      <Users size={15} aria-hidden />
                      {rsvpCounts.going} going
                    </span>
                    <Link
                      className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 shadow-sm transition hover:bg-canopy-50"
                      href={`/events/${event.id}`}
                    >
                      <MessageSquare size={15} aria-hidden />
                      {commentCount}
                    </Link>
                  </div>
                  <EventRsvpButtons
                    currentUserId={currentUser?.id}
                    eventId={event.id}
                    initialGoingCount={rsvpCounts.going}
                    initialInterestedCount={rsvpCounts.interested}
                    initialStatus={currentRsvp}
                    maxPlayers={event.maxPlayers}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {!events.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <CalendarClock className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">No events found</h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            Clear filters or create the first local listing.
          </p>
        </section>
      ) : null}
    </main>
  );
}

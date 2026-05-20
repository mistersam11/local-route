import {
  CourseEventRecurrenceFrequency,
  CourseEventRsvpStatus,
  CourseEventType,
  CourseEventVisibility
} from "@prisma/client";

export const courseEventTypeLabels = {
  [CourseEventType.leagueNight]: "League night",
  [CourseEventType.doubles]: "Doubles",
  [CourseEventType.tournament]: "Tournament",
  [CourseEventType.glowRound]: "Glow round",
  [CourseEventType.casualRound]: "Casual round",
  [CourseEventType.clinic]: "Clinic",
  [CourseEventType.tagsMatch]: "Tags match",
  [CourseEventType.puttingLeague]: "Putting league"
} satisfies Record<CourseEventType, string>;

export const courseEventTypeOptions = Object.values(CourseEventType).map((value) => ({
  value,
  label: courseEventTypeLabels[value]
}));

export const courseEventVisibilityLabels = {
  [CourseEventVisibility.public]: "Public",
  [CourseEventVisibility.unlisted]: "Unlisted",
  [CourseEventVisibility.private]: "Private"
} satisfies Record<CourseEventVisibility, string>;

export const courseEventRecurrenceLabels = {
  [CourseEventRecurrenceFrequency.weekly]: "Weekly",
  [CourseEventRecurrenceFrequency.biweekly]: "Every other week",
  [CourseEventRecurrenceFrequency.monthly]: "Monthly"
} satisfies Record<CourseEventRecurrenceFrequency, string>;

export const courseEventCommunitySections = [
  {
    key: "leagues",
    label: "Leagues",
    types: [CourseEventType.leagueNight, CourseEventType.puttingLeague]
  },
  {
    key: "tournaments",
    label: "Tournaments",
    types: [CourseEventType.tournament]
  },
  {
    key: "doubles",
    label: "Doubles",
    types: [CourseEventType.doubles]
  },
  {
    key: "casualRounds",
    label: "Casual rounds",
    types: [
      CourseEventType.casualRound,
      CourseEventType.glowRound,
      CourseEventType.tagsMatch,
      CourseEventType.clinic
    ]
  }
] as const;

export type CourseEventCommunitySectionKey =
  (typeof courseEventCommunitySections)[number]["key"];

type EventRsvpStatusInput = CourseEventRsvpStatus | null | undefined;

export type EventRsvpCounts = {
  going: number;
  interested: number;
};

export type EventDraftInput = {
  title?: unknown;
  description?: unknown;
  courseId?: unknown;
  type?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  timezone?: unknown;
  recurrenceFrequency?: unknown;
  recurrenceInterval?: unknown;
  recurrenceEndsAt?: unknown;
  maxPlayers?: unknown;
  visibility?: unknown;
  tags?: unknown;
  imageUrl?: unknown;
};

export type ValidatedEventDraft = {
  title: string;
  description: string;
  courseId: number;
  type: CourseEventType;
  startTime: Date;
  endTime: Date | null;
  timezone: string;
  recurrenceFrequency: CourseEventRecurrenceFrequency | null;
  recurrenceInterval: number;
  recurrenceEndsAt: Date | null;
  maxPlayers: number | null;
  visibility: CourseEventVisibility;
  tags: string[];
  imageUrl: string | null;
};

export type EventValidationResult =
  | { ok: true; value: ValidatedEventDraft; errors: Record<string, never> }
  | { ok: false; value: null; errors: Record<string, string> };

export type EventCourseSummary = {
  id: number;
  name: string;
  locationName: string;
  locationAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type FilterableCourseEvent = {
  id: number;
  title: string;
  description: string;
  type: CourseEventType;
  startTime: Date | string;
  endTime?: Date | string | null;
  tags: string[];
  course: EventCourseSummary;
  rsvpCounts: EventRsvpCounts;
};

export type EventSortMode = "date" | "popularity" | "distance";

export type EventFilterOptions = {
  query?: string | null;
  location?: string | null;
  date?: string | null;
  courseId?: number | null;
  type?: CourseEventType | null;
  sort?: EventSortMode | null;
  originLatitude?: number | null;
  originLongitude?: number | null;
  maxDistanceMiles?: number | null;
};

const defaultTimezone = "America/New_York";

const eventTypeAliases = {
  league: CourseEventType.leagueNight,
  leaguenight: CourseEventType.leagueNight,
  leagues: CourseEventType.leagueNight,
  doubles: CourseEventType.doubles,
  double: CourseEventType.doubles,
  tournament: CourseEventType.tournament,
  tournaments: CourseEventType.tournament,
  glow: CourseEventType.glowRound,
  glowround: CourseEventType.glowRound,
  casual: CourseEventType.casualRound,
  casualround: CourseEventType.casualRound,
  clinic: CourseEventType.clinic,
  clinics: CourseEventType.clinic,
  tags: CourseEventType.tagsMatch,
  tag: CourseEventType.tagsMatch,
  tagsmatch: CourseEventType.tagsMatch,
  putting: CourseEventType.puttingLeague,
  puttingleague: CourseEventType.puttingLeague
} satisfies Record<string, CourseEventType>;

function compactKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function enumValue<T extends string>(
  value: unknown,
  values: readonly T[]
): T | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return values.includes(trimmed as T) ? (trimmed as T) : null;
}

function parseDate(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isInteger(number) ? number : Number.NaN;
}

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function dayRangeUtc(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }

  const start = new Date(`${isoDate}T00:00:00.000Z`);
  const end = new Date(`${isoDate}T23:59:59.999Z`);

  return Number.isNaN(start.getTime()) ? null : { start, end };
}

function eventTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function eventPopularity(event: Pick<FilterableCourseEvent, "rsvpCounts">) {
  return event.rsvpCounts.going * 2 + event.rsvpCounts.interested;
}

export function normalizeCourseEventType(value: unknown): CourseEventType | null {
  const direct = enumValue(value, Object.values(CourseEventType));

  if (direct) {
    return direct;
  }

  if (typeof value !== "string") {
    return null;
  }

  return eventTypeAliases[compactKey(value) as keyof typeof eventTypeAliases] ?? null;
}

export function normalizeCourseEventVisibility(
  value: unknown
): CourseEventVisibility {
  return (
    enumValue(value, Object.values(CourseEventVisibility)) ??
    CourseEventVisibility.public
  );
}

export function normalizeCourseEventRecurrence(
  value: unknown
): CourseEventRecurrenceFrequency | null {
  return enumValue(value, Object.values(CourseEventRecurrenceFrequency));
}

export function normalizeCourseEventRsvpStatus(
  value: unknown
): CourseEventRsvpStatus | null {
  return enumValue(value, Object.values(CourseEventRsvpStatus));
}

export function normalizeEventTags(value: unknown) {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seen = new Set<string>();

  return rawTags.flatMap((rawTag) => {
    const tag = String(rawTag ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
    const key = tag.toLowerCase();

    if (!tag || seen.has(key)) {
      return [];
    }

    seen.add(key);
    return [tag];
  }).slice(0, 8);
}

export function validateCourseEventDraft(
  input: EventDraftInput
): EventValidationResult {
  const errors: Record<string, string> = {};
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const courseId = Number(input.courseId);
  const type = normalizeCourseEventType(input.type);
  const startTime = parseDate(input.startTime);
  const endTime = parseDate(input.endTime);
  const timezone =
    typeof input.timezone === "string" && input.timezone.trim()
      ? input.timezone.trim()
      : defaultTimezone;
  const recurrenceFrequency = normalizeCourseEventRecurrence(
    input.recurrenceFrequency
  );
  const recurrenceInterval = Number(input.recurrenceInterval ?? 1);
  const recurrenceEndsAt = parseDate(input.recurrenceEndsAt);
  const maxPlayers = parseOptionalInteger(input.maxPlayers);
  const visibility = normalizeCourseEventVisibility(input.visibility);
  const tags = normalizeEventTags(input.tags);
  const imageUrl =
    typeof input.imageUrl === "string" && input.imageUrl.trim()
      ? input.imageUrl.trim()
      : null;

  if (title.length < 4) {
    errors.title = "Event title is required.";
  }

  if (description.length < 4) {
    errors.description = "Event description is required.";
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    errors.courseId = "Choose a course.";
  }

  if (!type) {
    errors.type = "Choose an event type.";
  }

  if (!startTime) {
    errors.startTime = "Choose a start time.";
  }

  if (endTime && startTime && endTime <= startTime) {
    errors.endTime = "End time must be after the start time.";
  }

  if (!isValidTimezone(timezone)) {
    errors.timezone = "Use a valid timezone.";
  }

  if (
    recurrenceFrequency &&
    (!Number.isInteger(recurrenceInterval) || recurrenceInterval < 1)
  ) {
    errors.recurrenceInterval = "Recurring events need a positive interval.";
  }

  if (recurrenceEndsAt && startTime && recurrenceEndsAt <= startTime) {
    errors.recurrenceEndsAt = "Recurrence must end after the first event.";
  }

  if (Number.isNaN(maxPlayers) || (maxPlayers !== null && maxPlayers < 1)) {
    errors.maxPlayers = "Max players must be a positive whole number.";
  }

  if (imageUrl && !imageUrl.startsWith("https://")) {
    errors.imageUrl = "Event images need an HTTPS URL.";
  }

  if (Object.keys(errors).length) {
    return { ok: false, value: null, errors };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      courseId,
      type: type ?? CourseEventType.casualRound,
      startTime: startTime ?? new Date(),
      endTime,
      timezone,
      recurrenceFrequency,
      recurrenceInterval: recurrenceFrequency ? recurrenceInterval : 1,
      recurrenceEndsAt: recurrenceFrequency ? recurrenceEndsAt : null,
      maxPlayers: maxPlayers === null ? null : maxPlayers,
      visibility,
      tags,
      imageUrl
    },
    errors: {}
  };
}

export function countEventRsvps(
  rsvps: Array<{ status: CourseEventRsvpStatus }>
): EventRsvpCounts {
  return rsvps.reduce<EventRsvpCounts>(
    (counts, rsvp) => ({
      going:
        counts.going + (rsvp.status === CourseEventRsvpStatus.going ? 1 : 0),
      interested:
        counts.interested +
        (rsvp.status === CourseEventRsvpStatus.interested ? 1 : 0)
    }),
    { going: 0, interested: 0 }
  );
}

export function applyEventRsvpTransition(
  counts: EventRsvpCounts,
  currentStatus: EventRsvpStatusInput,
  nextStatus: EventRsvpStatusInput
): EventRsvpCounts {
  const next = { ...counts };

  if (currentStatus === nextStatus) {
    return next;
  }

  if (currentStatus === CourseEventRsvpStatus.going) {
    next.going = Math.max(0, next.going - 1);
  }

  if (currentStatus === CourseEventRsvpStatus.interested) {
    next.interested = Math.max(0, next.interested - 1);
  }

  if (nextStatus === CourseEventRsvpStatus.going) {
    next.going += 1;
  }

  if (nextStatus === CourseEventRsvpStatus.interested) {
    next.interested += 1;
  }

  return next;
}

export function canAcceptGoingRsvp({
  maxPlayers,
  goingCount,
  currentStatus
}: {
  maxPlayers: number | null;
  goingCount: number;
  currentStatus?: CourseEventRsvpStatus | null;
}) {
  return (
    maxPlayers === null ||
    currentStatus === CourseEventRsvpStatus.going ||
    goingCount < maxPlayers
  );
}

export function distanceMiles(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) {
  const radiusMiles = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(second.latitude - first.latitude);
  const deltaLon = toRadians(second.longitude - first.longitude);
  const firstLat = toRadians(first.latitude);
  const secondLat = toRadians(second.latitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(deltaLon / 2) ** 2;

  return radiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function eventDistanceMiles(
  event: Pick<FilterableCourseEvent, "course">,
  origin: { latitude: number | null; longitude: number | null }
) {
  if (
    origin.latitude === null ||
    origin.longitude === null ||
    event.course.latitude === null ||
    event.course.latitude === undefined ||
    event.course.longitude === null ||
    event.course.longitude === undefined
  ) {
    return null;
  }

  return distanceMiles(
    { latitude: origin.latitude, longitude: origin.longitude },
    { latitude: event.course.latitude, longitude: event.course.longitude }
  );
}

export function filterAndSortEvents<T extends FilterableCourseEvent>(
  events: T[],
  filters: EventFilterOptions
) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const location = filters.location?.trim().toLowerCase() ?? "";
  const dateRange = filters.date ? dayRangeUtc(filters.date) : null;
  const origin = {
    latitude:
      typeof filters.originLatitude === "number" &&
      Number.isFinite(filters.originLatitude)
        ? filters.originLatitude
        : null,
    longitude:
      typeof filters.originLongitude === "number" &&
      Number.isFinite(filters.originLongitude)
        ? filters.originLongitude
        : null
  };
  const maxDistanceMiles =
    typeof filters.maxDistanceMiles === "number" &&
    Number.isFinite(filters.maxDistanceMiles) &&
    filters.maxDistanceMiles > 0
      ? filters.maxDistanceMiles
      : null;

  return events
    .filter((event) => {
      const start = eventTime(event.startTime);
      const end = event.endTime ? eventTime(event.endTime) : start;
      const distance = eventDistanceMiles(event, origin);

      if (query) {
        const haystack = [
          event.title,
          event.description,
          courseEventTypeLabels[event.type],
          event.course.name,
          event.course.locationName,
          event.course.locationAddress ?? "",
          ...event.tags
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (location) {
        const locationHaystack = [
          event.course.locationName,
          event.course.locationAddress ?? ""
        ]
          .join(" ")
          .toLowerCase();

        if (!locationHaystack.includes(location)) {
          return false;
        }
      }

      if (
        dateRange &&
        (start > dateRange.end.getTime() || end < dateRange.start.getTime())
      ) {
        return false;
      }

      if (filters.courseId && event.course.id !== filters.courseId) {
        return false;
      }

      if (filters.type && event.type !== filters.type) {
        return false;
      }

      if (
        maxDistanceMiles !== null &&
        (distance === null || distance > maxDistanceMiles)
      ) {
        return false;
      }

      return true;
    })
    .sort((first, second) => {
      if (filters.sort === "popularity") {
        return (
          eventPopularity(second) - eventPopularity(first) ||
          eventTime(first.startTime) - eventTime(second.startTime) ||
          first.id - second.id
        );
      }

      if (filters.sort === "distance") {
        const firstDistance = eventDistanceMiles(first, origin);
        const secondDistance = eventDistanceMiles(second, origin);

        if (firstDistance !== null || secondDistance !== null) {
          return (
            (firstDistance ?? Number.POSITIVE_INFINITY) -
              (secondDistance ?? Number.POSITIVE_INFINITY) ||
            eventTime(first.startTime) - eventTime(second.startTime) ||
            first.id - second.id
          );
        }
      }

      return (
        eventTime(first.startTime) - eventTime(second.startTime) ||
        first.id - second.id
      );
    });
}

export function groupCourseEventsForCommunity<T extends { type: CourseEventType }>(
  events: T[]
) {
  return courseEventCommunitySections.reduce(
    (groups, section) => ({
      ...groups,
      [section.key]: events.filter((event) =>
        (section.types as readonly CourseEventType[]).includes(event.type)
      )
    }),
    {} as Record<CourseEventCommunitySectionKey, T[]>
  );
}

export function formatEventDateTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone
  }).format(date);
}

export function buildEventDiscussionThreadDraft({
  title,
  description,
  type,
  courseName,
  startTime,
  timezone
}: {
  title: string;
  description: string;
  type: CourseEventType;
  courseName: string;
  startTime: Date;
  timezone: string;
}) {
  return {
    title,
    body: `${courseEventTypeLabels[type]} at ${courseName} on ${formatEventDateTime(
      startTime,
      timezone
    )}.\n\n${description}`,
    flair: courseEventTypeLabels[type]
  };
}

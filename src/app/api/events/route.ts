import {
  CourseEventVisibility,
  NotificationTargetType,
  NotificationType
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import {
  buildCourseFollowerNotifications
} from "@/lib/course-communities";
import { prisma } from "@/lib/db";
import {
  buildEventDiscussionThreadDraft,
  countEventRsvps,
  filterAndSortEvents,
  normalizeCourseEventType,
  validateCourseEventDraft
} from "@/lib/events";
import { moderateTextFields, moderationFailure } from "@/lib/moderation";

function numberParam(value: string | null) {
  if (!value) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function serializeEvent(event: Awaited<ReturnType<typeof eventListQuery>>[number]) {
  const rsvpCounts = countEventRsvps(event.rsvps);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime?.toISOString() ?? null,
    timezone: event.timezone,
    recurrenceFrequency: event.recurrenceFrequency,
    recurrenceInterval: event.recurrenceInterval,
    recurrenceEndsAt: event.recurrenceEndsAt?.toISOString() ?? null,
    maxPlayers: event.maxPlayers,
    visibility: event.visibility,
    tags: event.tags,
    imageUrl: event.imageUrl,
    host: event.host,
    course: event.course,
    rsvpCounts
  };
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

async function eventListQuery() {
  return prisma.courseEvent.findMany({
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
      rsvps: { select: { status: true } }
    },
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
    take: 400
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const location = searchParams.get("location");
  const date = searchParams.get("date");
  const rawCourseId = numberParam(searchParams.get("courseId"));
  const courseId =
    rawCourseId !== null && Number.isInteger(rawCourseId) && rawCourseId > 0
      ? rawCourseId
      : null;
  const type = normalizeCourseEventType(searchParams.get("type"));
  const rawSort = searchParams.get("sort");
  const sort =
    rawSort === "popularity" || rawSort === "distance" ? rawSort : "date";
  const originLatitude = numberParam(searchParams.get("lat"));
  const originLongitude = numberParam(searchParams.get("lng"));
  const maxDistanceMiles = numberParam(searchParams.get("distance"));
  const events = await eventListQuery();
  const filteredEvents = filterAndSortEvents(
    events.map((event) => ({
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
  const sortedEvents =
    sort === "date" && !date
      ? sortDefaultCalendarEvents(filteredEvents)
      : filteredEvents;

  return NextResponse.json({
    events: sortedEvents.map(serializeEvent)
  });
}

export async function POST(request: Request) {
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to create an event" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const validation = validateCourseEventDraft(body);

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const draft = validation.value;
  const course = await prisma.course.findFirst({
    where: { id: draft.courseId, status: "approved" },
    select: { id: true, name: true }
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  try {
    await moderateTextFields([draft.title, draft.description, ...draft.tags]);
  } catch (error) {
    const failure = moderationFailure(error);

    if (failure) {
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    throw error;
  }

  const event = await prisma.$transaction(async (tx) => {
    const createdEvent = await tx.courseEvent.create({
      data: {
        title: draft.title,
        description: draft.description,
        hostId: currentUser.id,
        courseId: course.id,
        type: draft.type,
        startTime: draft.startTime,
        endTime: draft.endTime,
        timezone: draft.timezone,
        recurrenceFrequency: draft.recurrenceFrequency,
        recurrenceInterval: draft.recurrenceInterval,
        recurrenceEndsAt: draft.recurrenceEndsAt,
        maxPlayers: draft.maxPlayers,
        visibility: draft.visibility,
        tags: draft.tags,
        imageUrl: draft.imageUrl
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        startTime: true,
        timezone: true
      }
    });
    const threadDraft = buildEventDiscussionThreadDraft({
      title: createdEvent.title,
      description: createdEvent.description,
      type: createdEvent.type,
      courseName: course.name,
      startTime: createdEvent.startTime,
      timezone: createdEvent.timezone
    });

    await tx.forumThread.create({
      data: {
        userId: currentUser.id,
        courseId: course.id,
        eventId: createdEvent.id,
        title: threadDraft.title,
        body: threadDraft.body,
        flair: threadDraft.flair
      }
    });

    if (draft.visibility === CourseEventVisibility.public) {
      const followers = await tx.courseFollow.findMany({
        where: { courseId: course.id },
        select: {
          userId: true,
          notifyNewPosts: true,
          notifyNewEvents: true
        }
      });
      const notifications = buildCourseFollowerNotifications({
        followers,
        actorId: currentUser.id,
        courseId: course.id,
        type: NotificationType.courseEvent,
        targetType: NotificationTargetType.courseEvent,
        targetRecordId: createdEvent.id
      });

      if (notifications.length) {
        await tx.notification.createMany({
          data: notifications,
          skipDuplicates: true
        });
      }
    }

    return createdEvent;
  });

  return NextResponse.json({ event }, { status: 201 });
}

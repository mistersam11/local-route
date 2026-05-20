import { CourseEventVisibility } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  buildEventDiscussionThreadDraft,
  countEventRsvps,
  validateCourseEventDraft
} from "@/lib/events";
import { moderateTextFields, moderationFailure } from "@/lib/moderation";

type Params = {
  params: {
    eventId: string;
  };
};

function eventIdParam(params: Params["params"]) {
  const eventId = Number(params.eventId);

  return Number.isInteger(eventId) && eventId > 0 ? eventId : null;
}

export async function GET(request: Request, { params }: Params) {
  const eventId = eventIdParam(params);

  if (!eventId) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);
  const event = await prisma.courseEvent.findFirst({
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
      discussionThread: { select: { id: true } },
      rsvps: { select: { userId: true, status: true } }
    }
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    event: {
      ...event,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString() ?? null,
      recurrenceEndsAt: event.recurrenceEndsAt?.toISOString() ?? null,
      rsvpCounts: countEventRsvps(event.rsvps),
      currentRsvp:
        event.rsvps.find((rsvp) => rsvp.userId === currentUser?.id)?.status ?? null
    }
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const eventId = eventIdParam(params);

  if (!eventId) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to edit events" }, { status: 401 });
  }

  const existingEvent = await prisma.courseEvent.findUnique({
    where: { id: eventId },
    select: { id: true, hostId: true }
  });

  if (!existingEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (existingEvent.hostId !== currentUser.id) {
    return NextResponse.json({ error: "Only the host can edit this event" }, { status: 403 });
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
    const updatedEvent = await tx.courseEvent.update({
      where: { id: eventId },
      data: {
        title: draft.title,
        description: draft.description,
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
      title: updatedEvent.title,
      description: updatedEvent.description,
      type: updatedEvent.type,
      courseName: course.name,
      startTime: updatedEvent.startTime,
      timezone: updatedEvent.timezone
    });

    await tx.forumThread.updateMany({
      where: { eventId },
      data: {
        courseId: course.id,
        title: threadDraft.title,
        body: threadDraft.body,
        flair: threadDraft.flair
      }
    });

    return updatedEvent;
  });

  return NextResponse.json({ event });
}

export async function DELETE(request: Request, { params }: Params) {
  const eventId = eventIdParam(params);

  if (!eventId) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to delete events" }, { status: 401 });
  }

  const event = await prisma.courseEvent.findUnique({
    where: { id: eventId },
    select: { id: true, hostId: true }
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.hostId !== currentUser.id) {
    return NextResponse.json(
      { error: "Only the host can delete this event" },
      { status: 403 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.forumThread.deleteMany({ where: { eventId } });
    await tx.courseEvent.delete({ where: { id: eventId } });
  });

  return NextResponse.json({ deleted: true });
}

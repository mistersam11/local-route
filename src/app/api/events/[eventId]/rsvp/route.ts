import { CourseEventRsvpStatus, CourseEventVisibility } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  canAcceptGoingRsvp,
  countEventRsvps,
  normalizeCourseEventRsvpStatus
} from "@/lib/events";

type Params = {
  params: {
    eventId: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const eventId = Number(params.eventId);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to RSVP" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const status =
    body.status === null || body.status === "none"
      ? null
      : normalizeCourseEventRsvpStatus(body.status);

  if (status === null && body.status !== null && body.status !== "none") {
    return NextResponse.json({ error: "Invalid RSVP status" }, { status: 400 });
  }

  const event = await prisma.courseEvent.findFirst({
    where: {
      id: eventId,
      OR: [
        { visibility: CourseEventVisibility.public },
        { visibility: CourseEventVisibility.unlisted },
        { hostId: currentUser.id }
      ]
    },
    select: {
      id: true,
      maxPlayers: true,
      rsvps: { select: { userId: true, status: true } }
    }
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const currentStatus =
    event.rsvps.find((rsvp) => rsvp.userId === currentUser.id)?.status ?? null;
  const counts = countEventRsvps(event.rsvps);

  if (
    status === CourseEventRsvpStatus.going &&
    !canAcceptGoingRsvp({
      maxPlayers: event.maxPlayers,
      goingCount: counts.going,
      currentStatus
    })
  ) {
    return NextResponse.json({ error: "This event is full" }, { status: 409 });
  }

  const rsvps = await prisma.$transaction(async (tx) => {
    if (status === null) {
      await tx.courseEventRsvp.deleteMany({
        where: { eventId, userId: currentUser.id }
      });
    } else {
      await tx.courseEventRsvp.upsert({
        where: {
          eventId_userId: {
            eventId,
            userId: currentUser.id
          }
        },
        create: {
          eventId,
          userId: currentUser.id,
          status
        },
        update: { status }
      });
    }

    return tx.courseEventRsvp.findMany({
      where: { eventId },
      select: { userId: true, status: true }
    });
  });

  return NextResponse.json({
    currentStatus: status,
    rsvpCounts: countEventRsvps(rsvps)
  });
}

import { NextResponse } from "next/server";
import { VoteValue } from "@prisma/client";
import { getFollowingIds, getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { serializeRoute } from "@/lib/route-data";

type Params = {
  params: {
    routeId: string;
  };
};

function parseVote(value: unknown) {
  return value === VoteValue.down ? VoteValue.down : VoteValue.up;
}

export async function POST(request: Request, { params }: Params) {
  const routeId = Number(params.routeId);

  if (!Number.isInteger(routeId)) {
    return NextResponse.json({ error: "Invalid route id" }, { status: 400 });
  }

  const currentUserId = getRequestUserId(request);
  const body = (await request.json()) as { value?: unknown };
  const value = parseVote(body.value);
  const routeExists = await prisma.route.findUnique({
    where: { id: routeId },
    select: { id: true }
  });

  if (!routeExists) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  const existing = await prisma.routeVote.findUnique({
    where: { routeId_userId: { routeId, userId: currentUserId } }
  });

  let upDelta = 0;
  let downDelta = 0;

  if (!existing) {
    if (value === VoteValue.up) upDelta = 1;
    if (value === VoteValue.down) downDelta = 1;
  } else if (existing.value !== value) {
    if (existing.value === VoteValue.up) upDelta -= 1;
    if (existing.value === VoteValue.down) downDelta -= 1;
    if (value === VoteValue.up) upDelta += 1;
    if (value === VoteValue.down) downDelta += 1;
  }

  if (!existing) {
    await prisma.routeVote.create({
      data: { routeId, userId: currentUserId, value }
    });
  } else if (existing.value !== value) {
    await prisma.routeVote.update({
      where: { id: existing.id },
      data: { value }
    });
  }

  const include = {
    user: {
      select: { id: true, username: true, profileImageUrl: true }
    }
  };

  const route =
    upDelta !== 0 || downDelta !== 0
      ? await prisma.route.update({
          where: { id: routeId },
          data: {
            ...(upDelta !== 0 ? { upvotes: { increment: upDelta } } : {}),
            ...(downDelta !== 0 ? { downvotes: { increment: downDelta } } : {})
          },
          include
        })
      : await prisma.route.findUnique({
          where: { id: routeId },
          include
        });

  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  const followingIds = await getFollowingIds(currentUserId);

  return NextResponse.json({ route: serializeRoute(route, followingIds) });
}

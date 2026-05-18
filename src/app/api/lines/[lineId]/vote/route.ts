import { VoteValue } from "@prisma/client";
import { NextResponse } from "next/server";
import { getFollowingIds, getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { includeLineAuthor, serializeLine } from "@/lib/social-data";

type Params = {
  params: {
    lineId: string;
  };
};

function parseVote(value: unknown) {
  return value === VoteValue.down ? VoteValue.down : VoteValue.up;
}

export async function POST(request: Request, { params }: Params) {
  const lineId = Number(params.lineId);

  if (!Number.isInteger(lineId)) {
    return NextResponse.json({ error: "Invalid line id" }, { status: 400 });
  }

  const currentUserId = getRequestUserId(request);
  const body = (await request.json()) as { value?: unknown };
  const value = parseVote(body.value);
  const lineExists = await prisma.line.findUnique({
    where: { id: lineId },
    select: { id: true }
  });

  if (!lineExists) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  const existing = await prisma.lineVote.findUnique({
    where: { lineId_userId: { lineId, userId: currentUserId } }
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
    await prisma.lineVote.create({
      data: { lineId, userId: currentUserId, value }
    });
  } else if (existing.value !== value) {
    await prisma.lineVote.update({
      where: { id: existing.id },
      data: { value }
    });
  }

  const line =
    upDelta !== 0 || downDelta !== 0
      ? await prisma.line.update({
          where: { id: lineId },
          data: {
            ...(upDelta !== 0 ? { upvotes: { increment: upDelta } } : {}),
            ...(downDelta !== 0 ? { downvotes: { increment: downDelta } } : {})
          },
          include: includeLineAuthor
        })
      : await prisma.line.findUnique({
          where: { id: lineId },
          include: includeLineAuthor
        });

  if (!line) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  const followingIds = await getFollowingIds(currentUserId);

  return NextResponse.json({ line: serializeLine(line, followingIds) });
}

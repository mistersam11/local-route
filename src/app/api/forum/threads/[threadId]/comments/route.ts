import { ContentStatus, CourseEventVisibility } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { moderateTextFields, moderationFailure } from "@/lib/moderation";

type Params = {
  params: {
    threadId: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const threadId = Number(params.threadId);

  if (!Number.isInteger(threadId)) {
    return NextResponse.json({ error: "Invalid chain id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to comment" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const commentBody = String(body.body ?? "").trim();
  const parentCommentId =
    body.parentCommentId === null || body.parentCommentId === undefined
      ? null
      : Number(body.parentCommentId);

  if (commentBody.length < 2) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }

  if (
    parentCommentId !== null &&
    (!Number.isInteger(parentCommentId) || parentCommentId <= 0)
  ) {
    return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
  }

  const thread = await prisma.forumThread.findFirst({
    where: {
      id: threadId,
      status: ContentStatus.visible,
      OR: [
        { eventId: null },
        { event: { visibility: CourseEventVisibility.public } },
        { event: { visibility: CourseEventVisibility.unlisted } },
        { event: { hostId: currentUser.id } }
      ]
    },
    select: { id: true }
  });

  if (!thread) {
    return NextResponse.json({ error: "Chain not found" }, { status: 404 });
  }

  if (parentCommentId !== null) {
    const parentComment = await prisma.forumComment.findFirst({
      where: {
        id: parentCommentId,
        threadId,
        status: ContentStatus.visible
      },
      select: { id: true }
    });

    if (!parentComment) {
      return NextResponse.json(
        { error: "Parent comment not found" },
        { status: 404 }
      );
    }
  }

  try {
    await moderateTextFields([commentBody]);
  } catch (error) {
    const failure = moderationFailure(error);

    if (failure) {
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    throw error;
  }

  const comment = await prisma.forumComment.create({
    data: {
      threadId,
      parentCommentId,
      userId: currentUser.id,
      body: commentBody
    },
    select: { id: true }
  });

  return NextResponse.json({ comment }, { status: 201 });
}

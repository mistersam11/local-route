import { ContentStatus } from "@prisma/client";
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
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to comment" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const commentBody = String(body.body ?? "").trim();

  if (commentBody.length < 2) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }

  const thread = await prisma.forumThread.findFirst({
    where: { id: threadId, status: ContentStatus.visible },
    select: { id: true }
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
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
      userId: currentUser.id,
      body: commentBody
    },
    select: { id: true }
  });

  return NextResponse.json({ comment }, { status: 201 });
}

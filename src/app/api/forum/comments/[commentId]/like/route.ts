import { ContentStatus, CourseEventVisibility } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    commentId: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const commentId = Number(params.commentId);

  if (!Number.isInteger(commentId) || commentId <= 0) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to like" }, { status: 401 });
  }

  const comment = await prisma.forumComment.findFirst({
    where: {
      id: commentId,
      status: ContentStatus.visible,
      thread: {
        status: ContentStatus.visible,
        OR: [
          { eventId: null },
          { event: { visibility: CourseEventVisibility.public } },
          { event: { visibility: CourseEventVisibility.unlisted } },
          { event: { hostId: currentUser.id } }
        ]
      }
    },
    select: { id: true }
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.forumCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId: currentUser.id } }
    });
    let likedByCurrentUser = false;

    if (existing) {
      await tx.forumCommentLike.delete({ where: { id: existing.id } });
    } else {
      await tx.forumCommentLike.create({
        data: { commentId, userId: currentUser.id }
      });
      likedByCurrentUser = true;
    }

    const likeCount = await tx.forumCommentLike.count({ where: { commentId } });
    await tx.forumComment.update({
      where: { id: commentId },
      data: { likeCount }
    });

    return { likedByCurrentUser, likeCount };
  });

  return NextResponse.json(result);
}

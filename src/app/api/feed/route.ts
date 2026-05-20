import { ContentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  getFollowingCourseIds,
  getFollowingIds,
  getRequestUser
} from "@/lib/current-user";
import { courseThreadFeedWhere } from "@/lib/course-communities";
import { prisma } from "@/lib/db";
import { serializeCourseReview, serializeHoleReview, serializeLine } from "@/lib/social-data";

export async function GET(request: Request) {
  const currentUser = await getRequestUser(request);
  const { searchParams } = new URL(request.url);
  const rawCourseId = searchParams.get("courseId");
  const courseId = rawCourseId ? Number(rawCourseId) : null;
  const followedOnly = searchParams.get("following") === "true";

  const followingIds = await getFollowingIds(currentUser?.id);
  const followedCourseIds = await getFollowingCourseIds(currentUser?.id);

  const [lines, reviews, holeReviews, coursePosts] = await Promise.all([
    prisma.line.findMany({
      where: {
        status: ContentStatus.visible,
        ...(courseId && Number.isInteger(courseId)
          ? { hole: { courseId } }
          : {}),
        ...(followedOnly ? { userId: { in: [...followingIds] } } : {})
      },
      include: {
        user: {
          select: { id: true, username: true, profileImageUrl: true }
        },
        hole: {
          select: {
            holeNumber: true,
            course: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 15
    }),
    prisma.courseReview.findMany({
      where: {
        status: ContentStatus.visible,
        ...(courseId && Number.isInteger(courseId) ? { courseId } : {}),
        ...(followedOnly ? { userId: { in: [...followingIds] } } : {})
      },
      include: {
        user: {
          select: { id: true, username: true, profileImageUrl: true }
        },
        course: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 15
    }),
    prisma.holeReview.findMany({
      where: {
        status: ContentStatus.visible,
        ...(courseId && Number.isInteger(courseId)
          ? { hole: { courseId } }
          : {}),
        ...(followedOnly ? { userId: { in: [...followingIds] } } : {})
      },
      include: {
        user: {
          select: { id: true, username: true, profileImageUrl: true }
        },
        hole: {
          select: {
            holeNumber: true,
            course: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 15
    }),
    prisma.forumThread.findMany({
      where: courseThreadFeedWhere({
        courseId,
        followedOnly,
        followedCourseIds
      }),
      include: {
        user: {
          select: { id: true, username: true, profileImageUrl: true }
        },
        course: { select: { id: true, name: true } },
        _count: {
          select: { comments: { where: { status: ContentStatus.visible } } }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 15
    })
  ]);

  const feed = [
    ...lines.map((line) => ({
      type: "line" as const,
      createdAt: line.createdAt.toISOString(),
      line: serializeLine(line, followingIds),
      holeNumber: line.hole.holeNumber,
      course: line.hole.course
    })),
    ...reviews.map((review) => ({
      type: "review" as const,
      createdAt: review.createdAt.toISOString(),
      review: serializeCourseReview(review),
      course: review.course
    })),
    ...holeReviews.map((review) => ({
      type: "hole-review" as const,
      createdAt: review.createdAt.toISOString(),
      review: serializeHoleReview(review),
      holeNumber: review.hole.holeNumber,
      course: review.hole.course
    })),
    ...coursePosts.flatMap((thread) =>
      thread.course
        ? [
            {
              type: "course-post" as const,
              createdAt: thread.createdAt.toISOString(),
              thread: {
                id: thread.id,
                title: thread.title,
                body: thread.body,
                flair: thread.flair,
                commentCount: thread._count.comments,
                author: {
                  id: thread.user.id,
                  username: thread.user.username,
                  profileImageUrl: thread.user.profileImageUrl
                }
              },
              course: thread.course
            }
          ]
        : []
    )
  ]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 30);

  return NextResponse.json({ feed });
}

import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { serializeCourseReview, serializeHoleReview, serializeLine } from "@/lib/social-data";

export async function GET(request: Request) {
  const currentUserId = await getRequestUserId(request);
  const { searchParams } = new URL(request.url);
  const rawCourseId = searchParams.get("courseId");
  const courseId = rawCourseId ? Number(rawCourseId) : null;
  const followedOnly = searchParams.get("following") === "true";

  const following = await prisma.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true }
  });
  const followingIds = new Set(following.map((follow) => follow.followingId));

  const [lines, reviews, holeReviews] = await Promise.all([
    prisma.line.findMany({
      where: {
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
    }))
  ]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 30);

  return NextResponse.json({ feed });
}

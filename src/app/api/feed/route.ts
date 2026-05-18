import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { serializeRoute } from "@/lib/route-data";

export async function GET(request: Request) {
  const currentUserId = getRequestUserId(request);
  const { searchParams } = new URL(request.url);
  const rawCourseId = searchParams.get("courseId");
  const courseId = rawCourseId ? Number(rawCourseId) : null;
  const followedOnly = searchParams.get("following") === "true";

  const following = await prisma.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true }
  });
  const followingIds = new Set(following.map((follow) => follow.followingId));

  const routes = await prisma.route.findMany({
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
    take: 30
  });

  const feed = routes.map((route) => ({
    route: serializeRoute(route, followingIds),
    holeNumber: route.hole.holeNumber,
    course: route.hole.course
  }));

  return NextResponse.json({ feed });
}

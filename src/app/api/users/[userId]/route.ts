import { NextResponse } from "next/server";
import { getFollowingIds, getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { serializeRoute } from "@/lib/route-data";

type Params = {
  params: {
    userId: string;
  };
};

export async function GET(request: Request, { params }: Params) {
  const userId = Number(params.userId);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const currentUserId = getRequestUserId(request);
  const followingIds = await getFollowingIds(currentUserId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      profileImageUrl: true,
      createdAt: true,
      routes: {
        include: {
          user: { select: { id: true, username: true, profileImageUrl: true } },
          hole: {
            select: {
              holeNumber: true,
              course: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      following: {
        include: {
          following: {
            select: { id: true, username: true, profileImageUrl: true }
          }
        }
      },
      followers: { select: { followerId: true } }
    }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
      isFollowing: followingIds.has(user.id),
      followerCount: user.followers.length,
      following: user.following.map((follow) => follow.following),
      routes: user.routes.map((route) => ({
        route: serializeRoute(route, followingIds),
        holeNumber: route.hole.holeNumber,
        course: route.hole.course
      }))
    }
  });
}

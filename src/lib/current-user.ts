import { prisma } from "@/lib/db";
import type { UserSummary } from "@/lib/types";

export const DEMO_USER_ID = 1;

export function getRequestUserId(request: Request) {
  const url = new URL(request.url);
  const rawUserId =
    request.headers.get("x-demo-user-id") ?? url.searchParams.get("userId");
  const userId = Number(rawUserId);

  return Number.isInteger(userId) && userId > 0 ? userId : DEMO_USER_ID;
}

export async function getCurrentUser(userId = DEMO_USER_ID): Promise<UserSummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, profileImageUrl: true }
  });

  if (user) {
    return user;
  }

  return prisma.user.findFirst({
    orderBy: { id: "asc" },
    select: { id: true, username: true, profileImageUrl: true }
  });
}

export async function getFollowingIds(userId: number) {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true }
  });

  return new Set(follows.map((follow) => follow.followingId));
}

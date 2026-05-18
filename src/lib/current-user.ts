import { prisma } from "@/lib/db";
import type { UserSummary } from "@/lib/types";

export const DEMO_USER_ID = 1;
export const DEMO_USERNAME = process.env.DEMO_USERNAME ?? "sam";

export async function getRequestUserId(request: Request) {
  const url = new URL(request.url);
  const rawUserId =
    request.headers.get("x-demo-user-id") ?? url.searchParams.get("userId");
  const userId = Number(rawUserId);

  return Number.isInteger(userId) && userId > 0 ? userId : getDemoUserId();
}

export async function getDemoUser(): Promise<UserSummary | null> {
  const byUsername = await prisma.user.findUnique({
    where: { username: DEMO_USERNAME },
    select: { id: true, username: true, profileImageUrl: true }
  });

  if (byUsername) {
    return byUsername;
  }

  const admin = await prisma.user.findFirst({
    where: { isAdmin: true },
    orderBy: { id: "asc" },
    select: { id: true, username: true, profileImageUrl: true }
  });

  if (admin) {
    return admin;
  }

  return prisma.user.findFirst({
    orderBy: { id: "asc" },
    select: { id: true, username: true, profileImageUrl: true }
  });
}

export async function getDemoUserId() {
  const user = await getDemoUser();
  return user?.id ?? DEMO_USER_ID;
}

export async function getCurrentUser(userId?: number): Promise<UserSummary | null> {
  if (!userId) {
    return getDemoUser();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, profileImageUrl: true }
  });

  if (user) {
    return user;
  }

  return getDemoUser();
}

export async function getFollowingIds(userId: number) {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true }
  });

  return new Set(follows.map((follow) => follow.followingId));
}

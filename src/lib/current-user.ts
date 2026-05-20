import { getCurrentSessionUser, getRequestSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { UserSummary } from "@/lib/types";

export type CurrentUser = UserSummary & {
  email: string;
  isAdmin: boolean;
};

export async function getRequestUser(request: Request): Promise<CurrentUser | null> {
  return getRequestSessionUser(request);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return getCurrentSessionUser();
}

export async function getFollowingIds(userId?: number | null) {
  if (!userId) {
    return new Set<number>();
  }

  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true }
  });

  return new Set(follows.map((follow) => follow.followingId));
}

export async function getFollowingCourseIds(userId?: number | null) {
  if (!userId) {
    return new Set<number>();
  }

  const follows = await prisma.courseFollow.findMany({
    where: { userId },
    select: { courseId: true }
  });

  return new Set(follows.map((follow) => follow.courseId));
}

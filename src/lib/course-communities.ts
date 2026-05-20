import {
  ContentStatus,
  CourseEventVisibility,
  NotificationTargetType,
  NotificationType
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
export {
  applyCourseFollowTransition,
  courseForumFlairs,
  normalizeCourseForumFlair
} from "@/lib/course-community-shared";

export type CourseNotificationFollower = {
  userId: number;
  notifyNewPosts: boolean;
  notifyNewEvents: boolean;
};

export function buildCourseFollowerNotifications({
  followers,
  actorId,
  courseId,
  type,
  targetType,
  targetRecordId,
  createdAt
}: {
  followers: CourseNotificationFollower[];
  actorId: number | null;
  courseId: number;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetRecordId: number;
  createdAt?: Date;
}): Prisma.NotificationCreateManyInput[] {
  const seenUserIds = new Set<number>();

  return followers.flatMap((follower) => {
    if (follower.userId === actorId || seenUserIds.has(follower.userId)) {
      return [];
    }

    const enabled =
      type === NotificationType.coursePost
        ? follower.notifyNewPosts
        : follower.notifyNewEvents;

    if (!enabled) {
      return [];
    }

    seenUserIds.add(follower.userId);

    return [
      {
        userId: follower.userId,
        actorId,
        courseId,
        type,
        targetType,
        targetRecordId,
        ...(createdAt ? { createdAt } : {})
      }
    ];
  });
}

export function courseThreadFeedWhere({
  courseId,
  followedOnly,
  followedCourseIds
}: {
  courseId?: number | null;
  followedOnly: boolean;
  followedCourseIds: Set<number>;
}): Prisma.ForumThreadWhereInput {
  return {
    status: ContentStatus.visible,
    OR: [
      { eventId: null },
      { event: { visibility: CourseEventVisibility.public } }
    ],
    ...(courseId && Number.isInteger(courseId)
      ? { courseId }
      : followedOnly
        ? { courseId: { in: [...followedCourseIds] } }
        : { courseId: { not: null } })
  };
}

export function isCoursePostVisibleInFollowedFeed(
  thread: { courseId: number | null; status: ContentStatus },
  followedCourseIds: Set<number>
) {
  return (
    thread.status === ContentStatus.visible &&
    thread.courseId !== null &&
    followedCourseIds.has(thread.courseId)
  );
}

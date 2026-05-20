import assert from "node:assert/strict";
import {
  ContentStatus,
  CourseEventVisibility,
  NotificationTargetType,
  NotificationType
} from "@prisma/client";
import {
  applyCourseFollowTransition,
  buildCourseFollowerNotifications,
  courseThreadFeedWhere,
  isCoursePostVisibleInFollowedFeed,
  normalizeCourseForumFlair
} from "./course-communities";

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

test("course follow transitions update follower counts once", () => {
  assert.equal(applyCourseFollowTransition(2, false, true), 3);
  assert.equal(applyCourseFollowTransition(2, true, false), 1);
  assert.equal(applyCourseFollowTransition(2, true, true), 2);
  assert.equal(applyCourseFollowTransition(0, true, false), 0);
});

test("course forum flairs normalize known labels and trim custom labels", () => {
  assert.equal(normalizeCourseForumFlair("conditions"), "Conditions");
  assert.equal(normalizeCourseForumFlair("  League  "), "League");
  assert.equal(normalizeCourseForumFlair(""), null);
  assert.equal(
    normalizeCourseForumFlair("A very long custom flair label that should be trimmed"),
    "A very long custom flair label t"
  );
});

test("course notifications exclude actors, disabled preferences, and duplicates", () => {
  const createdAt = new Date("2026-05-20T12:00:00.000Z");
  const notifications = buildCourseFollowerNotifications({
    followers: [
      { userId: 1, notifyNewPosts: true, notifyNewEvents: true },
      { userId: 2, notifyNewPosts: true, notifyNewEvents: true },
      { userId: 2, notifyNewPosts: true, notifyNewEvents: true },
      { userId: 3, notifyNewPosts: false, notifyNewEvents: true }
    ],
    actorId: 1,
    courseId: 9,
    type: NotificationType.coursePost,
    targetType: NotificationTargetType.forumThread,
    targetRecordId: 44,
    createdAt
  });

  assert.deepEqual(notifications, [
    {
      userId: 2,
      actorId: 1,
      courseId: 9,
      type: NotificationType.coursePost,
      targetType: NotificationTargetType.forumThread,
      targetRecordId: 44,
      createdAt
    }
  ]);
});

test("course event notifications honor event notification preferences", () => {
  const notifications = buildCourseFollowerNotifications({
    followers: [
      { userId: 2, notifyNewPosts: false, notifyNewEvents: true },
      { userId: 3, notifyNewPosts: true, notifyNewEvents: false }
    ],
    actorId: null,
    courseId: 10,
    type: NotificationType.courseEvent,
    targetType: NotificationTargetType.courseEvent,
    targetRecordId: 77
  });

  assert.deepEqual(
    notifications.map((notification) => notification.userId),
    [2]
  );
});

test("followed course posts are visible in personalized course feeds", () => {
  const followedCourseIds = new Set([7, 9]);

  assert.equal(
    isCoursePostVisibleInFollowedFeed(
      { courseId: 7, status: ContentStatus.visible },
      followedCourseIds
    ),
    true
  );
  assert.equal(
    isCoursePostVisibleInFollowedFeed(
      { courseId: 8, status: ContentStatus.visible },
      followedCourseIds
    ),
    false
  );
  assert.equal(
    isCoursePostVisibleInFollowedFeed(
      { courseId: 7, status: ContentStatus.hidden },
      followedCourseIds
    ),
    false
  );
  assert.equal(
    isCoursePostVisibleInFollowedFeed(
      { courseId: null, status: ContentStatus.visible },
      followedCourseIds
    ),
    false
  );
});

test("feed query scopes course posts to followed courses when requested", () => {
  assert.deepEqual(
    courseThreadFeedWhere({
      followedOnly: true,
      followedCourseIds: new Set([7, 9])
    }),
    {
      status: ContentStatus.visible,
      OR: [
        { eventId: null },
        { event: { visibility: CourseEventVisibility.public } }
      ],
      courseId: { in: [7, 9] }
    }
  );

  assert.deepEqual(
    courseThreadFeedWhere({
      courseId: 7,
      followedOnly: true,
      followedCourseIds: new Set([9])
    }),
    {
      status: ContentStatus.visible,
      OR: [
        { eventId: null },
        { event: { visibility: CourseEventVisibility.public } }
      ],
      courseId: 7
    }
  );
});

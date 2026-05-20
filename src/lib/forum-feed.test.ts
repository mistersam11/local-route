import assert from "node:assert/strict";
import {
  ContentStatus,
  CourseDifficulty,
  CourseStatus
} from "@prisma/client";
import {
  composeForumFeedPage,
  isForumFeedThreadVisible,
  rankSuggestedForumThreads,
  type ForumFeedSignals,
  type RankableForumThread
} from "./forum-feed";

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

const now = new Date("2026-05-20T16:00:00.000Z");
const defaultSignals: ForumFeedSignals = {
  followedCourseIds: new Set([10]),
  followedCourses: [
    {
      id: 10,
      difficulty: CourseDifficulty.mixed,
      latitude: 40,
      longitude: -75,
      locationName: "Lancaster, PA"
    }
  ],
  followedUserIds: new Set([99]),
  interactedCourseIds: new Set([12]),
  interactedThreadIds: new Set()
};

function daysAgo(days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function thread(overrides: Partial<RankableForumThread>): RankableForumThread {
  return {
    id: 1,
    userId: 1,
    courseId: 11,
    status: ContentStatus.visible,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    course: {
      status: CourseStatus.approved,
      difficulty: CourseDifficulty.mixed,
      latitude: 40.1,
      longitude: -75.1,
      locationName: "Lancaster, PA"
    },
    comments: [],
    _count: { comments: 0 },
    ...overrides
  };
}

test("suggested feed ranking favors recency, engagement, and course similarity", () => {
  const ranked = rankSuggestedForumThreads({
    now,
    signals: defaultSignals,
    threads: [
      thread({
        id: 1,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
        _count: { comments: 4 }
      }),
      thread({
        id: 2,
        courseId: 40,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
        course: {
          status: CourseStatus.approved,
          difficulty: CourseDifficulty.expert,
          latitude: 34,
          longitude: -118,
          locationName: "Los Angeles, CA"
        },
        _count: { comments: 4 }
      }),
      thread({
        id: 3,
        courseId: 41,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
        course: {
          status: CourseStatus.approved,
          difficulty: CourseDifficulty.expert,
          latitude: 34,
          longitude: -118,
          locationName: "Los Angeles, CA"
        },
        _count: { comments: 12 },
        comments: [{ createdAt: daysAgo(0.1) }]
      })
    ]
  });

  assert.equal(ranked[0].id, 1);
  assert.equal(ranked[1].id, 3);
  assert.equal(ranked[2].id, 2);
});

test("suggested fallback appends after followed posts", () => {
  const page = composeForumFeedPage({
    pageSize: 3,
    followed: [thread({ id: 1 })],
    suggested: [
      { ...thread({ id: 2 }), score: 0.8 },
      { ...thread({ id: 3 }), score: 0.7 }
    ]
  });

  assert.deepEqual(
    page.map((item) => item.source),
    ["followed", "suggested", "suggested"]
  );
  assert.deepEqual(
    page.map((item) => item.thread.id),
    [1, 2, 3]
  );
});

test("feed composition deduplicates followed and suggested posts", () => {
  const page = composeForumFeedPage({
    pageSize: 4,
    followed: [thread({ id: 1 })],
    suggested: [
      { ...thread({ id: 1 }), score: 0.9 },
      { ...thread({ id: 2 }), score: 0.8 }
    ]
  });

  assert.deepEqual(
    page.map((item) => item.thread.id),
    [1, 2]
  );
});

test("moderation and course visibility filtering remove hidden candidates", () => {
  assert.equal(isForumFeedThreadVisible(thread({ id: 1 })), true);
  assert.equal(
    isForumFeedThreadVisible(thread({ id: 2, status: ContentStatus.hidden })),
    false
  );
  assert.equal(
    isForumFeedThreadVisible(
      thread({
        id: 3,
        course: {
          status: CourseStatus.pending,
          difficulty: CourseDifficulty.mixed,
          latitude: null,
          longitude: null,
          locationName: "Pending Park"
        }
      })
    ),
    false
  );

  const ranked = rankSuggestedForumThreads({
    now,
    signals: defaultSignals,
    threads: [
      thread({ id: 1 }),
      thread({ id: 2, status: ContentStatus.hidden })
    ]
  });

  assert.deepEqual(
    ranked.map((entry) => entry.id),
    [1]
  );
});

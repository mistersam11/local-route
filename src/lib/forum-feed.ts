import {
  ContentStatus,
  CourseDifficulty,
  CourseEventVisibility,
  CourseStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/db";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const SUGGESTED_CANDIDATE_FLOOR = 80;

const forumFeedThreadInclude = Prisma.validator<Prisma.ForumThreadDefaultArgs>()({
  include: {
    user: { select: { id: true, username: true, profileImageUrl: true } },
    course: {
      select: {
        id: true,
        name: true,
        status: true,
        difficulty: true,
        latitude: true,
        longitude: true,
        locationName: true
      }
    },
    _count: {
      select: { comments: { where: { status: ContentStatus.visible } } }
    },
    comments: {
      where: { status: ContentStatus.visible },
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { username: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 1
    },
    photos: {
      orderBy: { sortOrder: "asc" },
      take: 4
    },
    event: {
      select: {
        id: true,
        title: true,
        type: true,
        startTime: true,
        timezone: true,
        visibility: true
      }
    }
  }
});

export type ForumFeedThread = Prisma.ForumThreadGetPayload<
  typeof forumFeedThreadInclude
>;

export type ForumFeedSource = "followed" | "suggested";

export type ForumFeedItem = {
  source: ForumFeedSource;
  thread: ForumFeedThread;
  score?: number;
};

export type ForumFeedSignals = {
  followedCourseIds: Set<number>;
  followedCourses: Array<{
    id: number;
    difficulty: CourseDifficulty;
    latitude: number | null;
    longitude: number | null;
    locationName: string;
  }>;
  followedUserIds: Set<number>;
  interactedCourseIds: Set<number>;
  interactedThreadIds: Set<number>;
};

export type ForumFeedResult = {
  items: ForumFeedItem[];
  page: number;
  pageSize: number;
  nextPage: number | null;
  followedCount: number;
  suggestedCount: number;
  hasPersonalizationSignals: boolean;
};

type WeightedSignal = {
  value: number | null;
  weight: number;
};

export type RankableForumThread = {
  id: number;
  userId: number;
  courseId: number | null;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
  course: {
    status: CourseStatus;
    difficulty: ForumFeedSignals["followedCourses"][number]["difficulty"];
    latitude: number | null;
    longitude: number | null;
    locationName: string;
  } | null;
  event?: {
    visibility: CourseEventVisibility;
  } | null;
  comments: Array<{ createdAt: Date }>;
  _count: { comments: number };
};

export function normalizeForumFeedPage(value: unknown) {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function normalizeForumFeedPageSize(value: unknown) {
  const pageSize = Number(value);

  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(pageSize, MAX_PAGE_SIZE);
}

export function isForumFeedThreadVisible(
  thread: Pick<RankableForumThread, "status" | "course" | "event">
) {
  return (
    thread.status === ContentStatus.visible &&
    (!thread.course || thread.course.status === CourseStatus.approved) &&
    (!thread.event || thread.event.visibility === CourseEventVisibility.public)
  );
}

export function dedupeForumFeedItems<T extends { thread: { id: number } }>(
  items: T[]
) {
  const seenThreadIds = new Set<number>();

  return items.filter((item) => {
    if (seenThreadIds.has(item.thread.id)) {
      return false;
    }

    seenThreadIds.add(item.thread.id);
    return true;
  });
}

export function composeForumFeedPage<T extends { id: number }>({
  followed,
  suggested,
  pageSize
}: {
  followed: T[];
  suggested: Array<T & { score?: number }>;
  pageSize: number;
}) {
  return dedupeForumFeedItems([
    ...followed.map((thread) => ({ source: "followed" as const, thread })),
    ...suggested.map((thread) => ({
      source: "suggested" as const,
      thread,
      score: thread.score
    }))
  ]).slice(0, pageSize);
}

function clampScore(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function weightedAverage(signals: WeightedSignal[]) {
  const available = signals.filter((signal) => signal.value !== null);
  const totalWeight = available.reduce((total, signal) => total + signal.weight, 0);

  if (!totalWeight) {
    return 0;
  }

  return available.reduce(
    (total, signal) => total + clampScore(signal.value ?? 0) * signal.weight,
    0
  ) / totalWeight;
}

function recencyScore(date: Date, now: Date) {
  const ageHours = Math.max(0, now.getTime() - date.getTime()) / 36e5;

  return 1 / (1 + ageHours / 72);
}

function engagementScore({
  commentCount,
  maxCommentCount,
  latestActivityAt,
  now
}: {
  commentCount: number;
  maxCommentCount: number;
  latestActivityAt: Date;
  now: Date;
}) {
  const popularity =
    maxCommentCount > 0
      ? Math.log1p(commentCount) / Math.log1p(maxCommentCount)
      : 0;
  const recentActivity = recencyScore(latestActivityAt, now);

  return popularity * 0.7 + recentActivity * 0.3;
}

function distanceMiles(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) {
  const radiusMiles = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(second.latitude - first.latitude);
  const deltaLon = toRadians(second.longitude - first.longitude);
  const firstLat = toRadians(first.latitude);
  const secondLat = toRadians(second.latitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(deltaLon / 2) ** 2;

  return radiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function courseSimilarityScore(
  thread: RankableForumThread,
  signals: ForumFeedSignals
) {
  if (!thread.course || signals.followedCourses.length === 0) {
    return null;
  }

  const exactFollow = signals.followedCourseIds.has(thread.courseId ?? -1) ? 1 : 0;
  const sameDifficulty = signals.followedCourses.some(
    (course) => course.difficulty === thread.course?.difficulty
  )
    ? 0.35
    : 0;
  const sameLocation = signals.followedCourses.some((course) => {
    const followedRegion = course.locationName.split(",").at(-1)?.trim();
    const candidateRegion = thread.course?.locationName.split(",").at(-1)?.trim();

    return followedRegion && candidateRegion && followedRegion === candidateRegion;
  })
    ? 0.2
    : 0;
  const nearby =
    thread.course.latitude !== null && thread.course.longitude !== null
      ? Math.max(
          0,
          ...signals.followedCourses
            .filter(
              (course) => course.latitude !== null && course.longitude !== null
            )
            .map((course) => {
              const miles = distanceMiles(
                {
                  latitude: course.latitude ?? 0,
                  longitude: course.longitude ?? 0
                },
                {
                  latitude: thread.course?.latitude ?? 0,
                  longitude: thread.course?.longitude ?? 0
                }
              );

              return miles <= 100 ? 0.45 * (1 - miles / 100) : 0;
            })
        )
      : 0;

  return clampScore(exactFollow + sameDifficulty + sameLocation + nearby);
}

function userActivityScore(thread: RankableForumThread, signals: ForumFeedSignals) {
  const hasSignals =
    signals.followedUserIds.size > 0 ||
    signals.interactedCourseIds.size > 0 ||
    signals.interactedThreadIds.size > 0;

  if (!hasSignals) {
    return null;
  }

  if (signals.interactedThreadIds.has(thread.id)) {
    return 1;
  }

  if (signals.followedUserIds.has(thread.userId)) {
    return 0.9;
  }

  if (thread.courseId && signals.interactedCourseIds.has(thread.courseId)) {
    return 0.75;
  }

  return 0;
}

export function scoreSuggestedForumThread({
  thread,
  signals,
  now,
  maxCommentCount
}: {
  thread: RankableForumThread;
  signals: ForumFeedSignals;
  now: Date;
  maxCommentCount: number;
}) {
  const latestActivityAt = thread.comments[0]?.createdAt ?? thread.updatedAt;

  return weightedAverage([
    { value: recencyScore(thread.createdAt, now), weight: 0.35 },
    {
      value: engagementScore({
        commentCount: thread._count.comments,
        maxCommentCount,
        latestActivityAt,
        now
      }),
      weight: 0.3
    },
    {
      value: courseSimilarityScore(thread, signals),
      weight: 0.2
    },
    {
      value: userActivityScore(thread, signals),
      weight: 0.15
    }
  ]);
}

export function rankSuggestedForumThreads<T extends RankableForumThread>({
  threads,
  signals,
  now = new Date()
}: {
  threads: T[];
  signals: ForumFeedSignals;
  now?: Date;
}) {
  const visibleThreads = threads.filter(isForumFeedThreadVisible);
  const maxCommentCount = Math.max(
    0,
    ...visibleThreads.map((thread) => thread._count.comments)
  );

  return visibleThreads
    .map((thread) => ({
      ...thread,
      score: scoreSuggestedForumThread({
        thread,
        signals,
        now,
        maxCommentCount
      })
    }))
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.createdAt.getTime() - first.createdAt.getTime() ||
        second.id - first.id
    );
}

function forumThreadVisibilityWhere(): Prisma.ForumThreadWhereInput {
  return {
    status: ContentStatus.visible,
    AND: [
      { OR: [{ courseId: null }, { course: { status: CourseStatus.approved } }] },
      {
        OR: [
          { eventId: null },
          { event: { visibility: CourseEventVisibility.public } }
        ]
      }
    ]
  };
}

function forumThreadQueryWhere(query: string): Prisma.ForumThreadWhereInput | null {
  if (!query) {
    return null;
  }

  return {
    OR: [
      { title: { contains: query } },
      { body: { contains: query } },
      { flair: { contains: query } },
      { user: { username: { contains: query } } },
      { course: { name: { contains: query } } },
      { event: { title: { contains: query } } }
    ]
  };
}

function primaryPersonalizationWhere(
  signals: ForumFeedSignals
): Prisma.ForumThreadWhereInput | null {
  const filters: Prisma.ForumThreadWhereInput[] = [];

  if (signals.followedCourseIds.size) {
    filters.push({ courseId: { in: [...signals.followedCourseIds] } });
  }

  if (signals.followedUserIds.size) {
    filters.push({ userId: { in: [...signals.followedUserIds] } });
  }

  if (signals.interactedThreadIds.size) {
    filters.push({ id: { in: [...signals.interactedThreadIds] } });
  }

  if (signals.interactedCourseIds.size) {
    filters.push({ courseId: { in: [...signals.interactedCourseIds] } });
  }

  return filters.length ? { OR: filters } : null;
}

function forumFeedBaseWhere(query: string): Prisma.ForumThreadWhereInput {
  const queryWhere = forumThreadQueryWhere(query);

  return {
    AND: [
      forumThreadVisibilityWhere(),
      ...(queryWhere ? [queryWhere] : [])
    ]
  };
}

function combineForumFeedWhere(
  baseWhere: Prisma.ForumThreadWhereInput,
  scopeWhere: Prisma.ForumThreadWhereInput
): Prisma.ForumThreadWhereInput {
  return {
    AND: [baseWhere, scopeWhere]
  };
}

function suggestedForumFeedWhere(
  baseWhere: Prisma.ForumThreadWhereInput,
  primaryWhere: Prisma.ForumThreadWhereInput | null
): Prisma.ForumThreadWhereInput {
  if (!primaryWhere) {
    return baseWhere;
  }

  return {
    AND: [baseWhere, { NOT: primaryWhere }]
  };
}

async function getForumFeedSignals(userId?: number | null): Promise<ForumFeedSignals> {
  if (!userId) {
    return {
      followedCourseIds: new Set(),
      followedCourses: [],
      followedUserIds: new Set(),
      interactedCourseIds: new Set(),
      interactedThreadIds: new Set()
    };
  }

  const [
    courseFollows,
    userFollows,
    recentComments,
    courseMarks,
    lineVotes
  ] = await Promise.all([
    prisma.courseFollow.findMany({
      where: { userId },
      select: {
        courseId: true,
        course: {
          select: {
            id: true,
            difficulty: true,
            latitude: true,
            longitude: true,
            locationName: true
          }
        }
      },
      take: 200
    }),
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
      take: 200
    }),
    prisma.forumComment.findMany({
      where: { userId, status: ContentStatus.visible },
      select: {
        threadId: true,
        thread: { select: { courseId: true } }
      },
      orderBy: { createdAt: "desc" },
      distinct: ["threadId"],
      take: 100
    }),
    prisma.courseMark.findMany({
      where: { userId },
      select: { courseId: true },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.lineVote.findMany({
      where: { userId },
      select: {
        line: { select: { hole: { select: { courseId: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  const interactedCourseIds = new Set<number>();

  for (const comment of recentComments) {
    if (comment.thread.courseId) {
      interactedCourseIds.add(comment.thread.courseId);
    }
  }

  for (const mark of courseMarks) {
    interactedCourseIds.add(mark.courseId);
  }

  for (const vote of lineVotes) {
    interactedCourseIds.add(vote.line.hole.courseId);
  }

  return {
    followedCourseIds: new Set(courseFollows.map((follow) => follow.courseId)),
    followedCourses: courseFollows.map((follow) => follow.course),
    followedUserIds: new Set(userFollows.map((follow) => follow.followingId)),
    interactedCourseIds,
    interactedThreadIds: new Set(recentComments.map((comment) => comment.threadId))
  };
}

export async function getPersonalizedForumFeed({
  userId,
  query = "",
  page: rawPage = 1,
  pageSize: rawPageSize = DEFAULT_PAGE_SIZE,
  now = new Date()
}: {
  userId?: number | null;
  query?: string;
  page?: number;
  pageSize?: number;
  now?: Date;
}): Promise<ForumFeedResult> {
  const page = normalizeForumFeedPage(rawPage);
  const pageSize = normalizeForumFeedPageSize(rawPageSize);
  const offset = (page - 1) * pageSize;
  const signals = await getForumFeedSignals(userId);
  const baseWhere = forumFeedBaseWhere(query.trim());
  const primaryScopeWhere = primaryPersonalizationWhere(signals);
  const primaryWhere = primaryScopeWhere
    ? combineForumFeedWhere(baseWhere, primaryScopeWhere)
    : null;
  const primaryCount = primaryWhere
    ? await prisma.forumThread.count({ where: primaryWhere })
    : 0;
  const followedTake = Math.max(0, Math.min(pageSize, primaryCount - offset));
  const followedThreads =
    primaryWhere && followedTake > 0
      ? await prisma.forumThread.findMany({
          where: primaryWhere,
          include: forumFeedThreadInclude.include,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: offset,
          take: followedTake
        })
      : [];
  const suggestedTake = pageSize - followedThreads.length;
  const suggestedWhere = suggestedForumFeedWhere(baseWhere, primaryScopeWhere);
  const suggestedCount = await prisma.forumThread.count({ where: suggestedWhere });
  const suggestedSkip = Math.max(0, offset - primaryCount);
  const suggestedThreads =
    suggestedTake > 0
      ? rankSuggestedForumThreads({
          threads: await prisma.forumThread.findMany({
            where: suggestedWhere,
            include: forumFeedThreadInclude.include,
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            take: Math.min(
              suggestedCount,
              suggestedSkip + Math.max(SUGGESTED_CANDIDATE_FLOOR, pageSize * 4)
            )
          }),
          signals,
          now
        }).slice(suggestedSkip, suggestedSkip + suggestedTake)
      : [];
  const items = composeForumFeedPage({
    followed: followedThreads,
    suggested: suggestedThreads,
    pageSize
  });
  const totalAvailable = primaryCount + suggestedCount;
  const hasPersonalizationSignals =
    signals.followedCourseIds.size > 0 ||
    signals.followedUserIds.size > 0 ||
    signals.interactedCourseIds.size > 0 ||
    signals.interactedThreadIds.size > 0;

  return {
    items,
    page,
    pageSize,
    nextPage: page * pageSize < totalAvailable ? page + 1 : null,
    followedCount: primaryCount,
    suggestedCount,
    hasPersonalizationSignals
  };
}

export function serializeForumFeedItem(item: ForumFeedItem) {
  const latestComment = item.thread.comments[0] ?? null;

  return {
    source: item.source,
    score: item.score,
    thread: {
      id: item.thread.id,
      title: item.thread.title,
      body: item.thread.body,
      flair: item.thread.flair,
      createdAt: item.thread.createdAt.toISOString(),
      updatedAt: item.thread.updatedAt.toISOString(),
      commentCount: item.thread._count.comments,
      author: item.thread.user,
      course: item.thread.course
        ? {
            id: item.thread.course.id,
            name: item.thread.course.name,
            locationName: item.thread.course.locationName
          }
        : null,
      latestComment: latestComment
        ? {
            id: latestComment.id,
            body: latestComment.body,
            createdAt: latestComment.createdAt.toISOString(),
            author: latestComment.user
          }
        : null,
      photos: item.thread.photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        sortOrder: photo.sortOrder
      })),
      event: item.thread.event
        ? {
            id: item.thread.event.id,
            title: item.thread.event.title,
            type: item.thread.event.type,
            startTime: item.thread.event.startTime.toISOString(),
            timezone: item.thread.event.timezone
          }
        : null
    }
  };
}

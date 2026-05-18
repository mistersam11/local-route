import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, getFollowingIds } from "@/lib/current-user";
import type {
  BestLine,
  CourseReviewCard,
  HoleCommentCard,
  HoleSocialPayload
} from "@/lib/types";

const lineWithAuthor = Prisma.validator<Prisma.LineDefaultArgs>()({
  include: {
    user: {
      select: {
        id: true,
        username: true,
        profileImageUrl: true
      }
    }
  }
});

const courseReviewWithAuthor = Prisma.validator<Prisma.CourseReviewDefaultArgs>()({
  include: {
    user: {
      select: {
        id: true,
        username: true,
        profileImageUrl: true
      }
    }
  }
});

const holeCommentWithAuthor = Prisma.validator<Prisma.HoleCommentDefaultArgs>()({
  include: {
    user: {
      select: {
        id: true,
        username: true,
        profileImageUrl: true
      }
    }
  }
});

export type LineWithAuthor = Prisma.LineGetPayload<typeof lineWithAuthor>;
export type CourseReviewWithAuthor = Prisma.CourseReviewGetPayload<
  typeof courseReviewWithAuthor
>;
export type HoleCommentWithAuthor = Prisma.HoleCommentGetPayload<
  typeof holeCommentWithAuthor
>;

export function serializeLine(
  line: LineWithAuthor,
  followingIds = new Set<number>()
): BestLine {
  return {
    id: line.id,
    holeId: line.holeId,
    name: line.name,
    description: line.description,
    difficulty: line.difficulty,
    riskLevel: line.riskLevel,
    tag: line.tag,
    discSuggestion: line.discSuggestion,
    upvotes: line.upvotes,
    downvotes: line.downvotes,
    score: line.upvotes - line.downvotes,
    createdAt: line.createdAt.toISOString(),
    author: {
      id: line.user.id,
      username: line.user.username,
      profileImageUrl: line.user.profileImageUrl
    },
    isFollowedAuthor: followingIds.has(line.user.id)
  };
}

export function serializeCourseReview(
  review: CourseReviewWithAuthor
): CourseReviewCard {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    photoUrl: review.photoUrl,
    createdAt: review.createdAt.toISOString(),
    author: {
      id: review.user.id,
      username: review.user.username,
      profileImageUrl: review.user.profileImageUrl
    }
  };
}

export function serializeHoleComment(
  comment: HoleCommentWithAuthor
): HoleCommentCard {
  return {
    id: comment.id,
    body: comment.body,
    photoUrl: comment.photoUrl,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.user.id,
      username: comment.user.username,
      profileImageUrl: comment.user.profileImageUrl
    }
  };
}

export function sortLines(lines: BestLine[], sort: string | null) {
  return [...lines].sort((first, second) => {
    if (sort === "newest") {
      return (
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      );
    }

    if (sort === "popular") {
      return second.upvotes + second.downvotes - (first.upvotes + first.downvotes);
    }

    return second.score - first.score || second.upvotes - first.upvotes;
  });
}

export async function getHoleSocialPayload(
  holeId: number,
  currentUserId = 1
): Promise<HoleSocialPayload | null> {
  const [currentUser, followingIds, hole] = await Promise.all([
    getCurrentUser(currentUserId),
    getFollowingIds(currentUserId),
    prisma.hole.findUnique({
      where: { id: holeId },
      include: {
        course: true,
        comments: {
          include: holeCommentWithAuthor.include,
          orderBy: { createdAt: "desc" }
        },
        lines: {
          include: lineWithAuthor.include
        }
      }
    })
  ]);

  if (!hole) {
    return null;
  }

  const lines = hole.lines
    .map((line) => serializeLine(line, followingIds))
    .sort((first, second) => second.score - first.score || second.upvotes - first.upvotes);

  return {
    currentUser,
    course: {
      id: hole.course.id,
      name: hole.course.name,
      locationName: hole.course.locationName
    },
    hole: {
      id: hole.id,
      holeNumber: hole.holeNumber,
      par: hole.par,
      distanceFeet: hole.distanceFeet,
      description: hole.description,
      teePhotoUrl: hole.teePhotoUrl
    },
    comments: hole.comments.map(serializeHoleComment),
    lines
  };
}

export async function getSerializedLinesForHole(
  holeId: number,
  currentUserId: number,
  sort: string | null
) {
  const [followingIds, lines] = await Promise.all([
    getFollowingIds(currentUserId),
    prisma.line.findMany({
      where: { holeId },
      include: lineWithAuthor.include
    })
  ]);

  return sortLines(
    lines.map((line) => serializeLine(line, followingIds)),
    sort
  );
}

export const includeLineAuthor = lineWithAuthor.include;
export const includeCourseReviewAuthor = courseReviewWithAuthor.include;
export const includeHoleCommentAuthor = holeCommentWithAuthor.include;

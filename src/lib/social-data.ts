import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFollowingIds } from "@/lib/current-user";
import type {
  BestLine,
  CourseReviewCard,
  HoleReviewCard,
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

const holeReviewWithAuthor = Prisma.validator<Prisma.HoleReviewDefaultArgs>()({
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
export type HoleReviewWithAuthor = Prisma.HoleReviewGetPayload<
  typeof holeReviewWithAuthor
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

export function serializeHoleReview(
  review: HoleReviewWithAuthor
): HoleReviewCard {
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
  currentUserId?: number | null
): Promise<HoleSocialPayload | null> {
  const [currentUser, followingIds, hole] = await Promise.all([
    currentUserId
      ? prisma.user.findUnique({
          where: { id: currentUserId },
          select: { id: true, username: true, profileImageUrl: true }
        })
      : Promise.resolve(null),
    getFollowingIds(currentUserId),
    prisma.hole.findUnique({
      where: { id: holeId },
      include: {
        course: true,
        reviews: {
          include: holeReviewWithAuthor.include,
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
    reviews: hole.reviews.map(serializeHoleReview),
    lines
  };
}

export async function getSerializedLinesForHole(
  holeId: number,
  currentUserId: number | null | undefined,
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
export const includeHoleReviewAuthor = holeReviewWithAuthor.include;

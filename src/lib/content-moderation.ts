import {
  ContentStatus,
  ModerationActionType,
  ModerationTargetType
} from "@prisma/client";
import { prisma } from "@/lib/db";

export const moderationTargetLabels: Record<ModerationTargetType, string> = {
  courseReview: "Course review",
  holeReview: "Hole review",
  line: "Best line",
  forumThread: "Forum chain",
  forumComment: "Forum comment"
};

export const moderationActionLabels: Record<ModerationActionType, string> = {
  hide: "Hidden",
  restore: "Restored",
  delete: "Deleted",
  resolve: "Resolved"
};

export type ModerationTargetCard = {
  id: number;
  type: ModerationTargetType;
  typeLabel: string;
  status: ContentStatus;
  title: string;
  body: string | null;
  context: string;
  href: string;
  createdAt: Date;
  hiddenReason: string | null;
  author: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
};

export function parseModerationTargetType(value: unknown) {
  return Object.values(ModerationTargetType).includes(value as ModerationTargetType)
    ? (value as ModerationTargetType)
    : null;
}

export function parseModerationAction(value: unknown) {
  return Object.values(ModerationActionType).includes(value as ModerationActionType)
    ? (value as ModerationActionType)
    : null;
}

export function parseTargetRecordId(value: unknown) {
  const targetRecordId = Number(value);
  return Number.isInteger(targetRecordId) && targetRecordId > 0 ? targetRecordId : null;
}

export function compactText(value: string | null | undefined, maxLength = 180) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}...`;
}

function cardKey(targetType: ModerationTargetType, targetRecordId: number) {
  return `${targetType}:${targetRecordId}`;
}

export function moderationTargetKey(target: {
  targetType: ModerationTargetType;
  targetRecordId: number;
}) {
  return cardKey(target.targetType, target.targetRecordId);
}

export async function getModerationTargetCard(
  targetType: ModerationTargetType,
  targetRecordId: number
): Promise<ModerationTargetCard | null> {
  if (targetType === ModerationTargetType.courseReview) {
    const review = await prisma.courseReview.findUnique({
      where: { id: targetRecordId },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } },
        course: { select: { id: true, name: true } }
      }
    });

    if (!review) return null;

    return {
      id: review.id,
      type: targetType,
      typeLabel: moderationTargetLabels[targetType],
      status: review.status,
      title: review.title || `${review.rating}/5 course review`,
      body: review.body,
      context: review.course.name,
      href: `/courses/${review.course.id}`,
      createdAt: review.createdAt,
      hiddenReason: review.hiddenReason,
      author: review.user
    };
  }

  if (targetType === ModerationTargetType.holeReview) {
    const review = await prisma.holeReview.findUnique({
      where: { id: targetRecordId },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } },
        hole: {
          select: {
            id: true,
            holeNumber: true,
            course: { select: { name: true } }
          }
        }
      }
    });

    if (!review) return null;

    return {
      id: review.id,
      type: targetType,
      typeLabel: moderationTargetLabels[targetType],
      status: review.status,
      title: review.title || `${review.rating}/5 hole review`,
      body: review.body,
      context: `${review.hole.course.name} - Hole ${review.hole.holeNumber}`,
      href: `/holes/${review.hole.id}`,
      createdAt: review.createdAt,
      hiddenReason: review.hiddenReason,
      author: review.user
    };
  }

  if (targetType === ModerationTargetType.line) {
    const line = await prisma.line.findUnique({
      where: { id: targetRecordId },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } },
        hole: {
          select: {
            id: true,
            holeNumber: true,
            course: { select: { name: true } }
          }
        }
      }
    });

    if (!line) return null;

    return {
      id: line.id,
      type: targetType,
      typeLabel: moderationTargetLabels[targetType],
      status: line.status,
      title: line.name,
      body: line.description || line.discSuggestion,
      context: `${line.hole.course.name} - Hole ${line.hole.holeNumber}`,
      href: `/holes/${line.hole.id}`,
      createdAt: line.createdAt,
      hiddenReason: line.hiddenReason,
      author: line.user
    };
  }

  if (targetType === ModerationTargetType.forumThread) {
    const thread = await prisma.forumThread.findUnique({
      where: { id: targetRecordId },
      include: {
        user: { select: { id: true, username: true, profileImageUrl: true } }
      }
    });

    if (!thread) return null;

    return {
      id: thread.id,
      type: targetType,
      typeLabel: moderationTargetLabels[targetType],
      status: thread.status,
      title: thread.title,
      body: thread.body,
      context: "Forum",
      href: `/forum/${thread.id}`,
      createdAt: thread.createdAt,
      hiddenReason: thread.hiddenReason,
      author: thread.user
    };
  }

  const comment = await prisma.forumComment.findUnique({
    where: { id: targetRecordId },
    include: {
      user: { select: { id: true, username: true, profileImageUrl: true } },
      thread: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  if (!comment) return null;

  return {
    id: comment.id,
    type: targetType,
    typeLabel: moderationTargetLabels[targetType],
    status: comment.status,
    title: `Comment on ${comment.thread.title}`,
    body: comment.body,
    context: "Forum",
    href: `/forum/${comment.thread.id}#comment-${comment.id}`,
    createdAt: comment.createdAt,
    hiddenReason: comment.hiddenReason,
    author: comment.user
  };
}

export async function getModerationTargetCards(
  refs: Array<{ targetType: ModerationTargetType; targetRecordId: number }>
) {
  const uniqueRefs = Array.from(
    new Map(refs.map((ref) => [moderationTargetKey(ref), ref])).values()
  );
  const cards = await Promise.all(
    uniqueRefs.map((ref) =>
      getModerationTargetCard(ref.targetType, ref.targetRecordId)
    )
  );

  return new Map(
    cards
      .filter((card): card is ModerationTargetCard => Boolean(card))
      .map((card) => [cardKey(card.type, card.id), card])
  );
}

export async function setModerationTargetStatus({
  targetType,
  targetRecordId,
  status,
  reason
}: {
  targetType: ModerationTargetType;
  targetRecordId: number;
  status: ContentStatus;
  reason?: string | null;
}) {
  const data =
    status === ContentStatus.hidden
      ? {
          status,
          hiddenAt: new Date(),
          hiddenReason: reason?.trim() || null
        }
      : {
          status,
          hiddenAt: null,
          hiddenReason: null
        };

  if (targetType === ModerationTargetType.courseReview) {
    return prisma.courseReview.update({ where: { id: targetRecordId }, data });
  }

  if (targetType === ModerationTargetType.holeReview) {
    return prisma.holeReview.update({ where: { id: targetRecordId }, data });
  }

  if (targetType === ModerationTargetType.line) {
    return prisma.line.update({ where: { id: targetRecordId }, data });
  }

  if (targetType === ModerationTargetType.forumThread) {
    return prisma.forumThread.update({ where: { id: targetRecordId }, data });
  }

  return prisma.forumComment.update({ where: { id: targetRecordId }, data });
}

export async function deleteModerationTarget(
  targetType: ModerationTargetType,
  targetRecordId: number
) {
  if (targetType === ModerationTargetType.courseReview) {
    return prisma.courseReview.delete({ where: { id: targetRecordId } });
  }

  if (targetType === ModerationTargetType.holeReview) {
    return prisma.holeReview.delete({ where: { id: targetRecordId } });
  }

  if (targetType === ModerationTargetType.line) {
    return prisma.line.delete({ where: { id: targetRecordId } });
  }

  if (targetType === ModerationTargetType.forumThread) {
    return prisma.forumThread.delete({ where: { id: targetRecordId } });
  }

  return prisma.forumComment.delete({ where: { id: targetRecordId } });
}

export function reportWhere(targetType: ModerationTargetType, targetRecordId: number) {
  return { targetType, targetRecordId };
}

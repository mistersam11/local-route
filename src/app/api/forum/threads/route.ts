import { NotificationTargetType, NotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import {
  buildCourseFollowerNotifications,
  normalizeCourseForumFlair
} from "@/lib/course-communities";
import { prisma } from "@/lib/db";
import {
  getPersonalizedForumFeed,
  normalizeForumFeedPage,
  normalizeForumFeedPageSize,
  serializeForumFeedItem
} from "@/lib/forum-feed";
import { moderateTextFields, moderationFailure } from "@/lib/moderation";

export async function GET(request: Request) {
  const currentUser = await getRequestUser(request);
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const page = normalizeForumFeedPage(searchParams.get("page"));
  const pageSize = normalizeForumFeedPageSize(searchParams.get("pageSize"));
  const feed = await getPersonalizedForumFeed({
    userId: currentUser?.id,
    query,
    page,
    pageSize
  });

  return NextResponse.json({
    page: feed.page,
    pageSize: feed.pageSize,
    nextPage: feed.nextPage,
    followedCount: feed.followedCount,
    suggestedCount: feed.suggestedCount,
    hasPersonalizationSignals: feed.hasPersonalizationSignals,
    items: feed.items.map(serializeForumFeedItem)
  });
}

export async function POST(request: Request) {
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to start a chain" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const postBody = String(body.body ?? "").trim();
  const rawCourseId = body.courseId === undefined ? null : Number(body.courseId);
  const flair = normalizeCourseForumFlair(body.flair);
  const photoUrls = Array.isArray(body.photoUrls)
    ? body.photoUrls
        .map((url) => String(url ?? "").trim())
        .filter((url) => url.startsWith("https://"))
        .slice(0, 10)
    : [];

  if (title.length < 4 || postBody.length < 4) {
    return NextResponse.json(
      { error: "Title and chain body are required" },
      { status: 400 }
    );
  }

  if (rawCourseId !== null && !Number.isInteger(rawCourseId)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const course = rawCourseId
    ? await prisma.course.findFirst({
        where: { id: rawCourseId, status: "approved" },
        select: { id: true }
      })
    : null;

  if (rawCourseId && !course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  try {
    await moderateTextFields([title, postBody, ...(flair ? [flair] : [])]);
  } catch (error) {
    const failure = moderationFailure(error);

    if (failure) {
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    throw error;
  }

  const thread = await prisma.$transaction(async (tx) => {
    const createdThread = await tx.forumThread.create({
      data: {
        userId: currentUser.id,
        courseId: course?.id ?? null,
        title,
        body: postBody,
        flair,
        photos: {
          create: photoUrls.map((url, index) => ({
            url,
            sortOrder: index + 1
          }))
        }
      },
      select: { id: true }
    });

    if (course) {
      const followers = await tx.courseFollow.findMany({
        where: { courseId: course.id },
        select: {
          userId: true,
          notifyNewPosts: true,
          notifyNewEvents: true
        }
      });
      const notifications = buildCourseFollowerNotifications({
        followers,
        actorId: currentUser.id,
        courseId: course.id,
        type: NotificationType.coursePost,
        targetType: NotificationTargetType.forumThread,
        targetRecordId: createdThread.id
      });

      if (notifications.length) {
        await tx.notification.createMany({
          data: notifications,
          skipDuplicates: true
        });
      }
    }

    return createdThread;
  });

  return NextResponse.json({ thread }, { status: 201 });
}

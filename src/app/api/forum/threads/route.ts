import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { moderateTextFields, moderationFailure } from "@/lib/moderation";

export async function POST(request: Request) {
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to create a thread" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const postBody = String(body.body ?? "").trim();
  const photoUrls = Array.isArray(body.photoUrls)
    ? body.photoUrls
        .map((url) => String(url ?? "").trim())
        .filter((url) => url.startsWith("https://"))
        .slice(0, 10)
    : [];

  if (title.length < 4 || postBody.length < 4) {
    return NextResponse.json(
      { error: "Title and post body are required" },
      { status: 400 }
    );
  }

  try {
    await moderateTextFields([title, postBody]);
  } catch (error) {
    const failure = moderationFailure(error);

    if (failure) {
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    throw error;
  }

  const thread = await prisma.forumThread.create({
    data: {
      userId: currentUser.id,
      title,
      body: postBody,
      photos: {
        create: photoUrls.map((url, index) => ({
          url,
          sortOrder: index + 1
        }))
      }
    },
    select: { id: true }
  });

  return NextResponse.json({ thread }, { status: 201 });
}

import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { moderateTextFields, moderationFailure } from "@/lib/moderation";
import { includeHoleReviewAuthor, serializeHoleReview } from "@/lib/social-data";

type Params = {
  params: {
    holeId: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const holeId = Number(params.holeId);

  if (!Number.isInteger(holeId)) {
    return NextResponse.json({ error: "Invalid hole id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to review holes" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const rating = Math.max(1, Math.min(5, Number(body.rating) || 0));
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const photoUrl = String(body.photoUrl ?? "").trim();

  if (!rating || text.length < 2) {
    return NextResponse.json(
      { error: "Rating and review are required" },
      { status: 400 }
    );
  }

  try {
    await moderateTextFields([title, text]);
  } catch (error) {
    const failure = moderationFailure(error);

    if (failure) {
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    throw error;
  }

  const review = await prisma.holeReview.create({
    data: {
      holeId,
      userId: currentUser.id,
      rating,
      title: title || null,
      body: text,
      photoUrl: photoUrl || null
    },
    include: includeHoleReviewAuthor
  });

  return NextResponse.json({ review: serializeHoleReview(review) }, { status: 201 });
}

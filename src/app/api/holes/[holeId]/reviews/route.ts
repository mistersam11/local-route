import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";
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

  const review = await prisma.holeReview.create({
    data: {
      holeId,
      userId: await getRequestUserId(request),
      rating,
      title: title || null,
      body: text,
      photoUrl: photoUrl || null
    },
    include: includeHoleReviewAuthor
  });

  return NextResponse.json({ review: serializeHoleReview(review) }, { status: 201 });
}

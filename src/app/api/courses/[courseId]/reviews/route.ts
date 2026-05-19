import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { includeCourseReviewAuthor, serializeCourseReview } from "@/lib/social-data";

type Params = {
  params: {
    courseId: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to review courses" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const rating = Math.max(1, Math.min(5, Number(body.rating) || 0));
  const reviewBody = String(body.body ?? "").trim();
  const title = String(body.title ?? "").trim();
  const photoUrl = String(body.photoUrl ?? "").trim();

  if (!rating || reviewBody.length < 2) {
    return NextResponse.json(
      { error: "Rating and review are required" },
      { status: 400 }
    );
  }

  const review = await prisma.courseReview.create({
    data: {
      courseId,
      userId: currentUser.id,
      rating,
      title: title || null,
      body: reviewBody,
      photoUrl: photoUrl || null
    },
    include: includeCourseReviewAuthor
  });

  return NextResponse.json({ review: serializeCourseReview(review) }, { status: 201 });
}

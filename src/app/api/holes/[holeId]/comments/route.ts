import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { includeHoleCommentAuthor, serializeHoleComment } from "@/lib/social-data";

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
  const text = String(body.body ?? "").trim();
  const photoUrl = String(body.photoUrl ?? "").trim();

  if (text.length < 2) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }

  const comment = await prisma.holeComment.create({
    data: {
      holeId,
      userId: getRequestUserId(request),
      body: text,
      photoUrl: photoUrl || null
    },
    include: includeHoleCommentAuthor
  });

  return NextResponse.json({ comment: serializeHoleComment(comment) }, { status: 201 });
}

import { Difficulty, LineTag, RiskLevel } from "@prisma/client";
import { NextResponse } from "next/server";
import { getFollowingIds, getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { moderateTextFields, moderationFailure } from "@/lib/moderation";
import {
  getSerializedLinesForHole,
  includeLineAuthor,
  serializeLine
} from "@/lib/social-data";

type Params = {
  params: {
    holeId: string;
  };
};

function enumValue<T extends Record<string, string>>(
  values: T,
  value: unknown,
  fallback: T[keyof T]
) {
  return Object.values(values).includes(String(value)) ? (value as T[keyof T]) : fallback;
}

export async function GET(request: Request, { params }: Params) {
  const holeId = Number(params.holeId);

  if (!Number.isInteger(holeId)) {
    return NextResponse.json({ error: "Invalid hole id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);
  const sort = new URL(request.url).searchParams.get("sort");
  const lines = await getSerializedLinesForHole(holeId, currentUser?.id, sort);

  return NextResponse.json({ lines });
}

export async function POST(request: Request, { params }: Params) {
  const holeId = Number(params.holeId);

  if (!Number.isInteger(holeId)) {
    return NextResponse.json({ error: "Invalid hole id" }, { status: 400 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const currentUser = await getRequestUser(request);
  const name = String(body.name ?? "").trim();

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to suggest a line" }, { status: 401 });
  }

  if (name.length < 2) {
    return NextResponse.json({ error: "Line name is required" }, { status: 400 });
  }

  const hole = await prisma.hole.findUnique({ where: { id: holeId }, select: { id: true } });

  if (!hole) {
    return NextResponse.json({ error: "Hole not found" }, { status: 404 });
  }

  const description = String(body.description ?? "").trim();
  const discSuggestion = String(body.discSuggestion ?? "").trim();

  try {
    await moderateTextFields([name, description, discSuggestion]);
  } catch (error) {
    const failure = moderationFailure(error);

    if (failure) {
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    throw error;
  }

  const line = await prisma.line.create({
    data: {
      holeId,
      userId: currentUser.id,
      name,
      description: description || null,
      difficulty: enumValue(Difficulty, body.difficulty, Difficulty.intermediate),
      riskLevel: enumValue(RiskLevel, body.riskLevel, RiskLevel.medium),
      tag: enumValue(LineTag, body.tag, LineTag.safe),
      discSuggestion: discSuggestion || null
    },
    include: includeLineAuthor
  });

  const followingIds = await getFollowingIds(currentUser.id);

  return NextResponse.json({ line: serializeLine(line, followingIds) }, { status: 201 });
}

import { Difficulty, LineTag, RiskLevel } from "@prisma/client";
import { NextResponse } from "next/server";
import { getFollowingIds, getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";
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

  const currentUserId = await getRequestUserId(request);
  const sort = new URL(request.url).searchParams.get("sort");
  const lines = await getSerializedLinesForHole(holeId, currentUserId, sort);

  return NextResponse.json({ lines });
}

export async function POST(request: Request, { params }: Params) {
  const holeId = Number(params.holeId);

  if (!Number.isInteger(holeId)) {
    return NextResponse.json({ error: "Invalid hole id" }, { status: 400 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const currentUserId = await getRequestUserId(request);
  const name = String(body.name ?? "").trim();

  if (name.length < 2) {
    return NextResponse.json({ error: "Line name is required" }, { status: 400 });
  }

  const hole = await prisma.hole.findUnique({ where: { id: holeId }, select: { id: true } });

  if (!hole) {
    return NextResponse.json({ error: "Hole not found" }, { status: 404 });
  }

  const line = await prisma.line.create({
    data: {
      holeId,
      userId: currentUserId,
      name,
      description: String(body.description ?? "").trim() || null,
      difficulty: enumValue(Difficulty, body.difficulty, Difficulty.intermediate),
      riskLevel: enumValue(RiskLevel, body.riskLevel, RiskLevel.medium),
      tag: enumValue(LineTag, body.tag, LineTag.safe),
      discSuggestion: String(body.discSuggestion ?? "").trim() || null
    },
    include: includeLineAuthor
  });

  const followingIds = await getFollowingIds(currentUserId);

  return NextResponse.json({ line: serializeLine(line, followingIds) }, { status: 201 });
}

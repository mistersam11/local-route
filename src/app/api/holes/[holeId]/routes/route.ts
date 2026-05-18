import { Difficulty, Prisma, RiskLevel, RouteTag } from "@prisma/client";
import { NextResponse } from "next/server";
import { getFollowingIds, getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  getSerializedRoutesForHole,
  normalizePolyline,
  serializeRoute
} from "@/lib/route-data";

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

  const currentUserId = getRequestUserId(request);
  const sort = new URL(request.url).searchParams.get("sort");
  const routes = await getSerializedRoutesForHole(holeId, currentUserId, sort);

  return NextResponse.json({ routes });
}

export async function POST(request: Request, { params }: Params) {
  const holeId = Number(params.holeId);

  if (!Number.isInteger(holeId)) {
    return NextResponse.json({ error: "Invalid hole id" }, { status: 400 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const currentUserId = getRequestUserId(request);
  const name = String(body.name ?? "").trim();
  const polyline = normalizePolyline(body.polyline);

  if (name.length < 2) {
    return NextResponse.json({ error: "Route name is required" }, { status: 400 });
  }

  if (polyline.length < 2) {
    return NextResponse.json(
      { error: "Route must include at least tee and basket points" },
      { status: 400 }
    );
  }

  const hole = await prisma.hole.findUnique({ where: { id: holeId }, select: { id: true } });

  if (!hole) {
    return NextResponse.json({ error: "Hole not found" }, { status: 404 });
  }

  const route = await prisma.route.create({
    data: {
      holeId,
      userId: currentUserId,
      name,
      description: String(body.description ?? "").trim() || null,
      difficulty: enumValue(Difficulty, body.difficulty, Difficulty.intermediate),
      riskLevel: enumValue(RiskLevel, body.riskLevel, RiskLevel.medium),
      tag: enumValue(RouteTag, body.tag, RouteTag.safe),
      polyline: polyline as Prisma.InputJsonValue,
      discSuggestion: String(body.discSuggestion ?? "").trim() || null
    },
    include: {
      user: {
        select: { id: true, username: true, profileImageUrl: true }
      }
    }
  });

  const followingIds = await getFollowingIds(currentUserId);

  return NextResponse.json({ route: serializeRoute(route, followingIds) }, { status: 201 });
}

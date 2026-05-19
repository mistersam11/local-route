import { ReportStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import {
  getModerationTargetCard,
  parseModerationTargetType,
  parseTargetRecordId
} from "@/lib/content-moderation";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to report content" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const targetType = parseModerationTargetType(body.targetType);
  const targetRecordId = parseTargetRecordId(body.targetId);
  const reason = String(body.reason ?? "").trim();

  if (!targetType || !targetRecordId) {
    return NextResponse.json({ error: "Invalid report target" }, { status: 400 });
  }

  const target = await getModerationTargetCard(targetType, targetRecordId);

  if (!target) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  if (target.author.id === currentUser.id) {
    return NextResponse.json(
      { error: "You cannot report your own content" },
      { status: 400 }
    );
  }

  const report = await prisma.contentReport.upsert({
    where: {
      targetType_targetRecordId_userId: {
        targetType,
        targetRecordId,
        userId: currentUser.id
      }
    },
    update: {
      reason: reason || null,
      status: ReportStatus.open,
      resolvedAt: null,
      resolvedById: null
    },
    create: {
      targetType,
      targetRecordId,
      userId: currentUser.id,
      reason: reason || null
    }
  });

  return NextResponse.json({ report }, { status: 201 });
}

import {
  ContentStatus,
  ModerationActionType,
  ReportStatus
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import {
  compactText,
  deleteModerationTarget,
  getModerationTargetCard,
  parseModerationAction,
  parseModerationTargetType,
  parseTargetRecordId,
  reportWhere,
  setModerationTargetStatus
} from "@/lib/content-moderation";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  const currentUser = await getRequestUser(request);

  if (!currentUser?.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const targetType = parseModerationTargetType(body.targetType);
  const targetRecordId = parseTargetRecordId(body.targetId);
  const action = parseModerationAction(body.action);
  const reason = String(body.reason ?? "").trim();

  if (!targetType || !targetRecordId || !action) {
    return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });
  }

  const target = await getModerationTargetCard(targetType, targetRecordId);

  if (!target && action !== ModerationActionType.resolve) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  if (action === ModerationActionType.hide) {
    await setModerationTargetStatus({
      targetType,
      targetRecordId,
      status: ContentStatus.hidden,
      reason
    });
  }

  if (action === ModerationActionType.restore) {
    await setModerationTargetStatus({
      targetType,
      targetRecordId,
      status: ContentStatus.visible
    });
  }

  if (action === ModerationActionType.delete) {
    await deleteModerationTarget(targetType, targetRecordId);
  }

  if (
    action === ModerationActionType.hide ||
    action === ModerationActionType.delete ||
    action === ModerationActionType.resolve
  ) {
    await prisma.contentReport.updateMany({
      where: {
        ...reportWhere(targetType, targetRecordId),
        status: ReportStatus.open
      },
      data: {
        status: ReportStatus.resolved,
        resolvedAt: new Date(),
        resolvedById: currentUser.id
      }
    });
  }

  await prisma.adminModerationAction.create({
    data: {
      targetType,
      targetRecordId,
      adminId: currentUser.id,
      action,
      reason: reason || null,
      targetSummary: target
        ? compactText(`${target.typeLabel}: ${target.title} ${target.body ?? ""}`, 220)
        : "Missing or deleted content"
    }
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    notificationId: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const notificationId = Number(params.notificationId);
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to update notifications" }, { status: 401 });
  }

  if (!Number.isInteger(notificationId)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: currentUser.id },
    data: { isRead: true, readAt: new Date() }
  });

  return NextResponse.json({ read: true });
}

import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    userId: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const followingId = Number(params.userId);
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to follow players" }, { status: 401 });
  }

  const followerId = currentUser.id;

  if (!Number.isInteger(followingId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  if (followingId === followerId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    update: {},
    create: { followerId, followingId }
  });

  return NextResponse.json({ following: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const followingId = Number(params.userId);
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to follow players" }, { status: 401 });
  }

  const followerId = currentUser.id;

  if (!Number.isInteger(followingId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  await prisma.follow.deleteMany({
    where: { followerId, followingId }
  });

  return NextResponse.json({ following: false });
}

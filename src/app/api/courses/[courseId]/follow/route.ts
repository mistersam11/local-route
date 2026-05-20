import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    courseId: string;
  };
};

async function getFollowerCount(courseId: number) {
  return prisma.courseFollow.count({ where: { courseId } });
}

export async function POST(request: Request, { params }: Params) {
  const courseId = Number(params.courseId);
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to follow courses" }, { status: 401 });
  }

  if (!Number.isInteger(courseId)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "approved" },
    select: { id: true }
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  await prisma.courseFollow.upsert({
    where: { userId_courseId: { userId: currentUser.id, courseId } },
    update: {},
    create: { userId: currentUser.id, courseId }
  });

  return NextResponse.json({
    following: true,
    followerCount: await getFollowerCount(courseId)
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const courseId = Number(params.courseId);
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to follow courses" }, { status: 401 });
  }

  if (!Number.isInteger(courseId)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  await prisma.courseFollow.deleteMany({
    where: { userId: currentUser.id, courseId }
  });

  return NextResponse.json({
    following: false,
    followerCount: await getFollowerCount(courseId)
  });
}

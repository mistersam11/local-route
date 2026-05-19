import { CourseMarkType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    courseId: string;
  };
};

async function getMarkState(courseId: number, userId: number) {
  const [marks, markCounts] = await Promise.all([
    prisma.courseMark.findMany({
      where: { courseId, userId },
      select: { type: true }
    }),
    prisma.courseMark.groupBy({
      by: ["type"],
      where: { courseId },
      _count: { _all: true }
    })
  ]);
  const types = new Set(marks.map((mark) => mark.type));

  return {
    played: types.has(CourseMarkType.played),
    wantToPlay: types.has(CourseMarkType.wantToPlay),
    playedCount:
      markCounts.find((entry) => entry.type === CourseMarkType.played)?._count._all ??
      0,
    wantToPlayCount:
      markCounts.find((entry) => entry.type === CourseMarkType.wantToPlay)?._count
        ._all ?? 0
  };
}

export async function POST(request: Request, { params }: Params) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to track courses" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const type = String(body.type ?? "");

  if (!Object.values(CourseMarkType).includes(type as CourseMarkType)) {
    return NextResponse.json({ error: "Invalid course mark" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true }
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const existing = await prisma.courseMark.findUnique({
    where: {
      courseId_userId_type: {
        courseId,
        userId: currentUser.id,
        type: type as CourseMarkType
      }
    }
  });

  if (existing) {
    await prisma.courseMark.delete({ where: { id: existing.id } });
  } else {
    await prisma.courseMark.create({
      data: {
        courseId,
        userId: currentUser.id,
        type: type as CourseMarkType
      }
    });
  }

  const state = await getMarkState(courseId, currentUser.id);

  return NextResponse.json(state);
}

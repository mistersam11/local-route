import { ContentStatus, CourseStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    courseId: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      holes: {
        include: {
          _count: {
            select: {
              lines: { where: { status: ContentStatus.visible } },
              reviews: { where: { status: ContentStatus.visible } }
            }
          }
        },
        orderBy: { holeNumber: "asc" }
      },
      reviews: {
        where: { status: ContentStatus.visible },
        include: {
          user: { select: { id: true, username: true, profileImageUrl: true } }
        },
        orderBy: { createdAt: "desc" }
      },
      submittedBy: {
        select: { id: true, username: true, profileImageUrl: true }
      }
    }
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json({ course });
}

export async function PATCH(request: Request, { params }: Params) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser?.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const status = String(body.status ?? "");

  if (!Object.values(CourseStatus).includes(status as CourseStatus)) {
    return NextResponse.json({ error: "Invalid course status" }, { status: 400 });
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data: { status: status as CourseStatus },
    include: {
      submittedBy: {
        select: { id: true, username: true, profileImageUrl: true }
      }
    }
  });

  return NextResponse.json({ course });
}

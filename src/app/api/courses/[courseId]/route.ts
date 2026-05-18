import { NextResponse } from "next/server";
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
            select: { routes: true }
          }
        },
        orderBy: { holeNumber: "asc" }
      }
    }
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json({ course });
}

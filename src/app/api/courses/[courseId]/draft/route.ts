import { NextResponse } from "next/server";
import {
  applyCourseEdit,
  courseEditValidationError,
  normalizeCourseEditInput
} from "@/lib/course-edit-data";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    courseId: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to edit this draft" }, { status: 401 });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true, submittedById: true }
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (course.submittedById !== currentUser.id && !currentUser.isAdmin) {
    return NextResponse.json({ error: "You can only edit your own drafts" }, { status: 403 });
  }

  if (course.status === "approved") {
    return NextResponse.json(
      { error: "Approved courses cannot be edited from the draft screen" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send course details to save" }, { status: 400 });
  }
  const shouldSubmit = body.submitForReview === true;
  const edit = normalizeCourseEditInput(body);
  const validationError = courseEditValidationError(edit, {
    requireHoles: shouldSubmit
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const nextStatus = shouldSubmit ? "pending" : "draft";

  const updatedCourse = await prisma.$transaction(async (tx) => {
    await applyCourseEdit(tx, courseId, edit, { status: nextStatus });

    return tx.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        holes: {
          where: { layoutId: null },
          orderBy: { holeNumber: "asc" }
        },
        layouts: {
          include: { holes: { orderBy: { holeNumber: "asc" } } },
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  });

  return NextResponse.json({ course: updatedCourse });
}

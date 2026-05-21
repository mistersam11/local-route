import { CourseEditProposalStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  courseEditToJson,
  courseEditValidationError,
  normalizeCourseEditProposalNotes,
  normalizeCourseEditInput
} from "@/lib/course-edit-data";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    courseId: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const currentUser = await getRequestUser(request);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true }
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (course.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved courses use edit proposals" },
      { status: 400 }
    );
  }

  const existingPendingProposal = currentUser
    ? await prisma.courseEditProposal.findFirst({
        where: {
          courseId,
          submittedById: currentUser.id,
          status: CourseEditProposalStatus.pending
        },
        select: { id: true }
      })
    : null;

  if (existingPendingProposal) {
    return NextResponse.json(
      {
        error:
          "This course already has a pending edit proposal from you. Wait for admin review before sending another."
      },
      { status: 409 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Send course details to propose edits" },
      { status: 400 }
    );
  }

  const edit = normalizeCourseEditInput(body);
  const notes = normalizeCourseEditProposalNotes(body.notes);
  const validationError = courseEditValidationError(edit, { requireHoles: true });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const proposal = await prisma.courseEditProposal.create({
    data: {
      courseId,
      submittedById: currentUser?.id,
      proposedData: courseEditToJson(edit),
      notes
    },
    select: { id: true, status: true }
  });

  return NextResponse.json(
    {
      proposal,
      redirectTo: `/courses/${courseId}?editProposal=submitted`
    },
    { status: 201 }
  );
}

import { CourseEditProposalStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  applyCourseEdit,
  courseEditFromJson,
  courseEditValidationError
} from "@/lib/course-edit-data";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  const currentUser = await getRequestUser(request);

  if (!currentUser?.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Send an edit proposal decision" },
      { status: 400 }
    );
  }

  const proposalId = Number(body.proposalId);
  const action = String(body.action ?? "");

  if (!Number.isInteger(proposalId)) {
    return NextResponse.json({ error: "Invalid proposal id" }, { status: 400 });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid proposal action" }, { status: 400 });
  }

  const proposal = await prisma.courseEditProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      courseId: true,
      status: true,
      proposedData: true
    }
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  if (proposal.status !== CourseEditProposalStatus.pending) {
    return NextResponse.json(
      { error: "This proposal has already been reviewed" },
      { status: 409 }
    );
  }

  const reviewedStatus =
    action === "approve"
      ? CourseEditProposalStatus.approved
      : CourseEditProposalStatus.rejected;

  if (action === "reject") {
    const updatedProposal = await prisma.courseEditProposal.update({
      where: { id: proposal.id },
      data: {
        status: reviewedStatus,
        reviewedAt: new Date(),
        reviewedById: currentUser.id
      },
      select: { id: true, status: true }
    });

    return NextResponse.json({ proposal: updatedProposal });
  }

  const edit = courseEditFromJson(proposal.proposedData);
  const validationError = courseEditValidationError(edit, { requireHoles: true });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const updatedProposal = await prisma.$transaction(async (tx) => {
    await applyCourseEdit(tx, proposal.courseId, edit);

    return tx.courseEditProposal.update({
      where: { id: proposal.id },
      data: {
        status: reviewedStatus,
        reviewedAt: new Date(),
        reviewedById: currentUser.id
      },
      select: { id: true, status: true }
    });
  });

  return NextResponse.json({ proposal: updatedProposal });
}

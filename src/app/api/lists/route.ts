import { CourseStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { moderateTextFields, moderationFailure } from "@/lib/moderation";

export async function POST(request: Request) {
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to create lists" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const courseIds = Array.isArray(body.courseIds)
    ? Array.from(new Set(body.courseIds.map(Number))).filter((id) =>
        Number.isInteger(id)
      )
    : [];

  if (title.length < 3) {
    return NextResponse.json({ error: "List title is required" }, { status: 400 });
  }

  if (!courseIds.length) {
    return NextResponse.json(
      { error: "Choose at least one course" },
      { status: 400 }
    );
  }

  try {
    await moderateTextFields([title, description]);
  } catch (error) {
    const failure = moderationFailure(error);

    if (failure) {
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    throw error;
  }

  const courses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
      status: CourseStatus.approved
    },
    select: { id: true }
  });

  if (!courses.length) {
    return NextResponse.json(
      { error: "Choose at least one approved course" },
      { status: 400 }
    );
  }

  const approvedIds = new Set(courses.map((course) => course.id));
  const list = await prisma.courseList.create({
    data: {
      userId: currentUser.id,
      title,
      description: description || null,
      items: {
        create: courseIds
          .filter((id) => approvedIds.has(id))
          .slice(0, 50)
          .map((courseId, index) => ({
            courseId,
            rank: index + 1
          }))
      }
    },
    select: { id: true }
  });

  return NextResponse.json({ list }, { status: 201 });
}

import { CourseDifficulty, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { booleanInput } from "@/lib/course-facts";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    courseId: string;
  };
};

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeHole(rawHole: unknown, index: number) {
  const hole = rawHole as Record<string, unknown>;
  const holeNumber = Number(hole.holeNumber) || Number(hole.number) || index + 1;
  const par = optionalNumber(hole.par);
  const distanceFeet = optionalNumber(hole.distanceFeet);
  const description = String(hole.description ?? "").trim();
  const teePhotoUrl = String(hole.teePhotoUrl ?? "").trim();

  return {
    holeNumber,
    par: par ? Math.round(par) : null,
    distanceFeet: distanceFeet ? Math.round(distanceFeet) : null,
    description: description || null,
    teePhotoUrl: teePhotoUrl || null
  };
}

function normalizeLayout(rawLayout: unknown, index: number) {
  const layout = rawLayout as Record<string, unknown>;
  const rawHoles = Array.isArray(layout.holes) ? layout.holes : [];
  const name = String(layout.name ?? "").trim() || `Layout ${index + 1}`;
  const holes = rawHoles
    .map(normalizeHole)
    .filter((hole) => Number.isInteger(hole.holeNumber) && hole.holeNumber > 0)
    .slice(0, 72);

  return { name, holes };
}

function dedupeLayoutNames(layouts: ReturnType<typeof normalizeLayout>[]) {
  const seen = new Map<string, number>();

  return layouts.map((layout) => {
    const key = layout.name.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);

    return count === 0
      ? layout
      : { ...layout, name: `${layout.name} ${count + 1}` };
  });
}

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
  const name = String(body.name ?? "").trim();
  const locationName = String(body.locationName ?? "").trim();
  const layoutName = String(body.layoutName ?? "").trim();
  const coverPhotoUrl = String(body.coverPhotoUrl ?? "").trim();
  const rawDifficulty = String(body.difficulty ?? "");
  const difficulty = Object.values(CourseDifficulty).includes(
    rawDifficulty as CourseDifficulty
  )
    ? (rawDifficulty as CourseDifficulty)
    : CourseDifficulty.mixed;
  const latitude = optionalNumber(body.latitude);
  const longitude = optionalNumber(body.longitude);
  const shouldSubmit = body.submitForReview === true;
  const rawHoles = Array.isArray(body.holes) ? body.holes : [];
  const rawLayouts = Array.isArray(body.layouts) ? body.layouts : [];
  const holes = rawHoles
    .map(normalizeHole)
    .filter((hole) => Number.isInteger(hole.holeNumber) && hole.holeNumber > 0)
    .slice(0, 36);
  const layouts = dedupeLayoutNames(
    rawLayouts.map(normalizeLayout).filter((layout) => layout.holes.length)
  );
  const primaryLayoutName = layouts[0]?.name ?? layoutName;

  if (name.length < 2 || locationName.length < 2) {
    return NextResponse.json(
      { error: "Course name and location are required" },
      { status: 400 }
    );
  }

  if (shouldSubmit && holes.length === 0 && layouts.length === 0) {
    return NextResponse.json(
      { error: "Add at least one hole before submitting for review" },
      { status: 400 }
    );
  }

  const nextStatus = shouldSubmit ? "pending" : "draft";

  const updatedCourse = await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id: courseId },
      data: {
        name,
        locationName,
        layoutName: primaryLayoutName || null,
        coverPhotoUrl: coverPhotoUrl || null,
        latitude,
        longitude,
        difficulty,
        hasParking: booleanInput(body.hasParking),
        hasBathrooms: booleanInput(body.hasBathrooms),
        hasWater: booleanInput(body.hasWater),
        cartFriendly: booleanInput(body.cartFriendly),
        dogFriendly: booleanInput(body.dogFriendly),
        beginnerFriendly: booleanInput(body.beginnerFriendly),
        isPayToPlay: booleanInput(body.isPayToPlay),
        status: nextStatus
      }
    });

    await tx.hole.deleteMany({ where: { courseId } });
    await tx.courseLayout.deleteMany({ where: { courseId } });

    if (layouts.length) {
      for (const [index, layout] of layouts.entries()) {
        const createdLayout = await tx.courseLayout.create({
          data: {
            courseId,
            name: layout.name,
            sortOrder: index
          },
          select: { id: true }
        });

        await tx.hole.createMany({
          data: layout.holes.map((hole) => ({
            ...hole,
            courseId,
            layoutId: createdLayout.id
          })) as Prisma.HoleCreateManyInput[]
        });
      }
    } else if (holes.length) {
      await tx.hole.createMany({
        data: holes.map((hole) => ({
          ...hole,
          courseId
        })) as Prisma.HoleCreateManyInput[]
      });
    }

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

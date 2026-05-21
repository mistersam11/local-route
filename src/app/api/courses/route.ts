import { CourseDifficulty, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { booleanInput } from "@/lib/course-facts";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { PAGE_SIZE, normalizePage, pageSkip } from "@/lib/pagination";

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const difficulty = searchParams.get("difficulty");
  const hasParking = booleanInput(searchParams.get("parking"));
  const hasBathrooms = booleanInput(searchParams.get("bathrooms"));
  const hasWater = booleanInput(searchParams.get("water"));
  const cartFriendly = booleanInput(searchParams.get("cart"));
  const dogFriendly = booleanInput(searchParams.get("dogs"));
  const beginnerFriendly = booleanInput(searchParams.get("beginner"));
  const freeOnly = booleanInput(searchParams.get("free"));
  const page = normalizePage(searchParams.get("page"));
  const where = {
    status: "approved",
    ...(Object.values(CourseDifficulty).includes(difficulty as CourseDifficulty)
      ? { difficulty: difficulty as CourseDifficulty }
      : {}),
    ...(hasParking ? { hasParking: true } : {}),
    ...(hasBathrooms ? { hasBathrooms: true } : {}),
    ...(hasWater ? { hasWater: true } : {}),
    ...(cartFriendly ? { cartFriendly: true } : {}),
    ...(dogFriendly ? { dogFriendly: true } : {}),
    ...(beginnerFriendly ? { beginnerFriendly: true } : {}),
    ...(freeOnly ? { isPayToPlay: false } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { locationName: { contains: query } }
          ]
        }
      : {})
  } satisfies Prisma.CourseWhereInput;

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        submittedBy: {
          select: { id: true, username: true, profileImageUrl: true }
        },
        _count: {
          select: { holes: true }
        }
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: pageSkip(page),
      take: PAGE_SIZE
    }),
    prisma.course.count({ where })
  ]);

  return NextResponse.json({
    courses,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      nextPage: page * PAGE_SIZE < total ? page + 1 : null
    }
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to submit a course" }, { status: 401 });
  }

  const name = String(body.name ?? "").trim();
  const locationName = String(body.locationName ?? "").trim();
  const locationAddress = String(body.locationAddress ?? "").trim();
  const coverPhotoUrl = String(body.coverPhotoUrl ?? "").trim();
  const rawDifficulty = String(body.difficulty ?? "");
  const difficulty = Object.values(CourseDifficulty).includes(
    rawDifficulty as CourseDifficulty
  )
    ? (rawDifficulty as CourseDifficulty)
    : CourseDifficulty.mixed;
  const latitude = optionalNumber(body.latitude);
  const longitude = optionalNumber(body.longitude);
  const rawHoles = Array.isArray(body.holes) ? body.holes : [];

  if (name.length < 2 || locationName.length < 2) {
    return NextResponse.json(
      { error: "Course name and location are required" },
      { status: 400 }
    );
  }

  const holes = rawHoles
    .map((rawHole, index) => {
      const hole = rawHole as Record<string, unknown>;
      const holeNumber = Number(hole.holeNumber) || index + 1;
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
    })
    .filter((hole) => Number.isInteger(hole.holeNumber) && hole.holeNumber > 0)
    .slice(0, 36);

  if (holes.length === 0) {
    return NextResponse.json(
      { error: "Add at least one hole" },
      { status: 400 }
    );
  }

  const course = await prisma.course.create({
    data: {
      name,
      locationName,
      locationAddress: locationAddress || null,
      latitude,
      longitude,
      coverPhotoUrl: coverPhotoUrl || null,
      difficulty,
      hasParking: booleanInput(body.hasParking),
      hasBathrooms: booleanInput(body.hasBathrooms),
      hasWater: booleanInput(body.hasWater),
      cartFriendly: booleanInput(body.cartFriendly),
      dogFriendly: booleanInput(body.dogFriendly),
      beginnerFriendly: booleanInput(body.beginnerFriendly),
      isPayToPlay: booleanInput(body.isPayToPlay),
      status: "pending",
      submittedById: currentUser.id,
      holes: {
        create: holes as Prisma.HoleCreateWithoutCourseInput[]
      }
    },
    include: {
      holes: { orderBy: { holeNumber: "asc" } },
      submittedBy: {
        select: { id: true, username: true, profileImageUrl: true }
      }
    }
  });

  return NextResponse.json({ course }, { status: 201 });
}

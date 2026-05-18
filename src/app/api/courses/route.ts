import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/current-user";
import { prisma } from "@/lib/db";

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

  const courses = await prisma.course.findMany({
    where: {
      status: { not: "rejected" },
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { locationName: { contains: query } }
            ]
          }
        : {})
    },
    include: {
      submittedBy: {
        select: { id: true, username: true, profileImageUrl: true }
      },
      _count: {
        select: { holes: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ courses });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const currentUserId = await getRequestUserId(request);
  const name = String(body.name ?? "").trim();
  const locationName = String(body.locationName ?? "").trim();
  const coverPhotoUrl = String(body.coverPhotoUrl ?? "").trim();
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
      latitude,
      longitude,
      coverPhotoUrl: coverPhotoUrl || null,
      status: "pending",
      submittedById: currentUserId,
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

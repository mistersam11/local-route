import { CourseDifficulty, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  importUdiscCourse,
  UdiscImportValidationError
} from "@/lib/importers/udisc";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT_MAX = 5;

type RateBucket = {
  count: number;
  resetAt: number;
};

const globalForImportRateLimit = globalThis as unknown as {
  udiscImportRateBuckets?: Map<string, RateBucket>;
};

const rateBuckets =
  globalForImportRateLimit.udiscImportRateBuckets ?? new Map<string, RateBucket>();

globalForImportRateLimit.udiscImportRateBuckets = rateBuckets;

function rateLimitKey(request: Request, userId: number) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "local";

  return `${userId}:${ip}`;
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));
  }

  bucket.count += 1;
  return null;
}

function toHoleCreateInput(
  hole: Awaited<ReturnType<typeof importUdiscCourse>>["holes"][number]
): Prisma.HoleCreateWithoutCourseInput {
  return {
    holeNumber: hole.number,
    par: hole.par ?? null,
    distanceFeet: hole.distanceFeet ?? null,
    description: hole.description ?? null
  };
}

export async function POST(request: Request) {
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json(
      { error: "Log in to import a course" },
      { status: 401 }
    );
  }

  const limitedForSeconds = checkRateLimit(
    rateLimitKey(request, currentUser.id)
  );

  if (limitedForSeconds) {
    return NextResponse.json(
      {
        error: `Slow down for a minute before importing another UDisc link. Try again in ${limitedForSeconds} seconds.`
      },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send a UDisc URL to import" }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();

  if (!url) {
    return NextResponse.json({ error: "Paste a UDisc URL to import" }, { status: 400 });
  }

  try {
    const result = await importUdiscCourse(url);
    const warnings = [
      ...result.warnings,
      "Review the imported draft before submitting it for admin approval."
    ];
    const course = await prisma.course.create({
      data: {
        name: result.courseName ?? "Imported UDisc course",
        locationName: "Imported from UDisc",
        difficulty: CourseDifficulty.mixed,
        status: "draft",
        layoutName: result.layoutName ?? null,
        importSourceUrl: result.sourceUrl,
        importWarnings: warnings,
        submittedById: currentUser.id,
        ...(result.holes.length
          ? {
              holes: {
                create: result.holes.map(toHoleCreateInput)
              }
            }
          : {})
      },
      select: { id: true }
    });

    return NextResponse.json(
      {
        courseId: course.id,
        redirectTo: `/courses/${course.id}/edit`,
        result: { ...result, warnings }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UdiscImportValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "That UDisc link could not be imported right now" },
      { status: 502 }
    );
  }
}

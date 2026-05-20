import { CourseDifficulty, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import {
  type ImportedLayout,
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

type ImportPreviewCacheEntry = {
  userId: number;
  result: Awaited<ReturnType<typeof importUdiscCourse>>;
  expiresAt: number;
};

const globalForImportRateLimit = globalThis as unknown as {
  udiscImportRateBuckets?: Map<string, RateBucket>;
  udiscImportPreviewCache?: Map<string, ImportPreviewCacheEntry>;
};

const rateBuckets =
  globalForImportRateLimit.udiscImportRateBuckets ?? new Map<string, RateBucket>();

globalForImportRateLimit.udiscImportRateBuckets = rateBuckets;

const previewCache =
  globalForImportRateLimit.udiscImportPreviewCache ??
  new Map<string, ImportPreviewCacheEntry>();

globalForImportRateLimit.udiscImportPreviewCache = previewCache;

const PREVIEW_CACHE_TTL_MS = 10 * 60 * 1_000;

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
): Omit<Prisma.HoleCreateManyInput, "courseId" | "layoutId"> {
  return {
    holeNumber: hole.number,
    par: hole.par ?? null,
    distanceFeet: hole.distanceFeet ?? null,
    description: hole.description ?? null
  };
}

function getImportLayouts(result: Awaited<ReturnType<typeof importUdiscCourse>>) {
  return result.layouts.length > 0
    ? result.layouts
    : result.holes.length > 0
      ? [
          {
            name: result.layoutName,
            holes: result.holes
          }
        ]
      : [];
}

function selectedLayoutKeys(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

function filterImportLayouts(
  layouts: ImportedLayout[],
  selectedKeys: string[]
) {
  if (!selectedKeys.length) {
    return layouts;
  }

  const selected = new Set(selectedKeys);
  return layouts.filter((_layout, index) => selected.has(String(index)));
}

function previewLayout(layout: ImportedLayout, index: number) {
  const parTotal = layout.holes.reduce(
    (total, hole) => total + (hole.par ?? 0),
    0
  );
  const distanceFeetTotal = layout.holes.reduce(
    (total, hole) => total + (hole.distanceFeet ?? 0),
    0
  );

  return {
    key: String(index),
    name: layout.name ?? `Layout ${index + 1}`,
    holeCount: layout.holes.length,
    parTotal: parTotal || null,
    distanceFeetTotal: distanceFeetTotal || null
  };
}

function cleanExpiredPreviews() {
  const now = Date.now();

  for (const [token, entry] of previewCache.entries()) {
    if (entry.expiresAt <= now) {
      previewCache.delete(token);
    }
  }
}

function cachePreview(
  userId: number,
  result: Awaited<ReturnType<typeof importUdiscCourse>>
) {
  cleanExpiredPreviews();
  const token = randomUUID();
  previewCache.set(token, {
    userId,
    result,
    expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS
  });

  return token;
}

async function createImportedCourse({
  currentUserId,
  result,
  selectedKeys
}: {
  currentUserId: number;
  result: Awaited<ReturnType<typeof importUdiscCourse>>;
  selectedKeys: string[];
}) {
  const availableLayouts = getImportLayouts(result);
  const importedLayouts = filterImportLayouts(availableLayouts, selectedKeys);

  if (availableLayouts.length > 0 && importedLayouts.length === 0) {
    throw new UdiscImportValidationError("Choose at least one layout to import.");
  }

  const firstLayout = importedLayouts[0];
  const warnings = [
    ...result.warnings,
    "Review the imported draft before submitting it for admin approval."
  ];
  const course = await prisma.$transaction(async (tx) => {
    const createdCourse = await tx.course.create({
        data: {
          name: result.courseName ?? "Imported UDisc course",
          locationName: result.locationName ?? "Imported from UDisc",
          locationAddress: result.locationAddress ?? null,
          latitude: result.latitude ?? null,
          longitude: result.longitude ?? null,
          difficulty: CourseDifficulty.mixed,
        status: "draft",
        layoutName: firstLayout?.name ?? result.layoutName ?? null,
        importSourceUrl: result.sourceUrl,
        importWarnings: warnings,
        submittedById: currentUserId
      },
      select: { id: true }
    });

    if (!importedLayouts.length && result.holes.length) {
      await tx.hole.createMany({
        data: result.holes.map((hole) => ({
          ...toHoleCreateInput(hole),
          courseId: createdCourse.id
        }))
      });
    }

    for (const [index, layout] of importedLayouts.entries()) {
      const createdLayout = await tx.courseLayout.create({
        data: {
          courseId: createdCourse.id,
          name: layout.name?.trim() || `Layout ${index + 1}`,
          sortOrder: index,
          sourceLayoutId: layout.sourceLayoutId ?? null
        },
        select: { id: true }
      });

      if (layout.holes.length) {
        await tx.hole.createMany({
          data: layout.holes.map((hole) => ({
            ...toHoleCreateInput(hole),
            courseId: createdCourse.id,
            layoutId: createdLayout.id
          }))
        });
      }
    }

    return createdCourse;
  });

  return {
    course,
    warnings,
    result: {
      ...result,
      layoutName: firstLayout?.name ?? result.layoutName,
      holes: firstLayout?.holes ?? result.holes,
      layouts: importedLayouts
    }
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

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send a UDisc URL to import" }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();
  const previewToken = String(body.previewToken ?? "").trim();
  const wantsPreview = body.preview === true;
  const selectedKeys = selectedLayoutKeys(body.selectedLayoutKeys);

  if (!url && !previewToken) {
    return NextResponse.json({ error: "Paste a UDisc URL to import" }, { status: 400 });
  }

  try {
    if (previewToken) {
      cleanExpiredPreviews();
      const cached = previewCache.get(previewToken);

      if (!cached || cached.userId !== currentUser.id) {
        return NextResponse.json(
          { error: "That import preview expired. Read the UDisc link again." },
          { status: 410 }
        );
      }

      const { course, warnings, result } = await createImportedCourse({
        currentUserId: currentUser.id,
        result: cached.result,
        selectedKeys
      });

      previewCache.delete(previewToken);

      return NextResponse.json(
        {
          courseId: course.id,
          redirectTo: `/courses/${course.id}/edit`,
          result: { ...result, warnings }
        },
        { status: 201 }
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

    const result = await importUdiscCourse(url);

    if (wantsPreview) {
      const layouts = getImportLayouts(result);
      const token = cachePreview(currentUser.id, result);

      return NextResponse.json({
        preview: {
          token,
          courseName: result.courseName ?? "Imported UDisc course",
          sourceUrl: result.sourceUrl,
          warnings: result.warnings,
          layouts: layouts.map(previewLayout)
        }
      });
    }

    const { course, warnings, result: createdResult } = await createImportedCourse({
      currentUserId: currentUser.id,
      result,
      selectedKeys
    });

    return NextResponse.json(
      {
        courseId: course.id,
        redirectTo: `/courses/${course.id}/edit`,
        result: { ...createdResult, warnings }
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

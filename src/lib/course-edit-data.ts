import { CourseDifficulty, Prisma } from "@prisma/client";
import { booleanInput } from "@/lib/course-facts";

export type NormalizedCourseHole = {
  holeNumber: number;
  par: number | null;
  distanceFeet: number | null;
  description: string | null;
  teePhotoUrl: string | null;
};

export type NormalizedCourseLayout = {
  name: string;
  holes: NormalizedCourseHole[];
};

export type NormalizedCourseEdit = {
  name: string;
  locationName: string;
  locationAddress: string | null;
  description: string | null;
  layoutName: string | null;
  coverPhotoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  difficulty: CourseDifficulty;
  hasParking: boolean;
  hasBathrooms: boolean;
  hasWater: boolean;
  cartFriendly: boolean;
  dogFriendly: boolean;
  beginnerFriendly: boolean;
  isPayToPlay: boolean;
  holes: NormalizedCourseHole[];
  layouts: NormalizedCourseLayout[];
};

export function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeCourseEditInput(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const locationName = String(body.locationName ?? "").trim();
  const locationAddress = String(body.locationAddress ?? "").trim();
  const description = String(body.description ?? "").trim();
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

  return {
    name,
    locationName,
    locationAddress: locationAddress || null,
    description: description || null,
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
    holes,
    layouts
  } satisfies NormalizedCourseEdit;
}

export function courseEditValidationError(
  edit: NormalizedCourseEdit,
  { requireHoles }: { requireHoles: boolean }
) {
  if (edit.name.length < 2 || edit.locationName.length < 2) {
    return "Course name and location are required";
  }

  if (requireHoles && edit.holes.length === 0 && edit.layouts.length === 0) {
    return "Add at least one hole before submitting for review";
  }

  return null;
}

export function courseEditToJson(edit: NormalizedCourseEdit) {
  return edit as unknown as Prisma.InputJsonValue;
}

export function normalizeCourseEditProposalNotes(value: unknown) {
  const notes = String(value ?? "").trim();

  return notes || null;
}

export function courseEditFromJson(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Course edit proposal data is invalid.");
  }

  return normalizeCourseEditInput(value as Record<string, unknown>);
}

export async function applyCourseEdit(
  tx: Prisma.TransactionClient,
  courseId: number,
  edit: NormalizedCourseEdit,
  options?: { status?: "draft" | "pending" | "approved" | "rejected" }
) {
  await tx.course.update({
    where: { id: courseId },
    data: {
      name: edit.name,
      locationName: edit.locationName,
      locationAddress: edit.locationAddress,
      description: edit.description,
      layoutName: edit.layoutName,
      coverPhotoUrl: edit.coverPhotoUrl,
      latitude: edit.latitude,
      longitude: edit.longitude,
      difficulty: edit.difficulty,
      hasParking: edit.hasParking,
      hasBathrooms: edit.hasBathrooms,
      hasWater: edit.hasWater,
      cartFriendly: edit.cartFriendly,
      dogFriendly: edit.dogFriendly,
      beginnerFriendly: edit.beginnerFriendly,
      isPayToPlay: edit.isPayToPlay,
      ...(options?.status ? { status: options.status } : {})
    }
  });

  await tx.hole.deleteMany({ where: { courseId } });
  await tx.courseLayout.deleteMany({ where: { courseId } });

  if (edit.layouts.length) {
    for (const [index, layout] of edit.layouts.entries()) {
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
  } else if (edit.holes.length) {
    await tx.hole.createMany({
      data: edit.holes.map((hole) => ({
        ...hole,
        courseId
      })) as Prisma.HoleCreateManyInput[]
    });
  }
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
  } satisfies NormalizedCourseHole;
}

function normalizeLayout(rawLayout: unknown, index: number) {
  const layout = rawLayout as Record<string, unknown>;
  const rawHoles = Array.isArray(layout.holes) ? layout.holes : [];
  const name = String(layout.name ?? "").trim() || `Layout ${index + 1}`;
  const holes = rawHoles
    .map(normalizeHole)
    .filter((hole) => Number.isInteger(hole.holeNumber) && hole.holeNumber > 0)
    .slice(0, 72);

  return { name, holes } satisfies NormalizedCourseLayout;
}

function dedupeLayoutNames(layouts: NormalizedCourseLayout[]) {
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

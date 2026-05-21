import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  CourseDraftEditor,
  type CourseDraftEditorCourse
} from "@/components/CourseDraftEditor";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type CourseEditPageProps = {
  params: {
    courseId: string;
  };
};

export default async function CourseEditPage({ params }: CourseEditPageProps) {
  const courseId = Number(params.courseId);

  if (!Number.isInteger(courseId)) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      holes: {
        where: { layoutId: null },
        orderBy: { holeNumber: "asc" }
      },
      layouts: {
        include: {
          holes: { orderBy: { holeNumber: "asc" } }
        },
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!course) {
    notFound();
  }

  const isProposalMode = course.status === "approved";

  if (!isProposalMode && !currentUser) {
    redirect(`/login?redirectTo=/courses/${courseId}/edit`);
  }

  if (
    !isProposalMode &&
    currentUser &&
    course.submittedById !== currentUser.id &&
    !currentUser.isAdmin
  ) {
    notFound();
  }

  const displayHoles = course.layouts[0]?.holes ?? course.holes;
  const editorCourse: CourseDraftEditorCourse = {
    id: course.id,
    name: course.name,
    locationName: course.locationName,
    locationAddress: course.locationAddress,
    description: course.description,
    layoutName: course.layouts[0]?.name ?? course.layoutName,
    latitude: course.latitude,
    longitude: course.longitude,
    coverPhotoUrl: course.coverPhotoUrl,
    difficulty: course.difficulty,
    hasParking: course.hasParking,
    hasBathrooms: course.hasBathrooms,
    hasWater: course.hasWater,
    cartFriendly: course.cartFriendly,
    dogFriendly: course.dogFriendly,
    beginnerFriendly: course.beginnerFriendly,
    isPayToPlay: course.isPayToPlay,
    status: course.status,
    importSourceUrl: course.importSourceUrl,
    importWarnings: course.importWarnings,
    holes: displayHoles.map((hole) => ({
      id: hole.id,
      holeNumber: hole.holeNumber,
      par: hole.par,
      distanceFeet: hole.distanceFeet,
      description: hole.description,
      teePhotoUrl: hole.teePhotoUrl
    })),
    layouts: course.layouts.map((layout) => ({
      id: layout.id,
      name: layout.name,
      holes: layout.holes.map((hole) => ({
        id: hole.id,
        holeNumber: hole.holeNumber,
        par: hole.par,
        distanceFeet: hole.distanceFeet,
        description: hole.description,
        teePhotoUrl: hole.teePhotoUrl
      }))
    }))
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href={`/courses/${course.id}`}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
      >
        <ArrowLeft size={16} aria-hidden />
        Course page
      </Link>

      <CourseDraftEditor
        initialCourse={editorCourse}
        mode={isProposalMode ? "proposal" : "draft"}
      />
    </main>
  );
}

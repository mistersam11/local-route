import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubmitCourseForm } from "@/components/SubmitCourseForm";
import { getDemoUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const demoUserId = await getDemoUserId();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
      >
        <ArrowLeft size={16} aria-hidden />
        Courses
      </Link>

      <section>
        <p className="text-sm font-bold uppercase text-clay-700">Submit a course</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ink sm:text-5xl">
          Add a course for community review
        </h1>
      </section>

      <SubmitCourseForm currentUserId={demoUserId} />
    </main>
  );
}

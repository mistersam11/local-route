import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { SubmitCourseForm } from "@/components/SubmitCourseForm";
import { UdiscImportForm } from "@/components/UdiscImportForm";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const currentUser = await getCurrentUser();

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

      {currentUser ? (
        <>
          <UdiscImportForm />
          <div className="flex items-center gap-3 text-sm font-black uppercase text-ink/45">
            <span className="h-px flex-1 bg-canopy-900/10" />
            Or enter it manually
            <span className="h-px flex-1 bg-canopy-900/10" />
          </div>
          <SubmitCourseForm />
        </>
      ) : (
        <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">Log in to submit a course</h2>
          <p className="font-semibold leading-7 text-ink/65">
            Course submissions are tied to an account so we can show who added them
            and keep moderation sane.
          </p>
          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
            href="/login?redirectTo=/courses/new"
          >
            <LogIn size={16} aria-hidden />
            Log in
          </Link>
        </section>
      )}
    </main>
  );
}

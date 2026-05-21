import Link from "next/link";
import { ArrowRight, Mail, MessageSquare, PencilLine } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
      <section className="rounded-lg bg-[#fffdf7] p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase text-clay-700">Contact</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-ink sm:text-5xl">
          Send feedback, report course issues, or help improve Local Route.
        </h1>
        <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-ink/68">
          Local Route is early, community-shaped, and built to improve as players
          contribute better local information. Use the paths below to send the
          right kind of note.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article
          className="rounded-lg border border-canopy-900/10 bg-white p-5 shadow-sm"
          id="course-corrections"
        >
          <PencilLine className="text-canopy-700" size={24} aria-hidden />
          <h2 className="mt-4 text-xl font-black text-ink">
            Course corrections
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink/62">
            Open a course page and choose Propose edits to submit corrections for
            the name, address, hole count, amenities, difficulty, or notes.
          </p>
          <Link
            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-canopy-700"
            href="/courses"
          >
            Find the course
            <ArrowRight size={15} aria-hidden />
          </Link>
        </article>

        <article className="rounded-lg border border-canopy-900/10 bg-white p-5 shadow-sm">
          <MessageSquare className="text-canopy-700" size={24} aria-hidden />
          <h2 className="mt-4 text-xl font-black text-ink">Product feedback</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink/62">
            Start a chain for feature ideas, confusing workflows, local needs,
            or things that would make the app more useful for your club.
          </p>
          <Link
            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-canopy-700"
            href="/forum?compose=1&intent=feedback"
          >
            Share feedback
            <ArrowRight size={15} aria-hidden />
          </Link>
        </article>

        <article className="rounded-lg border border-canopy-900/10 bg-white p-5 shadow-sm">
          <Mail className="text-canopy-700" size={24} aria-hidden />
          <h2 className="mt-4 text-xl font-black text-ink">Project owner</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink/62">
            For private project notes, use the direct owner contact you already
            have for this Local Route deployment. Keep sensitive details out of
            public chains.
          </p>
        </article>
      </section>
    </main>
  );
}

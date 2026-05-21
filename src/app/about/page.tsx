import Link from "next/link";
import { ArrowRight, ListChecks, MapPin, MessageSquare } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
      <section className="rounded-lg bg-[#fffdf7] p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase text-clay-700">About</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-ink sm:text-5xl">
          Local Route helps disc golfers find the course knowledge that usually
          lives in group chats.
        </h1>
        <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-ink/68">
          Local Route is a community-built disc golf guide focused on real local
          knowledge: course conditions, favorite layouts, casual leagues, and
          player-created lists.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Course Context",
            body: "Course pages collect hole counts, amenities, difficulty, reviews, photos, and practical notes in one place.",
            icon: MapPin
          },
          {
            title: "Shared Routes",
            body: "Players can save favorites and publish course lists for road trips, skill practice, and local recommendations.",
            icon: ListChecks
          },
          {
            title: "Community Chains",
            body: "Chains keep events, conditions, and local advice connected to the courses people actually play.",
            icon: MessageSquare
          }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article
              className="rounded-lg border border-canopy-900/10 bg-white p-5 shadow-sm"
              key={item.title}
            >
              <Icon className="text-canopy-700" size={24} aria-hidden />
              <h2 className="mt-4 text-xl font-black text-ink">{item.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink/62">
                {item.body}
              </p>
            </article>
          );
        })}
      </section>

      <Link
        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
        href="/courses"
      >
        Explore Courses
        <ArrowRight size={16} aria-hidden />
      </Link>
    </main>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 lg:py-14">
      <section className="rounded-lg bg-[#fffdf7] p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase text-clay-700">Terms</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
          Local Route community terms
        </h1>
        <p className="mt-5 text-base font-semibold leading-8 text-ink/68">
          Local Route is built for useful, respectful disc golf information. By
          using it, you agree to contribute honestly, respect other players, and
          avoid posting content that is abusive, misleading, unlawful, or unsafe.
        </p>
      </section>

      <section className="grid gap-4">
        {[
          {
            title: "Community content",
            body: "You are responsible for the reviews, posts, lists, event details, photos, and edit proposals you submit. Keep information practical, accurate, and appropriate for other players."
          },
          {
            title: "Course information",
            body: "Course details may come from community submissions and should be treated as helpful guidance rather than official facility notices. Confirm closures, fees, and event details before traveling."
          },
          {
            title: "Moderation",
            body: "Local Route may hide, remove, or review content that appears inaccurate, abusive, spammy, unsafe, or outside the purpose of the community."
          },
          {
            title: "Early-stage service",
            body: "The app may change as the project grows. Features, data, and availability are provided as-is while Local Route develops into a stronger public directory."
          }
        ].map((section) => (
          <article
            className="rounded-lg border border-canopy-900/10 bg-white p-5 shadow-sm"
            key={section.title}
          >
            <h2 className="text-xl font-black text-ink">{section.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/62">
              {section.body}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}

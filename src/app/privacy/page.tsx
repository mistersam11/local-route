export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 lg:py-14">
      <section className="rounded-lg bg-[#fffdf7] p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase text-clay-700">Privacy</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
          Local Route privacy overview
        </h1>
        <p className="mt-5 text-base font-semibold leading-8 text-ink/68">
          Local Route collects the information needed to run a community disc golf
          directory: account details, profile content, course reviews, lists,
          event RSVPs, forum posts, course submissions, edit proposals, and basic
          security logs.
        </p>
      </section>

      <section className="grid gap-4">
        {[
          {
            title: "What is public",
            body: "Your username, profile details you choose to share, public lists, course reviews, forum posts, event activity, and submitted course information may be visible to other users."
          },
          {
            title: "What is used to operate the app",
            body: "Email addresses, sessions, moderation reports, edit proposals, and security signals are used for account access, abuse prevention, moderation, and support."
          },
          {
            title: "Photos and external services",
            body: "Uploaded or linked images may be stored or delivered through third-party media services. Public placeholder photos may include photographer attribution."
          },
          {
            title: "Your choices",
            body: "You can update profile information, avoid posting sensitive personal details, and request that inaccurate course information be corrected through edit proposals."
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

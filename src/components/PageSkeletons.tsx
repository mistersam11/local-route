import clsx from "clsx";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-canopy-900/10", className)} />;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_item, index) => (
        <article
          className="min-h-80 overflow-hidden rounded-lg border border-canopy-900/10 bg-[#fffdf7] shadow-sm"
          key={index}
        >
          <SkeletonBlock className="h-40 rounded-none" />
          <div className="grid gap-4 p-5">
            <SkeletonBlock className="h-7 w-3/4" />
            <SkeletonBlock className="h-4 w-1/2" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-7 w-20 rounded-full" />
              <SkeletonBlock className="h-7 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="h-12 w-full" />
          </div>
        </article>
      ))}
    </section>
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }, (_item, index) => (
        <article
          className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm"
          key={index}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="grid flex-1 gap-3">
              <div className="flex gap-2">
                <SkeletonBlock className="h-7 w-24 rounded-full" />
                <SkeletonBlock className="h-7 w-20 rounded-full" />
              </div>
              <SkeletonBlock className="h-8 w-3/4" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>
            <SkeletonBlock className="h-8 w-16 rounded-full" />
          </div>
          <SkeletonBlock className="h-8 w-48" />
        </article>
      ))}
    </div>
  );
}

export function AppLoadingSkeleton() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <section className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-end">
        <div className="grid gap-3">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-12 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-14 w-full rounded-full" />
      </section>
      <CardGridSkeleton />
    </main>
  );
}

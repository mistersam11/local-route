"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";

type ForumSearchFormProps = {
  includeEvents: boolean;
  query: string;
};

export function ForumSearchForm({
  includeEvents: initialIncludeEvents,
  query: initialQuery
}: ForumSearchFormProps) {
  const router = useRouter();
  const [advancedOpen, setAdvancedOpen] = useState(!initialIncludeEvents);
  const [includeEvents, setIncludeEvents] = useState(initialIncludeEvents);
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setAdvancedOpen(!initialIncludeEvents);
    setIncludeEvents(initialIncludeEvents);
    setQuery(initialQuery);
  }, [initialIncludeEvents, initialQuery]);

  function forumHref(nextIncludeEvents: boolean) {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (!nextIncludeEvents) {
      params.set("includeEvents", "0");
    }

    const queryString = params.toString();
    return queryString ? `/forum?${queryString}` : "/forum";
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(forumHref(includeEvents));
  }

  function changeIncludeEvents(nextIncludeEvents: boolean) {
    setIncludeEvents(nextIncludeEvents);
    setAdvancedOpen(true);
    router.push(forumHref(nextIncludeEvents));
  }

  return (
    <form className="grid gap-2" onSubmit={submit}>
      <div className="flex min-h-14 overflow-hidden rounded-full border border-white/15 bg-white/95 shadow-panel backdrop-blur">
        <label className="flex min-w-0 flex-1 items-center gap-3 px-5">
          <Search size={20} className="shrink-0 text-canopy-700" aria-hidden />
          <input
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/45"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chains"
            value={query}
          />
        </label>
        <button
          aria-expanded={advancedOpen}
          aria-label="Advanced search"
          className={clsx(
            "m-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition",
            advancedOpen
              ? "bg-canopy-700 text-white"
              : "bg-canopy-50 text-canopy-700 hover:bg-canopy-100"
          )}
          onClick={() => setAdvancedOpen((current) => !current)}
          title="Advanced search"
          type="button"
        >
          <SlidersHorizontal size={18} aria-hidden />
        </button>
        <button
          className="m-1 inline-flex items-center justify-center rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-canopy-700"
          type="submit"
        >
          Search
        </button>
      </div>

      {advancedOpen ? (
        <div className="rounded-lg border border-white/20 bg-white/95 p-3 text-ink shadow-panel backdrop-blur">
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-md px-2 text-sm font-black">
            <span>Include event posts</span>
            <input
              checked={includeEvents}
              className="h-5 w-5 accent-canopy-700"
              onChange={(event) => changeIncludeEvents(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
      ) : null}
    </form>
  );
}

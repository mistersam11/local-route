import Link from "next/link";
import { LogIn, Search } from "lucide-react";
import {
  ForumFeedList,
  type ForumFeedClientItem
} from "@/components/ForumFeedList";
import { ForumComposer } from "@/components/ForumComposer";
import { ForumRulesModal } from "@/components/ForumRulesModal";
import { getCurrentUser } from "@/lib/current-user";
import {
  getPersonalizedForumFeed,
  normalizeForumFeedPage,
  serializeForumFeedItem
} from "@/lib/forum-feed";

export const dynamic = "force-dynamic";

type ForumPageProps = {
  searchParams?: {
    q?: string;
    page?: string;
    compose?: string;
    intent?: string;
  };
};

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const query = searchParams?.q?.trim() ?? "";
  const page = normalizeForumFeedPage(searchParams?.page);
  const currentUser = await getCurrentUser();
  const feed = await getPersonalizedForumFeed({
    userId: currentUser?.id,
    query,
    page
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <ForumRulesModal userKey={currentUser ? String(currentUser.id) : "guest"} />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-clay-700">Chains</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            Talk disc golf
          </h1>
        </div>
        <form
          action="/forum"
          className="flex min-h-14 overflow-hidden rounded-full border border-canopy-900/10 bg-white shadow-panel"
        >
          <label className="flex flex-1 items-center gap-3 px-5">
            <Search size={20} className="shrink-0 text-canopy-700" aria-hidden />
            <input
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/45"
              defaultValue={query}
              name="q"
              placeholder="Search chains"
            />
          </label>
          <button
            className="m-1 inline-flex items-center justify-center rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-canopy-700"
            type="submit"
          >
            Search
          </button>
        </form>
      </section>

      {currentUser ? (
        <ForumComposer
          initialOpen={searchParams?.compose === "1"}
          intent={searchParams?.intent}
        />
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-ink">Join the conversation</h2>
            <p className="mt-1 text-sm font-semibold text-ink/60">
              Log in to start chains and comment.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
            href="/login?redirectTo=/forum"
          >
            <LogIn size={16} aria-hidden />
            Log in
          </Link>
        </section>
      )}

      <ForumFeedList
        hasPersonalizationSignals={feed.hasPersonalizationSignals}
        initialItems={
          feed.items.map(serializeForumFeedItem) as ForumFeedClientItem[]
        }
        initialNextPage={feed.nextPage}
        query={query}
      />
    </main>
  );
}

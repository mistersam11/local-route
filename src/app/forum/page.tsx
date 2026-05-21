import Link from "next/link";
import { LogIn } from "lucide-react";
import {
  ForumFeedList,
  type ForumFeedClientItem
} from "@/components/ForumFeedList";
import { ForumComposer } from "@/components/ForumComposer";
import { ForumRulesModal } from "@/components/ForumRulesModal";
import { ForumSearchForm } from "@/components/ForumSearchForm";
import { PageCoverHeader } from "@/components/PageCoverHeader";
import { getCurrentUser } from "@/lib/current-user";
import {
  getPersonalizedForumFeed,
  normalizeForumFeedIncludeEvents,
  normalizeForumFeedPage,
  serializeForumFeedItem
} from "@/lib/forum-feed";
import { getCoursePlaceholderImage } from "@/lib/placeholder-images";

export const dynamic = "force-dynamic";

type ForumPageProps = {
  searchParams?: {
    q?: string;
    page?: string;
    compose?: string;
    intent?: string;
    includeEvents?: string;
  };
};

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const query = searchParams?.q?.trim() ?? "";
  const includeEvents = normalizeForumFeedIncludeEvents(
    searchParams?.includeEvents
  );
  const page = normalizeForumFeedPage(searchParams?.page);
  const currentUser = await getCurrentUser();
  const feed = await getPersonalizedForumFeed({
    userId: currentUser?.id,
    includeEvents,
    query,
    page
  });
  const forumCoverPlaceholder = getCoursePlaceholderImage({
    id: "forum-cover",
    name: "Local Route disc golf conversations",
    locationName: "Community chains",
    dogFriendly: true,
    hasParking: true
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <ForumRulesModal userKey={currentUser ? String(currentUser.id) : "guest"} />

      <PageCoverHeader
        eyebrow="Chains"
        placeholder={forumCoverPlaceholder}
        title="Talk disc golf"
      >
        <ForumSearchForm includeEvents={includeEvents} query={query} />
      </PageCoverHeader>

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
        includeEvents={includeEvents}
        initialItems={
          feed.items.map(serializeForumFeedItem) as ForumFeedClientItem[]
        }
        initialNextPage={feed.nextPage}
        query={query}
      />
    </main>
  );
}

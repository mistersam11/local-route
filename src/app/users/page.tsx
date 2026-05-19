import { ContentStatus } from "@prisma/client";
import Link from "next/link";
import { MapPin, Search, UsersRound } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { getCurrentUser, getFollowingIds } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type UsersPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const query = searchParams?.q?.trim() ?? "";
  const currentUser = await getCurrentUser();
  const [followingIds, users] = await Promise.all([
    getFollowingIds(currentUser?.id),
    prisma.user.findMany({
      where: query
        ? {
            OR: [
              { username: { contains: query } },
              { homeCourseName: { contains: query } },
              { bio: { contains: query } }
            ]
          }
        : {},
      select: {
        id: true,
        username: true,
        profileImageUrl: true,
        bio: true,
        homeCourseName: true,
        _count: {
          select: {
            followers: true,
            courseReviews: { where: { status: ContentStatus.visible } },
            holeReviews: { where: { status: ContentStatus.visible } },
            lines: { where: { status: ContentStatus.visible } }
          }
        }
      },
      orderBy: { username: "asc" },
      take: 60
    })
  ]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-clay-700">Users</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            Find friends and local players
          </h1>
        </div>
        <form
          action="/users"
          className="flex min-h-14 overflow-hidden rounded-full border border-canopy-900/10 bg-white shadow-panel"
        >
          <label className="flex flex-1 items-center gap-3 px-5">
            <Search size={20} className="shrink-0 text-canopy-700" aria-hidden />
            <input
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/45"
              defaultValue={query}
              name="q"
              placeholder="Search username, bio, or home course"
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

      <section className="grid gap-4 md:grid-cols-2">
        {users.map((user) => (
          <article
            className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm"
            key={user.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <Link
                className="flex min-w-0 items-center gap-3 transition hover:text-canopy-700"
                href={`/profiles/${user.id}`}
              >
                <Avatar
                  name={user.username}
                  size="lg"
                  src={user.profileImageUrl}
                />
                <span className="min-w-0">
                  <span className="block truncate text-2xl font-black text-ink">
                    @{user.username}
                  </span>
                  {user.homeCourseName ? (
                    <span className="mt-1 flex items-center gap-1 text-sm font-bold text-canopy-700">
                      <MapPin size={14} aria-hidden />
                      {user.homeCourseName}
                    </span>
                  ) : null}
                </span>
              </Link>
              <FollowButton
                currentUserId={currentUser?.id}
                initialIsFollowing={followingIds.has(user.id)}
                targetUserId={user.id}
              />
            </div>

            {user.bio ? (
              <p className="text-sm font-semibold leading-6 text-ink/65">{user.bio}</p>
            ) : null}

            <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
              <span className="rounded-full bg-canopy-50 px-2.5 py-1 text-canopy-700">
                {user._count.followers} followers
              </span>
              <span className="rounded-full bg-water-100 px-2.5 py-1 text-water-700">
                {user._count.courseReviews + user._count.holeReviews} reviews
              </span>
              <span className="rounded-full bg-clay-100 px-2.5 py-1 text-clay-700">
                {user._count.lines} lines
              </span>
            </div>
          </article>
        ))}
      </section>

      {!users.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <UsersRound className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">No users found</h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            Try another username, course, or keyword.
          </p>
        </section>
      ) : null}
    </main>
  );
}

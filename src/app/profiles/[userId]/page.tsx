import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Disc3, MapPin, Star } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { Stars } from "@/components/Stars";
import { DEMO_USER_ID, getFollowingIds } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { serializeLine } from "@/lib/social-data";

type ProfilePageProps = {
  params: {
    userId: string;
  };
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const userId = Number(params.userId);

  if (!Number.isInteger(userId)) {
    notFound();
  }

  const [followingIds, user] = await Promise.all([
    getFollowingIds(DEMO_USER_ID),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        profileImageUrl: true,
        createdAt: true,
        lines: {
          include: {
            user: { select: { id: true, username: true, profileImageUrl: true } },
            hole: {
              select: {
                id: true,
                holeNumber: true,
                course: { select: { id: true, name: true, locationName: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        courseReviews: {
          include: {
            course: { select: { id: true, name: true, locationName: true } },
            user: { select: { id: true, username: true, profileImageUrl: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        following: {
          include: {
            following: {
              select: { id: true, username: true, profileImageUrl: true }
            }
          }
        },
        followers: { select: { followerId: true } }
      }
    })
  ]);

  if (!user) {
    notFound();
  }

  const createdAt = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric"
  }).format(user.createdAt);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
      >
        <ArrowLeft size={16} aria-hidden />
        Courses
      </Link>

      <section className="flex flex-col gap-5 rounded-lg bg-[#fffdf7] p-6 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={user.username} size="lg" src={user.profileImageUrl} />
          <div>
            <h1 className="text-3xl font-black text-ink">@{user.username}</h1>
            <p className="mt-2 flex flex-wrap gap-4 text-sm font-semibold text-ink/60">
              <span className="flex items-center gap-2">
                <CalendarDays size={16} aria-hidden />
                {createdAt}
              </span>
              <span>{user.followers.length} followers</span>
              <span>{user.following.length} following</span>
            </p>
          </div>
        </div>
        <FollowButton
          currentUserId={DEMO_USER_ID}
          initialIsFollowing={followingIds.has(user.id)}
          targetUserId={user.id}
        />
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black text-ink">Reviews</h2>
              <span className="rounded-full bg-clay-100 px-3 py-1 text-sm font-bold text-clay-700">
                {user.courseReviews.length}
              </span>
            </div>
            <div className="grid gap-3">
              {user.courseReviews.map((review) => (
                <Link
                  className="rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm transition hover:shadow-panel"
                  href={`/courses/${review.course.id}`}
                  key={review.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-ink">
                      {review.title ?? review.course.name}
                    </h3>
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <Stars rating={review.rating} />
                      {review.rating}/10
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink/60">
                    <MapPin size={15} aria-hidden />
                    {review.course.name}
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-ink/65">
                    {review.body}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black text-ink">Suggested Lines</h2>
              <span className="rounded-full bg-water-100 px-3 py-1 text-sm font-bold text-water-700">
                {user.lines.length}
              </span>
            </div>
            <div className="grid gap-3">
              {user.lines.map((entry) => {
                const line = serializeLine(entry, followingIds);

                return (
                  <Link
                    className="rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm transition hover:shadow-panel"
                    href={`/holes/${entry.hole.id}`}
                    key={entry.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-black text-ink">{line.name}</h3>
                      <span className="rounded-full bg-canopy-50 px-3 py-1 text-sm font-bold text-canopy-700">
                        {line.score > 0 ? "+" : ""}
                        {line.score}
                      </span>
                    </div>
                    <p className="mt-2 flex flex-wrap gap-3 text-sm font-semibold text-ink/60">
                      <span className="flex items-center gap-1">
                        <MapPin size={15} aria-hidden />
                        {entry.hole.course.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Disc3 size={15} aria-hidden />
                        Hole {entry.hole.holeNumber}
                      </span>
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside>
          <h2 className="mb-4 text-2xl font-black text-ink">Following</h2>
          <div className="grid gap-3">
            {user.following.map((follow) => (
              <Link
                className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm transition hover:bg-canopy-50"
                href={`/profiles/${follow.following.id}`}
                key={follow.following.id}
              >
                <Avatar
                  name={follow.following.username}
                  size="sm"
                  src={follow.following.profileImageUrl}
                />
                <span className="font-bold">@{follow.following.username}</span>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

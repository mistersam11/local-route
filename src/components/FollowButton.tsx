"use client";

import { useState } from "react";
import Link from "next/link";
import { UserMinus, UserPlus } from "lucide-react";

type FollowButtonProps = {
  targetUserId: number;
  currentUserId?: number | null;
  initialIsFollowing: boolean;
};

export function FollowButton({
  targetUserId,
  currentUserId,
  initialIsFollowing
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, setIsPending] = useState(false);
  const isSelf = targetUserId === currentUserId;

  function toggleFollow() {
    if (isSelf || !currentUserId || isPending) return;

    const previous = isFollowing;
    const nextFollowing = !isFollowing;
    setIsPending(true);
    setIsFollowing(nextFollowing);

    void (async () => {
      try {
        const response = await fetch(`/api/users/${targetUserId}/follow`, {
          method: nextFollowing ? "POST" : "DELETE"
        });

        if (!response.ok) {
          setIsFollowing(previous);
          return;
        }

        const payload = (await response.json()) as { following: boolean };
        setIsFollowing(payload.following);
      } catch {
        setIsFollowing(previous);
      } finally {
        setIsPending(false);
      }
    })();
  }

  return currentUserId ? (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white transition hover:bg-canopy-700 disabled:cursor-not-allowed disabled:bg-ink/25"
      disabled={isSelf || isPending}
      onClick={toggleFollow}
      type="button"
    >
      {isFollowing ? <UserMinus size={16} aria-hidden /> : <UserPlus size={16} aria-hidden />}
      {isSelf ? "You" : isFollowing ? "Following" : "Follow"}
    </button>
  ) : (
    <Link
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white transition hover:bg-canopy-700"
      href="/login"
    >
      <UserPlus size={16} aria-hidden />
      Sign in to follow
    </Link>
  );
}

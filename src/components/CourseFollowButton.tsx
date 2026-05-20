"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { applyCourseFollowTransition } from "@/lib/course-community-shared";

type CourseFollowButtonProps = {
  courseId: number;
  currentUserId?: number | null;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
};

export function CourseFollowButton({
  courseId,
  currentUserId,
  initialIsFollowing,
  initialFollowerCount
}: CourseFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isPending, setIsPending] = useState(false);

  function toggleFollow() {
    if (!currentUserId || isPending) return;

    const nextFollowing = !isFollowing;
    setIsPending(true);
    setIsFollowing(nextFollowing);
    setFollowerCount((current) =>
      applyCourseFollowTransition(current, isFollowing, nextFollowing)
    );

    void (async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/follow`, {
          method: nextFollowing ? "POST" : "DELETE"
        });

        if (!response.ok) {
          setIsFollowing(isFollowing);
          setFollowerCount((current) =>
            applyCourseFollowTransition(current, nextFollowing, isFollowing)
          );
          return;
        }

        const payload = (await response.json()) as {
          following: boolean;
          followerCount: number;
        };
        setIsFollowing(payload.following);
        setFollowerCount(payload.followerCount);
      } finally {
        setIsPending(false);
      }
    })();
  }

  if (!currentUserId) {
    return (
      <Link
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700"
        href={`/login?redirectTo=/courses/${courseId}/forum`}
      >
        <Bell size={16} aria-hidden />
        Follow course
      </Link>
    );
  }

  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition disabled:opacity-60 ${
        isFollowing
          ? "bg-canopy-700 text-white hover:bg-canopy-900"
          : "bg-white text-ink shadow-sm hover:bg-canopy-50 hover:text-canopy-700"
      }`}
      disabled={isPending}
      onClick={toggleFollow}
      type="button"
    >
      {isFollowing ? <BellOff size={16} aria-hidden /> : <Bell size={16} aria-hidden />}
      {isPending ? "Saving" : isFollowing ? "Following" : "Follow course"}
      <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-ink">
        {followerCount}
      </span>
    </button>
  );
}

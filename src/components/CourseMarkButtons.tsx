"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MapPinned } from "lucide-react";

type CourseMarkType = "played" | "wantToPlay";

type CourseMarkButtonsProps = {
  courseId: number;
  currentUserId?: number | null;
  initialPlayed: boolean;
  initialWantToPlay: boolean;
  initialPlayedCount: number;
  initialWantToPlayCount: number;
};

export function CourseMarkButtons({
  courseId,
  currentUserId,
  initialPlayed,
  initialWantToPlay,
  initialPlayedCount,
  initialWantToPlayCount
}: CourseMarkButtonsProps) {
  const [played, setPlayed] = useState(initialPlayed);
  const [wantToPlay, setWantToPlay] = useState(initialWantToPlay);
  const [playedCount, setPlayedCount] = useState(initialPlayedCount);
  const [wantToPlayCount, setWantToPlayCount] = useState(initialWantToPlayCount);
  const [saving, setSaving] = useState<CourseMarkType | null>(null);

  function transitionCount(current: number, wasActive: boolean, nextActive: boolean) {
    if (wasActive === nextActive) {
      return current;
    }

    return Math.max(0, current + (nextActive ? 1 : -1));
  }

  function toggle(type: CourseMarkType) {
    if (!currentUserId || saving) return;

    const previous = {
      played,
      wantToPlay,
      playedCount,
      wantToPlayCount
    };
    const nextPlayed = type === "played" ? !played : played;
    const nextWantToPlay = type === "wantToPlay" ? !wantToPlay : wantToPlay;
    setSaving(type);
    setPlayed(nextPlayed);
    setWantToPlay(nextWantToPlay);
    setPlayedCount((current) => transitionCount(current, played, nextPlayed));
    setWantToPlayCount((current) =>
      transitionCount(current, wantToPlay, nextWantToPlay)
    );

    void (async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/marks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ type })
        });

        if (!response.ok) {
          setPlayed(previous.played);
          setWantToPlay(previous.wantToPlay);
          setPlayedCount(previous.playedCount);
          setWantToPlayCount(previous.wantToPlayCount);
          return;
        }

        const payload = (await response.json()) as {
          played: boolean;
          wantToPlay: boolean;
          playedCount: number;
          wantToPlayCount: number;
        };
        setPlayed(payload.played);
        setWantToPlay(payload.wantToPlay);
        setPlayedCount(payload.playedCount);
        setWantToPlayCount(payload.wantToPlayCount);
      } catch {
        setPlayed(previous.played);
        setWantToPlay(previous.wantToPlay);
        setPlayedCount(previous.playedCount);
        setWantToPlayCount(previous.wantToPlayCount);
      } finally {
        setSaving(null);
      }
    })();
  }

  if (!currentUserId) {
    return (
      <Link
        className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700"
        href={`/login?redirectTo=/courses/${courseId}`}
      >
        Log in to track this course
      </Link>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition disabled:opacity-60 ${
          played
            ? "bg-canopy-700 text-white"
            : "bg-canopy-50 text-canopy-700 hover:bg-canopy-100"
        }`}
        disabled={Boolean(saving)}
        onClick={() => toggle("played")}
        type="button"
      >
        <CheckCircle2 size={16} aria-hidden />
        {saving === "played" ? "Saving" : played ? "Played" : "Played here"}
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-ink">
          {playedCount}
        </span>
      </button>
      <button
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition disabled:opacity-60 ${
          wantToPlay
            ? "bg-clay-700 text-white"
            : "bg-clay-100 text-clay-700 hover:bg-clay-300/45"
        }`}
        disabled={Boolean(saving)}
        onClick={() => toggle("wantToPlay")}
        type="button"
      >
        <MapPinned size={16} aria-hidden />
        {saving === "wantToPlay" ? "Saving" : wantToPlay ? "Want to play" : "Want to play"}
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-ink">
          {wantToPlayCount}
        </span>
      </button>
    </div>
  );
}

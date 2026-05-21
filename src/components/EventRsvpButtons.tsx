"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Star, X } from "lucide-react";

type EventRsvpStatus = "going" | "interested" | null;

type EventRsvpButtonsProps = {
  eventId: number;
  currentUserId?: number | null;
  initialStatus: EventRsvpStatus;
  initialGoingCount: number;
  initialInterestedCount: number;
  maxPlayers?: number | null;
};

export function EventRsvpButtons({
  eventId,
  currentUserId,
  initialStatus,
  initialGoingCount,
  initialInterestedCount,
  maxPlayers
}: EventRsvpButtonsProps) {
  const [status, setStatus] = useState<EventRsvpStatus>(initialStatus);
  const [goingCount, setGoingCount] = useState(initialGoingCount);
  const [interestedCount, setInterestedCount] = useState(initialInterestedCount);
  const [saving, setSaving] = useState<EventRsvpStatus | "none">(null);
  const [error, setError] = useState<string | null>(null);
  const isFull = Boolean(
    maxPlayers && status !== "going" && goingCount >= maxPlayers
  );

  function applyTransition(
    counts: { going: number; interested: number },
    currentStatus: EventRsvpStatus,
    nextStatus: EventRsvpStatus
  ) {
    const next = { ...counts };

    if (currentStatus === nextStatus) {
      return next;
    }

    if (currentStatus === "going") {
      next.going = Math.max(0, next.going - 1);
    }

    if (currentStatus === "interested") {
      next.interested = Math.max(0, next.interested - 1);
    }

    if (nextStatus === "going") {
      next.going += 1;
    }

    if (nextStatus === "interested") {
      next.interested += 1;
    }

    return next;
  }

  function updateRsvp(nextStatus: EventRsvpStatus) {
    if (!currentUserId || saving) return;

    const previous = {
      status,
      goingCount,
      interestedCount
    };
    const optimisticCounts = applyTransition(
      { going: goingCount, interested: interestedCount },
      status,
      nextStatus
    );
    setSaving(nextStatus ?? "none");
    setError(null);
    setStatus(nextStatus);
    setGoingCount(optimisticCounts.going);
    setInterestedCount(optimisticCounts.interested);

    void (async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus ?? "none" })
        });
        const payload = (await response.json()) as {
          currentStatus?: EventRsvpStatus;
          rsvpCounts?: { going: number; interested: number };
          error?: string;
        };

        if (!response.ok || !payload.rsvpCounts) {
          setStatus(previous.status);
          setGoingCount(previous.goingCount);
          setInterestedCount(previous.interestedCount);
          setError(payload.error ?? "RSVP could not be saved");
          return;
        }

        setStatus(payload.currentStatus ?? null);
        setGoingCount(payload.rsvpCounts.going);
        setInterestedCount(payload.rsvpCounts.interested);
      } catch {
        setStatus(previous.status);
        setGoingCount(previous.goingCount);
        setInterestedCount(previous.interestedCount);
        setError("RSVP could not be saved");
      } finally {
        setSaving(null);
      }
    })();
  }

  if (!currentUserId) {
    return (
      <Link
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700"
        href={`/login?redirectTo=/events/${eventId}`}
      >
        <CheckCircle2 size={16} aria-hidden />
        Log in to RSVP
      </Link>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition disabled:opacity-60 ${
            status === "going"
              ? "bg-canopy-700 text-white"
              : "bg-canopy-50 text-canopy-700 hover:bg-canopy-100"
          }`}
          disabled={Boolean(saving) || isFull}
          onClick={() => updateRsvp(status === "going" ? null : "going")}
          type="button"
        >
          <CheckCircle2 size={16} aria-hidden />
          {saving === "going" ? "Saving" : status === "going" ? "Going" : "Going"}
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-ink">
            {goingCount}
          </span>
        </button>
        <button
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition disabled:opacity-60 ${
            status === "interested"
              ? "bg-clay-700 text-white"
              : "bg-clay-100 text-clay-700 hover:bg-clay-300/45"
          }`}
          disabled={Boolean(saving)}
          onClick={() =>
            updateRsvp(status === "interested" ? null : "interested")
          }
          type="button"
        >
          <Star size={16} aria-hidden />
          {saving === "interested" ? "Saving" : "Interested"}
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-ink">
            {interestedCount}
          </span>
        </button>
        {status ? (
          <button
            aria-label="Clear RSVP"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink/55 shadow-sm transition hover:bg-canopy-50 hover:text-ink disabled:opacity-60"
            disabled={Boolean(saving)}
            onClick={() => updateRsvp(null)}
            type="button"
          >
            <X size={16} aria-hidden />
          </button>
        ) : null}
      </div>
      {maxPlayers ? (
        <p className="text-xs font-black uppercase text-ink/45">
          {goingCount}/{maxPlayers} players
        </p>
      ) : null}
      {isFull ? (
        <p className="text-sm font-bold text-clay-700">This event is full.</p>
      ) : null}
      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
    </div>
  );
}

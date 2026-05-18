"use client";

import { useState } from "react";
import { Camera, Send } from "lucide-react";
import type { CourseReviewCard } from "@/lib/types";

type CourseReviewFormProps = {
  courseId: number;
  currentUserId: number;
  onCreated?: (review: CourseReviewCard) => void;
};

export function CourseReviewForm({
  courseId,
  currentUserId,
  onCreated
}: CourseReviewFormProps) {
  const [rating, setRating] = useState(8);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function attachPhoto(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function submit() {
    setSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/reviews`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-user-id": String(currentUserId)
          },
          body: JSON.stringify({ rating, title, body, photoUrl })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Review could not be saved");
          return;
        }

        const payload = (await response.json()) as { review: CourseReviewCard };
        setTitle("");
        setBody("");
        setPhotoUrl("");
        onCreated?.(payload.review);
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <div className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-ink">Review this course</h3>
        <label className="flex items-center gap-2 text-sm font-bold text-ink/65">
          {rating}/10
          <input
            className="accent-canopy-700"
            max={10}
            min={1}
            onChange={(event) => setRating(Number(event.target.value))}
            type="range"
            value={rating}
          />
        </label>
      </div>
      <input
        className="h-11 rounded-lg border border-canopy-900/10 px-3 font-semibold outline-none"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Review title"
        value={title}
      />
      <textarea
        className="min-h-28 resize-none rounded-lg border border-canopy-900/10 p-3 font-semibold leading-6 outline-none"
        onChange={(event) => setBody(event.target.value)}
        placeholder="What should people know before they play?"
        value={body}
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-canopy-900/10 px-3 text-sm font-semibold text-ink/60 transition hover:bg-canopy-50">
        <Camera size={16} aria-hidden />
        <input
          accept="image/*"
          className="sr-only"
          onChange={(event) => attachPhoto(event.target.files?.[0])}
          type="file"
        />
        {photoUrl ? "Photo attached" : "Attach a photo"}
      </label>
      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
        disabled={saving}
        onClick={submit}
        type="button"
      >
        <Send size={16} aria-hidden />
        Post review
      </button>
    </div>
  );
}

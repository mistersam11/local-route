"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, CirclePlus, Send, Trash2 } from "lucide-react";

type HoleDraft = {
  holeNumber: number;
  par: string;
  distanceFeet: string;
  description: string;
  teePhotoUrl: string;
};

function makeHole(holeNumber: number): HoleDraft {
  return {
    holeNumber,
    par: "",
    distanceFeet: "",
    description: "",
    teePhotoUrl: ""
  };
}

function readPhoto(file: File | undefined, onLoad: (value: string) => void) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      onLoad(reader.result);
    }
  };
  reader.readAsDataURL(file);
}

export function SubmitCourseForm({ currentUserId }: { currentUserId: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [holes, setHoles] = useState<HoleDraft[]>(Array.from({ length: 18 }, (_, index) => makeHole(index + 1)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateHole(index: number, patch: Partial<HoleDraft>) {
    setHoles((current) =>
      current.map((hole, holeIndex) =>
        holeIndex === index ? { ...hole, ...patch } : hole
      )
    );
  }

  function addHole() {
    setHoles((current) => [...current, makeHole(current.length + 1)]);
  }

  function setHoleCount(value: string) {
    const nextCount = Math.max(1, Math.min(36, Number(value) || 1));

    setHoles((current) =>
      Array.from({ length: nextCount }, (_item, index) => {
        const existing = current[index];
        return existing ? { ...existing, holeNumber: index + 1 } : makeHole(index + 1);
      })
    );
  }

  function removeHole(index: number) {
    setHoles((current) =>
      current
        .filter((_hole, holeIndex) => holeIndex !== index)
        .map((hole, holeIndex) => ({ ...hole, holeNumber: holeIndex + 1 }))
    );
  }

  function submit() {
    setSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-user-id": String(currentUserId)
          },
          body: JSON.stringify({
            name,
            locationName,
            latitude,
            longitude,
            coverPhotoUrl,
            holes
          })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Course could not be submitted");
          return;
        }

        const payload = (await response.json()) as { course: { id: number } };
        router.push(`/courses/${payload.course.id}`);
        router.refresh();
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Course name
            <input
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              onChange={(event) => setName(event.target.value)}
              placeholder="Maple Hollow DGC"
              value={name}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Location
            <input
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="City, State"
              value={locationName}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Holes
            <input
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              max={36}
              min={1}
              onChange={(event) => setHoleCount(event.target.value)}
              type="number"
              value={holes.length}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Latitude
            <input
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="Optional"
              value={latitude}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Longitude
            <input
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="Optional"
              value={longitude}
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-end gap-2 rounded-lg border border-canopy-900/10 bg-white px-3 py-3 text-sm font-bold text-ink/60 transition hover:bg-canopy-50">
            <Camera size={16} aria-hidden />
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) => readPhoto(event.target.files?.[0], setCoverPhotoUrl)}
              type="file"
            />
            {coverPhotoUrl ? "Cover attached" : "Attach cover"}
          </label>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-ink">Holes</h2>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-ink shadow-sm transition hover:bg-canopy-50"
            onClick={addHole}
            type="button"
          >
            <CirclePlus size={16} aria-hidden />
            Add hole
          </button>
        </div>

        {holes.map((hole, index) => (
          <article
            className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm"
            key={hole.holeNumber}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-ink">Hole {hole.holeNumber}</h3>
              {holes.length > 1 ? (
                <button
                  aria-label={`Remove hole ${hole.holeNumber}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-100 text-clay-700 transition hover:bg-clay-300/45"
                  onClick={() => removeHole(index)}
                  type="button"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-[90px_130px_1fr_auto]">
              <input
                className="h-11 rounded-lg border border-canopy-900/10 px-3 font-semibold outline-none"
                onChange={(event) => updateHole(index, { par: event.target.value })}
                placeholder="Par"
                value={hole.par}
              />
              <input
                className="h-11 rounded-lg border border-canopy-900/10 px-3 font-semibold outline-none"
                onChange={(event) =>
                  updateHole(index, { distanceFeet: event.target.value })
                }
                placeholder="Feet"
                value={hole.distanceFeet}
              />
              <input
                className="h-11 rounded-lg border border-canopy-900/10 px-3 font-semibold outline-none"
                onChange={(event) =>
                  updateHole(index, { description: event.target.value })
                }
                placeholder="Short hole description"
                value={hole.description}
              />
              <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-canopy-900/10 px-3 text-sm font-bold text-ink/60 transition hover:bg-canopy-50">
                <Camera size={16} aria-hidden />
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    readPhoto(event.target.files?.[0], (value) =>
                      updateHole(index, { teePhotoUrl: value })
                    )
                  }
                  type="file"
                />
                {hole.teePhotoUrl ? "Tee photo" : "Photo"}
              </label>
            </div>
          </article>
        ))}
      </section>

      {error ? (
        <p className="rounded-lg bg-clay-100 p-3 text-sm font-bold text-clay-700">
          {error}
        </p>
      ) : null}

      <button
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white shadow-sm transition hover:bg-canopy-700 disabled:bg-ink/35"
        disabled={saving}
        onClick={submit}
        type="button"
      >
        <Send size={17} aria-hidden />
        Submit course
      </button>
    </div>
  );
}

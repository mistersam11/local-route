"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CirclePlus,
  Loader2,
  Save,
  Send,
  Trash2
} from "lucide-react";
import { uploadImage } from "@/lib/cloudinary-upload";
import {
  courseDifficultyOptions,
  courseFactDefinitions,
  type CourseDifficultyValue,
  type CourseFactKey
} from "@/lib/course-facts";

type CourseStatusValue = "draft" | "pending" | "approved" | "rejected";

type HoleDraft = {
  holeNumber: number;
  par: string;
  distanceFeet: string;
  description: string;
  teePhotoUrl: string;
};

type LayoutDraft = {
  id?: number;
  name: string;
  holes: HoleDraft[];
};

type CourseEditorHole = {
  id: number;
  holeNumber: number;
  par: number | null;
  distanceFeet: number | null;
  description: string | null;
  teePhotoUrl: string | null;
};

export type CourseDraftEditorCourse = {
  id: number;
  name: string;
  locationName: string;
  layoutName: string | null;
  latitude: number | null;
  longitude: number | null;
  coverPhotoUrl: string | null;
  difficulty: CourseDifficultyValue;
  hasParking: boolean;
  hasBathrooms: boolean;
  hasWater: boolean;
  cartFriendly: boolean;
  dogFriendly: boolean;
  beginnerFriendly: boolean;
  isPayToPlay: boolean;
  status: CourseStatusValue;
  importSourceUrl: string | null;
  importWarnings: string[];
  holes: CourseEditorHole[];
  layouts?: Array<{
    id: number;
    name: string;
    holes: CourseEditorHole[];
  }>;
};

const statusLabels: Record<CourseStatusValue, string> = {
  approved: "Approved",
  draft: "Draft",
  pending: "Pending review",
  rejected: "Rejected"
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

function toHoleDraft(
  hole: CourseDraftEditorCourse["holes"][number],
  index: number
): HoleDraft {
  return {
    holeNumber: hole.holeNumber || index + 1,
    par: hole.par ? String(hole.par) : "",
    distanceFeet: hole.distanceFeet ? String(hole.distanceFeet) : "",
    description: hole.description ?? "",
    teePhotoUrl: hole.teePhotoUrl ?? ""
  };
}

async function uploadPhoto(file: File | undefined, onLoad: (value: string) => void) {
  if (!file) return;

  onLoad(await uploadImage(file));
}

export function CourseDraftEditor({
  initialCourse
}: {
  initialCourse: CourseDraftEditorCourse;
}) {
  const router = useRouter();
  const initialLayouts =
    initialCourse.layouts?.map((layout) => ({
      id: layout.id,
      name: layout.name,
      holes: layout.holes.map(toHoleDraft)
    })) ?? [];
  const [name, setName] = useState(initialCourse.name);
  const [locationName, setLocationName] = useState(initialCourse.locationName);
  const [layoutName, setLayoutName] = useState(initialCourse.layoutName ?? "");
  const [layoutDrafts, setLayoutDrafts] = useState<LayoutDraft[]>(initialLayouts);
  const [selectedLayoutIndex, setSelectedLayoutIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<CourseDifficultyValue>(
    initialCourse.difficulty
  );
  const [facts, setFacts] = useState<Record<CourseFactKey, boolean>>({
    hasParking: initialCourse.hasParking,
    hasBathrooms: initialCourse.hasBathrooms,
    hasWater: initialCourse.hasWater,
    cartFriendly: initialCourse.cartFriendly,
    dogFriendly: initialCourse.dogFriendly,
    beginnerFriendly: initialCourse.beginnerFriendly,
    isPayToPlay: initialCourse.isPayToPlay
  });
  const [latitude, setLatitude] = useState(String(initialCourse.latitude ?? ""));
  const [longitude, setLongitude] = useState(String(initialCourse.longitude ?? ""));
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(
    initialCourse.coverPhotoUrl ?? ""
  );
  const [legacyHoles, setLegacyHoles] = useState<HoleDraft[]>(
    initialCourse.holes.map(toHoleDraft)
  );
  const [status, setStatus] = useState<CourseStatusValue>(initialCourse.status);
  const [savingAction, setSavingAction] = useState<"draft" | "submit" | null>(
    null
  );
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isUploading = uploadingCount > 0;
  const hasImportedLayouts = layoutDrafts.length > 0;
  const selectedLayout =
    layoutDrafts[Math.min(selectedLayoutIndex, layoutDrafts.length - 1)];
  const holes = selectedLayout?.holes ?? legacyHoles;

  function attachPhoto(file: File | undefined, onLoad: (value: string) => void) {
    setError(null);
    setUploadingCount((current) => current + 1);

    void uploadPhoto(file, onLoad)
      .catch((uploadError: unknown) => {
        setError(
          uploadError instanceof Error ? uploadError.message : "Image upload failed"
        );
      })
      .finally(() => {
        setUploadingCount((current) => Math.max(0, current - 1));
      });
  }

  function updateCurrentHoles(updater: (current: HoleDraft[]) => HoleDraft[]) {
    if (!hasImportedLayouts) {
      setLegacyHoles(updater);
      return;
    }

    setLayoutDrafts((current) =>
      current.map((layout, index) =>
        index === selectedLayoutIndex
          ? { ...layout, holes: updater(layout.holes) }
          : layout
      )
    );
  }

  function updateSelectedLayoutName(value: string) {
    if (!hasImportedLayouts) {
      setLayoutName(value);
      return;
    }

    setLayoutDrafts((current) =>
      current.map((layout, index) =>
        index === selectedLayoutIndex ? { ...layout, name: value } : layout
      )
    );

    if (selectedLayoutIndex === 0) {
      setLayoutName(value);
    }
  }

  function updateHole(index: number, patch: Partial<HoleDraft>) {
    updateCurrentHoles((current) =>
      current.map((hole, holeIndex) =>
        holeIndex === index ? { ...hole, ...patch } : hole
      )
    );
  }

  function addHole() {
    updateCurrentHoles((current) => [...current, makeHole(current.length + 1)]);
  }

  function setHoleCount(value: string) {
    const nextCount = Math.max(0, Math.min(36, Number(value) || 0));

    updateCurrentHoles((current) =>
      Array.from({ length: nextCount }, (_item, index) => {
        const existing = current[index];
        return existing ? { ...existing, holeNumber: index + 1 } : makeHole(index + 1);
      })
    );
  }

  function removeHole(index: number) {
    updateCurrentHoles((current) =>
      current
        .filter((_hole, holeIndex) => holeIndex !== index)
        .map((hole, holeIndex) => ({ ...hole, holeNumber: holeIndex + 1 }))
    );
  }

  function toggleFact(key: CourseFactKey) {
    setFacts((current) => ({ ...current, [key]: !current[key] }));
  }

  function save(submitForReview: boolean) {
    const action = submitForReview ? "submit" : "draft";
    setSavingAction(action);
    setError(null);
    setMessage(null);

    void (async () => {
      try {
        const response = await fetch(`/api/courses/${initialCourse.id}/draft`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            locationName,
            layoutName: layoutDrafts[0]?.name || layoutName,
            difficulty,
            ...facts,
            latitude,
            longitude,
            coverPhotoUrl,
            holes: legacyHoles,
            layouts: layoutDrafts.map((layout) => ({
              id: layout.id,
              name: layout.name,
              holes: layout.holes
            })),
            submitForReview
          })
        });
        const payload = (await response.json()) as {
          course?: { status: CourseStatusValue };
          error?: string;
        };

        if (!response.ok || !payload.course) {
          setError(payload.error ?? "This course could not be saved");
          return;
        }

        setStatus(payload.course.status);

        if (submitForReview) {
          router.push(`/courses/${initialCourse.id}`);
        } else {
          setMessage("Draft saved");
          router.refresh();
        }
      } finally {
        setSavingAction(null);
      }
    })();
  }

  return (
    <div className="grid gap-6">
      {initialCourse.importSourceUrl || initialCourse.importWarnings.length ? (
        <section className="grid gap-3 rounded-lg border border-water-500/30 bg-water-100 p-4 text-sm font-bold text-ink shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-black uppercase text-water-700">
              Imported draft
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase text-water-700">
              {statusLabels[status]}
            </span>
          </div>
          {initialCourse.importSourceUrl ? (
            <a
              className="break-all text-canopy-700 underline-offset-4 hover:underline"
              href={initialCourse.importSourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              {initialCourse.importSourceUrl}
            </a>
          ) : null}
          {initialCourse.importWarnings.length ? (
            <div
              className="flex gap-2 rounded-lg border border-clay-300 bg-clay-100 p-3 text-clay-700"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden />
              <ul className="grid gap-1">
                {initialCourse.importWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-clay-700">
              Review course details
            </p>
            <h1 className="mt-1 text-3xl font-black text-ink">
              Edit before publishing
            </h1>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-ink/60 shadow-sm">
            {statusLabels[status]}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Course name
            <input
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              onChange={(event) => setName(event.target.value)}
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
          {layoutDrafts.length > 1 ? (
            <label className="grid gap-2 text-sm font-bold text-ink/70">
              Imported layout
              <select
                className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
                onChange={(event) =>
                  setSelectedLayoutIndex(Number(event.target.value))
                }
                value={selectedLayoutIndex}
              >
                {layoutDrafts.map((layout, index) => (
                  <option key={layout.id ?? index} value={index}>
                    {layout.name || `Layout ${index + 1}`} ({layout.holes.length})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Layout
            <input
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              onChange={(event) => updateSelectedLayoutName(event.target.value)}
              placeholder="Optional"
              value={selectedLayout?.name ?? layoutName}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Difficulty
            <select
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              onChange={(event) =>
                setDifficulty(event.target.value as CourseDifficultyValue)
              }
              value={difficulty}
            >
              {courseDifficultyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Holes
            <input
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              max={36}
              min={0}
              onChange={(event) => setHoleCount(event.target.value)}
              type="number"
              value={holes.length}
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-end gap-2 rounded-lg border border-canopy-900/10 bg-white px-3 py-3 text-sm font-bold text-ink/60 transition hover:bg-canopy-50">
            <Camera size={16} aria-hidden />
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) =>
                attachPhoto(event.target.files?.[0], setCoverPhotoUrl)
              }
              type="file"
            />
            {isUploading ? "Uploading..." : coverPhotoUrl ? "Cover attached" : "Attach cover"}
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-black uppercase text-ink/55">Quick facts</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {courseFactDefinitions.map((fact) => (
              <label
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-bold transition ${
                  facts[fact.key]
                    ? "border-canopy-700 bg-canopy-50 text-canopy-700"
                    : "border-canopy-900/10 bg-white text-ink/60 hover:bg-canopy-50"
                }`}
                key={fact.key}
              >
                <input
                  checked={facts[fact.key]}
                  className="accent-canopy-700"
                  onChange={() => toggleFact(fact.key)}
                  type="checkbox"
                />
                {fact.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-ink">Holes</h2>
            {selectedLayout ? (
              <p className="mt-1 text-sm font-bold text-ink/55">
                {selectedLayout.name || `Layout ${selectedLayoutIndex + 1}`}
              </p>
            ) : null}
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-ink shadow-sm transition hover:bg-canopy-50"
            onClick={addHole}
            type="button"
          >
            <CirclePlus size={16} aria-hidden />
            Add hole
          </button>
        </div>

        {holes.length ? (
          holes.map((hole, index) => (
            <article
              className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm"
              key={`${hole.holeNumber}-${index}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-ink">
                  Hole {hole.holeNumber}
                </h3>
                <button
                  aria-label={`Remove hole ${hole.holeNumber}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-100 text-clay-700 transition hover:bg-clay-300/45"
                  onClick={() => removeHole(index)}
                  type="button"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
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
                      attachPhoto(event.target.files?.[0], (value) =>
                        updateHole(index, { teePhotoUrl: value })
                      )
                    }
                    type="file"
                  />
                  {isUploading ? "Uploading..." : hole.teePhotoUrl ? "Tee photo" : "Photo"}
                </label>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-canopy-900/10 bg-white p-6 text-center shadow-sm">
            <p className="text-lg font-black text-ink">No holes imported</p>
            <p className="mt-2 text-sm font-semibold text-ink/55">
              Add holes here before submitting the course for review.
            </p>
          </div>
        )}
      </section>

      {error ? (
        <p className="rounded-lg bg-clay-100 p-3 text-sm font-bold text-clay-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="flex items-center gap-2 rounded-lg bg-canopy-50 p-3 text-sm font-bold text-canopy-700">
          <CheckCircle2 size={16} aria-hidden />
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-ink shadow-sm transition hover:bg-canopy-50 disabled:text-ink/35"
          disabled={Boolean(savingAction) || isUploading}
          onClick={() => save(false)}
          type="button"
        >
          {savingAction === "draft" ? (
            <Loader2 size={17} className="animate-spin" aria-hidden />
          ) : (
            <Save size={17} aria-hidden />
          )}
          Save draft
        </button>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white shadow-sm transition hover:bg-canopy-700 disabled:bg-ink/35"
          disabled={Boolean(savingAction) || isUploading}
          onClick={() => save(true)}
          type="button"
        >
          {savingAction === "submit" ? (
            <Loader2 size={17} className="animate-spin" aria-hidden />
          ) : (
            <Send size={17} aria-hidden />
          )}
          Submit for review
        </button>
      </div>
    </div>
  );
}

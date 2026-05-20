"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarClock,
  ImagePlus,
  Save,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { uploadImage } from "@/lib/cloudinary-upload";

type Option = {
  value: string;
  label: string;
};

type CourseOption = {
  id: number;
  name: string;
  locationName: string;
};

type EventFormInitialValue = {
  id?: number;
  title: string;
  description: string;
  courseId: number | null;
  type: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  recurrenceFrequency: string;
  recurrenceInterval: number;
  recurrenceEndsAt: string | null;
  maxPlayers: number | null;
  visibility: string;
  tags: string[];
  imageUrl: string | null;
};

type EventFormProps = {
  courses: CourseOption[];
  eventTypeOptions: Option[];
  visibilityOptions: Option[];
  recurrenceOptions: Option[];
  initialValue?: EventFormInitialValue;
  mode?: "create" | "edit";
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateTimeInput(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const fallbackInitialValue: EventFormInitialValue = {
  title: "",
  description: "",
  courseId: null,
  type: "casualRound",
  startTime: null,
  endTime: null,
  timezone: "America/New_York",
  recurrenceFrequency: "",
  recurrenceInterval: 1,
  recurrenceEndsAt: null,
  maxPlayers: null,
  visibility: "public",
  tags: [],
  imageUrl: null
};

export function EventForm({
  courses,
  eventTypeOptions,
  visibilityOptions,
  recurrenceOptions,
  initialValue,
  mode = "create"
}: EventFormProps) {
  const router = useRouter();
  const initial = initialValue ?? fallbackInitialValue;
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [courseId, setCourseId] = useState(
    initial.courseId ? String(initial.courseId) : ""
  );
  const [type, setType] = useState(initial.type);
  const [startTime, setStartTime] = useState(toDateTimeInput(initial.startTime));
  const [endTime, setEndTime] = useState(toDateTimeInput(initial.endTime));
  const [timezone, setTimezone] = useState(initial.timezone);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(
    initial.recurrenceFrequency
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    String(initial.recurrenceInterval || 1)
  );
  const [recurrenceEndsAt, setRecurrenceEndsAt] = useState(
    toDateTimeInput(initial.recurrenceEndsAt)
  );
  const [maxPlayers, setMaxPlayers] = useState(
    initial.maxPlayers ? String(initial.maxPlayers) : ""
  );
  const [visibility, setVisibility] = useState(initial.visibility);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function attachImage(file: File | null) {
    if (!file) return;

    setUploading(true);
    setError(null);

    void uploadImage(file)
      .then((url) => setImageUrl(url))
      .catch((uploadError: unknown) => {
        setError(
          uploadError instanceof Error ? uploadError.message : "Image upload failed"
        );
      })
      .finally(() => setUploading(false));
  }

  function submit() {
    setSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(
          mode === "edit" && initial.id ? `/api/events/${initial.id}` : "/api/events",
          {
            method: mode === "edit" ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              description,
              courseId,
              type,
              startTime,
              endTime: endTime || null,
              timezone,
              recurrenceFrequency: recurrenceFrequency || null,
              recurrenceInterval,
              recurrenceEndsAt: recurrenceEndsAt || null,
              maxPlayers: maxPlayers || null,
              visibility,
              tags,
              imageUrl: imageUrl || null
            })
          }
        );
        const payload = (await response.json()) as {
          event?: { id: number };
          error?: string;
          errors?: Record<string, string>;
        };

        if (!response.ok || !payload.event) {
          setError(
            payload.error ??
              Object.values(payload.errors ?? {})[0] ??
              "Event could not be saved"
          );
          return;
        }

        router.push(`/events/${payload.event.id}`);
        router.refresh();
      } finally {
        setSaving(false);
      }
    })();
  }

  function deleteEvent() {
    if (!initial.id || deleting) return;

    setDeleting(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/events/${initial.id}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Event could not be deleted");
          return;
        }

        router.push("/events");
        router.refresh();
      } finally {
        setDeleting(false);
      }
    })();
  }

  return (
    <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black text-ink">
          <CalendarClock size={20} aria-hidden />
          {mode === "edit" ? "Edit event" : "Create event"}
        </h2>
        {mode === "edit" ? (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-clay-100 px-3 text-xs font-black text-clay-700 transition hover:bg-clay-300/50 disabled:opacity-60"
            disabled={deleting}
            onClick={deleteEvent}
            type="button"
          >
            <Trash2 size={14} aria-hidden />
            {deleting ? "Deleting" : "Delete"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Title
          <input
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-canopy-500"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Type
          <select
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold normal-case text-ink outline-none"
            onChange={(event) => setType(event.target.value)}
            value={type}
          >
            {eventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
        Course
        <select
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold normal-case text-ink outline-none"
          onChange={(event) => setCourseId(event.target.value)}
          value={courseId}
        >
          <option value="">Choose a course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name} - {course.locationName}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Starts
          <input
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-canopy-500"
            onChange={(event) => setStartTime(event.target.value)}
            type="datetime-local"
            value={startTime}
          />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Ends
          <input
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-canopy-500"
            onChange={(event) => setEndTime(event.target.value)}
            type="datetime-local"
            value={endTime}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_160px_180px]">
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Timezone
          <input
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-canopy-500"
            onChange={(event) => setTimezone(event.target.value)}
            value={timezone}
          />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Max players
          <input
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-canopy-500"
            min={1}
            onChange={(event) => setMaxPlayers(event.target.value)}
            type="number"
            value={maxPlayers}
          />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Visibility
          <select
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold normal-case text-ink outline-none"
            onChange={(event) => setVisibility(event.target.value)}
            value={visibility}
          >
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-[180px_140px_1fr]">
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Repeats
          <select
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold normal-case text-ink outline-none"
            onChange={(event) => setRecurrenceFrequency(event.target.value)}
            value={recurrenceFrequency}
          >
            <option value="">No repeat</option>
            {recurrenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Interval
          <input
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-canopy-500"
            disabled={!recurrenceFrequency}
            min={1}
            onChange={(event) => setRecurrenceInterval(event.target.value)}
            type="number"
            value={recurrenceInterval}
          />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
          Repeats until
          <input
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-canopy-500 disabled:bg-ink/5"
            disabled={!recurrenceFrequency}
            onChange={(event) => setRecurrenceEndsAt(event.target.value)}
            type="datetime-local"
            value={recurrenceEndsAt}
          />
        </label>
      </div>

      <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
        Tags
        <input
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-canopy-500"
          onChange={(event) => setTags(event.target.value)}
          value={tags}
        />
      </label>

      <label className="grid gap-1 text-xs font-black uppercase text-ink/45">
        Description
        <textarea
          className="min-h-28 resize-none rounded-lg border border-canopy-900/10 bg-white p-3 text-sm font-semibold leading-6 normal-case text-ink outline-none focus:border-canopy-500"
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>

      <div className="grid gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold text-ink/60 transition hover:bg-canopy-50">
          {uploading ? <Upload size={16} aria-hidden /> : <ImagePlus size={16} aria-hidden />}
          <input
            accept="image/*"
            className="sr-only"
            onChange={(event) => attachImage(event.target.files?.[0] ?? null)}
            type="file"
          />
          {uploading ? "Uploading image" : "Event image"}
        </label>
        {imageUrl ? (
          <div className="relative h-44 overflow-hidden rounded-lg bg-ink">
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              src={imageUrl}
            />
            <button
              aria-label="Remove image"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink/75 text-white transition hover:bg-clay-700"
              onClick={() => setImageUrl("")}
              type="button"
            >
              <X size={15} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}

      <button
        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
        disabled={saving || uploading}
        onClick={submit}
        type="button"
      >
        <Save size={16} aria-hidden />
        {saving ? "Saving" : mode === "edit" ? "Save event" : "Create event"}
      </button>
    </section>
  );
}

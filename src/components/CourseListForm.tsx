"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ListPlus, Plus } from "lucide-react";

type CourseOption = {
  id: number;
  name: string;
  locationName: string;
};

export function CourseListForm({
  courses,
  collapsed = false
}: {
  courses: CourseOption[];
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleCourse(courseId: number) {
    setSelectedIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId]
    );
  }

  function submit() {
    setSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/lists", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title,
            description,
            courseIds: selectedIds
          })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "List could not be created");
          return;
        }

        const payload = (await response.json()) as { list: { id: number } };
        router.push(`/lists/${payload.list.id}`);
        router.refresh();
      } finally {
        setSaving(false);
      }
    })();
  }

  if (!isOpen) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-ink">Make your own list</h2>
          <p className="mt-1 text-sm font-semibold text-ink/60">
            Curate a road-trip loop, beginner day, or tournament prep set.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <Plus size={16} aria-hidden />
          Create a list
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase text-clay-700">Create a list</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Curate your course picks</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Best wooded courses near Charlotte"
          value={title}
        />
        <input
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Short description"
          value={description}
        />
      </div>
      <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {courses.map((course) => (
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
              selectedSet.has(course.id)
                ? "border-canopy-700 bg-canopy-50"
                : "border-canopy-900/10 bg-white hover:bg-canopy-50"
            }`}
            key={course.id}
          >
            <input
              checked={selectedSet.has(course.id)}
              className="mt-1 accent-canopy-700"
              onChange={() => toggleCourse(course.id)}
              type="checkbox"
            />
            <span>
              <span className="block font-black text-ink">{course.name}</span>
              <span className="block text-sm font-semibold text-ink/55">
                {course.locationName}
              </span>
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
      <button
        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
        disabled={saving}
        onClick={submit}
        type="button"
      >
        <ListPlus size={16} aria-hidden />
        {saving ? "Creating" : `Create list${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
      </button>
    </section>
  );
}

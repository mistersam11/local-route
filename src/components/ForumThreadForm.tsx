"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, Send, X } from "lucide-react";
import { uploadImage } from "@/lib/cloudinary-upload";
import { courseForumFlairs } from "@/lib/course-community-shared";

const maxThreadPhotos = 10;

type ForumThreadFormProps = {
  courseId?: number;
  courseName?: string;
  onCancel?: () => void;
};

export function ForumThreadForm({
  courseId,
  courseName,
  onCancel
}: ForumThreadFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [flair, setFlair] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUploading = uploadingCount > 0;

  function attachPhotos(files: FileList | null) {
    if (!files?.length) return;

    const remainingSlots = maxThreadPhotos - photoUrls.length;
    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    if (!remainingSlots) {
      setError("Chains can have up to 10 photos.");
      return;
    }

    setError(null);
    setUploadingCount((current) => current + selectedFiles.length);

    selectedFiles.forEach((file) => {
      void uploadImage(file)
        .then((url) => {
          setPhotoUrls((current) =>
            current.length < maxThreadPhotos ? [...current, url] : current
          );
        })
        .catch((uploadError: unknown) => {
          setError(
            uploadError instanceof Error ? uploadError.message : "Image upload failed"
          );
        })
        .finally(() => {
          setUploadingCount((current) => Math.max(0, current - 1));
        });
    });

    if (files.length > remainingSlots) {
      setError("Chains can have up to 10 photos.");
    }
  }

  function removePhoto(url: string) {
    setPhotoUrls((current) => current.filter((photoUrl) => photoUrl !== url));
  }

  function submit() {
    setSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/forum/threads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title,
            body,
            photoUrls,
            courseId,
            flair: flair || undefined
          })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Chain could not be posted");
          return;
        }

        const payload = (await response.json()) as { thread: { id: number } };
        router.push(`/forum/${payload.thread.id}`);
        router.refresh();
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <section className="grid gap-3 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-ink">
          {courseName ? `Post in ${courseName}` : "Start a chain"}
        </h2>
        {onCancel ? (
          <button
            className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-ink/55 shadow-sm transition hover:bg-canopy-50 hover:text-canopy-700"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
          onChange={(event) => setTitle(event.target.value)}
          placeholder={
            courseName
              ? "Conditions, league night, lost discs..."
              : "Course conditions, lost discs, local events..."
          }
          value={title}
        />
        <select
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold text-ink outline-none"
          onChange={(event) => setFlair(event.target.value)}
          value={flair}
        >
          <option value="">No flair</option>
          {courseForumFlairs.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="min-h-28 resize-none rounded-lg border border-canopy-900/10 bg-white p-3 font-semibold leading-6 outline-none"
        onChange={(event) => setBody(event.target.value)}
        placeholder="What should the community know?"
        value={body}
      />
      <div className="grid gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-canopy-900/10 bg-white px-3 text-sm font-bold text-ink/60 transition hover:bg-canopy-50">
          <Camera size={16} aria-hidden />
          <input
            accept="image/*"
            className="sr-only"
            multiple
            onChange={(event) => attachPhotos(event.target.files)}
            type="file"
          />
          {isUploading
            ? `Uploading ${uploadingCount} photo${uploadingCount === 1 ? "" : "s"}...`
            : `Attach photos (${photoUrls.length}/${maxThreadPhotos})`}
        </label>
        {photoUrls.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {photoUrls.map((url) => (
              <div className="relative aspect-square overflow-hidden rounded-lg bg-ink" key={url}>
                <img
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  src={url}
                />
                <button
                  aria-label="Remove photo"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/75 text-white transition hover:bg-clay-700"
                  onClick={() => removePhoto(url)}
                  type="button"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
      <button
        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
        disabled={saving || isUploading}
        onClick={submit}
        type="button"
      >
        <Send size={16} aria-hidden />
        {isUploading ? "Uploading photos" : saving ? "Posting" : "Post chain"}
      </button>
    </section>
  );
}

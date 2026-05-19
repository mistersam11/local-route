"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, Save } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { uploadImage } from "@/lib/cloudinary-upload";

type ProfileSettingsFormProps = {
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
    bio: string | null;
    homeCourseName: string | null;
  };
};

export function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [homeCourseName, setHomeCourseName] = useState(user.homeCourseName ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function attachAvatar(file: File | undefined) {
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    setSaved(false);

    void uploadImage(file)
      .then(setProfileImageUrl)
      .catch((uploadError: unknown) => {
        setError(
          uploadError instanceof Error ? uploadError.message : "Image upload failed"
        );
      })
      .finally(() => setUploadingAvatar(false));
  }

  function submit() {
    setSaving(true);
    setError(null);
    setSaved(false);

    void (async () => {
      try {
        const response = await fetch("/api/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            profileImageUrl,
            bio,
            homeCourseName
          })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Profile could not be saved");
          return;
        }

        setSaved(true);
        router.refresh();
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <div className="grid gap-6 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-panel">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={username || user.username} size="lg" src={profileImageUrl || null} />
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-ink shadow-sm transition hover:bg-canopy-50">
          <Camera size={16} aria-hidden />
          <input
            accept="image/*"
            className="sr-only"
            onChange={(event) => attachAvatar(event.target.files?.[0])}
            type="file"
          />
          {uploadingAvatar ? "Uploading..." : "Change avatar"}
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Username
        <input
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold lowercase outline-none"
          maxLength={24}
          minLength={3}
          onChange={(event) => setUsername(event.target.value)}
          pattern="[A-Za-z0-9_-]+"
          value={username}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Home course
        <input
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
          maxLength={80}
          onChange={(event) => setHomeCourseName(event.target.value)}
          placeholder="Maple Hill, Cedar Ridge, your local loop..."
          value={homeCourseName}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Bio
        <textarea
          className="min-h-32 resize-none rounded-lg border border-canopy-900/10 bg-white p-3 font-semibold leading-6 outline-none"
          maxLength={280}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Favorite lines, throwing style, local scene..."
          value={bio}
        />
        <span className="text-xs font-semibold text-ink/45">{bio.length}/280</span>
      </label>

      {error ? (
        <p className="rounded-lg bg-clay-100 p-3 text-sm font-bold text-clay-700">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg bg-canopy-50 p-3 text-sm font-bold text-canopy-700">
          Profile saved.
        </p>
      ) : null}

      <button
        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
        disabled={saving || uploadingAvatar}
        onClick={submit}
        type="button"
      >
        <Save size={16} aria-hidden />
        {saving ? "Saving" : "Save profile"}
      </button>
    </div>
  );
}

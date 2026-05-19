"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Link2, Loader2, UploadCloud } from "lucide-react";

export function UdiscImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/courses/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url })
        });

        const payload = (await response.json()) as {
          error?: string;
          redirectTo?: string;
        };

        if (!response.ok || !payload.redirectTo) {
          setError(payload.error ?? "That UDisc link could not be imported");
          return;
        }

        router.push(payload.redirectTo);
        router.refresh();
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-clay-700">
            Import from UDisc
          </p>
          <h2 className="mt-1 text-2xl font-black text-ink">
            Start with a public course link
          </h2>
        </div>
        <span className="rounded-full bg-water-100 px-3 py-1 text-xs font-black uppercase text-water-700">
          Draft only
        </span>
      </div>

      <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={submit}>
        <label className="flex h-12 items-center gap-3 rounded-lg border border-canopy-900/10 bg-white px-3">
          <Link2 size={18} className="shrink-0 text-canopy-700" aria-hidden />
          <input
            className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-ink/40"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://udisc.com/courses/..."
            type="url"
            value={url}
          />
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
          disabled={saving || !url.trim()}
          type="submit"
        >
          {saving ? (
            <Loader2 size={17} className="animate-spin" aria-hidden />
          ) : (
            <UploadCloud size={17} aria-hidden />
          )}
          {saving ? "Importing" : "Import"}
        </button>
      </form>

      {error ? (
        <p className="rounded-lg bg-clay-100 p-3 text-sm font-bold text-clay-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}

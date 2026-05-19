"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";

export function ForumThreadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          body: JSON.stringify({ title, body })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Thread could not be posted");
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
      <h2 className="text-xl font-black text-ink">Start a thread</h2>
      <input
        className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Course conditions, lost discs, local events..."
        value={title}
      />
      <textarea
        className="min-h-28 resize-none rounded-lg border border-canopy-900/10 bg-white p-3 font-semibold leading-6 outline-none"
        onChange={(event) => setBody(event.target.value)}
        placeholder="What should the community know?"
        value={body}
      />
      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
      <button
        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
        disabled={saving}
        onClick={submit}
        type="button"
      >
        <Send size={16} aria-hidden />
        {saving ? "Posting" : "Post thread"}
      </button>
    </section>
  );
}

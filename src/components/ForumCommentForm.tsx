"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import clsx from "clsx";

type ForumCommentFormProps = {
  threadId: number;
  parentCommentId?: number | null;
  variant?: "full" | "compact";
  title?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  onPosted?: () => void;
};

export function ForumCommentForm({
  threadId,
  parentCommentId = null,
  variant = "full",
  title = "Add a comment",
  submitLabel = "Post comment",
  autoFocus = false,
  onCancel,
  onPosted
}: ForumCommentFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/forum/threads/${threadId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ body, parentCommentId })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Comment could not be posted");
          return;
        }

        setBody("");
        onPosted?.();
        router.refresh();
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <section
      className={clsx(
        "grid gap-3 rounded-lg",
        variant === "full"
          ? "border border-canopy-900/10 bg-white p-4 shadow-sm"
          : "bg-canopy-50/70 p-3"
      )}
    >
      <h2
        className={clsx(
          "font-black text-ink",
          variant === "full" ? "text-xl" : "text-sm"
        )}
      >
        {title}
      </h2>
      <textarea
        autoFocus={autoFocus}
        className={clsx(
          "resize-none rounded-lg border border-canopy-900/10 p-3 font-semibold leading-6 outline-none focus:border-canopy-500",
          variant === "full" ? "min-h-24" : "min-h-20 text-sm"
        )}
        onChange={(event) => setBody(event.target.value)}
        placeholder={parentCommentId ? "Reply to this comment" : "Add to the chain"}
        value={body}
      />
      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
          disabled={saving}
          onClick={submit}
          type="button"
        >
          <Send size={16} aria-hidden />
          {saving ? "Posting" : submitLabel}
        </button>
        {onCancel ? (
          <button
            className="inline-flex h-10 w-fit items-center justify-center rounded-full bg-canopy-50 px-4 text-sm font-black text-ink/60 transition hover:bg-canopy-100 hover:text-ink"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </section>
  );
}

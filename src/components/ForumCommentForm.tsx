"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send, X } from "lucide-react";
import clsx from "clsx";

type ForumCommentFormProps = {
  threadId: number;
  parentCommentId?: number | null;
  variant?: "full" | "compact" | "minimal";
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
        variant === "full" && "border border-canopy-900/10 bg-white p-4 shadow-sm",
        variant === "compact" && "border-l border-canopy-900/15 py-2 pl-3",
        variant === "minimal" &&
          "border border-canopy-900/10 bg-[#fffdf7] p-3 shadow-sm"
      )}
    >
      <h2
        className={clsx(
          "font-black text-ink",
          variant === "full" ? "text-xl" : "sr-only"
        )}
      >
        {title}
      </h2>
      <textarea
        autoFocus={autoFocus}
        className={clsx(
          "resize-none rounded-lg border border-canopy-900/10 p-3 font-semibold leading-6 outline-none focus:border-canopy-500",
          variant === "full" && "min-h-24",
          variant === "compact" && "min-h-16 bg-white/75 text-sm shadow-sm",
          variant === "minimal" && "min-h-20 bg-white/85 text-sm shadow-sm"
        )}
        onChange={(event) => setBody(event.target.value)}
        placeholder={parentCommentId ? "Reply to this comment" : "Add to the chain"}
        value={body}
      />
      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-label={variant === "full" ? undefined : submitLabel}
          className={clsx(
            "inline-flex items-center justify-center gap-2 rounded-full bg-ink text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35",
            variant === "full" ? "h-10 w-fit px-4" : "h-8 w-8"
          )}
          disabled={saving}
          onClick={submit}
          title={variant === "full" ? undefined : submitLabel}
          type="button"
        >
          <Send size={variant === "full" ? 16 : 14} aria-hidden />
          {variant === "full" ? (saving ? "Posting" : submitLabel) : null}
        </button>
        {onCancel ? (
          <button
            aria-label={variant === "full" ? undefined : "Cancel"}
            className={clsx(
              "inline-flex items-center justify-center rounded-full bg-canopy-50 text-sm font-black text-ink/60 transition hover:bg-canopy-100 hover:text-ink",
              variant === "full" ? "h-10 w-fit px-4" : "h-8 w-8"
            )}
            disabled={saving}
            onClick={onCancel}
            title={variant === "full" ? undefined : "Cancel"}
            type="button"
          >
            {variant === "full" ? "Cancel" : <X size={14} aria-hidden />}
          </button>
        ) : null}
      </div>
    </section>
  );
}

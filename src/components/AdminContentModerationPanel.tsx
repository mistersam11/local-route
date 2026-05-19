"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Trash2 } from "lucide-react";

type TargetType = "courseReview" | "holeReview" | "line";
type ContentStatus = "visible" | "hidden";
type AdminAction = "hide" | "restore" | "delete" | "resolve";

type AdminContentModerationPanelProps = {
  targetType: TargetType;
  targetId: number;
  initialStatus?: ContentStatus;
  hasOpenReports?: boolean;
};

export function AdminContentModerationPanel({
  targetType,
  targetId,
  initialStatus = "visible",
  hasOpenReports = false
}: AdminContentModerationPanelProps) {
  const [status, setStatus] = useState<ContentStatus>(initialStatus);
  const [reportsOpen, setReportsOpen] = useState(hasOpenReports);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState<AdminAction | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function runAction(action: AdminAction) {
    if (action === "delete") {
      const confirmed = window.confirm(
        "Delete this content permanently? Hiding is usually safer."
      );

      if (!confirmed) return;
    }

    setSaving(action);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/admin/content", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            targetType,
            targetId,
            action,
            reason
          })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Moderation action failed");
          return;
        }

        if (action === "hide") {
          setStatus("hidden");
          setReportsOpen(false);
        }

        if (action === "restore") {
          setStatus("visible");
        }

        if (action === "resolve") {
          setReportsOpen(false);
        }

        if (action === "delete") {
          setDeleted(true);
        }

        setReason("");
      } finally {
        setSaving(null);
      }
    })();
  }

  if (deleted) {
    return (
      <p className="rounded-lg bg-clay-100 px-3 py-2 text-sm font-black text-clay-700">
        Deleted
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <input
        className="h-10 rounded-lg border border-canopy-900/10 px-3 text-sm font-semibold outline-none"
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason, optional"
        value={reason}
      />
      <div className="flex flex-wrap gap-2">
        {status === "visible" ? (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-clay-100 px-3 text-xs font-black text-clay-700 transition hover:bg-clay-300/45 disabled:opacity-50"
            disabled={Boolean(saving)}
            onClick={() => runAction("hide")}
            type="button"
          >
            <EyeOff size={14} aria-hidden />
            {saving === "hide" ? "Hiding" : "Hide"}
          </button>
        ) : (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-canopy-50 px-3 text-xs font-black text-canopy-700 transition hover:bg-canopy-100 disabled:opacity-50"
            disabled={Boolean(saving)}
            onClick={() => runAction("restore")}
            type="button"
          >
            <Eye size={14} aria-hidden />
            {saving === "restore" ? "Restoring" : "Restore"}
          </button>
        )}

        {reportsOpen ? (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-water-100 px-3 text-xs font-black text-water-700 transition hover:bg-water-100/70 disabled:opacity-50"
            disabled={Boolean(saving)}
            onClick={() => runAction("resolve")}
            type="button"
          >
            <CheckCircle2 size={14} aria-hidden />
            {saving === "resolve" ? "Resolving" : "Resolve"}
          </button>
        ) : null}

        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white px-3 text-xs font-black text-ink/55 shadow-sm transition hover:bg-clay-100 hover:text-clay-700 disabled:opacity-50"
          disabled={Boolean(saving)}
          onClick={() => runAction("delete")}
          type="button"
        >
          <Trash2 size={14} aria-hidden />
          {saving === "delete" ? "Deleting" : "Delete"}
        </button>
      </div>
      {error ? <p className="text-xs font-bold text-clay-700">{error}</p> : null}
    </div>
  );
}

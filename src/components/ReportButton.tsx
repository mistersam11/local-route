"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

type ReportableTargetType =
  | "courseReview"
  | "holeReview"
  | "line"
  | "forumThread"
  | "forumComment";

type ReportButtonProps = {
  targetType: ReportableTargetType;
  targetId: number;
};

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [saving, setSaving] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function report() {
    setSaving(true);
    setReported(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/reports", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            targetType,
            targetId,
            reason: "User reported this content for admin review."
          })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setReported(false);
          setError(payload.error ?? "Report could not be saved");
          return;
        }
      } catch {
        setReported(false);
        setError("Report could not be saved");
      } finally {
        setSaving(false);
      }
    })();
  }

  if (reported) {
    return (
      <span className="inline-flex h-8 items-center justify-center rounded-full bg-water-100 px-3 text-xs font-black text-water-700">
        Reported
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-ink/55 shadow-sm transition hover:bg-clay-100 hover:text-clay-700 disabled:opacity-50"
        disabled={saving}
        onClick={report}
        type="button"
      >
        <Flag size={13} aria-hidden />
        {saving ? "Reporting" : "Report"}
      </button>
      {error ? <span className="text-xs font-bold text-clay-700">{error}</span> : null}
    </span>
  );
}

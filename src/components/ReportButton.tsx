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
  variant?: "pill" | "icon";
};

export function ReportButton({
  targetType,
  targetId,
  variant = "pill"
}: ReportButtonProps) {
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
    if (variant === "icon") {
      return (
        <span
          aria-label="Reported"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-water-100 text-water-700"
          title="Reported"
        >
          <Flag size={13} aria-hidden />
        </span>
      );
    }

    return (
      <span className="inline-flex h-8 items-center justify-center rounded-full bg-water-100 px-3 text-xs font-black text-water-700">
        Reported
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        aria-label={variant === "icon" ? "Report" : undefined}
        className={
          variant === "icon"
            ? "inline-flex h-7 w-7 items-center justify-center rounded-full text-ink/35 transition hover:bg-clay-100 hover:text-clay-700 disabled:opacity-50"
            : "inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-ink/55 shadow-sm transition hover:bg-clay-100 hover:text-clay-700 disabled:opacity-50"
        }
        disabled={saving}
        onClick={report}
        title="Report"
        type="button"
      >
        <Flag size={13} aria-hidden />
        {variant === "pill" ? (saving ? "Reporting" : "Report") : null}
      </button>
      {error ? <span className="text-xs font-bold text-clay-700">{error}</span> : null}
    </span>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Clock3, ExternalLink, X } from "lucide-react";
import Link from "next/link";

type CourseStatus = "pending" | "approved" | "rejected";

const statusLabels: Record<CourseStatus, string> = {
  approved: "Approved",
  pending: "Pending review",
  rejected: "Rejected"
};

type AdminCourseDecisionPanelProps = {
  courseId: number;
  initialStatus: CourseStatus;
};

export function AdminCourseDecisionPanel({
  courseId,
  initialStatus
}: AdminCourseDecisionPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<CourseStatus>(initialStatus);
  const [saving, setSaving] = useState<CourseStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateStatus(nextStatus: CourseStatus) {
    setSaving(nextStatus);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status: nextStatus })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Course status could not be updated");
          return;
        }

        setStatus(nextStatus);
        router.refresh();
      } finally {
        setSaving(null);
      }
    })();
  }

  return (
    <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase text-clay-700">Decision</p>
          <h2 className="mt-1 text-xl font-black text-ink">
            {statusLabels[status]}
          </h2>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canopy-50 px-4 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
          href={`/courses/${courseId}`}
        >
          <ExternalLink size={16} aria-hidden />
          Public page
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canopy-700 px-4 text-sm font-black text-white transition hover:bg-canopy-900 disabled:bg-ink/35"
          disabled={Boolean(saving) || status === "approved"}
          onClick={() => updateStatus("approved")}
          type="button"
        >
          <Check size={16} aria-hidden />
          {saving === "approved" ? "Approving" : "Approve"}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-water-100 px-4 text-sm font-black text-water-700 transition hover:bg-water-100/75 disabled:opacity-50"
          disabled={Boolean(saving) || status === "pending"}
          onClick={() => updateStatus("pending")}
          type="button"
        >
          <Clock3 size={16} aria-hidden />
          {saving === "pending" ? "Moving" : "Mark pending"}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-clay-100 px-4 text-sm font-black text-clay-700 transition hover:bg-clay-300/45 disabled:opacity-50"
          disabled={Boolean(saving) || status === "rejected"}
          onClick={() => updateStatus("rejected")}
          type="button"
        >
          <X size={16} aria-hidden />
          {saving === "rejected" ? "Rejecting" : "Reject"}
        </button>
      </div>

      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
    </section>
  );
}

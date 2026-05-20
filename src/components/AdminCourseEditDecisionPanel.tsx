"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";

type CourseEditProposalStatus = "pending" | "approved" | "rejected";

const statusLabels: Record<CourseEditProposalStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected"
};

export function AdminCourseEditDecisionPanel({
  proposalId,
  initialStatus
}: {
  proposalId: number;
  initialStatus: CourseEditProposalStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function decide(action: "approve" | "reject") {
    setSaving(action);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/admin/course-edit-proposals", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ proposalId, action })
        });
        const payload = (await response.json()) as {
          proposal?: { status: CourseEditProposalStatus };
          error?: string;
        };

        if (!response.ok || !payload.proposal) {
          setError(payload.error ?? "Proposal decision could not be saved");
          return;
        }

        setStatus(payload.proposal.status);
        router.refresh();
      } finally {
        setSaving(null);
      }
    })();
  }

  return (
    <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase text-clay-700">Edit proposal</p>
        <h2 className="mt-1 text-xl font-black text-ink">
          {statusLabels[status]}
        </h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canopy-700 px-4 text-sm font-black text-white transition hover:bg-canopy-900 disabled:bg-ink/35"
          disabled={Boolean(saving) || status !== "pending"}
          onClick={() => decide("approve")}
          type="button"
        >
          <Check size={16} aria-hidden />
          {saving === "approve" ? "Approving" : "Approve"}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-clay-100 px-4 text-sm font-black text-clay-700 transition hover:bg-clay-300/45 disabled:opacity-50"
          disabled={Boolean(saving) || status !== "pending"}
          onClick={() => decide("reject")}
          type="button"
        >
          <X size={16} aria-hidden />
          {saving === "reject" ? "Rejecting" : "Reject"}
        </button>
      </div>

      {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
    </section>
  );
}

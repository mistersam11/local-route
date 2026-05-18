"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";

type CourseStatus = "pending" | "approved" | "rejected";

export function CourseStatusControls({
  courseId,
  currentUserId,
  initialStatus
}: {
  courseId: number;
  currentUserId: number;
  initialStatus: CourseStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  function updateStatus(nextStatus: CourseStatus) {
    setSaving(true);

    void (async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-demo-user-id": String(currentUserId)
          },
          body: JSON.stringify({ status: nextStatus })
        });

        if (response.ok) {
          setStatus(nextStatus);
          router.refresh();
        }
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <div className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase text-clay-700">Admin</p>
        <h2 className="mt-1 text-xl font-black text-ink">Course status: {status}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canopy-700 px-4 text-sm font-black text-white transition hover:bg-canopy-900 disabled:bg-ink/35"
          disabled={saving || status === "approved"}
          onClick={() => updateStatus("approved")}
          type="button"
        >
          <Check size={16} aria-hidden />
          Approve
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-clay-100 px-4 text-sm font-black text-clay-700 transition hover:bg-clay-300/45 disabled:opacity-50"
          disabled={saving || status === "rejected"}
          onClick={() => updateStatus("rejected")}
          type="button"
        >
          <X size={16} aria-hidden />
          Reject
        </button>
      </div>
    </div>
  );
}

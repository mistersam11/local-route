"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";

type NotificationReadButtonProps = {
  notificationId: number;
};

export function NotificationReadButton({
  notificationId
}: NotificationReadButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function markRead() {
    setPending(true);

    void (async () => {
      try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: "POST"
        });

        if (response.ok) {
          router.refresh();
        }
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <button
      className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-canopy-50 px-3 text-xs font-black text-canopy-700 transition hover:bg-canopy-100 disabled:opacity-60"
      disabled={pending}
      onClick={markRead}
      type="button"
    >
      <Check size={14} aria-hidden />
      {pending ? "Saving" : "Mark read"}
    </button>
  );
}

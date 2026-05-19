"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { ForumThreadForm } from "@/components/ForumThreadForm";

export function ForumComposer() {
  const [open, setOpen] = useState(false);

  return (
    <section className="grid gap-3">
      {!open ? (
        <button
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white shadow-sm transition hover:bg-canopy-700"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Link2 size={16} aria-hidden />
          Start a Chain
        </button>
      ) : (
        <ForumThreadForm onCancel={() => setOpen(false)} />
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export function ForumRulesModal({ userKey }: { userKey: string }) {
  const storageKey = `localroute_forum_rules_seen_${userKey}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem(storageKey) !== "true");
  }, [storageKey]);

  function acceptRules() {
    window.localStorage.setItem(storageKey, "true");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/55 px-4 py-8">
      <section className="max-w-lg rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-panel">
        <p className="flex items-center gap-2 text-sm font-bold uppercase text-clay-700">
          <ShieldCheck size={16} aria-hidden />
          Chain rules
        </p>
        <h2 className="mt-3 text-3xl font-black text-ink">Keep the card clean</h2>
        <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-ink/70">
          <p>Be useful, specific, and fair when you talk about courses or players.</p>
          <p>No harassment, hate, threats, spam, doxxing, or personal attacks.</p>
          <p>Course condition updates are welcome. Rumors and pile-ons are not.</p>
          <p>Chains and comments are automatically moderated before they go live.</p>
        </div>
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700"
          onClick={acceptRules}
          type="button"
        >
          I understand
        </button>
      </section>
    </div>
  );
}

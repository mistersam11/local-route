"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { MessageSquarePlus } from "lucide-react";
import { ForumCommentForm } from "@/components/ForumCommentForm";

type ForumCommentComposerToggleProps = {
  isAuthenticated: boolean;
  loginHref: string;
  threadId: number;
};

export function ForumCommentComposerToggle({
  isAuthenticated,
  loginHref,
  threadId
}: ForumCommentComposerToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        className="relative h-[2px] bg-ink/25 dark:bg-white/35"
        aria-label="Conversation actions"
      >
        {isAuthenticated ? (
          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close comment field" : "Add comment"}
            className={clsx(
              "absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-[#fffdf7] transition dark:ring-ink",
              isOpen ? "bg-canopy-700" : "bg-ink hover:bg-canopy-700"
            )}
            onClick={() => setIsOpen((current) => !current)}
            title={isOpen ? "Close comment field" : "Add comment"}
            type="button"
          >
            <MessageSquarePlus size={14} aria-hidden />
          </button>
        ) : (
          <Link
            aria-label="Log in to comment"
            className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-white shadow-sm ring-2 ring-[#fffdf7] transition hover:bg-canopy-700 dark:ring-ink"
            href={loginHref}
            title="Log in to comment"
          >
            <MessageSquarePlus size={14} aria-hidden />
          </Link>
        )}
      </div>

      {isOpen ? (
        <div className="px-3 pb-1 pt-4 sm:px-4">
          <ForumCommentForm
            autoFocus
            onCancel={() => setIsOpen(false)}
            onPosted={() => setIsOpen(false)}
            threadId={threadId}
            variant="minimal"
          />
        </div>
      ) : null}
    </>
  );
}

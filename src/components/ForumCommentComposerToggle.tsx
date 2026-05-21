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
      <div className="flex items-center gap-3" aria-label="Conversation actions">
        <span className="h-px flex-1 bg-canopy-900/15" aria-hidden />
        {isAuthenticated ? (
          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close comment field" : "Add comment"}
            className={clsx(
              "inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition",
              isOpen ? "bg-canopy-700" : "bg-ink hover:bg-canopy-700"
            )}
            onClick={() => setIsOpen((current) => !current)}
            title={isOpen ? "Close comment field" : "Add comment"}
            type="button"
          >
            <MessageSquarePlus size={16} aria-hidden />
          </button>
        ) : (
          <Link
            aria-label="Log in to comment"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition hover:bg-canopy-700"
            href={loginHref}
            title="Log in to comment"
          >
            <MessageSquarePlus size={16} aria-hidden />
          </Link>
        )}
      </div>

      {isOpen ? (
        <ForumCommentForm
          autoFocus
          onCancel={() => setIsOpen(false)}
          onPosted={() => setIsOpen(false)}
          threadId={threadId}
          variant="minimal"
        />
      ) : null}
    </>
  );
}

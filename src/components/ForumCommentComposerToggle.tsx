"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, MessageSquarePlus } from "lucide-react";
import { ForumCommentForm } from "@/components/ForumCommentForm";

type ForumCommentComposerToggleProps = {
  commentCount: number;
  isAuthenticated: boolean;
  loginHref: string;
  threadId: number;
};

export function ForumCommentComposerToggle({
  commentCount,
  isAuthenticated,
  loginHref,
  threadId
}: ForumCommentComposerToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-ink">Comments</h2>
        <div className="flex items-center gap-2">
          <span className="flex h-8 items-center gap-2 rounded-full bg-water-100 px-3 text-sm font-black text-water-700">
            <MessageSquare size={15} aria-hidden />
            {commentCount}
          </span>
          {isAuthenticated ? (
            <button
              aria-expanded={isOpen}
              aria-label={isOpen ? "Close comment field" : "Add comment"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition hover:bg-canopy-700"
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

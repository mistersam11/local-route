"use client";

import Link from "next/link";
import { useState } from "react";
import { CirclePlus, Menu, Settings, UserRound } from "lucide-react";

type UserMenuProps = {
  user: {
    id: number;
    username: string;
  };
};

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-ink shadow-sm transition hover:bg-canopy-50 hover:text-canopy-700"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Menu size={16} aria-hidden />
        @{user.username}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 grid min-w-56 gap-1 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-2 text-sm font-bold text-ink shadow-panel">
          <Link
            className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
            href={`/profiles/${user.id}`}
            onClick={() => setOpen(false)}
          >
            <UserRound size={16} aria-hidden />
            Profile
          </Link>
          <Link
            className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
            href="/settings/profile"
            onClick={() => setOpen(false)}
          >
            <Settings size={16} aria-hidden />
            Settings
          </Link>
          <Link
            className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
            href="/courses/new"
            onClick={() => setOpen(false)}
          >
            <CirclePlus size={16} aria-hidden />
            Submit a course
          </Link>
        </div>
      ) : null}
    </div>
  );
}

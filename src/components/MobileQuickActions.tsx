"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Camera, Flag, MessageSquarePlus, Plus, Target, X } from "lucide-react";
import { usePathname } from "next/navigation";

type MobileQuickActionsProps = {
  isAuthenticated: boolean;
};

function loginHref(href: string) {
  return `/login?redirectTo=${encodeURIComponent(href)}`;
}

export function MobileQuickActions({ isAuthenticated }: MobileQuickActionsProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const courseId = useMemo(() => {
    const match = pathname.match(/^\/courses\/(\d+)/);

    return match?.[1] ?? null;
  }, [pathname]);
  const forumHref = courseId ? `/courses/${courseId}/forum` : "/forum";
  const authHref = (href: string) => (isAuthenticated ? href : loginHref(href));
  const actions = [
    {
      href: authHref(`${forumHref}?compose=1&intent=photo`),
      icon: Camera,
      label: "Upload photo"
    },
    {
      href: authHref(`${forumHref}?compose=1&intent=conditions`),
      icon: Flag,
      label: "Report conditions"
    },
    {
      href: authHref(courseId ? `/events?courseId=${courseId}&create=1` : "/events?create=1"),
      icon: CalendarPlus,
      label: "Create event"
    },
    {
      href: authHref(`${forumHref}?compose=1`),
      icon: MessageSquarePlus,
      label: "Quick post"
    },
    {
      href: authHref(`${forumHref}?compose=1&intent=basket`),
      icon: Target,
      label: "Basket changes"
    }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:hidden">
      {open ? (
        <div className="mb-3 grid w-[calc(100vw-2rem)] max-w-sm gap-2 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-2 shadow-panel">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-black text-ink transition hover:bg-canopy-50 hover:text-canopy-700"
                href={action.href}
                key={action.label}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} aria-hidden />
                {action.label}
              </Link>
            );
          })}
        </div>
      ) : null}
      <button
        aria-expanded={open}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-panel transition hover:bg-canopy-700"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? <X size={22} aria-hidden /> : <Plus size={24} aria-hidden />}
      </button>
    </div>
  );
}

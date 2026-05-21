import { ReportStatus } from "@prisma/client";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  List,
  LogIn,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  UsersRound
} from "lucide-react";
import { MobileQuickActions } from "@/components/MobileQuickActions";
import { PlaceholderImageAttribution } from "@/components/PlaceholderImageAttribution";
import { RouteTransitionBar } from "@/components/RouteTransitionBar";
import { UserMenu } from "@/components/UserMenu";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local Route",
  description:
    "Discover disc golf courses, build course lists, find events, and talk with local players.",
  icons: {
    icon: "/brand/basket-logo.png",
    apple: "/brand/basket-logo.png"
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const [pendingAdminNotifications, unreadNotifications] = currentUser
    ? await Promise.all([
        currentUser.isAdmin
          ? Promise.all([
              prisma.course.count({ where: { status: "pending" } }),
              prisma.courseEditProposal.count({ where: { status: "pending" } }),
              prisma.contentReport.count({ where: { status: ReportStatus.open } })
            ]).then((counts) => counts.reduce((total, count) => total + count, 0))
          : Promise.resolve(0),
        prisma.notification.count({
          where: { userId: currentUser.id, isRead: false }
        })
      ])
    : [0, 0];
  const adminNotificationLabel =
    pendingAdminNotifications > 99 ? "99+" : String(pendingAdminNotifications);

  return (
    <html lang="en">
      <body>
        <RouteTransitionBar />
        <header className="sticky top-0 z-50 border-b border-canopy-900/10 bg-[#fffdf7]/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
              <span className="brand-mark" aria-hidden>
                <Image
                  alt=""
                  className="brand-mark-image"
                  height={46}
                  priority
                  src="/brand/basket-logo.png"
                  width={46}
                />
              </span>
              <span className="brand-wordmark max-[520px]:hidden" aria-label="Local Route">
                <span className="brand-wordmark-local">Local</span>
                <span className="brand-wordmark-route">Route</span>
              </span>
            </Link>
            <nav className="flex min-w-0 flex-wrap items-center justify-end gap-1 overflow-visible text-sm font-semibold text-ink/75 sm:gap-2">
              <Link
                href="/courses"
                className="shrink-0 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
              >
                Courses
              </Link>
              <Link
                href="/lists"
                className="flex shrink-0 items-center gap-2 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
              >
                <List size={16} aria-hidden />
                Lists
              </Link>
              <Link
                href="/events"
                className="flex shrink-0 items-center gap-2 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
              >
                <CalendarDays size={16} aria-hidden />
                Events
              </Link>
              <Link
                href="/forum"
                className="flex shrink-0 items-center gap-2 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
              >
                <MessageSquare size={16} aria-hidden />
                Chains
              </Link>
              <Link
                href="/users"
                className="flex shrink-0 items-center gap-2 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
              >
                <UsersRound size={16} aria-hidden />
                Players
              </Link>
              {currentUser ? (
                <>
                  {currentUser.isAdmin ? (
                    <Link
                      className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-black uppercase text-white transition hover:bg-canopy-700"
                      href="/admin"
                    >
                      <ShieldCheck size={14} aria-hidden />
                      Admin Panel
                      <span
                        aria-label={`${pendingAdminNotifications} admin notifications`}
                        className="ml-1 flex min-w-5 items-center justify-center rounded-full bg-clay-300 px-1.5 py-0.5 text-[11px] leading-none text-ink"
                      >
                        {adminNotificationLabel}
                      </span>
                    </Link>
                  ) : null}
                  <UserMenu
                    unreadNotificationCount={unreadNotifications}
                    user={currentUser}
                  />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
                  >
                    <LogIn size={16} aria-hidden />
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-white transition hover:bg-canopy-700"
                  >
                    <UserPlus size={16} aria-hidden />
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        {children}
        <footer className="border-t border-canopy-900/10 bg-[#fffdf7] px-4 py-8 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <Link className="inline-flex items-center gap-3" href="/">
                <span className="brand-mark" aria-hidden>
                  <Image
                    alt=""
                    className="brand-mark-image"
                    height={46}
                    src="/brand/basket-logo.png"
                    width={46}
                  />
                </span>
                <span className="brand-wordmark" aria-label="Local Route">
                  <span className="brand-wordmark-local">Local</span>
                  <span className="brand-wordmark-route">Route</span>
                </span>
              </Link>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-ink/60">
                Community-built course notes, lists, events, and chains for disc
                golfers who want real local knowledge.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm font-black text-ink/65 md:justify-end">
              <Link className="rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700" href="/about">
                About
              </Link>
              <Link className="rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700" href="/contact">
                Contact
              </Link>
              <Link className="rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700" href="/privacy">
                Privacy
              </Link>
              <Link className="rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700" href="/terms">
                Terms
              </Link>
              <Link className="rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700" href="/contact#course-corrections">
                Report incorrect course info / Propose edits
              </Link>
            </nav>
          </div>
        </footer>
        <PlaceholderImageAttribution />
        <MobileQuickActions isAuthenticated={Boolean(currentUser)} />
      </body>
    </html>
  );
}

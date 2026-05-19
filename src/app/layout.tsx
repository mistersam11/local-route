import { ReportStatus } from "@prisma/client";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CirclePlus,
  LogIn,
  Settings,
  ShieldCheck,
  UserPlus,
  UserRound
} from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalRoute",
  description: "Disc golf course and hole reviews, plus voted best lines.",
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
  const pendingAdminNotifications = currentUser?.isAdmin
    ? (
        await Promise.all([
          prisma.course.count({ where: { status: "pending" } }),
          prisma.contentReport.count({ where: { status: ReportStatus.open } })
        ])
      ).reduce((total, count) => total + count, 0)
    : 0;
  const adminNotificationLabel =
    pendingAdminNotifications > 99 ? "99+" : String(pendingAdminNotifications);

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 border-b border-canopy-900/10 bg-[#fffdf7]/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
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
              <span className="brand-wordmark max-[520px]:hidden" aria-label="LocalRoute">
                <span className="brand-wordmark-local">Local</span>
                <span className="brand-wordmark-route">Route</span>
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-semibold text-ink/75">
              <Link
                href="/"
                className="rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
              >
                Courses
              </Link>
              <Link
                href="/courses/new"
                className="flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
              >
                <CirclePlus size={16} aria-hidden />
                Submit
              </Link>
              {currentUser ? (
                <>
                  <Link
                    href={`/profiles/${currentUser.id}`}
                    className="flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
                  >
                    <UserRound size={16} aria-hidden />
                    @{currentUser.username}
                  </Link>
                  {currentUser.isAdmin ? (
                    <Link
                      className="flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-black uppercase text-white transition hover:bg-canopy-700"
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
                  <Link
                    href="/settings/profile"
                    className="flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
                  >
                    <Settings size={16} aria-hidden />
                    Settings
                  </Link>
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
      </body>
    </html>
  );
}

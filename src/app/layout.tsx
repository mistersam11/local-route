import type { Metadata } from "next";
import Link from "next/link";
import { Map, UserRound } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalRoute",
  description: "Disc golf course and hole reviews, plus voted best lines."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 border-b border-canopy-900/10 bg-[#fffdf7]/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canopy-700 text-white">
                <Map size={20} aria-hidden />
              </span>
              <span className="truncate text-lg font-bold text-ink">LocalRoute</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-semibold text-ink/75">
              <Link
                href="/"
                className="rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
              >
                Courses
              </Link>
              <Link
                href="/profiles/1"
                className="flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-canopy-50 hover:text-canopy-700"
              >
                <UserRound size={16} aria-hidden />
                Dana
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

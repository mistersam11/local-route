import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type AuthUnavailablePanelProps = {
  eyebrow: string;
  title: string;
};

export function AuthUnavailablePanel({
  eyebrow,
  title
}: AuthUnavailablePanelProps) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-72px)] max-w-md place-items-center px-4 py-10">
      <section className="w-full rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-6 shadow-panel">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-clay-100 text-clay-700">
          <AlertTriangle size={20} aria-hidden />
        </div>
        <p className="mt-5 text-sm font-bold uppercase text-clay-700">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black text-ink">{title}</h1>
        <p className="mt-4 text-sm font-semibold leading-6 text-ink/65">
          Authentication is temporarily unavailable. Please try again soon.
        </p>
        <Link
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700"
          href="/"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}

import Link from "next/link";
import { Chrome, LogIn } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { createCsrfToken } from "@/lib/security/csrf";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  credentials: "That email/username and password did not match.",
  oauth: "Google sign-in could not be completed.",
  oauth_config: "Google sign-in is not configured yet."
};

function safeRedirect(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

type LoginPageProps = {
  searchParams?: {
    error?: string;
    redirectTo?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const currentUser = await getCurrentUser();
  const redirectTo = safeRedirect(searchParams?.redirectTo);
  const csrfToken = createCsrfToken();

  if (currentUser) {
    redirect(redirectTo);
  }

  const error = searchParams?.error
    ? errorMessages[searchParams.error] ?? "Something went wrong."
    : null;
  return (
    <main className="mx-auto grid min-h-[calc(100vh-72px)] max-w-md place-items-center px-4 py-10">
      <section className="w-full rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-6 shadow-panel">
        <p className="text-sm font-bold uppercase text-clay-700">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black text-ink">Log in to LocalRoute</h1>
        <Link
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-ink shadow-sm ring-1 ring-canopy-900/10 transition hover:bg-canopy-50"
          href={`/api/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`}
        >
          <Chrome size={16} aria-hidden />
          Continue with Google
        </Link>
        <form action="/api/auth/login" className="mt-6 grid gap-4" method="post">
          <input name="redirectTo" type="hidden" value={redirectTo} />
          <input name="csrfToken" type="hidden" value={csrfToken} />
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Email or username
            <input
              autoComplete="username"
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              name="identifier"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Password
            <input
              autoComplete="current-password"
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          {error ? (
            <p className="rounded-lg bg-clay-100 p-3 text-sm font-bold text-clay-700">
              {error}
            </p>
          ) : null}
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700"
            type="submit"
          >
            <LogIn size={16} aria-hidden />
            Log in
          </button>
        </form>
        <p className="mt-5 text-sm font-semibold text-ink/65">
          New here?{" "}
          <Link className="font-black text-canopy-700" href="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}

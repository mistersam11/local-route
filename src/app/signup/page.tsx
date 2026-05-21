import Link from "next/link";
import { Chrome, UserPlus } from "lucide-react";
import { AuthUnavailablePanel } from "@/components/AuthUnavailablePanel";
import { getCurrentUser } from "@/lib/current-user";
import { createCsrfToken } from "@/lib/security/csrf";
import { canUseAuthSecret } from "@/lib/security/env";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  auth_config: "Account creation is temporarily unavailable.",
  email: "Enter a valid email address.",
  password: "Use 12+ characters with upper/lowercase letters, a number, and a symbol.",
  rate_limited: "Please wait a bit before trying again.",
  request: "That request expired. Refresh and try again.",
  taken: "Account creation could not be completed with those details.",
  username: "Usernames need 3-24 letters, numbers, underscores, or hyphens."
};

function safeRedirect(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

type SignupPageProps = {
  searchParams?: {
    error?: string;
    redirectTo?: string;
  };
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const currentUser = await getCurrentUser();
  const redirectTo = safeRedirect(searchParams?.redirectTo);

  if (currentUser) {
    redirect(redirectTo);
  }

  if (!canUseAuthSecret()) {
    return (
      <AuthUnavailablePanel
        eyebrow="Join the card"
        title="Sign up is unavailable"
      />
    );
  }

  const csrfToken = createCsrfToken();

  const error = searchParams?.error
    ? errorMessages[searchParams.error] ?? "Something went wrong."
    : null;
  return (
    <main className="mx-auto grid min-h-[calc(100vh-72px)] max-w-md place-items-center px-4 py-10">
      <section className="w-full rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-6 shadow-panel">
        <p className="text-sm font-bold uppercase text-clay-700">Join the card</p>
        <h1 className="mt-2 text-3xl font-black text-ink">Create your account</h1>
        <Link
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-ink shadow-sm ring-1 ring-canopy-900/10 transition hover:bg-canopy-50"
          href={`/api/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`}
        >
          <Chrome size={16} aria-hidden />
          Continue with Google
        </Link>
        <form action="/api/auth/signup" className="mt-6 grid gap-4" method="post">
          <input name="redirectTo" type="hidden" value={redirectTo} />
          <input name="csrfToken" type="hidden" value={csrfToken} />
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Username
            <input
              autoComplete="username"
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold lowercase outline-none"
              maxLength={24}
              minLength={3}
              name="username"
              pattern="[A-Za-z0-9_-]+"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Email
            <input
              autoComplete="email"
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Password
            <input
              autoComplete="new-password"
              className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
              minLength={12}
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
            <UserPlus size={16} aria-hidden />
            Sign up
          </button>
        </form>
        <p className="mt-5 text-sm font-semibold text-ink/65">
          Already have an account?{" "}
          <Link className="font-black text-canopy-700" href="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}

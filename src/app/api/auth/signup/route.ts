import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createSession, isAdminEmail, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

function safeRedirect(value: unknown, fallback = "/") {
  const redirectTo = String(value ?? "").trim();
  return redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : fallback;
}

function errorRedirect(request: Request, code: string) {
  const url = new URL("/signup", request.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(formData.get("redirectTo"));

  if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
    return errorRedirect(request, "username");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorRedirect(request, "email");
  }

  if (password.length < 8) {
    return errorRedirect(request, "password");
  }

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await hashPassword(password),
        isAdmin: isAdminEmail(email)
      },
      select: { id: true }
    });
    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.redirect(new URL(redirectTo, request.url), {
      status: 303
    });

    setSessionCookie(response, token, expiresAt);

    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorRedirect(request, "taken");
    }

    throw error;
  }
}

import { NextResponse } from "next/server";
import { createSession, isAdminEmail, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

function safeRedirect(value: unknown, fallback = "/") {
  const redirectTo = String(value ?? "").trim();
  return redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : fallback;
}

function errorRedirect(request: Request) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "credentials");
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const identifier = String(formData.get("identifier") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(formData.get("redirectTo"));

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }]
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isAdmin: true
    }
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return errorRedirect(request);
  }

  if (!user.isAdmin && isAdminEmail(user.email)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true }
    });
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.redirect(new URL(redirectTo, request.url), {
    status: 303
  });

  setSessionCookie(response, token, expiresAt);

  return response;
}

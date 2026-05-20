import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestSessionToken, isAdminEmail, rotateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  isBreachedPassword,
  validatePasswordStrength
} from "@/lib/password";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { normalizeEmail, normalizeUsername } from "@/lib/security/identity";
import { errorRedirect, safeRedirect } from "@/lib/security/http";
import {
  authRateLimitKeys,
  clearAuthFailures,
  consumeAuthRateLimit,
  recordAuthFailure
} from "@/lib/security/rate-limit";

async function signupError(
  request: Request,
  code: string,
  rateLimitKeys: string[]
) {
  await recordAuthFailure("signup", rateLimitKeys);
  return errorRedirect(request, "/signup", code);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(formData.get("redirectTo"));
  const csrfToken = String(formData.get("csrfToken") ?? "");
  const rateLimitKeys = authRateLimitKeys("signup", request, email || username);
  const rateLimit = await consumeAuthRateLimit("signup", rateLimitKeys);

  if (rateLimit.limited) {
    return signupError(request, "rate_limited", rateLimitKeys);
  }

  if (!verifyCsrfToken(csrfToken)) {
    return signupError(request, "request", rateLimitKeys);
  }

  if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
    return signupError(request, "username", rateLimitKeys);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return signupError(request, "email", rateLimitKeys);
  }

  const passwordStrength = validatePasswordStrength(password, { email, username });

  if (!passwordStrength.valid) {
    return signupError(request, "password", rateLimitKeys);
  }

  if (await isBreachedPassword(password)) {
    return signupError(request, "password", rateLimitKeys);
  }

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        emailVerifiedAt: null,
        passwordHash: await hashPassword(password),
        isAdmin: isAdminEmail(email)
      },
      select: { id: true }
    });
    const response = NextResponse.redirect(new URL(redirectTo, request.url), {
      status: 303
    });

    await clearAuthFailures("signup", rateLimitKeys);
    await rotateSession(response, user.id, getRequestSessionToken(request));

    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return signupError(request, "taken", rateLimitKeys);
    }

    throw error;
  }
}

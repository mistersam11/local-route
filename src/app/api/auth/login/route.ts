import { NextResponse } from "next/server";
import {
  getRequestSessionToken,
  isAdminEmail,
  rotateSession
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, needsPasswordRehash, verifyPassword } from "@/lib/password";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { canUseAuthSecret } from "@/lib/security/env";
import { normalizeIdentifier } from "@/lib/security/identity";
import { errorRedirect as redirectWithError, safeRedirect } from "@/lib/security/http";
import {
  authRateLimitKeys,
  clearAuthFailures,
  consumeAuthRateLimit,
  recordAuthFailure
} from "@/lib/security/rate-limit";

function errorRedirect(request: Request) {
  return redirectWithError(request, "/login", "credentials");
}

export async function POST(request: Request) {
  if (!canUseAuthSecret()) {
    return redirectWithError(request, "/login", "auth_config");
  }

  const formData = await request.formData();
  const identifier = normalizeIdentifier(String(formData.get("identifier") ?? ""));
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(formData.get("redirectTo"));
  const csrfToken = String(formData.get("csrfToken") ?? "");
  const rateLimitKeys = authRateLimitKeys("login", request, identifier);
  const rateLimit = await consumeAuthRateLimit("login", rateLimitKeys);

  if (rateLimit.limited || !verifyCsrfToken(csrfToken)) {
    await recordAuthFailure("login", rateLimitKeys);
    return errorRedirect(request);
  }

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
    await recordAuthFailure("login", rateLimitKeys);
    return errorRedirect(request);
  }

  if (!user.isAdmin && isAdminEmail(user.email)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true }
    });
  }

  if (needsPasswordRehash(user.passwordHash)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) }
    });
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url), {
    status: 303
  });

  await clearAuthFailures("login", rateLimitKeys);
  await rotateSession(response, user.id, getRequestSessionToken(request));

  return response;
}

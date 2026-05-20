import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleAuthorization,
  GOOGLE_OAUTH_COOKIE,
  googleOAuthCookieOptions
} from "@/lib/oauth/google";
import {
  authRateLimitKeys,
  consumeAuthRateLimit,
  recordAuthFailure
} from "@/lib/security/rate-limit";
import { errorRedirect } from "@/lib/security/http";

export async function GET(request: NextRequest) {
  const rateLimitKeys = authRateLimitKeys("googleOAuth", request);
  const rateLimit = await consumeAuthRateLimit("googleOAuth", rateLimitKeys);

  if (rateLimit.limited) {
    await recordAuthFailure("googleOAuth", rateLimitKeys);
    return errorRedirect(request, "/login", "oauth");
  }

  const authorization = createGoogleAuthorization(
    request,
    request.nextUrl.searchParams.get("redirectTo")
  );

  if (!authorization) {
    return errorRedirect(request, "/login", "oauth_config");
  }

  const response = NextResponse.redirect(authorization.url, { status: 303 });
  response.cookies.set(
    GOOGLE_OAUTH_COOKIE,
    authorization.cookieValue,
    googleOAuthCookieOptions(authorization.cookieExpiresAt)
  );

  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { getRequestSessionToken, rotateSession } from "@/lib/auth";
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleProfile,
  findOrCreateGoogleUser,
  GOOGLE_OAUTH_COOKIE,
  googleOAuthCookieOptions,
  validateGoogleOAuthState
} from "@/lib/oauth/google";
import { canUseAuthSecret } from "@/lib/security/env";
import { errorRedirect } from "@/lib/security/http";
import {
  authRateLimitKeys,
  clearAuthFailures,
  consumeAuthRateLimit,
  recordAuthFailure
} from "@/lib/security/rate-limit";

function clearGoogleCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", {
    ...googleOAuthCookieOptions(new Date(0)),
    maxAge: 0
  });
}

function oauthError(request: Request, code = "oauth") {
  const response = errorRedirect(request, "/login", code);
  clearGoogleCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  if (!canUseAuthSecret()) {
    return oauthError(request, "auth_config");
  }

  const rateLimitKeys = authRateLimitKeys("googleOAuth", request);
  const rateLimit = await consumeAuthRateLimit("googleOAuth", rateLimitKeys);

  if (rateLimit.limited) {
    await recordAuthFailure("googleOAuth", rateLimitKeys);
    return oauthError(request);
  }

  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const oauthState = validateGoogleOAuthState(
    request,
    request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value ?? null,
    returnedState
  );

  if (!code || !oauthState || request.nextUrl.searchParams.has("error")) {
    await recordAuthFailure("googleOAuth", rateLimitKeys);
    return oauthError(request);
  }

  try {
    const accessToken = await exchangeGoogleAuthorizationCode(
      code,
      oauthState.codeVerifier,
      oauthState.redirectUri
    );
    const profile = await fetchGoogleProfile(accessToken);
    const userId = await findOrCreateGoogleUser(profile);
    const response = NextResponse.redirect(
      new URL(oauthState.redirectTo, request.url),
      { status: 303 }
    );

    clearGoogleCookie(response);
    await clearAuthFailures("googleOAuth", rateLimitKeys);
    await rotateSession(response, userId, getRequestSessionToken(request));

    return response;
  } catch {
    await recordAuthFailure("googleOAuth", rateLimitKeys);
    return oauthError(request);
  }
}

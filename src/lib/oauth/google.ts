import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAuthSecret, getRequestOrigin } from "@/lib/security/env";
import { normalizeEmail } from "@/lib/security/identity";
import { safeRedirect } from "@/lib/security/http";

export const GOOGLE_PROVIDER = "google";
export const GOOGLE_OAUTH_COOKIE = "localroute_google_oauth";

const googleAuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const googleUserInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";
const googleOAuthTtlMs = 10 * 60 * 1000;

type GoogleOAuthState = {
  state: string;
  codeVerifier: string;
  redirectTo: string;
  expiresAt: number;
};

type GoogleTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
};

export type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret())
    .update(`google-oauth:${payload}`)
    .digest("base64url");
}

function sealOAuthState(state: GoogleOAuthState) {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function unsealOAuthState(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature || !timingSafeStringEqual(signature, signPayload(payload))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as
      | GoogleOAuthState
      | null;
  } catch {
    return null;
  }
}

function codeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

function providerEmailVerified(profile: GoogleProfile) {
  return profile.email_verified === true || profile.email_verified === "true";
}

function profilePictureUrl(profile: GoogleProfile) {
  if (!profile.picture) {
    return null;
  }

  try {
    const url = new URL(profile.picture);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function fallbackUsernameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "player";
  const cleaned = localPart
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 20);

  return cleaned.length >= 3 ? cleaned : `player${cleaned}`.slice(0, 20);
}

async function uniqueUsernameFromEmail(email: string) {
  const base = fallbackUsernameFromEmail(email);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : String(randomBytes(2).readUInt16BE(0));
    const username = `${base}${suffix}`.slice(0, 24);
    const existing = await prisma.user.findUnique({ where: { username } });

    if (!existing) {
      return username;
    }
  }

  return `player${randomBytes(6).toString("hex")}`.slice(0, 24);
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";

  return {
    clientId,
    clientSecret,
    configured: Boolean(clientId && clientSecret)
  };
}

export function googleRedirectUri(request: Request) {
  return `${getRequestOrigin(request)}/api/auth/google/callback`;
}

export function googleOAuthCookieOptions(expires: Date) {
  return {
    expires,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

export function createGoogleAuthorization(request: Request, redirectToValue: unknown) {
  const { clientId, configured } = getGoogleOAuthConfig();

  if (!configured) {
    return null;
  }

  const state = randomBytes(24).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const redirectTo = safeRedirect(redirectToValue);
  const expiresAt = Date.now() + googleOAuthTtlMs;
  const redirectUri = googleRedirectUri(request);
  const url = new URL(googleAuthorizationEndpoint);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge(codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");

  return {
    url,
    cookieValue: sealOAuthState({ state, codeVerifier, redirectTo, expiresAt }),
    cookieExpiresAt: new Date(expiresAt)
  };
}

export function validateGoogleOAuthState(
  request: Request,
  cookieValue: string | null,
  returnedState: string | null
) {
  const state = unsealOAuthState(cookieValue);

  if (
    !state ||
    !returnedState ||
    !timingSafeStringEqual(state.state, returnedState) ||
    state.expiresAt <= Date.now()
  ) {
    return null;
  }

  return {
    codeVerifier: state.codeVerifier,
    redirectTo: safeRedirect(state.redirectTo),
    redirectUri: googleRedirectUri(request)
  };
}

export async function exchangeGoogleAuthorizationCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  fetcher: typeof fetch = fetch
) {
  const { clientId, clientSecret, configured } = getGoogleOAuthConfig();

  if (!configured) {
    throw new Error("Google OAuth is not configured");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });

  const response = await fetcher(googleTokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed");
  }

  const token = (await response.json()) as GoogleTokenResponse;

  if (!token.access_token) {
    throw new Error("Google token response was missing an access token");
  }

  return token.access_token;
}

export async function fetchGoogleProfile(
  accessToken: string,
  fetcher: typeof fetch = fetch
) {
  const response = await fetcher(googleUserInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Google profile request failed");
  }

  return (await response.json()) as GoogleProfile;
}

export async function findOrCreateGoogleUser(profile: GoogleProfile) {
  const providerAccountId = profile.sub?.trim();
  const email = normalizeEmail(profile.email ?? "");

  if (!providerAccountId || !email || !providerEmailVerified(profile)) {
    throw new Error("Google profile did not include a verified email");
  }

  const account = await prisma.oauthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: GOOGLE_PROVIDER,
        providerAccountId
      }
    },
    select: { userId: true }
  });

  if (account) {
    return account.userId;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true, profileImageUrl: true }
  });

  if (existingUser) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existingUser.id },
        data: {
          emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
          profileImageUrl: existingUser.profileImageUrl ?? profilePictureUrl(profile)
        }
      }),
      prisma.oauthAccount.create({
        data: {
          provider: GOOGLE_PROVIDER,
          providerAccountId,
          userId: existingUser.id
        }
      })
    ]);

    return existingUser.id;
  }

  try {
    const username = await uniqueUsernameFromEmail(email);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        emailVerifiedAt: new Date(),
        passwordHash: null,
        profileImageUrl: profilePictureUrl(profile),
        isAdmin: isAdminEmail(email),
        oauthAccounts: {
          create: {
            provider: GOOGLE_PROVIDER,
            providerAccountId
          }
        }
      },
      select: { id: true }
    });

    return user.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const linked = await prisma.oauthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: GOOGLE_PROVIDER,
            providerAccountId
          }
        },
        select: { userId: true }
      });

      if (linked) {
        return linked.userId;
      }
    }

    throw error;
  }
}

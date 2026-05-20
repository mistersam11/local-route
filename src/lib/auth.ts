import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/security/identity";

export const SESSION_COOKIE = "localroute_session";

const absoluteSessionDays = 30;
const inactiveSessionDays = 14;
const sessionTouchIntervalMs = 5 * 60 * 1000;

type CookieOptions = {
  expires: Date;
  httpOnly: boolean;
  path: string;
  sameSite: "lax";
  secure: boolean;
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expires: Date): CookieOptions {
  return {
    expires,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  };
}

function getCookieValue(cookieHeader: string | null, name: string) {
  return (
    cookieHeader
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null
  );
}

export function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(/[,\s]+/)
      .map(normalizeEmail)
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string) {
  return adminEmails().has(normalizeEmail(email));
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + absoluteSessionDays * 24 * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
      lastSeenAt: now
    }
  });

  return { token, expiresAt };
}

export async function rotateSession(
  response: NextResponse,
  userId: number,
  currentToken: string | null
) {
  await deleteSessionToken(currentToken);
  const { token, expiresAt } = await createSession(userId);
  setSessionCookie(response, token, expiresAt);
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date
) {
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieOptions(new Date(0)),
    maxAge: 0
  });
}

export async function deleteSessionToken(token: string | null) {
  if (!token) return;

  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(token) }
  });
}

async function getUserFromToken(token: string | null) {
  if (!token) return null;

  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          profileImageUrl: true,
          isAdmin: true
        }
      }
    }
  });

  if (!session) {
    return null;
  }

  const inactiveExpiresAt = new Date(
    session.lastSeenAt.getTime() + inactiveSessionDays * 24 * 60 * 60 * 1000
  );

  if (session.expiresAt <= now || inactiveExpiresAt <= now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  if (now.getTime() - session.lastSeenAt.getTime() > sessionTouchIntervalMs) {
    await prisma.session
      .update({
        where: { id: session.id },
        data: { lastSeenAt: now }
      })
      .catch(() => null);
  }

  return {
    ...session.user,
    isAdmin: session.user.isAdmin || isAdminEmail(session.user.email)
  };
}

export async function getCurrentSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value ?? null;
  return getUserFromToken(token);
}

export async function getRequestSessionUser(request: Request) {
  const token = getCookieValue(request.headers.get("cookie"), SESSION_COOKIE);
  return getUserFromToken(token);
}

export function getRequestSessionToken(request: Request) {
  return getCookieValue(request.headers.get("cookie"), SESSION_COOKIE);
}

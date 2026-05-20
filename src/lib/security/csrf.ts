import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/security/env";

const csrfTtlMs = 2 * 60 * 60 * 1000;

function signCsrfPayload(payload: string) {
  return createHmac("sha256", getAuthSecret())
    .update(`csrf:${payload}`)
    .digest("base64url");
}

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createCsrfToken(now = Date.now()) {
  const payload = `${now}.${randomBytes(18).toString("base64url")}`;
  return `${payload}.${signCsrfPayload(payload)}`;
}

export function verifyCsrfToken(token: string | null | undefined, now = Date.now()) {
  if (!token) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [issuedAtValue, nonce, signature] = parts;
  const issuedAt = Number(issuedAtValue);

  if (!Number.isFinite(issuedAt) || !nonce || !signature) {
    return false;
  }

  if (issuedAt > now || now - issuedAt > csrfTtlMs) {
    return false;
  }

  const payload = `${issuedAtValue}.${nonce}`;
  return timingSafeStringEqual(signature, signCsrfPayload(payload));
}

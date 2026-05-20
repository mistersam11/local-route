import { createHmac } from "crypto";
import { getAuthSecret } from "@/lib/security/env";

export function normalizeEmail(email: string) {
  return email
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .toLowerCase();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function normalizeIdentifier(identifier: string) {
  const value = identifier.trim().toLowerCase();
  return value.includes("@") ? normalizeEmail(value) : normalizeUsername(value);
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwardedIp ||
    "unknown"
  );
}

export function hashPrivateLookupKey(action: string, rawKey: string) {
  return createHmac("sha256", getAuthSecret())
    .update(`${action}:${rawKey}`)
    .digest("hex");
}

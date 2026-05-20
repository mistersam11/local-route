import { NextResponse } from "next/server";

export function safeRedirect(value: unknown, fallback = "/") {
  const redirectTo = String(value ?? "").trim();
  return redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : fallback;
}

export function errorRedirect(
  request: Request,
  pathname: string,
  code: string,
  status = 303
) {
  const url = new URL(pathname, request.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url, { status });
}

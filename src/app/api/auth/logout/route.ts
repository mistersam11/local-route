import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  deleteSessionToken,
  getRequestSessionToken
} from "@/lib/auth";
import { verifyCsrfToken } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const formData = await request.formData();

  if (!verifyCsrfToken(String(formData.get("csrfToken") ?? ""))) {
    return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  }

  await deleteSessionToken(getRequestSessionToken(request));

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303
  });

  clearSessionCookie(response);

  return response;
}

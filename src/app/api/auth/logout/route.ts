import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  deleteSessionToken,
  getRequestSessionToken
} from "@/lib/auth";

export async function POST(request: Request) {
  await deleteSessionToken(getRequestSessionToken(request));

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303
  });

  clearSessionCookie(response);

  return response;
}

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

function optionalText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function optionalUrl(value: unknown) {
  const url = String(value ?? "").trim();

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request) {
  const currentUser = await getRequestUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Log in to edit your profile" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const username = String(body.username ?? "")
    .trim()
    .toLowerCase();

  if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
    return NextResponse.json(
      { error: "Usernames need 3-24 letters, numbers, underscores, or hyphens." },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        username,
        profileImageUrl: optionalUrl(body.profileImageUrl),
        bio: optionalText(body.bio, 280),
        homeCourseName: optionalText(body.homeCourseName, 80)
      },
      select: {
        id: true,
        username: true,
        profileImageUrl: true,
        bio: true,
        homeCourseName: true
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }

    throw error;
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  const courses = await prisma.course.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { locationName: { contains: query } }
          ]
        }
      : undefined,
    include: {
      _count: {
        select: { holes: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ courses });
}

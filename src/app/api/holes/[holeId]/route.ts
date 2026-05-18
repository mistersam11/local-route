import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/current-user";
import { getHoleMapPayload } from "@/lib/route-data";

type Params = {
  params: {
    holeId: string;
  };
};

export async function GET(request: Request, { params }: Params) {
  const holeId = Number(params.holeId);

  if (!Number.isInteger(holeId)) {
    return NextResponse.json({ error: "Invalid hole id" }, { status: 400 });
  }

  const payload = await getHoleMapPayload(holeId, getRequestUserId(request));

  if (!payload) {
    return NextResponse.json({ error: "Hole not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}

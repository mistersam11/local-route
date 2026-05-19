import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/current-user";
import { getHoleSocialPayload } from "@/lib/social-data";

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

  const currentUser = await getRequestUser(request);
  const payload = await getHoleSocialPayload(holeId, currentUser?.id);

  if (!payload) {
    return NextResponse.json({ error: "Hole not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}

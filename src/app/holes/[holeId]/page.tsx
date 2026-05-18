import { notFound } from "next/navigation";
import { HoleMapClient } from "@/components/HoleMapClient";
import { DEMO_USER_ID } from "@/lib/current-user";
import { getHoleMapPayload } from "@/lib/route-data";

type HolePageProps = {
  params: {
    holeId: string;
  };
};

export default async function HolePage({ params }: HolePageProps) {
  const holeId = Number(params.holeId);

  if (!Number.isInteger(holeId)) {
    notFound();
  }

  const payload = await getHoleMapPayload(holeId, DEMO_USER_ID);

  if (!payload) {
    notFound();
  }

  return <HoleMapClient initialPayload={payload} />;
}

import { notFound } from "next/navigation";
import { HoleSocialClient } from "@/components/HoleSocialClient";
import { DEMO_USER_ID } from "@/lib/current-user";
import { getHoleSocialPayload } from "@/lib/social-data";

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

  const payload = await getHoleSocialPayload(holeId, DEMO_USER_ID);

  if (!payload) {
    notFound();
  }

  return <HoleSocialClient initialPayload={payload} />;
}

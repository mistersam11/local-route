import { notFound } from "next/navigation";
import { HoleSocialClient } from "@/components/HoleSocialClient";
import { getDemoUserId } from "@/lib/current-user";
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

  const payload = await getHoleSocialPayload(holeId, await getDemoUserId());

  if (!payload) {
    notFound();
  }

  return <HoleSocialClient initialPayload={payload} />;
}

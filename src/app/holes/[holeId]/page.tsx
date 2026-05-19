import { notFound } from "next/navigation";
import { HoleSocialClient } from "@/components/HoleSocialClient";
import { getCurrentUser } from "@/lib/current-user";
import { getHoleSocialPayload } from "@/lib/social-data";

export const dynamic = "force-dynamic";

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

  const currentUser = await getCurrentUser();
  const payload = await getHoleSocialPayload(holeId, currentUser?.id ?? null);

  if (!payload) {
    notFound();
  }

  return <HoleSocialClient initialPayload={payload} />;
}

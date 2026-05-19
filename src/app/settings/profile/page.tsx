import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirectTo=/settings/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      username: true,
      profileImageUrl: true,
      bio: true,
      homeCourseName: true
    }
  });

  if (!user) {
    redirect("/login?redirectTo=/settings/profile");
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href={`/profiles/${user.id}`}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
      >
        <ArrowLeft size={16} aria-hidden />
        Profile
      </Link>

      <section>
        <p className="text-sm font-bold uppercase text-clay-700">Profile settings</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-ink">
          Edit your player card
        </h1>
      </section>

      <ProfileSettingsForm user={user} />
    </main>
  );
}

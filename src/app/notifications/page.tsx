import { NotificationTargetType, NotificationType } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarClock, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { NotificationReadButton } from "@/components/NotificationReadButton";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function notificationTitle(notification: {
  actor: { username: string } | null;
  course: { name: string };
  type: NotificationType;
}) {
  if (notification.type === NotificationType.coursePost) {
    return `${notification.actor?.username ?? "Someone"} posted in ${notification.course.name}`;
  }

  return `${notification.actor?.username ?? "Someone"} added an event for ${notification.course.name}`;
}

function notificationHref(notification: {
  courseId: number;
  targetType: NotificationTargetType;
  targetRecordId: number;
}) {
  if (notification.targetType === NotificationTargetType.forumThread) {
    return `/forum/${notification.targetRecordId}`;
  }

  return `/events/${notification.targetRecordId}`;
}

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirectTo=/notifications");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: currentUser.id },
    include: {
      actor: { select: { id: true, username: true, profileImageUrl: true } },
      course: { select: { id: true, name: true, locationName: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <section>
        <p className="text-sm font-bold uppercase text-clay-700">Notifications</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
          Course Updates
        </h1>
      </section>

      <section className="grid gap-3">
        {notifications.map((notification) => (
          <article
            className={`grid gap-3 rounded-lg border p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center ${
              notification.isRead
                ? "border-canopy-900/10 bg-white"
                : "border-canopy-700/25 bg-[#fffdf7]"
            }`}
            key={notification.id}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink/60">
                {notification.actor ? (
                  <Avatar
                    name={notification.actor.username}
                    size="sm"
                    src={notification.actor.profileImageUrl}
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-canopy-50 text-canopy-700">
                    <Bell size={15} aria-hidden />
                  </span>
                )}
                <span>{formatDate(notification.createdAt)}</span>
                {!notification.isRead ? (
                  <span className="rounded-full bg-clay-100 px-2 py-0.5 text-xs font-black uppercase text-clay-700">
                    Unread
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-xl font-black text-ink">
                {notificationTitle(notification)}
              </h2>
              <p className="mt-1 text-sm font-semibold text-ink/55">
                {notification.course.locationName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Link
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-ink px-3 text-xs font-black text-white transition hover:bg-canopy-700"
                href={notificationHref(notification)}
              >
                {notification.targetType === NotificationTargetType.courseEvent ? (
                  <CalendarClock size={14} aria-hidden />
                ) : (
                  <MessageSquare size={14} aria-hidden />
                )}
                Open
              </Link>
              {!notification.isRead ? (
                <NotificationReadButton notificationId={notification.id} />
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {!notifications.length ? (
        <section className="rounded-lg bg-white p-8 text-center shadow-sm">
          <Bell className="mx-auto text-canopy-700" size={32} aria-hidden />
          <h2 className="mt-4 text-2xl font-black text-ink">No notifications yet</h2>
          <p className="mt-2 text-sm font-semibold text-ink/55">
            Follow courses to hear about new posts and events.
          </p>
        </section>
      ) : null}
    </main>
  );
}

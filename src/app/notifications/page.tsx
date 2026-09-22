import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NotificationCard } from "@/components/NotificationCard";
import { toLiveNotification } from "@/lib/notify";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const cards = await Promise.all(items.map((item) => toLiveNotification(item)));

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <AppShell>
      <h1 className="mb-1 font-sans text-[32px] font-medium tracking-tight text-espresso">Notifications</h1>
      <p className="mb-6 text-sm text-warm-gray">Likes, comments, and new followers.</p>
      {cards.length === 0 ? (
        <div className="rounded-[1.5rem] bg-cream/80 px-6 py-14 text-center ring-1 ring-beige/70">
          <p className="font-sans text-sm leading-relaxed text-warm-gray">
            When someone interacts with your reading, it will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 font-sans">
          {cards.map((item) => (
            <NotificationCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

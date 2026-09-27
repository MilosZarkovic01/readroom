import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActivityCard } from "@/components/ActivityCard";
import { AppShell } from "@/components/AppShell";
import { BadgeCollection } from "@/components/BadgeCollection";
import { LogoutButton } from "@/components/LogoutButton";
import { ProfileStats } from "@/components/ProfileStats";
import { serializeActivity } from "@/lib/feed";
import { listUnlockedBadges } from "@/lib/unlock-badges";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [readCount, followerCount, followingCount, badges, entries] = await Promise.all([
    prisma.libraryEntry.count({ where: { userId: session.user.id, status: "READ" } }),
    prisma.follow.count({ where: { followingId: session.user.id } }),
    prisma.follow.count({ where: { followerId: session.user.id } }),
    listUnlockedBadges(session.user.id),
    prisma.libraryEntry.findMany({
      where: { userId: session.user.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        book: { select: { title: true, author: true, coverId: true } },
        likes: { select: { userId: true } },
        comments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const name = session.user.name || "Reader";
  const initial = name.charAt(0).toUpperCase();

  return (
    <AppShell>
      <div className="lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-x-12 xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-x-16">
        <div className="flex flex-col items-center pt-4 text-center lg:col-start-1 lg:row-start-1 lg:items-start lg:pt-2 lg:text-left">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-beige font-serif text-4xl text-espresso">
            {initial}
          </div>
          <h1 className="mt-4 font-serif text-3xl">{name}</h1>
          <p className="text-sm text-warm-gray">{session.user.email}</p>
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <ProfileStats
            userId={session.user.id}
            followerCount={followerCount}
            followingCount={followingCount}
            readCount={readCount}
          />
        </div>
        <div className="lg:col-start-1 lg:row-start-3">
          <BadgeCollection badges={badges} />
        </div>
        <h2 className="mt-8 text-base font-medium lg:col-start-2 lg:row-start-1 lg:mt-2">Reading activity</h2>
        {entries.length === 0 ? (
          <p className="pt-8 text-center text-sm text-warm-gray lg:col-start-2 lg:row-start-2 lg:max-w-2xl lg:pt-4 lg:text-left">
            No activity yet.
          </p>
        ) : (
          <div className="lg:col-start-2 lg:row-start-2 lg:row-span-4 lg:max-w-2xl">
            {entries.map((entry) => (
              <ActivityCard key={entry.id} item={serializeActivity(entry, session.user.id)} />
            ))}
          </div>
        )}
        <div className="mt-8 mb-2 lg:col-start-1 lg:row-start-4">
          <LogoutButton />
        </div>
      </div>
    </AppShell>
  );
}

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
      <div className="flex flex-col items-center pt-4 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-beige font-serif text-4xl text-espresso">
          {initial}
        </div>
        <h1 className="mt-4 font-serif text-3xl">{name}</h1>
        <p className="text-sm text-warm-gray">{session.user.email}</p>
      </div>
      <ProfileStats
        userId={session.user.id}
        followerCount={followerCount}
        followingCount={followingCount}
        readCount={readCount}
      />
      <BadgeCollection badges={badges} />
      <h2 className="mt-8 text-base font-medium">Reading activity</h2>
      {entries.length === 0 ? (
        <p className="pt-8 text-center text-sm text-warm-gray">No activity yet.</p>
      ) : (
        <div>
          {entries.map((entry) => (
            <ActivityCard key={entry.id} item={serializeActivity(entry, session.user.id)} />
          ))}
        </div>
      )}
      <div className="mt-8 mb-2">
        <LogoutButton />
      </div>
    </AppShell>
  );
}

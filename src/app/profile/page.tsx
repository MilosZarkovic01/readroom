import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActivityCard } from "@/components/ActivityCard";
import { AppShell } from "@/components/AppShell";
import { BadgeCollection } from "@/components/BadgeCollection";
import { LogoutButton } from "@/components/LogoutButton";
import { ProfileStats } from "@/components/ProfileStats";
import { serializeActivity } from "@/lib/feed";
import { listUnlockedBadges } from "@/lib/unlock-badges";
import { GoalsCard } from "@/components/GoalsCard";
import { listGoalsWithProgress } from "@/lib/reading-goals";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [readCount, followerCount, followingCount, badges, goals, shelfEntries, entries] = await Promise.all([
    prisma.libraryEntry.count({ where: { userId: session.user.id, status: "READ" } }),
    prisma.follow.count({ where: { followingId: session.user.id } }),
    prisma.follow.count({ where: { followerId: session.user.id } }),
    listUnlockedBadges(session.user.id),
    listGoalsWithProgress(session.user.id),
    prisma.libraryEntry.findMany({
      where: { userId: session.user.id, status: { in: ["WANT_TO_READ", "READING"] } },
      select: { book: { select: { id: true, title: true } } },
      orderBy: { updatedAt: "desc" },
    }),
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
        <div className="w-full lg:max-w-sm">
          <ProfileStats
            userId={session.user.id}
            followerCount={followerCount}
            followingCount={followingCount}
            readCount={readCount}
          />
        </div>
      </div>
      <div className="mt-6 flex w-full flex-col gap-3 lg:mt-8 lg:flex-row">
        <BadgeCollection badges={badges} />
        <GoalsCard
          goals={goals}
          editable
          shelfBooks={shelfEntries.map((entry) => entry.book)}
        />
      </div>
      <h2 className="mt-8 text-base font-medium lg:mt-10">Reading activity</h2>
      {entries.length === 0 ? (
        <p className="pt-8 text-center text-sm text-warm-gray">No activity yet.</p>
      ) : (
        <div className="lg:grid lg:grid-cols-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="lg:flex lg:h-full lg:border-b lg:border-beige lg:odd:pr-8 lg:even:border-l lg:even:pl-8 lg:[&>article]:h-full lg:[&>article]:border-b-0"
            >
              <ActivityCard item={serializeActivity(entry, session.user.id)} />
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 mb-2 lg:mx-auto lg:max-w-xs">
        <LogoutButton />
      </div>
    </AppShell>
  );
}

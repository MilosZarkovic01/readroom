import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { ActivityCard } from "@/components/ActivityCard";
import { serializeActivity } from "@/lib/feed";
import { ProfileStats } from "@/components/ProfileStats";
import { displayName } from "@/lib/social";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
  if (!user) notFound();

  const [readCount, followerCount, followingCount, follow, entries] =
    await Promise.all([
      prisma.libraryEntry.count({ where: { userId: id, status: "READ" } }),
      prisma.follow.count({ where: { followingId: id } }),
      prisma.follow.count({ where: { followerId: id } }),
      prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: session.user.id, followingId: id },
        },
      }),
      prisma.libraryEntry.findMany({
        where: { userId: id },
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

  const name = displayName(user);
  const own = session.user.id === id;

  return (
    <AppShell>
      <div className="flex flex-col items-center pt-4 text-center">
        <Avatar name={name} size="lg" />
        <h1 className="mt-4 font-sans text-3xl font-medium">{name}</h1>
        <p className="font-sans text-sm text-warm-gray">{user.email}</p>
        {!own ? (
          <div className="mt-4">
            <FollowButton userId={id} initialFollowing={!!follow} />
          </div>
        ) : (
          <p className="mt-3 text-xs text-warm-gray">This is you</p>
        )}
      </div>
      <ProfileStats
        userId={id}
        followerCount={followerCount}
        followingCount={followingCount}
        readCount={readCount}
      />
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
    </AppShell>
  );
}

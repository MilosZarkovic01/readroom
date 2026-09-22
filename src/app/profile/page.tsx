import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { LogoutButton } from "@/components/LogoutButton";
import { ProfileStats } from "@/components/ProfileStats";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [readCount, followerCount, followingCount] = await Promise.all([
    prisma.libraryEntry.count({ where: { userId: session.user.id, status: "READ" } }),
    prisma.follow.count({ where: { followingId: session.user.id } }),
    prisma.follow.count({ where: { followerId: session.user.id } }),
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
      <div className="mt-8 mb-2">
        <LogoutButton />
      </div>
    </AppShell>
  );
}

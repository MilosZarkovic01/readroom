import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { FriendsTabs } from "@/components/FriendsTabs";
import { getFriendsFeed } from "@/lib/feed";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; post?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { q, post } = await searchParams;
  const query = q?.trim() ?? "";

  const [feed, users, following] = await Promise.all([
    getFriendsFeed(session.user.id),
    prisma.user.findMany({
      where: {
        id: { not: session.user.id },
        ...(query
          ? {
              OR: [{ name: { contains: query } }, { email: { contains: query } }],
            }
          : {}),
      },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    }),
  ]);

  const followingIds = new Set(following.map((row) => row.followingId));

  return (
    <AppShell>
      <h1 className="mb-4 font-sans text-[32px] font-medium text-espresso">Friends</h1>
      <FriendsTabs
        feed={feed}
        query={query}
        highlightId={post}
        people={users.map((user) => ({ ...user, following: followingIds.has(user.id) }))}
      />
    </AppShell>
  );
}

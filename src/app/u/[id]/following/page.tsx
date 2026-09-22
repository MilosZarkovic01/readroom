import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { FollowList } from "@/components/FollowList";
import { displayName } from "@/lib/social";

export default async function FollowingPage({
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

  const [rows, following] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: id },
      include: { following: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    }),
  ]);
  const followingIds = new Set(following.map((row) => row.followingId));

  return (
    <AppShell>
      <h1 className="mb-1 font-sans text-[32px] font-medium text-espresso">Following</h1>
      <p className="mb-5 font-sans text-sm text-warm-gray">{displayName(user)}</p>
      <FollowList
        empty="Not following anyone yet."
        users={rows.map((row) => ({
          ...row.following,
          following: followingIds.has(row.following.id),
          isSelf: row.following.id === session.user.id,
        }))}
      />
    </AppShell>
  );
}

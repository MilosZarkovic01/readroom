import { prisma } from "@/lib/prisma";
import { BADGES, qualifyBadgeKeys, type BadgeDefinition } from "@/lib/badges";

export type UnlockedBadge = BadgeDefinition & { unlockedAt: Date };

export async function unlockEarnedBadges(userId: string) {
  const entries = await prisma.libraryEntry.findMany({
    where: { userId },
    select: {
      status: true,
      rating: true,
      review: true,
      updatedAt: true,
      book: { select: { pageCount: true } },
    },
  });

  const keys = qualifyBadgeKeys(
    entries.map((entry) => ({
      status: entry.status,
      rating: entry.rating,
      review: entry.review,
      updatedAt: entry.updatedAt,
      pageCount: entry.book.pageCount,
    })),
  );
  if (keys.length === 0) return;

  const existing = await prisma.userBadge.findMany({
    where: { userId, badgeKey: { in: keys } },
    select: { badgeKey: true },
  });
  const already = new Set(existing.map((row) => row.badgeKey));
  const fresh = keys.filter((badgeKey) => !already.has(badgeKey));
  if (fresh.length === 0) return;

  await prisma.userBadge.createMany({
    data: fresh.map((badgeKey) => ({ userId, badgeKey })),
  });
}

export async function listUnlockedBadges(userId: string): Promise<UnlockedBadge[]> {
  await unlockEarnedBadges(userId);
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { unlockedAt: "asc" },
  });
  const catalog = new Map(BADGES.map((badge) => [badge.key, badge]));
  return rows.flatMap((row) => {
    const definition = catalog.get(row.badgeKey as UnlockedBadge["key"]);
    if (!definition) return [];
    return [{ ...definition, unlockedAt: row.unlockedAt }];
  });
}

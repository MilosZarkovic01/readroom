import { prisma } from "@/lib/prisma";
import { BADGES, qualifyBadgeKeys, type BadgeAward } from "@/lib/badges";

function toAwards(rows: { badgeKey: string; unlockedAt: Date }[]): BadgeAward[] {
  const catalog = new Map(BADGES.map((badge) => [badge.key, badge]));
  return rows.flatMap((row) => {
    const definition = catalog.get(row.badgeKey as BadgeAward["key"]);
    if (!definition) return [];
    return [{ ...definition, unlockedAt: row.unlockedAt.toISOString() }];
  });
}

export async function unlockEarnedBadges(userId: string): Promise<BadgeAward[]> {
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
  if (keys.length === 0) return [];

  const existing = await prisma.userBadge.findMany({
    where: { userId, badgeKey: { in: keys } },
    select: { badgeKey: true },
  });
  const already = new Set(existing.map((row) => row.badgeKey));
  const fresh = keys.filter((badgeKey) => !already.has(badgeKey));
  if (fresh.length === 0) return [];

  await prisma.userBadge.createMany({
    data: fresh.map((badgeKey) => ({ userId, badgeKey })),
  });
  const rows = await prisma.userBadge.findMany({
    where: { userId, badgeKey: { in: fresh } },
    orderBy: { unlockedAt: "asc" },
  });
  return toAwards(rows);
}

export async function listUnlockedBadges(userId: string): Promise<BadgeAward[]> {
  await unlockEarnedBadges(userId);
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { unlockedAt: "asc" },
  });
  return toAwards(rows);
}

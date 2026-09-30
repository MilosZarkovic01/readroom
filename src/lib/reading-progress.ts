import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planProgressUpdate } from "@/lib/progress";

type ProgressDb = Prisma.TransactionClient | PrismaClient;

export async function currentPagesFor(entryIds: string[]): Promise<Map<string, number>> {
  if (entryIds.length === 0) return new Map();
  const logs = await prisma.readingLog.findMany({
    where: { entryId: { in: entryIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["entryId"],
    select: { entryId: true, page: true },
  });
  return new Map(logs.map((log) => [log.entryId, log.page]));
}

export async function saveReadingProgress(
  userId: string,
  entryId: string,
  page: number,
  db: ProgressDb = prisma,
) {
  const latest = await db.readingLog.findFirst({
    where: { entryId },
    orderBy: { createdAt: "desc" },
    select: { id: true, page: true, pagesRead: true },
  });
  const plan = planProgressUpdate(latest, page);
  if (plan.kind === "create") {
    await db.readingLog.create({
      data: { userId, entryId, page: plan.page, pagesRead: plan.pagesRead },
    });
  } else if (plan.kind === "update") {
    await db.readingLog.update({
      where: { id: plan.id },
      data: { page: plan.page, pagesRead: plan.pagesRead },
    });
  }
  return plan;
}
